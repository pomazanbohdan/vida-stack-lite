---
instruction_id: carve-the-entry-by-relevance-not-by-size
title: "Carve the entry by relevance, not by size"
summary: "Split a skill by what a run needs: the entry carries what every run needs, a reference carries a branch that loads only when it is reached, and nothing nests deeper than one level."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A skill is written in several files and it has to be decided what goes where.
conditions_does_not_apply_when: The skill is small enough to be one file.
artifact_contract_output_type: agent-skill-layout
artifact_contract_required_data:
  - the entry file
  - the reference list
  - what one run loads
artifact_contract_verified_by: one run loads the entry and only the branch it reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-progressive-disclosure.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-plain-skill.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/project-skills-discovery.md
status: active
revision: 2
---

# Carve the entry by relevance, not by size
A skill is paid for every time it runs.
The entry file, `SKILL.md`, is read on every invocation; a reference is read only when the branch that names it is reached.
So the question is never "how big is the skill" but "how much does one run load".
Carve by relevance, not size.
What only some branches need goes in a reference; what every run needs stays in the entry.
A piece too small to repay the indirection stays inline, and a skill small enough to be one file is one file.
One level deep. The entry names a reference; a reference never names another.
The entry carries a short routing map when there are several.
Name a reference when its branch is reached, never ahead of it: "read `references/<topic>.md` fully and follow it".
Every file a model reads is held to the same standard as the entry: each reference, each capability file, each template a model reads as text.
A skill judged by its entry alone has most of its text unjudged.
Cut what a capable model would do unasked.
Instructions for exotic cases are paid on every run and the case is paid only when it occurs.
A plain skill's entry aims near 800 tokens, an agent's near 1,200.
A complex workflow is the right size at any total when each branch sits in its own file and loads only when reached; the same workflow loaded whole is too big at half the size.

Read the index of each project skill, then load only the specific rule files the current task needs; never load a whole large rules file - it costs significant context.
