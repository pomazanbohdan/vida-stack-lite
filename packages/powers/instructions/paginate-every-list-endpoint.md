---
instruction_id: paginate-every-list-endpoint
title: Paginate every list endpoint
summary: "A list endpoint needs pagination from the start, not when the collection grows."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: An endpoint returns a collection that can grow.
conditions_does_not_apply_when: The collection is fixed and small by construction.
artifact_contract_output_type: pagination-contract
artifact_contract_required_data:
  - the page size
  - the cursor or page parameter
artifact_contract_verified_by: the endpoint returns a page and a way to ask for the next one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Paginate every list endpoint
Paginate list endpoints:

"We don't need pagination for now" → You will the moment someone has 100+ items. Add it from the start.
every list endpoint paginates with a limit and a stable order
