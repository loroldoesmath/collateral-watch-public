# API contract

The interface consumes results from a private service. This document describes what the interface
expects. It describes outputs only.

Authentication: `Authorization: Bearer <key>`. The service resolves the client from the key. A client
is never named in the path or body.

| Method and path | Purpose | Success | Errors |
|---|---|---|---|
| `PUT /v1/portfolio` | Replace the client's positions and histories | 200 with counts | 401, 413, 422 with a plain-language reason |
| `GET /v1/assessment` | Return the assessment for the client's portfolio | 200 with the payload below | 401, 404 when nothing is uploaded |
| `DELETE /v1/portfolio` | Remove the client's data | 200 | 401 |

`GET /v1/assessment` returns the structure in `schemas/assessment.schema.json`:

- `meta`: timestamps, data notice, calibration status. The interface shows the notice and status.
- `portfolio`: counts, weighted LTV and DSCR, flagged counts, maturing balance, maturity wall.
- `assets[]`: position metrics, fundamentals, and a `risk` block with level, score, flags, loss
  thresholds, refinancing position and illiquidity measures, plus anomalies, signals and series.
- `scenarios[]`: assumptions, portfolio summary and per-asset results for each stress scenario.

Responses should carry `Cache-Control: no-store`.
