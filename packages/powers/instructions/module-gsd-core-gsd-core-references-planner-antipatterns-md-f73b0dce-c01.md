---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-antipatterns-md-f73b0dce-c01"
title: "gsd-core: gsd-core/references/planner-antipatterns.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/references/planner-antipatterns.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-antipatterns.md\"}"
atom_ids:
  - automate-everything-the-agent-can-automate-before-a-checkpoint
  - batch-the-human-verification-at-the-end-of-the-phase
  - keep-the-failure-literal-out-of-the-action-text
  - keep-the-forbidden-literal-out-of-the-action-body
  - let-the-failure-propagate-in-a-verify-gate
  - make-the-action-specific-enough-for-another-instance
  - match-the-anchored-pattern-to-the-real-output-shape
  - never-ask-the-human-to-do-what-you-can-automate
atom_count: 8
atoms: "[{\"atom_id\":\"automate-everything-the-agent-can-automate-before-a-checkpoint\",\"file_sha256\":\"791202f81107d518f253e7dbfa862c13a8e10ab9519b6fb095696b75d0c62a9b\",\"content_sha256\":\"cc20bd88ee3f0bd5af7298f2e93cdc2d0e3848a0a66feb11db9ab59e708ef9d5\",\"file_bytes\":1562,\"body_bytes\":488},{\"atom_id\":\"batch-the-human-verification-at-the-end-of-the-phase\",\"file_sha256\":\"d99c7749e3e445955b75cc354da84ec47faa8d16c8e1b7ef2a3c74e89937380d\",\"content_sha256\":\"44624ca03d6579c6dc928585400b8c2023366200a14b406d14e7cf26dec68518\",\"file_bytes\":2814,\"body_bytes\":1356},{\"atom_id\":\"keep-the-failure-literal-out-of-the-action-text\",\"file_sha256\":\"8710aa210bd89e9f58ad215a6c533381fa46d830f979da441431bef8ba77d7d6\",\"content_sha256\":\"a253fa974e9b84f68be608e1ac9aee65af94c14fbfe4ae84f245cbb2d9082495\",\"file_bytes\":2661,\"body_bytes\":1408},{\"atom_id\":\"keep-the-forbidden-literal-out-of-the-action-body\",\"file_sha256\":\"d9160d7377512a0b6da2609a31350b59914c04bf5bbfd6c2a495fbd085f623c4\",\"content_sha256\":\"57818c6df4a0aafdf025e30e9f1efdec4d3a390ec98df8406a20380a34083f94\",\"file_bytes\":1735,\"body_bytes\":607},{\"atom_id\":\"let-the-failure-propagate-in-a-verify-gate\",\"file_sha256\":\"9101be8e776286eb430a8529b5797bafa1e1e74d6575f807a86270b46892a368\",\"content_sha256\":\"820e94d06e180fd811a35e57c292e426eb5d15b21b172f24fa445b3268858be2\",\"file_bytes\":1598,\"body_bytes\":466},{\"atom_id\":\"make-the-action-specific-enough-for-another-instance\",\"file_sha256\":\"935ba604aae499c7a4084670f9f6abd24597b6719df35d96c4859d93521bfc4c\",\"content_sha256\":\"f051c1a3d4083b7058d5f266966c20f41f7b5b66d4ed2d0473e1f6894e172307\",\"file_bytes\":1706,\"body_bytes\":521},{\"atom_id\":\"match-the-anchored-pattern-to-the-real-output-shape\",\"file_sha256\":\"e376cb8ba3cbea4fa6cb98998f724b99db7efb2f005bf59f2f704d3ffa5f09c5\",\"content_sha256\":\"d7649577f1296fc895403b81b62dccf0259a06bc97fa2e766689838e530433af\",\"file_bytes\":1635,\"body_bytes\":442},{\"atom_id\":\"never-ask-the-human-to-do-what-you-can-automate\",\"file_sha256\":\"63822c878e5bb4ae11b98ea80672feda252a05af482060b16b0c42ed00824c87\",\"content_sha256\":\"a492585b520f281156943ae3c246987b25694d975cabfc3e3b8e1f43868d1b75\",\"file_bytes\":1668,\"body_bytes\":404}]"
carrier_sha256: 22c51d35c24e39bf5d45e5cb2625fb42a4217a8577764031850f48dd811b2671
carrier_bytes: 16646
revision: 1
status: active
---
<!-- vpmodule:atom:begin automate-everything-the-agent-can-automate-before-a-checkpoint -->
---
instruction_id: automate-everything-the-agent-can-automate-before-a-checkpoint
title: Automate everything the agent can automate before a checkpoint
summary: A checkpoint is never used for work the agent can do itself; the checkpoint verifies what the automation produced.
capability_tags:
  - execute-plan
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A checkpoint is about to be placed in a plan.
conditions_does_not_apply_when: The step is genuinely only a human can take.
artifact_contract_output_type: checkpoint-design
artifact_contract_required_data:
  - the checkpoint
  - the work that was automated instead
