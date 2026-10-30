---
instruction_id: state-assumed-load
title: State the load you assumed
summary: "Find the expected load in the repository and judge scale against it, not against an imagined peak."
capability_tags:
  - review-code
  - audit-codebase
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: A review or an audit judges whether the code holds under load.
conditions_does_not_apply_when: The change does not depend on how many users or processes run it.
artifact_contract_output_type: load-assumption
artifact_contract_required_data:
  - expected load
  - source of the assumption
  - findings that depend on it
artifact_contract_verified_by: the assumed load is stated before any scale finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# State the load you assumed
Find the expected load in the repo (README, deploy config): one person running a script, or many users and processes at once.
Judge scale against that, and say which load you assumed.
Start the report with the load you assumed.
A break at the expected load is a must fix.
