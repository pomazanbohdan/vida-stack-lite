---
instruction_id: extract-every-decision-relevant-claim-into-a-digest
title: Extract every decision-relevant claim into a digest
summary: "Every claim that bears on the decision is pulled into a digest with a fixed shape, keeping the original citations; contradictions between two imports are findings."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A report or an import is available and the claims in it have to be extracted.
conditions_does_not_apply_when: The material is already reduced to claims.
artifact_contract_output_type: claim-digest
artifact_contract_required_data:
  - the digest entries
  - the fixed fields of each entry
  - the contradictions between imports
artifact_contract_verified_by: "every claim bearing on the decision is in a digest with its publisher, its dates and its class"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/process.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Extract every decision-relevant claim into a digest
**Extract.** A subagent (fresh context, firewall rules) reads the import and pulls every claim bearing on the decision into digest files
- standard shape `{claim, source, publisher, pub_date, accessed, confidence, class}`, keeping the original’s citations (the cited source is the publisher; the import is the via).
- Multiple imports each get their own digest; contradictions between them are findings, not noise.
