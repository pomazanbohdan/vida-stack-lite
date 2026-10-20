---
instruction_id: write-minimal-agent-guidance
title: Write the smallest guidance for the observed failure
summary: "Write only the rules that address failures observed without the guidance, then re-run the same scenarios and revise until the agent complies."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The baseline failure has been observed and the guidance text must be written.
conditions_does_not_apply_when: No baseline test has been run yet.
artifact_contract_output_type: agent-guidance
artifact_contract_required_data:
  - observed failures
  - requirements
  - prohibitions
  - one example
artifact_contract_verified_by: each observed failure maps to a rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/writing-for-agents/SKILL.md
status: active
revision: 2
---

# Write the smallest guidance for the observed failure
Run the baseline scenario before writing the skill.
Document the exact behavior: what choices the agent made.
Document the rationalizations the agent used, verbatim.
Document which pressures triggered violations.
Identify patterns in rationalizations and failures.
Write guidance that addresses those specific rationalizations.
Do not add extra content for hypothetical cases.
Run the same scenarios with the skill.
The agent should now comply.
If the agent still fails, the skill is unclear or incomplete.
Revise and re-test.
Address the specific baseline failures identified in the test.
Don't write contrived examples.
Don't create fill-in-the-blank templates.
Keep each meaning in a **single source of truth**: one authoritative place, so changing the behaviour is a one-place edit. **Duplication** costs maintenance and tokens, and inflates a meaning's prominence on the ladder past its real rank. The **environment** is a source of truth too (`package.json` scripts, config files, the directory layout, `--help` output), and a document that restates it is a **cache**: a copy of a lookup, earning its load only when the lookup is expensive. Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses. Check every line for **relevance**: does it still bear on what the document does? Hunt **no-ops** sentence by sentence: an instruction the model already obeys by default pays load to say nothing. When a sentence fails, delete the whole sentence rather than trim words from it.
