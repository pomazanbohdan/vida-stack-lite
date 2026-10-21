---
instruction_id: check-redundancy-and-prior-rejections
title: Check redundancy and prior rejections
summary: "Before triaging a request, search for an existing implementation by concept and read any prior rejection that resembles it."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A new issue or request arrives.
conditions_does_not_apply_when: The request is already known to be new.
artifact_contract_output_type: redundancy-check
artifact_contract_required_data:
  - where searched
  - existing implementation
  - prior rejections
artifact_contract_verified_by: "the search was run by concept, not only by wording"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/triage/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-todo.md
status: active
revision: 2
---

# Check redundancy and prior rejections
Run two checks against the codebase: (a) **redundancy**: search for an existing implementation of the requested behavior by domain concept (not just the request's wording), and report where you looked. If found, it's an already-implemented `wontfix`. (b) **prior rejection**: read the out-of-scope knowledge base and surface any record that resembles this request.
Before a new item is recorded, the existing items are searched for the same subject; if one overlaps, the choice to skip, replace or add anyway is put to the user.
