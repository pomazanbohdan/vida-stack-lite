---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-code-review-and-quality-skill-md-0a25f129-c01"
title: "addy-skills: skills/code-review-and-quality/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/code-review-and-quality/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/code-review-and-quality/SKILL.md\"}"
atom_ids:
  - approve-an-improving-change
  - check-the-authors-verification-story
  - check-the-five-quality-axes
  - count-the-concepts-a-refactor-leaves-behind
  - do-not-accept-deferred-cleanup
  - evaluate-a-dependency-before-adding-it
  - label-and-order-findings-by-leverage
  - mutate-the-change-to-test-the-test
atom_count: 8
atoms: "[{\"atom_id\":\"approve-an-improving-change\",\"file_sha256\":\"0d9e2248c8ac84578d9a733a4ed2d10607226f1f92350e92f6064e2bbf9a9195\",\"content_sha256\":\"b4ba7b91af95375ff8fada025b718a18cbb1ab1e72df8dc1de3995ce0994c802\",\"file_bytes\":1522,\"body_bytes\":389},{\"atom_id\":\"check-the-authors-verification-story\",\"file_sha256\":\"39a0a460c0488b64648fcea462c6d786f1840e1dab19163b3e24dd7a77348ab1\",\"content_sha256\":\"ace8f83b18597fe85872bf6be05a8211ade538938ab97e4c168364000c49841a\",\"file_bytes\":1318,\"body_bytes\":238},{\"atom_id\":\"check-the-five-quality-axes\",\"file_sha256\":\"ff4749f7d3eb62de70cad8b490570419e150f4e5db1cfcca49b8579d3fcbcb18\",\"content_sha256\":\"c6d906e1f0dcd79e4480b99a184471edd86f382b7a7131ab6db30f8c8efecf4d\",\"file_bytes\":4657,\"body_bytes\":3468},{\"atom_id\":\"count-the-concepts-a-refactor-leaves-behind\",\"file_sha256\":\"b5283d973b382be79ec65a5ac9f321fda1e9ec3ceeac24fef1a10059872e540a\",\"content_sha256\":\"f033413b2f7bb6e5e410f3817b270bc23b876e676e7ce5bf7092a4a8cb36a7bd\",\"file_bytes\":1730,\"body_bytes\":621},{\"atom_id\":\"do-not-accept-deferred-cleanup\",\"file_sha256\":\"accb00f761a821f634271ea22c87893c326569e7bc7aaab833011f23a6dc5b07\",\"content_sha256\":\"0683dc962199f00b8cdd9df99bcdccf174d82a53d732b0f8b0ec1c5dabd24301\",\"file_bytes\":1597,\"body_bytes\":478},{\"atom_id\":\"evaluate-a-dependency-before-adding-it\",\"file_sha256\":\"2837db39825dc6fad24b2a69d024bc0aae730b9630e05ccf628c0d66c11881a5\",\"content_sha256\":\"fc09f37505684f1e7e0a99c36c22d707628a991f1e86b7b3bd4dcb7e43f3501c\",\"file_bytes\":1613,\"body_bytes\":477},{\"atom_id\":\"label-and-order-findings-by-leverage\",\"file_sha256\":\"1eed6e7c5edf0e0e59d032a6b98a3aae4f216c5b51cca94f6c66a86cedb6830c\",\"content_sha256\":\"bc73ba2fe6de2d167005ecabb346d2351b28d50c12d7debabdc1a6a7e3987d0b\",\"file_bytes\":2270,\"body_bytes\":1108},{\"atom_id\":\"mutate-the-change-to-test-the-test\",\"file_sha256\":\"2b7495adc053380b0bc810aa1d5fefcfb55b59686ee16c962dfcd848919c25d2\",\"content_sha256\":\"be5b29538534d65b82190aed063675f3db2d5a007d70529409da5f179c265797\",\"file_bytes\":2091,\"body_bytes\":886}]"
carrier_sha256: 5e94e6c4630b3226551298fa1f0b3287de5bbf57a6739c0d5a11fb64ba46a994
carrier_bytes: 17803
revision: 1
status: active
---
<!-- vpmodule:atom:begin approve-an-improving-change -->
---
instruction_id: approve-an-improving-change
title: Approve a change that improves the codebase
summary: Approve a change that improves overall code health even when it is not the way you would have written it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is ready for a verdict and the reviewer could block it on personal preference.
conditions_does_not_apply_when: "The change contains a defect, a security hole or an unmet requirement that must be fixed first."
artifact_contract_output_type: approval-decision
artifact_contract_required_data:
  - the change
  - the effect on overall code health
  - the approval decision
