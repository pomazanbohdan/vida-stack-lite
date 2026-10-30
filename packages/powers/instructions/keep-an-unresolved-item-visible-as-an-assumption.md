---
instruction_id: keep-an-unresolved-item-visible-as-an-assumption
title: Keep an unresolved item visible as an assumption
summary: Deferring a constraint claims nothing about its safety; it stays visible as an explicit assumption for the next stage.
capability_tags:
  - triage-reports
pattern_tags:
  - dimension-sweep
conditions_applies_when: A finding cannot be decided yet.
conditions_does_not_apply_when: The finding can be decided now.
artifact_contract_output_type: unresolved-item-record
artifact_contract_required_data:
  - the item
  - the assumption it is marked as
artifact_contract_verified_by: the unresolved item stays visible in the document and is marked as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep an unresolved item visible as an assumption
Unlike a dismissal, deferring makes no claim that the prohibition is safe — it is an explicit, visible assumption the planner must surface, not silently drop.
Write the spec anyway — the spec is written with those rows marked `⚠ Prohibition unresolved — planner must treat as assumption`. Use this deliberately; you are choosing to ship a known gap.
The gate is *soft*: it never blocks you, but every unresolved prohibition stays visible in the spec's `## Prohibitions` section.
