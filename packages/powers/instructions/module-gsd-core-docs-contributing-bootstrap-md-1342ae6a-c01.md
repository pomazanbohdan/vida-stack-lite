---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-contributing-bootstrap-md-1342ae6a-c01"
title: "gsd-core: docs/contributing/bootstrap.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/contributing/bootstrap.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/contributing/bootstrap.md\"}"
atom_ids:
  - give-the-guard-a-contract
  - install-from-the-lockfile-not-from-the-range
  - record-skipped-steps-with-reason
atom_count: 3
atoms: "[{\"atom_id\":\"give-the-guard-a-contract\",\"file_sha256\":\"c03c9b8835f70a27203e0cefb59a3a3b7844e79846648c47bf7069e313690a6d\",\"content_sha256\":\"b09d833c8728000c3bdc8a24731c78b7106930d2b3407809aec87e67a7f06ab5\",\"file_bytes\":6094,\"body_bytes\":4055},{\"atom_id\":\"install-from-the-lockfile-not-from-the-range\",\"file_sha256\":\"2b233ef9172ba813426471acec7edbcc20bf82b6c7a1281609b5a35aa5d165ee\",\"content_sha256\":\"51287c73122980e4d3f7b2b7d570cb20bf843baabedb3d80e7b64f202c4ab541\",\"file_bytes\":1477,\"body_bytes\":306},{\"atom_id\":\"record-skipped-steps-with-reason\",\"file_sha256\":\"77998b3e45805cf94b6f9acbc4c7453f24254b4c0f7d4b3be9757befd584e5aa\",\"content_sha256\":\"b3e0142d7bfca0c705a80e0f348e022fa381f2d4f5514eefa6d92836646a77f8\",\"file_bytes\":2772,\"body_bytes\":1580}]"
carrier_sha256: 464684312e07b9d4e3d45d8d4c94333dd9f42c7c265eb51b78296dd402b04eb8
carrier_bytes: 10718
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-the-guard-a-contract -->
---
instruction_id: give-the-guard-a-contract
title: Give the guard a contract
summary: "The guard reads the whole change, returns three distinct exit codes, and reports the rule and the location without the value."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: You write a check that guards a recorded quality bar against being lowered.
conditions_does_not_apply_when: A de facto tool already performs the check.
artifact_contract_output_type: guard-contract
artifact_contract_required_data:
  - the input the guard reads
  - the moves it detects
  - the three exit codes
  - what the report may contain
artifact_contract_verified_by: "the guard's failure-to-run exit code is distinguishable from its clean exit code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/constraint-driven-development/references/floor-guard.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/bootstrap.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/security-model.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/gate-predicates.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/gate-evidence-and-exit-status.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/api-coverage-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/live-dom-uat-capability.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Give the guard a contract

This is the reference. Adapt the patterns to your stack; keep the contract identical.

- **Input:** the diff between the merge base and the working tree (added *and* removed lines, plus untracked files). A guard that reads only `git diff` misses new files and staged-but-uncommitted work.
- **Detects the five moves:** a weakened threshold in the constraints file, a test made easier (`.skip`, a deleted test file, an assertion removed from a test that stayed), a silenced checker (a new suppression comment), unfinished work (a stub or empty `catch`), a new Exceptions row.
- **Exit codes:** `0` clean, `1` at least one floor violation (block the change), `2` the guard could not run (no merge base, not a git repo). Never let a `2` read as a `0`.
- **Reports the rule and the location, never the matched secret value.** Redaction is not optional.
- **Tightening is silent, loosening is loud:** only surfaces moves that lower the bar.

**Patterns are the only stack-specific part.** Add your language's suppression and stub forms to the three regexes; the diff plumbing, the constraints-file checks, and the exit codes stay as-is.

A `.constraintsignore` (one glob per line) lets you exempt a path the guard would otherwise flag; check each added line's file against it before flagging, so a genuine exception is a tracked file rather than a loosened rule.

