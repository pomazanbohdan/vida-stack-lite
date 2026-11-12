---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-revision-md-674bbba7-c01"
title: "gsd-core: gsd-core/references/planner-revision.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:gsd-core/references/planner-revision.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-revision.md\"}"
atom_ids:
  - re-read-the-constraints-before-you-edit
  - report-a-conflict-instead-of-applying-a-conflicting-fix
  - revise-in-place-and-keep-what-was-not-flagged
  - sanitize-agent-authored-text-before-appending-it
  - satisfy-the-invariant-not-the-hint
  - treat-a-fix-hint-as-an-example-not-an-order
  - write-agent-authored-fields-as-one-sanitized-line
atom_count: 7
atoms: "[{\"atom_id\":\"re-read-the-constraints-before-you-edit\",\"file_sha256\":\"903796668b45dd74e44defe260ec3cc31e751bbbce914992b36a9371b3db667f\",\"content_sha256\":\"c787a41ee44194d63ffa79df5e2bbeb0f53cee7455dda2a22def088b7c76f426\",\"file_bytes\":1787,\"body_bytes\":690},{\"atom_id\":\"report-a-conflict-instead-of-applying-a-conflicting-fix\",\"file_sha256\":\"61f97448dc56d272168c743eaa953bb4edd44594a1317ee95dbb87891a59d0a3\",\"content_sha256\":\"2afeb33e80040e9679cf1942beffdce24f7cb664614e23b3bb69addcf7d2be43\",\"file_bytes\":2730,\"body_bytes\":1333},{\"atom_id\":\"revise-in-place-and-keep-what-was-not-flagged\",\"file_sha256\":\"68afadd48876285a9f6a310c2d6fa5afeba8c8f1b812dbfe3a4ae83b6fcae36b\",\"content_sha256\":\"39bceb44c4c4783be883c17fb795e865fae153af7389038c1f0e130347fb9d89\",\"file_bytes\":1269,\"body_bytes\":252},{\"atom_id\":\"sanitize-agent-authored-text-before-appending-it\",\"file_sha256\":\"5bc5cd5bf0705f8bed3ddfeaf8f9b60d398c628cbff791a4844f4a8d8e8e907d\",\"content_sha256\":\"6daf23cbcffef6f3288c82e614d86bbe09c5c310e219af4d2db374bda87cd6d2\",\"file_bytes\":2160,\"body_bytes\":819},{\"atom_id\":\"satisfy-the-invariant-not-the-hint\",\"file_sha256\":\"912e62f90588748093d7443d464bf78cba80431c98f8c5f106314a6e2f0cf1ba\",\"content_sha256\":\"75072c8386b1e74bcee5f56037affb52e6a501fecb043bbb7bd32edf94ddffd7\",\"file_bytes\":1934,\"body_bytes\":875},{\"atom_id\":\"treat-a-fix-hint-as-an-example-not-an-order\",\"file_sha256\":\"7a925576bc886967b568c16e5a34ffdd85426c2af1d5273b512724abb5e1575a\",\"content_sha256\":\"c63650db0b17abf21a15acb92869f468d452ca098ee605398fd7f6441665afd9\",\"file_bytes\":2153,\"body_bytes\":984},{\"atom_id\":\"write-agent-authored-fields-as-one-sanitized-line\",\"file_sha256\":\"9f8ac8323f30daa236ee5802a41a3b7126d2b8a51918276f483aa82d5913f490\",\"content_sha256\":\"971db73a2c1bb5dcf474fde97c6ef07b4b97f4d8a32c32cda418d73b457c77db\",\"file_bytes\":2015,\"body_bytes\":818}]"
carrier_sha256: a65525222a728188765963b19b022c3bfe85a0ec876330aa865bc204a6f25ecb
carrier_bytes: 15079
revision: 1
status: active
---
<!-- vpmodule:atom:begin re-read-the-constraints-before-you-edit -->
---
instruction_id: re-read-the-constraints-before-you-edit
title: Re-read the constraints before you edit
summary: "A suggestion that contradicts a locked decision or an existing constraint is reported as a conflict, not applied and not worked around."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A revision is about to be applied to an existing plan.
conditions_does_not_apply_when: The plan has no locked decision or constraint behind it.
artifact_contract_output_type: constraint-recheck
artifact_contract_required_data:
  - the constraints in force
  - the conflict
  - the issues that were applied anyway
