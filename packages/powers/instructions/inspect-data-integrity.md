---
instruction_id: inspect-data-integrity
title: Check data integrity under failure
summary: "Look for swallowed errors, writes in the wrong order and writes with no transaction."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The reviewed code writes, updates or deletes stored data."
conditions_does_not_apply_when: The code changes no stored state.
artifact_contract_output_type: data-integrity-review
artifact_contract_required_data:
  - write paths
  - failure sequence
  - lost data
  - fix
artifact_contract_verified_by: each data-loss finding names the failure sequence that loses data
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check data integrity under failure
Look for data loss: errors swallowed, writes in the wrong order, no transaction.
Check what the change could break for users: data it would destroy or expose.
Code you move or merge keeps its error handling and validation.
