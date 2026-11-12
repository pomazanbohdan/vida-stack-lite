---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-summary-complex-md-b5f168fe-c01"
title: "gsd-core: gsd-core/templates/summary-complex.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/summary-complex.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/summary-complex.md\"}"
atom_ids:
  - default-to-a-human-review-when-you-cannot-determine-coverage
  - mark-a-deliberate-stop-as-halted-so-dependants-are-blocked
atom_count: 2
atoms: "[{\"atom_id\":\"default-to-a-human-review-when-you-cannot-determine-coverage\",\"file_sha256\":\"3f407567b14798457a5af563db0771802a476aec9ceaeb26f2f415a9f0281d57\",\"content_sha256\":\"a74c1c7b5b0d3157873e8289cf60a3e245a84d129ae86df15a48c801516f7bc6\",\"file_bytes\":2148,\"body_bytes\":543},{\"atom_id\":\"mark-a-deliberate-stop-as-halted-so-dependants-are-blocked\",\"file_sha256\":\"47fbe2529b897cb54cd27b06b2d2df6edaeddf456da239fddb76fb83cdf10e5e\",\"content_sha256\":\"9e7b544a81a8e73d2f838cae59416fde6bed16f7938f27b1bc19935e863a5233\",\"file_bytes\":2139,\"body_bytes\":556}]"
carrier_sha256: 8f989cbe8c6c1cdbb024776b6b8b8bca895743c287a136e55d53e0d1ef52eb32
carrier_bytes: 4638
revision: 1
status: active
---
<!-- vpmodule:atom:begin default-to-a-human-review-when-you-cannot-determine-coverage -->
---
instruction_id: default-to-a-human-review-when-you-cannot-determine-coverage
title: Default to a human review when you cannot determine the coverage
summary: When the coverage cannot be determined the judgment flag is set to the human with a reason; it is never left empty and never set to skip the human.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The coverage of a deliverable cannot be determined.
conditions_does_not_apply_when: The coverage was determined and verified.
artifact_contract_output_type: coverage-fallback
artifact_contract_required_data:
  - the reason the coverage could not be determined
artifact_contract_verified_by: the judgment flag is set to the human and carries a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary-minimal.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary-standard.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary-complex.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Default to a human review when you cannot determine the coverage
if you cannot determine coverage for a deliverable, you MUST set `human_judgment: true` with `rationale: "Coverage not determined at authoring time — verifier must classify"`.
Never leave a deliverable's `human_judgment` empty, and never set it `false` just to skip the prompt — auto-pass additionally requires a passing `verification` entry, so the flag alone cannot skip the human.
When coverage is uncertain, default human_judgment: true — never auto-skip the human.
<!-- vpmodule:atom:end default-to-a-human-review-when-you-cannot-determine-coverage -->
<!-- vpmodule:atom:begin mark-a-deliberate-stop-as-halted-so-dependants-are-blocked -->
---
instruction_id: mark-a-deliberate-stop-as-halted-so-dependants-are-blocked
title: Mark a deliberate stop as halted so dependants are blocked
summary: "A plan that stopped on purpose is marked as halted, and every plan that depends on it is reported as blocked until it is resolved."
capability_tags:
  - execute-plan
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A plan stopped before it finished on purpose.
conditions_does_not_apply_when: The plan finished.
artifact_contract_output_type: halted-plan-record
artifact_contract_required_data:
  - the reason the plan stopped
  - the plans that depend on it
artifact_contract_verified_by: the plan is marked as halted and the dependants are reported as blocked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary-minimal.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary-standard.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/summary-complex.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Mark a deliberate stop as halted so dependants are blocked
`status: complete` is the default — the plan finished. Use `status: halted` instead when the plan reached a designed stop (a gate failure, a spike concluding without expanding into the full build, or any other intentional non-completion) and intentionally left tasks unfinished.
`halted` is machine-read: any plan whose `depends_on` (directly or transitively) names a halted plan is reported as blocked, not offered to the executor, until the halt is resolved and re-summarized as `complete`.
<!-- vpmodule:atom:end mark-a-deliberate-stop-as-halted-so-dependants-are-blocked -->