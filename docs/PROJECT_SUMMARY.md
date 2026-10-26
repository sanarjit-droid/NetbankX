# NetBankX (PaySafe) — Full Project Summary

> Source brief for writing project documentation. Everything below was verified against the code as of 2026-10-24. Where the existing README/docs disagree with the code, the code is described and the difference is listed in §13.

---

## 1. What the project is

**NetBankX — Enterprise Banking Network Lab** is an educational full-stack web application built as a **Computer Networks course project**. It combines two things in one app:

1. **A simulated multi-branch bank** — customers, accounts, balances, transfers, deposits, withdrawals, a debit/credit ledger, role-based staff access and audit logs.
2. **A simulated enterprise WAN that carries those banking transactions** — a 4-level hierarchical router topology, **Dijkstra shortest-path routing**, hop-by-hop **packet forwarding with probabilistic loss and retries**, a **man-in-the-middle tampering attack** detected with **AES-256-GCM authentication tags**, and export of each run as a real **Wireshark-readable `.pcap` file** (ARP, TCP handshake, IPv4 TTL decrement, checksums, ICMP, TCP RST/FIN).

The core teaching idea: *a money transfer only commits to the ledger if its packet actually survives the network path* — packet loss can fail a transfer, and in-transit tampering is caught by authenticated encryption so no money moves.

The project was originally named **PaySafe** and later rebranded **NetBankX**. Both names still appear (see §13).

**Nothing real is connected** — no real banks, payment rails, funds or physical routers. All data is fictional and resets on server restart.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ES modules, `"type": "module"`) |
| Backend | Express 5.1, Helmet 8.1 (CSP disabled) |
| Crypto | Node built-in `crypto` (AES-256-GCM, random tokens, UUIDs) |
| Frontend | Vanilla HTML/CSS/JavaScript single-page app, no framework, no build step |
| Graphics | Inline SVG (topology map, charts, logo) |
| Fonts | Google Fonts — DM Sans, Manrope |
| Storage | In-memory JavaScript objects (seeded at startup) |
| DB schema (not wired) | MySQL 8 migration + seed SQL |
| Tests | Node built-in test runner (`node --test`) |

Only two npm dependencies: `express`, `helmet`.

---

## 3. How to run

```bash
cd NETBANKX
npm install
npm test        # 12 tests, all passing
npm start       # http://localhost:3000
npm run dev     # auto-restart on file changes (node --watch)
```

`start.sh` installs dependencies if missing and starts the server. `.env.example` lists `PORT=3000`, `SESSION_SECRET`, `DEMO_MODE=true` — only `PORT` is actually read by the code.

---

## 4. Folder structure

```
NETBANKX/
├── backend/
│   ├── src/
│   │   ├── server.js     (387 lines) Express API, auth, roles, transactions, simulations endpoints
│   │   ├── engine.js     (223 lines) Seed data, Dijkstra, packet simulation engine
│   │   └── pcap.js       (609 lines) Binary .pcap generator + in-browser frame dissector
│   └── test/
│       ├── engine.test.js  8 tests (routing + simulation)
│       └── pcap.test.js    4 tests (pcap format, dissection, tamper frames, checksum)
├── frontend/
│   ├── index.html        Shell page, boot screen, favicon link
│   ├── app.js            (~2580 lines) Entire SPA: login, 7 pages, modals, SVG topology, animation
│   ├── styles.css        (~2280 lines) Design system, responsive layout (breakpoints 1180/850/768px)
│   └── favicon.svg       Logo: "N" drawn as a routed path through 4 network nodes
├── database/
│   ├── migrations/001_init.sql          MySQL 8 normalized schema (17 tables)
│   └── seeds/001_demo_organization.sql  Regions + branches seed
├── docs/
│   ├── architecture.md    Components, trust boundaries, production-hardening list
│   ├── demo-guide.md      Step-by-step demo walkthrough
│   └── wireshark-guide.md .pcap export + live loopback capture guide
├── DEMO_CREDENTIALS.txt   All demo logins, grouped by role
├── README.md
├── package.json, start.sh, .env.example, .gitignore
```

