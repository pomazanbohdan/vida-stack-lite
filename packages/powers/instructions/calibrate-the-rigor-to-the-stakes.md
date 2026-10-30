---
instruction_id: calibrate-the-rigor-to-the-stakes
title: Calibrate the rigor to the stakes
summary: "Ask one short stakes question and let it set the document’s depth, its length and how many open items it may carry."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A document is being scoped and the stakes are not yet known.
conditions_does_not_apply_when: The stakes are already fixed by an agreement.
artifact_contract_output_type: stakes-calibration
artifact_contract_required_data:
  - the stakes level
  - the depth and the length it sets
  - the open-item density it tolerates
artifact_contract_verified_by: the length and the rigour of the document follow the stated stakes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-validation-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
---

# Calibrate the rigor to the stakes
Stakes calibration. One short probe before working mode: hobby / internal / launch — enough to calibrate rigor and section depth.
Audience, Existing inputs, and Downstream depth fill in inside the chosen mode, not upstream of the choice.
Length scales with stakes. Hobby / solo PRDs aim for about two pages. Internal tools land around five to eight. Launch and chain-top PRDs run as long as their FRs and concerns require.
Right-size to purpose. A passion project does not need investor-grade rigor. A VC pitch input does. Read the room.
Get a read on stakes early (passion project, internal pitch, investor input, public launch), and let that calibrate how hard you push.
Most PRDs do not need every dimension scrutinized equally. Calibrate to the agreed stakes, the PRD's shape (consumer product, internal tool, regulatory update, technical capability spec), and what the PRD itself is trying to do.
Stakes-calibrated — hobby/solo may run quietly or skip; higher stakes get the explicit all/subset/skip menu.
Open-items density: count Open Questions + `[ASSUMPTION]` + `[NOTE FOR PM]` callouts relative to stakes. High counts on a low-stakes PRD is fine; high counts on a green-light-to-build PRD is a blocker.
