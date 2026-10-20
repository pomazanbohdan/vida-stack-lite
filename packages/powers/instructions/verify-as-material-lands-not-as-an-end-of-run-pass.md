---
instruction_id: verify-as-material-lands-not-as-an-end-of-run-pass
title: "Verify as material lands, not as an end-of-run pass"
summary: Each dimension is checked in fresh-context verifiers the moment its material arrives; a rewrite pass at the end of the run degrades what it touches.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Material for a dimension has just landed.
conditions_does_not_apply_when: The material is still being gathered and nothing is ready to check.
artifact_contract_output_type: landing-time-verification
artifact_contract_required_data:
  - the dimension checked
  - the checks run at landing
artifact_contract_verified_by: every dimension was checked at landing and no end-of-run rewrite pass was used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
status: active
revision: 1
---

# Verify as material lands, not as an end-of-run pass
The trust layer — the same rules whatever produced the material (a native run’s digests or a processed import). Verification happens **as material lands**, per dimension, in fresh-context verifier subagents reading digest files — never as an end-of-run rewrite pass over an hour of accumulated context.
Late-pass rewrites degrade reports; landing-time checks improve them.