---

## 5. The simulated organization

### 5.1 Hierarchy

```
                         HQ-CORE  (NetBankX HQ Core Router)          Level 0
          ┌─────────────────┼─────────────────┐
        REG-A             REG-B             REG-C                     Level 1 (regional routers)
     Northern          Central           Southern
      ┌──┴──┐           ┌──┴──┐           ┌──┴──┐
    BR-A1  BR-A2      BR-B1  BR-B2      BR-C1  BR-C2                  Level 2 (branch routers)
   3 cust 3 cust     3 cust 3 cust     3 cust 3 cust                  Level 3 (CUST-01 … CUST-18)
```

| Region | Branch ID | Branch name | Customers (node → account) |
|---|---|---|---|
| REG-A Northern | BR-A1 | Hyderabad Central | CUST-01 Aarav Mehta, CUST-02 Ishita Reddy, CUST-03 Vivaan Rao |
| REG-A Northern | BR-A2 | Secunderabad | CUST-04 Saanvi Shah, CUST-05 Reyansh Patel, CUST-06 Aadhya Iyer |
| REG-B Central | BR-B1 | Bengaluru Main | CUST-07 Kabir Rao, CUST-08 Myra Das, CUST-09 Vihaan Kumar |
| REG-B Central | BR-B2 | Mysuru City | CUST-10 Atharv Singh, CUST-11 Kiara Bose, CUST-12 Dhruv Nair |
| REG-C Southern | BR-C1 | Chennai Marina | CUST-13 Anaya Iyer, CUST-14 Aanya Krishnan, CUST-15 Dev Malhotra |
| REG-C Southern | BR-C2 | Vellore Campus | CUST-16 Diya Sharma, CUST-17 Rohan Bhat, CUST-18 Pia Anand |

- **28 network nodes**: 1 HQ + 3 regional + 6 branch + 18 customer endpoints.
- **18 accounts**: `NBX-100001` … `NBX-100018`, one per customer node (CUST-01 ↔ NBX-100001, etc.), currency INR, seeded balances from ₹34,600 to ₹1,28,450.75.
- **4 seeded transactions** (TX-1045 … TX-1048) and 2 seeded ledger entries.

### 5.2 Links (33 total, IDs L1–L33)

Every link has `latency` (ms, used as Dijkstra weight), `bandwidth` (Mbps), `loss` (default 0.02 = 2%), `status` (online/offline).

| Tier | Links | Latency | Bandwidth |
|---|---|---|---|
| HQ → Region (L1–L3) | HQ-CORE↔REG-A/B/C | 20 / 18 / 22 ms | 5000 Mbps |
| Region → Branch (L4–L9) | e.g. REG-A↔BR-A1 | 10–14 ms | 1000 Mbps |
| Branch → Customer (L10–L27) | e.g. BR-A1↔CUST-01 | 6–8 ms | 100 Mbps |
| Lateral backup trunks (L28–L33) | REG-A↔REG-B (40), REG-B↔REG-C (38), BR-A1↔BR-A2 (25), BR-A2↔BR-B1 (45), BR-B1↔BR-B2 (25), BR-C1↔BR-C2 (25) | 25–45 ms | 500–1000 Mbps |

Lateral trunks have higher latency, so the tree is the primary path and trunks are failover paths when a tree link/router is taken offline.

### 5.3 Addressing plan (used in .pcap export, `pcap.js`)

| Tier | IP scheme | MAC scheme |
|---|---|---|
| HQ-CORE | 10.0.0.1 | 02:00:0a:00:00:01 |
| Regions | 10.1.0.1 / 10.2.0.1 / 10.3.0.1 (each a /16) | 02:00:0a:0R:00:01 |
| Branches | 10.R.B.1 (each a /24), e.g. BR-A1 = 10.1.1.1 | 02:00:0a:0R:0B:01 |
| Customers | 10.R.B.101–103, e.g. CUST-01 = 10.1.1.101 | 02:00:0a:0R:0B:65–67 |

