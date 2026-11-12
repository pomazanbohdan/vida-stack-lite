---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-modes-convert-md-ac07e8c5-c01"
title: "bmad-method: skills/bmad-toolsmith/modes/convert.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/modes/convert.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/modes/convert.md\"}"
atom_ids:
  - convert-in-place-and-leave-the-source-untouched
  - extract-the-know-how-from-the-source
atom_count: 2
atoms: "[{\"atom_id\":\"convert-in-place-and-leave-the-source-untouched\",\"file_sha256\":\"b3f69354bc9bf9c8ce7cf04040df80799439cb19e5c9089beb4f837a2ee48a9f\",\"content_sha256\":\"4169254f687c98ce18d427c0107503a84d6b42f702ba124ca29d06b25f62ac71\",\"file_bytes\":1740,\"body_bytes\":422},{\"atom_id\":\"extract-the-know-how-from-the-source\",\"file_sha256\":\"28a400895a4b9c1fa2ba600270a000f43a06656ba5ec21c901b74a922d604c1f\",\"content_sha256\":\"d2e163fc9e24ed87f3845f0d114f514eed30143551e217b77e3c030379d7233b\",\"file_bytes\":1522,\"body_bytes\":286}]"
carrier_sha256: a7a38ae76a6530a9a93e931100448a6139a418d26415db01636372f0b95940ec
carrier_bytes: 3543
revision: 1
status: active
---
<!-- vpmodule:atom:begin convert-in-place-and-leave-the-source-untouched -->
---
instruction_id: convert-in-place-and-leave-the-source-untouched
title: Convert in place and leave the source untouched
summary: "When the source is already a folder of the right kind, it is converted in place, the questions it already answers are not asked again, and the original still runs where it lives."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - source-conversion
conditions_applies_when: Material written for another tool is brought to the standard.
conditions_does_not_apply_when: The source has to be rebuilt beside itself in a new location.
artifact_contract_output_type: in-place-conversion
artifact_contract_required_data:
  - the questions the source already answered
  - the questions the source never answered
  - the outcome of the conversion
artifact_contract_verified_by: the source still runs where it lives and only the gaps were asked about
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/convert.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body describes adapting material for another tool but does not ground that adaptation in any supported domain.
---

# Convert in place and leave the source untouched
Discovery confirms the outcome, consumer and trigger phrases from it and asks only for what the source never said, usually the consumer, the near misses, and the name, since a source is usually named for its host.
Discovery itself is skipped; its five questions are answered by the skill as it stands.
Leave the source untouched; the user may still run it where it lives.
<!-- vpmodule:atom:end convert-in-place-and-leave-the-source-untouched -->
<!-- vpmodule:atom:begin extract-the-know-how-from-the-source -->
---
instruction_id: extract-the-know-how-from-the-source
title: Extract the know-how from the source
summary: "The whole source is read, and what is lifted out is the outcome, the consumer, the triggers, the know-how and the scripts, plus what it leans on its host for."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - source-conversion
  - evidence-analysis
conditions_applies_when: Material written for another tool is converted.
conditions_does_not_apply_when: The material was written for this tool already.
artifact_contract_output_type: extraction
artifact_contract_required_data:
  - the outcome it produces
  - who consumes it
  - the triggers
  - the know-how a model would not have
  - the scripts
  - what it depends on from its host
artifact_contract_verified_by: "every part of the source is accounted for in the extraction, and the host dependencies are listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/convert.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Extract the know-how from the source
Read the source whole. Pull out the outcome it produces, who consumes it, the triggers (when the author meant it to fire), the know-how a model would not have, and any scripts. Note what it depends on from its host: tools, variables, other files.
<!-- vpmodule:atom:end extract-the-know-how-from-the-source -->