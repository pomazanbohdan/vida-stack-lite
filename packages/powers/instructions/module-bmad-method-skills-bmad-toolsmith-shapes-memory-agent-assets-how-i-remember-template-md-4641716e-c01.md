---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-shapes-memory-agent-assets-how-i-remember-template-md-4641716e-c01"
title: "bmad-method: skills/bmad-toolsmith/shapes/memory-agent/assets/HOW-I-REMEMBER-template.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/shapes/memory-agent/assets/HOW-I-REMEMBER-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/shapes/memory-agent/assets/HOW-I-REMEMBER-template.md\"}"
atom_ids:
  - keep-a-record-by-subject-and-replace-what-is-no-longer-true
  - write-the-record-as-you-go
atom_count: 2
atoms: "[{\"atom_id\":\"keep-a-record-by-subject-and-replace-what-is-no-longer-true\",\"file_sha256\":\"12482f03347a8f80890a6e4a7c0221d5dc4dafe3381a4f28fe5b11386fe768c4\",\"content_sha256\":\"58b7d8ea3f1e2c239511cc507ff7cf1698e7e46e8d4df5dd4b4f45e0c37e78cc\",\"file_bytes\":3858,\"body_bytes\":1861},{\"atom_id\":\"write-the-record-as-you-go\",\"file_sha256\":\"182a2d54959ecca1f321c097371c2654d02284c36d4c8c6d4b4844ff9e99a422\",\"content_sha256\":\"8e55536296c301b97ff4caa5f3760e2496f187c39d3ddd78adde71ed87b4217b\",\"file_bytes\":2012,\"body_bytes\":512}]"
carrier_sha256: 9a2303f7c9a44b6348f6b3d9e60f1a49e8a399b988f230ef24aa34fc279e1210
carrier_bytes: 6155
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-a-record-by-subject-and-replace-what-is-no-longer-true -->
---
instruction_id: keep-a-record-by-subject-and-replace-what-is-no-longer-true
title: Keep a record by subject and replace what is no longer true
summary: "Keep what is remembered in small files by subject: a standing file says what is true now and its sections are replaced rather than appended, a dated line is added only at a turning point, and nothing is deleted for being old."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A growing body of remembered material has to stay usable.
conditions_does_not_apply_when: The material is a single short note.
artifact_contract_output_type: knowledge-store
artifact_contract_required_data:
  - the subject files
  - what was replaced
  - the distilled material
artifact_contract_verified_by: a standing file states what is true now and keeps only a dated line at a turning point
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/shape-memory-agent.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/HOW-I-REMEMBER-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/intake-capability-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/first-breath-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/context-md.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep a record by subject and replace what is no longer true
A standing file says what is true now; its sections are replaced, never appended, except a `## History` section that takes a dated line only at a turning point.
Memory stays good by being tended, not by growing.
the agent distills it into subject files that link back, marks it distilled, and reads the distillations from then on
Nothing is deleted for being old.
No index: the agent finds things with `ls` and `grep`, and the map is generated.
Four moves: distill every raw file that is still marked raw into subject files that link back, then mark it distilled; merge two files about one subject into one; refresh any standing file a recent session note contradicts, replacing the line; raise what the owner should hear next time in the pending file.
Tending (distill, merge, refresh, raise) is triggered by the staleness line, not a size.
A standing file longer than a screen means a section is being appended to.
The material is kept as given, and what it holds is kept as one small file per subject it touched, each linked back to the raw file.
The future self will read the distillations and never the raw again, so a distillation must stand on its own: who, what, when, what was decided, what is still open.
Ask before distilling only when the material's date, area or owner is not in it.
A recording is transcribed first, with the tool the owner has, and the transcript is the raw file.
Clean up seed text — scan your memory files for any remaining `{...}` placeholder instructions from the templates.
Don't leave template scaffolding in your living files.
- It is never edited by hand during normal operation — the workflow writes it and downstream agents read it as a sealed source of truth.
- Ideas that arose in discussion but belong in other phases. Preserved so they are not lost.
<!-- vpmodule:atom:end keep-a-record-by-subject-and-replace-what-is-no-longer-true -->
<!-- vpmodule:atom:begin write-the-record-as-you-go -->
---
instruction_id: write-the-record-as-you-go
title: Write the record as you go
summary: "Capture what is worth keeping the moment it happens, because a session can end with no signal and whatever was not written down is lost."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: "A conversation, a session or a working relationship produces something worth keeping."
conditions_does_not_apply_when: The result is a file the agent writes once at the end and hands over.
artifact_contract_output_type: durable-note
artifact_contract_required_data:
  - what is worth keeping
  - when it was written
  - where it went
artifact_contract_verified_by: "the note was written at the moment the thing happened, not at the end of the session"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/SKILL-template-bootloader.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/HOW-I-REMEMBER-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/first-breath-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write the record as you go
Owners often just stop or kill the session with no signal, so write as you go.
the moment something is worth keeping: a preference, a decision, a recurring thread, a phrase that lands.
Write the moment something is worth keeping. Sessions end without warning.
If the conversation gets interrupted or cut short, whatever you've saved is real. Whatever you haven't written down is lost forever.
Every few exchanges, when you've learned something meaningful, write it down immediately.
<!-- vpmodule:atom:end write-the-record-as-you-go -->