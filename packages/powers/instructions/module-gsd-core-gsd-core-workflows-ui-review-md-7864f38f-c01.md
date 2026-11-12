---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-ui-review-md-7864f38f-c01"
title: "gsd-core: gsd-core/workflows/ui-review.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/ui-review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/ui-review.md\"}"
atom_ids:
  - compare-the-render-against-the-stated-dimensions
  - separate-the-machine-verified-from-the-human-judgment
atom_count: 2
atoms: "[{\"atom_id\":\"compare-the-render-against-the-stated-dimensions\",\"file_sha256\":\"123735e8d6d64dc098c1021dce151f824015b4be8e46e55170ce9ead432136ef\",\"content_sha256\":\"5d295f020f79176afe4f73de790d342c5f48de08d9d788807ee5ded49e1dc31c\",\"file_bytes\":1695,\"body_bytes\":402},{\"atom_id\":\"separate-the-machine-verified-from-the-human-judgment\",\"file_sha256\":\"6b711f66ab19ae732b4e9da16b0df9729bcaebfe6c6370e75a491cf498b198b8\",\"content_sha256\":\"ed18b99d6b7143d4546844b34fcd7957b9e842a2f74e63ecee403c362fb01879\",\"file_bytes\":1655,\"body_bytes\":518}]"
carrier_sha256: 8614723b223c6f2e2bc04668aa684536af0b085783dc307ce6cf0449e07f13c7
carrier_bytes: 3667
revision: 1
status: active
---
<!-- vpmodule:atom:begin compare-the-render-against-the-stated-dimensions -->
---
instruction_id: compare-the-render-against-the-stated-dimensions
title: Compare the render against the stated dimensions
summary: "What was built is compared against the dimensions the contract states, and every discrepancy becomes a finding inside the pillar it belongs to."
capability_tags:
  - verify-work-results
pattern_tags:
  - dimension-sweep
conditions_applies_when: An interface has been built and there is a contract that states how it should look.
conditions_does_not_apply_when: There is no contract to compare against.
artifact_contract_output_type: visual-audit
artifact_contract_required_data:
  - the contract dimensions
  - the observation of each dimension
  - the discrepancies
artifact_contract_verified_by: every stated dimension was compared and each discrepancy became a finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work/steps/automated-ui-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Compare the render against the stated dimensions
Compare against the spec's visual requirements — dimensions, color palette, layout, spacing scale, and typography.
Report any dimension, color, or layout discrepancies automatically as additional findings within the relevant pillar section
Compare the screenshot visually against the spec's stated requirements (dimensions, color, layout, spacing).
<!-- vpmodule:atom:end compare-the-render-against-the-stated-dimensions -->
<!-- vpmodule:atom:begin separate-the-machine-verified-from-the-human-judgment -->
---
instruction_id: separate-the-machine-verified-from-the-human-judgment
title: Separate the machine-verified from the human judgment
summary: What a machine can decide is decided by the machine; what needs taste is flagged for the person and shown separately after the machine pass is done.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An audit mixes mechanical checks with questions of taste.
conditions_does_not_apply_when: Every finding is mechanical.
artifact_contract_output_type: review-findings
artifact_contract_required_data:
  - the mechanical findings
  - the findings that need human review
artifact_contract_verified_by: the human-judgment findings are marked and surfaced separately from the automated pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
  - operations
---

# Separate the machine-verified from the human judgment
Flag items that require human judgment (brand feel, content tone) as `needs_human_review: true` in the findings — these are surfaced to the user separately after the automated pass completes.
If Playwright-MCP is not available in this session, this section is skipped entirely. The audit falls back to the standard code-only review described above.
No configuration change is required — the availability of `mcp__playwright__*` tools is detected at runtime.
<!-- vpmodule:atom:end separate-the-machine-verified-from-the-human-judgment -->