**This is a starting point, not a finished tool.** It is deliberately regex-shallow: it catches the cheap-road-to-green moves agents actually make, not a determined human hiding a change. That is the right trade for a check that runs on every diff. Once you outgrow it, move to a real runner (Escalation Path level 3).
- Run the environment validator before any test or audit run:
- `0` — all checks passed, safe to proceed
- `1` — one or more checks failed — see the report
- `2` — tool error (e.g., `node` not found, corrupt `package.json`)
- on any internal error it fails open (exit 0) — a broken advisory must never wedge a session's tool calls.
- When the guard is enabled, this block leg **fails closed**
- **Step 1** — if the check command itself failed (non-zero exit, e.g. a malformed predicate / unknown kind), route per `onError` (`halt` or `skip`).
- **Step 2** — if the command succeeded, a `blocking: true` gate halts on `block: true`; an advisory gate shows `message` and continues.
- Before execution, three placeholders are substituted from the gate context; all others are left untouched for `sh` to interpret:
- An undefined placeholder interpolates to the empty string.
- Omit the field and the guard's original unconditional block stays in force, which is why absence is always the safe default.
Unreadable is a distinct state from none.
A gate reads evidence as `found` (a value; an empty file is `found ''`), `none` (the thing authoritatively does not exist: `ENOENT`, or `ENOTDIR` because a parent is a file) or `unreadable` (it exists or may exist and could not be read: `EISDIR`, `EACCES`, `EIO`, an encoding failure, an unresolvable phase, a plan scan that did not see every plan).
`none` is a legitimate answer and each gate keeps its documented policy for it; `unreadable` is never coerced to `''`, `false` or an empty list.
A gate that could not read its evidence used to behave exactly like a gate that read it and found nothing.
The exit code is a function of the verdict. One total function maps the outcome to a registered code: positive verdicts `0`; a negative verdict `1` in status mode; a read-and-genuinely-empty scope `66` (`NO_INPUT`); `unreadable` `69` (`UNAVAILABLE`) in both modes. No verb picks a code.
Unestablished scope is not a negative verdict.
It now holds the seal instead, reporting `scope_unavailable: true`.
the discriminator is *bytes examined*, never *signals found*.
`nothing_to_report` is never conflated with `could_not_look`.
A report claiming no issues when it never opened a browser is worse than no report; the artifact carries a closed reason enum so the two are always distinguishable.
<!-- vpmodule:atom:end give-the-guard-a-contract -->
<!-- vpmodule:atom:begin install-from-the-lockfile-not-from-the-range -->
---
instruction_id: install-from-the-lockfile-not-from-the-range
title: "Install from the lockfile, not from the range"
summary: "Dependencies are installed from the committed lockfile, and a regenerated lockfile is inspected before it is committed."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: Dependencies are about to be installed in a working tree.
conditions_does_not_apply_when: The project has no lockfile and the install is the first one.
artifact_contract_output_type: locked-install
artifact_contract_required_data:
  - the lockfile that is installed from
  - the command used
  - what is checked before the lockfile is committed
artifact_contract_verified_by: the install came from the lockfile and the regenerated lockfile was inspected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/bootstrap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Install from the lockfile, not from the range
- `npm ci` is required over `npm install`. It installs exactly what `package-lock.json` specifies and fails fast if the lockfile is out of sync — this is intentional.
- Do NOT commit a regenerated lockfile without verifying no unexpected packages changed.
<!-- vpmodule:atom:end install-from-the-lockfile-not-from-the-range -->
<!-- vpmodule:atom:begin record-skipped-steps-with-reason -->
---
instruction_id: record-skipped-steps-with-reason
title: Record a skipped step with its reason
summary: "A step you choose not to do stays visible with a one-line reason, and a skipped entry point is never reported as verified through another path."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: Part of the planned steps or checks was not carried out.
conditions_does_not_apply_when: Every planned step ran and its evidence exists.
artifact_contract_output_type: skip-ledger
artifact_contract_required_data:
  - step
  - reason
  - attempted command
  - unmet precondition
  - effect
artifact_contract_verified_by: the report lists every skipped step and its effect
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/10-recipes-and-pitfalls.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/bootstrap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Record a skipped step with its reason
A step you choose not to do stays in the list with a one-line skip and its reason.
The step stays visible, so the reader can see what you chose not to do.
Every step names the evidence that checks it.
Check a step only when its evidence exists: a file, a log line, a screenshot, a test run, or a SHA.
Report an unreachable path with the attempted command and the unmet precondition.
Do not report a skipped entry point as verified through a different path.
When a check couldn't run, a good reply says inconclusive.
Treat a confident reply without evidence as a red flag.
If it repros on main lets the run stop early when the bug is already gone, and the reproduction result is the reason.
If there's a cheap test path matters: forcing a test through brittle mocks proves less than running the real command, and the playbook is allowed to say so.
A build proves it compiles, so ask for the real command, flow, stored value, or profile, and expect the evidence in the reply.
A vague finish condition gives the loop nothing to check, so give a command or artifact that can pass or fail.
Name each skip with what it leaves unproven.
A skip that changes confidence in the result is stated as such.
The report never reads as complete when a step is skipped.
- **Exception (ADR/doc-only PRs):** if the diff is documentation-only (for example `docs/adr/*.md`, `docs/**/*.md`, `README*.md`) and contains no executable-code or test changes, the cross-platform run is optional.
- When using the doc-only exception, note it explicitly in the PR body.
<!-- vpmodule:atom:end record-skipped-steps-with-reason -->