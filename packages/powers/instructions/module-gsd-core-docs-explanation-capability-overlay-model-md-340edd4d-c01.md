---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-capability-overlay-model-md-340edd4d-c01"
title: "gsd-core: docs/explanation/capability-overlay-model.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:docs/explanation/capability-overlay-model.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/capability-overlay-model.md\"}"
atom_ids:
  - compose-through-one-builder-so-the-views-cannot-diverge
  - escalate-to-the-restrictive-scope-when-you-cannot-prove-distinctness
  - fail-open-loudly-when-a-control-cannot-load
  - let-the-first-party-always-win-every-collision
  - skip-a-broken-extension-with-a-warning-instead-of-crashing-the-whole-set
atom_count: 5
atoms: "[{\"atom_id\":\"compose-through-one-builder-so-the-views-cannot-diverge\",\"file_sha256\":\"f6303245d77300de8ca97ace4961d6e2dbb81f84358bd7939dd4670b836b3114\",\"content_sha256\":\"5d7e038fdfeb4d51a1fe4d6df413a43686d5731c3c132317442f983d9e732e1b\",\"file_bytes\":1493,\"body_bytes\":296},{\"atom_id\":\"escalate-to-the-restrictive-scope-when-you-cannot-prove-distinctness\",\"file_sha256\":\"591dfe1fca24f17d803fff79fb676a38492f37baf77466f469f04b1fa931b294\",\"content_sha256\":\"bab5d375fcfe5183589c17cfcdf74e908dd0b43779b459719374c8ac76f37bfa\",\"file_bytes\":1754,\"body_bytes\":496},{\"atom_id\":\"fail-open-loudly-when-a-control-cannot-load\",\"file_sha256\":\"31c38c2535edcc4366fec8268fad624d0b019c83134c82974c0f0008cefe6ca5\",\"content_sha256\":\"2b24209109d6c122ba0b7daf29ed7d1ff286b73a7856c003a345d35cae893730\",\"file_bytes\":1790,\"body_bytes\":457},{\"atom_id\":\"let-the-first-party-always-win-every-collision\",\"file_sha256\":\"df859bcc717a729c1d1cebd8ffad62cb48000177167f4bf26f0b3356ff65caa9\",\"content_sha256\":\"c4cc3633e43c9486a2f89df8ca3e3ea8d9260ad74dabc756cfcca9788998e241\",\"file_bytes\":1439,\"body_bytes\":300},{\"atom_id\":\"skip-a-broken-extension-with-a-warning-instead-of-crashing-the-whole-set\",\"file_sha256\":\"5ffc58b5bde51a2f278626212e1c4fda2bf12429baf75ede6f6a2fcfe2ad814b\",\"content_sha256\":\"770d82ae74892ce2b163fe2c29fe549eabd25591da7bfa62c6b3e21057852572\",\"file_bytes\":1626,\"body_bytes\":389}]"
carrier_sha256: efcff13ea7c84443c858b49808702bdf3352a63043f61e4ffd642ea342d90512
carrier_bytes: 8959
revision: 1
status: active
---
<!-- vpmodule:atom:begin compose-through-one-builder-so-the-views-cannot-diverge -->
---
instruction_id: compose-through-one-builder-so-the-views-cannot-diverge
title: Compose through one builder so the views cannot diverge
summary: "The merged set and the shipped set are materialised by the same builder, so an accepted extension is indistinguishable from a shipped one in every derived view."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "Two sources are merged into one registry, and every derived view is built from it."
conditions_does_not_apply_when: Only one source exists.
artifact_contract_output_type: canonical-builder
artifact_contract_required_data:
  - the single builder
  - the two inputs it materialises
  - the views that are derived from it
artifact_contract_verified_by: both sources went through the same builder and the derived views cannot diverge
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Compose through one builder so the views cannot diverge
- By forcing both through the single canonical builder, GSD guarantees that an accepted overlay is indistinguishable from a first-party capability in every derived view — which is exactly the artifact-parity promise the platform makes.
<!-- vpmodule:atom:end compose-through-one-builder-so-the-views-cannot-diverge -->
<!-- vpmodule:atom:begin escalate-to-the-restrictive-scope-when-you-cannot-prove-distinctness -->
---
instruction_id: escalate-to-the-restrictive-scope-when-you-cannot-prove-distinctness
title: Escalate to the restrictive scope when you cannot prove distinctness
summary: "When two roots cannot be shown to be different, the more restrictive scope wins; the trusted scope is never granted on an unproven distinction."
capability_tags:
  - harden-security-controls
