---
instruction_id: put-the-platform-baseline-in-the-opening-epic
title: Put the platform baseline in the opening container
summary: "The scaffold, the environments, the pipeline, the deployment and the operations are the opening container, and every container delivers to production."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A set of containers is being cut for work that needs scaffolding to run.
conditions_does_not_apply_when: The platform baseline already exists and needs no container.
artifact_contract_output_type: baseline-placement
artifact_contract_required_data:
  - where the baseline sits
  - the production delivery each container owes
artifact_contract_verified_by: the baseline is the opening container and every container delivers to production
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 1
---

# Put the platform baseline in the opening container
The platform baseline (scaffold, environments, CI, deployment, operations) is the opening epic, the first `[[epic]]` in the initiative's breakdown, or the first stories of the first epic.
Every epic delivers to production; its Done when includes the integrated verification for what it delivers.
