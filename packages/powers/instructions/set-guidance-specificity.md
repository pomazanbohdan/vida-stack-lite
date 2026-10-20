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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
status: active
revision: 2
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
