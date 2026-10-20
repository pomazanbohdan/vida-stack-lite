---
instruction_id: offer-to-resume-an-in-progress-run
title: Offer to resume an in-progress run
summary: "Look for a run that is still in progress before starting a fresh one, and offer to resume it."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A new run is about to bind a workspace for a product that may already have one.
conditions_does_not_apply_when: No earlier run exists for this product.
artifact_contract_output_type: resume-decision
artifact_contract_required_data:
  - the in-progress run that was found
  - the offer to resume it
artifact_contract_verified_by: an existing in-progress run was offered rather than silently replaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 1
---

# Offer to resume an in-progress run
Before binding a fresh workspace, scan
for prior in-progress runs
whose status is not final;
if any exist, offer to resume rather than starting over.
Continuity across sessions. If a prior in-progress draft for this project exists, the user is offered to resume.
Set the document's status to final so future invocations distinguish it from in-progress drafts.
The workspace persists; stop and resume freely.
