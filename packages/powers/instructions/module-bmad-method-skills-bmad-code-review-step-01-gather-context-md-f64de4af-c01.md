---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-code-review-step-01-gather-context-md-f64de4af-c01"
title: "bmad-method: skills/bmad-code-review/step-01-gather-context.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-code-review/step-01-gather-context.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-code-review/step-01-gather-context.md\"}"
atom_ids:
  - diff-the-range-the-review-covers
  - resolve-the-review-target-from-the-context
  - set-the-review-mode-from-what-was-given
  - stage-the-review-inputs-in-files-outside-the-repository
atom_count: 4
atoms: "[{\"atom_id\":\"diff-the-range-the-review-covers\",\"file_sha256\":\"80a79e7dad800f1147835def48765da06fe0e93da3dd3840f9c584ef27874b80\",\"content_sha256\":\"695113d1b58e245a2cc88655a3ec6ea52174dc449e992429e9f3dc2ac12beb71\",\"file_bytes\":1809,\"body_bytes\":625},{\"atom_id\":\"resolve-the-review-target-from-the-context\",\"file_sha256\":\"f8506b0b10623780553fcfe12881f32957ca9a976b8322785e9587b76ffacf88\",\"content_sha256\":\"ab5a4a503ff154a35a28a92eaf6ddb689d701ed0c3b9cf074a205a4913779584\",\"file_bytes\":2639,\"body_bytes\":1440},{\"atom_id\":\"set-the-review-mode-from-what-was-given\",\"file_sha256\":\"dc9c3124fef293a91f03c034aff09affda9bec0cc15d6bc7830c9acb1c6176bb\",\"content_sha256\":\"3eef2316523a2be492279d32cc2cc3ecce34473b596f7b9b50b2eac5dbd321c9\",\"file_bytes\":1733,\"body_bytes\":549},{\"atom_id\":\"stage-the-review-inputs-in-files-outside-the-repository\",\"file_sha256\":\"598d22caf3af6fb56d590c4007ddb9c140751ab21bc1093d1fac77aea2a4f580\",\"content_sha256\":\"a5a2703aff38a000a524ce6f1cff5f2a01946cf6d242c29189133a0eab8b6a06\",\"file_bytes\":1966,\"body_bytes\":786}]"
carrier_sha256: f53d38e934dfef92daa678af48a18d37e71c067c07391f36175d09bdb832201f
carrier_bytes: 8714
revision: 1
status: active
---
<!-- vpmodule:atom:begin diff-the-range-the-review-covers -->
---
instruction_id: diff-the-range-the-review-covers
title: Diff the range the review covers
summary: "Fix the range before the review: the plan baseline, the merge base of a branch, or the named files — untracked files included — and stop when there is nothing to review."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review target is known and the change has to be turned into the diff the review will read.
conditions_does_not_apply_when: The diff is already staged and the range it covers is already fixed.
artifact_contract_output_type: review-diff
artifact_contract_required_data:
  - the diff source
  - the range the diff covers
  - the diff file
artifact_contract_verified_by: "the diff covers the whole range including untracked files, and an empty diff stops the run"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Diff the range the review covers
A plan baseline diffs every change since `baseline_revision`, untracked files included.
A branch diff runs from the merge-base (`<base>...HEAD`), so later commits on the base do not show up as reverted.
For a file list, include untracked files.
If the source does not resolve, HALT and ask for a valid one; if the diff is empty, HALT — there is nothing to review.
If `{diff_file}` exceeds about 3000 lines, warn the user and offer to chunk the review by file group. If they accept, agree on the first group, rebuild `{diff_file}` for it, and list the remaining groups for follow-up runs.
<!-- vpmodule:atom:end diff-the-range-the-review-covers -->
<!-- vpmodule:atom:begin resolve-the-review-target-from-the-context -->
---
instruction_id: resolve-the-review-target-from-the-context
title: Resolve the review target from what was given
summary: "Take the target from the prompt and the conversation, then fall back through the ticket tree with its story or epic file, the current branch state, and finally the question."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A code review is starting and the target of the review is not yet fixed.
conditions_does_not_apply_when: The review target is already fixed and the diff for it is already staged.
artifact_contract_output_type: review-target
artifact_contract_required_data:
  - the review target
  - the source the target was taken from
