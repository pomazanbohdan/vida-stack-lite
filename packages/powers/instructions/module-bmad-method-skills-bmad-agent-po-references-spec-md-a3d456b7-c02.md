---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-spec-md-a3d456b7-c02"
title: "bmad-method: skills/bmad-agent-po/references/spec.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-agent-po/references/spec.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/spec.md\"}"
atom_ids:
  - offer-a-fast-or-a-guided-working-mode
  - put-load-bearing-detail-in-a-companion
  - record-the-gap-instead-of-inventing-the-detail
  - report-the-run-outcome-assumptions-and-open-questions
  - separate-what-consumers-read-from-what-is-only-for-audit
  - validate-the-spec-in-two-passes
  - write-only-constraints-that-bend-the-design
atom_count: 7
atoms: "[{\"atom_id\":\"offer-a-fast-or-a-guided-working-mode\",\"file_sha256\":\"b121c8c10405b9a044838c3121eeaaa809ea28c5873a6eed513829fa47eda438\",\"content_sha256\":\"bd5afc9729d1a96f81981d65a5bd0ac0dddb3eaf19bb3f66b7eb5f7830baf4a5\",\"file_bytes\":2873,\"body_bytes\":1424},{\"atom_id\":\"put-load-bearing-detail-in-a-companion\",\"file_sha256\":\"770c5b4ff56a6cbdf126bcea5a6ec55aeb107714d8af9749de7713727f424c31\",\"content_sha256\":\"7d5d9eb430bd2e24de15b2d24cfb86db620a303378913badd6bff057d01ff944\",\"file_bytes\":1777,\"body_bytes\":545},{\"atom_id\":\"record-the-gap-instead-of-inventing-the-detail\",\"file_sha256\":\"c93cb5fee29b24c11b8c9e1a121eb10473f4d27bc421a6596d672a3f009949e7\",\"content_sha256\":\"fed01840bb571544edc85132a6df95d7f8cdbbda5ea2feaaa432778d8ecee1c1\",\"file_bytes\":2258,\"body_bytes\":876},{\"atom_id\":\"report-the-run-outcome-assumptions-and-open-questions\",\"file_sha256\":\"ff9ed36ebf816c97bb12a3ee7ca28af1ea8cffd1d2f6e37adb4f9668ad2e38f2\",\"content_sha256\":\"21e226d83280ca7386051bfcb8aae51b8a269d1f2ba3b7b53b46aaf265a00f28\",\"file_bytes\":2833,\"body_bytes\":1296},{\"atom_id\":\"separate-what-consumers-read-from-what-is-only-for-audit\",\"file_sha256\":\"d7c8854269dc0c9613782d79691adc45e4c00ed860473c88b34e54337f0b5521\",\"content_sha256\":\"97eef3891bdc58835530049887ad948065ae6924ad854d37962b494b7d9c41cd\",\"file_bytes\":2691,\"body_bytes\":1293},{\"atom_id\":\"validate-the-spec-in-two-passes\",\"file_sha256\":\"bab0f5df1aa6104348e0d70b58f0b8ca52e6955f9be86b2cc518dbbb3ff24254\",\"content_sha256\":\"020e117b274546667ce40c9199cf01b2c01098cc0ccd41e9ac0bbce76e48ec19\",\"file_bytes\":1981,\"body_bytes\":868},{\"atom_id\":\"write-only-constraints-that-bend-the-design\",\"file_sha256\":\"182f0ca1e29fe8b567b4ade26596b0517a59b8af423482c0b67679cbbdb22245\",\"content_sha256\":\"05da1499fa3232ef6b532ad7b7e9b8b9a27a53d1ad8217fe98977151aba62eb7\",\"file_bytes\":1204,\"body_bytes\":231}]"
carrier_sha256: 5c678f278976160500f6feb88ecc75d333e114f130dd796d5ee38c3da0cba68b
carrier_bytes: 16630
revision: 1
status: active
---
<!-- vpmodule:atom:begin offer-a-fast-or-a-guided-working-mode -->
---
instruction_id: offer-a-fast-or-a-guided-working-mode
title: Offer a fast or a guided working mode
summary: "Offer the choice between a fast drafted path and a guided walkthrough, in the owner’s language, and reach it within two or three turns."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The picture is clear enough to start writing and the remaining gaps are known.
conditions_does_not_apply_when: The input is already rich enough to extract from without asking anything.
artifact_contract_output_type: working-mode-choice
artifact_contract_required_data:
  - the two modes and what each one costs
  - the owner’s choice
  - the entry point the chosen mode starts from
artifact_contract_verified_by: the owner picked the mode and the section order follows from the choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - product
---

