---
instruction_id: a-dismissed-item-never-resurfaces
title: A dismissed item never resurfaces
summary: An item that was promoted or dismissed is skipped by name on the next scan; an item that was deferred comes back only after the phase it was deferred to has completed.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A recurring-item scan runs again over the same material.
conditions_does_not_apply_when: The scan runs for the first time over this material.
artifact_contract_output_type: promotion-candidate-list
artifact_contract_required_data:
  - the items skipped
  - the reason each was skipped
  - the candidates that remain
artifact_contract_verified_by: no promoted or dismissed item was offered again and a deferred item waited for its condition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/graduation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# A dismissed item never resurfaces
Skip items that already contain `**Graduated:**` — they have been promoted and must not re-surface
Skip any cluster whose `cluster_id` matches a `dismissed` entry.
Skip any cluster whose `cluster_id` matches a `deferred` entry where `deferred_until` phase has not yet completed.
