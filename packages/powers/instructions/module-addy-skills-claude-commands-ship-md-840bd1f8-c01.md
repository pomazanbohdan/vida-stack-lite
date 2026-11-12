---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-claude-commands-ship-md-840bd1f8-c01"
title: "addy-skills: .claude/commands/ship.md module"
summary: "Carrier for 4 atomic instructions from addy-skills:.claude/commands/ship.md."
source: "{\"donor\":\"addy-skills\",\"path\":\".claude/commands/ship.md\"}"
atom_ids:
  - fan-out-independent-checks-in-one-turn
  - gate-the-review-fan-out-on-blast-radius
  - state-the-ship-decision-with-a-rollback-plan
  - verify-the-areas-the-fan-out-does-not-cover
atom_count: 4
atoms: "[{\"atom_id\":\"fan-out-independent-checks-in-one-turn\",\"file_sha256\":\"396e7dbefa050ebaf44102271a9ab821adb339624c88b0fe1fd7cb80a67ff579\",\"content_sha256\":\"1bf7852dcf30e2ea77b37d4c05ea34a7297094ecf3c4427b5f703c515e221db2\",\"file_bytes\":2324,\"body_bytes\":1073},{\"atom_id\":\"gate-the-review-fan-out-on-blast-radius\",\"file_sha256\":\"eb8e50d43e7482a2c2f2973fc74e9405035b6791e9c74fcf2789fe22c9792f9c\",\"content_sha256\":\"62140d22e2584a9b71f07f24e17863c516cd09e2eb48e70ec66b5d5cdca1a585\",\"file_bytes\":2209,\"body_bytes\":885},{\"atom_id\":\"state-the-ship-decision-with-a-rollback-plan\",\"file_sha256\":\"9e475e2f0fcad5dea2101d851e9654ac3b64b1e2f9cc805220e5eb9c2b258d36\",\"content_sha256\":\"56a3851e21f9b203640521765deb0e03ec6cb85490509aa7fbe16f2992d2496a\",\"file_bytes\":2392,\"body_bytes\":1147},{\"atom_id\":\"verify-the-areas-the-fan-out-does-not-cover\",\"file_sha256\":\"8504a3a2b837d6ae173597e8b9f7b3e99538b606a5ad452c102a2f35cb370a0f\",\"content_sha256\":\"0faf7c79ac45549a2568a7e066c529bb24830aee3d92cc73fca9266fabe81a8f\",\"file_bytes\":1526,\"body_bytes\":384}]"
carrier_sha256: bfef3c82a6d4ad88c2574d974f8da58cc82b1c0ed915c0f68a698ed77c42cea9
carrier_bytes: 9010
revision: 1
status: active
---
<!-- vpmodule:atom:begin fan-out-independent-checks-in-one-turn -->
---
instruction_id: fan-out-independent-checks-in-one-turn
title: Fan out the independent checks in one turn
summary: "Independent specialists are issued in a single turn so they truly run in parallel, they never call each other, and each returns only its own report."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several independent specialists are about to examine the same change.
conditions_does_not_apply_when: The checks depend on each other or share mutable state.
artifact_contract_output_type: fan-out-plan
artifact_contract_required_data:
  - the specialists
  - the single turn that issues them
  - the report each returns
artifact_contract_verified_by: the specialists were issued in one turn and each returned only its report
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/ship.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Fan out the independent checks in one turn
It runs three specialist personas in parallel against the current change, then merges their reports into a single go/no-go decision with a rollback plan. The personas operate independently — no shared state, no ordering — which is what makes parallel execution safe and useful here.
Spawn three subagents concurrently
using the subagent tool.
**Issue all three subagent tool
calls in a single assistant turn so they execute in parallel** — sequential calls defeat the purpose of this command.
- Subagents cannot spawn other subagents — do not let one persona delegate to another.
- Each subagent gets its own context window and returns only its report to this main session.
Once all three reports are back, the main agent (not a sub-persona) synthesizes them:

Announce skipped lenses first, then launch every active lens before handling any lens's result.

When running lenses as subagents, spawn every reviewer before reading or reacting to any of their output; begin collection and triage only once all are launched.
<!-- vpmodule:atom:end fan-out-independent-checks-in-one-turn -->
<!-- vpmodule:atom:begin gate-the-review-fan-out-on-blast-radius -->
---
instruction_id: gate-the-review-fan-out-on-blast-radius
title: Gate the review fan-out on blast radius
summary: "The parallel review is skipped only when the change touches two files or fewer, stays under fifty lines and touches no auth, payments, data access or configuration; otherwise the fan-out is the default."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A pre-ship review can either fan out to specialists or run in a single pass.
conditions_does_not_apply_when: The change is production-bound and its blast radius is non-trivial.
artifact_contract_output_type: fan-out-decision
artifact_contract_required_data:
  - the files touched
  - the size of the diff
  - the sensitive areas touched
  - the decision
