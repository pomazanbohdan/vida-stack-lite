---
instruction_id: append-deferred-items-to-one-list-and-re-parse-it
title: Append deferred items to one list and re-parse it
summary: "Deferred items go into one list that is never duplicated, and the whole record is parsed again afterwards to prove the list survived the write."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A finding is deferred instead of fixed.
conditions_does_not_apply_when: No finding is deferred.
artifact_contract_output_type: deferred-list
artifact_contract_required_data:
  - the deferred items
  - the summary
  - the evidence
  - the optional location
  - the optional severity
artifact_contract_verified_by: the record parses and holds one list with every prior item and the new ones
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 1
---

# Append deferred items to one list and re-parse it
Preserve every existing item, do not look for duplicates, and never add a second `deferred:` key.
If the field is absent (including on plans created before this field existed), add it once as an empty list.
If it is `deferred: []`, replace that empty value when adding the first item; otherwise append to the existing list.
Serialize free-form values as YAML block scalars so characters such as `:`, `#`, quotes, and line breaks remain data.
After all appends, parse the complete frontmatter as YAML and verify that `deferred` is one list containing every prior item plus the new items with their intended text.
Repair serialization errors before continuing.
