---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-git-workflow-and-versioning-skill-md-77b53a5b-c01"
title: "addy-skills: skills/git-workflow-and-versioning/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/git-workflow-and-versioning/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/git-workflow-and-versioning/SKILL.md\"}"
atom_ids:
  - commit-each-verified-increment
  - derive-the-version-from-the-release-tag
  - ignore-generated-and-secret-files
  - keep-branches-short-lived
  - keep-each-commit-one-concern
  - report-the-change-and-what-you-left-alone
  - run-the-pre-commit-checks
  - use-version-history-to-find-the-regression
atom_count: 8
atoms: "[{\"atom_id\":\"commit-each-verified-increment\",\"file_sha256\":\"cadeef93778039819ed4a2271e3bc0f4a0b4ff20522aad4b1d46407ab8038b42\",\"content_sha256\":\"e8345693d2bf2ee0ae61e23b0cdede5c0bf8d845b10faf530ed34017a2bdb9ac\",\"file_bytes\":2975,\"body_bytes\":1517},{\"atom_id\":\"derive-the-version-from-the-release-tag\",\"file_sha256\":\"629c42e984d73ed83377db6c10202d2d4139e6337783bb6b274fa6f0f3247c31\",\"content_sha256\":\"223c6e9c1f505806e11e696ae55eef33f44648ed16945faf61e62a3f1ba6389d\",\"file_bytes\":2836,\"body_bytes\":1536},{\"atom_id\":\"ignore-generated-and-secret-files\",\"file_sha256\":\"782b6d20c9b3b2eac5698b8f236f6ad1200551019b56f2a0faef2492fb086ad8\",\"content_sha256\":\"31ce87c43ebbe75847205afe70a0b6bd149b2e7d2a6ac51ee7838bd929895077\",\"file_bytes\":1730,\"body_bytes\":571},{\"atom_id\":\"keep-branches-short-lived\",\"file_sha256\":\"9d07491c9e6b4f775eb44acfeafd5d24c368392501f0831da33d3573dbc4508d\",\"content_sha256\":\"4355aa70a92fcaf6dce171533fdf12fb0d9bc6c0df7b207dc7cb01067f84c594\",\"file_bytes\":2906,\"body_bytes\":1710},{\"atom_id\":\"keep-each-commit-one-concern\",\"file_sha256\":\"810e60b681af13e6e8f200217d87eeb6b8d1eb892456079aa937c6c02b7af98b\",\"content_sha256\":\"1cf79addf450bfd8c0870b39bdb19fa30cc167e56541ec4bd9cc532a6c123a00\",\"file_bytes\":1747,\"body_bytes\":680},{\"atom_id\":\"report-the-change-and-what-you-left-alone\",\"file_sha256\":\"97925beb0572b42ec4ea3623f7021cec47c1988825560196ec38eda29429cec7\",\"content_sha256\":\"c6a3e05bcd93602aee99e8b4c5c29c8bcd3f4957f23cbc31365d0601a803ec5e\",\"file_bytes\":2490,\"body_bytes\":1169},{\"atom_id\":\"run-the-pre-commit-checks\",\"file_sha256\":\"5c734654a131675274bcff53ae0ade43f8c3c3ce999fdc2d261dde26fa9be9f7\",\"content_sha256\":\"4fe74510f963b9af361be934f014ca4bc151803755799cb1929790193a3b7a07\",\"file_bytes\":1786,\"body_bytes\":587},{\"atom_id\":\"use-version-history-to-find-the-regression\",\"file_sha256\":\"c343972d9b5b8d290e4b069dde0b5d46a43435b52e2b51219c14c57b6d6861d3\",\"content_sha256\":\"77e55f1c533ec3120e07371f9b2e421b2b6a5ab0dfbb490a91b84db501de93ad\",\"file_bytes\":1609,\"body_bytes\":500}]"
carrier_sha256: e98ff970485d7119d4d50ffad7840fb689af3942a797629862a04cbba2d87234
carrier_bytes: 19068
revision: 1
status: active
---
<!-- vpmodule:atom:begin commit-each-verified-increment -->
---
instruction_id: commit-each-verified-increment
title: Commit each verified increment
summary: "Commit every increment that passes its checks, so a failure costs one increment instead of the whole piece of work."
capability_tags:
  - integrate-branch
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verified increment of work is ready to be recorded.
conditions_does_not_apply_when: The increment does not pass its checks yet.
artifact_contract_output_type: commit-rhythm
artifact_contract_required_data:
  - the increment
  - the check it passed
  - the commit
