---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-code-review-and-quality-skill-md-0a25f129-c02"
title: "addy-skills: skills/code-review-and-quality/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/code-review-and-quality/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/code-review-and-quality/SKILL.md\"}"
atom_ids:
  - name-dead-code-before-removing-it
  - propose-the-structural-move
  - resolve-review-disputes-by-a-fixed-order
  - review-a-dependency-upgrade
  - review-without-rubber-stamping-or-softening
  - separate-refactoring-from-feature-work
  - size-a-change-and-split-it
  - treat-structural-drift-as-a-presumptive-blocker
atom_count: 8
atoms: "[{\"atom_id\":\"name-dead-code-before-removing-it\",\"file_sha256\":\"697da88687210b459289ec43c6d34cffd6a35549af43e04ca8dfc939bc20e5ba\",\"content_sha256\":\"e3b8e4c055807e8cb358316402ef98fc311ca759c10d98572f36acc70570db9c\",\"file_bytes\":1724,\"body_bytes\":671},{\"atom_id\":\"propose-the-structural-move\",\"file_sha256\":\"f8cad512fb8929cb310c118a4a00d9e930fa12d2064e8bfa02aa0b76ece0cca9\",\"content_sha256\":\"2f89426bd4a246249665619310d2b6fff8ea0224b4cc6232823d863c709ae51c\",\"file_bytes\":2047,\"body_bytes\":946},{\"atom_id\":\"resolve-review-disputes-by-a-fixed-order\",\"file_sha256\":\"b66307607149df325a7fde030fffff3694473070f74b5fe80aea707532ee763b\",\"content_sha256\":\"16b21dcc2893c1eb699d9311383506df00c890317fa106da6dcbb722d79f1717\",\"file_bytes\":1459,\"body_bytes\":400},{\"atom_id\":\"review-a-dependency-upgrade\",\"file_sha256\":\"4f15151a9d50c1e7f6d1e3d75ae81342099462793bd2f4e198324bb0ec3365c2\",\"content_sha256\":\"d612e28939af5f2e324d79262b6f315ced182cab1127518b9f47245f6ac1cb31\",\"file_bytes\":2786,\"body_bytes\":1670},{\"atom_id\":\"review-without-rubber-stamping-or-softening\",\"file_sha256\":\"5d0a033ba0cb4753af23164ffca00178e7e6c9ed93de87be804e92f9ce515755\",\"content_sha256\":\"a9b9acc12e3e42d923e48982fc0bf806829954a6b52074a56a7bd1965c8cce06\",\"file_bytes\":2399,\"body_bytes\":1275},{\"atom_id\":\"separate-refactoring-from-feature-work\",\"file_sha256\":\"1ede7a9c65c11c19a24612b8af08fe938d4ede2b3992bc4a30ba258717fe5418\",\"content_sha256\":\"068258456bf021e16ffd4d4ed8569fca0aefaf489a584dcc9c85bdd7b4573545\",\"file_bytes\":1943,\"body_bytes\":450},{\"atom_id\":\"size-a-change-and-split-it\",\"file_sha256\":\"f39def6fa8ec26c897b4fe2d0c098ae2e1e16df00b9a4c5266badd46af11ce83\",\"content_sha256\":\"81a042bc0b30e47c9e90af847f52218818b9d076dde80d6610e1ae9590808342\",\"file_bytes\":3246,\"body_bytes\":1879},{\"atom_id\":\"treat-structural-drift-as-a-presumptive-blocker\",\"file_sha256\":\"65b25b2287803676ca78465d132018d8dd01798efdc7ac8eb996e955ea68485e\",\"content_sha256\":\"d75f7d35e728b6112dc18de68084cbb384492db6fbea4ce11a67a713ded2b2b5\",\"file_bytes\":2156,\"body_bytes\":1005}]"
carrier_sha256: 5daed3bbaf3f21595242d34bb4cd5eaf37e6b23118bea3d45e545830470a6610
carrier_bytes: 18785
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-dead-code-before-removing-it -->
---
instruction_id: name-dead-code-before-removing-it
title: Name the dead code before removing it
summary: "After a change, list the code it orphaned explicitly and ask before removing any of it."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A refactoring or implementation change may have left code unreachable or unused.
conditions_does_not_apply_when: Nothing became orphaned.
artifact_contract_output_type: dead-code-list
artifact_contract_required_data:
  - the orphaned elements
  - what replaced each one
  - the request to remove them
