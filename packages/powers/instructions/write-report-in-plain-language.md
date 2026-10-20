---
instruction_id: write-report-in-plain-language
title: Write the report so a reader who never saw the code understands it
summary: "Use short sentences and everyday words, explain a technical term the first time, and open with what the change or the repo does."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A person who may not know this code will read the report.
conditions_does_not_apply_when: The report is for a reader who already knows the code.
artifact_contract_output_type: plain-language-report
artifact_contract_required_data:
  - subject description
  - findings
  - explained terms
artifact_contract_verified_by: a reader who does not know the code understands each finding
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
revision: 3
---

# Write the report so a reader who never saw the code understands it
Very simple English: short sentences, everyday words.
Explain a technical term the first time you use it.
The reader may never have seen this code.
This is a report the user asked for, so give it in full.
Start with `What this change does:` in two or three sentences.
Start with `What this repo does:` in two or three sentences.
