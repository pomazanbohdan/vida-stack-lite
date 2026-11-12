---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-batch-md-8ba7b73b-c01"
title: "gsd-core: gsd-core/workflows/quick-batch.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/quick-batch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick-batch.md\"}"
atom_ids:
  - cap-the-fan-out-by-the-host-capacity
  - complete-only-what-is-verified-complete
  - keep-the-shared-writes-with-one-owner
  - let-the-tool-own-the-grammar
  - merge-in-dispatch-order-not-completion-order
atom_count: 5
atoms: "[{\"atom_id\":\"cap-the-fan-out-by-the-host-capacity\",\"file_sha256\":\"09daf5c7291dd957dfed79f03a5556c39780ba0c93081957dfa1a1a9270ac842\",\"content_sha256\":\"f35b37dbb48330628e786937fd5a9c04777114aee932b4beab478cbd3514418b\",\"file_bytes\":1226,\"body_bytes\":133},{\"atom_id\":\"complete-only-what-is-verified-complete\",\"file_sha256\":\"78685136a940655c863f4427398e9257ebf60fca80eab9db2a41907864349d3b\",\"content_sha256\":\"168baa419dbac237cf92b3f4a10d174b85a8a2c02df59da25db91bd789d7b1dc\",\"file_bytes\":1523,\"body_bytes\":294},{\"atom_id\":\"keep-the-shared-writes-with-one-owner\",\"file_sha256\":\"d2a3a0bee4611d04f782a650e0e42af3b33a0ca93b0273b15bc09ce73b5ec770\",\"content_sha256\":\"0775813b89564cb4deb7671b161636ff20917b8acbcd22a4b7a594f902a5ac72\",\"file_bytes\":1233,\"body_bytes\":169},{\"atom_id\":\"let-the-tool-own-the-grammar\",\"file_sha256\":\"8355f1c4289cbbae8dca393a6a563333513e394b7d0a4a326e3253accf230a67\",\"content_sha256\":\"a0438f5fa5b59c1e4b3822b66b75888a0c2e3d271ddfb8f61bf90f22cfce31c4\",\"file_bytes\":1250,\"body_bytes\":134},{\"atom_id\":\"merge-in-dispatch-order-not-completion-order\",\"file_sha256\":\"da0a91bfca7c33601bef4888db77a29586553754eb2546f85eff5f36a0673929\",\"content_sha256\":\"7fece2f054068df55227f9e18d1d8f4bac1f67596746b911e0618f22db372719\",\"file_bytes\":1155,\"body_bytes\":132}]"
carrier_sha256: 21329f445b741e9cd0da893739996df8597f91ddd0627d068eb2b1d1d5de5bdc
carrier_bytes: 7044
revision: 1
status: active
---
<!-- vpmodule:atom:begin cap-the-fan-out-by-the-host-capacity -->
---
instruction_id: cap-the-fan-out-by-the-host-capacity
title: Cap the fan-out by the host capacity
summary: "The number of things that run at once is bounded by what the host can carry, and a wave that mutates is serialised when there is no isolation."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - resource-bounds
conditions_applies_when: A batch is about to run more than one worker at a time.
conditions_does_not_apply_when: The work runs one item at a time anyway.
artifact_contract_output_type: concurrency-cap
artifact_contract_required_data:
  - the requested number
  - the capacity that bounds it
  - the effective number that was used
artifact_contract_verified_by: the effective concurrency never exceeded the capacity of the host
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Cap the fan-out by the host capacity
forces a mutating wave's concurrency to 1; a research-only wave is unaffected
is capped by it
<!-- vpmodule:atom:end cap-the-fan-out-by-the-host-capacity -->
<!-- vpmodule:atom:begin complete-only-what-is-verified-complete -->
---
instruction_id: complete-only-what-is-verified-complete
title: Complete only what is verified complete
summary: Only the item that merged and passed is marked done; every other item keeps the status its own step gave it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A batch item is about to be marked complete.
conditions_does_not_apply_when: The item already carries its final status.
artifact_contract_output_type: completion-record
artifact_contract_required_data:
  - the item that was completed
  - the items that were left in their routed state
artifact_contract_verified_by: only the verified item carries the completion and the others kept their status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/completion.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Complete only what is verified complete
and the item's complete status; both happen inside ONE lock transaction, exactly once per item
are left exactly as their respective routing step set them.
worktree preserved where applicable.
never completes the item
fails it without rollback or retry
<!-- vpmodule:atom:end complete-only-what-is-verified-complete -->
<!-- vpmodule:atom:begin keep-the-shared-writes-with-one-owner -->
---
instruction_id: keep-the-shared-writes-with-one-owner
title: Keep the shared writes with one owner
summary: One coordinator owns every shared write; the workers return results and never write the shared state themselves.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - program-orchestration
conditions_applies_when: Several workers run in a batch that has shared state.
conditions_does_not_apply_when: A single worker owns the whole batch.
artifact_contract_output_type: batch-ownership
artifact_contract_required_data:
  - the owner of the shared writes
  - the workers that only return results
artifact_contract_verified_by: every shared write has one owner and no worker wrote the shared state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the shared writes with one owner
owns every shared write
and never delegates them to a leaf.
return structured results only
themselves (single-writer invariant).
<!-- vpmodule:atom:end keep-the-shared-writes-with-one-owner -->
<!-- vpmodule:atom:begin let-the-tool-own-the-grammar -->
---
instruction_id: let-the-tool-own-the-grammar
title: Let the tool own the grammar
summary: The argument grammar belongs to the tool that implements it; the caller validates against it instead of re-implementing the parsing.
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - single-source-of-truth
  - untrusted-content-handling
conditions_applies_when: A command takes a block of arguments that the tool itself parses.
conditions_does_not_apply_when: The caller wrote the parser and owns it.
artifact_contract_output_type: validated-arguments
artifact_contract_required_data:
  - the raw argument block
  - the parsed result the tool returned
artifact_contract_verified_by: the arguments were parsed by the tool and the caller did not re-implement the grammar
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Let the tool own the grammar
Validate the command's `<arguments>` block through the CLI's own grammar — never re-derive it inline
<!-- vpmodule:atom:end let-the-tool-own-the-grammar -->
<!-- vpmodule:atom:begin merge-in-dispatch-order-not-completion-order -->
---
instruction_id: merge-in-dispatch-order-not-completion-order
title: "Merge in dispatch order, not completion order"
summary: "The merges of a wave are applied in the order the work was sent out, so the result does not depend on who finished first."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Several finished pieces of work are merged together.
conditions_does_not_apply_when: One piece of work is merged.
artifact_contract_output_type: merge-order
artifact_contract_required_data:
  - the dispatch order
  - the merge order
artifact_contract_verified_by: the merges followed the dispatch order and not the completion order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Merge in dispatch order, not completion order
Merges apply strictly in the wave's original dispatch order
never completion order.
<!-- vpmodule:atom:end merge-in-dispatch-order-not-completion-order -->