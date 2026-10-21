---
instruction_id: curate-each-item-and-decide-it-individually
title: Curate each item and decide it individually
summary: "Every candidate is presented on its own with the facts that matter, and the decision to include, exclude or partly include it is taken one item at a time."
capability_tags:
  - triage-reports
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A set of finished candidates has to be curated into a package.
conditions_does_not_apply_when: The whole set is accepted or rejected as one decision.
artifact_contract_output_type: curation-decisions
artifact_contract_required_data:
  - the item
  - its winner and tags
  - the decision
  - what was partly taken
artifact_contract_verified_by: every item has its own recorded decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch-wrap-up.md
status: active
revision: 1
---

# Curate each item and decide it individually
Present each unprocessed sketch in ascending order. For each sketch, show:
**Sketch number and name**
**Design question:** from frontmatter
**Winner:** which variant was selected (if any)
**Tags:** from frontmatter
**Key decisions:** summarize what was decided visually
**If "Partial":** Ask what specifically to include or exclude from this sketch's decisions.
**→ Include / Exclude / Partial / Let me look at it**
