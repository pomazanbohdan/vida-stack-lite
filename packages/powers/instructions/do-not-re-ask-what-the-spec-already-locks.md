---
instruction_id: do-not-re-ask-what-the-spec-already-locks
title: Do not re-ask what the spec already locks
summary: What the specification already locks is not asked again and not copied into the decisions.
capability_tags:
  - clarify-requirements
pattern_tags:
  - frozen-intent
conditions_applies_when: "A written specification already locks the requirements, boundaries and acceptance criteria."
conditions_does_not_apply_when: No specification exists and the requirements are still open.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the locked requirements
  - the remaining implementation decisions
artifact_contract_verified_by: "no question is asked about what to build or why, and the locked text is not copied into the decisions"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not re-ask what the spec already locks
Do NOT generate gray areas about WHAT to build or WHY. Only generate gray areas about HOW to implement.
Do NOT duplicate requirements text
from the spec into the decisions.
agents read the spec directly.
The `<decisions>` section contains only implementation decisions from this discussion.
