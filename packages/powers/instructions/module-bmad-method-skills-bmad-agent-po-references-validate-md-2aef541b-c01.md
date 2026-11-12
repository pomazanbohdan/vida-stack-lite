---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-validate-md-2aef541b-c01"
title: "bmad-method: skills/bmad-agent-po/references/validate.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-agent-po/references/validate.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/validate.md\"}"
atom_ids:
  - merge-validation-findings-into-fix-suggest-or-ask
  - run-the-set-check-on-every-draft
atom_count: 2
atoms: "[{\"atom_id\":\"merge-validation-findings-into-fix-suggest-or-ask\",\"file_sha256\":\"7e12fb2bdd3009acb3d874650c8fc03877ba1b37cf7d26506c77de2a2cc1e456\",\"content_sha256\":\"d6a54618e4a63b99e86dc4bad8bcf4e3099e70d1d2fba114b6776dd1b54cc7e7\",\"file_bytes\":1508,\"body_bytes\":282},{\"atom_id\":\"run-the-set-check-on-every-draft\",\"file_sha256\":\"4765d4ef82099e869c1740970c2f5676ace6df74e8d1e66826613fa6e353b826\",\"content_sha256\":\"88eaefe8fead72c347d50d78f6e21931298f107dc9863a8cb941f656a80dc670\",\"file_bytes\":1779,\"body_bytes\":605}]"
carrier_sha256: 3be60971dae7453f94724ec3186fb3c2bf26eb9a3b5ab3579a43ea24d66af6b6
carrier_bytes: 3564
revision: 1
status: active
---
<!-- vpmodule:atom:begin merge-validation-findings-into-fix-suggest-or-ask -->
---
instruction_id: merge-validation-findings-into-fix-suggest-or-ask
title: "Merge the findings into fix, suggest, or ask"
summary: "Every finding of a check becomes a mechanical fix, a suggestion with its reason, or a question for the user; coverage gaps, missing prerequisites and contradictions are resolved before the work proceeds."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A check has produced findings.
conditions_does_not_apply_when: There are no findings.
artifact_contract_output_type: finding-routing
artifact_contract_required_data:
  - each finding in one of the three classes
  - the reason for a suggestion
  - what is resolved before the work proceeds
artifact_contract_verified_by: "every finding is fixed, suggested with a reason, or put to the user, and the gaps are resolved before the work proceeds"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Merge the findings into fix, suggest, or ask
Merge findings into fix (mechanical), suggest (a guideline, with its reason), or ask (needs the user). Resolve coverage gaps, missing prerequisites, and contradictions before proceeding; the user decides suggestions and scope changes.
<!-- vpmodule:atom:end merge-validation-findings-into-fix-suggest-or-ask -->
<!-- vpmodule:atom:begin run-the-set-check-on-every-draft -->
---
instruction_id: run-the-set-check-on-every-draft
title: Run the set check on every draft
summary: "A proposed set of containers, a proposed breakdown or a re-slice is checked on the draft, before the approval, always, and again after every change to the set."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A proposed set of items is about to be shown to the user for approval.
conditions_does_not_apply_when: The set was already checked and nothing about it changed.
artifact_contract_output_type: check-record
artifact_contract_required_data:
  - the draft that was checked
  - what the check changed
  - what it confirmed
artifact_contract_verified_by: the check ran on the draft before the approval and again after every change to the set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Run the set check on every draft
A proposed set of epics, a proposed epic breakdown, or a re-slice: on the draft, before the user is asked to approve it. This always runs; no path, mode, or setting skips it.
First walk the draft through the Dependencies section yourself and fix what that finds, then give the agent the corrected draft as text. Present the draft with what the check changed and what it confirmed. Run it again when the user's changes add, remove, merge, or reorder items.
At initiative slicing, check the tree's scope ownership without requiring stories or full detail in future epics.
<!-- vpmodule:atom:end run-the-set-check-on-every-draft -->