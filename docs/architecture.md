# Architecture and trust boundaries

## Runtime components

1. Browser UI — form interaction, role-aware navigation, SVG topology rendering and event timeline.
2. Node/Express API — authentication, role checks, scope checks, transaction validation, ledger changes, topology controls and simulation creation.
3. In-memory demo repository — fictional seeded organization, account balances, transactions, ledger events and simulation events; resets on restart.
4. MySQL schema foundation — normalized production-persistence target in `database/migrations/001_init.sql`, not yet connected to the demo repository.

## Banking and simulation separation

The transaction endpoint is the only component that mutates account balances. Simulation creation reads the current network graph and calculates a route. Simulated retries do not invoke a transaction endpoint and cannot duplicate a financial operation. Packet delivery is not a financial commit signal.

## Routing policy

Dijkstra minimizes the sum of configured link latency across active links. Offline links and offline routers are excluded. Neighbor edges are processed in stable link-ID order; strict improvement preserves deterministic first-discovered equal-cost paths. No route returns a failure result rather than inventing a path.

## Message integrity demonstration

The tampering route creates a test-only payload, encrypts it using AES-256-GCM and a random 256-bit key/96-bit IV, flips a ciphertext bit, and attempts authenticated decryption. Authentication should fail. The key and ciphertext are never sent to the browser, and no account or ledger record is touched. This is a teaching example, not a full message transport protocol.

## Production hardening before deployment

- Connect a MySQL repository and migrations; use database transactions and `SELECT ... FOR UPDATE` or equivalent locking for money movement.
- Persist idempotency keys durably and bind them to authenticated user + canonical request hash.
- Replace demo bearer tokens/localStorage with secure HTTP-only cookies, session rotation, CSRF controls and expiration.
- Hash passwords using Argon2id/bcrypt; add login throttling, registration and password-reset flows.
- Scope every read and write in repository queries; add authorization tests for each role/branch/region.
- Add Socket.IO/SSE with per-subscription authorization and persisted ordered events.
- Add independent accounting invariants and reconciliation: total debits equal total credits per completed transaction.
- Add rate limits, monitoring, structured redacted logs, TLS, secret management and independent security review.
