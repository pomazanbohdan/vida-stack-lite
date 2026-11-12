---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-create-business-skill-md-6b5307d0-c03"
title: "wondelai-skills: skills/create-business/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/create-business/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/create-business/SKILL.md\"}"
atom_ids:
  - create-business-strategy
  - create-business-validate-job
atom_count: 2
atoms: "[{\"atom_id\":\"create-business-strategy\",\"file_sha256\":\"726de215ec4593353de8837586c1d31eb399c276fe41a8da0622feec5ac7c442\",\"content_sha256\":\"16f9ff44b27ddcffbd1247006ce1802aae48836795adeb51d52ee1bd6f7df126\",\"file_bytes\":2054,\"body_bytes\":901},{\"atom_id\":\"create-business-validate-job\",\"file_sha256\":\"ff018d1e6872a8ef10cf13ad0f99fc2e68d745774662263cf4472a7fd2d4aff9\",\"content_sha256\":\"6d26578e6791234e0f7b36426e92906e013bddb6c41a0fef0ca77601daca669a\",\"file_bytes\":2534,\"body_bytes\":1231}]"
carrier_sha256: d5589eacecf4955e150d0fd9e3c7d4a9f5cd164cbf041960dbd7bc310c5ada6c
carrier_bytes: 4807
revision: 1
status: active
---
<!-- vpmodule:atom:begin create-business-strategy -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-strategy
title: Build a strategy kernel
summary: "Replace goals with a diagnosis of the single critical challenge, a guiding policy with losers, coherent actions with owners and dates, and an explicit no-list; audit for the four bad-strategy hallmarks."
capability_tags:
  - build-validated-business
pattern_tags:
  - strategy-kernel
conditions_applies_when: Turning validated demand into strategy.
conditions_does_not_apply_when: Strategy on unvalidated demand.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The kernel names one challenge, a policy with losers, owned actions and a no-list."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L116-L129"
status: active
revision: 1
---

# Build a strategy kernel

Replace a goals list with a strategy kernel: diagnosis of the single critical challenge, a guiding policy that is a real choice with losers rather than a rival-copyable platitude, and coherent actions with owners and dates. Detect fluff, evasion of the challenge, goals presented as strategy, and dog's-dinner objective lists; concentrate force on one pivot point. Invoke good-strategy-bad-strategy using validated demand evidence and any one-page plan; run the four-hallmarks audit, produce a one-paragraph diagnosis, a policy that rules out whole classes of action, three coherent actions with owners, and an explicit no-list. Ask the user for the challenge and what the policy refuses; recommend one pivot point. Create STRATEGY.md with Diagnosis, Guiding Policy, Coherent Actions, and No-List; update tracker. Done when all are present, with owners on coherent actions.
<!-- vpmodule:atom:end create-business-strategy -->
<!-- vpmodule:atom:begin create-business-validate-job -->
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
<!-- vpmodule:atom:end create-business-validate-job -->