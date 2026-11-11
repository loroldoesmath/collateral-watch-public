# Collateral Watch Engine (public beta interface)

Working title. A static, dependency-free web interface for lenders to review collateral risk
across a multifamily loan portfolio: flagged assets, loss thresholds, stress scenarios, anomalies
and public-data signals.

With your data, the platform identifies assets showing early signs of decline, estimates loss
thresholds, and runs additional stress scenarios so you can anticipate material movement. It also
detects anomalous occupancy and abrupt moves in asset value through real-time natural language
analysis of public data. Data you provide is partitioned from general model training and is protected.

All numbers in the bundled demo are synthetic and illustrative. They were not produced by the
production engine.

## What is and is not in this repository

In: the interface (HTML, CSS, JavaScript), a self-hosted font, a synthetic sample dataset, the API
contract the interface expects, and tooling to keep the repository free of engine code.

Not in: any risk model, parameters, training code, data pipeline or client data. Analysis runs on a
separate private service. The interface receives results only.

## Run it

    python3 -m http.server 8000
    # open http://localhost:8000

No build step and no packages to install. Without configuration the interface reads
`sample-data/assessment.json`.

## Connect it to a live service

1. Set `apiBase` in `config.js` to the https origin of your API gateway.
2. Add that origin to `connect-src` in the content security policy in `index.html`.
3. Users enter an access key on first use. It is kept in `sessionStorage` for that browser session only.

The expected response is described by `schemas/assessment.schema.json` and `docs/api-contract.md`.

## Structure

    index.html            shell and content security policy
    config.js             deployment settings
    css/styles.css        black, blue and tan; borders instead of shadows
    js/main.js            hash router
    js/api.js             sample or live data access
    js/views/             home, console, stress, signals, data, security
    js/charts.js          dependency-free svg charts
    sample-data/          synthetic payload
    schemas/              api contract (json schema)
    tools/                sample data generator (standard library only, does not call any engine)
    scripts/guard.sh      fails if engine-like files appear here
    tests/                contract test for the sample payload

## Hardening notes

- The content security policy forbids inline scripts and styles, and all dynamic text is escaped.
  Do not add inline handlers or styles.
- Serve with HTTPS and send these headers from your host: `Content-Security-Policy` (same as the meta
  tag, plus `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Strict-Transport-Security`.
- Public repositories on GitHub can be forked by anyone under GitHub's terms, whatever the license says.
  Keep anything you would not want copied out of this repository.

## Run the checks

    for f in js/*.js js/views/*.js; do node --check "$f"; done
    node tests/contract.test.mjs
    sh scripts/guard.sh

## License

All rights reserved. See `LICENSE`.
