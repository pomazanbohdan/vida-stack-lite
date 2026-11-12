---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-codebase-verifier-md-5bfe1fef-c01"
title: "bmad-method: skills/bmad-deep-recon/references/codebase-verifier.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-deep-recon/references/codebase-verifier.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/codebase-verifier.md\"}"
atom_ids:
  - give-every-checked-claim-one-of-four-verdicts
  - let-the-validation-level-decide-what-gets-checked
  - verify-from-what-you-open-not-from-the-claim-s-wording
atom_count: 3
atoms: "[{\"atom_id\":\"give-every-checked-claim-one-of-four-verdicts\",\"file_sha256\":\"4fca0c1ff761bd0d835ea2b11fb481c4b2222adc4f2b1ca50a65670aad30f134\",\"content_sha256\":\"473efd63bb761a264a470d9ee4effd2d97eeb1245071d007b8dd9b03f8dcf27d\",\"file_bytes\":2060,\"body_bytes\":827},{\"atom_id\":\"let-the-validation-level-decide-what-gets-checked\",\"file_sha256\":\"c4333e7994f77ff4dc074ed6551ab71ca09113d4314651867d561dc0950843da\",\"content_sha256\":\"b80aa2e81f249653e06e2a156e4d4e0bd3dd9495696638c58bad23f4e1da778f\",\"file_bytes\":2649,\"body_bytes\":1065},{\"atom_id\":\"verify-from-what-you-open-not-from-the-claim-s-wording\",\"file_sha256\":\"6c2c164d826bcbb9d4c132dde8e6fd61ff43841f11b1fbd4940ef2991240ec0d\",\"content_sha256\":\"717922788315d7084c9632e99fd04b899f4654ddd9d33f24ebae9364f37e80bb\",\"file_bytes\":2556,\"body_bytes\":1243}]"
carrier_sha256: 5e881689ebb9877178f3eb2cc68fd66c76291ec61af5370aafc76b9226ed40ed
carrier_bytes: 7734
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-checked-claim-one-of-four-verdicts -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Give every checked claim one of four verdicts
Outcomes per claim: **verified** (independent source agrees within tolerance — for quantitative claims, same order of magnitude and direction), **disputed** (independent sources materially disagree — report both figures, both cited; never average), **unverified** (no independent check within budget — the claim stays, flagged, and joins the staleness map), or **overturned** (the weight of evidence contradicts it — corrected in the text, original noted).
A verification outcome adjusts status and flags — it never licenses rewriting a finding’s substance beyond what the new evidence says.
- `disputed` when the code bears out only part, saying which; `overturned` when it says otherwise, saying what, cited; `unverified` when what you can open does not settle it.
<!-- vpmodule:atom:end give-every-checked-claim-one-of-four-verdicts -->
<!-- vpmodule:atom:begin let-the-validation-level-decide-what-gets-checked -->
---
instruction_id: let-the-validation-level-decide-what-gets-checked
title: Let the validation level decide what gets checked
summary: "The level in force decides the breadth of the check: the load-bearing claims only, the two-source classes, or every claim in the ledger."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A validation level has been resolved for the run.
conditions_does_not_apply_when: The run carries no validation level and none is needed.
artifact_contract_output_type: validation-level-set
artifact_contract_required_data:
  - the level in force
  - the claims the level covers
artifact_contract_verified_by: "the claims checked match the level, and a citation that fails to re-find is recorded whatever the level"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-verifier.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Let the validation level decide what gets checked
Per the resolved `validation` level (request > knob > default `normal`):
- **normal** — spot-check the **load-bearing claims only**: the handful per dimension the recommendation actually rests on. One independent-source check each, at landing.
- **high** — cross-check every claim in the pack’s *two-source classes*, and run the red-team pass on major conclusions
- **max** — cross-check every ledger claim, run the red-team pass below at full breadth (every major conclusion), and primary-source-priority ranking: where a primary source (filing, regulator text, official docs, original paper) exists, secondary reporting alone does not verify.
- **Two-source classes (added to the type’s own):** pricing figures; performance/scale numbers; any cell that decides between the top two finalists.
- a claim it fails, or reports with `symbol_found` false, gets a ledger line whatever the level.
- at validation `max`, when the claim says what code calls or depends on, follow one more edge and judge again.
<!-- vpmodule:atom:end let-the-validation-level-decide-what-gets-checked -->
<!-- vpmodule:atom:begin verify-from-what-you-open-not-from-the-claim-s-wording -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-verifier.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
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
<!-- vpmodule:atom:end verify-from-what-you-open-not-from-the-claim-s-wording -->