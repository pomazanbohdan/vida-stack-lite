---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-customize-skill-md-65778b65-c01"
title: "bmad-method: skills/bmad-customize/SKILL.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-customize/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-customize/SKILL.md\"}"
atom_ids:
  - choose-the-agent-surface-or-the-workflow-surface
  - classify-the-customization-intent
  - keep-the-override-sparse
  - merge-the-override-layers-by-field-kind
  - place-a-policy-override-with-the-team-and-a-personal-one-with-the-user
  - read-the-existing-override-before-composing
  - say-plainly-when-the-exposed-surface-does-not-cover-the-change
  - show-the-override-and-wait-for-an-explicit-yes
atom_count: 8
atoms: "[{\"atom_id\":\"choose-the-agent-surface-or-the-workflow-surface\",\"file_sha256\":\"ae275dd30b7dd5323d5127e8e154c9964f40d4cdfb0079c08a69cd33ae8d3109\",\"content_sha256\":\"1dd8659f9d95363b6f25d4f0b49efe2ecdd9b025187ff5b7f427f5e79b03d48a\",\"file_bytes\":1631,\"body_bytes\":590},{\"atom_id\":\"classify-the-customization-intent\",\"file_sha256\":\"c0c101962df9deb0b2e56697b4ac34944cf6f54a3efa558f20371674fd9945ae\",\"content_sha256\":\"ccb08a77e5eed9b65a606d8241fa481bfa4adf18b68e6ef93f4f94c75f409fd8\",\"file_bytes\":1287,\"body_bytes\":269},{\"atom_id\":\"keep-the-override-sparse\",\"file_sha256\":\"e76b495e92abb0884574ba4016cfcf5d36f66f59262b8857547f083a54c74308\",\"content_sha256\":\"d28d375925fe3f81b450ce8bdc3c227248857181146241df805681101619cb31\",\"file_bytes\":1098,\"body_bytes\":127},{\"atom_id\":\"merge-the-override-layers-by-field-kind\",\"file_sha256\":\"a3add1993f84c71c9bd432ae8e607665dcd25e69339199663857b3cedbf97ba1\",\"content_sha256\":\"e5350be663d4da3689f459d0fa99018305f057249a516b16a61fab830b82d572\",\"file_bytes\":1726,\"body_bytes\":468},{\"atom_id\":\"place-a-policy-override-with-the-team-and-a-personal-one-with-the-user\",\"file_sha256\":\"706b6f43b0ce50fe4fc72b8f19c8affbf5efc0652a58f78347c7995b0064584e\",\"content_sha256\":\"e1c91c0444b39f380e333cc4b59d2d83b6261ade509b5a539905a58357102542\",\"file_bytes\":1651,\"body_bytes\":332},{\"atom_id\":\"read-the-existing-override-before-composing\",\"file_sha256\":\"c5de657418d37fbec324894078ad07268430a0ea530053ce69700e09f95ba620\",\"content_sha256\":\"5ea05c2763b13aaebef7f99a0e5280e463532b30d474e8b6cec89f41c2f4a01b\",\"file_bytes\":1362,\"body_bytes\":302},{\"atom_id\":\"say-plainly-when-the-exposed-surface-does-not-cover-the-change\",\"file_sha256\":\"9cadd8f8acfa5ccbfc62cfecc3b225b1b9c1385cc90a024cb2de5478184f05e6\",\"content_sha256\":\"96b1e0f3378ce2147eb290eea3fe2a9d5515525c9fceac6f55a7e5beb5b75baa\",\"file_bytes\":1612,\"body_bytes\":419},{\"atom_id\":\"show-the-override-and-wait-for-an-explicit-yes\",\"file_sha256\":\"530f65c830e719a1c5a4f379eb179d9a222303323fcb5df670d754d0a2166e94\",\"content_sha256\":\"ab4aba86e9921240fd35ba51cdf762fbd4e6caea1cdd338b24d0c9b145848a58\",\"file_bytes\":1205,\"body_bytes\":151}]"
carrier_sha256: 00284343f1514dfa7b1937ff1e7166c717d407b82b9a32b004e6cfc35613762b
carrier_bytes: 12765
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-agent-surface-or-the-workflow-surface -->
---
instruction_id: choose-the-agent-surface-or-the-workflow-surface
title: Choose the agent surface or the workflow surface
summary: An agent surface covers every workflow the agent runs; a workflow surface covers one workflow only.
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A customization request has to be placed on a surface.
conditions_does_not_apply_when: The request names the surface itself.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the chosen surface
  - the reason for the choice
artifact_contract_verified_by: the surface matches how many workflows the change covers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the agent surface or the workflow surface
- Every workflow a given agent runs → agent surface
- One workflow only → workflow surface
- Several specific workflows → multiple workflow overrides in sequence, not an agent override
- Workflow-level: template swap, output path, step-specific behavior, or a named scalar already exposed
  Surgical, reliable.
