---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-antipatterns-md-f73b0dce-c02"
title: "gsd-core: gsd-core/references/planner-antipatterns.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:gsd-core/references/planner-antipatterns.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-antipatterns.md\"}"
atom_ids:
  - never-let-a-fallback-turn-a-missing-input-into-a-passing-check
  - put-one-checkpoint-at-the-end-of-the-meaningful-work
  - reference-only-the-prior-work-the-task-actually-uses
  - run-the-internal-review-before-the-external-one-starts
  - scope-a-negative-gate-to-the-region-it-forbids
  - scope-a-negative-gate-to-the-region-not-the-whole-file
  - write-the-task-so-another-agent-needs-no-clarification
atom_count: 7
atoms: "[{\"atom_id\":\"never-let-a-fallback-turn-a-missing-input-into-a-passing-check\",\"file_sha256\":\"b848abfa3d007d00bd71dce706b55795fe2cd724c8b83afa87fb76d3d80183dd\",\"content_sha256\":\"6e9562aeb741b6923d5f85820be7f24d2fd9b30a71de6d28dcb7a15437b4f9f8\",\"file_bytes\":1887,\"body_bytes\":550},{\"atom_id\":\"put-one-checkpoint-at-the-end-of-the-meaningful-work\",\"file_sha256\":\"948fd166bd7dbaf5c798a429b96af092e9c0a523ad159350628ded581fa7ba80\",\"content_sha256\":\"d8c70c56591a7ae7f1bc3a3cb461e3699c17ea30c4cf7a90c1114e85b92f491c\",\"file_bytes\":1567,\"body_bytes\":364},{\"atom_id\":\"reference-only-the-prior-work-the-task-actually-uses\",\"file_sha256\":\"d52c3967213d6035002b0ce6fd41738074254134d2bff17ee63964f460bd176b\",\"content_sha256\":\"1b0fc02367366e8d40cc324f8e5dedd8c0e26f76687bc0962114a98561b74a89\",\"file_bytes\":1375,\"body_bytes\":306},{\"atom_id\":\"run-the-internal-review-before-the-external-one-starts\",\"file_sha256\":\"16d0e74e93c89b3dd35c8afa3952e286221e1e71f9d1797dc786fcc1dfb197af\",\"content_sha256\":\"85e236f109a120455a27b3944a9ab820d5951a015cd85220087685c347257df0\",\"file_bytes\":1508,\"body_bytes\":331},{\"atom_id\":\"scope-a-negative-gate-to-the-region-it-forbids\",\"file_sha256\":\"9b2096bbe6883c6bc3cfa57e6493ad70d9ff3d8c0651e73c7aee06ea6a8b51db\",\"content_sha256\":\"cf7a94d5d5c6048deec8276808d26d0daa42ab0625e15de1b7af30ee1b0ff19a\",\"file_bytes\":2532,\"body_bytes\":1257},{\"atom_id\":\"scope-a-negative-gate-to-the-region-not-the-whole-file\",\"file_sha256\":\"18074d7866b087a24259413d244bf33dc9bfe21ae431a221d8579334e9007dec\",\"content_sha256\":\"6c681868ec653a383362b4d5b6c17d28f05560d3b6c20bf852ee37769185822c\",\"file_bytes\":1823,\"body_bytes\":655},{\"atom_id\":\"write-the-task-so-another-agent-needs-no-clarification\",\"file_sha256\":\"474d3808623b551452727e35a9092ad56e5c1f23efe711527d50e4f0afccc0af\",\"content_sha256\":\"e16865ec304d01f761b2c3df106fc714bd84ca49395165bb6f670bf438c61f7f\",\"file_bytes\":2121,\"body_bytes\":975}]"
carrier_sha256: 14367b6621cd193440db7f74c20a8e0f171cf57ab34d5ae22c1d8f242e0a8b65
carrier_bytes: 13966
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-let-a-fallback-turn-a-missing-input-into-a-passing-check -->
---
instruction_id: never-let-a-fallback-turn-a-missing-input-into-a-passing-check
title: Never let a fallback turn a missing input into a passing check
summary: A fallback that substitutes a default for a missing input turns a failed read into a passing comparison; the failure has to propagate or the check has to guard the input explicitly.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check reads an input that may be missing and compares the result against another value.
conditions_does_not_apply_when: The absence of the input is the semantic default and the result is not compared against anything.
artifact_contract_output_type: fallback-free-check
artifact_contract_required_data:
  - the fallback that was removed or kept
  - "the reason it is safe to keep, if it is kept"