artifact_contract_verified_by: each commit follows a green check and no uncommitted work piles up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/validate-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/git-integration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Commit each verified increment

Each successful increment gets its own commit. Don't accumulate large uncommitted changes.

```
Work pattern:
  Implement slice → Test → Verify → Commit → Next slice

Not this:
  Implement everything → Hope it works → Giant commit
```

Commits are save points. If the next change breaks something, you can revert to the last known-good state instantly.

```
Agent starts work
    │
    ├── Makes a change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → All commits form a clean history
```

This pattern means you never lose more than one increment of work. If an agent goes off the rails, `git reset --hard HEAD` takes you back to the last successful state.

"I'll commit when the feature is done" | One giant commit is impossible to review, debug, or revert. Commit each slice.

Large uncommitted changes accumulating.
Chunked mode splits the single planner run into a short outline run + N short per-plan runs
committing each plan individually for crash resilience
git add {test_files}
git commit -m "test(phase-${PHASE}): add Nyquist validation tests"
Commit outcomes, not process.
The git log should read like a changelog of what shipped, not a diary of planning activity.
Key principle: Commit working code and shipped outcomes, not planning process.
Each plan produces 2-4 commits (tasks + metadata). Clear, granular, bisectable.
<!-- vpmodule:atom:end commit-each-verified-increment -->
<!-- vpmodule:atom:begin derive-the-version-from-the-release-tag -->
---
instruction_id: derive-the-version-from-the-release-tag
title: Derive the version from the release tag
summary: Tag the release as an immutable point in history and derive the version from that tag instead of editing it by hand.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A release is cut and its version has to be fixed in one place.
conditions_does_not_apply_when: The project has no released artifact.
artifact_contract_output_type: release-tag
artifact_contract_required_data:
  - the tag
  - the version derived from it
  - the files that carry the version
artifact_contract_verified_by: "the artifact, the tag and the changelog agree on one version"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=VERSIONING.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/adr/218-release-version-validation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the version from the release tag

A release is an immutable point in history, not a moving branch. Tag it so it can always be reproduced:

```
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

Derive the version from the tag rather than hand-editing it in scattered files, so the artifact, the tag, and the changelog can never disagree.

A release with no tag, or a version number hand-edited out of sync with the tag
The version travels with the release: derive it once and let the artifacts follow.
Major and minor releases use different pre-release types:
Minor: 1.28.0-rc.1  →  1.28.0-rc.2  →  1.28.0
Major: 2.0.0-beta.1 →  2.0.0-beta.2 →  2.0.0
Validate the version before you spend the release cycle on it.
Replace `^[0-9]+\.[0-9]+\.0$` with `^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.0$`.
Each segment now matches either `0` exactly or a string starting with a non-zero digit followed by zero or more digits.
`1.01.0` fails because the minor segment `01` matches neither alternative.
The error message includes the offending value so maintainers can correct it immediately.
Downstream steps silently normalized the version `1.01.0` to `1.1.0` per the semver specification (leading zeros are stripped).
Reject an already-published version at validation time.
If the version resolves in the registry, the release fails in under 5 seconds with a clear error.
No build or test cycle is wasted.
The late dry-run check is unchanged.
It remains a belt-and-suspenders guard; the new precheck does not remove it.
<!-- vpmodule:atom:end derive-the-version-from-the-release-tag -->
<!-- vpmodule:atom:begin ignore-generated-and-secret-files -->
---
instruction_id: ignore-generated-and-secret-files
title: Ignore generated and secret files
summary: "Commit generated files only when the project expects them, and keep build output, environment files and local settings out of the tree."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Files are about to be added to the tree or the ignore list is being set up.
conditions_does_not_apply_when: No file is being added and the ignore list is already in place.
artifact_contract_output_type: ignore-list
artifact_contract_required_data:
  - the generated files kept
  - the excluded paths
  - the ignore entries
artifact_contract_verified_by: the ignore list covers the standard exclusions and no secret or build output is tracked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Ignore generated and secret files

- **Commit generated files** only if the project expects them (e.g., `package-lock.json`, Prisma migrations)
- **Don't commit** build output (`dist/`, `.next/`), environment files (`.env`), or IDE config (`.vscode/settings.json` unless shared)
- **Have a `.gitignore`** that covers: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.pem`

