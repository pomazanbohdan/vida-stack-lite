---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-constraint-driven-development-skill-md-ea51c563-c01"
title: "addy-skills: skills/constraint-driven-development/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/constraint-driven-development/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/constraint-driven-development/SKILL.md\"}"
atom_ids:
  - give-every-question-a-default
  - hold-the-measured-baseline
  - judge-a-check-for-circularity
  - name-the-check-behind-every-threshold
  - place-slow-checks-outside-the-edit-loop
  - scope-the-check-to-the-change
  - separate-facts-from-decisions
  - watch-for-the-moves-that-lower-the-bar
atom_count: 8
atoms: "[{\"atom_id\":\"give-every-question-a-default\",\"file_sha256\":\"57af1427ad17620621614debb8ff09d5965f46299451aed78c59513a4e827277\",\"content_sha256\":\"b15c01fec830896e938fb7872b0bc440fb7e4e36c46a61656ad930a4b28efd83\",\"file_bytes\":2963,\"body_bytes\":1738},{\"atom_id\":\"hold-the-measured-baseline\",\"file_sha256\":\"1366fbcf94e1d320e1923886eab5052f31e217fa907e1e7fed205739c874782d\",\"content_sha256\":\"b19499a5f984ae0b605fb57e475ff97a39f977d80fcbadab7abe6a54073d036b\",\"file_bytes\":1992,\"body_bytes\":817},{\"atom_id\":\"judge-a-check-for-circularity\",\"file_sha256\":\"940b63de638d592750c96b1afe18394894db01736486aa09d51cf87a7c2be168\",\"content_sha256\":\"1e1bed518f3ca54254244171b9c5d00f0d77affd4d7a95b8f762ee4fff0fd6e2\",\"file_bytes\":1748,\"body_bytes\":636},{\"atom_id\":\"name-the-check-behind-every-threshold\",\"file_sha256\":\"2e8884bffbd43aaf7f0cbede7d9392fe8a94285c5c1709b259ac9fa720f646f7\",\"content_sha256\":\"1b45914155c04378224040b744ce5ab069ff1ab9ce20e659d0dc13d98cc3a36c\",\"file_bytes\":4043,\"body_bytes\":2817},{\"atom_id\":\"place-slow-checks-outside-the-edit-loop\",\"file_sha256\":\"5feda054d7da783394b3353789fb740ea348ad8712069e63c2b281de40607242\",\"content_sha256\":\"58c5b10742a214461d63c0e480847bad4bc0d0c0a13639ae635ee8d5fd114a35\",\"file_bytes\":2427,\"body_bytes\":1248},{\"atom_id\":\"scope-the-check-to-the-change\",\"file_sha256\":\"04fe11b7e846a81502f75db2c656a39222066b71a2e28d20ebd859cb2bd06c00\",\"content_sha256\":\"5fd79997d3e511b5bbbe28d74a987fe281dfce5ae05e5d53b799fe80823ffe4d\",\"file_bytes\":2222,\"body_bytes\":927},{\"atom_id\":\"separate-facts-from-decisions\",\"file_sha256\":\"604c027487054c179381d4a061995ea4841a7483e0d8887c1458a3b1978413ea\",\"content_sha256\":\"6a579384b5c728ad607fd9aabf4a2133723e43b923b4ea38e6798f024160f18a\",\"file_bytes\":2314,\"body_bytes\":1091},{\"atom_id\":\"watch-for-the-moves-that-lower-the-bar\",\"file_sha256\":\"0e712cc53f67c5ba79f1302a1b04aa370fa139e6cf1bd2331f246df38082b5ad\",\"content_sha256\":\"dad41aab6ec71344f65261006e8c05aa96503ee34dac9c04cce32f4fdb298fca\",\"file_bytes\":2570,\"body_bytes\":1305}]"
carrier_sha256: 0f06d834ac7c85988b6eb7fa8b8c804941e7ca9b70304123462b3d0d55382649
carrier_bytes: 21254
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-question-a-default -->
---
instruction_id: give-every-question-a-default
title: Give every question a default
summary: "Every question in an intake carries a default, so an unsure answer still produces a working result, and the intake stops after four questions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "You interview a person to set up a policy, a configuration or a set of thresholds."
conditions_does_not_apply_when: "The answers are already written down, or the questions have no sensible default."
artifact_contract_output_type: questionnaire-with-defaults
artifact_contract_required_data:
  - the question
  - the guess
  - the default if unsure
  - what each option costs
artifact_contract_verified_by: "the user can answer 'I don't know' to every question and still get a working result"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - operations
---

# Give every question a default