artifact_contract_verified_by: "a missing input fails the check instead of making it pass, and any surviving fallback is justified"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never let a fallback turn a missing input into a passing check
`2>/dev/null || echo "0"` in an assignment that feeds a comparison converts any failure into a passing gate that measures nothing.
If files don't exist (wrong path, etc.), both sides become `"0"`. Comparison passes. Gate certifies parity while measuring nothing.
**Good - let failure propagate:**
**Good - explicit guard:**
**When `|| echo "default"` is acceptable:** only when absence is semantically the default AND the result is NOT used in a comparison that should detect absence.
<!-- vpmodule:atom:end never-let-a-fallback-turn-a-missing-input-into-a-passing-check -->
<!-- vpmodule:atom:begin put-one-checkpoint-at-the-end-of-the-meaningful-work -->
---
instruction_id: put-one-checkpoint-at-the-end-of-the-meaningful-work
title: Put one checkpoint at the end of the meaningful work
summary: Verification checkpoints belong at a natural boundary; small steps are verified in one checkpoint at the end of the meaningful work.
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
  - checkpoint-cadence-policy
conditions_applies_when: Verification checkpoints are placed among the tasks of a plan.
conditions_does_not_apply_when: The task itself needs a human decision before the next task can run.
artifact_contract_output_type: checkpoint-placement
artifact_contract_required_data:
  - the checkpoint
  - the boundary it sits on
artifact_contract_verified_by: the plan carries one checkpoint at the boundary and not one per small step
compatibility_excludes:
  - place-checkpoints-and-front-load-the-risky-work
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Put one checkpoint at the end of the meaningful work
**Why bad:** Verification fatigue. Users should not be asked to verify every small step. Combine into one checkpoint at the end of meaningful work
A plan should not interleave multiple checkpoint types with implementation tasks. Checkpoints belong at natural verification boundaries, not scattered throughout
<!-- vpmodule:atom:end put-one-checkpoint-at-the-end-of-the-meaningful-work -->
<!-- vpmodule:atom:begin reference-only-the-prior-work-the-task-actually-uses -->
---
instruction_id: reference-only-the-prior-work-the-task-actually-uses
title: Reference only the prior work the task actually uses
summary: "A plan references a prior summary only when it genuinely uses that plan's types, exports or decisions."
capability_tags:
  - plan-implementation
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The context section of a plan lists prior artifacts.
conditions_does_not_apply_when: The plan is the first in the phase.
artifact_contract_output_type: context-selection
artifact_contract_required_data:
  - the referenced prior artifacts
  - what each one is used for
artifact_contract_verified_by: every referenced prior artifact is used by the plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reference only the prior work the task actually uses
**Why bad:** Plans are often independent. Reflexive chaining (02 refs 01, 03 refs 02...) wastes context. Only reference prior SUMMARY files when the plan genuinely uses types/exports from that prior plan or a decision from it affects the current plan
<!-- vpmodule:atom:end reference-only-the-prior-work-the-task-actually-uses -->
<!-- vpmodule:atom:begin run-the-internal-review-before-the-external-one-starts -->
---
instruction_id: run-the-internal-review-before-the-external-one-starts
title: Run the internal review before the external one starts
summary: "When opening a change triggers an automatic external review, the internal review lanes run first and the change is opened only after they are applied."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Opening the change is known to trigger an automatic external review and the plan also has internal review lanes.
conditions_does_not_apply_when: There is no automatic external review on open.
artifact_contract_output_type: review-order
artifact_contract_required_data:
  - the internal review step
  - the accepted fixes
  - the moment the change is opened
artifact_contract_verified_by: the internal review and the fixes precede the opening
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run the internal review before the external one starts
The external reviewer spends its first pass on a diff the plan already expects to change
Nothing may intervene between an applicable re-check and the open. Post-open work may follow; "immediately" constrains only that gap. Opening-time properties do not justify an early PR
<!-- vpmodule:atom:end run-the-internal-review-before-the-external-one-starts -->
<!-- vpmodule:atom:begin scope-a-negative-gate-to-the-region-it-forbids -->
---
instruction_id: scope-a-negative-gate-to-the-region-it-forbids
title: Scope a negative gate to the region it forbids
summary: "A file-wide negative grep cannot say absent in one function and present in another; the gate is scoped to the region, and only an intentional split falls back to a named suppression."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Two tasks in the same phase need opposite treatment of the same construct in the same file.
conditions_does_not_apply_when: The construct is absent from the whole file.
artifact_contract_output_type: scoped-gate
artifact_contract_required_data:
  - the region the gate is scoped to
  - the check that replaces the file-wide grep
  - the marker when the split is intentional
