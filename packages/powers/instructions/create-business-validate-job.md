---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-validate-job
title: Validate the job with real conversations
summary: "Treat mom-test as a gate: interview about past behavior, let the customer speak 80%, count only commitments of time, reputation or money, prepare a 10-12 question guide, pause for real evidence and record 5+ rows with a proceed, revise or stop verdict."
capability_tags:
  - build-validated-business
pattern_tags:
  - customer-interview-evidence
  - phase-gate
conditions_applies_when: Validating a job statement with customers.
conditions_does_not_apply_when: A job validated by documents without customer contact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The evidence rows, verdict and proceed/revise/stop choice are recorded; Phases 5-10 stay locked until proceed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L74-L87"
status: active
revision: 1
---

# Validate the job with real conversations

Treat mom-test as a GATE: use real conversations to establish that the Phase 1 job is real, painful, and worth paying to solve; keep Phases 5–10 locked until a proceed verdict. Talk about the customer's life, ask about specific past events rather than hypotheticals, and let the customer speak 80%; compliments are not data, only commitments of time, reputation, or money count, and questions should be capable of disproving the imagined business. Invoke mom-test with the CUSTOMER.md job and alternatives; prepare a 10–12 question guide following these rules, later score transcripts for leading questions and zombie leads, give the guide to the user, then pause awaiting-evidence. Record the approved guide in CUSTOMER.md under Interview Evidence / Interview Guide. On return, ask whether to proceed with 3+ concrete commitments, revise the job and loop to Phase 1, or stop when no pain is found. Extend CUSTOMER.md with dated Interview Evidence rows (date, who, facts, commitment) and a Validation Verdict with decision and reasoning; update the tracker. Done when there are 5+ evidence rows, a verdict, and the user chose proceed/revise/stop; only proceed unlocks Phases 5–10.
