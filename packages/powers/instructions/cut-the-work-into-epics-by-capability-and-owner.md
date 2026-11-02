---
instruction_id: cut-the-work-into-epics-by-capability-and-owner
title: Cut the work into epics by capability and deployment boundary
summary: "Each epic is one capability from the source, or a tightly coupled pair, delivered and deployed together; a boundary that names two outcomes or two deployments is two epics."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A body of work has to be cut into containers.
conditions_does_not_apply_when: The containers already exist and only the items under them change.
artifact_contract_output_type: container-set
artifact_contract_required_data:
  - the capability each container delivers
  - its deployment boundary
  - its boundary
artifact_contract_verified_by: each container names one capability and one deployment boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Cut the work into containers by capability and deployment boundary
An epic is one capability from the source, or a tightly coupled pair, delivered and deployed together.
Propose epics along the source's capabilities. Merge two when one deployment delivers both.
A unit (module, service, or bounded context) is an epic boundary only when it is also a deployment boundary and its Done when still reads as something a product owner can check. A module that is only a code folder is not.
Two epics need at most a contract between them.
An epic whose boundary names more than one outcome or deployment is two epics.