artifact_contract_verified_by: the conflict was reported and no constraint was broken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-read the constraints before you edit
Before editing, re-read the constraints already in force
Constraints the existing plans already encode (chosen mechanism, scope boundary, must_haves)
A `fix_hint` conflicts when applying it would contradict any of those. Applying it anyway is a contract violation, not a judgement call. When a hint conflicts — or when the property is unreachable without breaking a constraint — do NOT edit around it and do NOT burn a revision iteration on it
apply every non-conflicting issue normally, and return.
A hint that merely proposes a *bigger* mechanism than needed is not a conflict. Take the smaller route under Step 2 and report it as addressed.
<!-- vpmodule:atom:end re-read-the-constraints-before-you-edit -->
<!-- vpmodule:atom:begin report-a-conflict-instead-of-applying-a-conflicting-fix -->
---
instruction_id: report-a-conflict-instead-of-applying-a-conflicting-fix
title: Report a conflict instead of applying a conflicting fix
summary: "Before editing, the locked decisions and the constraints already in force are re-read; a fix that contradicts them is reported as a conflict instead of applied, and a conflict costs no revision iteration."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A suggested fix may contradict a locked decision or a constraint the artifact already encodes.
conditions_does_not_apply_when: No constraint is in force.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the conflict and the constraint it hits
  - the alternatives considered
  - the issues that were addressed anyway
artifact_contract_verified_by: the conflicting fix was not applied and the conflict was reported instead
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Report a conflict instead of applying a conflicting fix
Before editing, re-read the constraints already in force:
- Locked decisions and deferred ideas
- Active capability / project guidance
- Constraints the existing plans already encode (chosen mechanism, scope boundary, must_haves)
A `fix_hint` conflicts when applying it would contradict any of those. Applying it anyway is a contract violation, not a judgement call.
When a hint conflicts - or when the property is unreachable without breaking a constraint - do NOT edit around it and do NOT burn a revision iteration on it:
apply every non-conflicting issue normally, and return.
A revision agent that returns
has not failed and has not stalled. Handle it BEFORE the iteration counter and the stall check - a conflict is not resolvable by re-running the same loop, so spending retry budget on it only exhausts the cap:
**Bounded - two ways, because one is evadable.**
- **Repeat.** A conflict naming the SAME `required_property` twice in a row means the chosen resolution did not take. Stop re-spawning; escalate as a stall.
- **Total.** Count every conflict return in this revision loop, whatever property each names. On the THIRD, stop and escalate - an agent that alternates property names never trips the repeat rule, so the repeat rule alone leaves the loop unbounded.
<!-- vpmodule:atom:end report-a-conflict-instead-of-applying-a-conflicting-fix -->
<!-- vpmodule:atom:begin revise-in-place-and-keep-what-was-not-flagged -->
---
instruction_id: revise-in-place-and-keep-what-was-not-flagged
title: Revise in place and keep what was not flagged
summary: Only the flagged sections are edited; the working parts of the plan survive a revision.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A plan is revised against checker findings.
conditions_does_not_apply_when: The whole plan is being written from scratch.
artifact_contract_output_type: revision-diff
artifact_contract_required_data:
  - the sections that changed
  - the sections that were preserved
artifact_contract_verified_by: no unflagged part of the plan was rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Revise in place and keep what was not flagged
**DO:** Edit specific flagged sections, preserve working parts, update waves if dependencies change.
**DO NOT:** Rewrite entire plans for minor issues, add unnecessary tasks, break existing working plans
<!-- vpmodule:atom:end revise-in-place-and-keep-what-was-not-flagged -->
<!-- vpmodule:atom:begin sanitize-agent-authored-text-before-appending-it -->
---
instruction_id: sanitize-agent-authored-text-before-appending-it
title: Sanitize agent-authored text before appending it
summary: "Agent-authored fields are collapsed to one line and stripped of a leading heading or list marker before they are appended to a shared file, so an embedded newline cannot forge an extra record."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Text an agent produced is appended to a shared file that a later reader scans.
conditions_does_not_apply_when: The text was written by you and you know every character in it.
artifact_contract_output_type: sanitized-record
artifact_contract_required_data:
  - the sanitized field
  - the record it was appended as