pattern_tags:
  - safe-defaults
conditions_applies_when: "Two installation roots resolve to the same directory, or their distinctness cannot be proven."
conditions_does_not_apply_when: The two roots are provably different directories.
artifact_contract_output_type: scope-escalation
artifact_contract_required_data:
  - the roots that were compared
  - the scope that was chosen
  - the control that the stricter scope requires
artifact_contract_verified_by: the stricter scope was chosen and the trusted scope was not granted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Escalate to the restrictive scope when you cannot prove distinctness
- When the global and project roots resolve to the same physical directory (or distinctness cannot be proven), the surviving scope escalates to the more restrictive `project` — consent-required.
- This is a deliberately conservative choice: when GSD cannot prove a global root is distinct from your project tree, it treats it as project-scoped rather than risk granting trusted-global activation to repo-plantable content.
<!-- vpmodule:atom:end escalate-to-the-restrictive-scope-when-you-cannot-prove-distinctness -->
<!-- vpmodule:atom:begin fail-open-loudly-when-a-control-cannot-load -->
---
instruction_id: fail-open-loudly-when-a-control-cannot-load
title: Fail open loudly when a control cannot load
summary: "When a control cannot be loaded the work is not blocked by it, but the missing control is announced on every pass until it is resolved; the additions of the broken extension are dropped, the control is never silenced."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
  - control-tiering
  - control-failure-posture-policy
conditions_applies_when: A control declared by an extension cannot be loaded.
conditions_does_not_apply_when: The control loads normally.
artifact_contract_output_type: missing-control-warning
artifact_contract_required_data:
  - the missing control
  - the channel the warning travels on
  - the remediation the operator is given
artifact_contract_verified_by: the work proceeded and the missing control was announced on every pass
compatibility_excludes:
  - declare-what-a-hook-produces-and-consumes
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-overlay-model.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Fail open loudly when a control cannot load
- when GSD cannot compose an overlay, it removes the overlay's *additions* but never silences a *control* — a missing gate always surfaces, even though, per #2009, it no longer blocks the loop.
- it emits a warning through two channels — stderr (the channel host workflows/agents see when they run `gsd_run loop render-hooks <point>`) and the `loop render-hooks` JSON envelope's top-level `warnings` array.
<!-- vpmodule:atom:end fail-open-loudly-when-a-control-cannot-load -->
<!-- vpmodule:atom:begin let-the-first-party-always-win-every-collision -->
---
instruction_id: let-the-first-party-always-win-every-collision
title: Let the first party always win every collision
summary: "When two independently authored extensions collide, the shipped one keeps the name and the newcomer is rejected; an extension may only add, never override."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "Two extensions claim the same name, stem, key or family."
conditions_does_not_apply_when: Only one extension exists.
artifact_contract_output_type: collision-precedence
artifact_contract_required_data:
  - the collision
  - which side keeps it
  - what the rejected side may still do
artifact_contract_verified_by: the shipped extension keeps every collision and the newcomer can only add
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let the first party always win every collision
- The single load-bearing precedence rule is: **first-party always wins.** When a third-party overlay collides with a first-party capability, the overlay is rejected — never the other way round.
- An overlay can only *add*; it can never *override*.
<!-- vpmodule:atom:end let-the-first-party-always-win-every-collision -->
<!-- vpmodule:atom:begin skip-a-broken-extension-with-a-warning-instead-of-crashing-the-whole-set -->
---
instruction_id: skip-a-broken-extension-with-a-warning-instead-of-crashing-the-whole-set
title: Skip a broken extension with a warning instead of crashing the whole set
summary: An extension that cannot be loaded is skipped with a recorded warning and the rest of the set is processed; one broken extension never takes the others down.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: One extension in a set fails its validation or its load.
conditions_does_not_apply_when: Every extension in the set loads.
artifact_contract_output_type: skip-with-warning
artifact_contract_required_data:
  - the extension that was skipped
  - the warning that was recorded
  - the rest of the set
artifact_contract_verified_by: the broken extension was skipped with a warning and the rest of the set still loaded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Skip a broken extension with a warning instead of crashing the whole set
- the second rule of composition is: **a bad overlay is skipped with a warning; the loop always gets a usable registry.**
- The composition body is total: even an unexpected throw from a validator or a fragment-materialisation step is caught per-candidate, turned into a skip, and the next candidate is processed.
<!-- vpmodule:atom:end skip-a-broken-extension-with-a-warning-instead-of-crashing-the-whole-set -->