Follow the one-question-at-a-time discipline, with one change: every question here has a default, so "I don't know" is a complete answer that still produces a working config.

```
Q1: Beyond the floor, which of these do you want enforced?
    (a) Test coverage on new code
    (b) Security scanning
    (c) Performance budgets
    (d) Accessibility
    (e) Architecture boundaries
    GUESS: (a) and (b) — you have a test runner already and you're handling user input.
    DEFAULT if unsure: (a) and (b).
    Say what each pick costs: (c) and (d) need a running URL, (e) needs a rules file written.
```

```
Q2: When a check fails while the agent is mid-task, should it block or warn?
    GUESS: Block. You're running agents unattended and a warning nobody reads is a warning.
    DEFAULT if unsure: Block on the floor, warn on everything else for the first two weeks.
```

```
Q3: Do you have target numbers in mind, or should I measure where you are today and hold that line?
    GUESS: Measure. Most teams don't have a number, and an invented one gets ignored.
    DEFAULT if unsure: Measure and hold. See "Ratchets" below.
```

```
Q4: What's the slowest check you'll tolerate before the agent hands work back?
    GUESS: About 90 seconds. Longer and you'll stop running it.
    DEFAULT if unsure: 90 seconds at task end, unlimited in CI.
```

Stop at four. A twelve-question intake produces a config nobody understands and a user who regrets starting.

The interview needs a live user. **Don't run it in non-interactive contexts** (CI, scheduled runs, autonomous runs). If constraints are missing and you're in one of those, apply the Floor below, note that you did, and flag the rest for a human.
<!-- vpmodule:atom:end give-every-question-a-default -->
<!-- vpmodule:atom:begin hold-the-measured-baseline -->
---
instruction_id: hold-the-measured-baseline
title: Hold the measured baseline
summary: "Record where a metric stands today and refuse to get worse, instead of setting a number the codebase fails today."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "No agreed number exists for a metric, or the current number is below the one being proposed."
conditions_does_not_apply_when: The target number is already agreed and the codebase meets it today.
artifact_contract_output_type: measured-baseline
artifact_contract_required_data:
  - the metric
  - "today's value"
  - the direction
  - the check that compares against it
artifact_contract_verified_by: the recorded value is the current measured value and the check compares against the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Hold the measured baseline

Set 80% coverage on a codebase at 62% and you get a red build forever, then a team that learns to ignore red builds.

The alternative asks for no decision: record where you are, then refuse to get worse. Put it in the "Measured, not yet enforced" table with today's number and a direction. Every check compares against the recorded value, not an aspiration. When a number improves, update it; when it drops, that's the finding.

This also answers a fair objection to training. Models are rewarded for passing tests, which you can evaluate in seconds. Architectural rot shows up over months and never reaches the weights. A ratchet is the missing penalty, written down where the build can see it.

**Red Flags**

- A budget was set that the codebase fails today, with no plan to reach it
<!-- vpmodule:atom:end hold-the-measured-baseline -->
<!-- vpmodule:atom:begin judge-a-check-for-circularity -->
---
instruction_id: judge-a-check-for-circularity
title: Judge a check for circularity
summary: "Rank the checks by whether the code under test could make them pass, and keep at least one that an outside opinion decides."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: The set of checks that guards the project is being chosen or reviewed.
conditions_does_not_apply_when: There is a single check and it is external.
artifact_contract_output_type: constraint-ranking
artifact_contract_required_data:
  - each check and its class
  - the external constraint that is present
  - the circular ones
artifact_contract_verified_by: "at least one constraint is judged outside the project's own tests"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Judge a check for circularity

**Not all checks are equally circular.** Rank them by one question: can the agent make this pass by writing code that doesn't work?

- **External** — axe-core encodes WCAG, `osv-scanner` reads a vulnerability database, Lighthouse measures a real browser. The agent can't argue with these.
- **Project** — your lint rules, your layer boundaries. A human owns the file.
- **Suite** — your own tests. Most useful, and the only genuinely circular one.

A bar made entirely of the third kind is worth less than one with an outside opinion in it. Check that at least one external constraint is present.
<!-- vpmodule:atom:end judge-a-check-for-circularity -->
<!-- vpmodule:atom:begin name-the-check-behind-every-threshold -->
---
instruction_id: name-the-check-behind-every-threshold
title: Name the check behind every threshold
summary: "A threshold states the number, the reason and the command that produces its verdict; a number with no command is an aspiration."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "A number is written into the project's quality bar, or a check is proposed for one."
conditions_does_not_apply_when: The rule is a judgement call that no command can decide.
artifact_contract_output_type: threshold-row
artifact_contract_required_data:
  - the number
  - the reason for the number
  - the command that produces the verdict
  - the default used when nobody has an opinion
