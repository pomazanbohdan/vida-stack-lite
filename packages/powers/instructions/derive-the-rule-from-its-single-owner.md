---
instruction_id: derive-the-rule-from-its-single-owner
title: Derive the rule from its single owner
summary: A rule has one implementation that owns it; a hand-maintained copy of that rule drifts and is replaced by a derivation.
capability_tags:
  - design-structure
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A parallel copy of a rule exists beside the code that owns the rule.
conditions_does_not_apply_when: The copy is the owner and the other side is the derived view.
artifact_contract_output_type: single-owner-derivation
artifact_contract_required_data:
  - the rule that owns the value
  - the derivation that replaced the copy
  - the precedence tier that decided the outcome
artifact_contract_verified_by: the copy is gone and the outcome names the tier that decided it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/runtime-marker-codex-sandbox-derivation-and-short-form-deps.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/tdd-applicability-predicate.md
status: active
revision: 1
---

# Derive the rule from its single owner
one implementation per invariant, not a hand-maintained copy that quietly drifts from the rule it stands in for.
the derivation becomes the single owner of the rule
Give the workflow engine one code-owned computation for whether TDD's RED/GREEN/REFACTOR procedure applies to a given plan, instead of restating the same precedence logic as hand-written prose in each dispatch backend — a restatement that had already drifted between two backends
System MUST report which precedence tier decided the outcome (`cli_flag`, `plan_frontmatter`, `task_attribute`, `config`, or `none`) alongside the boolean result
System MUST emit JSON (`applicable`, `source`, `plan_type`, `config_tdd_mode`, `cli_flag_present`) so callers can consume the decision without re-deriving it
