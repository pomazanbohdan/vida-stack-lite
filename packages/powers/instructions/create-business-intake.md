---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-intake
title: Run intake before creating the tracker
summary: "Ask the unanswered intake questions about idea, customer, access, evidence, business model, runway and existing product; apply the stated skip and defer rules; then create and confirm the tracker."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
conditions_applies_when: First run with no business-creation tracker.
conditions_does_not_apply_when: A resumed journey that already has a tracker.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every intake question is answered, the skip/defer rules are applied and the tracker is confirmed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L44-L57"
status: active
revision: 1
---

# Run intake before creating the tracker

Before creating the tracker, ask any unanswered Intake questions: the raw idea; intended customer and current solution; customer access; existing evidence such as interviews, waitlist, sales, or prototype; B2B/B2C and, for B2B, sales-led/self-serve plus marketplace/network status; runway and deadline; and whether a product is already built. Use the answers to shape job reconstruction, competing alternatives, phases 2–4 access, discovery fast-tracking, optional skill routing, phase depth, and whether grow-business or improve-business is the better route. Skip Phase 1 only if CUSTOMER.md already contains a validated job statement with all three dimensions. Skip Phase 3 only if a working prototype has already been tested with at least five target users. Defer Phase 6 for a clearly differentiated niche until the kernel is set. Defer Phases 5–10 until Phase 2 returns real commitments; do not do strategy on unvalidated demand. Then create CREATE-BUSINESS-PLAN.md from the template, status every phase, and confirm the plan; completion requires the file, all phase statuses, and user confirmation.
