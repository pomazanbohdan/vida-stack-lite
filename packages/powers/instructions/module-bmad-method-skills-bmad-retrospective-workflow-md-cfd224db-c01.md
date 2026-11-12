---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-retrospective-workflow-md-cfd224db-c01"
title: "bmad-method: skills/bmad-retrospective/workflow.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-retrospective/workflow.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-retrospective/workflow.md\"}"
atom_ids:
  - attach-a-source-reference-to-every-retrospective-finding
  - check-the-body-of-work-is-finished-before-the-retro
  - consolidate-and-provenance-link-the-findings
  - exercise-the-changed-flows-end-to-end
  - record-the-assumptions-made-without-the-user
  - resume-the-retrospective-from-the-document
  - run-the-review-lenses-over-the-whole-diff
  - weight-the-analysis-by-the-going-in-concerns
atom_count: 8
atoms: "[{\"atom_id\":\"attach-a-source-reference-to-every-retrospective-finding\",\"file_sha256\":\"8e00b556f7f6a3999bd8ffd531c65e88366d46b76039c4ada0921e4a52df691a\",\"content_sha256\":\"d68170b8a0a1fe84846e7251dddadab63181587c1d2426d29cb69f6427feb1f6\",\"file_bytes\":1600,\"body_bytes\":357},{\"atom_id\":\"check-the-body-of-work-is-finished-before-the-retro\",\"file_sha256\":\"217cd0f47e5da54c22cd58d6e1d9e6679ee3c5318c317b6b9643be13e6bc3abc\",\"content_sha256\":\"7d6f605346bc8c98c9dc513e0ee3bdc722865e82b46f35b5d06c9d412e9f8949\",\"file_bytes\":2001,\"body_bytes\":755},{\"atom_id\":\"consolidate-and-provenance-link-the-findings\",\"file_sha256\":\"98ca72ed48474b04a68eb1043a2d8e86d0d5a307989a85b7bde2fa243f8404f8\",\"content_sha256\":\"47b409ea6900b92ce7fd120495bb441f61f236de05d86f6df6623f7c3ff211c3\",\"file_bytes\":1249,\"body_bytes\":150},{\"atom_id\":\"exercise-the-changed-flows-end-to-end\",\"file_sha256\":\"17d330e237ca7034418215b362939d05d17ce49e47dd2583ddf1a09889307fa3\",\"content_sha256\":\"e2bce1f4fe761b9593b2d45ff8a7d6cb933a7c1c729973ff49f56132ba24324b\",\"file_bytes\":1395,\"body_bytes\":224},{\"atom_id\":\"record-the-assumptions-made-without-the-user\",\"file_sha256\":\"fc1c90720198353086412e134a8a67a5e474141a42a8b61e466519856df6ff90\",\"content_sha256\":\"a7aa1a5a40348f65b9b9ec223d763098cc85013dffa8e5e63f01871cb35445d9\",\"file_bytes\":1793,\"body_bytes\":587},{\"atom_id\":\"resume-the-retrospective-from-the-document\",\"file_sha256\":\"2ed981ea66eff116d3d49a1dff5fe84fe1226825e047f00301116a76c9abb2c9\",\"content_sha256\":\"4ef5693c10d9a028d23ce87f7a10a3aa5aaa673e711186d5dcadaec9a3837462\",\"file_bytes\":1973,\"body_bytes\":697},{\"atom_id\":\"run-the-review-lenses-over-the-whole-diff\",\"file_sha256\":\"4904b1591537bf0b751897c1dab429a5e95a8d4b1f30a81cefccca799b4efaea\",\"content_sha256\":\"9fb2105646651eb6220578c690620ffe1dc41077376d96101feb54dba1ca58aa\",\"file_bytes\":1670,\"body_bytes\":428},{\"atom_id\":\"weight-the-analysis-by-the-going-in-concerns\",\"file_sha256\":\"d2161cd7f8dcf9dcc9914a819c43a722f83ca6bd34dc8908c00fe9dfdfe13f2c\",\"content_sha256\":\"59c33fdc8037e3e7c2e1a39c2dfa3ae1f7209de906151a315251da625a1e3430\",\"file_bytes\":1460,\"body_bytes\":334}]"
carrier_sha256: ccce1d8bef1bb3bcc027df677005f9a79a2ca4cf4d8a13c05e419bd4ea977167
carrier_bytes: 14322
revision: 1
status: active
---
<!-- vpmodule:atom:begin attach-a-source-reference-to-every-retrospective-finding -->
---
instruction_id: attach-a-source-reference-to-every-retrospective-finding
title: Attach a source reference to every retrospective finding
summary: "Every finding names the file, line, commit or log it came from; a claim that cannot be pointed at is not a finding and is dropped."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
  - code-audit
