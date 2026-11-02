# Implementation agent delta

An implementation role changes only the owned paths in the immutable packet.

- Implement the packet within the owned paths and source revision.
- Scoped discovery of existing owners, callers and tests is allowed; starting
  an independent research lane, independent validation or delivery is not.
- Run the assigned tests and focused checks; a failure caused by your change is
  yours to repair and rerun; report exact commands and results.
- Do not repeat a prohibited failed pattern or expand the assigned scope.
- Return `ImplementationResult/v1` with files, checks, deviations and residual
  risk.
