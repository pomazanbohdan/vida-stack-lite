---
instruction_id: scope-an-mvp-to-one-job-and-its-riskiest-assumption
title: Scope the MVP to one job and its riskiest assumption
summary: "Define the smallest version that does one user job well and tests the assumption most likely to be wrong, and time-box it instead of listing features."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: The chosen direction has to be turned into a first version.
conditions_does_not_apply_when: The direction is still being evaluated and no version has been chosen.
artifact_contract_output_type: mvp-scope
artifact_contract_required_data:
  - the one user job the MVP nails
  - the assumption it tests
  - the time box
  - what is in and what is out
artifact_contract_verified_by: "the scope names one job, the riskiest assumption and a time box"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - research
---

# Scope the MVP to one job and its riskiest assumption

When defining MVP scope for the chosen direction:

1. **One job, done well.** The MVP should nail exactly one user job. Not three jobs done partially.
2. **The riskiest assumption first.** The MVP's primary purpose is to test the assumption most likely to be wrong.
3. **Time-box, not feature-list.** "What can we build and test in [timeframe]?" is better than "What features do we need?"
4. **If it's not embarrassing, you waited too long.** The first version should feel incomplete to the builder. If it doesn't, you over-built.
