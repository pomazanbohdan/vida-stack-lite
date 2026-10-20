---
instruction_id: never-reuse-a-retired-name-and-carry-the-local-files-with-it
title: Never reuse a retired name and carry the local files with it
summary: "A name the package no longer ships is retired for good and is never given to anything else; when a member is renamed, the local files that belong to the old name move to the new one."
capability_tags:
  - design-structure
pattern_tags:
  - stable-identity
conditions_applies_when: A member of a package is renamed or removed in an update.
conditions_does_not_apply_when: The update adds a member and retires nothing.
artifact_contract_output_type: retirement-record
artifact_contract_required_data:
  - the retired names
  - the rename pairs
  - the local files that follow the rename
artifact_contract_verified_by: no retired name is used again and the local files sit under the new name
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/modules.md
status: active
revision: 1
---

# Never reuse a retired name and carry the local files with it
Skills the module no longer ships:
renamed as `{ from, to }` pairs and `removed` as names.
After an update,
files to the new name.
A retired name is never reused.
