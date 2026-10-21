---
instruction_id: do-not-flag-a-locked-user-decision-as-a-defect
title: Do not flag a locked user decision as a defect
summary: A decision the owner locked is the contract; the review checks the artefact against it and never reports the lock itself as a finding.
capability_tags:
  - review-code
pattern_tags:
  - frozen-intent
conditions_applies_when: A review runs over an artefact that implements a locked owner decision.
conditions_does_not_apply_when: The decision is still open.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the findings
  - the locked decisions that were honoured
artifact_contract_verified_by: no finding contradicts a locked decision and the locked decisions are named as honoured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.compact.md
status: active
revision: 1
---

# Do not flag a locked user decision as a defect
**Context-aware:** Respects CONTEXT.md locked decisions (don't flag user's explicit choices)
| `## Decisions` | Locked — UI-SPEC must reflect these. Flag if contradicted. |
