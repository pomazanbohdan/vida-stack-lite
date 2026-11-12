---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-workflow-fragments-md-60018985-c01"
title: "gsd-core: docs/reference/workflow-fragments.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:docs/reference/workflow-fragments.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/workflow-fragments.md\"}"
atom_ids:
  - admit-a-new-condition-only-with-a-consumer-and-a-computable-fact
  - keep-a-closed-vocabulary-instead-of-growing-a-grammar
  - keep-absent-and-empty-as-two-different-states
  - resolve-compound-conditions-in-the-fact-not-in-the-grammar
  - strip-the-markers-at-emit-not-in-the-content
atom_count: 5
atoms: "[{\"atom_id\":\"admit-a-new-condition-only-with-a-consumer-and-a-computable-fact\",\"file_sha256\":\"85bb3c61ccdd24550290de9c3b4e42c8fc0acb9d445d81f1a6bbb72c1c557e3c\",\"content_sha256\":\"92e6fc335e81fc5e31b8dc9b0c3dc3a80df155074fc32071bbb1b4460e489112\",\"file_bytes\":1913,\"body_bytes\":728},{\"atom_id\":\"keep-a-closed-vocabulary-instead-of-growing-a-grammar\",\"file_sha256\":\"81b42975434f249de09735a7fbf109129297ad211906d508e87cf785b329b808\",\"content_sha256\":\"9db8c16cbe6f06120239cac1a4d2f8bf45622bccce461a1f8b5d50bfa64f8fd0\",\"file_bytes\":1634,\"body_bytes\":455},{\"atom_id\":\"keep-absent-and-empty-as-two-different-states\",\"file_sha256\":\"2a0d37d8f2d73b91aefabbfe12a0ef31cbb4b9de5ac38bb9797b17460d67fdec\",\"content_sha256\":\"bdc4e8314e70b0d1d92a1f56d90e660cd1592ca1b7914207ea6f64c6a97290f2\",\"file_bytes\":1391,\"body_bytes\":226},{\"atom_id\":\"resolve-compound-conditions-in-the-fact-not-in-the-grammar\",\"file_sha256\":\"41875999f71ea139c06b6946b499af06a3ca997b92c25f1dace2da50deef09c7\",\"content_sha256\":\"f71eb27b697b2ee3a354030bb1be85caddf46e05933ac1bae6590cd3e1af17ce\",\"file_bytes\":1535,\"body_bytes\":336},{\"atom_id\":\"strip-the-markers-at-emit-not-in-the-content\",\"file_sha256\":\"9384756005824f96f74700533a845019ec74d64653ea3118599145eac017c0fc\",\"content_sha256\":\"509107feeecd4258a570fcd83c713bd3d73af1c8f1e569c71da8dd32161d9493\",\"file_bytes\":1626,\"body_bytes\":439}]"
carrier_sha256: f013b9a5823900de522fda2418d6ee3d1fbac8d7055ad81b2390b9bcd64f9c36
carrier_bytes: 8916
revision: 1
status: active
---
<!-- vpmodule:atom:begin admit-a-new-condition-only-with-a-consumer-and-a-computable-fact -->
---
instruction_id: admit-a-new-condition-only-with-a-consumer-and-a-computable-fact
title: Admit a new condition only with a consumer and a computable fact
summary: A new condition enters the vocabulary only when a marked section needs it and the fact it reads can be computed ahead of the evaluation; otherwise it stays out.
capability_tags:
  - harden-validation
pattern_tags:
  - verified-loading
conditions_applies_when: A new condition is proposed for the vocabulary.
conditions_does_not_apply_when: A section already needs the condition and its fact is computed.
artifact_contract_output_type: condition-admission
artifact_contract_required_data:
  - the consuming section
  - the fact the condition reads
  - the entry point that computes it
