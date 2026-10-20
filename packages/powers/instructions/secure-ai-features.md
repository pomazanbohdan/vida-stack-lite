---
instruction_id: secure-ai-features
title: Secure the AI features
summary: "Review AI features for the ways model output, the prompt and agent tools become a way in."
capability_tags:
  - review-code
pattern_tags:
  - threat-modeling
conditions_applies_when: "The code calls a model, feeds a prompt or gives an agent tools."
conditions_does_not_apply_when: No model is called and no agent holds tools.
artifact_contract_output_type: ai-feature-security-review
artifact_contract_required_data:
  - feature
  - risk
  - missing control
artifact_contract_verified_by: each finding names the model output or the tool path it comes from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/security-auditor.md
status: active
revision: 1
---

# Secure the AI features
## AI / LLM Features (if present)
- Is model output treated as untrusted (never into `eval`, SQL, shell, `innerHTML`, file paths)?
- Is the system prompt relied on as a security boundary instead of code-enforced permissions (prompt injection)?
- Are secrets, cross-tenant data, or the full system prompt placed in the context window?
- Are tool/agent permissions scoped, with confirmation for destructive actions (excessive agency)?
- Are token, rate, and recursion limits set (unbounded consumption)?

Map findings to the OWASP Top 10 for LLM Applications where relevant.