"I don't need a .gitignore" | Until `.env` with production secrets gets committed. Set it up immediately.

No `.gitignore` in the project

Committing `node_modules/`, `.env`, or build artifacts
<!-- vpmodule:atom:end ignore-generated-and-secret-files -->
<!-- vpmodule:atom:begin keep-branches-short-lived -->
---
instruction_id: keep-branches-short-lived
title: Keep branches short-lived
summary: "Cut branches from the trunk, merge them back within days, and delete them after the merge."
capability_tags:
  - integrate-branch
pattern_tags:
  - short-lived-branches
conditions_applies_when: A branch is created for new work and will be merged later.
conditions_does_not_apply_when: The branch is a release branch or a deliberately long-lived line of work.
artifact_contract_output_type: branch-lifecycle
artifact_contract_required_data:
  - the base branch
  - the branch name
  - the merge and delete decision
artifact_contract_verified_by: "the branch is cut from the trunk, named by its kind and deleted after the merge"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep branches short-lived

Keep `main` always deployable. Work in short-lived feature branches that merge back within 1-3 days. Long-lived development branches are hidden costs — they diverge, create merge conflicts, and delay integration. DORA research consistently shows trunk-based development correlates with high-performing engineering teams.

- **Dev branches are costs.** Every day a branch lives, it accumulates merge risk.
- **Release branches are acceptable.** When you need to stabilize a release while main moves forward.
- **Feature flags > long branches.** Prefer deploying incomplete work behind flags rather than keeping it on a branch for weeks.

This is the recommended default. Teams using gitflow or long-lived branches can adapt the principles (atomic commits, small changes, descriptive messages) to their branching model — the commit discipline matters more than the specific branching strategy.

