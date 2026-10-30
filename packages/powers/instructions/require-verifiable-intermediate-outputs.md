---
instruction_id: require-verifiable-intermediate-outputs
title: Require verifiable intermediate outputs
summary: "Insert a structured, script-validated artifact between planning and execution so errors surface before changes land."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The process has several stages that hand a result to the next stage.
conditions_does_not_apply_when: The work is one action without intermediate results.
artifact_contract_output_type: stage-artifact
artifact_contract_required_data:
  - stages
  - artifacts
  - verification method
artifact_contract_verified_by: each stage is checked before the next
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Require verifiable intermediate outputs
When agents perform complex, open-ended tasks, they can make mistakes.
The plan-validate-execute pattern catches errors early.
Have the agent first create a plan in a structured format.
Validate that plan with a script before executing it.
Add an intermediate plan file that gets validated before applying changes.
The workflow becomes: analyze, create plan file, validate plan, execute, verify.
Scripts provide objective verification.
The agent can iterate on the plan without touching originals.
Error messages point to specific problems.
Use this for batch operations, destructive changes, complex validation rules, and high-stakes operations.
Break complex operations into clear, sequential steps.
Provide a checklist that the agent can copy into its response and check off as it progresses.
Clear steps prevent agents from skipping critical validation.
Run the validator, fix errors, repeat.
Only proceed when all requirements are met.