# Offer a fast or a guided working mode
Get to working mode fast — two or three turns, not ten.
Users in a hurry must not be held hostage by upstream probing.
Working mode. Offer the choice in the user's language:
Fast path — I batch remaining gaps into one or two consolidated questions, then draft the full PRD with `[ASSUMPTION]` tags where I inferred.
You review and we iterate.
The initial quality depends on how much you gave me upfront.
Coaching path — we walk PM-thinking sections together.
Once chosen, I ask which entry point fits: Vision + Features (capability-first — for enterprise, dev products, internal tools, anyone who thinks in features), Journey-led (user-first — for consumer, UX-heavy, multi-stakeholder products; journeys with named protagonists carry persona context inline, no standalone persona section), or *let me suggest* based on what I heard.
The chosen entry sets the section order.
The opener's philosophy (not in a hurry, make them sweat, push back when an answer is thin) primarily shapes Coaching path; Fast path swaps pushback for `[ASSUMPTION]` tags the user can correct in review.
When input is rich, extract directly — no elicitation.
When input is sparse, choose: express (best-effort distill, every gap becomes an `open_questions[]` entry) or guided (walk the five fields with the user one at a time).
Headless defaults to express and logs the choice. Interactive asks.
<!-- vpmodule:atom:end offer-a-fast-or-a-guided-working-mode -->
<!-- vpmodule:atom:begin put-load-bearing-detail-in-a-companion -->
---
instruction_id: put-load-bearing-detail-in-a-companion
title: Put load-bearing detail in a companion
summary: "A claim is load-bearing when a consumer would change a decision without it; detail too long for one line goes in a companion beside the ticket."
capability_tags:
  - clarify-requirements
pattern_tags:
  - progressive-disclosure
  - living-specification
conditions_applies_when: Requirements or constraints are written from an input.
conditions_does_not_apply_when: The content fits one line or no consumer would change a decision without it.
artifact_contract_output_type: requirement-companion
artifact_contract_required_data:
  - the load-bearing claims
  - the companion each one went into
  - the lines left in the ticket
artifact_contract_verified_by: every load-bearing claim is in the ticket or a named companion, and no adopted companion was edited
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - engineering
---

# Put load-bearing detail in a companion
A claim is load-bearing if any consumer — a downstream skill, an implementing agent, a verification pass — would change a decision without it.
Load-bearing content that needs more than one line (tables, diagrams, long reference material) goes in a companion; a line growing sub-bullets wants one.
Spec-authored companions sit beside the ticket and `spec.md` may edit them on update.
Adopted companions such as `DESIGN.md` or an architecture spine keep their names and are never edited or duplicated.
<!-- vpmodule:atom:end put-load-bearing-detail-in-a-companion -->
<!-- vpmodule:atom:begin record-the-gap-instead-of-inventing-the-detail -->
---
instruction_id: record-the-gap-instead-of-inventing-the-detail
title: Record the gap instead of inventing the detail
summary: "Never invent the user’s detail, the metrics or the scope to fill a gap; record it as an assumption or an open question, and stop when the gaps dominate."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A gap in the input has to be closed before the work can go further.
conditions_does_not_apply_when: The input already contains the answer.
artifact_contract_output_type: recorded-gaps
artifact_contract_required_data:
  - the gap
  - the assumption or open question it became
artifact_contract_verified_by: no invented detail stands in for a gap and every gap is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/references/headless.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/add-or-update-a-host-integration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Record the gap instead of inventing the detail
Anything the caller does not provide is either inferred from inputs/workspace or recorded as `assumptions[]` / `open_questions[]` in the JSON status.
Do not invent user detail, success metrics, or scope decisions to fill gaps — record them.
A recognized domain implication the input leaves unaddressed *is* such a gap — name it as an `open_questions[]` entry (healthcare input silent on PHI/HIPAA, payments silent on PCI, control systems silent on fail-safe) and move on.
Flag it; never invent the answer or coach toward it.
If the input is genuinely too thin to distill (e.g. "an app for hikers" with no surrounding context), stop and suggest
the sibling ceremony skill.
This skill distills; it does not coach.

Where the docs do not state an axis, record the explicit `undocumented` sentinel — not a plausible default.
<!-- vpmodule:atom:end record-the-gap-instead-of-inventing-the-detail -->
<!-- vpmodule:atom:begin report-the-run-outcome-assumptions-and-open-questions -->
---
instruction_id: report-the-run-outcome-assumptions-and-open-questions
title: "Report the run outcome, the assumptions and the open questions"
summary: "End the run with a status of complete, partial or blocked, the intent, the reason when blocked, the assumptions made, the questions left open and the files touched."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A run has finished and its outcome is reported back to a caller.
conditions_does_not_apply_when: The run is still in progress.
artifact_contract_output_type: run-outcome
artifact_contract_required_data:
  - the status
  - the intent
  - the reason when the status is blocked
  - the assumptions
  - the open questions
  - the files touched
