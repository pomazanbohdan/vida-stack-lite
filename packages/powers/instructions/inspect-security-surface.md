---
instruction_id: inspect-security-surface
title: Check the security surface
summary: "Look for injection, weak randomness, secrets in code and missing checks on input from users."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The reviewed code takes input from users or handles money, access or secrets."
conditions_does_not_apply_when: The code has no external input and handles no sensitive data.
artifact_contract_output_type: security-surface-review
artifact_contract_required_data:
  - input paths
  - missing check
  - case
artifact_contract_verified_by: each security finding names the input path and the missing check
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
revision: 2
---

# Check the security surface
Look for security holes: injection, weak randomness, secrets in code, missing checks on input from users.
Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.
