---
instruction_id: separate-blocking-slowdowns
title: Separate a real slowdown from a small optimization
summary: "Big slowdowns are problems, small wins in a hot loop are suggestions, and some software counts every millisecond."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review or audit looks at speed.
conditions_does_not_apply_when: The software does not count milliseconds.
artifact_contract_output_type: speed-finding-classification
artifact_contract_required_data:
  - slow path
  - defect or suggestion
  - case
  - expected load
artifact_contract_verified_by: each speed finding is labeled as a defect or a suggestion
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
instruction_form: decision-rule
domains:
  - engineering
---

# Separate a real slowdown from a small optimization
Speed: big slowdowns are problems.
Small wins (work repeated in a hot loop) are suggestions.
Some software counts every millisecond.