- Branch from `main` (or the team's default branch)
- Delete branches after merge

Branch naming:

```
feature/<short-description>   → feature/task-creation
fix/<short-description>       → fix/duplicate-tasks
chore/<short-description>     → chore/update-deps
refactor/<short-description>  → refactor/auth-module
```

Long-lived branches that diverge significantly from main
must fork off the project's default branch (`origin/HEAD`), not off whatever HEAD happens to be checked out — otherwise consecutive quick tasks compound on top of each other and stay unpushed
already exists locally, reuse it as-is so resumed work is not rebased
Resolve the remote/network issue and retry.
All quick-task commits for this run stay on that branch. User handles merge/rebase afterward.
<!-- vpmodule:atom:end keep-branches-short-lived -->
<!-- vpmodule:atom:begin keep-each-commit-one-concern -->
---
instruction_id: keep-each-commit-one-concern
title: Keep each commit one concern
summary: "Each commit does one logical thing, and formatting, refactoring and behaviour changes never share a commit."
capability_tags:
  - integrate-branch
pattern_tags:
  - code-minimization
conditions_applies_when: A commit is being written and its content can hold more than one kind of change.
conditions_does_not_apply_when: The commit already carries a single logical change.
artifact_contract_output_type: atomic-commit
artifact_contract_required_data:
  - the one logical thing the commit does
  - the changes kept out of it
artifact_contract_verified_by: the commit can be described in one line and holds one kind of change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep each commit one concern

Each commit does one logical thing:

```
# Good: Each commit is self-contained
a1b2c3d Add task creation endpoint with validation
d4e5f6g Add task creation form component
h7i8j9k Connect form to API and add loading state
m1n2o3p Add task creation tests (unit + integration)

# Bad: Everything mixed together
x1y2z3a Add task feature, fix sidebar, update deps, refactor utils
```

Don't combine formatting changes with behavior changes. Don't combine refactors with features. Each type of change should be a separate commit — and ideally a separate PR:

Commit messages like "fix", "update", "misc"

Formatting changes mixed with behavior changes
<!-- vpmodule:atom:end keep-each-commit-one-concern -->
<!-- vpmodule:atom:begin report-the-change-and-what-you-left-alone -->
---
instruction_id: report-the-change-and-what-you-left-alone
title: Report the change and what you left alone
summary: "Summarise what changed, what was deliberately not touched and what concerns the change raises."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A modification is finished and its scope must be visible to a reviewer.
conditions_does_not_apply_when: Nothing was modified.
artifact_contract_output_type: change-summary
artifact_contract_required_data:
  - the changes made
  - the things deliberately left untouched
  - the potential concerns
artifact_contract_verified_by: "the summary names the changes, the deliberate omissions and the concerns"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/test-completed-work.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report the change and what you left alone

After any modification, provide a structured summary. This makes review easier, documents scope discipline, and surfaces unintended changes:

```
CHANGES MADE:
- src/routes/tasks.ts: Added validation middleware to POST endpoint
- src/lib/validation.ts: Added TaskCreateSchema using Zod

THINGS I DIDN'T TOUCH (intentionally):
- src/routes/auth.ts: Has similar validation gap but out of scope
- src/middleware/error.ts: Error format could be improved (separate task)

POTENTIAL CONCERNS:
- The Zod schema is strict — rejects extra fields. Confirm this is desired.
- Added zod as a dependency (72KB gzipped) — already in package.json
```

This pattern catches wrong assumptions early and gives reviewers a clear map of the change. The "DIDN'T TOUCH" section is especially important — it shows you exercised scope discipline and didn't go on an unsolicited renovation.
Report in chat — what is covered, what is not and why, any bugs, and the command that runs the new tests.
A report in chat; no summary file
Report the paths that are neither transient nor structural, so the user can choose the strict mode knowingly.
<!-- vpmodule:atom:end report-the-change-and-what-you-left-alone -->
<!-- vpmodule:atom:begin run-the-pre-commit-checks -->
---
instruction_id: run-the-pre-commit-checks
title: Run the pre-commit checks
summary: "Before every commit, look at the staged diff, scan it for secrets, and run the tests, the linter and the type check."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A commit is about to be created.
conditions_does_not_apply_when: No commit is being created.
artifact_contract_output_type: pre-commit-checklist
artifact_contract_required_data:
  - the staged diff reviewed
  - the secret scan result
  - the test result
  - the lint result
  - the type check result
artifact_contract_verified_by: all five checks ran and their results are known before the commit is made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Run the pre-commit checks

Before every commit:

```bash
# 1. Check what you're about to commit
git diff --staged

# 2. Ensure no secrets (lists matching file names only — any output means review them)
git diff --staged -i -G'password|secret|api_key|token' --name-only

# 3. Run tests
npm test

# 4. Run linting
npm run lint

# 5. Run type checking
npx tsc --noEmit
```

Automate this with git hooks:
Hooks should run so issues surface at the introducing commit, and silent bypass violates the project guidance.
Do NOT use `--no-verify` by default
Budget 1-2 retry cycles per commit
<!-- vpmodule:atom:end run-the-pre-commit-checks -->
<!-- vpmodule:atom:begin use-version-history-to-find-the-regression -->
---
instruction_id: use-version-history-to-find-the-regression
title: Use version history to find the regression
summary: "Bisect to the commit that broke things, read what changed recently, blame a line and search the commit messages."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A defect appeared and the commit that introduced it has to be found.
conditions_does_not_apply_when: The defect is present in the first commit of the history.
artifact_contract_output_type: history-locate
artifact_contract_required_data:
  - the good and bad commits
  - the bisect result
  - the commit that introduced the defect
artifact_contract_verified_by: the bisect ended on one commit and the test was run at each step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Use version history to find the regression

Find which commit introduced a bug:

```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
```

Git checkouts midpoints; run your test at each to narrow down.

View what changed recently:

```bash
git log --oneline -20
git diff HEAD~5..HEAD -- src/
```

Find who last changed a specific line:

```bash
git blame src/services/task.ts
```

Search commit messages for a keyword:

```bash
git log --grep="validation" --oneline
```
<!-- vpmodule:atom:end use-version-history-to-find-the-regression -->