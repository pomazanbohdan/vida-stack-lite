---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-capability-trust-model-md-f78625de-c01"
title: "gsd-core: docs/explanation/capability-trust-model.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/explanation/capability-trust-model.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/capability-trust-model.md\"}"
atom_ids:
  - install-never-runs-the-code-you-are-installing
  - re-consent-when-the-executable-set-changes
  - separate-artifact-parity-from-trust-posture
  - treat-an-instruction-surface-as-a-code-execution-surface
atom_count: 4
atoms: "[{\"atom_id\":\"install-never-runs-the-code-you-are-installing\",\"file_sha256\":\"6a3f50bc99f4be279f264437272b62f2aefa2aa6667dcbede10ec0a3cb5a7a65\",\"content_sha256\":\"0c2af64eb8d70eaf5d14e489870d5da413e8206f3f05ae8cb36b8049ba691628\",\"file_bytes\":1557,\"body_bytes\":378},{\"atom_id\":\"re-consent-when-the-executable-set-changes\",\"file_sha256\":\"aa71ee2cc595602f58208610f3c3bd80b8cc18a0a229905ba042cdfedab4fd80\",\"content_sha256\":\"0aa6fbfaf08eacfa71b8a19ee413b5fa829faf2eb7c1596a9a0d42233a64a305\",\"file_bytes\":1672,\"body_bytes\":432},{\"atom_id\":\"separate-artifact-parity-from-trust-posture\",\"file_sha256\":\"10d491f20cb0201997501bd557e825d85d3fa7b15d05ccdbf8dc3bf6321d26c6\",\"content_sha256\":\"348386ad5ded6de54615fed1854457999178f6d15912020544228c5d31de684c\",\"file_bytes\":1636,\"body_bytes\":431},{\"atom_id\":\"treat-an-instruction-surface-as-a-code-execution-surface\",\"file_sha256\":\"c5e4eb3eef65d4f200b88716c991ec25088cbd6eeade2785a48aa05c7a8fec85\",\"content_sha256\":\"989b85a6722872c7ccfae7fa8b6a13a01008a3828fe6ae7040da38284e7d8563\",\"file_bytes\":1606,\"body_bytes\":320}]"
carrier_sha256: 79dd49c63b227905883d1a7b7d6c32963fca133dfca330449decfdddc67c45cc
carrier_bytes: 7076
revision: 1
status: active
---
<!-- vpmodule:atom:begin install-never-runs-the-code-you-are-installing -->
---
instruction_id: install-never-runs-the-code-you-are-installing
title: Install never runs the code you are installing
summary: "Installation stages files and validates the manifest; no hook fires, no module is loaded and no server is started, so the user has a window to inspect before anything runs."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: An extension is about to be installed from an outside source.
conditions_does_not_apply_when: The extension is the shipped package itself.
artifact_contract_output_type: copy-only-staging
artifact_contract_required_data:
  - what installation does
  - what it does not start
  - when the executable surface first runs
artifact_contract_verified_by: installation copied and validated files and started nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Install never runs the code you are installing
- GSD takes a stronger position: **install never executes capability code**, full stop. Installation is a copy-only staging operation. There is no `postinstall`-equivalent.
- No hook fires, no module is `require()`'d, no MCP server is started. The executable surfaces remain inert until the first loop event fires after consent.
<!-- vpmodule:atom:end install-never-runs-the-code-you-are-installing -->
<!-- vpmodule:atom:begin re-consent-when-the-executable-set-changes -->
---
instruction_id: re-consent-when-the-executable-set-changes
title: Re-consent when the executable set changes
summary: "An update that adds or removes a surface that can run asks for consent again, even when the update is otherwise benign; an update that touches only documentation does not."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: An update to an already-installed extension is about to be applied.
conditions_does_not_apply_when: The extension is the shipped package itself.
artifact_contract_output_type: re-consent-trigger
artifact_contract_required_data:
  - the executable set before and after
  - the change that forces a new consent
  - the surfaces that need no new consent
artifact_contract_verified_by: a change to the executable set forced a new consent and the documentation-only change did not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Re-consent when the executable set changes
- When it is enabled, a change to the *executable set* (the set of hooks, MCP servers, command modules, or reviewer lanes the capability declares) triggers a re-consent prompt before the update applies. Updating a non-executable capability (documentation, agents, skills) does not require re-consent.
- the new version cannot silently gain a hook that the previous version did not have.
<!-- vpmodule:atom:end re-consent-when-the-executable-set-changes -->
<!-- vpmodule:atom:begin separate-artifact-parity-from-trust-posture -->
---
instruction_id: separate-artifact-parity-from-trust-posture
title: Separate artifact parity from trust posture
summary: "What an extension is allowed to ship and what evidence it must produce before it runs are two separate questions, and permission to ship is never permission to be trusted."
capability_tags:
  - harden-security-controls
pattern_tags:
  - trust-graded-context
conditions_applies_when: An extension from an outside source is being admitted to a platform.
conditions_does_not_apply_when: "Only the platform's own shipped components are in scope."
artifact_contract_output_type: parity-vs-trust
artifact_contract_required_data:
  - what the extension may ship
  - the evidence and consent it must produce
  - what parity does not grant
artifact_contract_verified_by: the two questions are answered separately and parity was not read as trust
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Separate artifact parity from trust posture
- The maintainer's response to this is not to deny parity but to draw a sharp line between two things that are often conflated:
- **Artifact parity** — what a third-party capability is *allowed to ship*.
- **Trust posture** — the evidence and consent required before that capability *executes* on your machine.
- GSD grants full artifact parity. It does not grant symmetric trust.
<!-- vpmodule:atom:end separate-artifact-parity-from-trust-posture -->
<!-- vpmodule:atom:begin treat-an-instruction-surface-as-a-code-execution-surface -->
---
instruction_id: treat-an-instruction-surface-as-a-code-execution-surface
title: Treat an instruction surface as a code-execution surface
summary: "An instruction that reaches the agent is classified as a surface that runs, because it decides what the thing that does run will do; classifying it as inert picks the wrong property."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - threat-modeling
conditions_applies_when: A surface that only carries prose is about to be classified for consent.
conditions_does_not_apply_when: The surface is an inert artifact that the agent never reads.
artifact_contract_output_type: surface-classification
artifact_contract_required_data:
  - the surface that carries instructions
  - the property the classification is based on
  - the consent that follows
artifact_contract_verified_by: the instruction surface is classified as a running surface and the consent follows
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Treat an instruction surface as a code-execution surface
- That reasoning was wrong, and the correction matters more than the wording: a skill body does not execute code, it **instructs the thing that does**.
- The consent path was chosen on a property ("does not execute code") that is true and not the relevant one.
<!-- vpmodule:atom:end treat-an-instruction-surface-as-a-code-execution-surface -->