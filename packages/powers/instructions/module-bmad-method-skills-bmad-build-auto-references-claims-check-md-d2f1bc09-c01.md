---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-references-claims-check-md-d2f1bc09-c01"
title: "bmad-method: skills/bmad-build-auto/references/claims-check.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-build-auto/references/claims-check.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/references/claims-check.md\"}"
atom_ids:
  - keep-the-claims-out-of-the-path-tracing
  - treat-the-change-account-of-itself-as-testimony
  - try-to-falsify-each-checkable-claim
atom_count: 3
atoms: "[{\"atom_id\":\"keep-the-claims-out-of-the-path-tracing\",\"file_sha256\":\"e2a2a5cd6b82e7a95b6ff53d6f283592a91c4a5c530480155c797bb4636b902e\",\"content_sha256\":\"a9edf90b6d625e317b67a3cc140fbadf88b076b7554ef1f780104555b00b4005\",\"file_bytes\":1838,\"body_bytes\":341},{\"atom_id\":\"treat-the-change-account-of-itself-as-testimony\",\"file_sha256\":\"fcec10ec591210c6818b82fcc8a215ceca677a6c0512efff2820fec2bc36e0fc\",\"content_sha256\":\"6d44f18a917f5dc0382a761ca9705b86aeebb01e5296e0ee76a4cc59fe0620b8\",\"file_bytes\":1596,\"body_bytes\":365},{\"atom_id\":\"try-to-falsify-each-checkable-claim\",\"file_sha256\":\"2ae6ea80dd1e97af2a60ff569c923187b0e6084a0e92e6717596a3aeaabda988\",\"content_sha256\":\"feeab2a7bfcac4f07f14dc735bce7fc5c3370e5fb95e793846d184adc884b6fb\",\"file_bytes\":1847,\"body_bytes\":478}]"
carrier_sha256: 934f4786d0fe1a0dec50767b391280928aa0ac34472b568158dc6dcb0deb9057
carrier_bytes: 5696
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-claims-out-of-the-path-tracing -->
---
instruction_id: keep-the-claims-out-of-the-path-tracing
title: Keep the claims out of the path tracing
summary: "The claims are read only after the path tracing is finished, so they cannot steer the tracing retroactively."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: A review walks the paths of a change and then checks its claims.
conditions_does_not_apply_when: There are no claims to read afterwards.
artifact_contract_output_type: review-order
artifact_contract_required_data:
  - the order the passes ran in
  - the point at which the claims were read
artifact_contract_verified_by: the claims were opened after the path tracing was finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/references/claims-check.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/references/claims-check.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/edge-case-hunter.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Keep the claims out of the path tracing
Final pass for the Edge Case Hunter. Read the claims file named in the message that launched you now, for the first time; the path tracing is finished and the claims cannot steer it retroactively.
Do NOT read it before Step 5: the path tracing in Steps 2–3 must finish before the claims are seen.
<!-- vpmodule:atom:end keep-the-claims-out-of-the-path-tracing -->
<!-- vpmodule:atom:begin treat-the-change-account-of-itself-as-testimony -->
---
instruction_id: treat-the-change-account-of-itself-as-testimony
title: Treat the change account of itself as testimony
summary: "The document the change was built from is the change's own account of itself: testimony, not evidence, however often it is repeated."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: The account of the change is read while the change is checked.
conditions_does_not_apply_when: No account of the change is available.
artifact_contract_output_type: claim-source
artifact_contract_required_data:
  - the account
  - the sections that hold the claims
artifact_contract_verified_by: the account was read as testimony and its claims were checked against the code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/references/claims-check.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/references/claims-check.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat the change account of itself as testimony
It is the plan the change was built from. Read only its `## Intent` and `## Tasks & Acceptance` sections — the claims live there; ignore the rest of the file.
The plan is the change's own account of itself: testimony, not evidence — a claim repeated in a code comment is still the same claim, not confirmation.
<!-- vpmodule:atom:end treat-the-change-account-of-itself-as-testimony -->
<!-- vpmodule:atom:begin try-to-falsify-each-checkable-claim -->
---
instruction_id: try-to-falsify-each-checkable-claim
title: Try to falsify each checkable claim
summary: "Every checkable claim is extracted and tried against the code that was already traced; where the trace cannot decide it, the code that decides it is read."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: The claims of the change have been extracted.
conditions_does_not_apply_when: There are no claims to check.
artifact_contract_output_type: claim-findings
artifact_contract_required_data:
  - the claim
  - the code that contradicts it
  - what goes wrong for someone who believed it
artifact_contract_verified_by: each claim was tried and only the falsified ones were reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/references/claims-check.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/references/claims-check.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/references/claims-check.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Try to falsify each checkable claim
Extract each checkable claim — what the change does, what it preserves, ordering, arithmetic, and parity with existing code ("exactly as X does") — then try to falsify each one against the code you have already traced.
Where your trace is not enough to decide, read the code that decides it: the compared-to function, the actual callee, the state the claim assumes.
Verified claims produce nothing. Add nothing if nothing is falsified.
<!-- vpmodule:atom:end try-to-falsify-each-checkable-claim -->