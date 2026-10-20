---
instruction_id: check-the-five-quality-axes
title: Check the change on five quality axes
summary: "Evaluate every change on correctness, readability, architecture, security and performance before it merges."
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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 1
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
- [ ] All Required (no-prefix) changes are resolved or explicitly deferred with justification
- [ ] Tests pass
- [ ] Build succeeds
- [ ] The verification story is documented (what changed, how it was verified)

Review that only checks if tests pass (ignoring other axes)

"The tests pass, so it's good" | Tests are necessary but not sufficient. They don't catch architecture problems, security issues, or readability concerns.
