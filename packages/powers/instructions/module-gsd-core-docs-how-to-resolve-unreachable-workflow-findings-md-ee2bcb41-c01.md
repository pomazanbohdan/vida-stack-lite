---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-unreachable-workflow-findings-md-ee2bcb41-c01"
title: "gsd-core: docs/how-to/resolve-unreachable-workflow-findings.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/resolve-unreachable-workflow-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-unreachable-workflow-findings.md\"}"
atom_ids:
  - prove-structural-reachability-not-execution
  - require-a-loader-not-a-claim-to-prove-reachability
  - sweep-every-reference-when-you-delete-a-file
atom_count: 3
atoms: "[{\"atom_id\":\"prove-structural-reachability-not-execution\",\"file_sha256\":\"2490624ce6cd7dd0af25a74625e0239f9096a83050d3d2ece491539518d524f9\",\"content_sha256\":\"d65d7ce767a3e020a94dc0676ba54d67fb53946a8780ab0ad996b4bebf8ca261\",\"file_bytes\":1499,\"body_bytes\":410},{\"atom_id\":\"require-a-loader-not-a-claim-to-prove-reachability\",\"file_sha256\":\"8bbd3d34a8c7f489cce7d61dec6ca3652f2ee49ea3cfe870fc4ea9f5cb3a268f\",\"content_sha256\":\"cd13d721a445319245cd90f045f14555fa952dd259ce87bcd184449b5059d9ca\",\"file_bytes\":1676,\"body_bytes\":553},{\"atom_id\":\"sweep-every-reference-when-you-delete-a-file\",\"file_sha256\":\"e83b44aa2f1d8b83c89f84a74d26c62cc234fb557ff21c4cd614528081bcc924\",\"content_sha256\":\"81ce35e4fb690a5df4539d1af9d8a5b5f1b377d0b323284d04fc3e8f6bc95493\",\"file_bytes\":1626,\"body_bytes\":515}]"
carrier_sha256: 7f151fa16538c6d4d2cf848acc643b8e3921166e89e18495d64cc4e3a42f910b
carrier_bytes: 5248
revision: 1
status: active
---
<!-- vpmodule:atom:begin prove-structural-reachability-not-execution -->
---
instruction_id: prove-structural-reachability-not-execution
title: "Prove structural reachability, not execution"
summary: A reachability rule proves that a loader names the file; it cannot prove the file is read on an executed path.
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A reachability check passes and the result is read as proof of use.
conditions_does_not_apply_when: The check is used to decide what to delete.
artifact_contract_output_type: reachability-verdict
artifact_contract_required_data:
  - the structural result
  - the limit of what it proves
artifact_contract_verified_by: the verdict states that the result is structural and names what it does not prove
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-workflow-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Prove structural reachability, not execution
The rule proves **structural** reachability: some loader names the file. It cannot prove the file is read on any executed path.
A mutual-reference island satisfies nothing.
A self-reference is not a loader.
A workflow that is named by a loader but never actually executed is **not** caught here. That is a semantic question this structural check does not answer.
<!-- vpmodule:atom:end prove-structural-reachability-not-execution -->
<!-- vpmodule:atom:begin require-a-loader-not-a-claim-to-prove-reachability -->
---
instruction_id: require-a-loader-not-a-claim-to-prove-reachability
title: "Require a loader, not a claim, to prove reachability"
summary: A claimed caller and a documentation mention are not callers; only a loader that names the file proves it is reached.
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A shipped file is reported as reached by nobody.
conditions_does_not_apply_when: The file is referenced by a loader that names it.
artifact_contract_output_type: reachability-decision
artifact_contract_required_data:
  - the file
  - the loader that names it
  - the claimed callers that were checked
artifact_contract_verified_by: every claimed caller was checked to exist and the file is either wired or swept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-workflow-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Require a loader, not a claim, to prove reachability
Before deleting, confirm the fence is not load-bearing: check the file's own header for a claimed caller and verify that caller exists.
**A claimed caller is not a caller.**
Documentation is a claim about the system, not a loader. `scan.md` was documented in `docs/INVENTORY.md` while being entirely unreached.
If you are tempted to satisfy the check by adding a mention somewhere convenient, that is the failure mode this scoping exists to prevent — the file stays dead and the gate goes green.
<!-- vpmodule:atom:end require-a-loader-not-a-claim-to-prove-reachability -->
<!-- vpmodule:atom:begin sweep-every-reference-when-you-delete-a-file -->
---
instruction_id: sweep-every-reference-when-you-delete-a-file
title: Sweep every reference when you delete a file
summary: "Deletion is a sweep: the index rows, the generated manifests, the fixtures and the tests that name the file all move together."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - deprecation-decision
conditions_applies_when: A file is genuinely dead and is about to be deleted.
conditions_does_not_apply_when: The file is live and its reference is missing.
artifact_contract_output_type: deletion-sweep
artifact_contract_required_data:
  - the index rows
  - the generated manifests
  - the tests that named the file
artifact_contract_verified_by: "no index row, generated manifest or test still names the deleted file"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-workflow-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Sweep every reference when you delete a file
Deletion is a five-step sweep, and skipping any step leaves the tree inconsistent:
**Remove its `docs/INVENTORY.md` row — in all five locales.** `docs/INVENTORY.md` plus `docs/ja-JP/`, `docs/ko-KR/`, `docs/zh-CN/`, `docs/pt-BR/`.
**Sweep tests that name the file — allowlists *and* content assertions.**
Cut the coupling in the same change — but keep any sibling assertions that guard *other* files, since these blocks are often shared across several workflows.
<!-- vpmodule:atom:end sweep-every-reference-when-you-delete-a-file -->