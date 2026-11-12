---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-review-md-3b83cee9-c01"
title: "gsd-core: gsd-core/workflows/review.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/review.md\"}"
atom_ids:
  - join-every-review-lane-before-you-aggregate
  - keep-a-diagnostic-out-of-the-gate
  - make-an-opt-in-flag-require-the-exact-value
  - never-reuse-a-setting-from-an-unrelated-component
  - order-the-aggregate-by-selection-not-by-completion
  - preserve-each-run-s-evidence-in-its-own-directory
  - reserve-the-path-citation-for-real-repo-files
  - treat-an-empty-review-result-as-a-dropped-lane
atom_count: 8
atoms: "[{\"atom_id\":\"join-every-review-lane-before-you-aggregate\",\"file_sha256\":\"cbbf99b7539c719bf16df1f8bf8e6e7f254a1ba8686699e3621cbbfa0c457aba\",\"content_sha256\":\"c7af465203053585b2fbd211d0e3334dfbbc3ea24dcb4a6b2fdf8f31f60c3978\",\"file_bytes\":1516,\"body_bytes\":457},{\"atom_id\":\"keep-a-diagnostic-out-of-the-gate\",\"file_sha256\":\"2c788a477208674194a794bb8d40512d6d55873b5e4520c13f86f08c60f9230f\",\"content_sha256\":\"0cf355c172cb7473cecdf73855875fdde7ced9486d19f4c2880865a3b2f8dc26\",\"file_bytes\":1307,\"body_bytes\":190},{\"atom_id\":\"make-an-opt-in-flag-require-the-exact-value\",\"file_sha256\":\"e64bb2276ceabd21ad56105564e52e7ccd6be2552cb103476aa7d7d4a30ae6cb\",\"content_sha256\":\"4aa38a6aa2ea04faf981acfe2c85ef177dc595e044fb6722d78c3fda364fb603\",\"file_bytes\":1780,\"body_bytes\":378},{\"atom_id\":\"never-reuse-a-setting-from-an-unrelated-component\",\"file_sha256\":\"dc5338888dcb62096ddcc219e706f733e8269a41ef3867ee8e4c8ac1e9c069ab\",\"content_sha256\":\"73e22a4941eed10a09173428b5217ed591ec0b484f70ea0249ebcef185f6117b\",\"file_bytes\":1615,\"body_bytes\":303},{\"atom_id\":\"order-the-aggregate-by-selection-not-by-completion\",\"file_sha256\":\"bc9c757137e06f9a0b91695f6796f6b0483b279eddc67b8dc14348a4aa27dfd6\",\"content_sha256\":\"f08d60877f5110b0f370ee898e317407e10fbe8e89cac02f6e95bb82a1b12cd7\",\"file_bytes\":1339,\"body_bytes\":234},{\"atom_id\":\"preserve-each-run-s-evidence-in-its-own-directory\",\"file_sha256\":\"ea44cd188fb59b2efcbad0850fd9a231aa922e5478ee8557f43d544004a630ba\",\"content_sha256\":\"cfdf131d6e70fdc7913950f0f06cfff4bea5651572023043186bb3fba50c9772\",\"file_bytes\":1549,\"body_bytes\":319},{\"atom_id\":\"reserve-the-path-citation-for-real-repo-files\",\"file_sha256\":\"bd62fc8527ce40f0373c03c2808df85857b9d929437b82d587e82fd56bad0382\",\"content_sha256\":\"5d8f5dbbcb2ea6a258a5fc96c04b9d32dc37bf3820ec5cac7ad036a1b57c034f\",\"file_bytes\":1307,\"body_bytes\":176},{\"atom_id\":\"treat-an-empty-review-result-as-a-dropped-lane\",\"file_sha256\":\"72c9ca3262bb9944afea293b8f0755d1fdae81dedfd5af39bb8bb5e978c75b05\",\"content_sha256\":\"a70068202a06ca28c02bf208a2616245b4e69949457ab9d90ceab30928ee8487\",\"file_bytes\":1460,\"body_bytes\":317}]"
carrier_sha256: 20ea5c2aaeb3f5d673d5904cbccc95a408ed677cac2a616867452171d68a6c06
carrier_bytes: 13052
revision: 1
status: active
---
<!-- vpmodule:atom:begin join-every-review-lane-before-you-aggregate -->
---
instruction_id: join-every-review-lane-before-you-aggregate
title: Join every review lane before you aggregate
summary: "Nothing aggregates before every dispatched lane has finished, because assembled from a partial set looks complete while silently missing a reviewer."
capability_tags:
  - review-code