artifact_contract_verified_by: no checkpoint asks for work the agent could have performed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Automate everything the agent can automate before a checkpoint
**DO:** Automate everything before checkpoint, be specific ("Visit https://myapp.vercel.app" not "check deployment"), number verification steps, state expected outcomes
**DON'T:** Ask human to do work Claude can automate, mix multiple verifications, place checkpoints before automation completes
**Why bad:** Vercel has a CLI. Claude should run `vercel --yes`. Never ask the user to do what Claude can automate via CLI/API
<!-- vpmodule:atom:end automate-everything-the-agent-can-automate-before-a-checkpoint -->
<!-- vpmodule:atom:begin batch-the-human-verification-at-the-end-of-the-phase -->
---
instruction_id: batch-the-human-verification-at-the-end-of-the-phase
title: Batch the human verification at the end of the phase
summary: "Mid-flight human verification is not emitted as its own checkpoint: the check is folded into the task and the human reviews the whole batch at the end, because every halt pays a full cold start."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A plan would pause for a human to verify work that was already done.
conditions_does_not_apply_when: The step gates the work itself and the executor cannot continue without the answer.
artifact_contract_output_type: batched-verification
artifact_contract_required_data:
  - the human checks folded into the tasks
  - the end-of-phase batch the human reviews
  - the checkpoints that still gate the work
artifact_contract_verified_by: no mid-flight verification checkpoint was emitted and the human checks are collected into one batch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-human-verify-mode.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Batch the human verification at the end of the phase
Do **not** emit any `<task type="checkpoint:human-verify">` tasks. Every mid-flight halt costs a full executor cold-start
because subagent context is discarded across the pause; a plan with N human-verify checkpoints pays the cold-start cost N+1 times - measured at "tens of thousands of tokens" per round-trip on real projects. This is the default for that reason.
Instead, fold each would-be verification step into the relevant `auto` task using a `<verify><human-check>` sub-block:
The verifier
harvests every `<verify><human-check>` block at end-of-phase and consolidates them into
one batch. The user reviews everything in one batch instead of paying a cold-start cost per item.
`checkpoint:decision` and `checkpoint:human-action` tasks are still emitted in `end-of-phase` mode. Those gate the work itself (a choice the executor needs from the user, or an auth step only the user can perform), not post-hoc verification of completed work. Only `checkpoint:human-verify` is suppressed.
A plan should not interleave multiple checkpoint types with implementation tasks. Checkpoints belong at natural verification boundaries, not scattered throughout.
**Why bad:** Verification fatigue. Users should not be asked to verify every small step. Combine into one checkpoint at the end of meaningful work.
<!-- vpmodule:atom:end batch-the-human-verification-at-the-end-of-the-phase -->
<!-- vpmodule:atom:begin keep-the-failure-literal-out-of-the-action-text -->
---
instruction_id: keep-the-failure-literal-out-of-the-action-text
title: Keep the failure literal out of the action text
summary: "A literal that a negative grep forbids must not appear verbatim in the task action, because the comment gets echoed into the file and the gate then fires on the comment text instead of on a real regression."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A task carries a negative grep and the same literal would appear in the action body.
conditions_does_not_apply_when: No negative grep forbids the literal.
artifact_contract_output_type: rephrased-action
artifact_contract_required_data:
  - the forbidden literal
  - the rephrased action
  - the marker when the literal must stay verbatim
