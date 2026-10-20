---
instruction_id: cut-the-work-into-epics-by-capability-and-owner
title: Cut the work into containers by capability and owner
summary: "Each container is one capability from the source, or a tightly coupled pair, delivered to production by one owner; a boundary that names two outcomes or two owners is two containers."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A body of work has to be cut into containers.
conditions_does_not_apply_when: The containers already exist and only the items under them change.
artifact_contract_output_type: container-set
artifact_contract_required_data:
  - the capability each container delivers
  - its owner
  - its boundary
artifact_contract_verified_by: each container names one capability and one owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 1
---

# Cut the work into containers by capability and owner
An epic is one capability from the source, or a tightly coupled pair, delivered to production by one owner: a dev or pair with agent lanes.
Propose epics along the source's capabilities. Merge two when one owner and one module deliver both.
A unit (module, service, or bounded context) is an epic boundary when it is also the ownership or deployment boundary and its Done when still reads as something a product owner can check. A module that is only a code folder is not.
An epic whose boundary names more than one outcome or owner is two epics.
