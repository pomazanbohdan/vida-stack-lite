---
instruction_id: name-the-reason-review-is-slow
title: Name the reason review is slow
summary: "A thorough review takes time on purpose; name the actual cause - too many rules in the file the reviewers read, very large sources, or a platform without parallel reviewers - and offer the shallower pass."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review takes longer than the user expected.
conditions_does_not_apply_when: The review has not run yet.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the cause
  - the shallower pass offered
artifact_contract_verified_by: the report names the cause and offers the shallower run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/review-choices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Name the reason review is slow
It is thorough on purpose and can take half an hour or more.
Offer a quick pass instead.
`AGENTS.md` has too many rules, or source files are very large. Reviewers read both.
The platform has no subagents or runs them one at a time.
