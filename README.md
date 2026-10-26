# NETBANKX — Banking Network & Packet Simulation


An educational full-stack demo combining fictional banking workflows, an append-only-style ledger, a hierarchical enterprise network, Dijkstra routing, event-based packet simulation and an AES-256-GCM tampering demonstration. No real banking, payment rails or funds are connected.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test
npm start
```

Open http://localhost:3000. This starter intentionally uses a seeded in-memory repository so it runs locally without external services. Demo records reset whenever the server restarts. The normalized MySQL 8 schema is provided in `database/migrations/001_init.sql`; persistence integration is a documented next step, not something this in-memory demo claims to have completed.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| HQ administrator | `admin@paysafe.demo` | `PaySafeDemo!2026` |
| Regional manager | `regional@paysafe.demo` | `RegionalDemo!26` |
| Branch manager | `branch@paysafe.demo` | `BranchDemo!26` |
| Customer | `customer@paysafe.demo` | `CustomerDemo!26` |

Development-only credentials. Do not reuse in a deployed environment.

## Included functionality

- Login and logout with server-issued bearer tokens; demo identities are resolved server-side.
- Role-specific, scope-filtered customer/transaction/dashboard reads.
- Demo account balances, transfers, deposits and withdrawals, positive-amount validation, transaction references and idempotency-key deduplication.
- Debit/credit ledger entries for transfers and transaction summaries.
- Database-backed-in-concept network graph seeded from the same runtime state, Dijkstra route selection using active links and latency weights, deterministic tie ordering, packet-loss/retry events and persisted-for-session simulation timeline.
- Network link/node controls for authorized roles; packet-loss controls; tampering demo using AES-256-GCM with authentication-tag verification.
- Audit events, CSV transaction export and Wireshark guide.
- SQL migration covering organization, users, customers, accounts, transactions, ledger, network, simulation, audit, security, sessions and idempotency records.

## Important demo limitations

- The runtime repository is in memory, not MySQL. The SQL migration is a schema foundation and is not wired to runtime queries.
- Staff/region/branch creation, public self-registration, invitations, session-cookie/CSRF production hardening, WebSocket streaming, true pause/resume/step controls, and full report persistence are not implemented in this iteration.
- Simulation events are computed by the backend in a single run and rendered in a timeline; the frontend illustrates the route but does not implement a continuous real-time event stream.
- A demo chart is explicitly marked illustrative. Other KPI/transaction data comes from seeded or session-recorded demo state.
- The demo bearer token is stored in browser localStorage for ease of demonstration; this is not the recommended production session architecture. Use secure HTTP-only cookies, CSRF protection and durable session storage before deployment.
- Runtime ledger changes are atomic only within the single-process in-memory demo. Production needs MySQL transactions, row locks, strict ledger invariants, race-condition tests and durable idempotency records.
- Network routes and simulated packet events are not real TCP packets and are not the same as Wireshark-captured transport segments.

## API overview

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/dashboard`, `GET /api/organization`, `GET /api/customers`, `GET /api/recipients`
- `GET /api/transactions`, `POST /api/transactions/transfer|deposit|withdrawal`
- `GET /api/network/topology`, `PATCH /api/network/links/:id`, `PATCH /api/network/nodes/:id`
- `POST /api/simulations`, `GET /api/simulations`, `GET /api/simulations/:id`
- `POST /api/security/tamper-demo`, `GET /api/audit`, `GET /api/health`

All protected endpoints require `Authorization: Bearer <token>`.

## Wireshark guide

See [`docs/wireshark-guide.md`](docs/wireshark-guide.md). Capture loopback/localhost traffic on the interface your OS exposes for it. The browser and local server communicate over actual TCP; the PaySafe simulated topology does not create physical router hops.

## Project layout

- `frontend/`: responsive vanilla HTML/CSS/JS application
- `backend/src/server.js`: API, authentication, authorization and demo transaction operations
- `backend/src/engine.js`: Dijkstra and event-driven packet simulation engine
- `backend/test/`: route/simulation tests
- `database/migrations/001_init.sql`: MySQL 8 normalized schema
- `docs/`: architecture and Wireshark guides

## Updated demo data and transaction permissions

The in-memory demonstration seeds 30 fictional customer accounts, five in each of the six branches. Customer names and balances are synthetic and reset when the server restarts.

Money-moving API operations (`TRANSFER`, `DEPOSIT`, and `WITHDRAWAL`) are restricted to `CUSTOMER` and `HQ_ADMIN` roles in this demo. Customers are restricted to their own source account (and deposits to their own account); HQ administrators can demonstrate administration-wide operations. Regional and branch managers can monitor records and operate authorized network controls but cannot initiate money movement. This is a demonstration policy, not a production banking policy.

## Network components used

- **Customer endpoints:** simulated application endpoints that originate or receive transaction-related messages.
- **Branch routers:** connect endpoints at a branch to regional infrastructure.
- **Regional routers:** aggregate branch traffic and connect regions to the core.
- **HQ/core router:** central modeled transit point between regions.
- **Links/edges:** graph connections with configured latency, bandwidth, loss probability, and online/offline state.
- **Topology graph:** the set of nodes and links used for routing.
- **Dijkstra shortest-path algorithm:** calculates a minimum-total-configured-latency route over active links; ties are deterministic through node/link ordering.
- **Packet simulation engine:** generates hop events, models probabilistic loss, retry attempts, delivery, and failure using a reproducible seed.
- **Event timeline and metrics:** record simulated forwarding, retries, losses, route, hop count, configured route latency, and outcomes.
- **HTTP/TCP/IP application traffic:** real browser-to-Express requests can be inspected in Wireshark. These are not the same as simulated router-to-router packet events.
- **Security layer:** AES-256-GCM tampering demonstration verifies authenticated integrity; it is an educational demo and not a complete production security architecture.
