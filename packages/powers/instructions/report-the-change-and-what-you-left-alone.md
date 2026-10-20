---
instruction_id: report-the-change-and-what-you-left-alone
title: Report the change and what you left alone
summary: "Summarise what changed, what was deliberately not touched and what concerns the change raises."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A modification is finished and its scope must be visible to a reviewer.
conditions_does_not_apply_when: Nothing was modified.
artifact_contract_output_type: change-summary
artifact_contract_required_data:
  - the changes made
  - the things deliberately left untouched
  - the potential concerns
artifact_contract_verified_by: "the summary names the changes, the deliberate omissions and the concerns"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/test-completed-work.md
status: active
revision: 2
---

# Report the change and what you left alone

After any modification, provide a structured summary. This makes review easier, documents scope discipline, and surfaces unintended changes:

```
CHANGES MADE:
- src/routes/tasks.ts: Added validation middleware to POST endpoint
- src/lib/validation.ts: Added TaskCreateSchema using Zod

THINGS I DIDN'T TOUCH (intentionally):
- src/routes/auth.ts: Has similar validation gap but out of scope
- src/middleware/error.ts: Error format could be improved (separate task)

POTENTIAL CONCERNS:
- The Zod schema is strict — rejects extra fields. Confirm this is desired.
- Added zod as a dependency (72KB gzipped) — already in package.json
```

This pattern catches wrong assumptions early and gives reviewers a clear map of the change. The "DIDN'T TOUCH" section is especially important — it shows you exercised scope discipline and didn't go on an unsolicited renovation.
Report in chat — what is covered, what is not and why, any bugs, and the command that runs the new tests.
A report in chat; no summary file
