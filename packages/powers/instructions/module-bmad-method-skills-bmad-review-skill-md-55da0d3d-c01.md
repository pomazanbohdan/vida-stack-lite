---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-review-skill-md-55da0d3d-c01"
title: "bmad-method: skills/bmad-review/SKILL.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-review/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-review/SKILL.md\"}"
atom_ids:
  - announce-the-review-plan-in-one-line
  - assemble-the-report-from-every-lens
  - classify-the-content-before-the-lenses-run
  - let-each-lens-set-its-own-stance-toward-zero-findings
  - report-the-review-in-one-canonical-finding-shape
  - review-only-when-a-review-was-asked-for
  - run-the-lenses-by-dependency-not-by-order
  - select-the-lenses-from-the-resolved-set
atom_count: 8
atoms: "[{\"atom_id\":\"announce-the-review-plan-in-one-line\",\"file_sha256\":\"3af657c477b7e36eebaffdc60e4cc4567042e2b3403060058019b7cf1fe73bc5\",\"content_sha256\":\"8dff7f469b9ce4bcd8bac7c1abfff6d20c70b885c5d8690fd323af2df5ac192a\",\"file_bytes\":1548,\"body_bytes\":381},{\"atom_id\":\"assemble-the-report-from-every-lens\",\"file_sha256\":\"898db86daea69ab939928b80abdf81cbcddc9e9fe74eb13d6b06c39ed050696b\",\"content_sha256\":\"dfd005c14c5aeaade3398eb15c2304fea83d06a011688e8355bcd0e636753aff\",\"file_bytes\":1598,\"body_bytes\":435},{\"atom_id\":\"classify-the-content-before-the-lenses-run\",\"file_sha256\":\"09d0af7657be9a1acf37f11618aa4f8902524c2e1d7506251b74b00b1df883fa\",\"content_sha256\":\"b261c5d07fb20a84522dffa39fb92dcf4c3188f5c4776651f0bda64a3d9098ee\",\"file_bytes\":1550,\"body_bytes\":381},{\"atom_id\":\"let-each-lens-set-its-own-stance-toward-zero-findings\",\"file_sha256\":\"a363203654b202f35783e8987918f991ab8401982a5d694e516becd1508295f2\",\"content_sha256\":\"2fd569be23b472215b8cd194eb9742d72efbd164a573b742368f6e6948ca9a7b\",\"file_bytes\":1778,\"body_bytes\":427},{\"atom_id\":\"report-the-review-in-one-canonical-finding-shape\",\"file_sha256\":\"b99e550c85af011a3a46c4038305f800024ecd4391686e0727cf383283deea28\",\"content_sha256\":\"1ffce32d75f3e234bb306e4bae476f4aeffbf41f44910e2364a36adeb202b4f8\",\"file_bytes\":2451,\"body_bytes\":930},{\"atom_id\":\"review-only-when-a-review-was-asked-for\",\"file_sha256\":\"8f231492604a01879ed06563a6ac69a55cff2db64ac2716229782ec6c43d66db\",\"content_sha256\":\"b31ab5c956a811e76ca16945599851e54ef3900984ac43178babf90f3058b122\",\"file_bytes\":1921,\"body_bytes\":606},{\"atom_id\":\"run-the-lenses-by-dependency-not-by-order\",\"file_sha256\":\"222dbd2d6349049b927979c27625b96cddb3895f7e9b62a6fdb0c7ea68698e5c\",\"content_sha256\":\"b1344b7af0f5dfbc41cf806480ec30ccdfc5a6a56b49be6fbf029d47dfc178de\",\"file_bytes\":1797,\"body_bytes\":558},{\"atom_id\":\"select-the-lenses-from-the-resolved-set\",\"file_sha256\":\"afe1c154824736b8dfe0daca0b6dba0be1a1c5adb67d2ed01c22996a250a925d\",\"content_sha256\":\"085c91f3389cb1640eb0028c4c8e2f42613bdb77aae56c09e82a51a413e63f8e\",\"file_bytes\":1768,\"body_bytes\":542}]"
carrier_sha256: 5995d32fe94a2df6bfa2a515e8b274ac7840dde0e06745da888648f6ad6dbe91
carrier_bytes: 15540
revision: 1
status: active
---
<!-- vpmodule:atom:begin announce-the-review-plan-in-one-line -->
---
instruction_id: announce-the-review-plan-in-one-line
title: Announce the review plan in one line
summary: "Before anything runs, one line names the content class, the lenses and the lens that will run on top of another one — unless the caller pinned an exact output contract."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is about to run its lenses.
conditions_does_not_apply_when: The caller pinned an exact output contract that covers everything the run emits.
artifact_contract_output_type: review-plan-announcement
artifact_contract_required_data:
  - the content class
  - the lenses about to run
  - the dependency between the lenses
artifact_contract_verified_by: the announcement is one line and it names the content class and every lens that will run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - operations
---

