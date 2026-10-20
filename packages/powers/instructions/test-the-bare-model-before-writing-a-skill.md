---
instruction_id: test-the-bare-model-before-writing-a-skill
title: Test the bare model before writing a skill
summary: "When a skill claims to teach something, one real input runs through the bare model first; what it already gets right needs no skill."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A skill is claimed to teach the model something it does not already do.
conditions_does_not_apply_when: The skill only holds what the user would type every time.
artifact_contract_output_type: baseline-trial
artifact_contract_required_data:
  - the real input
  - the trigger phrase alone
  - what the bare model produced
  - the part it got wrong
artifact_contract_verified_by: "the bare model was run on the input before the skill was written, and the trace shows what the skill has to teach"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/discover.md
status: active
revision: 1
---

# Test the bare model before writing a skill
Where the skill instead claims to teach the model something, the target model is fixed (the user's own, or their organisation's), and the user has not asked to move fast or run on their own, ask for one real input and run its trigger phrase alone, not the specification, through a subagent with no skill. If that already gives what the user wants, say so and propose no skill, or one for only the part it got wrong; if it fails, the trace is the first evidence of what the skill has to teach.
And ask where it will run, with the inferred answer offered: the user's own agent and model, an organisation whose harness and model are known, or distributed to people whose model is unknown. That last answer decides whether anything can be measured against the model in the room.
