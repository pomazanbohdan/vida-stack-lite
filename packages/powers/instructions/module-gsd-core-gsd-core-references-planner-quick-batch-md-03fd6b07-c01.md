---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-quick-batch-md-03fd6b07-c01"
title: "gsd-core: gsd-core/references/planner-quick-batch.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-quick-batch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-quick-batch.md\"}"
atom_ids:
  - reference-only-the-identifiers-you-were-given
  - reference-only-the-ids-you-were-given
atom_count: 2
atoms: "[{\"atom_id\":\"reference-only-the-identifiers-you-were-given\",\"file_sha256\":\"95cd548d3d8479bcda71e79a45108e23c18170fa76e8d814213d7d1a6982c2a2\",\"content_sha256\":\"5d521b21ca9eb1a89d626f581c6276e55da72b025627d27202b39c4f5e1123e9\",\"file_bytes\":1759,\"body_bytes\":627},{\"atom_id\":\"reference-only-the-ids-you-were-given\",\"file_sha256\":\"1d4237515c707d63fc07daf855221da30e8cbf6543c449b8ef6ff86172278d6f\",\"content_sha256\":\"131e82ff04cb48c4d90e7fe3049f46b7ddff615643be34f936140dc89a32528b\",\"file_bytes\":1611,\"body_bytes\":545}]"
carrier_sha256: 82a90547b8b65bde4bbb34e3adc31e2ba106ec271c7dc2ee802312c01c9714f9
carrier_bytes: 3649
revision: 1
status: active
---
<!-- vpmodule:atom:begin reference-only-the-identifiers-you-were-given -->
---
instruction_id: reference-only-the-identifiers-you-were-given
title: Reference only the identifiers you were given
summary: A dependency names an identifier from the catalog that was handed over; an empty list is a legitimate answer and an invented identifier breaks the whole layer.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan states which other items it depends on.
conditions_does_not_apply_when: The plan has no dependencies.
artifact_contract_output_type: dependency-list
artifact_contract_required_data:
  - the referenced identifiers
  - the catalog they came from
artifact_contract_verified_by: every referenced identifier exists in the given catalog and no dependency was manufactured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reference only the identifiers you were given
**depends_on - reference SIBLING items by `quick_id`, never invent one**
- Reference ONLY `quick_id`s from the task catalog you were given. Never reference a plan id from a phase, another batch, or a value you invented.
- Empty array (`depends_on: []`) is the correct, common answer when your item is genuinely independent - do not manufacture a dependency to seem thorough.
- A dependency on your OWN `quick_id` (self-reference) or on an id outside the catalog is rejected by the batch update and blocks the whole layer's persistence - when uncertain, prefer `[]` over a guess.
<!-- vpmodule:atom:end reference-only-the-identifiers-you-were-given -->
<!-- vpmodule:atom:begin reference-only-the-ids-you-were-given -->
---
instruction_id: reference-only-the-ids-you-were-given
title: Reference only the ids you were given
summary: A dependency references an id from the catalogue that was handed over; an invented or self-referential id is rejected and blocks the whole batch.
capability_tags:
  - plan-implementation
pattern_tags:
  - stable-identity
conditions_applies_when: An item declares what it depends on.
conditions_does_not_apply_when: The item has no dependencies at all.
artifact_contract_output_type: dependency-list
artifact_contract_required_data:
  - the referenced ids
  - the catalogue they came from
artifact_contract_verified_by: every referenced id exists in the catalogue and none is the item itself
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reference only the ids you were given
Reference ONLY `quick_id`s from the task catalog you were given. Never reference a plan id from a phase, another batch, or a value you invented
Empty array (`depends_on: []`) is the correct, common answer when your item is genuinely independent — do not manufacture a dependency to seem thorough
A dependency on your OWN `quick_id` (self-reference) or on an id outside the catalog is rejected by `quick-batch update` and blocks the whole layer's persistence — when uncertain, prefer `[]` over a guess
<!-- vpmodule:atom:end reference-only-the-ids-you-were-given -->