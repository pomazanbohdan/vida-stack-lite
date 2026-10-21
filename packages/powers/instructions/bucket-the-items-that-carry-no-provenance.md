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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/cleanup.md
status: active
revision: 1
---

# Bucket the items that carry no provenance
Quick tasks carry no on-disk record of which milestone they belong to, so this is a bucket-all, not a per-milestone split
Bucket them into one target.
