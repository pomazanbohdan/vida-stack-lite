---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-api-coverage-md-f032cb8d-c01"
title: "gsd-core: gsd-core/references/api-coverage.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/api-coverage.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/api-coverage.md\"}"
atom_ids:
  - enumerate-the-whole-surface-and-record-every-opt-out
  - fail-closed-when-the-check-could-not-look
atom_count: 2
atoms: "[{\"atom_id\":\"enumerate-the-whole-surface-and-record-every-opt-out\",\"file_sha256\":\"81c3a9b89ce5cd25e3252c53a7806b450f0ea4f1efbc4c9cde4315060290f6b5\",\"content_sha256\":\"99b9cd1d1ea844ca24a66ffbcc77062aa33d6893a3343c5655bbfd0e80100b35\",\"file_bytes\":1774,\"body_bytes\":586},{\"atom_id\":\"fail-closed-when-the-check-could-not-look\",\"file_sha256\":\"38ce5021bbc898545fb4d75a003b5ad7f8d623e4b0c8ddfaf9409d65c24559ac\",\"content_sha256\":\"2d0b49738ab2abdcf0474e5d1d94f35c55b81f27ab12d5cce4e7adec8bbc7e65\",\"file_bytes\":2066,\"body_bytes\":408}]"
carrier_sha256: e2a2f1ad5c0c7956fe1813bb88be314f44a34741e3c60c2b01597fa9cbb0a46d
carrier_bytes: 4141
revision: 1
status: active
---
<!-- vpmodule:atom:begin enumerate-the-whole-surface-and-record-every-opt-out -->
---
instruction_id: enumerate-the-whole-surface-and-record-every-opt-out
title: Enumerate the whole surface and record every opt-out
summary: The whole surface is listed first and every exclusion is a decision with a reason; the record is what the next round starts from.
capability_tags:
  - assess-change-impact
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: "A surface — an interface, an integration, a set of capabilities — is taken on."
conditions_does_not_apply_when: The surface was enumerated and decided in an earlier round.
artifact_contract_output_type: coverage-matrix
artifact_contract_required_data:
  - every element of the surface
  - the decision per element
  - the reason for every exclusion
artifact_contract_verified_by: every element has a decision and every exclusion has a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/api-coverage.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Enumerate the whole surface and record every opt-out
Full coverage is the default starting position; the coverage matrix is the *subtraction record*.
Every gap is an explicit, reasoned opt-out rather than a surprise.
INTEGRATE is the default. Every capability starts as INTEGRATE.
Every OPT-OUT MUST carry a one-line reason
An opt-out without a reason is an un-decided hole — the exact failure mode this gate exists to close.
Do not carry over the first integration's opt-outs silently — re-decide each capability for the new surface
The matrix is the durable subtraction record.
<!-- vpmodule:atom:end enumerate-the-whole-surface-and-record-every-opt-out -->
<!-- vpmodule:atom:begin fail-closed-when-the-check-could-not-look -->
---
instruction_id: fail-closed-when-the-check-could-not-look
title: Fail closed when the check could not look
summary: A check that could not read its input blocks and says so; it never certifies the absence it did not verify.
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A gate or a check runs over a scope it could not read or resolve.
conditions_does_not_apply_when: The check read everything it needed.
artifact_contract_output_type: fail-closed-report
artifact_contract_required_data:
  - what could not be read
  - the block
  - the difference between a failure of the check and a negative result
artifact_contract_verified_by: the run stopped and the report says the check could not look
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/api-coverage.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/dispatch-isolation-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/failing-direction.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/execute-phase-between-wave-reset.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/autonomous-ui-design-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fail closed when the check could not look
The last four are the fail-closed arms: the gate refuses to certify "no external-API integration" from scope it did not read.
Non-blocking for every answer it gets
The detector is deliberately **fail-closed**: it leans toward firing
Keep the resolver's own failure DISTINGUISHABLE from a genuine `none`.
A non-empty `readError` means the probe **could not look**.
<!-- vpmodule:atom:end fail-closed-when-the-check-could-not-look -->