---
instruction_id: treat-declared-shortcut-as-decision
title: Treat a declared shortcut as a decision
summary: "A comment that names its ceiling and upgrade path is a deliberate decision, not a finding, unless the expected load already crosses it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: You found a shortcut marked with a comment that names its limit.
conditions_does_not_apply_when: The simplification carries no marker and no named limit.
artifact_contract_output_type: shortcut-decision
artifact_contract_required_data:
  - shortcut limit
  - upgrade trigger
  - expected load
  - decision
artifact_contract_verified_by: each marked shortcut is accepted or refuted by the assumed load
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 2
---

# Treat a declared shortcut as a decision
Every deliberate shortcut is marked with a `shortcut:` comment naming its ceiling and upgrade path.
A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.
A shortcut marked with a `shortcut:` comment that names its limit is a decision, not a finding, unless the expected load already crosses it.
Pull the ceiling and the trigger straight from the comment.
Any marker comment that names no upgrade path or trigger gets a `no-trigger` tag.
Those are the ones that silently rot.
