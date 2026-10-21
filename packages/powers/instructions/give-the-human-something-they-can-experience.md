---
instruction_id: give-the-human-something-they-can-experience
title: Give the human something they can experience
summary: The default artifact of an experiment is something a person can drive and feel; falling back to printed output is allowed only when the question is about a fact rather than a feeling.
capability_tags:
  - design-experiments
pattern_tags:
  - named-protagonist-journey
conditions_applies_when: An experiment is about to be built and its result has to be experienced by somebody.
conditions_does_not_apply_when: The experiment answers a pure fact that only a measurement can settle.
artifact_contract_output_type: experiential-artifact
artifact_contract_required_data:
  - the artifact
  - what the person can do with it
  - the fallback when it is a fact question
artifact_contract_verified_by: the person can drive the artifact unless the question is genuinely about a fact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 1
---

# Give the human something they can experience
Default to giving the user something they can experience.
The bias should be toward building a simple UI or interactive demo
The user wants to *feel* the spike working, not just be told it works.
**Only fall back to stdout/CLI verification when the spike is genuinely about a fact, not a feeling:**
Pure data transformation where the answer is "yes it parses correctly"
Binary yes/no questions (does this API authenticate? does this library exist?)
Benchmark numbers (how fast is X? how much memory does Y use?)
When in doubt, build the UI. It takes a few extra minutes but produces a spike the user can actually demo and feel confident about.
