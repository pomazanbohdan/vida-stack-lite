---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-ecosystem-md-ee741194-c01"
title: "bmad-method: skills/bmad-toolsmith/ecosystem.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/ecosystem.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/ecosystem.md\"}"
atom_ids:
  - declare-a-dependency-only-where-it-is-used
  - offer-the-install-command-and-do-not-run-it
atom_count: 2
atoms: "[{\"atom_id\":\"declare-a-dependency-only-where-it-is-used\",\"file_sha256\":\"56e700f4d09247830dc99c63b620ac00913b5117d41b03b3d5150a56bebe8515\",\"content_sha256\":\"3dc8e1f8e368745132fd272867431c6cd72fda86695b3318ba1ea8efcf672e25\",\"file_bytes\":1488,\"body_bytes\":265},{\"atom_id\":\"offer-the-install-command-and-do-not-run-it\",\"file_sha256\":\"66972144ae27687857dd4dedbc7052702b2bd9c535a39a73bd18b8972e7f806f\",\"content_sha256\":\"48544a2ff94ae1920f99217fb45aad11ad6d350e8ada66912528ca0f5d20c0d7\",\"file_bytes\":1147,\"body_bytes\":134}]"
carrier_sha256: 8cf76da454a29b508cc4357c271672124ce93157fc9c7fe6289d0d46ee39ac30
carrier_bytes: 2920
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-a-dependency-only-where-it-is-used -->
---
instruction_id: declare-a-dependency-only-where-it-is-used
title: Declare a dependency only where it is used
summary: "A dependency is required when the tool invokes it, recommended when it helps beside it, and nothing otherwise."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-minimization
conditions_applies_when: The dependencies of a tool are written down.
conditions_does_not_apply_when: The tool has no dependencies.
artifact_contract_output_type: dependency-list
artifact_contract_required_data:
  - the tools it invokes
  - the tools that help beside it
  - the relationship for each
artifact_contract_verified_by: "every listed tool is either invoked or helps beside it, and nothing else is listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/ecosystem.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/multi-skill-module/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Declare a dependency only where it is used
From the discovery, decide for each installed skill:
required when the new skill invokes it, recommended when it helps beside it, nothing otherwise.
Module-wide needs go in the record, one skill's needs in its own file.
<!-- vpmodule:atom:end declare-a-dependency-only-where-it-is-used -->
<!-- vpmodule:atom:begin offer-the-install-command-and-do-not-run-it -->
---
instruction_id: offer-the-install-command-and-do-not-run-it
title: Offer the install command and do not run it
summary: "Anything named but not installed is offered with its install command, and the command is not run without being asked."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-minimization
conditions_applies_when: A dependency is named that is not installed.
conditions_does_not_apply_when: Everything the tool needs is already installed.
artifact_contract_output_type: install-offer
artifact_contract_required_data:
  - what is missing
  - the command that installs it
artifact_contract_verified_by: the command was offered and not run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/ecosystem.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Offer the install command and do not run it
For anything named but not installed,
- offer the install command; never run it unasked
<!-- vpmodule:atom:end offer-the-install-command-and-do-not-run-it -->