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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-review.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/steps/automated-ui-verification.md
status: active
revision: 1
---

# Compare the render against the stated dimensions
Compare against the spec's visual requirements — dimensions, color palette, layout, spacing scale, and typography.
Report any dimension, color, or layout discrepancies automatically as additional findings within the relevant pillar section
Compare the screenshot visually against the spec's stated requirements (dimensions, color, layout, spacing).