pattern_tags:
  - parallel-execution
conditions_applies_when: Several reviewers run and their outputs are collected into one result.
conditions_does_not_apply_when: A single reviewer runs.
artifact_contract_output_type: joined-review-set
artifact_contract_required_data:
  - the dispatched lanes
  - the ones that finished
artifact_contract_verified_by: the aggregate was written only after every dispatched lane finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Join every review lane before you aggregate
Join every dispatched lane
NOTHING below this line may run before every lane has finished
assembled from a partial set looks complete while silently missing a reviewer
A lane refused because the prompt exceeds its context cap is not a lane result: keep the typed refusal in the run and name it in the aggregate. Never trim the prompt to make it fit — a trimmed prompt reviewed something other than the plans.
<!-- vpmodule:atom:end join-every-review-lane-before-you-aggregate -->
<!-- vpmodule:atom:begin keep-a-diagnostic-out-of-the-gate -->
---
instruction_id: keep-a-diagnostic-out-of-the-gate
title: Keep a diagnostic out of the gate
summary: "A coverage diagnostic never blocks the run, never fails a reviewer and never changes the gate; it is reported only when there is something to report."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A measure of the coverage of a run is collected next to a gate that decides whether the run passes.
conditions_does_not_apply_when: The measure is the gate.
artifact_contract_output_type: coverage-diagnostic
artifact_contract_required_data:
  - the coverage
  - the lanes it is incomplete for
  - the gate decision
artifact_contract_verified_by: the diagnostic was reported and the gate decision did not change because of it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep a diagnostic out of the gate
This is diagnostic only: it never blocks the workflow, never fails a lane, and never changes the
only when at least one graded lane has `complete: false`
<!-- vpmodule:atom:end keep-a-diagnostic-out-of-the-gate -->
<!-- vpmodule:atom:begin make-an-opt-in-flag-require-the-exact-value -->
---
instruction_id: make-an-opt-in-flag-require-the-exact-value
title: Make an opt-in flag require the exact value
summary: "An opt-in flag is on only when its value is exactly the expected one, so a mistyped value gets the conservative behaviour; the fallback polarity is chosen per setting, failing open where that preserves the intent and closed where the default exists to prevent the action."
capability_tags:
  - write-configuration-override
pattern_tags:
  - safe-defaults
conditions_applies_when: A configuration value switches a behavior on and the value may be mistyped.
conditions_does_not_apply_when: The setting has no opt-in direction.
artifact_contract_output_type: opt-in-decision
artifact_contract_required_data:
  - the value read
  - the exact value that counts as on
  - the behaviour that resulted
artifact_contract_verified_by: a value other than the exact one left the conservative behaviour in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Make an opt-in flag require the exact value
STRICT equality on "true" is deliberate — "1", "yes" and
must NOT opt in, so a mistyped config gets the conservative behaviour rather than firing
concurrent requests at a rate-limited provider
which fails OPEN: there, failing open preserves
the user's intent; here it would fire exactly the requests the default exists to prevent
<!-- vpmodule:atom:end make-an-opt-in-flag-require-the-exact-value -->
<!-- vpmodule:atom:begin never-reuse-a-setting-from-an-unrelated-component -->
---
instruction_id: never-reuse-a-setting-from-an-unrelated-component
title: Never reuse a setting from an unrelated component
summary: "A component resolves its setting through its own declared key; when it declares none it emits nothing, because a value borrowed from an unrelated component is worse than no value."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A setting is resolved for a component that runs next to other components.
conditions_does_not_apply_when: The component owns the only instance of that setting.
artifact_contract_output_type: resolved-setting
artifact_contract_required_data:
  - the component
  - its own declared key
  - the value it emitted
