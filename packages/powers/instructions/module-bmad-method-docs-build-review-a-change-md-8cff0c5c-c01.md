---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-build-review-a-change-md-8cff0c5c-c01"
title: "bmad-method: docs/build/review-a-change.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:docs/build/review-a-change.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/build/review-a-change.md\"}"
atom_ids:
  - compose-the-review-prompt-from-paths-and-intent
  - offer-the-patch-options-and-apply-on-choice
  - run-unattended-without-asking
atom_count: 3
atoms: "[{\"atom_id\":\"compose-the-review-prompt-from-paths-and-intent\",\"file_sha256\":\"fbc0dc22b2d4289a413c775574fc66eb4dad4ab7ed3c0ae1f93db8a87898f652\",\"content_sha256\":\"788968be74c94a8d3185a04deb21bfe034e5b393635b49076d6f2d0067cd5dfb\",\"file_bytes\":2876,\"body_bytes\":1527},{\"atom_id\":\"offer-the-patch-options-and-apply-on-choice\",\"file_sha256\":\"5927cdd339858abc63aaccaf258a42d16dcb8905695d9555eb9d109896c060fb\",\"content_sha256\":\"728e41f134f1f9947140a42fccc7f4216b3dcaea875b3f0af8c5b97e82b240b4\",\"file_bytes\":2572,\"body_bytes\":1272},{\"atom_id\":\"run-unattended-without-asking\",\"file_sha256\":\"6c349b5a9f4093d1bc5439ac4e3de42e236cf63bed767b7bfcfc381af2d176b0\",\"content_sha256\":\"83a880d3e15b3d3006569bb37dea894c7f5d9678d4e3335ca5c07958385c1b68\",\"file_bytes\":2281,\"body_bytes\":719}]"
carrier_sha256: dc51e8b211fb12c543e287b368bc95fb98c8a34ae28469d6255d9576eae5ef22
carrier_bytes: 8140
revision: 1
status: active
---
<!-- vpmodule:atom:begin compose-the-review-prompt-from-paths-and-intent -->
---
instruction_id: compose-the-review-prompt-from-paths-and-intent
title: Compose the review prompt from paths and intent
summary: "The launch prompt carries the absolute paths, including the ticket, and the intent taken from the ticket's Requirements before the plan, never the diff text; the reviewer's own instruction file is not read by the launcher."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A review lens is about to be launched against the staged change.
conditions_does_not_apply_when: The lens runs inside this session and reads the files itself.
artifact_contract_output_type: lens-launch-prompt
artifact_contract_required_data:
  - the substituted paths
  - the intent
  - the prompt text
artifact_contract_verified_by: the prompt carries no diff text and names the intent of the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-02-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/review-a-change.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Compose the review prompt from paths and intent
Try running all active lenses simultaneously: substitute the runtime placeholders (`{diff_file}`, `{claims_file}`, `{plan_file}`, `{ticket_file}`, `{verbatim_intent}`) into each lens's instruction.
`{diff_file}`, `{claims_file}`, `{plan_file}`, and `{ticket_file}` are paths: substitute the absolute path and let the lens read the file — a launch prompt never carries diff text, and the child's working directory is not yours.
`{verbatim_intent}` is the Description, Requirements and Acceptance Criteria sections of `{ticket_file}` when it is the story file, with the epic's Requirements lines in its `covers`; when it is the epic file of an entry with no file, the entry's title, description and verify, with the epic's Requirements lines in the entry's `covers`; else the intent section of `{plan_file}` if it has one, else the user's or conversation's own words on what the change is for, substituted inline as text; a request to review something is not an intent.
When an instruction launches a reviewer subagent, launch that child with the prompt text after placeholder substitution; do not load the reviewer instruction file yourself.
If you have a ticket, a spec, requirements, or even a stream of consciousness for what this change is supposed to implement, feed that in too.
Review quality depends on it — without intent, the reviewers can only judge the diff against itself.
Have it pass the PR description to the review every time, and the ticket when possible.
<!-- vpmodule:atom:end compose-the-review-prompt-from-paths-and-intent -->
<!-- vpmodule:atom:begin offer-the-patch-options-and-apply-on-choice -->
---
instruction_id: offer-the-patch-options-and-apply-on-choice
title: Offer the patch options and apply on choice
summary: "Present the patch findings as a numbered choice — apply them all, leave them as action items, or walk through them — and carry out the chosen one without a per-finding confirmation."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review produced patch findings and the reader has to say what to do with them.
conditions_does_not_apply_when: There are no patch findings.
artifact_contract_output_type: patch-choice
artifact_contract_required_data:
  - the options offered
  - the choice made
  - the summary of what was changed
artifact_contract_verified_by: the options were offered as a numbered choice and the chosen option was carried out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-05-present.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/review-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Offer the patch options and apply on choice
How would you like to handle the `<P>` `patch` findings?
1. **Apply every patch** — fix all of them now, no per-finding confirmation. Defer and decision-needed items are not touched.
2. **Leave as action items** — they are already in `{plan_file}`
3. **Walk through each patch** — show details for each before deciding
If `plan_file` is **not** set, present only options 1 and 2 (omit "Leave as action items" — findings were not written to a file):
Apply every patch finding without per-finding confirmation. Do not modify defer or decision-needed items.
After all patches are applied, present a summary of changes made. If `plan_file` is set, check off the patch items in it (leave defer items as-is).
Walk through each patch: Present each finding with full detail, diff context, and suggested fix.
After walkthrough, re-offer the applicable options above.
HALT — I am waiting for your numbered choice. Reply with only the number. Do not proceed until you select an option.
When the right fix depends on what you meant, the review doesn't pick one for you: it lists the possible fixes, says which one it would choose and why, and leaves the call to you.
The review lists the fixes and says which one it recommends.
<!-- vpmodule:atom:end offer-the-patch-options-and-apply-on-choice -->
<!-- vpmodule:atom:begin run-unattended-without-asking -->
---
instruction_id: run-unattended-without-asking
title: Run unattended without asking
summary: "When no human can answer during the run, never ask and never stop for input: take the default each instruction names, and report what is missing where there is none."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The review runs without a human available to answer, for example in a bot, a CI job, or another workflow."
conditions_does_not_apply_when: Someone is there to answer the questions the run raises.
artifact_contract_output_type: unattended-review-report
artifact_contract_required_data:
  - the results of the run
  - what was missing and had to be reported
artifact_contract_verified_by: "the run asked nothing, and everything a reader must act on is in the report text"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-01-gather-context.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-05-present.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/review-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run unattended without asking
If the invocation is clearly non-interactive -- it says not to ask questions, or a bot, a CI job or another workflow is running the review --
Run it without asking.
When in doubt, don't.
No human can answer during this run: never ask and never HALT for input.
Wherever an instruction below would ask, take the default it names instead; where it names none, stop and report what is missing.
The report text is the deliverable -- everything a reader must act on is in it, not only in files the run writes.
The review assumes someone is there to answer its questions.
It then asks nothing: it fixes the patch findings, and the report lists the decisions first for whoever reads it to make.
<!-- vpmodule:atom:end run-unattended-without-asking -->