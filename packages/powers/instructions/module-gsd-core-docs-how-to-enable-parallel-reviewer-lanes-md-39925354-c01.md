---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-enable-parallel-reviewer-lanes-md-39925354-c01"
title: "gsd-core: docs/how-to/enable-parallel-reviewer-lanes.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/enable-parallel-reviewer-lanes.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/enable-parallel-reviewer-lanes.md\"}"
atom_ids:
  - an-opt-in-flag-is-read-by-strict-equality
  - bound-the-selection-not-the-switch
  - the-output-order-follows-the-selection-not-the-completion
atom_count: 3
atoms: "[{\"atom_id\":\"an-opt-in-flag-is-read-by-strict-equality\",\"file_sha256\":\"5507d4465a9ab5d8c6560dd41a6fe72f5fea8dbda919f4818a30e9776a79dd24\",\"content_sha256\":\"7bea49f19bab496039eb9a66e037b1b15ede079b1ce735d10a58dd480561c43b\",\"file_bytes\":1473,\"body_bytes\":315},{\"atom_id\":\"bound-the-selection-not-the-switch\",\"file_sha256\":\"fb6158ddcb206792cf116633778dad22ba575c9729348187ec32dccdce7967fa\",\"content_sha256\":\"8ab9cb1d58733a64d7225508b2d583d11ae561686f09e394d2f354d38db471a4\",\"file_bytes\":1286,\"body_bytes\":185},{\"atom_id\":\"the-output-order-follows-the-selection-not-the-completion\",\"file_sha256\":\"dc22605eb705197fc805d43ab2760d16b93ab64f78a603c9c644de8b23956bfb\",\"content_sha256\":\"a701eeef54f7f93ebf0238dfb86153dd0b884e14265ea80f2e820ebfa8ea7402\",\"file_bytes\":1325,\"body_bytes\":170}]"
carrier_sha256: da2cd4b1621ae0f0d73d6f9a4585c082542400dde0f8c1e481c63465f583b8e9
carrier_bytes: 4521
revision: 1
status: active
---
<!-- vpmodule:atom:begin an-opt-in-flag-is-read-by-strict-equality -->
---
instruction_id: an-opt-in-flag-is-read-by-strict-equality
title: An opt-in flag is read by strict equality
summary: "Only the exact value opts in; every near-miss spelling is read as not enabled, so a mistyped configuration gets the conservative behaviour."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A behaviour is switched on by a configuration value.
conditions_does_not_apply_when: The value is a free-form setting that is validated against a schema.
artifact_contract_output_type: flag-read-result
artifact_contract_required_data:
  - the exact value that opts in
  - the values that do not
  - the behaviour that follows
artifact_contract_verified_by: only the exact value enables the behaviour and every near miss leaves it off
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# An opt-in flag is read by strict equality
Only the exact value `true` opts in. `"1"`, `"yes"`, `"on"` and `"TRUE"` are all read as *not enabled* and leave dispatch sequential. This is intentional: a mistyped config gets the conservative behavior rather than firing concurrent requests at a rate-limited provider.
<!-- vpmodule:atom:end an-opt-in-flag-is-read-by-strict-equality -->
<!-- vpmodule:atom:begin bound-the-selection-not-the-switch -->
---
instruction_id: bound-the-selection-not-the-switch
title: "Bound the selection, not the switch"
summary: "A parallel switch with no throttle of its own runs everything it is given at once, so the size of the selected set is the control."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: A parallel setting has no throttle of its own and the selected set can grow.
conditions_does_not_apply_when: The setting carries its own limit on how many run at once.
artifact_contract_output_type: concurrency-bound
artifact_contract_required_data:
  - the selected set
  - the number that runs at once
artifact_contract_verified_by: the number that runs at once is bounded by the size of the selected set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the selection, not the switch
There is no concurrency bound. Every selected lane dispatches at once.
If that is more than you want, the control is the size of your selected set
<!-- vpmodule:atom:end bound-the-selection-not-the-switch -->
<!-- vpmodule:atom:begin the-output-order-follows-the-selection-not-the-completion -->
---
instruction_id: the-output-order-follows-the-selection-not-the-completion
title: "The output order follows the selection, not the completion"
summary: "The sections and the lines of a result are ordered by the order the work was selected, not by the order it finished, so two runs of the same selection diff cleanly."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The result aggregates several independent runs.
conditions_does_not_apply_when: Only one run contributes to the result.
artifact_contract_output_type: ordered-result
artifact_contract_required_data:
  - the selection order
  - the order the sections appear in
artifact_contract_verified_by: "the order matches the selection order, so a diff of two runs shows no reordering churn"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# The output order follows the selection, not the completion
They follow reviewer-selection order, not completion order, so a diff of two runs shows no reordering churn.
<!-- vpmodule:atom:end the-output-order-follows-the-selection-not-the-completion -->