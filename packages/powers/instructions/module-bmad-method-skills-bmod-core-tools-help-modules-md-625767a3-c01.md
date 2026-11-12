---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-core-tools-help-modules-md-625767a3-c01"
title: "bmad-method: skills/bmod-core-tools/help/modules.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmod-core-tools/help/modules.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-core-tools/help/modules.md\"}"
atom_ids:
  - announce-what-a-package-needs-before-and-where-to-start-after-the-install
  - mark-the-package-record-as-a-record-and-not-an-entry-point
  - never-reuse-a-retired-name-and-carry-the-local-files-with-it
atom_count: 3
atoms: "[{\"atom_id\":\"announce-what-a-package-needs-before-and-where-to-start-after-the-install\",\"file_sha256\":\"7f8f6c7654e03c111a0ebba6d704fe6f034c4741408cac8132cc47698c7cac5b\",\"content_sha256\":\"4d3f281bc56828c1b3296fd8066f7dd945018bde959e2f0b75cd4a48e76b9a1a\",\"file_bytes\":1729,\"body_bytes\":334},{\"atom_id\":\"mark-the-package-record-as-a-record-and-not-an-entry-point\",\"file_sha256\":\"8068a3691b97c02162f9723613eb0cd838ae091701ebe850a4a0fdc9a30269d8\",\"content_sha256\":\"402b9ce25d8506f854e329d31606e0d2cec123fff3ee634dbf9b2d307c03dc8b\",\"file_bytes\":1375,\"body_bytes\":161},{\"atom_id\":\"never-reuse-a-retired-name-and-carry-the-local-files-with-it\",\"file_sha256\":\"83fbdd1cc734ee13eae7a8b690efbcd16c2b27e1e59311cf473bf441cecf13a6\",\"content_sha256\":\"df8beef10422130f1fd69668fefcda79f1d22713f44910e814887b49c7056c37\",\"file_bytes\":1432,\"body_bytes\":226}]"
carrier_sha256: 90c0d91c23c8349073ee9c5cd0daf26ad119e852c1ea2483ce81dcf9b538fb17
carrier_bytes: 5091
revision: 1
status: active
---
<!-- vpmodule:atom:begin announce-what-a-package-needs-before-and-where-to-start-after-the-install -->
---
instruction_id: announce-what-a-package-needs-before-and-where-to-start-after-the-install
title: Announce what a package needs before and where to start after the install
summary: "A package carries two announcements, one read before the install or update and one read after it: what the package needs, such as a tool to install first, and where to start once the setup has run. An empty or missing announcement is not shown."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: A package is installed or updated.
conditions_does_not_apply_when: The package is being used and nothing is being installed.
artifact_contract_output_type: package-announcements
artifact_contract_required_data:
  - "what the package needs, said before the install"
  - "where to start, said after the setup has run"
  - the rule that an empty announcement is not shown
artifact_contract_verified_by: the announcement before the install states a need and the one after it states where to start
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/modules.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Announce what a package needs before and where to start after the install
Shown before the install or update, read from the module's source.
Use it for what the module needs, such as a tool to install first.
Shown after the install or update, once setup has run.
Use it for where to start.
An empty or missing message is not shown.
<!-- vpmodule:atom:end announce-what-a-package-needs-before-and-where-to-start-after-the-install -->
<!-- vpmodule:atom:begin mark-the-package-record-as-a-record-and-not-an-entry-point -->
---
instruction_id: mark-the-package-record-as-a-record-and-not-an-entry-point
title: Mark the package record as a record and not an entry point
summary: "The folder that describes a package is read by the host and never run; the stub file in it exists only so the folder installs with the others, and it says never to invoke it."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: A package is described by a folder that the host reads.
conditions_does_not_apply_when: The folder is an entry point that a user or an agent invokes.
artifact_contract_output_type: package-record
artifact_contract_required_data:
  - the folder the host reads
  - the stub file
  - the statement that it is never invoked
artifact_contract_verified_by: the record folder is never presented as something to run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/modules.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Mark the package record as a record and not an entry point
A stub that marks the folder as a skill so it installs with the others.
It says never to invoke it.
<!-- vpmodule:atom:end mark-the-package-record-as-a-record-and-not-an-entry-point -->
<!-- vpmodule:atom:begin never-reuse-a-retired-name-and-carry-the-local-files-with-it -->
---
instruction_id: never-reuse-a-retired-name-and-carry-the-local-files-with-it
title: Never reuse a retired name and carry the local files with it
summary: "A name the package no longer ships is retired for good and is never given to anything else; when a member is renamed, the local files that belong to the old name move to the new one."
capability_tags:
  - design-structure
pattern_tags:
  - stable-identity
conditions_applies_when: A member of a package is renamed or removed in an update.
conditions_does_not_apply_when: The update adds a member and retires nothing.
artifact_contract_output_type: retirement-record
artifact_contract_required_data:
  - the retired names
  - the rename pairs
  - the local files that follow the rename
artifact_contract_verified_by: no retired name is used again and the local files sit under the new name
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/modules.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Never reuse a retired name and carry the local files with it
Skills the module no longer ships:
renamed as `{ from, to }` pairs and `removed` as names.
After an update,
files to the new name.
A retired name is never reused.
<!-- vpmodule:atom:end never-reuse-a-retired-name-and-carry-the-local-files-with-it -->