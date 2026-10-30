---
instruction_id: keep-the-planning-at-the-root-that-holds-every-project
title: Keep the planning at the root that holds every project
summary: "When the work spans several repositories, the planning lives at the root that holds them all, outside the individual repositories, because a brief, a plan or a spec usually spans several of them; each piece of work names the projects it touches."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work spans more than one repository.
conditions_does_not_apply_when: The work stays inside one repository.
artifact_contract_output_type: workspace-layout
artifact_contract_required_data:
  - the root that holds the projects
  - where the planning lives
  - the projects a piece of work touches
artifact_contract_verified_by: one session at that root reaches the plan and every project it names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/monorepo-and-polyrepo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the planning at the root that holds every project
The output folder also sits at the workspace root, outside the individual repositories.
All planning goes there, because a brief, a PRD, an architecture, or a spec usually spans several of the projects.
A spec or story names the projects it touches.
