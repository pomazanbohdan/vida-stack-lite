---
instruction_id: a-smaller-file-is-not-a-smaller-context
title: A smaller file is not a smaller context
summary: "Eagerly importing content into a file shrinks the file without shrinking what a session loads, so it games a size guard and makes the real cost worse."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Content is moved into another file to bring a size or length limit down.
conditions_does_not_apply_when: The content is read on demand only when the task needs it.
artifact_contract_output_type: context-cost-decision
artifact_contract_required_data:
  - the file before and after
  - what the reader still loads
artifact_contract_verified_by: "the reader still loads the same content, so the limit was not really reduced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/acknowledge-emitted-drift.md
status: active
revision: 1
---

# A smaller file is not a smaller context
An eager `@`-import shrinks the file without shrinking loaded context, which games the guard while making the real cost worse
