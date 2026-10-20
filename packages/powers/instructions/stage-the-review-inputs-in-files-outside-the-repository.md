---
instruction_id: stage-the-review-inputs-in-files-outside-the-repository
title: Stage the review inputs in files outside the repository
summary: "Write the diff and the change's own narrative to uniquely named temporary files outside the repository, and hand the narrative over verbatim."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The diff for the review is being prepared and the lenses need their input.
conditions_does_not_apply_when: The input is handed to the lens inline instead of staged in a file.
artifact_contract_output_type: staged-review-inputs
artifact_contract_required_data:
  - the diff file path
  - the claims file path
artifact_contract_verified_by: "both files exist outside the repository under unique names, and the narrative is verbatim"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 2
---

# Stage the review inputs in files outside the repository
Write the diff to `{diff_file}`, a uniquely-named temp file outside the repository, so concurrent reviews cannot collide.
Collect the change's own narrative: for a plan baseline, branch diff, or commit range, the commit messages it covers (`git log <base>..<head>`, where a plan baseline's head is `HEAD`); for other sources, whatever description of the change the user or conversation supplied.
Write it verbatim to another uniquely-named temp file outside the repository and set `claims_file` to its path, or `''` if there is none.
Do not analyze or summarize it — it is input for one review lens, staged as a file so the other lenses never see it.
Read `{diff_file}` yourself when you need the diff later in this workflow.
