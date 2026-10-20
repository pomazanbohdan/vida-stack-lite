---
instruction_id: treat-a-plan-document-as-not-evidence
title: Treat a plan document as not evidence
summary: A document that plans a change still to be made is not evidence; the code’s own documentation and instructions are.
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: Evidence for a claim about how the code works is being gathered.
conditions_does_not_apply_when: The evidence is the code’s own documentation.
artifact_contract_output_type: evidence-eligibility
artifact_contract_required_data:
  - the source used
  - the reason it counts
artifact_contract_verified_by: no claim rests on a document that plans a change still to be made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-analyzer.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-locator.md
status: active
revision: 1
---

# Treat a plan document as not evidence
- A document that plans a change still to be made (a spec, story or ticket) is not evidence; the code’s own documentation and instructions are.
- A `where` question may be answered from your digest alone, so a bare path is a claim without a citation.
