---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-ticket-md-d726fc6c-c02"
title: "bmad-method: skills/bmad-agent-po/references/ticket.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-agent-po/references/ticket.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/ticket.md\"}"
atom_ids:
  - write-a-reference-as-type-location-section
  - write-tickets-in-short-declarative-sentences
atom_count: 2
atoms: "[{\"atom_id\":\"write-a-reference-as-type-location-section\",\"file_sha256\":\"02a0bd42746ff3de3cb1b10708cedc943fe5629ef9383475a50fe58146962334\",\"content_sha256\":\"fcca46f5824b6e464550c97ecc7c7932ed1861b2e51e81db9a8d94aeb9851695\",\"file_bytes\":1399,\"body_bytes\":276},{\"atom_id\":\"write-tickets-in-short-declarative-sentences\",\"file_sha256\":\"11c1fad4af9c5701c87bd7dfae715958adc76a90b58648fa96b6880da184ece9\",\"content_sha256\":\"911df8b1a1e04554d9f17e489dcf2d8daaff133294c2fd3bb566cc0be3dad0f2\",\"file_bytes\":1517,\"body_bytes\":399}]"
carrier_sha256: 533d661aee46b1a65a4057d8ab8a9164fa0c82840124132f11ea6db08c84a75a
carrier_bytes: 3203
revision: 1
status: active
---
<!-- vpmodule:atom:begin write-a-reference-as-type-location-section -->
---
instruction_id: write-a-reference-as-type-location-section
title: "Write a reference as type, location, section"
summary: "A reference is one line of the form `type — location, section`, the nearest document, and it is opened before it is cited."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A work item points at another document.
conditions_does_not_apply_when: The item points at nothing outside itself.
artifact_contract_output_type: reference-list
artifact_contract_required_data:
  - one line per reference
  - "the type, the location and the section"
  - the fact that each reference was opened
artifact_contract_verified_by: "each reference is a `type — location, section` line naming the nearest document"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Write a reference as type, location, section
A reference is a line in References, `type — location, section`: location is a path from `{project-root}`, or a url for a remote source, and is opened before it is cited.
Name the nearest document, not the documents behind it.
<!-- vpmodule:atom:end write-a-reference-as-type-location-section -->
<!-- vpmodule:atom:begin write-tickets-in-short-declarative-sentences -->
---
instruction_id: write-tickets-in-short-declarative-sentences
title: Write the item in short declarative sentences
summary: "The reader has only the ticket: every sentence is short and declarative, in the project's own vocabulary, and says its thing once."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A work item is written for a reader who has only that item.
conditions_does_not_apply_when: The text is a narrative for people rather than an item another executor builds from.
artifact_contract_output_type: work-item-text
artifact_contract_required_data:
  - the sentences
  - the rewrite offered with its reason
artifact_contract_verified_by: every sentence is short and declarative and says its thing once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the item in short declarative sentences
Every sentence is short and declarative, in common words and the project's own vocabulary: the reader has only the ticket.
Say each thing once, with no invented term, filler, or metaphor.
When the user's text misses this or the criteria rules, offer the rewrite with the reason and let the user decide; show what is missing, not only what is written.
<!-- vpmodule:atom:end write-tickets-in-short-declarative-sentences -->