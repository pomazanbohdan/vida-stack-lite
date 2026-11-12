---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-validation-md-a34e4f16-c01"
title: "gsd-core: gsd-core/templates/VALIDATION.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/VALIDATION.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/VALIDATION.md\"}"
atom_ids:
  - keep-the-sampling-continuous-no-three-tasks-without-a-check
  - sample-the-suite-fast-after-every-change
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-sampling-continuous-no-three-tasks-without-a-check\",\"file_sha256\":\"4f73cdaf1e7fd333c79c8adfe9cdd8aebd40f913a3eeea44558c1fee3d143bd3\",\"content_sha256\":\"1ab16d1ed99631186df17c2e7e66c26aeaf4dfc6879e4ee400a3ce95ce3ce0ec\",\"file_bytes\":1250,\"body_bytes\":155},{\"atom_id\":\"sample-the-suite-fast-after-every-change\",\"file_sha256\":\"78d59ed4774645a6ec02c8b284aba7622a1b601aedb27444926e79de0075f6ff\",\"content_sha256\":\"53fb3bbca4ee43008ef04ef47b7c427978ec112a3a6f6b6de59f2842ddb646a4\",\"file_bytes\":1259,\"body_bytes\":190}]"
carrier_sha256: 430016a2815b8c8f84f0fb1db1d97582fe732e3b7083a5d4dcc6d75b63aa3f91
carrier_bytes: 2822
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-sampling-continuous-no-three-tasks-without-a-check -->
---
instruction_id: keep-the-sampling-continuous-no-three-tasks-without-a-check
title: Keep the sampling continuous — no three tasks without a check
summary: "No three consecutive tasks may pass without an automated check, and no watch-mode flag may sit in a verify command."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: The per-task verification map of a piece of work is written.
conditions_does_not_apply_when: The work has one task only.
artifact_contract_output_type: sampling-continuity
artifact_contract_required_data:
  - the tasks and the check that covers each of them
artifact_contract_verified_by: no three consecutive tasks lack an automated check and no watch-mode flag is used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/VALIDATION.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the sampling continuous — no three tasks without a check
Sampling continuity: no 3 consecutive tasks without automated verify
No watch-mode flags
<!-- vpmodule:atom:end keep-the-sampling-continuous-no-three-tasks-without-a-check -->
<!-- vpmodule:atom:begin sample-the-suite-fast-after-every-change -->
---
instruction_id: sample-the-suite-fast-after-every-change
title: Sample the suite fast after every change
summary: "The quick run follows every task and the full suite follows every wave, so the feedback stays inside its budget."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A sampling rate for a piece of work is defined.
conditions_does_not_apply_when: The work has no automated checks.
artifact_contract_output_type: sampling-rate
artifact_contract_required_data:
  - the quick run command
  - the full suite command
  - the feedback budget
artifact_contract_verified_by: the sampling rate names both commands and the maximum feedback latency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/VALIDATION.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Sample the suite fast after every change
**After every task commit:** Run `{quick run command}`
**After every plan wave:** Run `{full suite command}`
**Max feedback latency:** {N} seconds
<!-- vpmodule:atom:end sample-the-suite-fast-after-every-change -->