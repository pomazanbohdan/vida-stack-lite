---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-retrospective-references-evidence-gathering-md-43018190-c01"
title: "bmad-method: skills/bmad-retrospective/references/evidence-gathering.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-retrospective/references/evidence-gathering.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-retrospective/references/evidence-gathering.md\"}"
atom_ids:
  - capture-the-session-logs-before-they-expire
  - derive-the-diff-ranges-from-the-plan-baselines
  - inventory-the-evidence-before-you-analyse-it
  - never-hide-a-gap-in-the-evidence
  - read-the-measured-evidence-keys-precisely
atom_count: 5
atoms: "[{\"atom_id\":\"capture-the-session-logs-before-they-expire\",\"file_sha256\":\"9a794dc9a28493418cc06bf1eab6a9faaed4ac4cbabceeee2b3b48d54a4bdd0e\",\"content_sha256\":\"d522828445accbfe1ea8166f037c1bfd0a3c7f2c6fd5b32e21601e0bf6909841\",\"file_bytes\":1378,\"body_bytes\":239},{\"atom_id\":\"derive-the-diff-ranges-from-the-plan-baselines\",\"file_sha256\":\"68d3c905be8b7c45ffbcfda2eb37b0299fc57d343905a8ff20f41dabe89ecef7\",\"content_sha256\":\"f3c26ea6956fb147cd55bdf36fce16d2663235f904b36f79661873c7b13aa841\",\"file_bytes\":2456,\"body_bytes\":1196},{\"atom_id\":\"inventory-the-evidence-before-you-analyse-it\",\"file_sha256\":\"a3212daecb35462530a7cf64419a6aa4a8d2d3ccbff2aaf32dd8d59429176114\",\"content_sha256\":\"c5d4e13dfcc5d102ad0430a5f0403c5ab5f7b4eaf521c76665acf1ed76128311\",\"file_bytes\":3250,\"body_bytes\":2000},{\"atom_id\":\"never-hide-a-gap-in-the-evidence\",\"file_sha256\":\"7f078e02594fa853e0188112248a7bbb83a8f6317a68112ad48f850b204f3837\",\"content_sha256\":\"df6eeabd27de2c38b2ba486449ac162bb05b29043d3420fb3edff5868d308243\",\"file_bytes\":4214,\"body_bytes\":1866},{\"atom_id\":\"read-the-measured-evidence-keys-precisely\",\"file_sha256\":\"7c9e42181d1904023f1e5bd33cd9800e8bd6c48f28fe6affef16b0453bef1672\",\"content_sha256\":\"e7a1f462fd86e1df0dfaf7f9f80fef1acc93f748dabf25983e432c4e17e7b586\",\"file_bytes\":1875,\"body_bytes\":723}]"
carrier_sha256: 939173d6c6ee548036c1ce3b5dadfe004cf9ac380461b73082d172c69db24ee1
carrier_bytes: 13874
revision: 1
status: active
---
<!-- vpmodule:atom:begin capture-the-session-logs-before-they-expire -->
---
instruction_id: capture-the-session-logs-before-they-expire
title: Capture the session logs before they expire
summary: "The session logs are the only record of why a session took an unexpected turn, and they are the evidence most likely to disappear, so their references are captured at once."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
  - evidence-analysis
conditions_applies_when: The session records of a body of work are available.
conditions_does_not_apply_when: There are no session records to capture.
artifact_contract_output_type: session-log-references
artifact_contract_required_data:
  - the references to the session records
artifact_contract_verified_by: the references to the session records are captured in the inventory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Capture the session logs before they expire
They are the only record of *why* a session took an unexpected turn — what was tried and abandoned.
They are also the evidence most likely to be deleted or expire, so capture references now.
<!-- vpmodule:atom:end capture-the-session-logs-before-they-expire -->
<!-- vpmodule:atom:begin derive-the-diff-ranges-from-the-plan-baselines -->
---
instruction_id: derive-the-diff-ranges-from-the-plan-baselines
title: Derive the diff ranges from the plan baselines
summary: "Every piece of work has its own baseline, the ranges run from one baseline to the next in the order the builds started, and a piece with no baseline is recorded as having no evidence."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
  - evidence-analysis