artifact_contract_verified_by: the gate passes for the region it forbids and the sibling region keeps the construct it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope a negative gate to the region it forbids
A **negative grep** - `! grep -Eq 'PAT' file` or `grep -c 'PAT' file == 0` - asserts a construct is absent. `grep` is file-scoped by nature: it has no notion of function or region. This breaks down when a phase splits one file across parallel tasks with legitimately opposite needs for the same construct in different regions:
Both occurrences are real, correct production code in different functions of one file. A file-wide negative grep cannot say "absent in function X, present in function Y", so the two gates are mutually unsatisfiable with a direct call - the executor is pushed into an indirection whose only purpose is to relocate the matched string out of the file (pure gate-appeasement, zero behaviour change).
**The fix:** region-scope the negative gate so "absent in region X" stops implying "absent file-wide."
Both gates pass with no code restructuring. Prefer an AST/structural check or a focused unit test where region extraction is fragile.
If region-scoping is genuinely impractical and the file split is intentional, suppress the warning with a marker naming the pattern
One marker per pattern. The marker exempts only the exact pattern it names. Prefer region-scoping over suppression.
<!-- vpmodule:atom:end scope-a-negative-gate-to-the-region-it-forbids -->
<!-- vpmodule:atom:begin scope-a-negative-gate-to-the-region-not-the-whole-file -->
---
instruction_id: scope-a-negative-gate-to-the-region-not-the-whole-file
title: "Scope a negative gate to the region, not the whole file"
summary: A file-wide negative gate that a sibling region legitimately needs is unsatisfiable; scope the gate to the region instead.
capability_tags:
  - review-code
pattern_tags:
  - specification-gate
conditions_applies_when: A negative gate forbids a construct that another region of the same file legitimately contains.
conditions_does_not_apply_when: The construct is genuinely absent from the whole file.
artifact_contract_output_type: scoped-negative-gate
artifact_contract_required_data:
  - the region the gate covers
  - the construct that is banned there
  - the sibling region that needs it
artifact_contract_verified_by: the gate names a region and both regions pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope a negative gate to the region, not the whole file
A **negative grep** — `! grep -Eq 'PAT' file` or `grep -c 'PAT' file == 0` — asserts a construct is absent. `grep` is file-scoped by nature: it has no notion of function or region
A file-wide negative grep cannot say "absent in function X, present in function Y", so the two gates are mutually unsatisfiable with a direct call — the executor is pushed into an indirection whose only purpose is to relocate the matched string out of the file (pure gate-appeasement, zero behaviour change)
**The fix:** region-scope the negative gate so "absent in region X" stops implying "absent file-wide."
<!-- vpmodule:atom:end scope-a-negative-gate-to-the-region-not-the-whole-file -->
<!-- vpmodule:atom:begin write-the-task-so-another-agent-needs-no-clarification -->
---
instruction_id: write-the-task-so-another-agent-needs-no-clarification
title: Write the task so another agent needs no clarification
summary: "A task is written so that another instance can execute it without asking a clarifying question; when it cannot, the task carries the specifics instead of the intention."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A task of the plan is written.
conditions_does_not_apply_when: The task is a one-line change with nothing to clarify.
artifact_contract_output_type: executable-task
artifact_contract_required_data:
  - the task as written
  - the specifics it names
artifact_contract_verified_by: another instance could execute the task without asking a clarifying question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Write the task so another agent needs no clarification
**Specificity test:** Could a different
instance execute the task without asking clarifying questions? If not, add more detail.
| TOO VAGUE | JUST RIGHT |
|-----------|------------|
| "Add authentication" | "Add JWT auth with refresh rotation using jose library, store in httpOnly cookie, 15min access / 7day refresh" |
| "Create the API" | "Create POST /api/projects endpoint accepting {name, description}, validates name length 3-50 chars, returns 201 with project object" |
| "Style the dashboard" | "Add Tailwind classes to Dashboard.tsx: grid layout (3 cols on lg, 1 on mobile), card shadows, hover states on action buttons" |
| "Handle errors" | "Wrap API calls in try/catch, return {error: string} on 4xx/5xx, show toast via sonner on client" |
| "Set up the database" | "Add User and Project models to schema.prisma with UUID ids, email unique constraint, createdAt/updatedAt timestamps, run prisma db push" |
<!-- vpmodule:atom:end write-the-task-so-another-agent-needs-no-clarification -->