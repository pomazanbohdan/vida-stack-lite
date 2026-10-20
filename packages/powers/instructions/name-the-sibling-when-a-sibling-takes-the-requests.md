---
instruction_id: name-the-sibling-when-a-sibling-takes-the-requests
title: Name the sibling when a sibling takes the requests
summary: "A near miss is a request that shares the words and the domain but belongs to another skill; when one skill takes a sibling's requests, the description names that sibling and a should-not case that is obviously another skill teaches nothing."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Two skills answer requests that share words and domain.
conditions_does_not_apply_when: No other skill competes for the same requests.
artifact_contract_output_type: skill-description
artifact_contract_required_data:
  - the near miss
  - the sibling that owns it
  - the boundary line
artifact_contract_verified_by: the near-miss request reaches the sibling and not this skill
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-description.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 1
---

# Name the sibling when a sibling takes the requests
Near misses are requests that share words and domain but belong elsewhere: debugging a workflow versus building one, critiquing a brief versus writing one.
When a skill takes a sibling's requests, the description adds `Not for ...` naming that sibling; without a collision it stays at two parts.
the should-not queries matter most when they are near misses
A should-not query that obviously belongs to another skill teaches nothing, because any description already handles it.
