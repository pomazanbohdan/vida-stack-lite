---
instruction_id: evaluate-a-dependency-before-adding-it
title: Evaluate a dependency before adding it
summary: "Before a dependency is added, check the existing stack, the size, the maintenance state, the vulnerabilities and the licence."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-minimization
conditions_applies_when: A new dependency is about to be added to the project.
conditions_does_not_apply_when: No dependency is being added.
artifact_contract_output_type: dependency-evaluation
artifact_contract_required_data:
  - whether the existing stack solves it
  - the size
  - the maintenance state
  - the vulnerabilities
  - the licence
  - the decision
artifact_contract_verified_by: all five questions have an answer before the dependency enters the manifest
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Evaluate a dependency before adding it

Before adding any dependency:

1. Does the existing stack solve this? (Often it does.)
2. How large is the dependency? (Check bundle impact.)
3. Is it actively maintained? (Check last commit, open issues.)
4. Does it have known vulnerabilities? (`npm audit`)
5. What's the license? (Must be compatible with the project.)

**Rule:** Prefer standard library and existing utilities over new dependencies. Every dependency is a liability.