artifact_contract_verified_by: "the verdict is approval or a concrete defect, never a style preference"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Approve a change that improves the codebase

**The approval standard:** Approve a change when it definitely improves overall code health, even if it isn't perfect. Perfect code doesn't exist — the goal is continuous improvement. Don't block a change because it isn't exactly how you would have written it. If it improves the codebase and follows the project's conventions, approve it.
<!-- vpmodule:atom:end approve-an-improving-change -->
<!-- vpmodule:atom:begin check-the-authors-verification-story -->
---
instruction_id: check-the-authors-verification-story
title: "Check the author's verification story"
summary: "Ask what was actually run, what passed, what was tested by hand and what the comparison shows."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review must judge the evidence behind a completed change.
conditions_does_not_apply_when: The author has already supplied the verification evidence.
artifact_contract_output_type: verification-story
artifact_contract_required_data:
  - the tests that were run
  - the build result
  - the manual verification
  - the visual evidence
artifact_contract_verified_by: "every claim of verification is answered by a run, not by an assertion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check the author's verification story

Check the author's verification story:

- What tests were run?
- Did the build pass?
- Was the change tested manually?
- Are there screenshots for UI changes?
- Is there a before/after comparison?
<!-- vpmodule:atom:end check-the-authors-verification-story -->
<!-- vpmodule:atom:begin check-the-five-quality-axes -->
---
instruction_id: check-the-five-quality-axes
title: Check the change on five quality axes
summary: "Evaluate every change on correctness, readability, architecture, security and performance before it merges. The severity labels in the gate are the corpus scale, mapped from the donor own."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is about to be reviewed and more than one kind of defect could hide in it.
conditions_does_not_apply_when: Only a mechanical format or build check is needed.
artifact_contract_output_type: multi-axis-review
artifact_contract_required_data:
  - the axes checked
  - the findings per axis
  - the verification story
  - the blocking findings
artifact_contract_verified_by: every axis was walked and the blocking findings are resolved or explicitly deferred
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check the change on five quality axes

Multi-dimensional code review with quality gates. Every change gets reviewed before merge — no exceptions. Review covers five axes: correctness, readability, architecture, security, and performance.

### 1. Correctness

Does the code do what it claims to do?

- Does it match the spec or task requirements?
- Are edge cases handled (null, empty, boundary values)?
- Are error paths handled (not just the happy path)?
- Does it pass all tests? Are the tests actually testing the right things?
- Are there off-by-one errors, race conditions, or state inconsistencies?

### 2. Readability & Simplicity

Can another engineer (or agent) understand this code without the author explaining it?

