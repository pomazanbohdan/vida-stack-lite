---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-verify-command-grounding-md-28098c49-c01"
title: "gsd-core: gsd-core/references/planner-verify-command-grounding.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/references/planner-verify-command-grounding.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-verify-command-grounding.md\"}"
atom_ids:
  - ground-every-path-you-author-or-say-you-cannot
  - ground-the-verification-command-in-a-directory-that-exists
  - inherit-the-command-that-already-worked
  - reuse-the-verification-command-a-prior-phase-proved
  - run-the-count-gate-against-the-current-tree-and-record-its-baseline
  - run-the-count-gate-before-it-ships-and-record-its-baseline
  - write-root-relative-paths-in-the-plan-body
  - write-the-paths-in-the-artifact-relative-to-the-root
atom_count: 8
atoms: "[{\"atom_id\":\"ground-every-path-you-author-or-say-you-cannot\",\"file_sha256\":\"d7a1ffc4eeed43fc7f53c6b3c361641af600040e022b9cc72a369cb40c7f0f4c\",\"content_sha256\":\"a45266e8f4ac23edc61284ee2811642232d451d63661dd6116c6e383203a0a82\",\"file_bytes\":1690,\"body_bytes\":528},{\"atom_id\":\"ground-the-verification-command-in-a-directory-that-exists\",\"file_sha256\":\"8ae85d5f9904490eabbb857281c94645cfb5631f67d71aa43350f340c5e364f3\",\"content_sha256\":\"c883a474f358ba98d0fe8ee53632cbcfd323f4c0436b27a60cef3ee23ccc07b9\",\"file_bytes\":2033,\"body_bytes\":686},{\"atom_id\":\"inherit-the-command-that-already-worked\",\"file_sha256\":\"875beb5db4ac67e29413c20c3120fc16b875527f8caeb9553841541e7f26c482\",\"content_sha256\":\"48269a8d132014b5be5919271c8fa71fcd339756c4d5d440d19420a2017bff44\",\"file_bytes\":1394,\"body_bytes\":330},{\"atom_id\":\"reuse-the-verification-command-a-prior-phase-proved\",\"file_sha256\":\"0640f0e866ab91295e2c2943c27d8bc8ec9b3dc27ed1639a19b885bb5b1dedc4\",\"content_sha256\":\"84d89c4fbbf34fe0e5cca465148001335c057458bbb13a8f44fec3d36bbc8273\",\"file_bytes\":1596,\"body_bytes\":443},{\"atom_id\":\"run-the-count-gate-against-the-current-tree-and-record-its-baseline\",\"file_sha256\":\"25b18919bc3382a62989a8b768f5afa4d8c462ebaa3864a2f1588782b7f5b9fe\",\"content_sha256\":\"5f1bc0926e252e0782d89c9c9eda2fe32d7157c3d2c3cbae6bff722bfd9a91b1\",\"file_bytes\":2104,\"body_bytes\":972},{\"atom_id\":\"run-the-count-gate-before-it-ships-and-record-its-baseline\",\"file_sha256\":\"d4cca66c0b2971cee0a5b90b83fdafbab8cd85d9b9cf7dde8a418cb70a36628c\",\"content_sha256\":\"224ee5cc0ca57ef5c969cd7419e3a746082b7bbf09e6ad6999820851533f5cb2\",\"file_bytes\":2594,\"body_bytes\":1285},{\"atom_id\":\"write-root-relative-paths-in-the-plan-body\",\"file_sha256\":\"2c74a418c4aeee7e93bec446ebe7321ef2fd8a4bf2b3a7f899f7ab5fe7ea2a66\",\"content_sha256\":\"f9cc056782f1c8572832872c039f77068eaaec831c12ab30e3c09d6d5ae49eb5\",\"file_bytes\":1786,\"body_bytes\":747},{\"atom_id\":\"write-the-paths-in-the-artifact-relative-to-the-root\",\"file_sha256\":\"c565c89be2e0049a84775fa4328dd61fdd9c48fae3dab4c3167db698ee35025e\",\"content_sha256\":\"3c80c3bc549403620c508c5392defc58e42b4797aa1f4db74fb388899950e5b2\",\"file_bytes\":2581,\"body_bytes\":1250}]"
carrier_sha256: fd34088cc4f7882db47fd61ab705a16a857ffc168fe7b911ee21d352774d6b1e
carrier_bytes: 17067
revision: 1
status: active
---
<!-- vpmodule:atom:begin ground-every-path-you-author-or-say-you-cannot -->
---
instruction_id: ground-every-path-you-author-or-say-you-cannot
title: "Ground every path you author, or say you cannot"
summary: A path in a verification command must resolve to a directory that exists and holds the manifest; when it cannot be grounded the plan says so.
capability_tags:
  - verify-work-results
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A verification command names a directory.
conditions_does_not_apply_when: The command was inherited verbatim from a prior phase.
artifact_contract_output_type: grounded-command
artifact_contract_required_data:
  - the target directory
  - the manifest it must hold
  - the statement when it cannot be grounded
