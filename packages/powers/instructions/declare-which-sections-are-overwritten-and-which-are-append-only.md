---
instruction_id: declare-which-sections-are-overwritten-and-which-are-append-only
title: Declare which sections are overwritten and which are append-only
summary: "Each section of the session file declares whether it is overwritten, appended to or frozen, so a resumed run knows what it may rewrite."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: A long-running session is written to a file that a later run will read.
conditions_does_not_apply_when: The file is written once and never read again.
artifact_contract_output_type: session-file-sections
artifact_contract_required_data:
  - each section
  - the rule that governs it
artifact_contract_verified_by: "each section states whether it is overwritten, appended to or frozen"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/DEBUG.md
status: active
revision: 1
---

# Declare which sections are overwritten and which are append-only
**Current Focus:** - OVERWRITE entirely on each update - Always reflects what Claude is doing RIGHT NOW
**Symptoms:** - Written during initial gathering phase - IMMUTABLE after gathering complete
**Eliminated:** - APPEND only - never remove entries - Prevents re-investigating dead ends after context reset
**Evidence:** - APPEND only - never remove entries - Facts discovered during investigation
**Resolution:** - OVERWRITE as understanding evolves
