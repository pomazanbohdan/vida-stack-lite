---
instruction_id: classify-and-state-review-verdict
title: Classify the findings and state a clear verdict
summary: "Classify findings by actual severity, state one clear ready-to-merge verdict, and decide the next action."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review has collected findings and needs a verdict.
conditions_does_not_apply_when: The review is not finished.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - findings
  - severity
  - strengths
  - verdict
artifact_contract_verified_by: the verdict follows the finding severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Classify the findings and state a clear verdict
Categorize issues by actual severity. Not everything is critical.
Acknowledge what was done well before listing issues.
List every behavior you considered and set aside as outside the plan or spec, one line each, with the reason.
An empty list means you set nothing aside.
Explain why each issue matters.
Give a clear verdict.
Do not say `looks good` without checking.
Do not mark nitpicks as critical.
Do not give feedback on code you did not actually read.
**Ready to merge?** [Yes | No | With fixes]
Nothing found: say looks good and ship, with one line on what you checked.
A one- or two-sentence technical assessment supports the verdict.
When lean findings exist, name the lines and dependencies that could be removed.
Not checked: the parts you did not read or could not run.