# Announce the review plan in one line
Announce the plan in one line before running anything: the content class, the lenses about to run, and — when any lens has `after` set — that it runs on top of the named lens's findings.
Skip the announcement entirely when the caller pinned an exact output contract
Their contract covers everything you emit, not just the findings block.
<!-- vpmodule:atom:end announce-the-review-plan-in-one-line -->
<!-- vpmodule:atom:begin assemble-the-report-from-every-lens -->
---
instruction_id: assemble-the-report-from-every-lens
title: Assemble the report from every lens
summary: "Every lens’s findings are kept, an overlap between two lenses is signal and not duplication, and a lens that found nothing gets one line."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - output-formatting
conditions_applies_when: The lenses have reported and the findings are assembled.
conditions_does_not_apply_when: Only one lens ran and its output is already the report.
artifact_contract_output_type: lens-report
artifact_contract_required_data:
  - the findings of every lens
  - the lens each finding came from
  - the overlaps between lenses
  - the lenses that found nothing
artifact_contract_verified_by: "no lens finding was dropped or deduplicated away, and a clean review is stated plainly"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Assemble the report from every lens
Keep every lens's findings — overlap between lenses is signal, not duplication; note it in the markdown report rather than deduping.
The markdown report groups findings by lens, each rendered in its declared shape: a short block per finding rendering the fields plus any extras worth surfacing, one line for a lens that found nothing, and a plain clean statement when the whole review is clean.
<!-- vpmodule:atom:end assemble-the-report-from-every-lens -->
<!-- vpmodule:atom:begin classify-the-content-before-the-lenses-run -->
---
instruction_id: classify-the-content-before-the-lenses-run
title: Classify the content before the lenses run
summary: "The content is classified as a diff, a source file, a function, a document or a ticket, and as code or docs, because the scope rules and the lens applicability both depend on it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The content to review has been loaded and the lenses have not started yet.
conditions_does_not_apply_when: The content class was already stated by the caller.
artifact_contract_output_type: content-class
artifact_contract_required_data:
  - the content form
  - whether it is code or docs
  - the lenses that apply to that class
artifact_contract_verified_by: the class is named before the lenses run and the applicable lenses follow from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the content before the lenses run
Classify the content — diff, source file, function, document, or ticket (initiative, epic, story, spike, bug) — and whether it is code or docs; scope rules and lens applicability both depend on it.
A document that defines behavior (a ticket, a plan, requirements) is docs that a behavioral lens may still apply to; judge by `when`.
<!-- vpmodule:atom:end classify-the-content-before-the-lenses-run -->
<!-- vpmodule:atom:begin let-each-lens-set-its-own-stance-toward-zero-findings -->
---
instruction_id: let-each-lens-set-its-own-stance-toward-zero-findings
title: Let each lens set its own stance toward zero findings
summary: Each lens has its own stance toward the content and toward finding nothing; the report says what was really found and never pads to look thorough.
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - adversarial-empty-result-policy
conditions_applies_when: A review is run by lenses that do not all share the same stance.
conditions_does_not_apply_when: Only one lens runs and its stance is already known.
artifact_contract_output_type: lens-stance
artifact_contract_required_data:
  - the stance of each lens
  - what an empty result means for each lens
artifact_contract_verified_by: "the finding count follows the stance of the lens that produced it, and nothing was padded"
compatibility_excludes:
  - review-adversarially
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-adversarial.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let each lens set its own stance toward zero findings
Report what is real — never pad to look thorough.
Each lens sets its own stance toward the content and toward zero findings: for most an empty result is valid; the adversarial lens requires at least ten concrete findings and treats an empty list as a signal to re-check; the editorial lenses hold content sacrosanct and critique only how it is organized and expressed.
<!-- vpmodule:atom:end let-each-lens-set-its-own-stance-toward-zero-findings -->
<!-- vpmodule:atom:begin report-the-review-in-one-canonical-finding-shape -->
---
instruction_id: report-the-review-in-one-canonical-finding-shape
title: Report the review in one canonical finding shape
summary: "Every finding of every lens lands in one array with the same five fields; an empty array is a valid result and no finding carries a severity, a priority or a rank."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - finding-severity-policy
  - finding-presentation-policy
  - finding-shape-policy
conditions_applies_when: A lens-based review has produced findings and they are written out.
conditions_does_not_apply_when: The findings are graded for a human report that labels every finding with a severity.
artifact_contract_output_type: lens-findings
artifact_contract_required_data:
  - the lens that produced each finding
  - the location of each finding
  - the trigger condition
  - the guard or fix
  - the potential consequence
artifact_contract_verified_by: "every finding carries the five fields and none carries a severity, a priority or a rank"
compatibility_excludes:
  - label-code-review-findings
  - format-quality-findings
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body defines a canonical structured finding schema and rendering exception, but no supported judgment, choice, ordered action sequence, or checks."
---

