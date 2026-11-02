---
instruction_id: attach-a-source-reference-to-every-retrospective-finding
title: Attach a source reference to every retrospective finding
summary: "Every finding names the file, line, commit or log it came from; a claim that cannot be pointed at is not a finding and is dropped."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
  - code-audit
conditions_applies_when: A finding is written while a finished body of work is read back.
conditions_does_not_apply_when: The statement is not offered as a finding.
artifact_contract_output_type: sourced-finding
artifact_contract_required_data:
  - the source reference
  - the finding
artifact_contract_verified_by: "every finding names a file, line, commit or log, and no finding without one survived"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Attach a source reference to every retrospective finding
Every finding you report carries a source reference (file, line, commit, or log).
A claim you cannot point at — an invented root cause, a pattern the diff does not actually show — is not a finding. Drop it.
Every extracted learning must have source attribution back to the originating artifact