conditions_applies_when: A finding is written while a finished body of work is read back.
conditions_does_not_apply_when: The statement is not offered as a finding.
artifact_contract_output_type: sourced-finding
artifact_contract_required_data:
  - the source reference
  - the finding
artifact_contract_verified_by: "every finding names a file, line, commit or log, and no finding without one survived"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Attach a source reference to every retrospective finding
Every finding you report carries a source reference (file, line, commit, or log).
A claim you cannot point at — an invented root cause, a pattern the diff does not actually show — is not a finding. Drop it.
Every extracted learning must have source attribution back to the originating artifact
<!-- vpmodule:atom:end attach-a-source-reference-to-every-retrospective-finding -->
<!-- vpmodule:atom:begin check-the-body-of-work-is-finished-before-the-retro -->
---
instruction_id: check-the-body-of-work-is-finished-before-the-retro
title: Check the body of work is finished before the retro
summary: The work is checked for unfinished items before the retro starts; the list is put in the document either way and the machine verdict turns on it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - code-audit
conditions_applies_when: A retrospective starts and the body of work it looks back on may not be finished.
conditions_does_not_apply_when: Every item of the body of work is already known to be finished.
artifact_contract_output_type: completion-check
artifact_contract_required_data:
  - the unfinished items
  - the decision to go on anyway
  - where the list was recorded
artifact_contract_verified_by: the unfinished items are listed in the document and the machine verdict is rejected while any of them stands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check the body of work is finished before the retro
Then check the epic is actually finished before Phase 1.
When `pending_tickets` is non-empty, interactively list those tickets and ask whether to retro an unfinished epic: if the user declines, stop and report — do not enter Phase 1; if they accept, record the tickets they accepted proceeding over in the document's Epic summary.
Headless, proceed and record the same list in the Assumptions section — do not invent a confirmation.
Either way the list sits in the document, and Phase 4's machine verdict is rejected when any ticket remained unfinished
A human may override interactively.
Tickets still at `built` — finished by the build, not yet called done — are listed in Epic summary too.
<!-- vpmodule:atom:end check-the-body-of-work-is-finished-before-the-retro -->
<!-- vpmodule:atom:begin consolidate-and-provenance-link-the-findings -->
---
instruction_id: consolidate-and-provenance-link-the-findings
title: Consolidate and provenance-link the findings
summary: "The findings from every angle are merged, deduplicated and linked to their source, and a finding that cannot be tied to a source is dropped."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
  - code-audit
conditions_applies_when: The analysis angles have produced their findings.
conditions_does_not_apply_when: Only one angle ran and its findings are already the record.
artifact_contract_output_type: consolidated-findings
artifact_contract_required_data:
  - the merged findings
  - the source of each
artifact_contract_verified_by: every surviving finding names its source and no finding was kept without one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Consolidate and provenance-link the findings
Consolidate: merge, dedupe, and provenance-link findings.
Drop any finding you cannot tie to a source.
<!-- vpmodule:atom:end consolidate-and-provenance-link-the-findings -->
<!-- vpmodule:atom:begin exercise-the-changed-flows-end-to-end -->
---
instruction_id: exercise-the-changed-flows-end-to-end
title: Exercise the changed flows end to end
summary: "When the work changed runtime behavior, the changed flows are exercised end to end and what was observed is recorded; a passing test run is not a substitute."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - code-audit
conditions_applies_when: A retrospective reads back work that changed runtime behavior.
conditions_does_not_apply_when: The work changed no runtime behavior.
artifact_contract_output_type: behavior-verification
artifact_contract_required_data:
  - the flows that were exercised
  - what was observed
artifact_contract_verified_by: "the changed flows were run and the observation is recorded, or the absence of an exercise is stated"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Exercise the changed flows end to end
Behavior check (when the epic changed runtime behavior) — exercise the changed flows end to end and record what you observed.
Passing tests do not substitute for running the system.
<!-- vpmodule:atom:end exercise-the-changed-flows-end-to-end -->
<!-- vpmodule:atom:begin record-the-assumptions-made-without-the-user -->
---
instruction_id: record-the-assumptions-made-without-the-user
title: Record the assumptions made without the user
summary: "A headless run decides alone, so every choice it made alone is written into the Assumptions section and the acceptance fail-safe still applies."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - unattended-execution
  - code-audit