# Report the review in one canonical finding shape
One JSON array holding every finding from every lens. Each finding carries:
- `lens` — the code of the lens that produced it
- `location` — where in the content (file:line-range for code, section for documents)
- `trigger_condition` — the problem, or the condition that exposes it, in one line
- `guard_snippet` — the concrete fix, guard, or missing check
- `potential_consequence` — what goes wrong if it ships as-is
Each lens file refines these semantics for its findings and may add lens-specific fields (e.g. `kind`/`confidence` on deletion findings, `gap_shape`/`consumer`/`evidence` on verification-gap findings).
A lens file may instead declare its own findings shape and rendering — the editorial lenses render a findings table — and that shape wins for that lens's findings.
`[]` is valid when nothing is found. No severity, priority, or ranking anywhere.
<!-- vpmodule:atom:end report-the-review-in-one-canonical-finding-shape -->
<!-- vpmodule:atom:begin review-only-when-a-review-was-asked-for -->
---
instruction_id: review-only-when-a-review-was-asked-for
title: Review only when a review was asked for
summary: "A review runs only when the request asks for one; a request to act on earlier feedback is a change, and an uninvited review never happens."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - guidance-selection
conditions_applies_when: "A change, a pull request or an artifact could be reviewed, and it is not yet clear that a review was asked for."
conditions_does_not_apply_when: "The user asked for a review, or another skill asked for one explicitly."
artifact_contract_output_type: review-trigger
artifact_contract_required_data:
  - the ask that names the review
  - what is being reviewed
artifact_contract_verified_by: "the review runs on an explicit ask, and a request to act on feedback is handled as a change"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review-fix.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Review only when a review was asked for
Use when, and only when, the user asks you to review a diff, a pull request, or an artifact — code or documents, one or many — and actually says "review";
Directive from another skill counts as that ask.
A request to act on feedback from an earlier review is a change, not a review.
Never invoke this uninvited, including on edits you just made.
Do NOT auto-run the review from a step that was asked to fix. Require explicit user action to ensure review intent is clear.
An unattended run is the declared exception: it chains the review and the fix by itself.
<!-- vpmodule:atom:end review-only-when-a-review-was-asked-for -->
<!-- vpmodule:atom:begin run-the-lenses-by-dependency-not-by-order -->
---
instruction_id: run-the-lenses-by-dependency-not-by-order
title: "Run the lenses by dependency, not by order"
summary: A lens without a dependency never sees another lens’s findings; a lens with a dependency runs on top of the lens it names and still runs when that lens produced nothing.
capability_tags:
  - review-code
  - parallelize-tasks
pattern_tags:
  - code-review
  - parallel-execution
conditions_applies_when: Several lenses will run over the same content and some of them name the lens they build on.
conditions_does_not_apply_when: Only one lens runs.
artifact_contract_output_type: lens-run-order
artifact_contract_required_data:
  - the independent lenses
  - the dependent lenses and the lens each depends on
  - the findings each dependent lens received
artifact_contract_verified_by: "no independent lens saw another lens’s findings, and every dependent lens names what it ran on"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Run the lenses by dependency, not by order
Run the independent lenses — every selected lens without `after`. Each sees the content and `also_consider`, never another lens's findings.
Run the dependent lenses — every selected lens with `after`, once the lens it names has completed, passing that lens's findings in.
A lens whose `after` target was not selected or produced nothing still runs, with no prior findings.
Dependent lenses that name different targets are independent of each other
Launch every ready one before handling any of their results.
<!-- vpmodule:atom:end run-the-lenses-by-dependency-not-by-order -->
<!-- vpmodule:atom:begin select-the-lenses-from-the-resolved-set -->
---
instruction_id: select-the-lenses-from-the-resolved-set
title: Select the lenses from the resolved set
summary: "The lens set comes from the configuration, a lens without an instruction is disabled, an explicit request wins over the filters, and everything else runs when it applies."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - guidance-selection
conditions_applies_when: A review starts and the lenses that will run have to be decided.
conditions_does_not_apply_when: The lenses to run were already fixed by the caller.
artifact_contract_output_type: lens-set
artifact_contract_required_data:
  - the resolved lens set
  - the lenses that are disabled
  - the lenses that will run
  - why each disabled or excluded lens was left out
artifact_contract_verified_by: "every selected lens is enabled and applicable, and every lens left out is named with its reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Select the lenses from the resolved set
The lens set is not a fixed list.
Overrides add lenses and replace shipped ones.
Never claim a capability from this file; read the resolved lenses and work from those.
Select lenses from the resolved set. A lens with an empty `instruction` is disabled.
If the user or caller named lenses, run exactly those only — `applies_to` and `when` do not filter an explicit request.
Otherwise run every enabled lens whose `applies_to` covers the content class (`any` always covers) and whose `when` applies.
<!-- vpmodule:atom:end select-the-lenses-from-the-resolved-set -->