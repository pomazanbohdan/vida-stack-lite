---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-security-auditor-compact-md-40e93f83-c01"
title: "GSD security auditor module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-security-auditor.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-security-auditor.compact.md\"}"
atom_ids:
  - a-check-in-the-wrong-layer-does-not-close-the-threat
  - count-only-the-findings-above-the-blocking-threshold
  - verify-a-transferred-risk-by-its-transfer-record-not-by-assumption
atom_count: 3
atoms: "[{\"atom_id\":\"a-check-in-the-wrong-layer-does-not-close-the-threat\",\"file_sha256\":\"b3f1468a6d881ebb620a2d48230843848aadea0ad13627629e4f643e90cf09d5\",\"content_sha256\":\"fb025dbc49897070b1388d7f0de49b5a17166243b1e309f6a1c1282bfee84d23\",\"file_bytes\":1616,\"body_bytes\":317},{\"atom_id\":\"count-only-the-findings-above-the-blocking-threshold\",\"file_sha256\":\"fad597de05e5c9923b0a3275907fdf08b7eb838f33b5cf8ac9d6f867afbc809d\",\"content_sha256\":\"5b284aa0a6767646e2f06ce90198d48b5c539ad2ae04b4f587df27f7d4355552\",\"file_bytes\":1891,\"body_bytes\":547},{\"atom_id\":\"verify-a-transferred-risk-by-its-transfer-record-not-by-assumption\",\"file_sha256\":\"65a817095e4c7497b43dcac93c96b009dbd37e023f9f3628ae144786564f8063\",\"content_sha256\":\"0320380204bece4c1218a15ef23986f47101d86001273d8402b55c56da45e78c\",\"file_bytes\":1569,\"body_bytes\":269}]"
carrier_sha256: 4dda9e761d87be5b48c0367c7ea628528aa3d4224ca7ca9984e86dcd0b8526d4
carrier_bytes: 5589
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-check-in-the-wrong-layer-does-not-close-the-threat -->
---
instruction_id: a-check-in-the-wrong-layer-does-not-close-the-threat
title: A check in the wrong layer does not close the threat
summary: "A mitigation is verified at the boundary it must protect, not merely found somewhere in the code."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A declared control is being verified as present in the implementation.
conditions_does_not_apply_when: The presence of the control is not in question and only its wiring is checked.
artifact_contract_output_type: control-verification
artifact_contract_required_data:
  - the threat vector the control addresses
  - the boundary where the control was found
artifact_contract_verified_by: the control sits on the boundary the threat vector crosses and is not only present somewhere in the tree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# A check in the wrong layer does not close the threat
L2: verify the mitigation ADDRESSES the threat vector and is placed at the correct boundary (a check in the wrong layer does not close the threat).
L3: deep trace — follow the data flow end-to-end, check edge cases and ordering, confirm no bypass path exists.
<!-- vpmodule:atom:end a-check-in-the-wrong-layer-does-not-close-the-threat -->
<!-- vpmodule:atom:begin count-only-the-findings-above-the-blocking-threshold -->
---
instruction_id: count-only-the-findings-above-the-blocking-threshold
title: Count only the findings above the blocking threshold
summary: The blocking count holds the findings at or above the declared threshold; the ones below it are recorded with their own label and never counted.
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A register mixes findings of different severities and a blocking count is reported.
conditions_does_not_apply_when: Every finding in the register has the same severity.
artifact_contract_output_type: blocking-count
artifact_contract_required_data:
  - the threshold
  - the count of the findings at or above it
  - "the findings below it, recorded separately"
artifact_contract_verified_by: the reported count equals the findings at or above the threshold and no finding below it is counted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Count only the findings above the blocking threshold
`threats_open` (the SECURITY.md frontmatter gate field) = the count of threats whose status is OPEN AND whose severity rank ≥ the `block_on` rank. `block_on: none` ⇒ 0 (nothing ever blocks). `block_on: Minor` ⇒ all open threats block. `block_on: Important` (default) ⇒ only Important and Critical open threats block.
Open threats BELOW the block threshold are recorded in the return as **open — below {block_on} threshold (non-blocking)** and MUST NOT be counted in `threats_open`.
<!-- vpmodule:atom:end count-only-the-findings-above-the-blocking-threshold -->
<!-- vpmodule:atom:begin verify-a-transferred-risk-by-its-transfer-record-not-by-assumption -->
---
instruction_id: verify-a-transferred-risk-by-its-transfer-record-not-by-assumption
title: "Verify a transferred risk by its transfer record, not by assumption"
summary: "A risk handed to another party is closed only when the transfer record exists; 'not our problem' is not the evidence."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A registered risk carries a disposition that hands it to somebody else.
conditions_does_not_apply_when: The risk is mitigated in this codebase and verified there.
artifact_contract_output_type: risk-verification
artifact_contract_required_data:
  - the disposition
  - the transfer record that was found
  - the verdict
artifact_contract_verified_by: "the verdict is closed only when the transfer record was located, and absent otherwise"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Verify a transferred risk by its transfer record, not by assumption
Treating `transfer` disposition as "not our problem" without verifying transfer documentation exists
For `transfer` threats: check for transfer documentation → present = `CLOSED`, absent = `OPEN`.
<!-- vpmodule:atom:end verify-a-transferred-risk-by-its-transfer-record-not-by-assumption -->