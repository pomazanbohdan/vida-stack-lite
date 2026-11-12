---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-embeddable-orchestration-system-md-b3995cca-c01"
title: "gsd-core: docs/explanation/embeddable-orchestration-system.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/explanation/embeddable-orchestration-system.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/embeddable-orchestration-system.md\"}"
atom_ids:
  - express-each-integration-as-data-against-one-published-contract
  - keep-the-runtime-axis-and-the-feature-axis-orthogonal
  - warn-when-the-installed-configuration-no-longer-matches-the-live-one
atom_count: 3
atoms: "[{\"atom_id\":\"express-each-integration-as-data-against-one-published-contract\",\"file_sha256\":\"2f6368ce97226b049a2c8e3e30f0dbbb80a072fc1bc748369f2661c0b2a56b10\",\"content_sha256\":\"a80bbe06ef7abb759235af423c39f6d27d3a6b4aa98cf25a7656b57a9ccf3860\",\"file_bytes\":1653,\"body_bytes\":390},{\"atom_id\":\"keep-the-runtime-axis-and-the-feature-axis-orthogonal\",\"file_sha256\":\"7c7c004c0a38737914055746876b5bedac6202c25f6a64e3dce6b092dbc36d61\",\"content_sha256\":\"00a2d7d75850ae5b5a97f99ef674f1c485a40ff43a41f6f599bc76da664d3b3e\",\"file_bytes\":1663,\"body_bytes\":444},{\"atom_id\":\"warn-when-the-installed-configuration-no-longer-matches-the-live-one\",\"file_sha256\":\"6427b47815d7d888a8b62de82944a5bdd07c38363a19c68e02a5b05a8c98aae8\",\"content_sha256\":\"9f7335cc5109af9370311e177d4a90887edfa0972b5fae5d476e4637b160d98b\",\"file_bytes\":1561,\"body_bytes\":304}]"
carrier_sha256: 369823d9014195361d95e187e85da6b02ed130612734d178ac488bc8649a6e9c
carrier_bytes: 5418
revision: 1
status: active
---
<!-- vpmodule:atom:begin express-each-integration-as-data-against-one-published-contract -->
---
instruction_id: express-each-integration-as-data-against-one-published-contract
title: Express each integration as data against one published contract
summary: "An integration declares the points it binds and the values it supports; it does not reach into the engine's internals, and the generated output cannot drift from what the installer produces."
capability_tags:
  - design-structure
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A new integration with an engine is being described.
conditions_does_not_apply_when: The engine has no published contract to bind to.
artifact_contract_output_type: descriptor-contract
artifact_contract_required_data:
  - the declared points and values
  - the contract it is expressed against
  - the source of truth for the output
artifact_contract_verified_by: the integration is data against the published contract and the output has one source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/embeddable-orchestration-system.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Express each integration as data against one published contract
- A host does not reach into GSD's internals; it declares which interface points it binds and which values it supports for each negotiated axis, and the engine tells it, deterministically, what it gets.
- Runtime output can no longer drift from what the installer produces, because there is only one source of truth for it.
<!-- vpmodule:atom:end express-each-integration-as-data-against-one-published-contract -->
<!-- vpmodule:atom:begin keep-the-runtime-axis-and-the-feature-axis-orthogonal -->
---
instruction_id: keep-the-runtime-axis-and-the-feature-axis-orthogonal
title: Keep the runtime axis and the feature axis orthogonal
summary: "Where the engine runs and what the engine does are two separate axes: the same feature behaves the same way on every host, and the same host runs any set of features without knowing about them."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A host integration and a feature extension are being described together.
conditions_does_not_apply_when: There is only one of the two axes in play.
artifact_contract_output_type: orthogonal-axes
artifact_contract_required_data:
  - the runtime axis
  - the feature axis
  - the independence between them
artifact_contract_verified_by: the two axes stay independent and the feature behaves the same on every host
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/embeddable-orchestration-system.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep the runtime axis and the feature axis orthogonal
- **Capabilities are about *what* GSD does** — feature plug-ins that attach at GSD's Loop Extension Points inside the loop that is already running.
- A host integration and a capability are orthogonal axes: the same capability behaves identically regardless of which host is running the loop, and the same host runs any composed set of capabilities without knowing anything about them.
<!-- vpmodule:atom:end keep-the-runtime-axis-and-the-feature-axis-orthogonal -->
<!-- vpmodule:atom:begin warn-when-the-installed-configuration-no-longer-matches-the-live-one -->
---
instruction_id: warn-when-the-installed-configuration-no-longer-matches-the-live-one
title: Warn when the installed configuration no longer matches the live one
summary: "A configuration that was fixed at install time and is changed afterwards produces a warning, because the host stays silently stale until the next install."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A configuration that was baked in at install time has changed.
conditions_does_not_apply_when: The configuration is resolved live on every invocation.
artifact_contract_output_type: stale-install-warning
artifact_contract_required_data:
  - the configuration that changed
  - the install that made it stale
  - the warning the operator gets
artifact_contract_verified_by: the stale install was reported instead of being left silently out of date
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/embeddable-orchestration-system.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Warn when the installed configuration no longer matches the live one
- If the model configuration changes after install, a declarative host is silently stale until the next reinstall — which is why GSD warns when a declarative host's model configuration changes without a matching reinstall (#1688).
<!-- vpmodule:atom:end warn-when-the-installed-configuration-no-longer-matches-the-live-one -->