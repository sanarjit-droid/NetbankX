# Demo walkthrough

1. Start the server and sign in with the HQ administrator demo credentials.
2. Review the Overview KPIs, seeded transaction records and organizational regions.
3. Open Transactions → New transaction. Choose a transfer, source account, destination account and positive amount; confirm the operation. The balance and ledger change in the backend demo state.
4. Open Network Simulator. Choose `CUST-01` and `CUST-02`, set packet loss to `0%`, then click **Transmit packet**. Inspect the route, per-hop event list and measured metrics.
5. Increase packet loss and transmit again to explore retries. Results are seeded by the chosen random seed; loss remains a simulation input rather than real TCP loss.
6. In the link controls, disable a link and transmit again. The routing engine recalculates using available links; if there is no route, the run fails.
7. Open Security & Audit and run the tampering demonstration. AES-GCM authentication should reject the altered ciphertext. The demo does not change balances.
8. Sign out and try the regional, branch and customer demo identities to inspect the role-specific data scopes.
9. Use the Wireshark guide to capture actual local browser/server TCP traffic separately from simulated packet events.

## Known gaps to disclose in a project demo

The current deliverable is a runnable educational demo with functional APIs and core routing/security demonstrations, not a production banking product. MySQL persistence is represented by the schema but not wired into runtime; live WebSocket streaming, registration, full staff/branch CRUD, and a true pause/resume simulation state machine remain future implementation work. Explain this honestly in a review.
