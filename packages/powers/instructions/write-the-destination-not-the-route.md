---
instruction_id: write-the-destination-not-the-route
title: "Write the destination, not the route"
summary: "A prompt states where the work must arrive, not the script of the path, because a script spends the model on compliance instead of the work."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A prompt, skill or workflow file is written for a model that will read it."
conditions_does_not_apply_when: The text is a fixed procedure whose order is the contract.
artifact_contract_output_type: goal-stated-prompt
artifact_contract_required_data:
  - the stance
  - the outcome
  - the consumer
  - the bar
  - the non-inferables
artifact_contract_verified_by: the prompt names a destination and its five elements instead of a sequence of phases or question banks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the destination, not the route
Every line you write competes with the version of itself that was never written. State the destination, then make every remaining line survive the tests.
Asked to build a prompt, you will script the path: phases, question banks, mandatory sections. It feels like diligence; it is the central defect. A script is your imagined transcript of one good session; real sessions diverge, and a model holding one spends its intelligence on compliance.
Write the destination instead. A goal-stated prompt holds five things: the **stance** (who the model is to the user), the **outcome** (what must exist), the **consumer** (who acts on it without the conversation in the room), the **bar** (what they need true of it), and the **non-inferables** (persona, posture, institutional knowledge, wiring, rules with consequences). Then stop; the outcome and its consumer imply the process.
A script would subtract adaptivity: a user with a full brief gets gap analysis, not a question bank.
For each section: what single outcome do you want? What does the model already know there, usually most of it? What does it need that it cannot infer: persona, posture, wiring, schemas, rules with consequences? Whatever remains is structure you impose; if you cannot say what it buys, it is over-structure.