artifact_contract_verified_by: "the target is named before the review starts, and the place it was taken from is stated"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Resolve the review target from what was given
The triggering prompt and the conversation before it name the review target — act on them; do not start from a blank slate.
Find the review target. Check in this order and stop at the first that identifies it:
Request or recent conversation. A PR (resolve via `gh pr view`; if that fails, ask for a SHA or branch), commit, branch, commit range, staged or uncommitted changes, a provided diff or file list, or a plan file. When the plan's frontmatter names a `ticket`, resolve it in the plan's folder and set `ticket_file` to the story file, else the epic file.
The ticket tree. Otherwise offer the `tickets` rows whose `state` is `review`, `<ref>` and `<title>` each, plus a choice of another target, and HALT for the user's pick. For a picked ticket, set `ticket_file` to its story file, else its epic file, read it in full, and treat its plan as the plan file from the request. Open a file the ticket lists in `sources:` or `companions:` only for a section the ticket cites; never re-derive requirements from it.
Current git state. If HEAD is not on the default branch, confirm: "I see HEAD is `<short-sha>` on `<branch>` — do you want to review this branch's changes?" If confirmed, it is a branch diff against the default branch.
Ask. HALT. Ask the user what to review: uncommitted changes, staged changes, a branch diff (which base), a commit range, or a provided diff or file list.
<!-- vpmodule:atom:end resolve-the-review-target-from-the-context -->
<!-- vpmodule:atom:begin set-the-review-mode-from-what-was-given -->
---
instruction_id: set-the-review-mode-from-what-was-given
title: Set the review mode from what was given
summary: "Decide full or no-plan from the plan you were handed, ask when nothing says, and load the context documents the plan names."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review target is known and the review needs a plan to compare the change against.
conditions_does_not_apply_when: The review runs without a plan and nothing in the request asks for one.
artifact_contract_output_type: review-mode
artifact_contract_required_data:
  - the review mode
  - the plan file
  - the context documents loaded
artifact_contract_verified_by: "the mode and the plan file are stated, and every context document the plan names is loaded or reported missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Set the review mode from what was given
The request or conversation explicitly says there is no plan → `review_mode` = `no-plan`, `plan_file` = `''`. Do not ask.
`plan_file` is set → verify it is readable; `review_mode` = `full`.
Otherwise, ask for a plan file path, or to continue without one, and set `plan_file` and `review_mode` accordingly. Do not assume no-plan just because none was given.
If `review_mode` = `full` and `{plan_file}`'s frontmatter has a `context` list, load each referenced doc and warn about any that cannot be found.
<!-- vpmodule:atom:end set-the-review-mode-from-what-was-given -->
<!-- vpmodule:atom:begin stage-the-review-inputs-in-files-outside-the-repository -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stage the review inputs in files outside the repository
Write the diff to `{diff_file}`, a uniquely-named temp file outside the repository, so concurrent reviews cannot collide.
Collect the change's own narrative: for a plan baseline, branch diff, or commit range, the commit messages it covers (`git log <base>..<head>`, where a plan baseline's head is `HEAD`); for other sources, whatever description of the change the user or conversation supplied.
Write it verbatim to another uniquely-named temp file outside the repository and set `claims_file` to its path, or `''` if there is none.
Do not analyze or summarize it — it is input for one review lens, staged as a file so the other lenses never see it.
Read `{diff_file}` yourself when you need the diff later in this workflow.
<!-- vpmodule:atom:end stage-the-review-inputs-in-files-outside-the-repository -->