---

## 6. Users, roles and permissions

### 6.1 Demo accounts (38 login entries for 28 people, defined in `server.js`)

| Role | Count | Example login | Password |
|---|---|---|---|
| `HQ_ADMIN` | 2 (alias pair) | `admin@netbankx.demo` / `admin@paysafe.demo` | `NetBankXDemo!2026` / `PaySafeDemo!2026` |
| `REGIONAL_MANAGER` | 4 (3 people + alias) | `regional-a@netbankx.demo` (also `regional@…`), `regional-b@…`, `regional-c@…` | `RegionalDemo!26` |
| `BRANCH_MANAGER` | 7 (6 people + alias) | `branch-a1@netbankx.demo` (also `branch@…`), `branch-a2@…` … `branch-c2@…` | `BranchDemo!26` |
| `CUSTOMER` | 25 (18 people; first customer of each branch also has a `customer-xx@` alias) | `customer@netbankx.demo` / `aarav@…` / `customer-a1@…` → Aarav Mehta; `ishita@…`, `kabir@…` etc. | `CustomerDemo!26` |

Login is lenient for the rebrand: `@netbankx.demo` and `@paysafe.demo` are interchangeable, and `NetBankX`/`PaySafe` inside the password are interchangeable. Full list: `DEMO_CREDENTIALS.txt`.

### 6.2 Permission matrix (as enforced by the backend)

| Capability | HQ Admin | Regional Mgr | Branch Mgr | Customer |
|---|---|---|---|---|
| Sidebar pages visible | All 7 | All 7 | All except Organization, Security & Audit | Overview, Transactions, Network Simulator, Reports |
| Dashboard data scope | Everything | Own region | Own branch (accounts) + region router info | Own account, branch, region path |
| `GET /customers` scope | All 18 | Own region | Whole region (home branch flagged) | Own account only |
| `GET /transactions` scope | All | Any tx touching the region | Intra-branch only (`?scope=all` → any tx touching branch) | Own account's tx |
| Transfer (`POST /transactions/transfer`) | Yes, any account | No | No | Only from own account |
| Deposit | Yes | Accounts in own region | Accounts in own region | Allowed (see §13) |
| Withdrawal | Yes | Accounts in own region | Accounts in own region | **No** ("must be processed by bank staff") |
| Network-simulated transfer (`POST /simulations` with amount) | Any source | Any source | Source must be in own branch | Source must be own account |
| Toggle links/nodes online/offline, edit latency/loss | **Yes (only role)** | No | No | No |
| `GET /audit` (Security & Audit page) | All events | Filtered to link/tamper/security/simulation events | 403 | 403 |
| Organization endpoint | All | Own region | 403 | 403 |
| Run AES-GCM tamper demo | Yes | Yes | Yes | Yes |
| Download .pcap / dissect | Yes | Yes | Yes | Yes |

---

## 7. Backend — API reference (`backend/src/server.js`)

All endpoints except `/api/health` and `/api/auth/login` require `Authorization: Bearer <token>`. Every response has `Cache-Control: no-store`. JSON body limit 100 KB. Errors are `{ "error": "message" }`.

### 7.1 Auth
| Method & path | Purpose |
|---|---|
| `GET /api/health` | `{status:'ok', service, mode:'educational in-memory demo', uptimeSeconds}` |
| `POST /api/auth/login` | Body **`{username, password}`** → `{token, user}`. Token = 32 random bytes hex, stored in an in-memory `Map`. Failed logins are audited as `LOGIN_REJECTED`. |
| `GET /api/auth/me` | Current user (safe fields only, no password) |
| `POST /api/auth/logout` | Deletes the session token |

