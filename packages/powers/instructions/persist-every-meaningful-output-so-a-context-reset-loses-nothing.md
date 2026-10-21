---
instruction_id: persist-every-meaningful-output-so-a-context-reset-loses-nothing
title: Persist every meaningful output so a context reset loses nothing
summary: "Every meaningful output is written to a file, so a restart, a crash or the next agent finds the work instead of a memory of it."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: An output is about to be produced that a later step or a later session will need.
conditions_does_not_apply_when: The output is a throwaway intermediate that nobody else reads.
artifact_contract_output_type: durable-output
artifact_contract_required_data:
  - the output that is written
  - where it is written
  - what a later agent reads instead of a history
artifact_contract_verified_by: the output is on disk and a later agent can read it without the session history
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/context-engineering.md
status: active
revision: 1
---

# Persist every meaningful output so a context reset loses nothing
- Every meaningful output is written to `.planning/` as human-readable Markdown or JSON.
- Restarting your session (or the model crashing) does not lose work.
- Any subsequent agent can read prior artefacts directly, without depending on a shared conversation history.
