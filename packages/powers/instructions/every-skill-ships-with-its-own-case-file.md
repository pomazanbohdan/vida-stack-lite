---
instruction_id: every-skill-ships-with-its-own-case-file
title: Every skill ships with its own case file
summary: "A new skill arrives with its case file: at least three positive triggers, two negative triggers and one behavioral eval, and an execution eval that is backed by a fixture."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill is added to the catalogue.
conditions_does_not_apply_when: The skill is a one-off hint that is not kept.
artifact_contract_output_type: eval-case-file
artifact_contract_required_data:
  - the positive triggers
  - the negative triggers
  - the behavioral eval
  - the fixture
artifact_contract_verified_by: "the case file holds at least three positive triggers, two negative triggers and one behavioral eval"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Every skill ships with its own case file
Every skill ships with an eval file.
When you add a skill, add its case file
with at least 3 positive triggers, 2 negative triggers, and 1 behavioral eval.
Execution evals must be backed by
a fixture directory;
use `kind: "dialogue"` only when the skill's deliverable is genuinely the conversation itself.
Claiming `dialogue` is a human-reviewed exemption, not a general escape hatch for execution skills.
Missing case files, incomplete case counts, unknown kinds, invalid fixture paths, and absent required fixtures are CI errors.
