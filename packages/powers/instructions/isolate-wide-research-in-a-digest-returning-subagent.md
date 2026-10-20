---
instruction_id: isolate-wide-research-in-a-digest-returning-subagent
title: Isolate wide research in a digest-returning subagent
summary: "When a question needs a lot of material read but the answer is small, a subagent does the reading and returns only a digest."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A question needs many files or records read, and the answer is much smaller than the input."
conditions_does_not_apply_when: The material is small enough to read directly.
artifact_contract_output_type: research-digest
artifact_contract_required_data:
  - the question
  - the material read
  - the digest returned
artifact_contract_verified_by: the main context receives the digest and not the raw material
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
status: active
revision: 2
---

# Isolate wide research in a digest-returning subagent
When a task requires reading large amounts of material that shouldn't pollute the main context, spawn a research sub-agent that returns only a digest.
**Use when:**
- The main session needs to stay focused on a downstream task
- The investigation result is much smaller than the input it consumes
- The decision quality benefits from the main agent having room to think after
**Cost:** one isolated sub-agent context. Worth it any time the alternative is loading hundreds of files into the main context.
Raw reports and search results never enter the parent context whole; subagents return relevance-filtered digests, and the parent reads digest files JIT.