- Are names descriptive and consistent with project conventions? (No `temp`, `data`, `result` without context)
- Is the control flow straightforward (avoid nested ternaries, deep callbacks)?
- Is the code organized logically (related code grouped, clear module boundaries)?
- Are there any "clever" tricks that should be simplified?
- **Could this be done in fewer lines?** (1000 lines where 100 suffice is a failure)
- **Are abstractions earning their complexity?** (Don't generalize until the third use case)
- Would comments help clarify non-obvious intent? (But don't comment obvious code.)
- Are there dead code artifacts: no-op variables (`_unused`), backwards-compat shims, or `// removed` comments?

### 3. Architecture

Does the change fit the system's design?

- Does it follow existing patterns or introduce a new one? If new, is it justified?
- Does it maintain clean module boundaries?
- Is there code duplication that should be shared?
- Are dependencies flowing in the right direction (no circular dependencies)?
- Is the abstraction level appropriate (not over-engineered, not too coupled)?
- Are type boundaries explicit? Question gratuitous `any`/`unknown`/optional/casts and silent fallbacks that paper over an unclear invariant — making the boundary explicit often makes the surrounding control flow simpler.

### 4. Security

Does the change introduce vulnerabilities?

- Is user input validated and sanitized?
- Are secrets kept out of code, logs, and version control?
- Is authentication/authorization checked where needed?
- Are SQL queries parameterized (no string concatenation)?
- Are outputs encoded to prevent XSS?
- Are dependencies from trusted sources with no known vulnerabilities?
- Is data from external sources (APIs, logs, user content, config files) treated as untrusted?
- Are external data flows validated at system boundaries before use in logic or rendering?

### 5. Performance

Does the change introduce performance problems?

- Any N+1 query patterns?
- Any unbounded loops or unconstrained data fetching?
- Any synchronous operations that should be async?
- Any unnecessary re-renders in UI components?
- Any missing pagination on list endpoints?
- Any large objects created in hot paths?

## Verification

After review is complete:

- [ ] All Critical issues are resolved
- [ ] All Important issues are resolved or explicitly deferred with justification
- [ ] Tests pass
- [ ] Build succeeds
- [ ] The verification story is documented (what changed, how it was verified)

Review that only checks if tests pass (ignoring other axes)

"The tests pass, so it's good" | Tests are necessary but not sufficient. They don't catch architecture problems, security issues, or readability concerns.
<!-- vpmodule:atom:end check-the-five-quality-axes -->
<!-- vpmodule:atom:begin count-the-concepts-a-refactor-leaves-behind -->
---
instruction_id: count-the-concepts-a-refactor-leaves-behind
title: Count the concepts a refactor leaves behind
summary: "Judge a refactor by the number of concepts a reader must still hold, not by how much the code moved."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is presented as a refactoring that makes the code cleaner.
conditions_does_not_apply_when: The change adds new behaviour rather than restructuring what already exists.
artifact_contract_output_type: complexity-judgement
artifact_contract_required_data:
  - the concepts before
  - the concepts after
  - the verdict on complexity
artifact_contract_verified_by: "the concept count drops, or the change is named as a relocation of complexity"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Count the concepts a refactor leaves behind

Does this refactor reduce complexity or just relocate it? Count the concepts a reader must hold to follow the change. If a "cleaner" version leaves that count unchanged, it isn't cleaner — prefer the restructuring that makes whole branches, modes, or layers disappear over one that re-centralizes the same logic. Prefer deleting an abstraction to polishing it.

"The refactor makes it cleaner" | Relocating complexity isn't reducing it. If the reader still holds the same number of concepts, the structure didn't improve — look for the version where branches disappear.
<!-- vpmodule:atom:end count-the-concepts-a-refactor-leaves-behind -->
<!-- vpmodule:atom:begin do-not-accept-deferred-cleanup -->
---
instruction_id: do-not-accept-deferred-cleanup
title: Do not accept deferred cleanup
summary: "Require the cleanup now, or a filed and self-assigned bug, instead of accepting a promise to do it later."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A change leaves a known problem behind with a promise to clean it up later.
conditions_does_not_apply_when: The problem is a genuine emergency that cannot be addressed now.
artifact_contract_output_type: cleanup-decision
artifact_contract_required_data:
  - the deferred problem
  - the decision to fix it now
  - the filed bug when it is deferred
artifact_contract_verified_by: no cleanup is left as a promise; anything deferred carries a filed bug with an owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not accept deferred cleanup

**Don't accept "I'll clean it up later."** Experience shows deferred cleanup rarely happens. Require cleanup before submission unless it's a genuine emergency. If surrounding issues can't be addressed in this change, require filing a bug with self-assignment.

"We'll clean it up later" | Later never comes. The review is the quality gate — use it. Require cleanup before merge, not after.

Accepting "I'll fix it later" — it never happens
<!-- vpmodule:atom:end do-not-accept-deferred-cleanup -->
<!-- vpmodule:atom:begin evaluate-a-dependency-before-adding-it -->
---
instruction_id: evaluate-a-dependency-before-adding-it
title: Evaluate a dependency before adding it
summary: "Before a dependency is added, check the existing stack, the size, the maintenance state, the vulnerabilities and the licence."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-minimization
conditions_applies_when: A new dependency is about to be added to the project.
conditions_does_not_apply_when: No dependency is being added.
artifact_contract_output_type: dependency-evaluation
artifact_contract_required_data:
  - whether the existing stack solves it
  - the size
  - the maintenance state
  - the vulnerabilities
  - the licence
  - the decision
artifact_contract_verified_by: all five questions have an answer before the dependency enters the manifest
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Evaluate a dependency before adding it

Before adding any dependency:

1. Does the existing stack solve this? (Often it does.)
2. How large is the dependency? (Check bundle impact.)
3. Is it actively maintained? (Check last commit, open issues.)
4. Does it have known vulnerabilities? (`npm audit`)
5. What's the license? (Must be compatible with the project.)

**Rule:** Prefer standard library and existing utilities over new dependencies. Every dependency is a liability.
<!-- vpmodule:atom:end evaluate-a-dependency-before-adding-it -->
<!-- vpmodule:atom:begin label-and-order-findings-by-leverage -->
---
instruction_id: label-and-order-findings-by-leverage
title: Label every finding and order it by leverage
summary: "Give each review comment a severity label and put the findings that matter first. The labels are the corpus scale — Critical, Important, Minor — mapped from the donor own labels."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A review produced findings that the author will act on.
conditions_does_not_apply_when: There are no findings to report.
artifact_contract_output_type: labelled-findings
artifact_contract_required_data:
  - the label of each finding
  - the order of the findings
  - the action each label demands
artifact_contract_verified_by: every comment carries a label and the ordering starts with correctness and security
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Label every finding and order it by leverage

Label every comment with its severity so the author knows what's required vs optional:

| Prefix | Meaning | Author Action |
|--------|---------|---------------|
| **Critical:** | Blocks merge | Security vulnerability, data loss, broken functionality |
| **Important:** | Must address before merge | Required change |
| **Minor:** | Optional | Worth considering but not required; the author may ignore — formatting, style preferences; informational only — no action needed — context for future reference |

This prevents authors from treating all feedback as mandatory and wasting time on optional suggestions.

**Lead with what matters.** Order findings by leverage: correctness and security first, then structural regressions and missed simplifications, then everything else. Don't bury a real issue under cosmetic nits — a few high-conviction comments beat a long list. If you have one structural problem and ten nits, the structural problem *is* the review.

Review comments without severity labels — makes it unclear what's required vs optional
<!-- vpmodule:atom:end label-and-order-findings-by-leverage -->
<!-- vpmodule:atom:begin mutate-the-change-to-test-the-test -->
---
instruction_id: mutate-the-change-to-test-the-test
title: Prove the test by mutating the change
summary: "Invert one condition the change adds, run the suite, and name the missing test case when it stays green."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A review must judge whether the tests of a change would catch a regression.
conditions_does_not_apply_when: The change carries no test that could be mutated.
artifact_contract_output_type: mutation-check
artifact_contract_required_data:
  - the mutated condition
  - the suite result
  - the missing test case named
artifact_contract_verified_by: the suite was run with the mutation and the file was restored afterwards
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove the test by mutating the change

Would the tests catch a regression if the code changed?

Answer the last question by experiment, not by reading. Invert one condition the change adds (drop a negation, swap `&&` for `||`), run the suite, then restore the file from a copy. A mutation that stays green is a finding: name the test case that is missing.

- Do tests exist for the change?
- Do they test behavior (not implementation details)?
- Are edge cases covered?
- Do tests have descriptive names?
A surviving mutant is a concrete specification of missing coverage.
Treat it as a failing test, not as a metric.
The default threshold is **80 % mutation score** (killed / total mutants in the changed scope).
PRs that drop below this threshold must either add tests that kill the surviving mutants or add the specific path to the mutation configuration with a documented reason.
<!-- vpmodule:atom:end mutate-the-change-to-test-the-test -->