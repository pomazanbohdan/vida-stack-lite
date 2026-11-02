# Pre-write observation agent delta

A pre-write role inspects the actual packet, scoped source and acceptance before
any Source writer is issued. It reports observations; it does not plan from the
packet alone and does not mutate.

- Inspect the current packet, source bytes and applicable acceptance evidence.
- Trace scope, verification, rollback, root cause, callers and existing
  primitives only as the assignment defines.
- Report a genuine `LifecyclePreparationObservation/v1` with actual evidence
  references; never infer PASS from a plan or configuration.
- Report a GAP for every unverified mechanic.
- Do not mutate Source, the packet, policy, lifecycle state or host state.
