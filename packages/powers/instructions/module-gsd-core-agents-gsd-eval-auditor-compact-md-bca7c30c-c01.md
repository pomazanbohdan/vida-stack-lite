---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-eval-auditor-compact-md-bca7c30c-c01"
title: "gsd-core: agents/gsd-eval-auditor.compact.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-eval-auditor.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-eval-auditor.compact.md\"}"
atom_ids:
  - compute-the-score-with-the-deterministic-verb-never-by-hand
  - score-a-partial-coverage-as-missing-until-the-gap-is-quantified
atom_count: 2
atoms: "[{\"atom_id\":\"compute-the-score-with-the-deterministic-verb-never-by-hand\",\"file_sha256\":\"0904a973a52586c74d36c9a23bac3e5762aade93effa6b71aefaf1f03d980d86\",\"content_sha256\":\"9f6cc889a33da4b908937e517d0b8e7fa30c7913edce566e3460ebacc07cba35\",\"file_bytes\":1467,\"body_bytes\":328},{\"atom_id\":\"score-a-partial-coverage-as-missing-until-the-gap-is-quantified\",\"file_sha256\":\"dfe35cb8c7458d32c8f8ac9669e115e787176ae4e76c68ce804b22f880f4176b\",\"content_sha256\":\"257028b9e15fec73f8b4d3a79b0f77db412115d017b780bded64257c067970f5\",\"file_bytes\":1779,\"body_bytes\":532}]"
carrier_sha256: ee745f31346e64a055e760fd23d8667f270a8377879d0065780de524c807b635
carrier_bytes: 3605
revision: 1
status: active
---
<!-- vpmodule:atom:begin compute-the-score-with-the-deterministic-verb-never-by-hand -->
---
instruction_id: compute-the-score-with-the-deterministic-verb-never-by-hand
title: "Compute the score with the deterministic verb, never by hand"
summary: The score comes from the deterministic computation and is written down verbatim.
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A coverage score is produced for a report.
conditions_does_not_apply_when: The report carries counts that were measured directly.
artifact_contract_output_type: coverage-audit
artifact_contract_required_data:
  - the computed score
  - the verdict
artifact_contract_verified_by: the written score equals the computed one and was not recomputed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Compute the score with the deterministic verb, never by hand
Do NOT compute scores by hand. Call the deterministic verb with your audited inputs:
Parse the JSON result — it returns `coverage_score`, `infra_score`, `overall_score`, and `verdict`
Use those values verbatim in EVAL-REVIEW.md; never recompute or override them.
<!-- vpmodule:atom:end compute-the-score-with-the-deterministic-verb-never-by-hand -->
<!-- vpmodule:atom:begin score-a-partial-coverage-as-missing-until-the-gap-is-quantified -->
---
instruction_id: score-a-partial-coverage-as-missing-until-the-gap-is-quantified
title: Score a partial coverage as missing until the gap is quantified
summary: "Partial coverage of a critical dimension counts as missing until the gap is measured, and a plan is not evidence of an implementation."
capability_tags:
  - verify-work-results
pattern_tags:
  - finding-severity-policy
conditions_applies_when: The evaluation coverage of an implemented system is audited.
conditions_does_not_apply_when: The audit is of a plan rather than of an implementation.
artifact_contract_output_type: coverage-audit
artifact_contract_required_data:
  - the dimension
  - the coverage status
artifact_contract_verified_by: every planned dimension has a status and a partial one names the quantified gap
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Score a partial coverage as missing until the gap is quantified
Critical
an eval dimension is MISSING or a guardrail is unimplemented; AI system must not ship to production
Important
an eval dimension is PARTIAL; coverage is insufficient for confidence but not absent
Marking PARTIAL instead of MISSING because "some tests exist" — partial coverage of a critical eval dimension is MISSING until the gap is quantified
Accepting metric logging as evidence of evaluation without checking that logged metrics drive actual decisions
<!-- vpmodule:atom:end score-a-partial-coverage-as-missing-until-the-gap-is-quantified -->