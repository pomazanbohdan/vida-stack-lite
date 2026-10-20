---
instruction_id: stop-a-dimension-on-coverage-or-novelty-exhaustion
title: Stop a dimension on coverage or novelty exhaustion
summary: "A dimension ends when its questions are answered or when a full round brings nothing new, and the reason for stopping is stated."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A dimension has been worked through round by round.
conditions_does_not_apply_when: The dimension has not reached its round cap yet.
artifact_contract_output_type: stop-reason
artifact_contract_required_data:
  - the reason the dimension stopped
  - the open questions left
artifact_contract_verified_by: the stopping reason is named and no open question is dropped silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 1
---

# Stop a dimension on coverage or novelty exhaustion
A dimension stops before its round cap when either holds:
- **Coverage** — its plan questions are answered, with the critical claims confirmed per the resolved `validation` level.
- **Novelty exhaustion** — a full round surfaced no new load-bearing claim or lead.
Say which one ended it. Hitting the round cap with open questions is reported as an open question, never silently dropped.
