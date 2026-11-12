---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-process-md-23f69eff-c01"
title: "bmad-method: skills/bmad-deep-recon/references/process.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-deep-recon/references/process.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/process.md\"}"
atom_ids:
  - extract-every-decision-relevant-claim-into-a-digest
  - keep-the-imported-original-untouched-in-one-place
atom_count: 2
atoms: "[{\"atom_id\":\"extract-every-decision-relevant-claim-into-a-digest\",\"file_sha256\":\"ab364337c3faa6e5ba04a1e432236d5f7326f6dea9eb4c9c91a9ab67f4b9f396\",\"content_sha256\":\"28291b599443a5354cd52d775e006c4347c95970f8817b725ddfd57194ba25b0\",\"file_bytes\":1685,\"body_bytes\":471},{\"atom_id\":\"keep-the-imported-original-untouched-in-one-place\",\"file_sha256\":\"8acfe6c74d9cc83af488edfce9cb39085baef9a3a770d985968c7872282f7722\",\"content_sha256\":\"12d7af6e6869f380720e10e30f1f34746a2605bcf37e03d8e4adc36c4c610ead\",\"file_bytes\":1259,\"body_bytes\":176}]"
carrier_sha256: d14228aa4b5d8e75ec5ce4e0c534befe1e00ceb963085242fef72f75882b2015
carrier_bytes: 3259
revision: 1
status: active
---
<!-- vpmodule:atom:begin extract-every-decision-relevant-claim-into-a-digest -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/process.md
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
<!-- vpmodule:atom:end extract-every-decision-relevant-claim-into-a-digest -->
<!-- vpmodule:atom:begin keep-the-imported-original-untouched-in-one-place -->
---
instruction_id: keep-the-imported-original-untouched-in-one-place
title: Keep the imported original untouched in one place
summary: "The imported document is copied into the workspace untouched, so that the full fidelity lives in exactly one place and nowhere else."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: An externally produced report is taken into the workspace.
conditions_does_not_apply_when: The material was produced inside the workspace.
artifact_contract_output_type: imported-original
artifact_contract_required_data:
  - the untouched original
  - the place it is kept
artifact_contract_verified_by: the original is preserved untouched in one place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/process.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the imported original untouched in one place
Move or copy the original into `{doc_workspace}/imports/` untouched — full fidelity is preserved there, and nowhere else.
<!-- vpmodule:atom:end keep-the-imported-original-untouched-in-one-place -->