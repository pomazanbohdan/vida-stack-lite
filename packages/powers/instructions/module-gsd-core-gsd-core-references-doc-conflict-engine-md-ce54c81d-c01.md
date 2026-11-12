---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-doc-conflict-engine-md-ce54c81d-c01"
title: "gsd-core: gsd-core/references/doc-conflict-engine.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/doc-conflict-engine.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/doc-conflict-engine.md\"}"
atom_ids:
  - give-every-conflict-a-found-an-impact-and-a-remediation
  - name-the-severity-and-the-action-of-each-conflict
atom_count: 2
atoms: "[{\"atom_id\":\"give-every-conflict-a-found-an-impact-and-a-remediation\",\"file_sha256\":\"0356e3bb87a01aa481c7e622961c8a8c37a4f8193bb8f8a738fbae0fd32af25e\",\"content_sha256\":\"2e8d535ee65e2e6d45ce119a71a54d22b68162bc104c7aea551946d6aa075a11\",\"file_bytes\":1434,\"body_bytes\":280},{\"atom_id\":\"name-the-severity-and-the-action-of-each-conflict\",\"file_sha256\":\"a8251e151070a3c44cc38fa8387be2dbb134cc55f97f73653be632170c17cb9d\",\"content_sha256\":\"eb9a913df2e6c9a1822a42554c7e8b511ec4784012fbaf6957ad813bba854d3f\",\"file_bytes\":1600,\"body_bytes\":484}]"
carrier_sha256: f5f52db9a2828758036bae8ed7c297ba0e9dd6214341fbd5c0f9c8f4ee52ad13
carrier_bytes: 3357
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-conflict-a-found-an-impact-and-a-remediation -->
---
instruction_id: give-every-conflict-a-found-an-impact-and-a-remediation
title: "Give every conflict a found, an impact and a remediation"
summary: "Each conflict entry states what was found, what it means and what to do about it, and the report is plain text, not a table."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A conflict report is rendered for the user.
conditions_does_not_apply_when: The report is consumed by a machine that expects structured output.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the found statement
  - the expected or the impact
  - the remediation line
artifact_contract_verified_by: "every entry has a found, one of expected/impact/note and a remediation where the severity requires it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/doc-conflict-engine.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Give every conflict a found, an impact and a remediation
Every entry requires `Found:` plus one of `Expected:`/`Impact:`/`Note:`
plus (for Critical/Important) a `→` remediation line.
Plain-text, never markdown tables (no `|---|`). The report is rendered to the user verbatim.
<!-- vpmodule:atom:end give-every-conflict-a-found-an-impact-and-a-remediation -->
<!-- vpmodule:atom:begin name-the-severity-and-the-action-of-each-conflict -->
---
instruction_id: name-the-severity-and-the-action-of-each-conflict
title: Name the severity and the action of each conflict
summary: "Three severities with three actions: Critical blocks the write, Important asks the user first, Minor is only reported."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: Incoming content conflicts with what the project already states.
conditions_does_not_apply_when: Nothing conflicts.
artifact_contract_output_type: conflict-severity
artifact_contract_required_data:
  - the severity of the conflict
  - the action the severity requires
  - the decision
artifact_contract_verified_by: every conflict carries one of the three severities and the action of that severity was taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/doc-conflict-engine.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name the severity and the action of each conflict
Unsafe to proceed. The workflow MUST exit without writing any destination files.
Ambiguous or partially overlapping. The workflow MUST surface the warning and obtain explicit user approval before writing.
Never auto-approve.
Informational only. No gate; no user prompt required. Included in the report for transparency.
no exceptions for "minor" blockers
Re-invent severity labels per workflow — the three-level taxonomy is fixed
<!-- vpmodule:atom:end name-the-severity-and-the-action-of-each-conflict -->