artifact_contract_verified_by: "every authored path resolves, or the plan states that it cannot be grounded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ground every path you author, or say you cannot
Ground every path you do author: a command's `cd` target or `npm --prefix` target must be a directory that exists (or that an earlier task in this phase creates) and, for an npm/make command, must hold the matching `package.json`/`Makefile`
`npm --prefix <dir> run <script>` is preferred over `cd <dir> && npm run <script>` — it does not depend on the executor's cwd
If `prior_verify_commands` is empty and you cannot ground a path, say so in the plan instead of guessing one
<!-- vpmodule:atom:end ground-every-path-you-author-or-say-you-cannot -->
<!-- vpmodule:atom:begin ground-the-verification-command-in-a-directory-that-exists -->
---
instruction_id: ground-the-verification-command-in-a-directory-that-exists
title: Ground the verification command in a directory that exists
summary: "A verification command names a directory that exists and holds the matching manifest, and it is written so it does not depend on the working directory; an ungroundable path is declared instead of guessed."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A verification command is authored with a path of its own.
conditions_does_not_apply_when: The command is reused unchanged from a phase that already proved it.
artifact_contract_output_type: grounded-command
artifact_contract_required_data:
  - the target directory
  - the manifest that directory holds
  - the declaration when the path could not be grounded
artifact_contract_verified_by: "the target directory exists and holds the matching manifest, or the plan says the path could not be grounded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Ground the verification command in a directory that exists
Ground every path you do author: a command's `cd` target or `npm --prefix` target must be a directory that exists (or that an earlier task in this phase creates) and, for an npm/make command, must hold the matching `package.json`/`Makefile`. `npm --prefix <dir> run <script>` is preferred over `cd <dir> && npm run <script>` - it does not depend on the executor's cwd. If `prior_verify_commands` is empty and you cannot ground a path, say so in the plan instead of guessing one.
Re-invention is what produced `cd ../../frontend && npm run lint` against a directory that holds no `package.json`, and cost two revision cycles.
<!-- vpmodule:atom:end ground-the-verification-command-in-a-directory-that-exists -->
<!-- vpmodule:atom:begin inherit-the-command-that-already-worked -->
---
instruction_id: inherit-the-command-that-already-worked
title: Inherit the command that already worked
summary: The command a prior phase proved is reused verbatim instead of being re-derived.
capability_tags:
  - verify-work-results
pattern_tags:
  - source-hierarchy
conditions_applies_when: The phase repeats a build or test story that a prior phase already proved.
conditions_does_not_apply_when: The phase tests something no prior phase touched.
artifact_contract_output_type: inherited-command
artifact_contract_required_data:
  - the inherited command
  - the phase that proved it
