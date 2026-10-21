---
instruction_id: record-the-cost-and-the-conditions-of-a-shortcut
title: Record the cost and the conditions of a shortcut
summary: "A recorded shortcut carries its immediate benefit, its long-term cost and the conditions under which it is acceptable."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A shortcut is written down as a known one.
conditions_does_not_apply_when: The shortcut is not being recorded for a later reader.
artifact_contract_output_type: shortcut-record
artifact_contract_required_data:
  - the immediate benefit of the shortcut
  - the long-term cost
  - the conditions under which it is acceptable
artifact_contract_verified_by: the record says what the shortcut costs and when it is allowed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 1
---

# Record the cost and the conditions of a shortcut
Be realistic — some shortcuts are acceptable
Note when shortcuts are "never acceptable" vs. "only in MVP"
Include the long-term cost to inform tradeoff decisions
| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