### 7.2 Banking
| Method & path | Purpose |
|---|---|
| `GET /api/dashboard` | KPIs (regions, branches, staff, customers, active accounts, completed/failed tx, volume, online nodes/links), latest 8 tx, accounts, regions, branches, role-specific `customerRegionDetail`, latest 5 simulations, latest 6 audit events |
| `GET /api/organization` | Regions + branches (HQ, Regional only) |
| `GET /api/customers` | Scoped customer/account list with branch/region names |
| `GET /api/recipients` | All active accounts (minus own, for customers) — used to pick transfer recipients |
| `GET /api/transactions[?scope=all]` | Scoped transaction list |
| `POST /api/transactions/:type` | `type` = `transfer` \| `deposit` \| `withdrawal`. Body `{source, destination, amount, reference, idempotencyKey, tamper}` |

**Transaction validation rules** (in order): type must be valid → role allowed → managers only deposit/withdraw → amount must be finite, > 0 and ≤ ₹10,00,000 → source exists, active and has enough balance (not for deposits) → transfer recipient exists, active, and differs from source → customers cannot withdraw → customers can only send from own account → managers limited to accounts in their region.

**On success:** balances are updated (rounded to 2 decimals), ledger entries are written (transfer = DEBIT + CREDIT, withdrawal = DEBIT, deposit = CREDIT), tx is stored with status `COMPLETED`, an audit event `<TYPE>_COMMITTED` is recorded. Response `201` with `{transaction, balances, ledgerEntries}`.

**With `tamper: true`:** a `FAILED` transaction with `tampered:true` and failure reason "AES-256-GCM Tag Mismatch" is recorded, a security event `INTEGRITY_TAMPER_DETECTED` is logged, no balance changes.

Transaction IDs look like `TX-<last 6 digits of timestamp>-<4 hex>`.

### 7.3 Network
| Method & path | Purpose |
|---|---|
| `GET /api/network/topology` | `{nodes, links}` |
| `PATCH /api/network/links/:id` | HQ only. Body any of `{status:'online'|'offline', latency:1–2000, loss:0–1}`. Logs audit + security event. |
| `PATCH /api/network/nodes/:id` | HQ only. Body `{status}` — take a router offline |

### 7.4 Simulations
| Method & path | Purpose |
|---|---|
| `POST /api/simulations` | Body `{source, destination, amount, reference, tamper, lossOverride (0–1), seed}`. Source/destination may be node IDs (`CUST-01`) or account IDs (`NBX-100001`). Runs the packet simulation, and **if an amount is given, commits or fails a real ledger transfer based on the result** (see §8.3). Returns `{simulation, balances}`. |
| `GET /api/simulations` | All runs this session |
| `GET /api/simulations/:id` | One run with its full event list |
| `GET /api/simulations/:id/pcap` | Binary download `paysafe-sim-xxxxxx.pcap` (`application/vnd.tcpdump.pcap`). Accepts the token via header **or `?token=` query string** so a plain link can download it. |
| `GET /api/simulations/:id/dissect` | `{simulationId, status, framesCount, frames[]}` — parsed frames for the in-browser Wireshark-style viewer |

### 7.5 Security & audit
| Method & path | Purpose |
|---|---|
| `POST /api/security/tamper-demo` | Standalone AES-256-GCM demonstration (see §9.1) |
| `GET /api/audit` | `{events, security}` — HQ and Regional only |

Unknown non-API paths fall back to `index.html` (SPA routing). A final error handler returns `500 {"error":"Unexpected server error. Please retry."}`.

---

## 8. Network engine (`backend/src/engine.js`)

### 8.1 Dijkstra shortest path — `shortestPath(nodes, links, start, end)`
- Edge weight = configured link **latency (ms)**; links are undirected.
- Only **online links** and **online nodes** are considered; if the start or end node is offline it returns `null` immediately.
- Simple O(V²) array-scan Dijkstra (no priority queue) — fine for 28 nodes.
- **Deterministic tie-breaking**: neighbour edges are processed in sorted link-ID order and a distance is only replaced on *strict* improvement, so equal-cost paths always resolve the same way.
- Returns `{path: [nodeIds…], latency: totalMs}` or `null` when unreachable.