- Agent-level: persona, communication style, org-wide facts, menu changes, behavior that should apply to every workflow the agent dispatches.
When ambiguous, present both with tradeoff, recommend one, let the user decide.
<!-- vpmodule:atom:end choose-the-agent-surface-or-the-workflow-surface -->
<!-- vpmodule:atom:begin classify-the-customization-intent -->
---
instruction_id: classify-the-customization-intent
title: Classify the customization intent
summary: "The request is classified as directed, exploratory, audit/iterate or cross-cutting before a surface is chosen."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A customization request arrives.
conditions_does_not_apply_when: The request already names both the target skill and the specific change.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the class of the request
artifact_contract_verified_by: the class of the request is named before any file is composed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the customization intent
- **Directed** — specific skill + specific change
- **Exploratory** — "what can I customize?"
- **Audit/iterate** — wants to review or change something already customized
- **Cross-cutting** — could live on multiple surfaces
<!-- vpmodule:atom:end classify-the-customization-intent -->
<!-- vpmodule:atom:begin keep-the-override-sparse -->
---
instruction_id: keep-the-override-sparse
title: Keep the override sparse
summary: The override carries only the fields that change; the whole source configuration is never copied into it.
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: An override file is composed.
conditions_does_not_apply_when: The configuration is written from scratch rather than as an override.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the changed fields only
artifact_contract_verified_by: the override holds only the fields that changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the override sparse
Write only the changed fields; a full copy of the configuration file blocks later shipped defaults.
<!-- vpmodule:atom:end keep-the-override-sparse -->
<!-- vpmodule:atom:begin merge-the-override-layers-by-field-kind -->
---
instruction_id: merge-the-override-layers-by-field-kind
title: Merge the override layers by field kind
summary: "Scalars are overridden, append arrays grow in order, and keyed arrays replace matching keys and append the rest; the shape of the value decides the merge, not the name of the field."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: More than one layer of configuration is resolved into the effective value.
conditions_does_not_apply_when: Only one layer exists.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the merge rule per field kind
  - the resolved value of the changed fields
artifact_contract_verified_by: each field kind is resolved by its own rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Merge the override layers by field kind
- Scalars (`icon`, `role`, `*_template`, `on_complete`) — override wins.
- Append arrays — team/user entries append in order.
- Keyed arrays of tables (menu items with `code` or `id`) — matching keys replace, new keys append.
The value's shape decides the merge. The field name does not.
An override cannot remove a shipped item. Replace a keyed item with one that does nothing.
Appended: shipped, then team, then user.
<!-- vpmodule:atom:end merge-the-override-layers-by-field-kind -->
<!-- vpmodule:atom:begin place-a-policy-override-with-the-team-and-a-personal-one-with-the-user -->
---
instruction_id: place-a-policy-override-with-the-team-and-a-personal-one-with-the-user
title: Place a policy override with the team and a personal one with the user
summary: "A policy, an org convention and a compliance rule are a committed team override; a personal tone, a private fact and a shortcut are a user override, and a committed one reaches the teammates on their next pull."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: An override file is about to be written.
conditions_does_not_apply_when: The placement was named in the request.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the chosen layer
  - the character that decided it
artifact_contract_verified_by: the placement was confirmed before the file was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Place a policy override with the team and a personal one with the user
- team, committed. Policies, org conventions, compliance.
- user, gitignored. Personal tone, private facts, shortcuts.
Default by character (policy → team, personal → user), confirm before writing.
Committed, so teammates get a change on their next pull.
<!-- vpmodule:atom:end place-a-policy-override-with-the-team-and-a-personal-one-with-the-user -->
<!-- vpmodule:atom:begin read-the-existing-override-before-composing -->
---
instruction_id: read-the-existing-override-before-composing
title: Read the existing override before composing
summary: "An existing override is read and summarized first, and the new change is framed as additive."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A team or user override already exists for the target.
conditions_does_not_apply_when: No override exists yet for the target.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - what is already overridden
  - the new change framed as additive
artifact_contract_verified_by: the existing override was read and summarized before the new one was composed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the existing override before composing
If a team or user override already exists, read it first and summarize what's already overridden before composing.
Translate plain-English into TOML against the target's configuration fields. If an existing override was read, frame the change as additive.
<!-- vpmodule:atom:end read-the-existing-override-before-composing -->
<!-- vpmodule:atom:begin say-plainly-when-the-exposed-surface-does-not-cover-the-change -->
---
instruction_id: say-plainly-when-the-exposed-surface-does-not-cover-the-change
title: Say plainly when the exposed surface does not cover the change
summary: "The exposed fields are the boundary, step logic and ordering included: say so plainly instead of inventing a field."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A customization request asks for something the exposed configuration cannot carry.
conditions_does_not_apply_when: The request maps onto a field that is already exposed.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the part of the request that is outside the exposed surface
  - the nearest exposed approximation offered
artifact_contract_verified_by: no field outside the exposed surface appears in the override
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Say plainly when the exposed surface does not cover the change
When the target's configuration doesn't expose what the user wants, say so plainly.
Don't invent fields.
Intent outside the exposed surface (step logic, ordering, anything not exposed): say so; offer `activation_steps_prepend`/`append` or `persistent_facts` as approximations, or, if `bmad-toolsmith` is installed, recommend it to create a custom skill.
<!-- vpmodule:atom:end say-plainly-when-the-exposed-surface-does-not-cover-the-change -->
<!-- vpmodule:atom:begin show-the-override-and-wait-for-an-explicit-yes -->
---
instruction_id: show-the-override-and-wait-for-an-explicit-yes
title: Show the override and wait for an explicit yes
summary: "The full override is shown, a diff when the file exists, and nothing is written before an explicit yes."
capability_tags:
  - write-configuration-override
pattern_tags:
  - approval-policy-gate
conditions_applies_when: An override file is about to be written or changed.
conditions_does_not_apply_when: The file was written before it was shown.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the full override
  - the diff against the existing file
artifact_contract_verified_by: nothing was written before the user answered yes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Show the override and wait for an explicit yes
Show the full TOML. If the file exists, show a diff. Never silently overwrite.
Wait for explicit yes.
<!-- vpmodule:atom:end show-the-override-and-wait-for-an-explicit-yes -->