conditions_applies_when: A retrospective runs without a person to answer.
conditions_does_not_apply_when: The person confirmed the choices and they are recorded where the person confirmed them.
artifact_contract_output_type: assumptions-record
artifact_contract_required_data:
  - every choice made without the user
  - the machine verdict
artifact_contract_verified_by: "the Assumptions section names every choice made without the user, and none was invented as a confirmation"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record the assumptions made without the user
Headless mode.
Skip every confirmation, take the epic from the invocation, never open the team discussion, render the verdict on the evidence alone, and record each assumption made without the user (which epic was selected, the machine verdict, each proposed item) into the retrospective document's Assumptions section so the audit trail survives.
The Phase 4 acceptance fail-safe still applies in headless runs.
Headless with nothing named stops and reports.
The offer of finished epics
is a human convenience, not an automation contract.
<!-- vpmodule:atom:end record-the-assumptions-made-without-the-user -->
<!-- vpmodule:atom:begin resume-the-retrospective-from-the-document -->
---
instruction_id: resume-the-retrospective-from-the-document
title: Resume the retrospective from the document
summary: "The retrospective document is the working artifact: each phase is written into it as it finishes, and a resumed run reconciles it against the current evidence and continues at the first incomplete phase."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: "A retrospective runs, or one is resumed after an interruption."
conditions_does_not_apply_when: The run starts from nothing and the document is created for the first time.
artifact_contract_output_type: working-document
artifact_contract_required_data:
  - the document path
  - the phase each part of it records
  - the reconciliation against the current evidence
artifact_contract_verified_by: the document exists after every phase and a resumed run continues at the first incomplete phase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Resume the retrospective from the document
The retrospective document is the working artifact, not only the final output.
Once the epic is fixed, create it as a skeleton
and write each phase's result into it as you finish — inventory, then findings with sources, then dispositions and verdict.
Continuity is re-reading the file.
The document is the retrospective file named above, a fixed name so a resumed run finds it.
If it already exists, load it, reconcile its recorded state against the current evidence — the current evidence wins, since commits may have landed and questions may have been answered since — and resume at the first incomplete phase instead of redoing finished ones.
<!-- vpmodule:atom:end resume-the-retrospective-from-the-document -->
<!-- vpmodule:atom:begin run-the-review-lenses-over-the-whole-diff -->
---
instruction_id: run-the-review-lenses-over-the-whole-diff
title: Run the review lenses over the whole diff
summary: "The code lenses are run over the whole diff instead of being reimplemented, and the boundaries between the pieces of work are weighted, because no single session saw both sides."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: A retrospective reads back a body of work that spans several changes.
conditions_does_not_apply_when: The body of work is a single change that was already reviewed.
artifact_contract_output_type: diff-scope-review
artifact_contract_required_data:
  - the lenses that ran
  - the findings they produced
  - the narrowing when they could not be run
artifact_contract_verified_by: the whole diff went through the code lenses and the boundaries between the pieces of work were weighted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the review lenses over the whole diff
Diff-scope review — do not reimplement review.
Invoke the review skill
on the epic's diff for the code lenses (adversarial, edge-case, verification-gap), weighting the boundaries between tickets, where no single session ever saw both sides. Fold its findings in.
If the review skill is unavailable
run those lenses inline over the diff on a narrowed scope and record the narrowing.
<!-- vpmodule:atom:end run-the-review-lenses-over-the-whole-diff -->
<!-- vpmodule:atom:begin weight-the-analysis-by-the-going-in-concerns -->
---
instruction_id: weight-the-analysis-by-the-going-in-concerns
title: Weight the analysis by the going-in concerns
summary: "The concerns the person voiced before the retro started direct the attention of the analysis, but they never become a finding without a source."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
  - code-audit
conditions_applies_when: A retrospective starts and the person can be asked what should be weighted.
conditions_does_not_apply_when: No person is available to voice concerns.
artifact_contract_output_type: weighted-analysis
artifact_contract_required_data:
  - the concerns voiced
  - where they were applied
artifact_contract_verified_by: the concerns are applied to the analysis and no finding rests on them alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Weight the analysis by the going-in concerns
Before Phase 1, interactively invite the user's going-in concerns ("anything you want weighted — a ticket that felt rushed, a risky interaction between two tickets?").
Use any answer to focus the Phase 1–2 analysis; it directs attention but never becomes a finding without a source.
<!-- vpmodule:atom:end weight-the-analysis-by-the-going-in-concerns -->