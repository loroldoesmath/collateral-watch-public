"""generate the synthetic sample portfolio used by the demo.

this script uses only textbook formulas and python's standard library. it does not
call any risk engine. every number it produces is illustrative.

usage: python tools/generate_sample_data.py > sample-data/assessment.json
"""

import json
import math
import random
from datetime import date, datetime, timezone

ASOF = date(2026, 11, 7)
RF, LENDING_SPREAD = 0.042, 0.019
RNG = random.Random(20261107)

# name, market, type, units, avg rent, occupancy, opex ratio, cap rate, ltv, coupon, io, months to maturity, tier, note
SPECS = [
    ("Northgate Garden", "Phoenix, AZ", "Garden", 312, 1480, 0.915, 0.47, 0.0540, 0.79, 0.0610, False, 11, 1, "occupancy"),
    ("Riverside Mid-rise", "Denver, CO", "Mid-rise", 214, 1960, 0.934, 0.42, 0.0510, 0.77, 0.0590, True, 9, 1, "refi"),
    ("Cedar Flats", "Boise, ID", "Garden", 168, 1390, 0.902, 0.46, 0.0560, 0.74, 0.0540, False, 52, 2, "value"),
    ("Harbor Commons", "Austin, TX", "Mid-rise", 276, 1780, 0.889, 0.45, 0.0495, 0.76, 0.0575, True, 16, 1, "levered"),
    ("Foothill Terrace", "Salt Lake City, UT", "Garden", 188, 1560, 0.951, 0.41, 0.0525, 0.64, 0.0485, False, 38, 1, ""),
    ("Maple Court", "Charlotte, NC", "Workforce", 142, 1190, 0.944, 0.49, 0.0620, 0.68, 0.0570, False, 27, 2, ""),
    ("Summit Row", "Denver, CO", "Garden", 236, 1720, 0.948, 0.40, 0.0515, 0.60, 0.0450, False, 44, 1, ""),
    ("Lakeview Flats", "Salt Lake City, UT", "Mid-rise", 154, 1690, 0.957, 0.40, 0.0505, 0.58, 0.0470, False, 61, 1, ""),
    ("Palm Ridge", "Phoenix, AZ", "Workforce", 264, 1240, 0.921, 0.48, 0.0600, 0.71, 0.0625, False, 19, 2, "thin"),
    ("Westbrook", "Austin, TX", "Garden", 330, 1530, 0.926, 0.46, 0.0535, 0.72, 0.0560, True, 23, 1, ""),
    ("Alder Place", "Boise, ID", "Mid-rise", 122, 1610, 0.962, 0.41, 0.0530, 0.55, 0.0490, False, 57, 2, ""),
    ("Stonebridge", "Charlotte, NC", "Garden", 298, 1350, 0.936, 0.45, 0.0570, 0.66, 0.0520, False, 33, 2, ""),
    ("Desert Sage", "Tucson, AZ", "Workforce", 176, 1080, 0.938, 0.50, 0.0640, 0.69, 0.0600, False, 14, 3, "refi"),
    ("Granite Pointe", "Salt Lake City, UT", "Garden", 204, 1500, 0.953, 0.41, 0.0520, 0.62, 0.0475, False, 47, 1, ""),
]

HEADLINES = {
    "Phoenix, AZ": [("Regional news feed", "Large employer announces hiring freeze at Phoenix campus", -0.55),
                    ("Regional news feed", "Apartment concessions widen as new supply delivers", -0.45)],
    "Austin, TX": [("Regional news feed", "Downtown office tenants cut space; absorption slows", -0.35)],
    "Salt Lake City, UT": [("Regional news feed", "Employer expansion adds 1,800 jobs near the airport", 0.5)],
    "Denver, CO": [("Regional news feed", "Rent growth flat as lease-ups compete on price", -0.1)],
    "Boise, ID": [("Regional news feed", "In-migration remains steady despite higher mortgage rates", 0.3)],
    "Charlotte, NC": [("Regional news feed", "New employer groundbreaking supports multifamily demand", 0.35)],
    "Tucson, AZ": [("Regional news feed", "Local employer announces plant closing", -0.5)],
}
NOWCAST = {"Phoenix, AZ": -0.012, "Austin, TX": -0.008, "Salt Lake City, UT": 0.031, "Denver, CO": 0.004,
           "Boise, ID": 0.022, "Charlotte, NC": 0.027, "Tucson, AZ": -0.006}


