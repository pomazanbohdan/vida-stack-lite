---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-tdd-md-dd619099-c01"
title: "gsd-core: gsd-core/references/tdd.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/tdd.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/tdd.md\"}"
atom_ids:
  - choose-test-first-only-where-the-behaviour-can-be-stated-up-front
  - give-test-first-work-its-own-plan-and-a-smaller-context-budget
  - make-the-red-failure-intentional
atom_count: 3
atoms: "[{\"atom_id\":\"choose-test-first-only-where-the-behaviour-can-be-stated-up-front\",\"file_sha256\":\"2815d25a3b2778b61fb712b412787ad19d9404165a1e785181d0bf9e02940a96\",\"content_sha256\":\"a67c43a521d6f695ad88579d7be791ea8d374bb6c12c958e589db853057014fd\",\"file_bytes\":1532,\"body_bytes\":413},{\"atom_id\":\"give-test-first-work-its-own-plan-and-a-smaller-context-budget\",\"file_sha256\":\"b21d736303b531c1517791462986520224113dd3f7ab4e70aa8b7bd98d87fb25\",\"content_sha256\":\"bcc9ef07839f99c3d6cccbbc0467e72c77b7b7aaf7269344c81789181e38e6dc\",\"file_bytes\":1597,\"body_bytes\":554},{\"atom_id\":\"make-the-red-failure-intentional\",\"file_sha256\":\"573519cd855e859b15b347a0c613fef1300e2834e6d0a0b9cac53f6632e85f85\",\"content_sha256\":\"4e5e23b7dee7695f663546d9445068289d4500bf02241210251983e26d03f48b\",\"file_bytes\":1410,\"body_bytes\":367}]"
carrier_sha256: 1fe5acca45da9fae11bcd2e678df0400ff8d141a8d7899619dd1cd7940190ab6
carrier_bytes: 5030
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-test-first-only-where-the-behaviour-can-be-stated-up-front -->
---
instruction_id: choose-test-first-only-where-the-behaviour-can-be-stated-up-front
title: Choose test first only where the behaviour can be stated up front
summary: Test-first is chosen when the behaviour can be written as an expectation before the code exists; otherwise it is added after.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-placement-strategy
conditions_applies_when: The way to build a change is being chosen.
conditions_does_not_apply_when: The behaviour is already stated as an expectation.
artifact_contract_output_type: test-first-decision
artifact_contract_required_data:
  - the expectation that could be written
  - the decision taken
artifact_contract_verified_by: the decision names the expectation or the reason no expectation could be written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/tdd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose test first only where the behaviour can be stated up front
**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
**Skip TDD (use standard plan with `type="auto"` tasks):**
- UI layout, styling, visual components
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic
- Exploratory prototyping
<!-- vpmodule:atom:end choose-test-first-only-where-the-behaviour-can-be-stated-up-front -->
<!-- vpmodule:atom:begin give-test-first-work-its-own-plan-and-a-smaller-context-budget -->
---
instruction_id: give-test-first-work-its-own-plan-and-a-smaller-context-budget
title: Give test-first work its own plan and a smaller context budget
summary: "One feature per test-first plan, and that plan gets a smaller context budget because the cycle is heavier."
capability_tags:
  - plan-implementation
pattern_tags:
  - resource-bounds
conditions_applies_when: A feature is developed test-first.
conditions_does_not_apply_when: The change is trivial enough to batch with others.
artifact_contract_output_type: test-first-plan
artifact_contract_required_data:
  - the feature
  - the context budget of the plan
artifact_contract_verified_by: the plan carries one feature and the smaller context budget
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/tdd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give test-first work its own plan and a smaller context budget
TDD work is fundamentally heavier than standard tasks—it requires 2-3 execution cycles (RED → GREEN → REFACTOR), each with file reads, test runs, and potential debugging. TDD features get dedicated plans to ensure full context is available throughout the cycle
**One feature per TDD plan.** If features are trivial enough to batch, they're trivial enough to skip TDD—use a standard plan and add tests after
TDD plans target **~40% context usage** (lower than standard plans' ~50%)
<!-- vpmodule:atom:end give-test-first-work-its-own-plan-and-a-smaller-context-budget -->
<!-- vpmodule:atom:begin make-the-red-failure-intentional -->
---
instruction_id: make-the-red-failure-intentional
title: Make the red failure intentional
summary: "The named target test must be the test that fails, on an assertion for the planned behaviour; a non-zero exit alone is not red."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test has been written and is about to be run for the first time.
conditions_does_not_apply_when: The test is being run as a regression check after the change.
artifact_contract_output_type: red-evidence
artifact_contract_required_data:
  - the target test
  - the assertion it failed on
artifact_contract_verified_by: the named target test failed on the planned assertion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/tdd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the red failure intentional
The TARGET test you named must be the test that fails, on an assertion for the planned behavior. A nonzero exit alone is NOT RED — syntax errors, zero-test discovery, fixture crashes, parser errors, and unrelated assertions are INVALID_RED and must not authorize GREEN
If test passes: feature exists or test is wrong. Investigate
<!-- vpmodule:atom:end make-the-red-failure-intentional -->