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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/convert.md
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
