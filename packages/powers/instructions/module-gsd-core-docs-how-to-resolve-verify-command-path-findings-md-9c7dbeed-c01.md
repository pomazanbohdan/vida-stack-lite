---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-verify-command-path-findings-md-9c7dbeed-c01"
title: "gsd-core: docs/how-to/resolve-verify-command-path-findings.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/resolve-verify-command-path-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-verify-command-path-findings.md\"}"
atom_ids:
  - never-execute-model-authored-text-in-a-checker
  - never-guess-a-replacement-path-in-a-checker
  - prefer-a-command-that-does-not-depend-on-the-working-directory
  - reuse-the-proven-command-before-writing-a-new-one
atom_count: 4
atoms: "[{\"atom_id\":\"never-execute-model-authored-text-in-a-checker\",\"file_sha256\":\"d3665267bc0be69893f52082a3fb538b23fc4087a40edb696225742744a6c2a3\",\"content_sha256\":\"5629dce7193c19cc719c00711a4f35b770bb781f593a2a432b030ac5e1b45d8a\",\"file_bytes\":1296,\"body_bytes\":236},{\"atom_id\":\"never-guess-a-replacement-path-in-a-checker\",\"file_sha256\":\"f8e50d540c3f1559117124ff1046d03cac77cab331d7ab2e5242e9ef64e877b3\",\"content_sha256\":\"5efc194ea9c233e46d35ca1fa7beccec02587fb1b778a4867c3afee24d3a1606\",\"file_bytes\":1577,\"body_bytes\":483},{\"atom_id\":\"prefer-a-command-that-does-not-depend-on-the-working-directory\",\"file_sha256\":\"ff980b7ff7b50b861010d8cf0af830cffb0e30466fa43b3bfb79412f65e8cde6\",\"content_sha256\":\"12cee2c9a2014df3f8fe0bcf1261629e1ed974b7d5bc92c7a5a4afcb36d2777d\",\"file_bytes\":1393,\"body_bytes\":268},{\"atom_id\":\"reuse-the-proven-command-before-writing-a-new-one\",\"file_sha256\":\"2ff4b7f85e4d587cdb5118c28fe7050135f1706468bb58cf114ff8132a12b9f5\",\"content_sha256\":\"c48d60c48b8e80142fea81c5f8d6e5ccd5878df7b226d81ed24d1426ac8f675b\",\"file_bytes\":1424,\"body_bytes\":394}]"
carrier_sha256: df7898615e4a6c090dc88181125787b6faebc021dcba260be17c913187d5bdf5
carrier_bytes: 6321
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-execute-model-authored-text-in-a-checker -->
---
instruction_id: never-execute-model-authored-text-in-a-checker
title: Never execute model-authored text in a checker
summary: A checker that runs the command it checks turns a plan file into arbitrary code execution.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A checker is about to decide whether a written command works.
conditions_does_not_apply_when: The command comes from a committed script and may be executed.
artifact_contract_output_type: checker-refusal
artifact_contract_required_data:
  - the written command
  - the reason it is not executed
artifact_contract_verified_by: the checker reports on the command without running it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never execute model-authored text in a checker
**It will not run your command.** PLAN.md is model-authored text; executing it from the checker would be arbitrary code execution, and would trigger the real lint/build as a side effect.
<!-- vpmodule:atom:end never-execute-model-authored-text-in-a-checker -->
<!-- vpmodule:atom:begin never-guess-a-replacement-path-in-a-checker -->
---
instruction_id: never-guess-a-replacement-path-in-a-checker
title: Never guess a replacement path in a checker
summary: A checker that proposes a replacement path is exactly the failure it was built to catch; refusing to guess is the design.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A checker finds a path that does not resolve.
conditions_does_not_apply_when: The path resolves and the checker has nothing to report.
artifact_contract_output_type: checker-refusal
artifact_contract_required_data:
  - the unresolved target
  - the reason the checker will not resolve it
artifact_contract_verified_by: the checker reports the unresolved target and proposes no replacement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never guess a replacement path in a checker
**It will not suggest a replacement path.** Prescribing one is exactly the failure that motivated this check — the checker previously guessed twice and was wrong both times, the second time citing a `package.json` that did not exist.
**It does not recognize every launcher.** `pushd`, `make -C`, `yarn --cwd`, `pnpm -C`, and `cargo --manifest-path` report `unresolvable` rather than being half-parsed. Refusing to guess is the design.
<!-- vpmodule:atom:end never-guess-a-replacement-path-in-a-checker -->
<!-- vpmodule:atom:begin prefer-a-command-that-does-not-depend-on-the-working-directory -->
---
instruction_id: prefer-a-command-that-does-not-depend-on-the-working-directory
title: Prefer a command that does not depend on the working directory
summary: A command written as a relative climb resolves differently in a worktree; the prefix form resolves the same everywhere.
capability_tags:
  - plan-implementation
pattern_tags:
  - project-conventions-first
conditions_applies_when: A verify command targets a directory other than the current one.
conditions_does_not_apply_when: The command runs only from the repository root.
artifact_contract_output_type: cwd-independent-command
artifact_contract_required_data:
  - the target directory
  - the command form used
artifact_contract_verified_by: the command resolves the same way from any working directory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prefer a command that does not depend on the working directory
| `cd <dir> && npm run <script>` | Depends on the executor's cwd; a relative climb resolves differently inside a worktree |
| `npm --prefix <dir> run <script>` | Independent of cwd — **prefer this** |
<!-- vpmodule:atom:end prefer-a-command-that-does-not-depend-on-the-working-directory -->
<!-- vpmodule:atom:begin reuse-the-proven-command-before-writing-a-new-one -->
---
instruction_id: reuse-the-proven-command-before-writing-a-new-one
title: Reuse the proven command before writing a new one
summary: A command that already resolved in a real run is inherited rather than rewritten.
capability_tags:
  - plan-implementation
pattern_tags:
  - project-conventions-first
conditions_applies_when: A verify command has to be written for a new plan.
conditions_does_not_apply_when: No prior phase ran an equivalent command.
artifact_contract_output_type: inherited-verify-command
artifact_contract_required_data:
  - the inherited command
  - the phase it came from
artifact_contract_verified_by: the plan reuses the inherited command verbatim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reuse the proven command before writing a new one
The planner is handed `prior_verify_commands` — the `<automated>` commands from the nearest prior phase that had any — at **every** context window.
If a previous phase already lints or builds the same tree, that command resolved in a real run. Reuse it verbatim.
If that returns commands, the fix is usually a copy-paste, not a new path.
<!-- vpmodule:atom:end reuse-the-proven-command-before-writing-a-new-one -->