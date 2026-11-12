---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-step-04-review-md-673dd003-c02"
title: "bmad-method: skills/bmad-build-auto/step-04-review.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-build-auto/step-04-review.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/step-04-review.md\"}"
atom_ids:
  - recommend-a-follow-up-review-by-a-fixed-rule
  - reject-a-finding-as-out-of-scope-only-when-the-intent-excludes-it
  - run-the-review-lanes-at-the-session-model-capability
  - scope-the-fix-request-to-the-covering-tests
atom_count: 4
atoms: "[{\"atom_id\":\"recommend-a-follow-up-review-by-a-fixed-rule\",\"file_sha256\":\"8bce8ca7bc8133d0f9ffef6184571dd521d53620eaad94733b19f3af4373ae67\",\"content_sha256\":\"1621cb149609cb51c786091916fddfdda991d4d9c2e6bb2e3b9a67440f0588f2\",\"file_bytes\":1466,\"body_bytes\":370},{\"atom_id\":\"reject-a-finding-as-out-of-scope-only-when-the-intent-excludes-it\",\"file_sha256\":\"bf45e70862e7cbcb9ae3b28e60628beff5f2fa2f1dea8033c7fe71d58ac6818a\",\"content_sha256\":\"9bcbe3d2c8ba83cb3e908cec8d32084699ca14ae15fc0eac48f002b410024de1\",\"file_bytes\":1432,\"body_bytes\":341},{\"atom_id\":\"run-the-review-lanes-at-the-session-model-capability\",\"file_sha256\":\"0885e4976971588562144b552741b963bc462103458564d9c86fb5fbf7dddea1\",\"content_sha256\":\"464dcf769f388a871e67f434bb020f8ba8d109b27f8ec1fad288355fff277c34\",\"file_bytes\":1137,\"body_bytes\":138},{\"atom_id\":\"scope-the-fix-request-to-the-covering-tests\",\"file_sha256\":\"cbbea7f4922d350f30d6028b6e65560242f2597a79d4503765c22862e97c3bf5\",\"content_sha256\":\"1a5eec70ef636cabd05178795fea6853afa5c48fc6805373b330356275847f92\",\"file_bytes\":1587,\"body_bytes\":454}]"
carrier_sha256: 088dd3a86c1135e0d9bfa9cdae7d9771a0be38b2abd667e0c4c5cb0e0c702b17
carrier_bytes: 6261
revision: 1
status: active
---
<!-- vpmodule:atom:begin recommend-a-follow-up-review-by-a-fixed-rule -->
---
instruction_id: recommend-a-follow-up-review-by-a-fixed-rule
title: Recommend a follow-up review by a fixed rule
summary: "The follow-up recommendation follows one rule: patch volume alone never justifies it, and a recommendation has to name the unverified risk."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review pass finished and the work may need another pass.
conditions_does_not_apply_when: No review pass ran.
artifact_contract_output_type: follow-up-recommendation
artifact_contract_required_data:
  - the recommendation
  - the patched counts by verdict
  - the unverified risk it names
artifact_contract_verified_by: the recommendation follows the rule and names the risk or stays false
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Recommend a follow-up review by a fixed rule
Follow-up review recommendation: default `false`.
Count only this pass's entries triaged `patch`, at entry verdict — never deferred or `false` ones.
On a first pass, `true` if any patched entry was Critical, or if two or more Important entries were patched
otherwise the work has converged; patch volume is never grounds
<!-- vpmodule:atom:end recommend-a-follow-up-review-by-a-fixed-rule -->
<!-- vpmodule:atom:begin reject-a-finding-as-out-of-scope-only-when-the-intent-excludes-it -->
---
instruction_id: reject-a-finding-as-out-of-scope-only-when-the-intent-excludes-it
title: Reject a finding as out of scope only when the intent excludes it
summary: Only the captured intent can put a finding out of scope; the scope section of the plan and the shape of the diff cannot.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A finding is proposed as out of scope.
conditions_does_not_apply_when: No finding is being set aside.
artifact_contract_output_type: scope-decision
artifact_contract_required_data:
  - the finding
  - the intent clause that excludes it
  - the decision
artifact_contract_verified_by: "the exclusion is grounded in the intent, not in the plan or the diff"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject a finding as out of scope only when the intent excludes it
Out of scope: reject or defer a finding as out of scope only when the intent itself excludes it — not because the plan's scope section or the shape of the diff says so.
If only those would exclude it, keep the finding: the plan drew the line somewhere the intent did not
<!-- vpmodule:atom:end reject-a-finding-as-out-of-scope-only-when-the-intent-excludes-it -->
<!-- vpmodule:atom:begin run-the-review-lanes-at-the-session-model-capability -->
---
instruction_id: run-the-review-lanes-at-the-session-model-capability
title: Run the review lanes at the session model capability
summary: "Every review lane runs at the same model capability as the session, so the lanes stay comparable with each other."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Review lanes are launched for a change.
conditions_does_not_apply_when: Only one reviewer runs.
artifact_contract_output_type: review-dispatch
artifact_contract_required_data:
  - the lanes
  - the model capability each ran at
artifact_contract_verified_by: every lane ran at the session model capability
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run the review lanes at the session model capability
All review subagents must run at the same model capability as the current session.
<!-- vpmodule:atom:end run-the-review-lanes-at-the-session-model-capability -->
<!-- vpmodule:atom:begin scope-the-fix-request-to-the-covering-tests -->
---
instruction_id: scope-the-fix-request-to-the-covering-tests
title: Scope the fix request to the covering tests
summary: The fix request names the smallest change that does the job and asks for the tests that cover the edited files only; the full verification stays with the caller.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A finding is sent back to the executor that produced the change.
conditions_does_not_apply_when: The fix is applied in the current session.
artifact_contract_output_type: fix-request
artifact_contract_required_data:
  - the finding
  - the smallest fix
  - the tests to run
artifact_contract_verified_by: the request names the covering tests and leaves the full verification to the caller
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scope the fix request to the covering tests
Auto-fix. These are the only findings that survive loopbacks.
Fix each one below with the smallest change that does the job.
Run only the tests that cover the files you edit — nothing wider. Full verification runs on my side after you return. Reply with what you changed.
If verification fails and the failure cannot be fixed, HALT with status `blocked` and blocking condition `patch verification failed`.
<!-- vpmodule:atom:end scope-the-fix-request-to-the-covering-tests -->