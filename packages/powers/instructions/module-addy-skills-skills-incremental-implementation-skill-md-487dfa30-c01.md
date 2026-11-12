---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-incremental-implementation-skill-md-487dfa30-c01"
title: "addy-skills: skills/incremental-implementation/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/incremental-implementation/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/incremental-implementation/SKILL.md\"}"
atom_ids:
  - change-one-thing-per-increment
  - default-new-code-to-safe-behaviour
  - gate-incomplete-work-behind-a-flag
  - keep-each-increment-revertable
  - keep-the-project-buildable-between-increments
  - minimize-code-surface
  - run-each-check-only-when-the-code-changed
  - sequence-verifiable-units
atom_count: 8
atoms: "[{\"atom_id\":\"change-one-thing-per-increment\",\"file_sha256\":\"56bd8f1788ba92e1e3dc44eb9f47a7ed9d5a9ac98efd5dff01e754c6116b536f\",\"content_sha256\":\"cd6ac13e91395dc98920cf98856bcf1b57218144cc044fa8796dc627d3e75df8\",\"file_bytes\":1354,\"body_bytes\":260},{\"atom_id\":\"default-new-code-to-safe-behaviour\",\"file_sha256\":\"194947e7e9b80537203811dad94cdfedfa6b728a79c688fefc46c5d76d3a7ed2\",\"content_sha256\":\"e722095c9146c661d85800afd91ef89e87c74f382f60441f0459c51be4ba4d47\",\"file_bytes\":1307,\"body_bytes\":288},{\"atom_id\":\"gate-incomplete-work-behind-a-flag\",\"file_sha256\":\"90f18977393b061e44e1a315c6d2124d12df5f75a46959b655b98105e3ce031e\",\"content_sha256\":\"85d49a84b3dfd374fca185885c26013dbd3b144d35a4ba1a89844aaa671f533f\",\"file_bytes\":1559,\"body_bytes\":457},{\"atom_id\":\"keep-each-increment-revertable\",\"file_sha256\":\"75e11bea46eeef2223ac54eafcbd125a6b84321f56700a72dc423803755bb684\",\"content_sha256\":\"7471bf8d5f7c8c85069f647ae0f0b36ccd0a4ac75fe45d921a798f282eb914ad\",\"file_bytes\":1491,\"body_bytes\":377},{\"atom_id\":\"keep-the-project-buildable-between-increments\",\"file_sha256\":\"890f9f31867c7f237358841b15824ccb96cdbea8068aa035009e52f43a8e5fa9\",\"content_sha256\":\"de55d92c3860083e7f50039dc1b1bc7be62df3569332f173585988dfcc4b80de\",\"file_bytes\":1317,\"body_bytes\":183},{\"atom_id\":\"minimize-code-surface\",\"file_sha256\":\"e93deef4da74723e2be9be4db747f0fa4871e281ae8eb801262be5ed515e4c13\",\"content_sha256\":\"f6b15dd05699eaad36c609cdaa5317434a1ea181e6418828519722d453f2e7b0\",\"file_bytes\":5883,\"body_bytes\":2662},{\"atom_id\":\"run-each-check-only-when-the-code-changed\",\"file_sha256\":\"66496efbc2185bdf9bf9448060c4061380b29ba66fab1f7e64f97a7b9169a91a\",\"content_sha256\":\"ebc95a29bd8b6456bfb8f233e9c388880d37e19d64f25b141af6359f363360c1\",\"file_bytes\":1506,\"body_bytes\":357},{\"atom_id\":\"sequence-verifiable-units\",\"file_sha256\":\"e8fc5342cfb8a3204d53ceb0bba86ff5b535d90478a0b9b5282f1b28037831d2\",\"content_sha256\":\"607f6d3b9a71729cd0df2914cc96559075309fc03cf3f8f2ee88b330e4022cf6\",\"file_bytes\":3474,\"body_bytes\":2170}]"
carrier_sha256: 7862ed23f86954d1bc9f7485713fee37853840f98605f9d6668f43d9fe216a54
carrier_bytes: 18874
revision: 1
status: active
---
<!-- vpmodule:atom:begin change-one-thing-per-increment -->
---
instruction_id: change-one-thing-per-increment
title: Change one thing per increment
summary: "Each increment changes one logical thing; a new component, a refactor and a build-config change are three increments, not one."
capability_tags:
  - execute-plan
pattern_tags:
  - code-minimization
conditions_applies_when: A change is about to be made and its size has to be decided.
conditions_does_not_apply_when: "The change is a single-file, single-function edit with a minimal scope already."
artifact_contract_output_type: increment-scope
artifact_contract_required_data:
  - the one logical thing this increment changes
  - the increments it was split into
artifact_contract_verified_by: each increment changes exactly one logical thing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Change one thing per increment

Each increment changes one logical thing. Don't mix concerns:

**Bad:** One commit that adds a new component, refactors an existing one, and updates the build config.

