---
instruction_id: keep-the-line-until-the-check-is-live
title: Keep the line until the check is live
summary: "Offer the check that enforces the rule better than prose, keep the prose line as the fallback, and hold it until the check is in place."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A rule could be enforced mechanically and the line is still the only thing that enforces it today.
conditions_does_not_apply_when: The rule is a judgement call that no check can decide.
artifact_contract_output_type: automation-offer
artifact_contract_required_data:
  - the check that would enforce it
  - the fallback line
  - the state of the check
artifact_contract_verified_by: the line is still present while the check is not yet in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/adding-a-portability-rule.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 2
---

# Keep the line until the check is live
Ask first whether a hook, lint rule, or CI check enforces it better than prose; if so propose the check, and the line becomes the fallback if they decline.
A ledger entry marked `automate` keeps its instruction until its check is in place
- A false positive is a rule bug, fixed in the rule — never by adding an opt-out.
- Fix every violation — no ratchet, no grandfathering. Every existing + grandfathered offender is fixed in the same phase
- These rules are **hard-fail with zero escape hatches**: there is no `// windows-portability-ok:` comment and no `eslint-disable` for them
- Legitimately platform-specific code must be *structured* so the rule recognizes it (see "Platform guards" below) — not annotated around.
