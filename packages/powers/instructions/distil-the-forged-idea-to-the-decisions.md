---
instruction_id: distil-the-forged-idea-to-the-decisions
title: Distil the forged idea to the decisions
summary: "The forged idea keeps only the decisions, the rejected options and the reasons that matter downstream; if it reads like a document, it is too long."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A hardening session produced something that is handed on.
conditions_does_not_apply_when: The session ended with the idea rejected or with nothing to hand on.
artifact_contract_output_type: forged-idea
artifact_contract_required_data:
  - the locked decisions
  - the rejected options
  - the reasons
artifact_contract_verified_by: the document holds the decisions and the reasons and nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-forge-idea/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body constrains a concise handoff from a hardening session, but the decisions may span domains and the source names no subject domain."
---

# Distil the forged idea to the decisions
Keep it extremely short: only the decisions, rejected options, and reasons that matter downstream, in the user's meaning.
Do not write a prose summary, template, or conversation recap.
If it reads like a document, it is too long.
A `lock` is an idea the user hardens — settled, not to be reopened; locks are what the forged idea is distilled from.
