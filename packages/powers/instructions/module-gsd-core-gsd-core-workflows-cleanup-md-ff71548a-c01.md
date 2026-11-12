---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-cleanup-md-ff71548a-c01"
title: "gsd-core: gsd-core/workflows/cleanup.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/cleanup.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/cleanup.md\"}"
atom_ids:
  - bucket-the-items-that-carry-no-provenance
  - the-executed-list-is-the-confirmed-list
atom_count: 2
atoms: "[{\"atom_id\":\"bucket-the-items-that-carry-no-provenance\",\"file_sha256\":\"008a0e617215e6c9e91153d0dbaacb5294e6c55582b547c1c8ce4f2c97eb445b\",\"content_sha256\":\"6b401f22bb629e395e40c246e12998c10a5fa2579f1ce6c0c2e775825215ae11\",\"file_bytes\":1313,\"body_bytes\":195},{\"atom_id\":\"the-executed-list-is-the-confirmed-list\",\"file_sha256\":\"88775ab004c280c3ed38eafa8246c6695a67a2fe2e9287ec2e7222c20d60e9fb\",\"content_sha256\":\"00b82e554cd6e8214fe7c9e09e6e050c8b82b7cb0cbf34a1132b8e8a0eb7ae7d\",\"file_bytes\":1278,\"body_bytes\":199}]"
carrier_sha256: c83922ec0136a3a1daee28a398f18c033d2032a628d8a23ac6e7019a50d37f1b
carrier_bytes: 2866
revision: 1
status: active
---
<!-- vpmodule:atom:begin bucket-the-items-that-carry-no-provenance -->
---
instruction_id: bucket-the-items-that-carry-no-provenance
title: Bucket the items that carry no provenance
summary: "Items that carry no record of which group they belong to are all put into one named group, and that is stated as a bucket rather than presented as a split."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Items have to be filed and nothing on disk says which group they belong to.
conditions_does_not_apply_when: Each item can be traced to its group.
artifact_contract_output_type: bucketed-group
artifact_contract_required_data:
  - the single target group
  - the statement that it is a bucket-all
artifact_contract_verified_by: all untraceable items went into one named group and the bucket-all was stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/cleanup.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bucket the items that carry no provenance
Quick tasks carry no on-disk record of which milestone they belong to, so this is a bucket-all, not a per-milestone split
Bucket them into one target.
<!-- vpmodule:atom:end bucket-the-items-that-carry-no-provenance -->
<!-- vpmodule:atom:begin the-executed-list-is-the-confirmed-list -->
---
instruction_id: the-executed-list-is-the-confirmed-list
title: The executed list is the confirmed list
summary: "The set that is executed is the same set that was shown and confirmed, produced by the same filter, so nothing runs that was not agreed."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A preview was shown and confirmed and then the same set is executed.
conditions_does_not_apply_when: Nothing was previewed or confirmed.
artifact_contract_output_type: confirmed-execution-list
artifact_contract_required_data:
  - the confirmed list
  - the executed list
  - the shared filter
artifact_contract_verified_by: "the executed list is the confirmed list, item for item"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/cleanup.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# The executed list is the confirmed list
Use the same filter as the dry-run so the execution list matches exactly what the user confirmed:
The execution list matches exactly what the user confirmed
<!-- vpmodule:atom:end the-executed-list-is-the-confirmed-list -->