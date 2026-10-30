---
instruction_id: consolidate-and-provenance-link-the-findings
title: Consolidate and provenance-link the findings
summary: "The findings from every angle are merged, deduplicated and linked to their source, and a finding that cannot be tied to a source is dropped."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
  - code-audit
conditions_applies_when: The analysis angles have produced their findings.
conditions_does_not_apply_when: Only one angle ran and its findings are already the record.
artifact_contract_output_type: consolidated-findings
artifact_contract_required_data:
  - the merged findings
  - the source of each
artifact_contract_verified_by: every surviving finding names its source and no finding was kept without one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Consolidate and provenance-link the findings
Consolidate: merge, dedupe, and provenance-link findings.
Drop any finding you cannot tie to a source.
