---
instruction_id: write-trigger-prompts-as-user-paraphrases
title: Write trigger prompts as user paraphrases
summary: Positive trigger prompts are realistic user asks written in the users own words; copying the description games the check.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Trigger prompts are written for a skill.
conditions_does_not_apply_when: The prompt set already exists and is being run.
artifact_contract_output_type: trigger-prompts
artifact_contract_required_data:
  - the realistic user asks
  - the wording used for each
artifact_contract_verified_by: no positive prompt copies the description it is meant to test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 1
---

# Write trigger prompts as user paraphrases
`positive` prompts are realistic user asks that should route here (`top_k` defaults to 3; tighten to 1 for a skill's signature ask).
**Writing good trigger prompts:** paraphrase how users actually talk; don't copy the description (that's gaming the eval).
