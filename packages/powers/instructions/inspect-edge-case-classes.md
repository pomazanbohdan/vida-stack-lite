---
instruction_id: inspect-edge-case-classes
title: Check the known classes of edge cases
summary: "Look for a wrong result, a crash and a missed edge case in the known classes: empty, zero, last item, rounding, time zones."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The reviewed code takes input, computes, sorts or converts values."
conditions_does_not_apply_when: The code stores no values and makes no decision on them.
artifact_contract_output_type: edge-case-findings
artifact_contract_required_data:
  - case class
  - input
  - wrong result
artifact_contract_verified_by: each edge-case finding names a concrete input
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 2
---

# Check the known classes of edge cases
Look for a wrong result.
Look for a crash.
Look for a missed edge case: empty, zero, last item, rounding, time zones.
Look for a caller broken by the change.
Look for a fix applied in one caller while the shared function stays broken.
Look for callers that disagree with what a function returns.
Look for the same rule applied differently in two places.
Before you report it, re-read the lines and confirm the value can really be empty.
