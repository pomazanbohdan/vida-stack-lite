---
instruction_id: review-along-separate-axes
title: Review along separate axes
summary: Run independent review axes as separate lanes and report each under its own heading; never merge or re-rank the axes.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A change can pass one quality axis and fail another, and a blended verdict would hide the failing one."
conditions_does_not_apply_when: "The review has a single axis, or the axes share one failure point and can be merged safely."
artifact_contract_output_type: two-axis-review
artifact_contract_required_data:
  - axes
  - per-axis findings
  - per-axis worst issue
artifact_contract_verified_by: the report carries each axis under its own heading with its own worst issue
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/code-review/SKILL.md
status: active
revision: 1
---

# Review along separate axes
Two-axis review of the diff between `HEAD` and a fixed point the user supplies:
- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?
Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.
## Aggregate
Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings, because the two axes are deliberately separate.
End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes: that's the reranking the separation exists to prevent.
## Why two axes
A change can pass one axis and fail the other:
- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
Reporting them separately stops one axis from masking the other.
