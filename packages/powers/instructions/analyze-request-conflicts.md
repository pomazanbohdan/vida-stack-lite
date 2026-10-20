---
instruction_id: analyze-request-conflicts
title: "Find conflicts between the owner's instructions"
summary: "Extract every instruction the owner gave and report pairs that cannot both hold, plus how the assistant resolved them."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The complaint concerns contradictory instructions or a scope change.
conditions_does_not_apply_when: The instructions contain no contradictions.
artifact_contract_output_type: request-conflict-report
artifact_contract_required_data:
  - instructions
  - conflict
  - resolution
  - evidence
artifact_contract_verified_by: each conflict cited with both sources
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/request-conflicts.md
status: active
revision: 1
---

# Find conflicts between the owner's instructions
List every human prompt with line and turn.
For each, extract the instructions it contains: imperatives, constraints, scope statements.
That includes "don't", "always", "never", and "only".
Report two human instructions that cannot both be followed.
Quote both with lines.
Then report what the assistant did.
Report a human instruction that conflicts with an instruction file loaded in the session, quoting both.
Instruction files include the harness's own instruction files; their paths are in the case file.
Report a human instruction to skip, ignore, or override a step, skill, or rule, and what happened afterwards.
Report an instruction the assistant asked to clarify and the answer.
Report it when the answer changed scope.
Do not judge whether your human partner was right.
Report the conflict and the assistant's resolution.
Do not invent a conflict from different wordings.