artifact_contract_verified_by: the command was taken from the prior phase instead of re-derived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Inherit the command that already worked
When this phase's build or test story is the same one a prior phase already proved, reuse that command verbatim rather than re-deriving a path
Re-invention is what produced `cd ../../frontend && npm run lint` against a directory that holds no `package.json`, and cost two revision cycles
<!-- vpmodule:atom:end inherit-the-command-that-already-worked -->
<!-- vpmodule:atom:begin reuse-the-verification-command-a-prior-phase-proved -->
---
instruction_id: reuse-the-verification-command-a-prior-phase-proved
title: Reuse the verification command a prior phase proved
summary: "When a prior phase already proved a build or test command, that command is reused verbatim instead of a path being re-derived."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The planning context carries the commands an earlier phase already proved.
conditions_does_not_apply_when: The phase runs a different build or test story than the earlier one.
artifact_contract_output_type: reused-command
artifact_contract_required_data:
  - the command that was reused
  - the phase that proved it
artifact_contract_verified_by: "the reused command is the one the earlier phase proved, unaltered"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reuse the verification command a prior phase proved
**Inherit the command that already worked.** The planning context carries `prior_verify_commands` - the `<automated>` commands from the most recent prior phase that had any, surfaced **at every context window**, not only on 1M-class models. When this phase's build or test story is the same one a prior phase already proved, **reuse that command verbatim** rather than re-deriving a path.
<!-- vpmodule:atom:end reuse-the-verification-command-a-prior-phase-proved -->
<!-- vpmodule:atom:begin run-the-count-gate-against-the-current-tree-and-record-its-baseline -->
---
instruction_id: run-the-count-gate-against-the-current-tree-and-record-its-baseline
title: Run the count gate against the current tree and record its baseline
summary: A gate that counts or matches text is run against the tree before it ships and its pre-change result is written next to it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A gate counts or matches text in the tree.
conditions_does_not_apply_when: The gate asserts the absence of a construct.
artifact_contract_output_type: gate-baseline
artifact_contract_required_data:
  - the gate command
  - the result at the current tree
  - the baseline written next to it
artifact_contract_verified_by: the gate was run and its baseline recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the count gate against the current tree and record its baseline
You have a shell when you author the plan, so run each such gate against the **current tree** and write the pre-change result next to it as its baseline (`# baseline at HEAD: 0`)
the gate measures nothing and passes whether or not the work happens. Fix the gate: anchor it to the new heading, key, or line the task creates, or assert a delta from the recorded baseline
**Its literal can never match the deliverable.** `grep` is case-sensitive, so `grep -c "quickstart"` fails on a correct `## Quickstart`. Match the real casing of the text the task writes, or use `-i` when casing is not part of the contract
A gate that is meant to prove a *negative* is checked the other way: it must pass after the work and its baseline must show the thing was there to remove. Only read-only commands are safe to run this way — run `grep`/`rg`/`test` gates; do not execute a gate that builds, installs, or writes
<!-- vpmodule:atom:end run-the-count-gate-against-the-current-tree-and-record-its-baseline -->
<!-- vpmodule:atom:begin run-the-count-gate-before-it-ships-and-record-its-baseline -->
---
instruction_id: run-the-count-gate-before-it-ships-and-record-its-baseline
title: Run the count gate before it ships and record its baseline
summary: "A gate that counts or matches text is run against the current tree and its pre-change result is written next to it, because two defects - a gate that already passes and a literal that can never match - are invisible to reading."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A gate is authored that counts or matches text in the tree.
conditions_does_not_apply_when: The gate proves a behaviour by running the code rather than by matching text.
artifact_contract_output_type: gate-baseline
artifact_contract_required_data:
  - the gate
  - the pre-change result
  - "the defect that was found, if any"