artifact_contract_verified_by: every appended record is one line and none of them can be read as a second record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Sanitize agent-authored text before appending it
**Sanitize before writing - the conflict text is agent-authored.** Every field comes from the producing agent. Before appending, for EACH field: collapse every newline and tab to a single space, and strip any leading `#`, `-`, `|` or backtick-fence run. Otherwise an embedded newline can forge an extra conflict-shaped record inside the owned slot. One conflict is exactly one line beginning `- [ ]`. Never append agent text verbatim, and never append a fenced block.
**Every field is one line of plain text.** No newlines inside a cell, and never begin a field with `#`, `-`, `|` or a code fence. These fields are appended to a shared markdown file that a later reader scans by heading; a field that starts a heading truncates that scan and hides conflicts below it.
<!-- vpmodule:atom:end sanitize-agent-authored-text-before-appending-it -->
<!-- vpmodule:atom:begin satisfy-the-invariant-not-the-hint -->
---
instruction_id: satisfy-the-invariant-not-the-hint
title: "Satisfy the invariant, not the hint"
summary: The property that must hold binds; the suggested route is one example of a way to reach it.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A finding arrives with the property it requires and a suggested route.
conditions_does_not_apply_when: The finding arrives without the property it requires.
artifact_contract_output_type: issue-resolution
artifact_contract_required_data:
  - the property that had to hold
  - the mechanism used
  - the finding it resolves
artifact_contract_verified_by: the property holds and the mechanism is reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Satisfy the invariant, not the hint
**What binds and what does not.** `required_property` (the invariant that must hold), `description` (the evidence it does not) and `severity` are binding. `fix_hint` is **one example** of a route to that property — an illustration, never an instruction. You address an issue by making `required_property` true; the hint's own mechanism is optional
An older checker may return an issue with no `required_property`. Derive it from `dimension` + `description` and state the derived property in your revision summary. Never treat the absence of the field as licence to apply `fix_hint` literally
**Prefer the smallest sufficient mechanism.** If a smaller change than the hint makes `required_property` true, take it — that fully addresses the issue and must be reported as addressed, naming the property satisfied and the mechanism used
<!-- vpmodule:atom:end satisfy-the-invariant-not-the-hint -->
<!-- vpmodule:atom:begin treat-a-fix-hint-as-an-example-not-an-order -->
---
instruction_id: treat-a-fix-hint-as-an-example-not-an-order
title: "Treat a fix hint as an example, not an order"
summary: "The property that must hold and the evidence that it does not are binding; the hint is one route to it, and a smaller mechanism that satisfies the property addresses the issue in full."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A checker returns an issue with a suggested fix.
conditions_does_not_apply_when: No issue was returned.
artifact_contract_output_type: addressed-issue
artifact_contract_required_data:
  - the property that had to hold
  - the mechanism that made it hold
  - the derived property when the checker omitted the field
artifact_contract_verified_by: the property holds and the reported mechanism is the one that was used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Treat a fix hint as an example, not an order
**What binds and what does not.** `required_property` (the invariant that must hold), `description` (the evidence it does not) and `severity` are binding. `fix_hint` is **one example** of a route to that property - an illustration, never an instruction. You address an issue by making `required_property` true; the hint's own mechanism is optional.
**Prefer the smallest sufficient mechanism.** If a smaller change than the hint makes `required_property` true, take it - that fully addresses the issue and must be reported as addressed, naming the property satisfied and the mechanism used.
An older checker may return an issue with no `required_property`. Derive it from `dimension` + `description` and state the derived property in your revision summary. Never treat the absence of the field as licence to apply `fix_hint` literally.
**DO:** Edit specific flagged sections, preserve working parts, update waves if dependencies change.
<!-- vpmodule:atom:end treat-a-fix-hint-as-an-example-not-an-order -->
<!-- vpmodule:atom:begin write-agent-authored-fields-as-one-sanitized-line -->
---
instruction_id: write-agent-authored-fields-as-one-sanitized-line
title: Write agent-authored fields as one sanitized line
summary: Every field the agent wrote is collapsed to one line and stripped of the characters that would forge a new record.
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: Agent-authored text is appended to a shared record.
conditions_does_not_apply_when: The text was written by you and is already known.
artifact_contract_output_type: sanitized-record-line
artifact_contract_required_data:
  - the collapsed field
  - the stripped characters
artifact_contract_verified_by: every appended field is one line and starts with the record marker
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/revision-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write agent-authored fields as one sanitized line
**Sanitize before writing — the conflict text is agent-authored.** Every field comes from the producing agent. Before appending, for EACH field: collapse every newline and tab to a single space, and strip any leading `#`, `-`, `|` or backtick-fence run
Otherwise an embedded newline can forge an extra conflict-shaped record inside the owned slot. One conflict is exactly one line beginning `- [ ]`. Never append agent text verbatim, and never append a fenced block
**Every field is one line of plain text.** No newlines inside a cell, and never begin a field with `#`, `-`, `|` or a code fence
These fields are appended to a shared markdown file that a later reader scans by heading; a field that starts a heading truncates that scan and hides conflicts below it
<!-- vpmodule:atom:end write-agent-authored-fields-as-one-sanitized-line -->