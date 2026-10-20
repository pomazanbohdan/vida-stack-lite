---
instruction_id: avoid-verbs-in-resource-urls
title: Avoid verbs in resource URLs
summary: Name the resource in the URL and let the method carry the action.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You design the URL of a resource.
conditions_does_not_apply_when: The interface is not URL-shaped.
artifact_contract_output_type: url-contract
artifact_contract_required_data:
  - the resource name
  - the method
artifact_contract_verified_by: no URL carries a verb
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Avoid verbs in resource URLs
REST endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks`

Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)

Naming follows consistent conventions across all endpoints
