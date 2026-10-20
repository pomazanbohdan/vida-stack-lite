---
instruction_id: classify-the-change-scope-and-route-the-handoff
title: Classify the change scope and route the handoff
summary: "Grade the change by how far it reaches, list the items that move, name who executes it and state what done looks like."
capability_tags:
  - assess-change-impact
pattern_tags:
  - scope-routing
conditions_applies_when: An approved change is about to be handed to whoever will carry it out.
conditions_does_not_apply_when: Nobody else carries the change out; the current session finishes it.
artifact_contract_output_type: handoff
artifact_contract_required_data:
  - the scope grade
  - "the items added, removed, resequenced or rescoped"
  - the recipients
  - the responsibilities
  - the success criteria
artifact_contract_verified_by: the scope grade decides the recipients and the success criteria are written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
status: active
revision: 1
---

# Classify the change scope and route the handoff
Determine change scope classification:
Critical: Needs fundamental replan with PM/Architect involvement
Important: Requires backlog reorganization and PO/DEV coordination
Minor: Can be implemented directly by Developer agent
List the epic and story changes (added, removed, resequenced, or rescoped) for the user to apply
Specify handoff recipients and their responsibilities
Define success criteria for implementation