artifact_contract_verified_by: every number in the document names a command that runs today and a reason for its value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Name the check behind every threshold

Every row names the command that produces the verdict. A dimension with a number and no command in this column is an aspiration, not a constraint.

State the number and the reason together. A threshold without a rationale gets deleted by the next person who hits it.

Picking a dimension means installing something. Don't leave the user with a number and no mechanism, and don't invent your own checker when a de facto one exists — these tools are listed because their rule formats and thresholds are what everything else in the ecosystem targets, so the team's existing config keeps working.

Add each one to the project's own script so it's reproducible without an agent:

```json
{
  "scripts": {
    "check:fast": "tsc --noEmit && eslint . && gitleaks dir . --redact --no-banner",
    "check:task": "npm run check:fast && vitest run --coverage",
    "check:security": "semgrep scan --config p/default --strict --json > semgrep-results.json && node scripts/quality-gate.mjs semgrep semgrep-results.json",
    "check:full": "npm run check:task && npm run check:security && osv-scanner scan source -r ."
  }
}
```

`semgrep scan` and `axe` can exit 0 on findings; wrap them in a gate script that enforces the threshold. Keep the scanner before `&&` so a failed scan stops the command.

**Sane Defaults.** When the user has no opinion, use these. They're chosen to be met by most codebases on day one.

| Constraint | Default | Why this number |
|------------|---------|-----------------|
| Coverage of changed lines | ≥ 80% | High enough to force a test, low enough to allow a config line |
| Project coverage | today's value, must not fall | No argument needed to adopt |
| Mutation score (if used) | ≥ 60% to start | Typical for a suite never mutated before; 80% is mature |
| Dependency vulnerabilities | nothing at high or above | Below that is mostly noise |
| Exception lifetime | 90 days | Long enough to plan the fix, short enough to remember |
| Ratchet tolerance | 0.5% | Absorbs drift when an unrelated file moves the number |

Constraints work at three levels of teeth. Start at the first:

1. **Written only.** The constraints file exists and agents read it. Costs nothing, catches the honest mistakes, relies on the agent complying.
2. **Scripted.** An `npm run check` (or `make check`) that runs the fast checks, wired into your agent's post-edit hook and your CI. Deterministic, no new dependency.
3. **Tool-backed.** A dedicated runner that handles diff scoping, budgets, ratchets, and the guard checks. Use when the config outgrows a shell script. The floor-guard reference is the starting point for the guard-checks half of this.

Most projects should stop at 2. Move to 3 when you're maintaining more than about thirty lines of check-running shell.
<!-- vpmodule:atom:end name-the-check-behind-every-threshold -->
<!-- vpmodule:atom:begin place-slow-checks-outside-the-edit-loop -->
---
instruction_id: place-slow-checks-outside-the-edit-loop
title: Place the slow checks outside the edit loop
summary: "Cost decides where a check runs: anything over a few seconds leaves the edit loop, and a dimension that cannot run is dropped rather than faked."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Checks are being assigned to the phases of the work.
conditions_does_not_apply_when: The checks already run outside the edit loop.
artifact_contract_output_type: check-placement
artifact_contract_required_data:
  - the phase each check runs in
  - the cost of each check
  - the dimensions that were dropped
artifact_contract_verified_by: the fast stage stays under a few seconds and every dropped dimension is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
  - operations
---

# Place the slow checks outside the edit loop

The single biggest mistake is running everything everywhere. A check that stalls the agent gets switched off, and a gate people switched off is worse than no gate, because the bar still looks like it exists.

**Cost decides placement.** Anything over a few seconds moves out of the edit loop.

That mapping matters more than the tools. `check:fast` is what runs after an edit, `check:task` when the agent thinks it's done, `check:full` in CI.

**Lighthouse and axe need a URL.** They only work against a running app, so they belong in the runtime stage against a preview deploy or a local server you start first. If the project has no URL to hit — a CLI, a library, a desktop app — say so and drop the dimension rather than inventing a check that can't run.