artifact_contract_verified_by: the baseline of every count gate is recorded and the gate is anchored to what the task creates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the count gate before it ships and record its baseline
**Run a count/match gate before it ships.** A gate you author - or one a research document hands you - that counts or matches text (`grep -c`, `grep -q`, `rg`, `test -n "$(grep …)"`) is a claim about the tree, and two defects are invisible to reading and take one command to expose. You have a shell when you author the plan, so run each such gate against the **current tree** and write the pre-change result next to it as its baseline (`# baseline at HEAD: 0`):
- **It already passes at HEAD.** The gate measures nothing and passes whether or not the work happens. Fix the gate: anchor it to the new heading, key, or line the task creates, or assert a delta from the recorded baseline.
- **Its literal can never match the deliverable.** `grep` is case-sensitive, so `grep -c "quickstart"` fails on a correct `## Quickstart`. Match the real casing of the text the task writes, or use `-i` when casing is not part of the contract.
A gate that is meant to prove a *negative* is checked the other way: it must pass after the work and its baseline must show the thing was there to remove. Only read-only commands are safe to run this way - run `grep`/`rg`/`test` gates; do not execute a gate that builds, installs, or writes.
<!-- vpmodule:atom:end run-the-count-gate-before-it-ships-and-record-its-baseline -->
<!-- vpmodule:atom:begin write-root-relative-paths-in-the-plan-body -->
---
instruction_id: write-root-relative-paths-in-the-plan-body
title: Write root-relative paths in the plan body
summary: Every path in the plan body is relative to the checkout root; an absolute path pins the command to one checkout.
capability_tags:
  - plan-implementation
pattern_tags:
  - worktree-isolation
conditions_applies_when: A path is written into the body of a plan.
conditions_does_not_apply_when: "The path is an input the prompt supplied, not one the plan names."
artifact_contract_output_type: path-form
artifact_contract_required_data:
  - the path as written
  - the root it is relative to
artifact_contract_verified_by: no path in the plan body is absolute
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write root-relative paths in the plan body
Every path in the plan *body* — `<files>`, `<verify>`, `<automated>`, task actions — is repo-root-relative, and every `<automated>` command assumes cwd at the checkout root
An absolute path copied from the prompt into `<automated>` pins the command to the orchestrator's checkout; under worktree isolation the executor's checkout is a different directory, so the command `cd`s into the main tree, finds it, runs, and **passes against code the worktree changed and the main tree did not**
It binds `prior_verify_commands` too: a harvested command that carries an absolute path is re-rooted before reuse, never copied verbatim — it "worked" in a run that may have been verifying the wrong checkout
<!-- vpmodule:atom:end write-root-relative-paths-in-the-plan-body -->
<!-- vpmodule:atom:begin write-the-paths-in-the-artifact-relative-to-the-root -->
---
instruction_id: write-the-paths-in-the-artifact-relative-to-the-root
title: Write the paths in the artifact relative to the root
summary: "Every path written into the artifact is relative to the repository root, because an absolute path pins the command to one checkout and lets it pass against code another checkout changed."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "A path is written into a plan, a task, a verify block or a command."
conditions_does_not_apply_when: "The path only appears in the prompt the agent reads, not in the artifact it writes."
artifact_contract_output_type: path-convention
artifact_contract_required_data:
  - the paths written into the artifact
  - the root they are relative to
  - the assumption about the working directory
artifact_contract_verified_by: no absolute path survives in the artifact and every command assumes the checkout root as the working directory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write the paths in the artifact relative to the root
**Root-relative, never absolute.** The paths in your prompt's `<required_reading>` are absolute on purpose
a subagent's cwd may differ from the orchestrator's That rule covers prompt *inputs* only. Every path in the plan *body* - `<files>`, `<verify>`, `<automated>`, task actions - is repo-root-relative, and every `<automated>` command assumes cwd at the checkout root. An absolute path copied from the prompt into `<automated>` pins the command to the orchestrator's checkout; under worktree isolation the executor's checkout is a different directory, so the command `cd`s into the main tree, finds it, runs, and **passes against code the worktree changed and the main tree did not**.
The path probe reports such a target as `outside_root` (a warning), but only when the target is outside the *orchestrator's* root - an absolute path *inside* it is exactly the shape that passes the probe and still misfires under isolation. The authoring rule is the fix; the probe is the backstop.
It binds `prior_verify_commands` too: a harvested command that carries an absolute path is re-rooted before reuse, never copied verbatim - it "worked" in a run that may have been verifying the wrong checkout.
<!-- vpmodule:atom:end write-the-paths-in-the-artifact-relative-to-the-root -->