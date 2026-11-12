---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-discuss-phase-modes-advisor-md-0b5bc6b0-c01"
title: "gsd-core: gsd-core/workflows/discuss-phase/modes/advisor.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/discuss-phase/modes/advisor.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/discuss-phase/modes/advisor.md\"}"
atom_ids:
  - complete-the-comparison-before-you-show-it
  - translate-the-technical-framing-into-the-outcome
atom_count: 2
atoms: "[{\"atom_id\":\"complete-the-comparison-before-you-show-it\",\"file_sha256\":\"77208a28cc4649be787089a647ef26789d1f8d88bab44543da2bcdc0b84e62d1\",\"content_sha256\":\"b186672682c84148d5a2e9865a93f00d527b4761ed60a106360fbc6d050e5de5\",\"file_bytes\":1701,\"body_bytes\":635},{\"atom_id\":\"translate-the-technical-framing-into-the-outcome\",\"file_sha256\":\"453425ae7af41f2946a03d10378b0514727f0bb1c39138d9aab31b7238337c91\",\"content_sha256\":\"ce1b98bb378e692d1720276c7bcb75208c12d3c98842701667702cc812ac99ee\",\"file_bytes\":1622,\"body_bytes\":468}]"
carrier_sha256: fcecfac59cf9638e371a38c1f27d2df617be609fc3303528932eedc5a6ed3c9f
carrier_bytes: 3618
revision: 1
status: active
---
<!-- vpmodule:atom:begin complete-the-comparison-before-you-show-it -->
---
instruction_id: complete-the-comparison-before-you-show-it
title: Complete the comparison before you show it
summary: A delegated comparison is completed and brought to the right size before it is shown.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A comparison produced by a research agent is about to be shown.
conditions_does_not_apply_when: "The comparison was produced directly, not delegated."
artifact_contract_output_type: comparison-table
artifact_contract_required_data:
  - the options
  - the trade-off columns
  - the recommendation
artifact_contract_verified_by: every column is present and the number of options matches the calibration tier
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/advisor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Complete the comparison before you show it
Verify all 5 columns present (Option | Pros | Cons | Complexity | Recommendation) — fill any missing columns rather than showing broken table
Verify option count matches calibration tier:
`full_maturity`: 3-5 options acceptable
`standard`: 2-4 options acceptable
`minimal_decisive`: 1-2 options acceptable
If agent returned too many, trim least viable. If too few, accept as-is.
If agent returned only 1 option, convert from table format to direct recommendation
Rewrite rationale paragraph to weave in project context and ongoing discussion context that the agent did not have access to
<!-- vpmodule:atom:end complete-the-comparison-before-you-show-it -->
<!-- vpmodule:atom:begin translate-the-technical-framing-into-the-outcome -->
---
instruction_id: translate-the-technical-framing-into-the-outcome
title: Translate the technical framing into the outcome
summary: "The same decision is stated in the language of the person who has to make it, without losing detail."
capability_tags:
  - communicate-concisely
pattern_tags:
  - technical-writing
conditions_applies_when: The person who has to make the decision cannot be expected to reason in implementation terms.
conditions_does_not_apply_when: The audience is technical and the implementation terms are the ones they need.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the reframed label
  - the reframed description
  - the unchanged decision
artifact_contract_verified_by: the same decision is preserved and no detail is removed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/advisor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Translate the technical framing into the outcome
When `NON_TECHNICAL_OWNER` is true, reframe gray area labels and descriptions in product-outcome language before presenting them. Preserve the same underlying decision — only change the framing
Replace implementation-level terms with outcome descriptions the user can reason about without technical context. The Recommendation column value and the table structure remain intact. Do not remove detail; translate it.
<!-- vpmodule:atom:end translate-the-technical-framing-into-the-outcome -->