conditions_applies_when: The changes of a finished body of work have to be turned into ranges.
conditions_does_not_apply_when: The ranges are already fixed.
artifact_contract_output_type: diff-ranges
artifact_contract_required_data:
  - the range of each piece of work
  - the order the ranges were derived in
  - the pieces that have no range and why
artifact_contract_verified_by: "every range names its baseline and its end, and a range that could not be established is recorded as missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the diff ranges from the plan baselines
Each plan records its own `baseline_revision`, the commit its build started from, so there is no single epic-wide range.
Order the plans by their baselines' place in history, oldest first
The order the builds started, which need not be the row order.
A plan's range runs from its baseline to the next baseline in that order; the last plan's range runs to `HEAD`, marked inferred rather than recorded.
When later work has landed since, end it at the last commit that belongs to this epic's tickets, judged from the plans and commit subjects, and record the cut.
A plan whose `baseline_revision` is missing or `NO_VCS` gets no commit or diff evidence — record that too.
Two plans sharing a baseline give the earlier one an empty range: that ticket simply has no commits of its own.
Group the tickets sharing an identical range
once per distinct range.
A commit's `stories` is usually empty, since subjects rarely name a ref; the range is the attribution, and an empty list is not missing evidence.
Ranges may overlap or diverge; count a shared commit or file change once in the aggregate views while keeping each ticket's range as its provenance.
<!-- vpmodule:atom:end derive-the-diff-ranges-from-the-plan-baselines -->
<!-- vpmodule:atom:begin inventory-the-evidence-before-you-analyse-it -->
---
instruction_id: inventory-the-evidence-before-you-analyse-it
title: Inventory the evidence before you analyse it
summary: "What the finished work produced is enumerated with the source of each artifact, and the inventory is the authoritative list the later phases read."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
  - evidence-analysis
  - code-audit
conditions_applies_when: A retrospective begins the analysis of a finished body of work.
conditions_does_not_apply_when: The inventory was already taken in this run.
artifact_contract_output_type: evidence-inventory
artifact_contract_required_data:
  - what exists and the source path of each
  - what is missing
  - the diff ranges the later phases read
artifact_contract_verified_by: "every artifact of the body of work is listed with its source, and the inventory names what is missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
  - research
---

# Inventory the evidence before you analyse it
Enumerate what the completed epic produced, so every later analysis works from real artifacts instead of memory.
Output is an inventory: what exists, what is missing, and the diff ranges the rest of the retro will read.
Collect what the epic produced and note the source path or range of each:
- **Epic file**
- read it in full: Requirements, Description, Outcome, Done when, Boundaries, and Notes. Requirements and Done when govern Phase 4; when the file has neither, note that the verdict will be profiled from the diff.
- **Initiative requirements** — the Requirements section of the initiative file, opened only for a `covers` id the epic file does not restate. Each ticket's `covers` names ids there.
- **Entries**
- its `description`, `verify`, and `covers` are what the build was given. `description` and `verify` are empty once the entry was pulled: the story file holds them.
- **Story files**
- when it is not null: the ticket itself; read each in full.
- **Plans** — one plan for each ticket:
- its frontmatter (`status`, `baseline_revision`),
- the decisions it froze after approval,
- Design Notes and Implementation Notes,
- and the sections Review Triage Log, Verification, Plan Change Log, and the dated `### <date>` blocks under `## Code Review`, absent when no review ran.
- These mark the boundaries between build sessions.
- **Run folders and companions**
- every `<type>-*/` folder in the epic folder, each main document read in full, and the files the epic file lists in `companions:`. A run document that summarizes and points at a fuller output is a claim to check: open the output it names.
- **Previous retrospective**
- in the previous epic's folder, if one exists,
- so Phase 4 can check whether last epic's action items landed.
- **Session logs** — conversation or session records for the epic's tickets, when available.
Carry the inventory forward into Phase 2 as the authoritative list of what is available to read.
<!-- vpmodule:atom:end inventory-the-evidence-before-you-analyse-it -->
<!-- vpmodule:atom:begin never-hide-a-gap-in-the-evidence -->
---
instruction_id: never-hide-a-gap-in-the-evidence
title: Never hide a gap in the evidence
summary: "A missing input is declared and narrows the scope of the analysis; the reader can always tell \"checked and clean\" from \"never checked\"."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
  - evidence-analysis
  - code-audit
  - empty-result-policy
  - empty-result-posture-policy