artifact_contract_verified_by: the forbidden literal appears nowhere in the action body unless a marker names it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the failure literal out of the action text
When an `<acceptance_criteria>` or `<verify>` block uses a **negative grep** - `grep -c 'LITERAL' file == 0`, meaning "this literal must NOT appear in the file" - that same `LITERAL` must not appear verbatim anywhere in an `<action>` body. Verbatim code blocks, JSDoc samples, head-comment references, and "what NOT to do" illustrations get echoed into the file the executor writes, so the executor's commit-time gate fails on the *comment text*, not on a real code regression. The work is correct; the gate output is semantically wrong; the executor wastes cycles and learns to distrust the gate.
**The gate:** plan creation FAILS (error, `valid: false`) when a confidently-extracted (quoted) negative-grep literal also appears in an `<action>` block. When the grep literal is unquoted and cannot be extracted unambiguously, the gate WARNS instead of failing (so you still get the plan, with the risk surfaced).
Rephrase the comment by concept.
`Add the share-link query param. Do NOT reintroduce the legacy referrer hack.`
When the literal MUST appear in the plan body verbatim - e.g. the plan documents the test file that exercises the gate itself, or the literal is part of the verification command's own grep regex - add a marker on its own line so the gate skips that literal
One marker per literal. The marker exempts only the exact literal it names.
<!-- vpmodule:atom:end keep-the-failure-literal-out-of-the-action-text -->
<!-- vpmodule:atom:begin keep-the-forbidden-literal-out-of-the-action-body -->
---
instruction_id: keep-the-forbidden-literal-out-of-the-action-body
title: Keep the forbidden literal out of the action body
summary: "When the verification forbids a literal, that literal does not appear verbatim in the action body; the comment is rephrased by concept."
capability_tags:
  - review-code
pattern_tags:
  - testable-criteria
conditions_applies_when: A verification block forbids a literal with a negative grep.
conditions_does_not_apply_when: The literal must appear in the plan body for another reason.
artifact_contract_output_type: plan-literal-discipline
artifact_contract_required_data:
  - the forbidden literal
  - the action body
  - the rephrased comment
artifact_contract_verified_by: the forbidden literal does not appear verbatim in the action body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the forbidden literal out of the action body
When an `<acceptance_criteria>` or `<verify>` block uses a **negative grep** — `grep -c 'LITERAL' file == 0`, meaning "this literal must NOT appear in the file" — that same `LITERAL` must not appear verbatim anywhere in an `<action>` body
Verbatim code blocks, JSDoc samples, head-comment references, and "what NOT to do" illustrations get echoed into the file the executor writes, so the executor's commit-time gate fails on the *comment text*, not on a real code regression
One marker per literal. The marker exempts only the exact literal it names
<!-- vpmodule:atom:end keep-the-forbidden-literal-out-of-the-action-body -->
<!-- vpmodule:atom:begin let-the-failure-propagate-in-a-verify-gate -->
---
instruction_id: let-the-failure-propagate-in-a-verify-gate
title: Let the failure propagate in a verify gate
summary: A fallback that turns a failed read into a zero converts a failure into a passing gate that measures nothing.
capability_tags:
  - review-code
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A verification gate computes a value it then compares.
conditions_does_not_apply_when: The absence of the input is semantically the default and the result is not compared.
artifact_contract_output_type: gate-reading
artifact_contract_required_data:
  - the command that reads the value
  - the comparison it feeds
  - the failure behaviour
