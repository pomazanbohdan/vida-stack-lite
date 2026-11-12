---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-core-tools-help-team-adoption-md-6286ac22-c01"
title: "bmad-method: skills/bmod-core-tools/help/team-adoption.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmod-core-tools/help/team-adoption.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-core-tools/help/team-adoption.md\"}"
atom_ids:
  - ask-before-a-completion-step-that-everyone-will-see
  - name-the-exact-tool-and-when-to-call-it
  - pin-only-what-the-whole-team-must-share
  - start-a-team-template-from-the-shipped-one-and-keep-its-headings
atom_count: 4
atoms: "[{\"atom_id\":\"ask-before-a-completion-step-that-everyone-will-see\",\"file_sha256\":\"3f22935959a43abf50d56ea1e009cefa78c79c7cc9e19868d1cc853621d77402\",\"content_sha256\":\"770b204ae224426e9ddc183c4e7d8d38e1d85d135805046cc8f2fd27fa1b7738\",\"file_bytes\":1416,\"body_bytes\":228},{\"atom_id\":\"name-the-exact-tool-and-when-to-call-it\",\"file_sha256\":\"070832d2e4155354dd0314d62a4a6a098b3fba5ef0c98e40b23cb036fc510872\",\"content_sha256\":\"e8ca58fdd66b9cefb085fa90529b95ae67f1c8d997e3f58d715c6dcecd9a559e\",\"file_bytes\":1320,\"body_bytes\":119},{\"atom_id\":\"pin-only-what-the-whole-team-must-share\",\"file_sha256\":\"96b6cc4b555937dac31e13000491900f73961142f8e9f440bcae37d31fd842e5\",\"content_sha256\":\"33fb28372788d0a398dbc5df89c4072f50924836cf79f8aa64aaa4190a633c9d\",\"file_bytes\":1246,\"body_bytes\":144},{\"atom_id\":\"start-a-team-template-from-the-shipped-one-and-keep-its-headings\",\"file_sha256\":\"c47a7659c2c038e2a1756c3bff065e83fbe43b858e2e9a2fdbb4c56c9eccebd3\",\"content_sha256\":\"6b5f55fe190031d3c89fb51e86e4e186a206c5feab3a3961e1120c9b4e164ca4\",\"file_bytes\":1390,\"body_bytes\":193}]"
carrier_sha256: f9eacd2bad0ea36ffa997b311da5ff2bd598406d57691c2c9376ae12fe750813
carrier_bytes: 5989
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-before-a-completion-step-that-everyone-will-see -->
---
instruction_id: ask-before-a-completion-step-that-everyone-will-see
title: Ask before a completion step that everyone will see
summary: "A completion step runs once after the work writes its output, such as posting a document or opening a ticket, and it asks before any action the teammates will see."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - control-tiering
conditions_applies_when: A shared completion step would publish something to other people.
conditions_does_not_apply_when: The completion step writes only to the working copy.
artifact_contract_output_type: completion-step
artifact_contract_required_data:
  - what the completion step does
  - when it runs
  - the approval it asks for before anything visible happens
artifact_contract_verified_by: the step asks before any action the team will see
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask before a completion step that everyone will see
Instructions that run once after a skill writes its output, such as posting the document to a wiki or opening a ticket.
They should ask before any action teammates will see.
<!-- vpmodule:atom:end ask-before-a-completion-step-that-everyone-will-see -->
<!-- vpmodule:atom:begin name-the-exact-tool-and-when-to-call-it -->
---
instruction_id: name-the-exact-tool-and-when-to-call-it
title: Name the exact tool and when to call it
summary: "A shared rule that requires a tool names the exact tool and says when to call it, because the teammates who have to use it must connect that tool themselves."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A shared team rule says that a tool has to be used.
conditions_does_not_apply_when: The rule names no tool.
artifact_contract_output_type: tool-requirement
artifact_contract_required_data:
  - the exact tool
  - when to call it
artifact_contract_verified_by: the rule names one tool and the moment it is called
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives generic advice to identify a shared tool and its call condition and ensure teammates can connect, without a supported domain or concrete operational tool workflow."
---

# Name the exact tool and when to call it
Name the exact tool and when to call it.
Teammates need that tool connected.
<!-- vpmodule:atom:end name-the-exact-tool-and-when-to-call-it -->
<!-- vpmodule:atom:begin pin-only-what-the-whole-team-must-share -->
---
instruction_id: pin-only-what-the-whole-team-must-share
title: Pin only what the whole team must share
summary: "Output locations and shared paths are pinned in the shared configuration, and only what the whole team must share is pinned there."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: An output location or a shared path is pinned in the shared configuration.
conditions_does_not_apply_when: The path is personal and only one person needs it.
artifact_contract_output_type: shared-paths
artifact_contract_required_data:
  - the paths that are pinned
  - the team members who must share them
artifact_contract_verified_by: nothing is pinned that only one member of the team needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Pin only what the whole team must share
Output locations and shared paths, pinned in central config.
Pin only what the whole team must share.
<!-- vpmodule:atom:end pin-only-what-the-whole-team-must-share -->
<!-- vpmodule:atom:begin start-a-team-template-from-the-shipped-one-and-keep-its-headings -->
---
instruction_id: start-a-team-template-from-the-shipped-one-and-keep-its-headings
title: Start a team template from the shipped one and keep its headings
summary: "A shared template is the team's own copy, kept in the repository; it starts from a copy of the shipped one and keeps that one's headings, so both stay comparable."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A team replaces the shipped template with its own.
conditions_does_not_apply_when: No template is being replaced.
artifact_contract_output_type: team-template
artifact_contract_required_data:
  - the shipped template the copy starts from
  - the headings the copy keeps
  - where the team keeps it
artifact_contract_verified_by: the team template keeps the headings of the shipped one and lives in the repository
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Start a team template from the shipped one and keep its headings
Point a skill at the team's own template, kept in the repository.
Start from a copy of the shipped one and keep its headings.
<!-- vpmodule:atom:end start-a-team-template-from-the-shipped-one-and-keep-its-headings -->