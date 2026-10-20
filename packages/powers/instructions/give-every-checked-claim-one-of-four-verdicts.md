---
instruction_id: give-every-checked-claim-one-of-four-verdicts
title: Give every checked claim one of four verdicts
summary: "Every checked claim ends as verified, disputed, unverified or overturned, and a verdict adjusts the status and the flags — never the substance of the finding."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A claim has been checked.
conditions_does_not_apply_when: The claim has not been checked yet.
artifact_contract_output_type: claim-verdict
artifact_contract_required_data:
  - the claim
  - the verdict
  - the reason for the verdict
artifact_contract_verified_by: every checked claim carries exactly one of the four verdicts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-verifier.md
status: active
revision: 1
---

# Give every checked claim one of four verdicts
Outcomes per claim: **verified** (independent source agrees within tolerance — for quantitative claims, same order of magnitude and direction), **disputed** (independent sources materially disagree — report both figures, both cited; never average), **unverified** (no independent check within budget — the claim stays, flagged, and joins the staleness map), or **overturned** (the weight of evidence contradicts it — corrected in the text, original noted).
A verification outcome adjusts status and flags — it never licenses rewriting a finding’s substance beyond what the new evidence says.
- `disputed` when the code bears out only part, saying which; `overturned` when it says otherwise, saying what, cited; `unverified` when what you can open does not settle it.