**Good:** Three separate commits — one for each change.
<!-- vpmodule:atom:end change-one-thing-per-increment -->
<!-- vpmodule:atom:begin default-new-code-to-safe-behaviour -->
---
instruction_id: default-new-code-to-safe-behaviour
title: Default new code to safe behaviour
summary: "New code defaults to the safe, conservative behaviour; anything stronger is opt-in."
capability_tags:
  - design-structure
pattern_tags:
  - safe-defaults
conditions_applies_when: New behaviour is added and its default has to be chosen.
conditions_does_not_apply_when: The default is fixed by an existing contract or by the user.
artifact_contract_output_type: safe-default
artifact_contract_required_data:
  - the default behaviour
  - the opt-in path that changes it
artifact_contract_verified_by: the new behaviour is off or inert until it is explicitly enabled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Default new code to safe behaviour

New code should default to safe, conservative behavior:

```typescript
// Safe: disabled by default, opt-in
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```
<!-- vpmodule:atom:end default-new-code-to-safe-behaviour -->
<!-- vpmodule:atom:begin gate-incomplete-work-behind-a-flag -->
---
instruction_id: gate-incomplete-work-behind-a-flag
title: Gate incomplete work behind a flag
summary: "Merge increments of an unfinished feature behind a switch, so the incomplete work is merged but never user-visible."
capability_tags:
  - execute-plan
pattern_tags:
  - staged-exposure
conditions_applies_when: A feature is not ready for users but its increments have to be merged.
conditions_does_not_apply_when: The feature is finished and can be released as it is.
artifact_contract_output_type: feature-flag
artifact_contract_required_data:
  - the flag name
  - the condition that turns it on
  - the code guarded by it
artifact_contract_verified_by: the incomplete work is behind a switch that is off by default
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
  - operations
---

# Gate incomplete work behind a flag

If a feature isn't ready for users but you need to merge increments:

```typescript
// Feature flag for work-in-progress
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // New sharing UI
}
```

This lets you merge small increments to the main branch without exposing incomplete work.

If the feature isn't complete, it shouldn't be user-visible. Add the flag now.
<!-- vpmodule:atom:end gate-incomplete-work-behind-a-flag -->
<!-- vpmodule:atom:begin keep-each-increment-revertable -->
---
instruction_id: keep-each-increment-revertable
title: Keep each increment revertable
summary: "Every increment must be revertable on its own: additive where possible, minimal in its edits, and paired with a rollback for every migration."
capability_tags:
  - execute-plan
pattern_tags:
  - revertable-increments
conditions_applies_when: A change is about to be committed as one increment of a larger delivery.
conditions_does_not_apply_when: The change is already merged and cannot be taken back.
artifact_contract_output_type: revert-plan
artifact_contract_required_data:
  - how the increment is taken back
  - the rollback for each migration
artifact_contract_verified_by: the increment can be reverted without touching the increments around it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Keep each increment revertable

Each increment should be independently revertable:

- Additive changes (new files, new functions) are easy to revert
- Modifications to existing code should be minimal and focused
- Database migrations should have corresponding rollback migrations
- Avoid deleting something in one commit and replacing it in the same commit — separate them
<!-- vpmodule:atom:end keep-each-increment-revertable -->
<!-- vpmodule:atom:begin keep-the-project-buildable-between-increments -->
---
instruction_id: keep-the-project-buildable-between-increments
title: Keep the project buildable between increments
summary: After every increment the project must build and the existing tests must pass; never leave the codebase broken between slices.
capability_tags:
  - execute-plan
pattern_tags:
  - verification-before-completion
conditions_applies_when: Work is delivered as a sequence of increments.
conditions_does_not_apply_when: The work is a single change that is checked once at the end.
artifact_contract_output_type: green-build-state
artifact_contract_required_data:
  - the build result after the increment
  - the existing test result after the increment
artifact_contract_verified_by: the build succeeds and the existing tests pass at the end of every increment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the project buildable between increments

After each increment, the project must build and existing tests must pass. Don't leave the codebase in a broken state between slices.
<!-- vpmodule:atom:end keep-the-project-buildable-between-increments -->
<!-- vpmodule:atom:begin minimize-code-surface -->
---
instruction_id: minimize-code-surface
title: Minimize the code surface
summary: "Solve the task with the smallest complete change, reuse existing owners and checks, and cut only what the task does not need."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: You plan or make a code change inside an agreed request.
conditions_does_not_apply_when: "The decision is not agreed yet, or the work needs a separate architectural pass."
artifact_contract_output_type: minimal-change
artifact_contract_required_data:
  - change bounds
  - reused owners
  - check
  - known limits
