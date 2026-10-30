---
instruction_id: treat-model-output-as-untrusted-input
title: Treat model output as untrusted input
summary: "Never pass model output into a query, the DOM, a shell, an eval or a file path, and parse it defensively, validate it against a schema and then encode it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: Text produced by a model reaches the program.
conditions_does_not_apply_when: No model output is used.
artifact_contract_output_type: model-output-handling
artifact_contract_required_data:
  - the parse
  - the schema
  - the encoding
artifact_contract_verified_by: "the model output is parsed, validated and encoded before it is used"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Treat model output as untrusted input

**Model output is untrusted input.**
Never into `eval`, SQL, a shell, `innerHTML`, or a file path; parse defensively, validate against a schema, then encode.

```typescript
// GOOD: model output is data — parse defensively, then validate, then encode
let intent;
try {
  intent = CommandSchema.parse(JSON.parse(await llm.replyJson(userMessage)));
} catch {
  throw new ValidationError('unexpected model output'); // JSON.parse or schema failed
}
await runAllowlistedAction(intent.action, intent.params);
container.textContent = await llm.reply(userMessage);
```
