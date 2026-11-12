---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-regression-gate-md-0d2d43c4-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/regression-gate.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/regression-gate.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/regression-gate.md\"}"
atom_ids:
  - replace-the-interactive-question-with-a-plain-list-in-text-mode
  - run-the-earlier-suites-before-the-later-verification
atom_count: 2
atoms: "[{\"atom_id\":\"replace-the-interactive-question-with-a-plain-list-in-text-mode\",\"file_sha256\":\"326614586a04ef0bcfca5bfda63a519ce60def6c5a5005763a6eb9031e84dd2f\",\"content_sha256\":\"5a2637eb1eba08f3fc022580ad78dec38ac5d0eb0e3104eccc671e75a0dfd22b\",\"file_bytes\":1438,\"body_bytes\":150},{\"atom_id\":\"run-the-earlier-suites-before-the-later-verification\",\"file_sha256\":\"a18d3daa3ff45e7a84554ec7fe643684278689c91f947f2a6f086af27f42e571\",\"content_sha256\":\"e7ee0d047608dad1fb434b9a86434f2453c77e457d3aa65626913770369e797c\",\"file_bytes\":1444,\"body_bytes\":180}]"
carrier_sha256: 1738ba4b48f4b55e207830fe35aa766c35e80c2cfd865dad76d2f2a19f9e8d3c
carrier_bytes: 3227
revision: 1
status: active
---
<!-- vpmodule:atom:begin replace-the-interactive-question-with-a-plain-list-in-text-mode -->
---
instruction_id: replace-the-interactive-question-with-a-plain-list-in-text-mode
title: Replace the interactive question with a plain list in text mode
summary: "When the runtime cannot show an interactive question, the question becomes a plain-text numbered list and the answer comes back as a typed number."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The runtime cannot show an interactive question widget.
conditions_does_not_apply_when: The interactive question is available.
artifact_contract_output_type: numbered-question
artifact_contract_required_data:
  - the options as a numbered list
  - the number the person typed
artifact_contract_verified_by: the options were shown as a plain numbered list and read back as a typed number
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/regression-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Replace the interactive question with a plain list in text mode
present as a plain-text numbered list and ask the user to type their choice number.
<!-- vpmodule:atom:end replace-the-interactive-question-with-a-plain-list-in-text-mode -->
<!-- vpmodule:atom:begin run-the-earlier-suites-before-the-later-verification -->
---
instruction_id: run-the-earlier-suites-before-the-later-verification
title: Run the earlier suites before the later verification
summary: "The suites of the already-finished units run before the verification of the new unit, so a regression across units is caught before the new work is declared good."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Earlier units of the same effort already exist and their test files are known.
conditions_does_not_apply_when: This is the first unit and no earlier suite exists.
artifact_contract_output_type: regression-gate-report
artifact_contract_required_data:
  - the earlier test files collected
  - the outcome of running them
  - the decision taken on a failure
artifact_contract_verified_by: the earlier suites ran before the verification of the new unit and a failure stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/regression-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Run the earlier suites before the later verification
Run prior phases' test suites to catch cross-phase regressions BEFORE verification.
HALT — do not proceed to verification.
<!-- vpmodule:atom:end run-the-earlier-suites-before-the-later-verification -->