def phi(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def pay_const(rate, years, io):
    if io:
        return rate
    r, n = rate / 12.0, years * 12
    return 12.0 * r / (1.0 - (1.0 + r) ** -n)


def bal_at(balance, rate, years, months, io):
    if io or months <= 0:
        return balance
    r, n = rate / 12.0, years * 12
    pmt = balance * r / (1.0 - (1.0 + r) ** -n)
    return balance * (1 + r) ** months - pmt * ((1 + r) ** months - 1) / r


def refi(noi, value, balance, rate):
    c = pay_const(rate, 30, False)
    caps = {"ltv": 0.75 * value, "dscr": noi / 1.25 / c, "debt_yield": noi / 0.08}
    k = min(caps, key=caps.get)
    return {"max_proceeds": caps[k], "gap": max(balance - caps[k], 0.0),
            "binding_constraint": k, "feasible": balance <= caps[k]}


def shocked_noi(units, rent, occ, noi, rent_shock, occ_pts, opex_shock):
    rev0 = units * rent * 12 * occ * 1.05
    opex = rev0 - noi
    occ1 = min(max(occ + occ_pts / 100.0, 0.0), 1.0)
    return units * rent * (1 + rent_shock) * 12 * occ1 * 1.05 - opex * (1 + opex_shock)


def robust_flags(vals, thresh, min_abs, recent=6, window=12):
    d = [vals[i + 1] - vals[i] for i in range(len(vals) - 1)]
    out = []
    for t in range(max(len(d) - recent, window), len(d)):
        past = sorted(d[t - window:t])
        med = past[len(past) // 2]
        mad = sorted(abs(x - med) for x in past)[len(past) // 2] * 1.4826 or 1e-6
        z = (d[t] - med) / mad
        if abs(z) >= thresh and abs(d[t] - med) >= min_abs:
            out.append((t + 1, vals[t + 1], vals[t] + med, z))
    return out


def month_end(y, m):
    nm = date(y + (m == 12), m % 12 + 1, 1)
    return date.fromordinal(nm.toordinal() - 1)


def history(occ_end, note):
    n = 60
    dates, idx, occ = [], [100.0], []
    y, m = 2021, 11
    for _ in range(n):
        dates.append(month_end(y, m))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    e_prev = 0.0
    for _ in range(1, n):
        e_prev = 0.5 * e_prev + 0.5 * RNG.gauss(0.0035, 0.011)
        idx.append(idx[-1] * math.exp(e_prev))
    level = occ_end + 0.01
    for t in range(n):
        level += RNG.gauss(0, 0.003) - 0.1 * (level - occ_end)
        occ.append(min(max(level, 0.7), 0.99))
    occ[-1] = occ_end
    if note == "occupancy":
        # a stable plateau followed by one abrupt drop in the latest month
        for i in range(n - 12, n - 1):
            occ[i] = occ_end + 0.047 + RNG.gauss(0, 0.0015)
    if note == "value":
        idx[-1] = idx[-2] * 0.93
    return dates, idx, occ


def main():
    assets = []
    for (name, market, ptype, units, rent, occ, opex, cap, ltv, coupon, io, mtm, tier, note) in SPECS:
        rev = units * rent * 12 * occ * 1.05
        noi = rev * (1 - opex)
        value = noi / cap
        bal = value * ltv
        ds = bal * pay_const(coupon, 30, io)
        dscr = noi / ds
        b_m = bal_at(bal, coupon, 30, max(mtm, 0), io)
        rf = refi(noi, value, b_m, RF + LENDING_SPREAD)
        thr = {"value_decline_to_impairment": max(1 - bal / value, 0.0),
               "noi_decline_to_dscr_1x": max(1 - ds / noi, 0.0),
               "cap_rate_expansion_bps_to_impairment": max((noi / bal - cap) * 1e4, 0.0)}
        sigma = RNG.uniform(0.032, 0.046)
        s12 = sigma * math.sqrt(12)
        p_imp = min(2 * phi(math.log(bal / value) / s12), 1.0)
        p_dec = 2 * phi(math.log(0.9) / s12)
        var95 = math.exp(-1.645 * s12) - 1
        dates, idx, occs = history(occ, note)
        anomalies = []
        for i, o, e, z in robust_flags(occs, 3.0, 0.02):
            anomalies.append({"metric": "occupancy", "date": dates[i].isoformat(), "observed": o,
                              "expected": e, "z": z, "direction": "down" if z < 0 else "up"})
        for i, o, e, z in robust_flags([math.log(v) for v in idx], 3.5, 0.03):
            anomalies.append({"metric": "value_index", "date": dates[i].isoformat(),
                              "observed": math.exp(o), "expected": math.exp(e), "z": z,
                              "direction": "down" if z < 0 else "up"})
        base_hc = {1: 0.02, 2: 0.04, 3: 0.06}[tier]
        stress_hc = min(base_hc * 4.2, 0.35)
        real_ltv = bal / (value * (1 - stress_hc))
        flags = []
        if dscr < 1.0:
            flags.append(("DSCR", "red", "Debt service not covered", f"Coverage is {dscr:.2f}x against a 1.00x floor."))
        elif dscr < 1.20:
            flags.append(("DSCR", "amber", "Thin debt service coverage", f"Coverage is {dscr:.2f}x against a 1.20x watch level."))
        if ltv >= 0.80:
            flags.append(("LTV", "red", "High loan to value", f"LTV is {ltv:.0%}."))
        elif ltv >= 0.70:
            flags.append(("LTV", "amber", "Elevated loan to value", f"LTV is {ltv:.0%}."))
        if mtm <= 24 and not rf["feasible"]:
            flags.append(("REFINANCE", "red" if mtm <= 12 else "amber", "Refinance shortfall at maturity",
                          f"Matures in {mtm} months; projected proceeds fall ${rf['gap']:,.0f} short "
                          f"({rf['binding_constraint']} test binds)."))
        if p_imp >= 0.10:
            flags.append(("IMPAIRMENT", "red", "High probability of impairment",
                          f"{p_imp:.0%} chance value falls below the loan balance within 12 months."))
        elif p_imp >= 0.04:
            flags.append(("IMPAIRMENT", "amber", "Elevated probability of impairment",
                          f"{p_imp:.0%} chance value falls below the loan balance within 12 months."))
        down = [a for a in anomalies if a["metric"] == "occupancy" and a["direction"] == "down"]
        if down:
            flags.append(("OCCUPANCY_ANOMALY", "red" if occ < 0.92 else "amber", "Abnormal occupancy decline",
                          f"Occupancy moved {abs(down[-1]['z']):.1f} robust deviations below trend."))
        if any(a["metric"] == "value_index" and a["direction"] == "down" for a in anomalies):
            flags.append(("VALUE_JUMP", "amber", "Abrupt valuation decline", "A recent valuation move is outside its normal range."))
        trailing = 0.02 if market != "Phoenix, AZ" else 0.015
        gap = NOWCAST[market] - trailing
        if gap <= -0.02:
            flags.append(("RENT_DECELERATION", "amber", "Rent growth expected to slow",
                          f"Nowcast is {abs(gap) * 100:.1f} points below trailing growth."))
        if [h for h in HEADLINES.get(market, []) if h[2] <= -0.25]:
            flags.append(("MARKET_SENTIMENT", "amber", "Negative market signals", f"Public-data sentiment for {market} is negative."))
        if cap < coupon:
            flags.append(("NEGATIVE_LEVERAGE", "amber", "Yield below borrowing cost", f"Cap rate {cap:.2%} is below the {coupon:.2%} coupon."))
        n_red = sum(f[1] == "red" for f in flags)
        n_amb = sum(f[1] == "amber" for f in flags)
        level = "red" if n_red else "amber" if n_amb else "green"
        score = min(100.0, 22.0 * n_red + 8.0 * n_amb + 100.0 * p_imp)
        m_date = date(ASOF.year + (ASOF.month - 1 + mtm) // 12, (ASOF.month - 1 + mtm) % 12 + 1, 1)
        assets.append({
            "id": f"A-{len(assets) + 1:02d}", "name": name, "market": market, "property_type": ptype,
            "units": units, "market_tier": tier, "balance": bal, "value": value, "ltv": ltv, "dscr": dscr,
            "debt_yield": noi / bal, "coupon": coupon, "maturity": m_date.isoformat(), "months_to_maturity": mtm,
            "occupancy": occ, "noi": noi, "cap_rate": cap, "rent_growth_yoy": trailing,
            "rent_growth_nowcast": NOWCAST[market], "income_return": noi / value,
            "appreciation_12m": idx[-1] / idx[-13] - 1,
            "risk": {"level": level, "score": score, "p_impairment_12m": p_imp, "p_decline_10pct_12m": p_dec,
                     "var95_value_change_12m": var95,
                     "flags": [{"code": c, "severity": s, "label": l, "detail": d} for c, s, l, d in flags],
                     "loss_thresholds": thr, "refinance": rf,
                     "liquidity": {"time_to_sell_months": {1: 4.0, 2: 6.0, 3: 9.0}[tier] * (units / 150) ** 0.15,
                                   "haircut_base": base_hc, "haircut_stressed": stress_hc,
                                   "realizable_ltv_stressed": real_ltv}},
            "anomalies": anomalies,
            "signals": [{"source": s, "headline": h, "sentiment": v} for s, h, v in HEADLINES.get(market, [])],
            "series": {"dates": [d.isoformat() for d in dates],
                       "value_index": [round(v, 2) for v in idx], "occupancy": [round(o, 4) for o in occs]},
        })

    scen_defs = [
        ("rates_up_200", "Rates up 200 bp", "The 10-year yield rises 200 bp with credit spreads unchanged.", 200, 0, 0, 0, 0),
        ("credit_tightening", "Credit tightening", "Credit and lending spreads widen 150 bp with rates unchanged.", 0, 150, 0, 0, 0),
        ("demand_shock", "Demand shock", "Market rents fall 6% and occupancy falls 5 points.", 0, 0, -0.06, -5, 0),
        ("stagflation", "Stagflation", "Rates up 150 bp, spreads up 100 bp, rents down 3%, occupancy down 3 points, operating expenses up 6%.", 150, 100, -0.03, -3, 0.06),
        ("severe_downturn", "Severe downturn", "Rates up 100 bp, spreads up 250 bp, rents down 10%, occupancy down 8 points, operating expenses up 3%.", 100, 250, -0.10, -8, 0.03),
    ]
    spec_by_name = {s[0]: s for s in SPECS}
    total = sum(a["balance"] for a in assets)
    scenarios = []
    for sid, sname, desc, d_rf, d_cr, rs, op, ox in scen_defs:
        shift = (0.30 * d_rf + 0.20 * d_cr) / 1e4
        rrate = RF + LENDING_SPREAD + d_rf / 1e4 + 0.6 * d_cr / 1e4
        per = {}
        for a in assets:
            s = spec_by_name[a["name"]]
            n1 = shocked_noi(a["units"], s[4], a["occupancy"], a["noi"], rs, op, ox)
            cap1 = a["noi"] / a["value"] + shift
            v1 = max(n1, 0.0) / cap1
            ds = a["balance"] * pay_const(a["coupon"], 30, s[11])
            gap = 0.0
            if a["months_to_maturity"] <= 36:
                gap = refi(n1, v1, bal_at(a["balance"], a["coupon"], 30, max(a["months_to_maturity"], 0), s[11]), rrate)["gap"]
            stress = 0.6 * min(max(d_cr / 300.0, 0), 1) + 0.4 * min(max(4 * abs(rs) + 0.05 * abs(op), 0), 1)
            hc = min({1: 0.02, 2: 0.04, 3: 0.06}[a["market_tier"]] * (1 + 4 * stress), 0.35)
            per[a["id"]] = {"value_change": v1 / a["value"] - 1, "ltv": a["balance"] / v1 if v1 > 0 else None,
                            "dscr": n1 / ds, "impaired": v1 < a["balance"], "refi_gap": gap,
                            "realizable_loss": min(max(a["balance"] - v1 * (1 - hc), 0.0), a["balance"])}
        scenarios.append({
            "id": sid, "name": sname, "description": desc,
            "assumptions": {"d_rf_bps": d_rf, "d_credit_bps": d_cr, "rent_shock": rs, "occupancy_shock_pts": op,
                            "opex_shock": ox, "cap_rate_shift_bps": shift * 1e4, "refinance_rate": rrate},
            "summary": {"avg_value_change": sum(a["balance"] * per[a["id"]]["value_change"] for a in assets) / total,
                        "loans_impaired": sum(v["impaired"] for v in per.values()),
                        "loans_dscr_below_1": sum(v["dscr"] < 1.0 for v in per.values()),
                        "refi_shortfall_total": sum(v["refi_gap"] for v in per.values()),
                        "estimated_loss": sum(v["realizable_loss"] for v in per.values())},
            "assets": per})

    wall = {}
    for a in assets:
        y = int(a["maturity"][:4])
        w = wall.setdefault(y, {"year": y, "balance": 0.0, "count": 0})
        w["balance"] += a["balance"]
        w["count"] += 1
    out = {
        "meta": {"generated_at": datetime(2026, 11, 7, tzinfo=timezone.utc).isoformat(), "asof": ASOF.isoformat(),
                 "data_notice": "Illustrative sample data. Not produced by the production engine and not investment advice.",
                 "engine_version": "sample",
                 "calibration": {"status": "illustrative", "notes": ["All figures in this file are synthetic."]}},
        "portfolio": {
            "asset_count": len(assets), "total_balance": total,
            "wtd_ltv": sum(a["balance"] * a["ltv"] for a in assets) / total,
            "wtd_dscr": sum(a["balance"] * a["dscr"] for a in assets) / total,
            "red_count": sum(a["risk"]["level"] == "red" for a in assets),
            "amber_count": sum(a["risk"]["level"] == "amber" for a in assets),
            "maturing_24m_balance": sum(a["balance"] for a in assets if a["months_to_maturity"] <= 24),
            "maturity_wall": sorted(wall.values(), key=lambda w: w["year"])},
        "assets": sorted(assets, key=lambda a: -a["risk"]["score"]),
        "scenarios": scenarios,
    }
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
