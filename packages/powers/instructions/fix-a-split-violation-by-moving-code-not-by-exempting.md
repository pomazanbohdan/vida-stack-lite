---
instruction_id: fix-a-split-violation-by-moving-code-not-by-exempting
title: "Fix a split violation by moving code, not by exempting"
summary: A split invariant is repaired by moving the code or rewording the text; an exemption is never the repair.
capability_tags:
  - minimize-code-surface
pattern_tags:
  - automated-enforcement
conditions_applies_when: A split invariant is violated.
conditions_does_not_apply_when: The file is listed for the real operating system as a whole.
artifact_contract_output_type: split-repair
artifact_contract_required_data:
  - the violated invariant
  - the code that was moved or reworded
artifact_contract_verified_by: the invariant holds after the move and no exemption was added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/split-platform-sensitive-tests.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fix a split violation by moving code, not by exempting
It never drops a file from the real-OS list silently — every failure below is fixed by moving code or reworking text, never by adding an exemption.
| `base-has-signal` | A base file that has a `.platform` sibling still carries the named signal(s). | Move the test that carries the signal into the sibling, or clear the idiom as in step 3 of the split. |
