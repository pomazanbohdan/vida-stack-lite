---
instruction_id: verify-from-what-you-open-not-from-the-claim-s-wording
title: "Verify from what you open, not from the claim’s wording"
summary: "A check is made against the opened source rather than against the wording of the claim, and it starts fresh so the reader’s interpretation cannot become the checker’s."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A claim made by somebody else is about to be checked.
conditions_does_not_apply_when: The claim was made by the checker itself.
artifact_contract_output_type: claim-recheck
artifact_contract_required_data:
  - the opened source
  - the verdict
  - the corrected citation
artifact_contract_verified_by: the verdict follows from what was opened and not from the wording of the claim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-verifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 2
---

# Verify from what you open, not from the claim’s wording
- You check claims someone else made, from what you open rather than from their wording; you start fresh so the researcher’s reading cannot become yours.
- Open only through git at the commit, never your harness’s file or search tools or `git status`, which see the working tree
- For a code claim, read the cited lines and judge whether they say what the claim says; when what it describes sits at other lines of that commit, re-anchor it by its symbol and judge those
**Verify against source — do not review the plan text in isolation.**
Open the referenced files and check each claim against the actual code.
For every strength or concern, cite concrete `path/to/file:line` evidence plus the mechanism.
When a plan asserts a mechanism works (a guard, a query filter, a test that exercises a path), trace whether it actually does what is claimed — do not take the plan’s word for it.
If you cannot read the repo (no file access), say so and downgrade that finding to an open question rather than asserting it.
Findings citing `file:line` evidence are weighted far more heavily than impressionistic ones; a review that only restates the plan’s own claims has low value.
