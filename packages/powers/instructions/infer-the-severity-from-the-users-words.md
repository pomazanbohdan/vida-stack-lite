---
instruction_id: infer-the-severity-from-the-users-words
title: "Infer the severity from the user's words"
summary: "The severity is read off the words the person used and never asked for; when the words do not settle it, the middle level is the answer."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A person described a problem in their own words.
conditions_does_not_apply_when: The severity was already settled.
artifact_contract_output_type: severity-statement
artifact_contract_required_data:
  - the words
  - the severity they imply
artifact_contract_verified_by: the severity was inferred from the words and no severity question was asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-and-ship.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Infer the severity from the user's words
Infer severity from description:
Contains: crash, error, exception, fails, broken, unusable
Contains: doesn't work, wrong, missing, can't
Contains: slow, weird, off, minor, small
Contains: color, font, spacing, alignment, visual
Critical for the crash list, Important for the does-not-work list, Minor for the slow list and for the visual list.
Default if unclear
if unclear. User can correct if needed.
**Never ask "how severe is this?"** - just infer and move on.
# Infer the severity from the words the user used
Severity is INFERRED from user's natural language, never asked.
| Crash, error, exception, fails completely, unusable → Critical | Doesn't work, nothing happens, wrong behavior, missing → Important | Works but..., slow, weird, minor, small issue → Minor | Color, font, spacing, alignment, visual, looks off → Minor |
Default: **Important** (safe default, user can clarify if wrong)
