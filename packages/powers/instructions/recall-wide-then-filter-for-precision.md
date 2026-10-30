---
instruction_id: recall-wide-then-filter-for-precision
title: "Recall wide, then filter for precision"
summary: "The adversarial recall stage deliberately over-produces and the precision stage filters the list in one pass, so the surviving list stays short and every entry carries signal."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The constraints a feature must never silently become are elicited from its requirements.
conditions_does_not_apply_when: The constraints are already written down.
artifact_contract_output_type: prohibition-list
artifact_contract_required_data:
  - the adversarial question asked per requirement
  - the raw candidates
  - the kept constraints
artifact_contract_verified_by: the list is short and every entry is an intent constraint rather than a routine engineering concern
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Recall wide, then filter for precision
**Stage 1 - Recall (adversarial probe).** Ask the single adversarial question of each requirement:
> *What could this feature silently become that the author would NOT want, but the spec
> does not forbid?*
This question is model-robust.
It deliberately over-produces: ~10 raw candidates per requirement, including routine engineering items. That over-production is intentional - recall first.
**Stage 2 - Precision (one-pass classifier).** Filter the raw Stage-1 list in a single pass.
- **DROP routine-engineering items** - anything that is a normal correctness or hygiene concern rather than an intent constraint
- **KEEP values / safety / ethics items** - anything that, if violated, makes the feature do something the author would object to on product, fairness, privacy, transparency, or safety grounds
A requirement that yields zero kept prohibitions emits an empty list - that is the correct precision outcome for a pure utility, not a failure.