conditions_applies_when: An analysis needs an input that the evidence may not contain.
conditions_does_not_apply_when: Every input the analysis needs is available.
artifact_contract_output_type: evidence-gaps
artifact_contract_required_data:
  - the missing input
  - the analysis that was narrowed
  - the narrowed scope
artifact_contract_verified_by: "every gap names the analysis it narrowed, and no analysis that was skipped is presented as clean"
compatibility_excludes:
  - delete-an-empty-section-instead-of-writing-none
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/evidence-gathering.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone/detail/elaboration.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/next.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verifier-evidence-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/no-silent-swallow-no-verdict-from-dropped-data.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/unreadable-directory-scope-signal.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/improved-prompt-injection-scanner.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Never hide a gap in the evidence
Evidence availability varies; never hide a gap.
Each later analysis declares what it needs and, when that input is absent, records a narrowed scope rather than guessing.
A reader of the final retro must always be able to tell **"checked and clean"** from **"never checked."**
Missing session logs → process-lesson analysis is skipped, and the retro says so.
No Done when in the epic file → the verdict is profiled from the diff and plans, flagged as profiled rather than declared.
Sub-agents unavailable → analyses that would delegate run inline over a narrowed scope, and the narrowing is recorded.
A close is clean only because the items acknowledged at an earlier close are still being suppressed, not because everything was fixed this time.
A scan that failed, or whose scope did not cover the whole input, is a non-answer and not an empty result: report it and narrow the scope, never report it as clean.
Include this section (even if empty, stating "None") whenever `is_re_verification = true` ran — an omitted section reads as "not checked," not "checked and clean."
If signals are too thin to choose, output `UNKNOWN` with `low` confidence and list observed signals in `notes`.
Downgrade confidence silently — when unsure, output `UNKNOWN` with signals in `notes`
a failure or a gap in the input must not be absorbed into an output that reads as authoritative.
A routine that drops data it could not read or could not resolve, and then reports a clean result anyway, turns a diagnosable gap into a confidently wrong answer.
Each now distinguishes "could not read" from "does not exist"
still cannot tell "genuinely no context file" from "could not read the directory at all."
A scanner that could not establish its file list MUST NOT report clean
distinguish four outcomes rather than collapsing them into exit 0
<!-- vpmodule:atom:end never-hide-a-gap-in-the-evidence -->
<!-- vpmodule:atom:begin read-the-measured-evidence-keys-precisely -->
---
instruction_id: read-the-measured-evidence-keys-precisely
title: Read the measured evidence keys precisely
summary: "The measured keys are read as they are: the file totals count the non-merge commits, the merge totals restate the churn, and the unmeasured churn is not zero."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
  - evidence-analysis
conditions_applies_when: The measured output of a range is read.
conditions_does_not_apply_when: The evidence was gathered without a measurement.
artifact_contract_output_type: measured-evidence
artifact_contract_required_data:
  - what each key counts
  - the gap between the measured and the unmeasured
artifact_contract_verified_by: no key is summed into another and the unmeasured churn is reported as unmeasured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read the measured evidence keys precisely
Read the output keys precisely: each commit carries `is_merge` and `stories` — every id its subject names, so a commit spanning two stories counts for both.
`files` sums non-merge commits only.
`merge_files` is each measured merge's diff against its first parent, so it *restates* the churn that merge brought in plus whatever the conflict resolution added — never add it into `files`, and never read it as merge-introduced work on its own.
`merges_measured` counts the merges on the range head's first-parent spine; `merge_count` counts every merge in the range, so a gap between the two means merges went unmeasured.
`binary_revisions` is unmeasured churn, not zero churn.
<!-- vpmodule:atom:end read-the-measured-evidence-keys-precisely -->