**A first run can be floor-only.** The floor guard is diff-only and needs no installs, so you can enforce the floor on day one and add numbered dimensions as you install each tool, rather than standing up every checker before the first commit is protected. Security tools that install machine-wide (gitleaks, osv-scanner) can also run CI-only if you'd rather keep laptops clean; declare where each dimension runs in the `Runs at` column.
<!-- vpmodule:atom:end place-slow-checks-outside-the-edit-loop -->
<!-- vpmodule:atom:begin scope-the-check-to-the-change -->
---
instruction_id: scope-the-check-to-the-change
title: Scope the check to the change
summary: "Check the lines the change touched, not the whole repository, and read the coverage the suite already produced."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "A check runs over the whole repository, or a coverage number has to be produced for a change."
conditions_does_not_apply_when: "The check is a whole-project measure by definition, such as a bundle size budget."
artifact_contract_output_type: scoped-check
artifact_contract_required_data:
  - the scope of the check
  - the lines or files in scope
  - the coverage source that was reused
artifact_contract_verified_by: the check ran over the changed lines only and no second test run was needed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Scope the check to the change

**Scope to the diff.** Check the lines this change touched, not the whole repo. Coverage of changed lines is a number the agent can move; project coverage is one it inherited.

**Scope the expensive ones to the diff.** `stryker run --mutate` on the whole repo takes hours and gets turned off; on the files a change touched it takes under a minute. Same for Semgrep, which takes a path list.

**Coverage needs no second test run.** Read the lcov your suite already writes and intersect it with `git diff`. Running the suite twice to get a number is the fastest way to make people hate this.

Run only the tests that cover the files you edit — nothing wider.

Then re-run the checks in `{plan_file}`'s `## Verification` section, if present — the patches changed code after the implementer's verification; if verification fails and the failure cannot be fixed, HALT and escalate to the human.
<!-- vpmodule:atom:end scope-the-check-to-the-change -->
<!-- vpmodule:atom:begin separate-facts-from-decisions -->
---
instruction_id: separate-facts-from-decisions
title: Separate facts from decisions
summary: Find facts yourself and dispatch a subagent when a question needs the environment; put only decisions to the user and wait for them.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An interview needs information the environment can settle.
conditions_does_not_apply_when: The user is the only source of the fact.
artifact_contract_output_type: fact-or-decision
artifact_contract_required_data:
  - facts found
  - decisions put to the user
artifact_contract_verified_by: "no fact the agent could look up is asked of the user, and no decision is answered by the agent"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/grilling/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Separate facts from decisions
Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent with a fresh context window to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

Never ask what you can read. Before the first question, gather:

| What | Where to look |
|------|---------------|
| Language and stack | `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml` |
| Test runner | dev dependencies, `test` script, existing test files |
| Existing linters | `eslint.config.*`, `biome.json`, `.ruff.toml` |
| Coverage today | `coverage/` output, or run the suite once |
| CI | `.github/workflows/`, `.gitlab-ci.yml` |
| Agent harness | `.claude/`, `.codex/`, `AGENTS.md` |

Report what you found in two lines, then ask only what's left.
<!-- vpmodule:atom:end separate-facts-from-decisions -->
<!-- vpmodule:atom:begin watch-for-the-moves-that-lower-the-bar -->
---
instruction_id: watch-for-the-moves-that-lower-the-bar
title: Watch the change for the moves that lower the bar
summary: "Five moves lower a recorded bar: a threshold moved, a test made easier, a checker silenced, work left unfinished, an exception added."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A change is reviewed against a recorded quality bar.
conditions_does_not_apply_when: The change touches no recorded bar.
artifact_contract_output_type: bar-weakening-report
artifact_contract_required_data:
  - the five moves
  - the lines that show each move
  - the exceptions that were discussed
artifact_contract_verified_by: every finding names the move and the line that shows it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/references/floor-guard.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Watch the change for the moves that lower the bar

Someone will point out that if the agent writes the code and the checks, the checks prove nothing. Half right, and worth engineering around.

Agents don't craft clever loopholes. They hit a red check and take the cheapest road to green. Watch for these five moves in the diff, at review time:

1. **The threshold moved.** A budget lowered, a severity dropped, a check removed from the fast stage. Compare the constraints file against its state at the branch point.
2. **A test got easier.** `.skip` added, a test file deleted, assertions pulled out of tests that stayed.
3. **A checker got silenced.** New `@ts-ignore` or `eslint-disable`. Four suppressions deserve special attention because they switch off a check you're relying on: `istanbul ignore` drops code from coverage instead of testing it, `Stryker disable` hides a surviving mutant, `nosemgrep` and `gitleaks:allow` do it for security findings.
4. **Work is unfinished.** A stub that throws, an empty `catch` turning a failure into silence, a `TODO` standing where the implementation should be.
5. **An exception appeared.** A new row in the Exceptions table nobody discussed.

None of this needs tooling beyond `git diff`. Tightening the bar should be silent; loosening it should be loud.
<!-- vpmodule:atom:end watch-for-the-moves-that-lower-the-bar -->