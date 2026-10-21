---
instruction_id: an-empty-value-under-a-complete-scope-is-a-real-answer
title: An empty value under a complete scope is a real answer
summary: "Zero under a scope that says the read succeeded is the answer; zero under a scope that says nobody looked is not, and the two are never rendered the same way."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A value is rendered together with the scope that says how it was obtained.
conditions_does_not_apply_when: The value is not scoped.
artifact_contract_output_type: scoped-value
artifact_contract_required_data:
  - the value
  - the scope it was obtained under
artifact_contract_verified_by: an empty value under a complete scope is rendered as the answer and never as a failure to look
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/consume-the-planning-snapshot.md
status: active
revision: 1
---

# An empty value under a complete scope is a real answer
**`complete` with an empty value is a real answer.** A milestone with zero phases genuinely has zero phases. `unreadable` with an empty value means nobody looked. Rendering both as "0 phases" is the bug this field exists to prevent.
