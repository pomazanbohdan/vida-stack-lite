---
instruction_id: write-steps-with-completion-criteria
title: Write steps with completion criteria
summary: "End every step on a completion criterion that is clear and demanding, and defend against premature completion by sharpening the bound before hiding later steps."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - completion-criteria
conditions_applies_when: A document states ordered steps an executor will follow.
conditions_does_not_apply_when: The document is all reference with no ordered steps.
artifact_contract_output_type: stepped-guidance
artifact_contract_required_data:
  - steps
  - completion criterion per step
artifact_contract_verified_by: each step names the condition that tells the executor it is done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
status: active
revision: 2
---

# Write steps with completion criteria
Every step ends on a **completion criterion**, the condition that tells the agent the work is done. Two properties make it a lever:
- **Clarity**: can the agent tell done from not-done? A vague bound ("understanding reached") invites **premature completion**: ending the step before it is genuinely done, attention slipping to _being done_. The visible steps still ahead (the **post-completion steps**) supply the pull; the criterion's clarity is the resistance. Defend in order: **sharpen the bound first** (local and cheap); only if it is irreducibly fuzzy _and_ you observe the rush, hide the later steps by splitting the sequence. Hiding only works across a real context boundary (a hand-off or a subagent dispatch; an inline call leaves the later steps in context and clears nothing).
- **Demand**: how much it requires. "Every modified model accounted for" forces thorough work where "produce a change list" does not. Demand drives **legwork** (the digging the agent does within the work, latent in the wording rather than written as its own step), and it is not step-bound: "every rule applied" binds a body of flat reference just as "every step done" binds a sequence, which is how an all-reference document still carries an exhaustiveness bar.
The strongest criteria are both checkable and exhaustive.

Close every step on a condition the model can check. A step that ends on "once it is clear" or "when ready" lets the model declare itself done early. Name what has to be true at the end, covering everything the step touched, and make it something the model can verify from what is in front of it.
