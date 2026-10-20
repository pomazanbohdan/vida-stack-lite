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
status: active
revision: 1
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