artifact_contract_verified_by: a failed read leaves the gate failing rather than producing a comparable default
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Let the failure propagate in a verify gate
`2>/dev/null || echo "0"` in an assignment that feeds a comparison converts any failure into a passing gate that measures nothing
If files don't exist (wrong path, etc.), both sides become `"0"`. Comparison passes. Gate certifies parity while measuring nothing
**When `|| echo "default"` is acceptable:** only when absence is semantically the default AND the result is NOT used in a comparison that should detect absence
<!-- vpmodule:atom:end let-the-failure-propagate-in-a-verify-gate -->
<!-- vpmodule:atom:begin make-the-action-specific-enough-for-another-instance -->
---
instruction_id: make-the-action-specific-enough-for-another-instance
title: Make the action specific enough for another instance
summary: An action is specific enough when another instance could execute it without asking a clarifying question.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A task action is written.
conditions_does_not_apply_when: The action is a single mechanical edit with no ambiguity.
artifact_contract_output_type: action-text
artifact_contract_required_data:
  - the action
  - the nouns it names
  - the verbs it states
artifact_contract_verified_by: another instance could execute the action without asking a question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Make the action specific enough for another instance
**Specificity test:** Could a different Claude instance execute the task without asking clarifying questions? If not, add more detail
For each `<action>` step, re-read it as if you have NEVER seen this codebase. Is every noun unambiguous (which file? which function? which endpoint?)? Is every verb specific (add WHERE? modify HOW?)? If a step could be interpreted two ways, rewrite it. Include file paths, function names, and expected behavior in every action step
<!-- vpmodule:atom:end make-the-action-specific-enough-for-another-instance -->
<!-- vpmodule:atom:begin match-the-anchored-pattern-to-the-real-output-shape -->
---
instruction_id: match-the-anchored-pattern-to-the-real-output-shape
title: Match the anchored pattern to the real output shape
summary: "An anchored pattern is checked against the shape the tool really prints, because a line prefix turns an anchor into a pattern that matches nothing and the command silently succeeds."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check greps the output of a tool that prints a prefix before each line.
conditions_does_not_apply_when: The tool prints one bare line per record.
artifact_contract_output_type: pattern-check
artifact_contract_required_data:
  - the anchored pattern
  - the shape the output really has
artifact_contract_verified_by: the pattern was matched against the real output shape and matches what the tool prints
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Match the anchored pattern to the real output shape
`pnpm ls vite | grep -E '^vite@7\.'` looks correct but silently fails. `pnpm ls` uses tree characters as line prefixes:
The `^` anchor matches line start, which is a tree character - the grep finds nothing.
**Bad:** `pnpm ls vite | grep -E '^vite@7\.'`
**Good:** `pnpm ls vite | grep -E 'vite@7\.'`
Same trap: `npm ls`, `yarn list`, `docker ps` column output, `kubectl get` table output.
<!-- vpmodule:atom:end match-the-anchored-pattern-to-the-real-output-shape -->
<!-- vpmodule:atom:begin never-ask-the-human-to-do-what-you-can-automate -->
---
instruction_id: never-ask-the-human-to-do-what-you-can-automate
title: Never ask the human to do what you can automate
summary: "Whatever the agent can do through a CLI or an API it does itself; a checkpoint verifies after the automation, it never replaces it."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A plan or a task would hand a step to the user.
conditions_does_not_apply_when: "Only the user can perform the step, for example an account creation or a physical action."
artifact_contract_output_type: automation-first-plan
artifact_contract_required_data:
  - the steps the agent performs itself
  - the steps that are genuinely manual
artifact_contract_verified_by: no step that the agent could perform was handed to the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never ask the human to do what you can automate
**Automation-first rule:** If
CAN do it via CLI/API,
MUST do it. Checkpoints verify AFTER automation, not replace it.
Never ask the user to do what
the agent can automate via CLI/API.
**DO:** Automate everything before checkpoint, be specific ("Visit https://myapp.vercel.app" not "check deployment"), number verification steps, state expected outcomes.
<!-- vpmodule:atom:end never-ask-the-human-to-do-what-you-can-automate -->