artifact_contract_verified_by: every orphaned element is named and nothing was deleted without the answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Name the dead code before removing it

After any refactoring or implementation change, check for orphaned code:

1. Identify code that is now unreachable or unused
2. List it explicitly
3. **Ask before deleting:** "Should I remove these now-unused elements: [list]?"

Don't leave dead code lying around — it confuses future readers and agents. But don't silently delete things you're not sure about.

```
DEAD CODE IDENTIFIED:
- formatLegacyDate() in src/utils/date.ts — replaced by formatDate()
- OldTaskCard component in src/components/ — replaced by TaskCard
- LEGACY_API_URL constant in src/config.ts — no remaining references
→ Safe to remove these?
```
<!-- vpmodule:atom:end name-dead-code-before-removing-it -->
<!-- vpmodule:atom:begin propose-the-structural-move -->
---
instruction_id: propose-the-structural-move
title: "Propose the structural move, not just the problem"
summary: "When a review flags a structural problem, name the restructuring that removes it instead of only complaining."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review finds a structural problem in the change under review.
conditions_does_not_apply_when: The finding is a plain defect with an obvious local fix.
artifact_contract_output_type: structural-remedy
artifact_contract_required_data:
  - the structural problem
  - the named restructuring
  - why that restructuring removes it
artifact_contract_verified_by: every structural finding names a restructuring instead of only naming a smell
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

# Propose the structural move, not just the problem

When you flag a structural problem, propose the move — not just the problem. A review that only says "this is complex" leaves the author guessing. Reach for a named restructuring:

- **Replace a chain of conditionals** with a typed model or an explicit dispatcher.
- **Collapse duplicate branches** into a single clearer flow.
- **Separate orchestration from business logic** so each reads on its own.
- **Move feature-specific logic** out of a shared module into the package that owns the concept.
- **Reuse the canonical helper** instead of a bespoke near-duplicate.
- **Make a type boundary explicit** so downstream branching disappears.
- **Delete a pass-through wrapper** that adds indirection without clarifying the API.
- **Extract a helper, or split a large file** into focused modules.

Prefer the remedy that removes moving pieces over one that spreads the same complexity around.
<!-- vpmodule:atom:end propose-the-structural-move -->
<!-- vpmodule:atom:begin resolve-review-disputes-by-a-fixed-order -->
---
instruction_id: resolve-review-disputes-by-a-fixed-order
title: Resolve review disputes by a fixed order
summary: "Settle a review disagreement with technical facts first, then style guides, then design principles."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review dispute has to be settled between the reviewer and the author.
conditions_does_not_apply_when: The finding is agreed and only needs fixing.
artifact_contract_output_type: dispute-resolution
artifact_contract_required_data:
  - the disputed point
  - the level of the hierarchy it is settled at
  - the grounds
artifact_contract_verified_by: the resolution names the hierarchy level that decided it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Resolve review disputes by a fixed order

When resolving review disputes, apply this hierarchy:

1. **Technical facts and data** override opinions and preferences
2. **Style guides** are the absolute authority on style matters
3. **Software design** must be evaluated on engineering principles, not personal preference
4. **Codebase consistency** is acceptable if it doesn't degrade overall health
<!-- vpmodule:atom:end resolve-review-disputes-by-a-fixed-order -->
<!-- vpmodule:atom:begin review-a-dependency-upgrade -->
---
instruction_id: review-a-dependency-upgrade
title: Review a dependency upgrade against its changelog
summary: "Read the changelog, upgrade one dependency per change, let the tests decide, and review the lockfile diff."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-review
conditions_applies_when: "An existing dependency is upgraded, especially in a bulk bump."
conditions_does_not_apply_when: No dependency version changes.
artifact_contract_output_type: upgrade-review
artifact_contract_required_data:
  - the changelog notes read
  - the isolated upgrade
  - the suite result before and after
  - the lockfile diff
