---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-walkthrough-workflow-md-06aca27f-c01"
title: "bmad-method: skills/bmad-walkthrough/workflow.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-walkthrough/workflow.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-walkthrough/workflow.md\"}"
atom_ids:
  - group-the-change-by-concern-not-by-file
  - keep-the-periphery-block-to-references
  - name-the-entry-points-a-reader-would-open-first
  - open-with-the-intent-and-say-where-it-came-from
  - write-for-a-human-who-knows-nothing-of-the-target
atom_count: 5
atoms: "[{\"atom_id\":\"group-the-change-by-concern-not-by-file\",\"file_sha256\":\"f3def35a2dfef7cd19fd0d68c734bd02cea547e0fff9aa77638277107b8f23cf\",\"content_sha256\":\"435ccb5466538f79eed127c990418a56780560db31dc938043cbf6c74dc26524\",\"file_bytes\":1492,\"body_bytes\":415},{\"atom_id\":\"keep-the-periphery-block-to-references\",\"file_sha256\":\"8605d738885209c029cab9e84aa55148c9535aeb902d622e24a04f7e28eab477\",\"content_sha256\":\"6289b407ca3c1eb0c3a061d9d3506c1cec8cc1d114226b7162d8531edc26098a\",\"file_bytes\":1238,\"body_bytes\":141},{\"atom_id\":\"name-the-entry-points-a-reader-would-open-first\",\"file_sha256\":\"40ed4de52b84dbc12cbb9c64e81f987bd2e78c1e307d22b28d94974b101940c3\",\"content_sha256\":\"77c0d8afa14e37acd4fb705fc251d68fc44e4629c328b179e422b17b19754f42\",\"file_bytes\":1675,\"body_bytes\":508},{\"atom_id\":\"open-with-the-intent-and-say-where-it-came-from\",\"file_sha256\":\"d1ffda69770348f6305f9b1f364f099ba4ebcdd14c618c17de6a513942c18430\",\"content_sha256\":\"39f548949d3b0dffc852bc5e77eff1e7f85cf46adcf296879f603b892b835ff4\",\"file_bytes\":1474,\"body_bytes\":336},{\"atom_id\":\"write-for-a-human-who-knows-nothing-of-the-target\",\"file_sha256\":\"111bb8bc8951fd62ae0a4084795c233dde97aa069679f8da32dc21f27f76c43c\",\"content_sha256\":\"7696796591c3eeb1d9ee2cf3c61af643e4a51ef646fd6dd2650660a67f2bcf14\",\"file_bytes\":1388,\"body_bytes\":335}]"
carrier_sha256: 1c1400bce4435acd4cb3c6834f909537f939d43cc92a5c8af01dac058b43e908
carrier_bytes: 7996
revision: 1
status: active
---
<!-- vpmodule:atom:begin group-the-change-by-concern-not-by-file -->
---
instruction_id: group-the-change-by-concern-not-by-file
title: "Group the change by concern, not by file"
summary: "Each slice carries one concern, leads with the mechanism, then names the places."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A change is written up slice by slice for a human reviewer.
conditions_does_not_apply_when: The change is a single file with a single concern.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the concern of each slice
  - the mechanism of the slice
  - the places of the slice
artifact_contract_verified_by: "no slice is one file, and every slice leads with two or three sentences of mechanism"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Group the change by concern, not by file
One concern per block, not one file. Lead with the mechanism in two or three sentences, then the specific places with references.
For a simple change applied to a large number of files, group the files by how they were changed (one or several groups). Treat each group as a slice: one or two worked examples, plus a clickable list of the rest that got the same treatment.
<!-- vpmodule:atom:end group-the-change-by-concern-not-by-file -->
<!-- vpmodule:atom:begin keep-the-periphery-block-to-references -->
---
instruction_id: keep-the-periphery-block-to-references
title: Keep the periphery block to references
summary: "The last block lists the docs, the build registration and the small enablers, one clause each."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: "The writeup reaches its last block, the one that carries the surrounding material."
conditions_does_not_apply_when: "The change touches no documentation, no build registration and no enabling files."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the peripheral places
  - one clause per place
artifact_contract_verified_by: the last block holds references with one clause each and nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the periphery block to references
Periphery (last block). Docs, build registration, small enablers. References only, one clause each.
<!-- vpmodule:atom:end keep-the-periphery-block-to-references -->
<!-- vpmodule:atom:begin name-the-entry-points-a-reader-would-open-first -->
---
instruction_id: name-the-entry-points-a-reader-would-open-first
title: Name the entry points a reader would open first
summary: "The broad-strokes block names the three to five entry points, one clause each, and nothing else."
capability_tags:
  - explain-subsystem
pattern_tags:
  - subsystem-explanation
conditions_applies_when: A writeup about a change has to give its reader the top level of the change.
conditions_does_not_apply_when: The change touches a single file and has no entry points to open.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the three to five entry points
  - one clickable reference and one clause per entry point
artifact_contract_verified_by: the reviewer can open the linked spots in order and understand the mechanism without reading anything else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the entry points a reader would open first
What the change generally is, and its top level: the three to five entry points a reader would open first, each with one clickable reference and one clause saying what it is.
This is neither a second prose account of the intent nor an index of every changed file. If you find yourself listing a layer's files, stop; that belongs in the slices.
Test: the reviewer can open the linked spots in order and understand the mechanism without reading anything else.
<!-- vpmodule:atom:end name-the-entry-points-a-reader-would-open-first -->
<!-- vpmodule:atom:begin open-with-the-intent-and-say-where-it-came-from -->
---
instruction_id: open-with-the-intent-and-say-where-it-came-from
title: Open with the intent and say where it came from
summary: "The first block says what the change is for and why it exists now, and names the source of that statement."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A writeup about a change opens and the intent of the change has to be stated.
conditions_does_not_apply_when: The intent was already stated and confirmed earlier in the same session.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the intent of the change
  - the source of the intent
artifact_contract_verified_by: the block names where the intent came from and stays under 300 tokens when it was generated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Open with the intent and say where it came from
What the change is for and why it exists now.
If the target's ticket states the intent, paste it verbatim; failing that, a target plan file's intent section. Otherwise generate from what you know about the target, no more than 300 tokens. Include a short note on where you got it from.
<!-- vpmodule:atom:end open-with-the-intent-and-say-where-it-came-from -->
<!-- vpmodule:atom:begin write-for-a-human-who-knows-nothing-of-the-target -->
---
instruction_id: write-for-a-human-who-knows-nothing-of-the-target
title: Write for a human who knows nothing of the target
summary: The reader knows the context but nothing about the target beyond what this session has said.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A session output or a review narrative is written for a human reader.
conditions_does_not_apply_when: The text is written for another agent that will read the raw sources itself.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the text the human reads
artifact_contract_verified_by: the text names nothing the session has not already mentioned
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write for a human who knows nothing of the target
The session output and the review narrative file are for a human.
Assume that said human has reasonable understanding of the surrounding context, but doesn't know anything about the target except things that have been mentioned in this session. Leave the brief log style to the log.
<!-- vpmodule:atom:end write-for-a-human-who-knows-nothing-of-the-target -->