artifact_contract_verified_by: the fan-out was skipped only when all three conditions hold
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/ship.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/review-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the review fan-out on blast radius
5. **Skip the fan-out only if all of the following are true:** the change touches 2 files or fewer, the diff is under 50 lines, and it does not touch auth, payments, data access, or config/env. Otherwise, default to fan-out.
The fan-out
is designed for production-bound changes — when the blast radius is non-trivial, run the parallel review even if the diff looks small.
Out of the box, you get two review depths to choose from: `quick` and `thorough`.
Quick is good enough for small simple changes or throwaway prototypes.
Thorough is highly recommended for any serious work with production consequences.
a good compromise is to default to quick reviews inside the personal development cycle (selectively bumping up to `thorough` on high risk changes)
Say `thorough` or `quick` when you invoke a skill to override its default for one run.
<!-- vpmodule:atom:end gate-the-review-fan-out-on-blast-radius -->
<!-- vpmodule:atom:begin state-the-ship-decision-with-a-rollback-plan -->
---
instruction_id: state-the-ship-decision-with-a-rollback-plan
title: State the ship decision with a rollback plan
summary: "The specialist reports are merged into one go/no-go decision with blockers, recommended fixes, acknowledged risks and a mandatory rollback plan; a critical finding makes the default verdict NO-GO."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The reports of the pre-ship checks are in and a go/no-go decision is due.
conditions_does_not_apply_when: The change is not going to production.
artifact_contract_output_type: ship-decision
artifact_contract_required_data:
  - the verdict
  - the blockers
  - the recommended fixes
  - the acknowledged risks
  - the rollback plan
artifact_contract_verified_by: "a GO carries a rollback plan with trigger conditions, procedure and recovery time objective"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
  - operations
---

# State the ship decision with a rollback plan
The rollback plan is mandatory before any GO decision.
If any persona returns a Critical finding, the default verdict is NO-GO unless the user explicitly accepts the risk.
Produce a single output:

## Ship Decision: GO | NO-GO

### Blockers (must fix before ship)
- [Source persona: Critical finding + file:line]

### Recommended fixes (should fix before ship)
- [Source persona: Important finding + file:line]

### Acknowledged risks (shipping anyway)
- [Risk + mitigation]

### Rollback plan
- Trigger conditions: [what signals would prompt rollback]
- Rollback procedure: [exact steps]
- Recovery time objective: [target]

### Specialist reports (full)
- [each specialist report]

1. **Code Quality** — Aggregate Critical/Required findings from
the code review
and any failing tests, lint, or build output. Resolve duplicates between reviewers.
2. **Security** — Promote any Critical/High
security findings to launch blockers.
Cross-reference with
the code review's security axis.
3. **Performance** — Pull from
the code review's
performance axis; cross-check Core Web Vitals if applicable.
<!-- vpmodule:atom:end state-the-ship-decision-with-a-rollback-plan -->
<!-- vpmodule:atom:begin verify-the-areas-the-fan-out-does-not-cover -->
---
instruction_id: verify-the-areas-the-fan-out-does-not-cover
title: Verify the areas the fan-out does not cover
summary: "Accessibility, infrastructure and documentation are not covered by the delegated checks, so the main agent verifies them directly."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Checks were delegated to specialists and some areas were not delegated.
conditions_does_not_apply_when: Every area was covered by a delegated check.
artifact_contract_output_type: coverage-gap-check
artifact_contract_required_data:
  - the areas the specialists do not cover
  - the direct check for each
artifact_contract_verified_by: "accessibility, infrastructure and documentation are each checked directly"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
  - operations
---

# Verify the areas the fan-out does not cover
4. **Accessibility** — Verify keyboard nav, screen reader support, contrast (not covered by the three personas — handle directly here, or invoke the accessibility checklist).
5. **Infrastructure** — Env vars, migrations, monitoring, feature flags. Verify directly.
6. **Documentation** — README, ADRs, changelog. Verify directly.
<!-- vpmodule:atom:end verify-the-areas-the-fan-out-does-not-cover -->