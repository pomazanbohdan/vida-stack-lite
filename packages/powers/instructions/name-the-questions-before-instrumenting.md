---
instruction_id: name-the-questions-before-instrumenting
title: Name the questions before you instrument
summary: "Write down the questions an on-call engineer will ask about the feature, and let every signal answer one of them."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: "A feature, service, endpoint, job or integration is about to be built or changed and it will run in production."
conditions_does_not_apply_when: The work is a local script or a one-off analysis that no on-call engineer will ever look at.
artifact_contract_output_type: on-call-question-set
artifact_contract_required_data:
  - the feature
  - the two to four questions
  - the signal that answers each question
artifact_contract_verified_by: every planned signal maps to one of the written questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Name the questions before you instrument

Code you can't observe is code you can't operate.
Observability is the ability to answer "what is the system doing and why?" from the outside, using the telemetry the code emits.
Instrumentation is not a post-launch add-on — it's written alongside the feature, the same way tests are.
If a feature ships without telemetry, the first user-reported bug becomes archaeology instead of a query.
Telemetry without a question is noise.
Before adding any instrumentation, write down 2–4 questions an on-call engineer will ask about this feature:

```
FEATURE: checkout payment retry
QUESTIONS ON-CALL WILL ASK:
1. What fraction of payments succeed on first attempt vs after retry?
2. When a payment fails permanently, why? (provider error? timeout? validation?)
3. Is the payment provider slower than usual?
→ Every signal below must help answer one of these.
```

If you can't name the questions, you're not ready to instrument — you'll log everything and learn nothing.
