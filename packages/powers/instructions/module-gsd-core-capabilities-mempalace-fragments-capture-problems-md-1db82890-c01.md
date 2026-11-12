---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-capabilities-mempalace-fragments-capture-problems-md-1db82890-c01"
title: "gsd-core: capabilities/mempalace/fragments/capture-problems.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:capabilities/mempalace/fragments/capture-problems.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"capabilities/mempalace/fragments/capture-problems.md\"}"
atom_ids:
  - check-for-a-duplicate-before-you-file-a-durable-record
  - keep-writing-the-local-record-when-the-external-store-becomes-authoritative
atom_count: 2
atoms: "[{\"atom_id\":\"check-for-a-duplicate-before-you-file-a-durable-record\",\"file_sha256\":\"71f1a550922a0afca1faff7d60acb806e4b4f755e491268663319108b9316b64\",\"content_sha256\":\"e740c304e74d9dac25905a1d02b8d680f4689071ebe1e888a13a57af88f5ce85\",\"file_bytes\":1597,\"body_bytes\":428},{\"atom_id\":\"keep-writing-the-local-record-when-the-external-store-becomes-authoritative\",\"file_sha256\":\"933805d4ebc3387cdadb8d48f1846fec409bbddb6dcdba6ece2de92912cafc47\",\"content_sha256\":\"f0bd1e7119b96c209a194ceeefbe63270e4f29567e2dc79334acf96a949414d1\",\"file_bytes\":1903,\"body_bytes\":535}]"
carrier_sha256: 7142d5282cb355f30caa5ce784eb0e6c838e7c3f95951394fa375fe5f2fcda92
carrier_bytes: 3873
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-for-a-duplicate-before-you-file-a-durable-record -->
---
instruction_id: check-for-a-duplicate-before-you-file-a-durable-record
title: Check for a duplicate before you file a durable record
summary: "A record that is written into a store is checked against what the store already holds, so a re-run files the same content instead of a second copy."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A record is about to be written into a store that outlives the run.
conditions_does_not_apply_when: The store is empty and the record is written once.
artifact_contract_output_type: durable-record
artifact_contract_required_data:
  - the duplicate check
  - the record to file
  - the provenance that travels with it
artifact_contract_verified_by: the record was filed once and a re-run produces no second copy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/mempalace/fragments/capture-problems.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check for a duplicate before you file a durable record
- **Dedupe first.** Call `mempalace_check_duplicate` (interactive) before filing so re-runs don't create duplicate drawers.
- Captures are idempotent: deterministic drawer IDs + `check_duplicate` mean re-running the wave re-files the same content without duplication. On any error, skip and let the wave complete normally.
- Include provenance (`source_file`, phase id).
<!-- vpmodule:atom:end check-for-a-duplicate-before-you-file-a-durable-record -->
<!-- vpmodule:atom:begin keep-writing-the-local-record-when-the-external-store-becomes-authoritative -->
---
instruction_id: keep-writing-the-local-record-when-the-external-store-becomes-authoritative
title: Keep writing the local record when the external store becomes authoritative
summary: "When an external store becomes the authority for a fact, the local record is still written, so an unreachable store never loses the fact."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - graceful-degradation
conditions_applies_when: "A fact's authority has moved to an external store."
conditions_does_not_apply_when: The fact was never held in an external store.
artifact_contract_output_type: fact-ownership
artifact_contract_required_data:
  - the authoritative store
  - the local record that is still written
  - what happens when the store is unreachable
artifact_contract_verified_by: the local record exists even when the external store cannot be reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/mempalace/fragments/capture-problems.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/long-running-operations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep writing the local record when the external store becomes authoritative
- Under `augment` the fact is an *additive* mirror alongside `.planning/graphs/`. Under `kg_backend`/`replace` the palace is the *authoritative* store for the fact; GSD still writes `.planning/graphs/` through its normal graphify, so an unreachable palace never loses it.
- The core loop depends only on the named fields and ignores any others; producers MUST write the named fields and MAY add their own. The `version` field is the evolution escape hatch.
<!-- vpmodule:atom:end keep-writing-the-local-record-when-the-external-store-becomes-authoritative -->