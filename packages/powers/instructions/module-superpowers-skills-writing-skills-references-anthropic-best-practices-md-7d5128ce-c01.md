---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-writing-skills-references-anthropic-best-practices-md-7d5128ce-c01"
title: "superpowers: skills/writing-skills/references/anthropic-best-practices.md module"
summary: "Carrier for 2 atomic instructions from superpowers:skills/writing-skills/references/anthropic-best-practices.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/writing-skills/references/anthropic-best-practices.md\"}"
atom_ids:
  - require-verifiable-intermediate-outputs
  - set-guidance-specificity
atom_count: 2
atoms: "[{\"atom_id\":\"require-verifiable-intermediate-outputs\",\"file_sha256\":\"41ae50d7aac0a5b6f6f8801fe4fcfcf2b6fbc6bfa099b4ab0ebe675d5c5520ba\",\"content_sha256\":\"828196c3cb51db695f4ae1196c31c50d31ce9968875ebeb2d72548d8adb2b59a\",\"file_bytes\":2061,\"body_bytes\":983},{\"atom_id\":\"set-guidance-specificity\",\"file_sha256\":\"4ec1be53cb2b987e048180582c6ab832487207cd5a5b00ff837e06d8946ff964\",\"content_sha256\":\"352898685c0e99f870649e5929733c9564489ae5626721355d8cdeeb3ada39d8\",\"file_bytes\":2431,\"body_bytes\":1206}]"
carrier_sha256: 7ace19dd448c280515fe08ae7957193da40ec5152242f2cca93b6fcc88fe2cd1
carrier_bytes: 4733
revision: 1
status: active
---
<!-- vpmodule:atom:begin require-verifiable-intermediate-outputs -->
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
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/anthropic-best-practices.md
status: active
revision: 3
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
<!-- vpmodule:atom:end require-verifiable-intermediate-outputs -->
<!-- vpmodule:atom:begin set-guidance-specificity -->
---
instruction_id: set-guidance-specificity
title: Set the degree of freedom the guidance allows
summary: "Match specificity to fragility: exact sequences where a single safe path exists, principles where many paths lead to success."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: You are deciding how detailed an action description should be.
conditions_does_not_apply_when: The rule already has a single permitted form.
artifact_contract_output_type: guidance-specificity
artifact_contract_required_data:
  - fragility of the outcome
  - level of freedom
  - boundary
artifact_contract_verified_by: the outcome stays stable within the stated freedom
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/anthropic-best-practices.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Set the degree of freedom the guidance allows
Match the level of specificity to the task's fragility and variability.
Use high freedom with text-based instructions when multiple approaches are valid.
Use high freedom when decisions depend on context.
Use high freedom when heuristics guide the approach.
Use medium freedom with pseudocode or scripts with parameters when a preferred pattern exists.
Use medium freedom when some variation is acceptable.
Use medium freedom when configuration affects behavior.
Use low freedom with specific scripts when operations are fragile and error-prone.
Use low freedom when consistency is critical.
Use low freedom when a specific sequence must be followed.
Run exactly the script; do not modify the command or add additional flags.
Think of the agent as a robot exploring a path.
A narrow bridge with cliffs on both sides has only one safe way forward: provide specific guardrails and exact instructions.
An open field with no hazards has many paths to success: give general direction and trust the agent to find the best route.

Write what survives as a goal. State intent and let the model find the path. Exact procedure only where a wrong move costs something.
<!-- vpmodule:atom:end set-guidance-specificity -->