artifact_contract_verified_by: focused tests and diff-scope review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.agents/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.clinerules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.github/copilot-instructions.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.kiro/steering/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.qoder/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.windsurf/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=AGENTS.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-laziness-protocol/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-subtract-before-you-add/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Minimize the code surface
You are a lazy senior developer. The best code is the code never written. Solve the whole problem with the least new code.
Read the task and the code it touches. List every place the change must reach: callers, tests, fixtures, configuration, exports. Check what the change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.
Take the first option that fully works. Does it need to exist? Skip features, options, and flexibility nobody asked for, and name them in one line.
Already in this codebase as a helper, component, service, or pattern? Use it the way the surrounding code does.
Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
An installed dependency? Use it. Never add a dependency for a few lines.
Can it be one line a reader gets at a glance? One line. Otherwise, the minimum code that works.
Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests, and fixtures the change breaks.
No abstraction, wrapper, type conversion, option, configuration, boilerplate, or for-later code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition.
Keep the structure the codebase already has: its layers, interfaces, and conventions.
The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
Comment only the why the code cannot show, in one line.
A bug fix greps every caller of the function it touches, then fixes the root cause once in the shared code.
Between options of equal size, take the one that is correct on edge cases.
Lazy code without its check is unfinished: new non-trivial logic leaves one small test or an assert-based self-check. Trivial changes need none.
A shortcut with a known limit gets a comment in the form shortcut: the limit, when to upgrade.
Never cut validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, or anything the user asked for.
Question the request when the need does not justify a part of it, before building.
## Scope discipline
Touch only what the task requires.
Do NOT:
- "Clean up" code adjacent to your change
- Refactor imports in files you're not modifying
- Remove comments you don't fully understand
- Add features not in the spec because they "seem useful"
- Modernize syntax in files you're only reading
If you notice something worth improving outside your task scope, note it — don't fix it.
<!-- vpmodule:atom:end minimize-code-surface -->
<!-- vpmodule:atom:begin run-each-check-only-when-the-code-changed -->
---
instruction_id: run-each-check-only-when-the-code-changed
title: Run each check only when the code changed
summary: "Run a verification command after a change that could affect it, and do not repeat it while the code has not changed since."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-rerun-policy
conditions_applies_when: A verification command has just run successfully and no code has changed since.
conditions_does_not_apply_when: "The code changed since the last run, so the check has to run again."
artifact_contract_output_type: check-trigger
artifact_contract_required_data:
  - the command that was run
  - the code change that triggered it
artifact_contract_verified_by: no command was repeated without an intervening code change
compatibility_excludes:
  - verify-before-completion
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Run each check only when the code changed

Run each verification command after a change that could affect it. After a successful run, don't repeat the same command unless the code has changed since — re-running on unchanged code adds no information.

Running the same build/test command twice in a row without any intervening code change is a red flag.
<!-- vpmodule:atom:end run-each-check-only-when-the-code-changed -->
<!-- vpmodule:atom:begin sequence-verifiable-units -->
---
instruction_id: sequence-verifiable-units
title: Sequence work into verifiable units
summary: "Order work as a sequence of small units, each ending in a state you can check, and do not advance until the current one is green."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work is larger than one verifiable change.
conditions_does_not_apply_when: The work fits in one change with one check.
artifact_contract_output_type: unit-sequence
artifact_contract_required_data:
  - units
  - result of each unit
  - check
  - dependencies
artifact_contract_verified_by: each unit checked before the next one starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-sequence-verifiable-units/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/feature.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Sequence work into verifiable units
Order work as a sequence of small units, each ending in a state you can check.
Do not advance until the current one is green.
A break caught at the unit that caused it is cheap to localize.
A break caught after a batch is buried, and you have already built further on a broken base.
In a sweep, migration, or any run of similar edits, verify each change before starting the next.
Each unit is a before/after bracket: known-good state, one change, run the check, then proceed.
Rebase onto clean trunk first so every check measures against the real baseline.
When a lever does the edits, the per-unit check is nearly free; run it anyway.
In delivery, stack commits and pull requests in the order that proves the work.
The canonical shape is the failing test first, then the fix on top.
Other story orders are a subtraction before the reshape, a baseline capture before the treatment, the scaffold before the feature.
Each commit lands on its own and the sequence reads as an argument.
Sequencing those same units into a delivery a reviewer can replay turns "trust me" into "watch it go red, then green."
It complements keeping each check real and making the per-unit check cheap.
## The increment cycle
For each slice:
1. **Implement** the smallest complete piece of functionality
2. **Test** — run the test suite (or write a test if none exists)
3. **Verify** — confirm the slice works as expected (tests pass, build succeeds, manual check)
4. **Commit** — save your progress with a descriptive message
5. **Move to the next slice** — carry forward, don't restart
Any time you're tempted to write more than ~100 lines before testing, test now.
## The increment checklist
After each increment, verify with the repository's own commands:
- [ ] The change does one thing and does it completely
- [ ] All existing tests still pass (the repository's test command)
- [ ] The build succeeds (the repository's build command)
- [ ] Type checking passes, where the stack has one
- [ ] Linting passes (the repository's lint command)
- [ ] The new functionality works as expected
- [ ] The change is committed with a descriptive message
<!-- vpmodule:atom:end sequence-verifiable-units -->