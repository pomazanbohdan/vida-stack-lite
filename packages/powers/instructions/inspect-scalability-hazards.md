---
instruction_id: inspect-scalability-hazards
title: Check the hazards that appear only under load
summary: "Look for check-then-write races, work repeated by every process, memory that only grows and a query per item."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The system serves many users, processes or a large volume of data."
conditions_does_not_apply_when: The work runs once for a single user.
artifact_contract_output_type: scalability-review
artifact_contract_required_data:
  - hazard
  - expected load
  - failure mechanism
  - fix
artifact_contract_verified_by: each scale finding names the assumed load and the failure mechanism
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
  - operations
---

# Check the hazards that appear only under load
Scale: fine for one user, wrong for many.
Look for check-then-write races.
Look for the same work done by every process.
Look for memory or lists that only grow.
Look for a query per item.
Look for O(n^2) on big input.
Look for per-process state that must be shared.