artifact_contract_verified_by: "the changelog was read, the suite was green before and after, and the lockfile diff was reviewed"
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

# Review a dependency upgrade against its changelog

**Upgrading an existing dependency** is a code change like any other, and the riskiest upgrades are the ones merged in bulk with a message like "bump deps." Review them with the same discipline:

1. **Read the changelog, not just the version number.** Semver is a promise the maintainer may not have kept — a "patch" can carry a behavioral change. For a major bump, read the migration notes and find what breaks.
2. **One dependency per change.** Upgrade and merge them individually (or in small related groups). When a bulk bump breaks the build, you've lost which package did it; a single-package change makes the cause obvious and the revert clean.
3. **Let the tests decide.** The upgrade is verified by a green suite before *and* after, not by "it installed." If coverage around the dependency's behavior is thin, that gap is the real finding — add a test first.
4. **Mind the transitive graph.** Most installed packages are ones nobody chose directly. Review the lockfile diff, not just `package.json`; a single direct bump can pull in dozens of indirect changes.
5. **Keep the lockfile honest.** Commit it, review its diff, and never hand-edit it. The lockfile is the thing that actually pins what ships.

"It's just a version bump" | A bump is a behavior change you didn't write. Read the changelog; semver doesn't guarantee no breakage.

"I'll upgrade everything in one PR to save time" | A bulk bump that breaks the build hides which package did it. One dependency per change keeps the cause and the revert clean.

A lockfile change that's hand-edited, uncommitted, or merged without reviewing its diff
<!-- vpmodule:atom:end review-a-dependency-upgrade -->
<!-- vpmodule:atom:begin review-without-rubber-stamping-or-softening -->
---
instruction_id: review-without-rubber-stamping-or-softening
title: Review without rubber-stamping or softening
summary: "State the real problem, quantify it, push back when the approach is wrong, and argue about the code not the person."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A review is written, whether the code was written by you, another agent or a human."
conditions_does_not_apply_when: Only a mechanical check with no judgement is required.
artifact_contract_output_type: honest-review
artifact_contract_required_data:
  - the real problem
  - the quantified impact where possible
  - the alternative proposed
artifact_contract_verified_by: no approval is given without evidence and no real issue is softened away
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

# Review without rubber-stamping or softening

When reviewing code — whether written by you, another agent, or a human:

- **Don't rubber-stamp.** "LGTM" without evidence of review helps no one.
- **Verify the finding before reporting it.** Check the callers, guards and tests that reach the changed code; drop the finding if they rule it out. Label a defect that already exists in the base separately from a regression this change introduces. Zero findings is a valid result; do not invent one.
- **Don't soften real issues.** "This might be a minor concern" when it's a bug that will hit production is dishonest.
- **Quantify problems when possible.** "This N+1 query will add ~50ms per item in the list" is better than "this could be slow."
- **Push back on approaches with clear problems.** Sycophancy is a failure mode in reviews. If the implementation has issues, say so directly and propose alternatives.
- **Accept override gracefully.** If the author has full context and disagrees, defer to their judgment. Comment on code, not people — reframe personal critiques to focus on the code itself.

"LGTM" without evidence of actual review

"AI-generated code is probably fine" | AI code needs more scrutiny, not less. It's confident and plausible, even when wrong.
<!-- vpmodule:atom:end review-without-rubber-stamping-or-softening -->
<!-- vpmodule:atom:begin separate-refactoring-from-feature-work -->
---
instruction_id: separate-refactoring-from-feature-work
title: Separate refactoring from feature work
summary: "Submit a refactoring and the new behaviour it carries as two changes, never as one mixed change."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A change both restructures existing code and adds or changes behaviour.
conditions_does_not_apply_when: The change is a small cleanup such as a variable rename.
artifact_contract_output_type: change-separation-decision
artifact_contract_required_data:
  - the refactoring part
  - the behaviour part
  - how they were separated
artifact_contract_verified_by: the refactoring and the behaviour are in separate changes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Separate refactoring from feature work

A change that refactors existing code and adds new behavior is two changes — submit them separately. Small cleanups (variable renaming) can be included at reviewer discretion.

A PR that refactors and adds a feature is two PRs — split them.

