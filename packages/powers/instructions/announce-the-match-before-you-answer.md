---
instruction_id: announce-the-match-before-you-answer
title: Announce the match before you answer
summary: "When a request names one of several known targets, the resolution is announced in one line - the matched name, the target, and the scope about to be emitted."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A request names a target that has to be resolved before the work starts.
conditions_does_not_apply_when: There is exactly one candidate and nothing was resolved.
artifact_contract_output_type: resolution-line
artifact_contract_required_data:
  - the matched name
  - the target it resolved to
  - the scope that will be emitted
artifact_contract_verified_by: one line states what was matched before the content is emitted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/topic.md
status: active
revision: 1
---

# Announce the match before you answer
If matched: emit a single resolved-routing preamble line so the user sees what was matched:
Use the canonical alias from the leftmost column. Use the literal heading text from the matched cell. State the scope you are about to emit.
