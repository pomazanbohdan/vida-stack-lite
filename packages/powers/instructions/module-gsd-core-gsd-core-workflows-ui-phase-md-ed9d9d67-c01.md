---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-ui-phase-md-ed9d9d67-c01"
title: "gsd-core: gsd-core/workflows/ui-phase.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/ui-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/ui-phase.md\"}"
atom_ids:
  - a-single-classifier-cue-is-a-signal-not-a-proof
  - an-item-without-wired-evidence-routes-to-a-human
  - replace-the-section-you-own-never-append-a-duplicate
atom_count: 3
atoms: "[{\"atom_id\":\"a-single-classifier-cue-is-a-signal-not-a-proof\",\"file_sha256\":\"d6471af0bb6b153b165c7582f65f6576389e6d6d3d8c07824c98fb4632fe0211\",\"content_sha256\":\"b19e6f0738df294500b4f419f24ce313456b53e7420cfb41ed7bb4f29767bcf8\",\"file_bytes\":1861,\"body_bytes\":678},{\"atom_id\":\"an-item-without-wired-evidence-routes-to-a-human\",\"file_sha256\":\"aa5a549291d9c275ef5c741695391ebde5f63ec90b32ccc00b7e549317b72756\",\"content_sha256\":\"85bc42667484b79c519c83fbc6c8aa6bf9597e22c05f47a04ea6ae190f597048\",\"file_bytes\":1767,\"body_bytes\":454},{\"atom_id\":\"replace-the-section-you-own-never-append-a-duplicate\",\"file_sha256\":\"f1db1e953952343bb9a2a340b637d10e9e1cf81982c491c613fc5e570d9388e1\",\"content_sha256\":\"e696c71bed91f81fa64486a7de73762e572f59ac1c20cd99bd74ee06f6e5be72\",\"file_bytes\":1577,\"body_bytes\":427}]"
carrier_sha256: 12791daaa442fd6f9995d6c6f3c0d2f5db97c415f957ab3e54605ef8010cf378
carrier_bytes: 5672
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-single-classifier-cue-is-a-signal-not-a-proof -->
---
instruction_id: a-single-classifier-cue-is-a-signal-not-a-proof
title: "A single classifier cue is a signal, not a proof"
summary: "When a heuristic matched one cue, the detected kinds are shown and the person is asked whether a real kind was missed; the heuristic alone never decides the coverage."
capability_tags:
  - harden-validation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A heuristic classifier matched an entry and the match may be incomplete.
conditions_does_not_apply_when: The classifier is exhaustive by construction.
artifact_contract_output_type: coverage-confirmation
artifact_contract_required_data:
  - the detected kinds
  - the kinds the person added
  - the union that was re-run
artifact_contract_verified_by: the detected kinds were shown and the person confirmed whether something was missed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - research
---

# A single classifier cue is a signal, not a proof
The prose classifier is heuristic and LOSSY: a surface that is genuinely both a form and a list, but whose prose trips only the form cue, under-covers — and because SOMETHING classified, no `unclassified` signal fires.
So SURFACE the detected kinds to the user (AskUserQuestion) and ask whether any real element kind was missed.
If the user ADDS a kind, re-run that element with an authored `elements` override (the union of detected + added) so the missed categories are raised.
A single tripped cue is a SIGNAL, not proof the element is only that kind — the confirm step, not the heuristic, is what makes coverage sound.
<!-- vpmodule:atom:end a-single-classifier-cue-is-a-signal-not-a-proof -->
<!-- vpmodule:atom:begin an-item-without-wired-evidence-routes-to-a-human -->
---
instruction_id: an-item-without-wired-evidence-routes-to-a-human
title: An item without wired evidence routes to a human
summary: "An item that has no check behind it is never counted as passed; it is routed to the human, and a session that observed nothing at all does not flip the report."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verdict is about to be written for an item that no check covers.
conditions_does_not_apply_when: The item is covered by a check that ran and passed.
artifact_contract_output_type: evidence-routed-verdict
artifact_contract_required_data:
  - the item
  - the check behind it
  - the route it takes when there is none
artifact_contract_verified_by: the item was routed to a human and the report was not flipped on an empty session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# An item without wired evidence routes to a human
at verify time each one with no wired evidence routes to `insufficient_spec → human_needed` — never a silent pass (#1154).
That surfacing is the intended honest-verifier behavior, not over-flagging.
Zero issues is NOT pass evidence on its own — blocked rows are not issues by this workflow's own rule, so a session that observed nothing (0 passed / 0 issues / N blocked) must NOT flip the report.
<!-- vpmodule:atom:end an-item-without-wired-evidence-routes-to-a-human -->
<!-- vpmodule:atom:begin replace-the-section-you-own-never-append-a-duplicate -->
---
instruction_id: replace-the-section-you-own-never-append-a-duplicate
title: "Replace the section you own, never append a duplicate"
summary: "A section written after a review replaces the previous version of that section; it is never appended to, and it is written after the review so a later rewrite cannot clobber it."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A generated section is written into a document that may already carry that section.
conditions_does_not_apply_when: The document never carried the section before.
artifact_contract_output_type: regenerated-section
artifact_contract_required_data:
  - the section
  - the previous version it replaces
artifact_contract_verified_by: the document carries exactly one version of the section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Replace the section you own, never append a duplicate
Run AFTER the checker approves the UI-SPEC (VERIFIED, or force-approved at step 9) — never inline during authoring, so a revision-loop researcher rewrite (step 9) cannot clobber the section and the `## UI Considerations` block is committed with the FINAL UI-SPEC.
IDEMPOTENT: if a `## UI Considerations` section already exists, REPLACE it — never append a duplicate.
<!-- vpmodule:atom:end replace-the-section-you-own-never-append-a-duplicate -->