**Worked examples (all links online):**
- CUST-01 → CUST-02 (same branch): `CUST-01 → BR-A1 → CUST-02` = 12 ms, 2 hops.
- CUST-01 → CUST-07 (cross-region): `CUST-01 → BR-A1 → REG-A → HQ-CORE → REG-B → BR-B1 → CUST-07` = 6+12+20+18+11+6 = **73 ms**, 6 hops. Alternatives: via lateral REG-A↔REG-B = 75 ms; via BR-A1↔BR-A2↔BR-B1 = 82 ms.
- If HQ-CORE is taken offline, the same transfer reroutes over REG-A↔REG-B (75 ms).

### 8.2 Packet simulation — `simulate(state, options)`
1. Compute the Dijkstra route. No route → status `FAILED`, event `simulation.failed`.
2. Seeded **linear congruential generator** (`rng = 1664525·rng + 1013904223 mod 2³²`) makes loss reproducible for a given seed. The server picks a random seed if none is sent.
3. For each hop: emit `packet.forwarded` (with latency and bandwidth). Draw a random number; if it is below the loss probability (`lossOverride` if provided, otherwise the link's own `loss`) the packet is lost → `packet.retrying`. **Max 2 retries per hop** (3 attempts). After the third loss → `packet.dropped`, simulation `FAILED`.
4. **Tamper mode:** at hop index `min(len−2, max(1, floor((len−1)/2)))` — roughly the middle of the path — emit `packet.tampered` (simulated MITM flips ciphertext bits), then `integrity.failed` (AES-256-GCM tag mismatch at the receiving node) and `packet.blocked`. Status `BLOCKED`, `blockedAt` = that node. For CUST-01 → CUST-07 that is **REG-B**.
5. On success: `packet.delivered`, `integrity.verified`, `ledger.committed`; status `COMPLETED`.
6. Metrics stored: `route`, `latency` (Dijkstra total), `hops`, `packetsSent`, `packetsDelivered`, `packetsLost`, `retries`, `packetLossRate` (%), `durationMs` (sum of forwarded-hop latencies, so retries add time), `seed`, full `events[]` with timestamps.

Simulation statuses: `RUNNING` (transient) → `COMPLETED` | `FAILED` | `BLOCKED`.

### 8.3 How a simulation drives the ledger (`POST /api/simulations` with an amount)
| Simulation result | Ledger effect | Transaction record | Audit / security |
|---|---|---|---|
| `COMPLETED` | Source debited, destination credited, 2 ledger entries | `TRANSFER`, `COMPLETED`, linked `simulationId` | `TRANSFER_COMMITTED` |
| `BLOCKED` (tampered) | **No money moves** | `FAILED`, `tampered:true`, reason "Modified packet blocked by AES-256-GCM authentication tag" | Security `INTEGRITY_TAMPER_DETECTED`, audit `PACKET_TAMPER_BLOCKED` |
| `FAILED` (loss / no route) | **No money moves** | `FAILED`, reason "Maximum retries reached due to packet loss" | `TRANSFER_FAILED_NETWORK_LOSS` |

Balance, ownership and amount checks run **before** the simulation, so an invalid request never produces a run.

---

## 9. Security features

### 9.1 AES-256-GCM tamper demo (`POST /api/security/tamper-demo`)
Creates a test payload `{transactionId, amount:1250, currency:'INR', purpose}`, encrypts it with a random 256-bit key and 96-bit IV using AES-256-GCM, **flips one bit of the ciphertext**, then tries to decrypt with the original authentication tag. GCM rejects it. Response: `alteredPayloadDetected: true`, `integrity: 'FAILED_AS_EXPECTED'`, `financialDataChanged: false`. Key and ciphertext never leave the server. This is the only place real AES-GCM crypto runs; the in-simulation tamper events model the same outcome.

### 9.2 Other security measures in the demo
- Server-issued random bearer tokens, resolved to a user server-side; passwords never returned.
- Role checks (`allow(...)` middleware) and per-role data scoping on every read and write.
- Input validation: amount range, link latency 1–2000 ms, loss 0–1, status enum.
- Helmet security headers; `Cache-Control: no-store`; 100 KB body limit.
- HTML escaping (`esc()`) of all user/data strings rendered in the frontend.
- Audit trail of logins, rejected logins, logouts, every money movement, network changes, simulations and tamper events.

### 9.3 Known security limitations (it's a demo)
Plain-text demo passwords in source; tokens in `localStorage` and never expire; sessions lost on restart; pcap token accepted in URL query string; no rate limiting, CSRF protection or HTTPS. `docs/architecture.md` lists the production hardening plan (Argon2id/bcrypt, HTTP-only cookies, CSRF, DB transactions with row locks, durable idempotency, TLS, rate limits).

---

## 10. Wireshark / PCAP export (`backend/src/pcap.js`)

Each simulation can be exported as a genuine **libpcap 2.4** file (magic `0xa1b2c3d4`, snaplen 65535, link type 1 = Ethernet) that opens in desktop Wireshark or `tshark`. Frames are built byte-by-byte:

1. **ARP** request (broadcast `ff:ff:ff:ff:ff:ff`: "Who has gateway? Tell client") and reply.
2. **TCP 3-way handshake** SYN → SYN/ACK → ACK, client port `52400 + customer number`, server port **8443**.
3. **Data segment per router hop** (TCP PSH/ACK) carrying a JSON payload labelled `PaySafe-NetBankX/1.1`, `ISO20022-pain.001.001.09`, with amount, reference and AES-256-GCM metadata (IV, auth tag). Per hop: Ethernet src/dst MACs change, IPs stay end-to-end, **IP TTL decrements by 1**, DSCP set to `0xb8` (Expedited Forwarding).
4. **Retransmissions** — each simulated retry produces a duplicate segment 200 ms later (Wireshark flags `[TCP Retransmission]`).
5. **Correct checksums** — IPv4 header checksum (RFC 791) and TCP pseudo-header checksum (RFC 793) using 16-bit one's-complement.
6. **Tampered run** — payload after the tamper point shows amount ×10 and `[MALICIOUS_ADVERSARY_MODIFIED]`, followed by **ICMP Type 3 Code 13** (communication administratively prohibited) and **TCP RST/ACK**.
7. **Failed run (loss)** — **ICMP Type 3 Code 1** (host unreachable).
8. **Completed run** — server ACK, **HTTP/1.1 200 OK** JSON ledger response, client ACK, then a **4-way FIN teardown**.

`getDissectedFramesSummary()` parses the same buffer back into frames (number, relative time, src/dst MAC & IP, protocol, info, TTL, flags, seq/ack, payload preview) for the **in-browser dissector modal**.

Separately, real browser ↔ server traffic on port 3000 can be captured with Wireshark on the loopback adapter (`tcp.port == 3000`) — see `docs/wireshark-guide.md`.

---

## 11. Frontend (`frontend/`)

Single-page app rendered by `app.js` into `#app`; navigation is in-memory (no URL routes). The token is stored in `localStorage` (`netbankx_token`); a 401 anywhere clears it and returns to login. Currency formatted as Indian Rupees (`en-IN`).

### 11.1 Login screen
Split layout with an animated mesh background, hero text ("Real-time banking. Autonomous networks."), feature badges (40 Gbps Core, AES-256-GCM Guard, Dynamic Dijkstra), a "Live 4-tier topology" preview card, and a credential picker with role tabs (HQ / Regional / Branch / Customer) — clicking a card fills the login form. Stacks vertically on narrow/portrait screens.

### 11.2 Pages
| Page | What it shows / does |
|---|---|
| **Overview** | Time-of-day greeting; KPI cards; a role-specific main panel — customers: "NetBankX Digital Smart Card" with balance and their network path (customer → branch → region → HQ); branch managers: "Branch Vault Reserves & Settlement" with branch/regional router info; regional managers: "Regional Clearing & Liquidity Hub"; HQ: "NetBankX Global Clearing House". Plus an "Enterprise network" mini topology, recent transactions and recent activity (audit). |
| **Organization** | Regions and branches tree (HQ, Regional only). |
| **Customers** | Searchable customer/account table with branch, region, balance, status. Staff get **Deposit** and **Withdraw** buttons opening modals. |
| **Transactions** | Searchable/filterable ledger table scoped by role; branch managers can toggle "this branch only" vs "all touching my branch"; customers get a **＋ New Transaction** button ("Send money to another customer": recipient picker, amount, reference, optional tamper flag → `POST /transactions/transfer`); click a row for a details modal (ledger entries, linked simulation, failure reason). |
| **Network Simulator** | Main networking page. Full **SVG topology map** of all 28 nodes and 33 links (offline ones shown differently). Pick sender and recipient customers, amount, reference, **packet-loss slider (0–60%)** and a **"tamper packet in transit"** toggle, then send. The route is highlighted and an **animated packet dot** moves hop by hop (turns red and stops at the blocking router if tampered; green on delivery). Shows run metrics (route, hops, latency, retries, loss rate, duration), a per-event **timeline**, **Download .pcap** and **Inspect Dissector** buttons. HQ admins also get **link controls** (pick a link, set online/offline). |
| **Security & Audit** | Runs the AES-256-GCM tamper demo; lists tamper/integrity events, link change events and the audit log (HQ, Regional only). |
| **Reports** | KPI summary, full transaction extract, latest simulation metrics, **Export CSV** (`netbankx-transactions.csv`). |

### 11.3 Visual design
Dark navy sidebar and login, light content area; brand gradient teal `#0d9488` → `#14b8a6` → cyan `#38bdf8`; navy `#09192b`. Logo/favicon: a white "N" drawn as a routed path through four network nodes on the gradient tile. Responsive breakpoints at 1180 px, 850 px and 768 px.

---

## 12. Database schema (designed, not connected)

`database/migrations/001_init.sql` defines a normalized **MySQL 8** schema (database `paysafe`, utf8mb4) that the in-memory model maps onto. **17 tables:**

- **Organization:** `regions`, `branches`
- **Identity:** `users` (email, `password_hash`, role enum incl. `BRANCH_STAFF`), `staff_profiles`, `user_sessions` (hashed session, expiry)
- **Banking:** `customers`, `accounts` (`DECIMAL(19,2)`, `CHECK balance >= 0`, status ACTIVE/FROZEN/CLOSED), `transactions` (types incl. `REVERSAL`; statuses CREATED/VALIDATING/SIMULATING/COMPLETED/FAILED/REJECTED/REVERSED; unique `idempotency_key`; `CHECK amount > 0`), `ledger_entries` (DEBIT/CREDIT), `idempotency_records` (user + key + request hash)
- **Network:** `network_nodes`, `network_links` (CHECK latency 1–2000, loss 0–1), `simulation_runs`, `packet_events` (unique simulation + sequence number)
- **Governance:** `audit_logs`, `security_events`

Foreign keys and indexes are defined throughout. The seed file inserts the 3 regions and 6 branches only.

---

## 13. Accuracy notes — where existing docs differ from the code

Document the **code behaviour**; these are the known mismatches:

1. **Login field name:** README says email; the API body field is **`username`** (the value is an email address).
2. **Number of accounts:** README says 30 accounts (5 per branch); the code has **18 accounts (3 per branch)**.
3. **Who can move money:** README says only Customer and HQ Admin; the code also lets **Branch and Regional managers make deposits and withdrawals** for accounts in their region, and **customers cannot withdraw**.
4. **Customer deposits:** README says customers deposit only to their own account; the code does not enforce this (a customer can deposit to any active account).
5. **Network controls:** README says "authorized roles"; in the code **only HQ_ADMIN** can change links/nodes.
6. **Idempotency:** README claims idempotency-key deduplication; the code **stores the key on each transaction but does not reject duplicates**.
7. **Balance mutation:** `docs/architecture.md` says only the transaction endpoint changes balances; **`POST /api/simulations` with an amount also commits transfers** (by design — the network outcome decides the transfer).
8. **Default packet loss in the UI:** the simulator's loss slider starts at 0% and is always sent as `lossOverride`, so the per-link default 2% loss is only used when calling the API without `lossOverride`.
9. **Branding:** mixed "PaySafe" and "NetBankX" — package name `netbankx-enterprise-simulator`, DB name `paysafe`, pcap files `paysafe-sim-*.pcap`, payload protocol `PaySafe-NetBankX/1.1`, README title "PaySafe".
10. **Staff KPI** on the dashboard counts login aliases, so it shows 13 rather than 10 distinct staff.
11. **Tamper block point** for same-branch transfers (2-hop routes) lands on the destination customer node, not a router.

---

## 14. Testing

`npm test` runs 12 tests with Node's built-in runner — all pass.

**engine.test.js (8):** Dijkstra finds a route; offline links are never used; unreachable returns null; completed simulation records delivery events; offline router excluded from routes; equal-cost ties deterministic; failed simulation initializes metrics to 0; tampered packet is BLOCKED with tamper + block events and 0 delivered.

**pcap.test.js (4):** valid libpcap 2.4 global header; dissected frames include ARP, TCP and banking payload (≥ 10 frames); tampered run contains tamper frame plus ICMP/RST; checksum function returns a valid 16-bit value.

Not covered by tests: HTTP endpoints, authorization rules, ledger math, the frontend.

---

## 15. Computer-networks concepts demonstrated (for a CN report)

| Concept | Where |
|---|---|
| Hierarchical (tree) enterprise topology with redundant lateral links | `seedState()` topology, Network Simulator map |
| Link-state style shortest-path routing (Dijkstra) with latency metric | `shortestPath()` |
| Failover / rerouting when a link or router goes down | HQ link controls → recompute route |
| Hop-by-hop forwarding | `packet.forwarded` events, animated packet |
| Packet loss, retransmission, retry limits | LCG-seeded loss, max 2 retries per hop |
| Reproducible experiments | Seeded PRNG |
| Latency, hop count, loss rate metrics | Simulation metrics panel |
| ARP address resolution | pcap frames 1–2 |
| TCP 3-way handshake, sequence/ack numbers, PSH, FIN 4-way teardown, RST | pcap generator |
| IPv4 TTL decrement per hop, header checksum, DSCP QoS marking | pcap generator |
| MAC addresses change per hop, IP addresses stay end-to-end | pcap generator |
| ICMP destination-unreachable (codes 1 and 13) | pcap generator |
| Hierarchical IP addressing / subnetting (10.R.B.x, /16 and /24) | `NODE_NETWORK_CONFIG` |
| Man-in-the-middle attack and authenticated encryption (AES-256-GCM integrity) | Tamper toggle, tamper demo |
| Application-layer payload (HTTP/JSON, ISO 20022-style message) | pcap payload |
| Real traffic capture vs simulated traffic | Wireshark loopback guide |

---

## 16. Limitations and future work

- Data is in memory only; MySQL schema exists but is not wired in.
- No registration, password reset, or staff/region/branch create-edit-delete screens.
- Simulation is computed in one request and then animated; no live WebSocket streaming or real pause/resume/step.
- `trendChart()` (an illustrative static chart) exists in `app.js` but is not currently shown on any page.
- The frontend never sends an idempotency key; the server generates one per request.
- Demo-grade auth (plain passwords, non-expiring tokens in localStorage).
- Simulated routers and packets are models — they are not real network devices or real TCP between nodes; only browser ↔ server traffic is real.
- Production steps listed in `docs/architecture.md`: DB transactions with row locks, durable idempotency, HTTP-only cookies + CSRF, hashed passwords, rate limiting, TLS, monitoring, accounting reconciliation (debits = credits).
