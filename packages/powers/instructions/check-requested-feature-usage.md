---
instruction_id: check-requested-feature-usage
title: Check that a proposed feature is actually needed
summary: "Verify before implementing: find the actual usage of the proposed feature, and remove it if nothing calls it."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A reviewer or a request proposes implementing a feature properly.
conditions_does_not_apply_when: The feature already has confirmed callers in the code.
artifact_contract_output_type: usage-check
artifact_contract_required_data:
  - feature
  - call sites
  - decision
artifact_contract_verified_by: code search finds the actual callers
compatibility_excludes: []
compatibility_requires:
  - minimize-code-surface
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/receiving-code-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check that a proposed feature is actually needed
Verify before implementing.
Ask before assuming.
If a reviewer suggests implementing something properly, search the codebase for actual usage.
If it is unused, say the code is not called and ask whether to remove it.
If it is used, then implement it properly.
If we do not need this feature, do not add it.
If the suggestion seems wrong, push back with technical reasoning.
Does it need to exist?
Before calling code unused, search the whole tree for it, including tests, fixtures, config, and string or dynamic references.
Delete dead code, unused options, speculative features.
Reuse the helper the repo already has, and name the path.
Use the standard library or the platform feature instead of a new dependency.
Drop the abstraction with one implementation and the config nobody sets.
Propose the smallest fix that works.
Prefer fixes that delete code.
Never add layers, frameworks or config the problem does not need.
