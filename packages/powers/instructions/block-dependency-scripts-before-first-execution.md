---
instruction_id: block-dependency-scripts-before-first-execution
title: Block dependency scripts before the first execution
summary: "Bootstrap with the install scripts disabled, inspect the pending script, approve the minimum, and prove it with a clean frozen install."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A dependency in the project can run an install script.
conditions_does_not_apply_when: No dependency in the project runs an install script.
artifact_contract_output_type: script-policy
artifact_contract_required_data:
  - the policy
  - the approved scripts
  - the clean install result
artifact_contract_verified_by: a clean frozen install succeeds with only the approved scripts running
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Block dependency scripts before the first execution

**Block dependency scripts before first execution.**
Bootstrap with scripts disabled or a documented fail-closed policy, inspect the pending script source, approve only the minimum, commit the policy, then verify with a clean frozen/immutable install.
Never blanket-approve.
