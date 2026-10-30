---
instruction_id: strip-a-high-confidence-hallucinated-package-before-it-reaches-the-planner
title: Strip a high-confidence hallucinated package before it reaches the planner
summary: "A package the legitimacy check is confident about is removed from the research output entirely, so it never reaches the plan; a package that only exists is still not treated as safe."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A research output recommends packages that will be installed later.
conditions_does_not_apply_when: No package is being recommended.
artifact_contract_output_type: package-stripping
artifact_contract_required_data:
  - the packages that were checked
  - the verdict each one got
  - what the research output contains afterwards
artifact_contract_verified_by: the high-confidence bad package is absent from the research output and never reaches the planner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
  - operations
---

# Strip a high-confidence hallucinated package before it reaches the planner
- Packages tagged `[SLOP]` (high-confidence hallucination or attacker-registered) are **stripped from `RESEARCH.md` entirely** before the file is saved. They never reach the planner.
- A package that exists on the registry is not the same as a package that is safe to install.
