---
instruction_id: review-a-skill-with-parallel-readers-over-every-file
title: Review a skill with parallel readers over every file
summary: "Review a skill by reading every file a model would read, in parallel, and report the findings merged, deduplicated and ordered by severity, each naming the file it is in and the fix; the report is advice and blocks nothing."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A skill that somebody else wrote is to be judged.
conditions_does_not_apply_when: The same lenses already ran over this skill and their defects were fixed.
artifact_contract_output_type: skill-review
artifact_contract_required_data:
  - the files read
  - the findings by severity
  - the fix for each finding
artifact_contract_verified_by: every finding names the file it is in and the fix
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/how-to-review.md
status: active
revision: 1
---

# Review a skill with parallel readers over every file
Review mode reads nothing but the skill
run as parallel readers over every file a model would read
customization (declared values that reach nothing, overrides that cannot land), trigger (the description against the near misses)
merged, deduplicated and ordered by severity, each naming the file it is in and the fix
Nothing fails or blocks; the report is advice.
the lenses already ran and the defects are fixed
