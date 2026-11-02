---
instruction_id: name-the-three-shapes-of-a-verification-gap
title: Name the four shapes of a verification gap
summary: "A verification gap is a regression, a missing adoption, a broken verification or a stale verification, and the four shapes are named before the search starts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The verification of a change is being searched for gaps.
conditions_does_not_apply_when: The review is hunting correctness bugs rather than missing verification.
artifact_contract_output_type: gap-shapes
artifact_contract_required_data:
  - the four gap shapes
artifact_contract_verified_by: every gap that is reported names one of the four shapes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the four shapes of a verification gap
The main verification gap shapes are:
1. **Regression gap:** the changed code could regress where it is used, and no test would fail.
2. **Missing-adoption gap:** a site that should use the new behavior still handles the case its own way, and no test would catch that.
3. **Broken-verification gap:** a test looks like it covers the change but does not: it is skipped, flaky, not run normally, or too weak to see the regression.
4. **Stale-verification gap:** a test this change made wrong or moot; it may still pass.