artifact_contract_verified_by: the condition has a consuming section and a fact that is computed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/workflow-fragments.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Admit a new condition only with a consumer and a computable fact
- An atom only ships once it clears **two independent admission gates**, both required:
- **A named consuming section.** Some workflow's marked section actually needs the condition — an atom with no section that uses it is dead vocabulary, and dead vocabulary is how a closed list rots into an open one.
- **A fact the init seam can actually compute.**
- Only a workflow with a dedicated `cmdInit*` entry point (see [The manifest artifact](#the-manifest-artifact-and-per-workflow-keying) below) can carry a manifest, and only a condition that entry point can resolve at init time — from parsed CLI options or from `.planning/` state — may become an atom.
<!-- vpmodule:atom:end admit-a-new-condition-only-with-a-consumer-and-a-computable-fact -->
<!-- vpmodule:atom:begin keep-a-closed-vocabulary-instead-of-growing-a-grammar -->
---
instruction_id: keep-a-closed-vocabulary-instead-of-growing-a-grammar
title: Keep a closed vocabulary instead of growing a grammar
summary: "A condition vocabulary stays a closed list of single atoms: widening it is a deliberate change to the specification, never an edit that adds an operator one case at a time."
capability_tags:
  - harden-validation
pattern_tags:
  - state-modeling
conditions_applies_when: A new condition may be added to the vocabulary.
conditions_does_not_apply_when: The vocabulary has no conditions and none are planned.
artifact_contract_output_type: closed-vocabulary
artifact_contract_required_data:
  - the closed list of conditions
  - the rule that keeps it operator-free
  - how the list is widened
artifact_contract_verified_by: the vocabulary stayed closed and any widening was a deliberate change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/workflow-fragments.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep a closed vocabulary instead of growing a grammar
- This list is **closed by design** (Greenspun's Tenth Rule): left open-ended, `when=` would acquire boolean operators, negation, precedence, and runtime/capability predicates one edit at a time, becoming an ad-hoc, informally-specified applicability language.
- `when=` remains exactly one atom per marker: no operators, no negation, no nesting, regardless of how many atoms the frozen list holds.
<!-- vpmodule:atom:end keep-a-closed-vocabulary-instead-of-growing-a-grammar -->
<!-- vpmodule:atom:begin keep-absent-and-empty-as-two-different-states -->
---
instruction_id: keep-absent-and-empty-as-two-different-states
title: Keep absent and empty as two different states
summary: "An absent result and an empty result are different answers and are never collapsed: absent means the answer is unknown, empty means the answer was computed and it is nothing."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: "A result may be missing or may be empty, and the two are about to be handled the same way."
conditions_does_not_apply_when: The result can only ever be present and non-empty.
artifact_contract_output_type: absent-vs-empty
artifact_contract_required_data:
  - the absent case
  - the empty case
  - what each one means to the reader
artifact_contract_verified_by: the absent case and the empty case stayed distinguishable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/workflow-fragments.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep absent and empty as two different states
- Collapsing these two states inverts behavior on the degraded path: `null` means "I don't know, so include everything"; `[]` means "I computed this, and the answer is nothing."
<!-- vpmodule:atom:end keep-absent-and-empty-as-two-different-states -->
<!-- vpmodule:atom:begin resolve-compound-conditions-in-the-fact-not-in-the-grammar -->
---
instruction_id: resolve-compound-conditions-in-the-fact-not-in-the-grammar
title: "Resolve compound conditions in the fact, not in the grammar"
summary: A condition that is really a disjunction is reduced to one boolean before it reaches the grammar; the grammar itself never grows an operator.
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: A condition has several triggers that are combined before it is evaluated.
conditions_does_not_apply_when: The condition has exactly one trigger.
artifact_contract_output_type: fact-computed-condition
artifact_contract_required_data:
  - the triggers that are combined
  - the one boolean they are reduced to
  - the grammar that stays operator-free
artifact_contract_verified_by: the compound condition was reduced to one boolean and the grammar was left alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/workflow-fragments.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Resolve compound conditions in the fact, not in the grammar
- **compounding belongs in fact computation (`src/init.cts`), never in the `when=` grammar (`src/workflow-fragments.cts` / `src/section-manifest.cts`).**
- A condition that cannot be reduced to one boolean fact computed ahead of evaluation is not eligible to become an atom
<!-- vpmodule:atom:end resolve-compound-conditions-in-the-fact-not-in-the-grammar -->
<!-- vpmodule:atom:begin strip-the-markers-at-emit-not-in-the-content -->
---
instruction_id: strip-the-markers-at-emit-not-in-the-content
title: "Strip the markers at emit, not in the content"
summary: "The control markers are removed when the artifact is produced, and they are removed before any rewriting runs, so no rewrite ever sees the marker text."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - source-conversion
conditions_applies_when: An artifact is assembled from marked sections and then rewritten for a target.
conditions_does_not_apply_when: The artifact has no control markers.
artifact_contract_output_type: marker-stripping
artifact_contract_required_data:
  - the markers that are stripped
  - the order the stripping happens in
  - what the emitted artifact contains
artifact_contract_verified_by: the emitted artifact carries no markers and the rewriting never saw them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/workflow-fragments.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Strip the markers at emit, not in the content
- The marker lines themselves are never part of any fragment body, so the composed output — and therefore every installed runtime artifact — contains no `gsd:section` markers at all.
- Composition runs **before** the per-runtime converters (the `.claude/` → `.windsurf/`-style path and reference rewrites), so a marker's `id`/`when` attribute text is never exposed to a rewrite regex.
<!-- vpmodule:atom:end strip-the-markers-at-emit-not-in-the-content -->