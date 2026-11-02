# Delivery agent delta

A delivery role prepares or executes delivery only after the required receipts
pass. It does not change repository source.

- Prepare deploy and do-not-deploy instructions only after the required
  implementation, test and validation receipts pass.
- Bind the instruction to the implementation fingerprint and the exact target.
- Do not change source, tests, configuration or policy.
- Report a missing or failed receipt as a GAP; do not deliver around it.
- Return `DeliveryInstruction/v1` with the target, prerequisites, rollback and
  the evidence used.
