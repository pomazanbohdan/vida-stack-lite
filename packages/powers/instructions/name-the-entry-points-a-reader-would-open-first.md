---
instruction_id: name-the-entry-points-a-reader-would-open-first
title: Name the entry points a reader would open first
summary: "The broad-strokes block names the three to five entry points, one clause each, and nothing else."
capability_tags:
  - explain-subsystem
pattern_tags:
  - subsystem-explanation
conditions_applies_when: A writeup about a change has to give its reader the top level of the change.
conditions_does_not_apply_when: The change touches a single file and has no entry points to open.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the three to five entry points
  - one clickable reference and one clause per entry point
artifact_contract_verified_by: the reviewer can open the linked spots in order and understand the mechanism without reading anything else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 1
---

# Name the entry points a reader would open first
What the change generally is, and its top level: the three to five entry points a reader would open first, each with one clickable reference and one clause saying what it is.
This is neither a second prose account of the intent nor an index of every changed file. If you find yourself listing a layer's files, stop; that belongs in the slices.
Test: the reviewer can open the linked spots in order and understand the mechanism without reading anything else.