artifact_contract_verified_by: "the status matches the artifact, a blocked run carries a reason, and no key is present for an artifact that was not produced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/references/headless.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/headless-schemas.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Report the run outcome, the assumptions and the open questions
Use `status: "partial"` when the artifact was produced but `open_questions[]` is non-empty or critical inputs were inferred (Create with no brief; Update with a vague signal acted on best-effort; Validate that could not load the checklist).
`complete` = stands on its own; `partial` = caller should review before downstream use; `blocked` = no artifact produced.
Always include the intent (best-guess if not certain) and a one-sentence `reason`.
`reason` — required when `status` is `"blocked"`; one-sentence explanation
`assumptions` — array of inferred values that were not directly confirmed by inputs
`open_questions` — array of items that need a human decision before the artifact can be considered final
The `intent` field must match the detected intent. Omit keys for artifacts not produced.
The contract is intentionally tiny — return the outcome and the files touched. Anything else a caller needs is inside those files
`files` lists every file written or modified in this run, in any order.
Close with the common next step: ask Sofia (`bmad-agent-po`) to write or update the initiative's requirements from the PRD; `bmad-ux` can run before or after; `bmad-architecture` reads the initiative, so Sofia goes first.
<!-- vpmodule:atom:end report-the-run-outcome-assumptions-and-open-questions -->
<!-- vpmodule:atom:begin separate-what-consumers-read-from-what-is-only-for-audit -->
---
instruction_id: separate-what-consumers-read-from-what-is-only-for-audit
title: Separate what consumers read from what is only for audit
summary: "The record the agents consume is separate from the record the humans audit: the discussion log preserves the alternatives that were considered and is never read by the agents that plan, research or execute."
capability_tags:
  - plan-implementation
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A document publishes the list of files its consumers must read.
conditions_does_not_apply_when: The document is a single file with no contract list.
artifact_contract_output_type: contract-list
artifact_contract_required_data:
  - the files the consumers must read
  - the files kept for audit
  - the files that are listed nowhere
artifact_contract_verified_by: a consumer reading only the listed contract files has the full contract
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/templates/discussion-log.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Separate what consumers read from what is only for audit
Canonical contract. This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate.
Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.
`companions:` array of `.md` files downstream MUST read alongside
the spec to have the full contract.
The split between spec-authored and adopted is implicit by path; downstream treats both the same.
`sources:` array of paths to files that were **fully absorbed** into the SPEC, with no remaining downstream value
Downstream does NOT read these.
Files that downstream still needs to read belong in `companions:`, not here.
**Do not list**
the run log, README files, organizational artifacts, or any operational record of how upstream skills produced their artifacts.
Those are not source content; they are process metadata that downstream consumers don't need.
Audit trail only. Do not use as input to planning, research, or execution agents.
Audit trail for human review (compliance, learning, retrospectives). NOT consumed by downstream agents
Decisions are captured in
this log preserves the alternatives considered.
<!-- vpmodule:atom:end separate-what-consumers-read-from-what-is-only-for-audit -->
<!-- vpmodule:atom:begin validate-the-spec-in-two-passes -->
---
instruction_id: validate-the-spec-in-two-passes
title: Validate the spec in two passes
summary: "Sweep the result in two passes — coherence against the rules, then preservation claim by claim — and record both verdicts."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A specification has been created or updated and is about to be presented.
conditions_does_not_apply_when: Nothing was written.
artifact_contract_output_type: validation-verdict
artifact_contract_required_data:
  - the coherence verdict
  - the preservation verdict
  - the wrapper-only content that was dropped
artifact_contract_verified_by: both verdicts are recorded and every dropped claim is on the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Validate the spec in two passes
After every create or update, sweep the resulting artifact in **two passes** before presenting.
Every spec must satisfy these eight rules. The operation aims for them; the self-validate sweep enforces them.
Pass 1 — Coherence. Judge the spec against Spec Law rules 1–6 and 8. For anything that fails or feels weak, attempt to fix it without inventing content the input did not support.
Calls made without direct confirmation become `assumptions[]`; gaps that could not be filled become `open_questions[]`.
Pass 2 — Preservation. Walk the source claim by claim.
Confirm each load-bearing claim landed in
the spec or a companion.
Wrapper-ceremony drops are logged under "Wrapper-only content" so the drop is on the record, not silent.
Record the verdict for each pass to
the run log.
In interactive mode, review it with the user.
<!-- vpmodule:atom:end validate-the-spec-in-two-passes -->
<!-- vpmodule:atom:begin write-only-constraints-that-bend-the-design -->
---
instruction_id: write-only-constraints-that-bend-the-design
title: Write only constraints that bend the design
summary: A constraint that rules nothing out is decoration; a constraint rules something out.
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: A specification lists constraints.
conditions_does_not_apply_when: The document carries no constraints.
artifact_contract_output_type: constraint-list
artifact_contract_required_data:
  - the constraints
  - what each one rules out
artifact_contract_verified_by: each constraint names the design it rules out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write only constraints that bend the design
Constraints actually bend design decisions. A "constraint" that rules nothing out is decoration.
A non-negotiable that bends design. If it doesn't rule anything out, it doesn't belong.
<!-- vpmodule:atom:end write-only-constraints-that-bend-the-design -->