---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-review-prompts-edge-case-hunter-md-0c8ce030-c01"
title: "bmad-method: skills/bmad-build-auto/review-prompts/edge-case-hunter.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-build-auto/review-prompts/edge-case-hunter.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/review-prompts/edge-case-hunter.md\"}"
atom_ids:
  - check-each-changed-call-site-against-the-callee-declaration
  - enumerate-paths-mechanically-not-by-intuition
  - name-the-call-that-invalidates-a-re-checked-handle
  - treat-the-unmentioned-members-of-a-changed-set-as-implicit-branches
atom_count: 4
atoms: "[{\"atom_id\":\"check-each-changed-call-site-against-the-callee-declaration\",\"file_sha256\":\"35422659b6caa7031ecaddf3af135c833f1ca2c974b3db62aaa6013da5cb9030\",\"content_sha256\":\"d26e55b5e644927e9c5a40af03f39dcf574da322ce30d30a0672519f4fe805b5\",\"file_bytes\":1792,\"body_bytes\":382},{\"atom_id\":\"enumerate-paths-mechanically-not-by-intuition\",\"file_sha256\":\"504efc088e4829f558c65ff7c1fbb260fa1cd31d41b533d5cd6d4bd8a9dc0e04\",\"content_sha256\":\"50c39eebd4ad632773b8f752b5fc54a224dcb5c6e36b6d8450dc8ec30a338e9b\",\"file_bytes\":2248,\"body_bytes\":845},{\"atom_id\":\"name-the-call-that-invalidates-a-re-checked-handle\",\"file_sha256\":\"ed907af680fb3cc7735712553f5fd199ca940c8061cb5f9be3a0603189651a9b\",\"content_sha256\":\"d4dd2fd05198e4d341fed0dfa472e2683f6d17f3cba316443c022aa9bcc2a9f1\",\"file_bytes\":1915,\"body_bytes\":386},{\"atom_id\":\"treat-the-unmentioned-members-of-a-changed-set-as-implicit-branches\",\"file_sha256\":\"5d49d59f9d7b7a55632af51f627628e8b40cd267d3d82891cc5cd21f007f479b\",\"content_sha256\":\"a0e1ea82f830a300c278fb71e851a60c32f59bc3e1f7a4ed59a832e683a6f3c3\",\"file_bytes\":1906,\"body_bytes\":420}]"
carrier_sha256: 48edadf518cd153a9dfced95d24bad3fa904c382f79b76253834dd0620f297d8
carrier_bytes: 8534
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-each-changed-call-site-against-the-callee-declaration -->
---
instruction_id: check-each-changed-call-site-against-the-callee-declaration
title: Check each changed call site against the callee declaration
summary: "Every call site the change touches is checked against the declaration of what it calls: the arguments, their order, their types and the defaults."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: The change adds or changes a call.
conditions_does_not_apply_when: The change changes no call.
artifact_contract_output_type: call-contract-findings
artifact_contract_required_data:
  - the call site
  - the callee declaration
  - the mismatch
artifact_contract_verified_by: every changed call site was checked against the declaration it calls
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Check each changed call site against the callee declaration
For each call site the diff adds or changes — in test files as well as production code — read the callee's declaration and check the call against it: argument count, order, types, and defaults. Report any mismatch
Ignore the rest of the codebase unless the provided content explicitly references external functions.
<!-- vpmodule:atom:end check-each-changed-call-site-against-the-callee-declaration -->
<!-- vpmodule:atom:begin enumerate-paths-mechanically-not-by-intuition -->
---
instruction_id: enumerate-paths-mechanically-not-by-intuition
title: "Enumerate paths mechanically, not by intuition"
summary: Every branch and boundary of the change is walked mechanically; handled paths are discarded silently and nothing is graded.
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: A change is reviewed for the paths it does not handle.
conditions_does_not_apply_when: The review is not about missing handling.
artifact_contract_output_type: edge-case-findings
artifact_contract_required_data:
  - the unhandled path
  - the condition that reaches it
  - the consequence
artifact_contract_verified_by: every branch was walked and only the unhandled ones were reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Enumerate paths mechanically, not by intuition
Never comment on whether code is good or bad; only list missing handling.
Your method is exhaustive path enumeration — mechanically walk every branch, not hunt by intuition
Report ONLY paths and conditions that lack handling — discard handled ones silently
Do NOT editorialize or add filler. Do NOT assign severity labels, rankings, or priority levels.
Walk all branching paths: control flow (conditionals, loops, error handlers, early returns) and domain boundaries (where values, states, or conditions transition).
Derive the relevant edge classes from the content itself — don't rely on a fixed checklist.
Revisit every edge class from Step 2 — e.g., missing else/default, null/empty inputs, off-by-one loops, arithmetic overflow, implicit type coercion, race conditions, timeout gaps
<!-- vpmodule:atom:end enumerate-paths-mechanically-not-by-intuition -->
<!-- vpmodule:atom:begin name-the-call-that-invalidates-a-re-checked-handle -->
---
instruction_id: name-the-call-that-invalidates-a-re-checked-handle
title: Name the call that invalidates a re-checked handle
summary: "Where the change re-checks something it already holds, the call that can invalidate it is named, together with what the change silently skips when the re-check fails."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: "The change re-checks, re-fetches or re-validates a handle, an index, an id or a pointer it already holds."
conditions_does_not_apply_when: The change holds no value it re-checks.
artifact_contract_output_type: handle-lifetime-findings
artifact_contract_required_data:
  - the value held
  - the call that invalidates it
  - what the change skips when the re-check fails
artifact_contract_verified_by: the invalidating call and the skipped path are both named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Name the call that invalidates a re-checked handle
Consider handle lifetime: when the changed code re-checks, re-fetches, or re-validates something it already held — a handle, index, id, pointer — the re-check exists because an intervening call can invalidate it
Identify that call, what it does to the thing held, and what the changed code silently skips when the re-check fails
<!-- vpmodule:atom:end name-the-call-that-invalidates-a-re-checked-handle -->
<!-- vpmodule:atom:begin treat-the-unmentioned-members-of-a-changed-set-as-implicit-branches -->
---
instruction_id: treat-the-unmentioned-members-of-a-changed-set-as-implicit-branches
title: Treat the unmentioned members of a changed set as implicit branches
summary: "When a change handles some members of a fixed set of values, the members it does not mention are branches too, and they have to be walked."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: "The change special-cases members of an enum, a status set, a sentinel list, a type tag, a flag or a value range."
conditions_does_not_apply_when: The change handles the whole set.
artifact_contract_output_type: implicit-branch-findings
artifact_contract_required_data:
  - the set
  - the members the change handles
  - the members it does not
artifact_contract_verified_by: every member of the set was walked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Treat the unmentioned members of a changed set as implicit branches
Consider implicit branches: the diff special-cases or changes the handling of one or more members of a fixed set of values — enums, status codes, sentinels, type tags, flags, value ranges. The rest of the set is implicit branches (e.g. the diff changes the `RED` and `YELLOW` cases of a `RED`/`YELLOW`/`GREEN` enum; `GREEN` is the implicit branch)
<!-- vpmodule:atom:end treat-the-unmentioned-members-of-a-changed-set-as-implicit-branches -->