artifact_contract_verified_by: the value came from the component own key or nothing was emitted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never reuse a setting from an unrelated component
Effort in particular is never read from an agent's execution settings
A lane that declares no effort emits no argument at all — a value borrowed from an unrelated agent is worse than no value
the resolution order is inspectable rather than implicit
<!-- vpmodule:atom:end never-reuse-a-setting-from-an-unrelated-component -->
<!-- vpmodule:atom:begin order-the-aggregate-by-selection-not-by-completion -->
---
instruction_id: order-the-aggregate-by-selection-not-by-completion
title: "Order the aggregate by selection, not by completion"
summary: "The results are aggregated in the order the reviewers were selected, not in the order they happened to finish, so the result does not depend on the scheduling."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Results of several workers are written into one record.
conditions_does_not_apply_when: There is only one result.
artifact_contract_output_type: ordered-aggregate
artifact_contract_required_data:
  - the selection order
  - the ordered results
artifact_contract_verified_by: the order of the results follows the selection and not the finishing order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Order the aggregate by selection, not by completion
Aggregate in SELECTED_REVIEWERS order, NOT completion order
produces is byte-identical to the one a sequential run produces
leaves no result file and correctly contributes no line
<!-- vpmodule:atom:end order-the-aggregate-by-selection-not-by-completion -->
<!-- vpmodule:atom:begin preserve-each-run-s-evidence-in-its-own-directory -->
---
instruction_id: preserve-each-run-s-evidence-in-its-own-directory
title: "Preserve each run's evidence in its own directory"
summary: "The per-lane evidence is copied out of the working directory before that directory is removed, into a directory of its own so a later run cannot overwrite it; a leftover working directory is cheaper than destroyed evidence."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - evidence-preservation
conditions_applies_when: The evidence of a run lives in a temporary directory that is about to be removed.
conditions_does_not_apply_when: The run produced no evidence at all.
artifact_contract_output_type: preserved-evidence
artifact_contract_required_data:
  - the evidence that was copied
  - the directory it was copied into
artifact_contract_verified_by: the evidence is in its own directory and the working directory was removed only after the copy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Preserve each run's evidence in its own directory
preserve per-lane evidence before destroying it
copy it beside the phase's artifacts BEFORE cleanup
ONE SUBDIRECTORY PER RUN
silently overwrote the first run's evidence for any lane that ran both times
a leftover temp directory is far cheaper than destroyed evidence
<!-- vpmodule:atom:end preserve-each-run-s-evidence-in-its-own-directory -->
<!-- vpmodule:atom:begin reserve-the-path-citation-for-real-repo-files -->
---
instruction_id: reserve-the-path-citation-for-real-repo-files
title: Reserve the path citation for real repo files
summary: "The reviewed artifact carries its own path as the anchor for a finding about itself, while the path-and-line form stays reserved for the real repository files the artifact refers to."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A finding cites a place in the reviewed artifact and in the files it refers to.
conditions_does_not_apply_when: Only one of the two is cited.
artifact_contract_output_type: citation-anchor
artifact_contract_required_data:
  - the anchor for the artifact
  - the citation for the repository file
artifact_contract_verified_by: the artifact citation and the repository citation use different forms
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reserve the path citation for real repo files
The path header is the citable anchor for findings about the plan itself
reserve `path:line` for repo files the plan references
<!-- vpmodule:atom:end reserve-the-path-citation-for-real-repo-files -->
<!-- vpmodule:atom:begin treat-an-empty-review-result-as-a-dropped-lane -->
---
instruction_id: treat-an-empty-review-result-as-a-dropped-lane
title: Treat an empty review result as a dropped lane
summary: "An empty result from a slow reviewer is a timeout kill, not a crash and not a clean review: the lane is treated as dropped and re-run with more time, because a review that silently drops a lane is blind in one eye."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: A reviewer returns nothing after a long run.
conditions_does_not_apply_when: The reviewer returned a report.
artifact_contract_output_type: dropped-lane
artifact_contract_required_data:
  - the dropped lane
  - the reason it is treated as dropped
  - the re-run
artifact_contract_verified_by: the lane was re-run rather than counted as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat an empty review result as a dropped lane
A silent empty output after a long run is a **timeout kill, not a crash**
Treat an empty result on a slow lane as a dropped lane and re-run with more time rather than diagnosing a CLI or sandbox failure
A cross-AI review that silently drops a lane is blind in one eye
<!-- vpmodule:atom:end treat-an-empty-review-result-as-a-dropped-lane -->