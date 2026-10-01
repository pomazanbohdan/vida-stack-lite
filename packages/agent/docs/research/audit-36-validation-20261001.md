# Audit36 architectural validation

Owner: agent maintainer. Canonical behavior:
`../system-specification.md`. This document records factual research and open
qualification evidence; it grants no lifecycle, review or Runtime acceptance.

The human-approved one-batch repair includes coupled runtime identity recovery,
produced-contract recovery checks, live same-owner writer heartbeat, durable
failed observations, explicit terminal status, stable assignment identity,
exact report retry and graph-defined terminal outputs. The current Source
contains the coupled identity and Mastra-ledger exact retry checks. Baseline
assignment filtering renumbered selected assignments; this batch preserves
their original configured indexes.

Accepted architectural decisions reuse the existing scope attribution pointer
for actual request grouping and Mastra's persisted terminal outcome for status
projection. They add no redundant intake anchor or terminal-status store.
Permanent absorption requires one transaction over predecessor states,
successor state and coordination ledger, with current journal CAS and guarded
source effects. Current-v1 repair remains a release prerequisite.

The rollback baseline is a read-only projection of canonical HostState, held
under the existing maintenance fence during restore. Initialization does not
stand in for first admission. Private database inspection and timestamps do not
constitute the public consumer contract.

Static evidence: focused replay regressions cover exact retries, failed waves,
and success versus failed/canceled/unknown terminal projections. The shared
typecheck passes. Absorption, bundled repair, consumer rollback, final package
quality, independent reviews and installed-runtime observations remain open.
No research-agent response is represented as a runtime-issued review receipt.