This makes each change easier to review, revert, and understand in history.

Refactoring is safest with a good test suite in place. Without one, add tests first.
<!-- vpmodule:atom:end separate-refactoring-from-feature-work -->
<!-- vpmodule:atom:begin size-a-change-and-split-it -->
---
instruction_id: size-a-change-and-split-it
title: Size the change and split it when it grows
summary: "Keep a change near a hundred changed lines, watch the total size of the file it lands in, and split with a named strategy."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A change is being prepared for review or commit and its size is known.
conditions_does_not_apply_when: The change is a complete file deletion or an automated refactoring a reviewer only verifies by intent.
artifact_contract_output_type: change-sizing-decision
artifact_contract_required_data:
  - the changed lines
  - the size of the file it lands in
  - the splitting strategy
  - the decomposition decision
artifact_contract_verified_by: no change exceeds the split threshold and no already-large file grows without decomposition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Size the change and split it when it grows

Small, focused changes are easier to review, faster to merge, and safer to deploy. Target these sizes:

```
~100 lines changed   → Good. Reviewable in one sitting.
~300 lines changed   → Acceptable if it's a single logical change.
~1000 lines changed  → Too large. Split it.
```

**Watch file size, not just diff size.** A small diff can still push a file past a healthy boundary — around 1000 *total* lines in a single file (distinct from the ~1000 *changed*-lines threshold above) is a common inspection signal, not a hard cap. When a change materially grows an already-large file, ask whether to extract helpers, subcomponents, or modules *first*, before piling more on. Decompose, then add.

**What counts as "one change":** A single self-contained modification that addresses one thing, includes related tests, and keeps the system functional after submission. One part of a feature — not the whole feature.

**Splitting strategies when a change is too large:**

| Strategy | How | When |
|----------|-----|------|
| **Stack** | Submit a small change, start the next one based on it | Sequential dependencies |
| **By file group** | Separate changes for groups needing different reviewers | Cross-cutting concerns |
| **Horizontal** | Create shared code/stubs first, then consumers | Layered architecture |
| **Vertical** | Break into smaller full-stack slices of the feature | Feature work |

**When large changes are acceptable:** Complete file deletions and automated refactoring where the reviewer only needs to verify intent, not every line.

Small diffs still push files past a healthy size and bolt branches onto unrelated flows. Judge the resulting structure, not the diff size.

A change that grows an already-large file instead of decomposing it

Large PRs that are "too big to review properly" (split them)
<!-- vpmodule:atom:end size-a-change-and-split-it -->
<!-- vpmodule:atom:begin treat-structural-drift-as-a-presumptive-blocker -->
---
instruction_id: treat-structural-drift-as-a-presumptive-blocker
title: Treat structural drift as a presumptive blocker
summary: Surface a simpler design for named structural drifts and escalate them only when the change makes the structure worse.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review sees one of the named structural drifts in the change.
conditions_does_not_apply_when: The drift is outside the scope of the change and cannot be touched by it.
artifact_contract_output_type: presumptive-blocker-list
artifact_contract_required_data:
  - the drift
  - the simpler design proposed
  - the escalation decision and its grounds
artifact_contract_verified_by: each drift carries a proposed simpler design and is escalated only with a stated reason
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

# Treat structural drift as a presumptive blocker

**Presumptive blockers:** surface and propose the simpler design for each of these; escalate to Required only when the change actively makes structure worse:

- a refactor that relocates complexity instead of reducing it
- a change that pushes a file past the size boundary with no decomposition
- feature logic added to a shared module
- a near-duplicate of an existing canonical helper
- a silent fallback that hides an unclear invariant

**Is a new conditional bolted onto an unrelated flow?** That's a design smell, not a nit — push the logic into its own helper, state, or policy instead of tangling an existing path.

**Do repeated conditionals on the same shape appear?** They signal a missing model or dispatcher. A "temporary" branch is usually permanent debt.

New conditionals scattered into unrelated code paths (a missing abstraction)

A bespoke helper that duplicates an existing canonical one, or feature logic placed in a shared module
<!-- vpmodule:atom:end treat-structural-drift-as-a-presumptive-blocker -->