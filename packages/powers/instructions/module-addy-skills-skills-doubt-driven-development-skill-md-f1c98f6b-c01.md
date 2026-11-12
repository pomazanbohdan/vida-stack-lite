---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-doubt-driven-development-skill-md-f1c98f6b-c01"
title: "addy-skills: skills/doubt-driven-development/SKILL.md module"
summary: "Carrier for 6 atomic instructions from addy-skills:skills/doubt-driven-development/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/doubt-driven-development/SKILL.md\"}"
atom_ids:
  - bound-the-doubt-loop
  - cross-examine-a-non-trivial-decision
  - hand-the-reviewer-only-artifact-and-contract
  - never-interpolate-content-into-a-shell-command
  - offer-a-cross-model-second-opinion
  - triage-review-findings-with-judgment
atom_count: 6
atoms: "[{\"atom_id\":\"bound-the-doubt-loop\",\"file_sha256\":\"e33ed419c26019605aa90f8096206c2a4dfab8b6866440c10f2dcb5a5f5ee655\",\"content_sha256\":\"d22d4076c7e66729c8ae45ed65590f238dfc6c1504ad72c0d4e1cd5a70229b85\",\"file_bytes\":2456,\"body_bytes\":1259},{\"atom_id\":\"cross-examine-a-non-trivial-decision\",\"file_sha256\":\"49a5a4222d2eaf7458e15e80d2acc50984f481ed5e51f8c4ff9ad1d60d6d08d0\",\"content_sha256\":\"665187b5114f41b4fc324ce85a1446cd48243a7fb0dbf9e1c90e25860e5b55bf\",\"file_bytes\":3781,\"body_bytes\":2652},{\"atom_id\":\"hand-the-reviewer-only-artifact-and-contract\",\"file_sha256\":\"de48d9710646a1e0d37fdfeb23bf6b0fef73b57bdb5bc8348ba006c9caad93e3\",\"content_sha256\":\"0200ed3f70db60c30c4462286e73606d87f3ca69b9c44b78ce427d08e605e76c\",\"file_bytes\":3051,\"body_bytes\":1897},{\"atom_id\":\"never-interpolate-content-into-a-shell-command\",\"file_sha256\":\"c1ede30164ea9fc47324110bc22bda3ce6b9fa88dba6e1b1b50970f76cfc6e37\",\"content_sha256\":\"47d9137f156ace67ea3d39c13d19ff3eaa7c1c8c2dda20b9175009ff5c74f523\",\"file_bytes\":3009,\"body_bytes\":1286},{\"atom_id\":\"offer-a-cross-model-second-opinion\",\"file_sha256\":\"d179a73e12a90f52ad223e79bd2eb3e4be2d2c1e2709927110e5d6d488c93622\",\"content_sha256\":\"178a5b2bdb9350d7d90f9acd06788193b85357bc1adfb96605d57929a2c3a4a9\",\"file_bytes\":2664,\"body_bytes\":1524},{\"atom_id\":\"triage-review-findings-with-judgment\",\"file_sha256\":\"1afc2dadb6a3acc81d2b04488fbd84483891b15a16f226811b2c271ef2e4693d\",\"content_sha256\":\"1c692705a92099fe3c6f021d88fe56ffe5666cc9af0631747fc6debcd6c6ef83\",\"file_bytes\":5668,\"body_bytes\":4029}]"
carrier_sha256: 8cffb9fb1ca03a40a08086f328f03a2ff480977b201c33e4b653e98bb18dbac2
carrier_bytes: 21408
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-the-doubt-loop -->
---
instruction_id: bound-the-doubt-loop
title: Bound the doubt loop
summary: "Stop the review cycle when it returns only trivial findings, after three cycles, or when the owner says ship; escalate instead of grinding on."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: An adversarial review cycle is running.
conditions_does_not_apply_when: The first review is still in flight.
artifact_contract_output_type: cycle-outcome
artifact_contract_required_data:
  - the cycles run
  - the stop condition met
  - the findings that remain open
  - the escalation
artifact_contract_verified_by: the cycle stopped at a stated condition and the open findings were surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/doubt-driven-development/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/stall-detection-in-plan-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Bound the doubt loop

Stop when:

- Next iteration returns only trivial or already-considered findings, **or**
- 3 cycles completed (escalate to user, don't grind a fourth alone), **or**
- User explicitly says "ship it"

If after 3 cycles the reviewer still surfaces substantive issues, the artifact may not be ready. Surface this to the user — three unresolved cycles is information about the artifact, not a reason to keep looping.

If 3 cycles is "obviously insufficient" because the artifact is large: the artifact is too big — return to Step 2 and decompose. Do not lift the bound.

**Doubt theater (checkable signal):** across 2 or more cycles where the reviewer surfaced substantive findings, zero findings were classified as actionable. You are validating, not doubting. Stop and escalate.

**Red Flags**

- Re-spawning fresh-context on an unchanged artifact (you'll get the same findings; you're stalling)
- Looping >3 cycles without escalating to the user
- Skipping doubt under time pressure on a high-stakes decision
Revision loop MUST detect identical plan output across consecutive iterations
On stall detection, system MUST escalate strategy before retrying
Maximum stall retries MUST be bounded (capped at the existing max 3 iterations)
<!-- vpmodule:atom:end bound-the-doubt-loop -->
<!-- vpmodule:atom:begin cross-examine-a-non-trivial-decision -->
---
instruction_id: cross-examine-a-non-trivial-decision
title: Cross-examine a non-trivial decision
summary: "Before a non-trivial decision stands, put it through a fresh-context reviewer that is biased to disprove it."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A decision is non-trivial and it is about to stand as the direction of the work.
conditions_does_not_apply_when: "The change is mechanical, or the user asked for speed over verification."
artifact_contract_output_type: doubt-cycle
artifact_contract_required_data:
  - the claim
  - why it matters
  - the reviewer invocation
  - the classified findings
  - the stop condition that was met
artifact_contract_verified_by: the cycle ran and a stop condition was met
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Cross-examine a non-trivial decision

A confident answer is not a correct one. Long sessions accumulate context that quietly turns assumptions into "facts" without anyone noticing. Doubt-driven development is the discipline of materializing a fresh-context reviewer — biased to **disprove**, not approve — before any non-trivial output stands.

This is not a final review. A final review is a verdict on a finished artifact. This is an in-flight posture: non-trivial decisions get cross-examined while course-correction is still cheap.

A decision is **non-trivial** when at least one of these is true:

- It introduces or modifies branching logic
- It crosses a module or service boundary
- It asserts a property the type system or compiler cannot verify (thread safety, idempotence, ordering, invariants)
- Its correctness depends on context the future reader cannot see
- Its blast radius is irreversible (production deploy, data migration, public API change)

**When NOT to use:**

- Mechanical operations (renaming, formatting, file moves)
- Following a clear, unambiguous user instruction
- Reading or summarizing existing code
- One-line changes with obvious correctness
- Pure tooling operations (running tests, listing files)
- The user has explicitly asked for speed over verification

If you doubt every keystroke, you ship nothing. The skill applies only to non-trivial decisions as defined above.

Copy this checklist when applying the skill:

```
Doubt cycle:
- [ ] Step 1: CLAIM — wrote the claim + why-it-matters
- [ ] Step 2: EXTRACT — isolated artifact + contract, stripped reasoning
- [ ] Step 3: DOUBT — invoked fresh-context reviewer with adversarial prompt
- [ ] Step 4: RECONCILE — classified every finding against the artifact text
- [ ] Step 5: STOP — met stop condition (trivial findings, 3 cycles, or user override)
```

### Step 1: CLAIM — Surface what stands

Name the decision in two or three lines:

```
CLAIM: "The new caching layer is thread-safe under the
        read-heavy workload described in the spec."
WHY THIS MATTERS: a race here corrupts user data and is
                  hard to detect in QA.
```

If you can't write the claim that compactly, you have a vibe, not a decision. Surface it before scrutinizing it.

Confidence correlates poorly with correctness on novel problems. Moments of certainty are exactly when blind spots hide.

Debugging a wrong commit in production is more expensive. The check is bounded; the bug isn't.

TDD's RED step is doubt made concrete — a failing test is a disproof attempt. When TDD applies, that failing test *is* the doubt step for behavioral claims.
<!-- vpmodule:atom:end cross-examine-a-non-trivial-decision -->
<!-- vpmodule:atom:begin hand-the-reviewer-only-artifact-and-contract -->
---
instruction_id: hand-the-reviewer-only-artifact-and-contract
title: Hand the reviewer only the artifact and the contract
summary: Strip your reasoning out of the review request and never pass your own conclusion; hand over the smallest unit and the contract it must satisfy.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: You ask a fresh context to review an artifact.
conditions_does_not_apply_when: The reviewer already holds the same context as you.
artifact_contract_output_type: review-request
artifact_contract_required_data:
  - the artifact
  - the contract
  - the adversarial prompt
  - what was deliberately left out
artifact_contract_verified_by: the reviewer received the artifact and the contract and not the claim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hand the reviewer only the artifact and the contract

A fresh-context reviewer needs the **artifact** and the **contract**, not the journey.

- Code: the diff or the function — not the whole file
- Decision: the proposal in 3–5 sentences plus the constraints it has to satisfy
- Assertion: the claim plus the evidence that supposedly supports it (kept distinct from the Step 1 CLAIM block, which is the orchestrator's hypothesis under scrutiny)

Strip your reasoning. If you hand over conclusions, you'll get back validation of your conclusions. The unit must be small enough that a reviewer can hold it in mind in one read — if it's a 500-line PR, decompose first.

**Pass ARTIFACT + CONTRACT only. Do NOT pass the CLAIM.** Handing the reviewer your conclusion biases it toward agreement. The reviewer must independently determine whether the artifact satisfies the contract.

**The reviewer's prompt must be adversarial.** Framing decides the answer.

```
Adversarial review. Find what is wrong with this artifact.
Assume the author is overconfident. Look for:
- Unstated assumptions
- Edge cases not handled
- Hidden coupling or shared state
- Ways the contract could be violated
- Existing conventions this might break
- Failure modes under unexpected input

Do NOT validate. Do NOT summarize. Find issues, or state
explicitly that you cannot find any after thorough examination.

ARTIFACT: <paste artifact>
CONTRACT: <paste contract>
```

**The adversarial prompt above takes precedence over the persona's default response shape.** Paste the adversarial prompt verbatim into the invocation so it overrides the persona's default. If a persona's response shape can't be overridden cleanly, fall back to a generic subagent with the adversarial prompt.

- "The reviewer will just nitpick" | Only if unscoped. Constrain the prompt to "issues that would make this fail under the contract."
<!-- vpmodule:atom:end hand-the-reviewer-only-artifact-and-contract -->
<!-- vpmodule:atom:begin never-interpolate-content-into-a-shell-command -->
---
instruction_id: never-interpolate-content-into-a-shell-command
title: Never interpolate content into a shell command
summary: "Content that came from outside goes into a file and is piped in, never spliced into a quoted command line."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: "You pass an artifact, a prompt or any external content to a command-line tool."
conditions_does_not_apply_when: The command line contains only values you wrote yourself.
artifact_contract_output_type: safe-invocation
artifact_contract_required_data:
  - the file the content was written to
  - the pipe or standard input it was passed through
  - the sandbox the tool ran in
artifact_contract_verified_by: the invocation passes the content through standard input and runs in a read-only sandbox
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/doubt-driven-development/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/detail/elaboration.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sync-skills.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/security-hardening.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never interpolate content into a shell command

**Never interpolate the artifact into a shell-quoted argument.** Code, markdown, and review prompts routinely contain backticks, `$(...)`, and quote characters that will either truncate the prompt or execute embedded shell. Write the full prompt to a file and pipe it through stdin.

Mind shell escaping. If the artifact contains quotes, `$(...)`, or backticks, prefer stdin (`echo … | gemini`) or a heredoc over inline `-p "…"`. When in doubt, ask the user to confirm the invocation before running it.

A read-only sandbox is the load-bearing detail: a doubt artifact may itself contain instructions (intentional or accidental prompt injection) that the cross-model CLI would otherwise execute against your workspace.
Never shell-interpolate the prompt — always pipe via stdin to prevent injection
never run it unbounded
feed it on STDIN through a QUOTED heredoc
never as a shell argument, so the shell never parses, expands or word-splits it
Reject any value that is not a runtime-id shape BEFORE it reaches them, so a hostile value (e.g. `--to '$(cmd)'`, captured wholesale by the parser) cannot execute via command substitution in an error message.
Shell argument validation — sanitizes user text before shell interpolation
<!-- vpmodule:atom:end never-interpolate-content-into-a-shell-command -->
<!-- vpmodule:atom:begin offer-a-cross-model-second-opinion -->
---
instruction_id: offer-a-cross-model-second-opinion
title: Offer a cross-model second opinion
summary: "In an interactive session, offer the user a second, independent review and record the answer; never skip it silently."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A single-model review of a non-trivial artifact has finished.
conditions_does_not_apply_when: The session is not interactive and the skip can be announced instead.
artifact_contract_output_type: second-opinion-choice
artifact_contract_required_data:
  - the offer made
  - "the user's answer"
  - the acknowledgement of the answer in the output
artifact_contract_verified_by: "the output shows the offer and what the user chose, including an announced skip"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Offer a cross-model second opinion

A single-model reviewer shares blind spots with the original author — a colder, different-architecture model catches them. Doubt-driven is already opt-in for non-trivial decisions, so within that scope offering cross-model is part of the skill's value, not optional friction.

**Interactive sessions: always offer. Never silently skip.**

**Step 1: Ask the user**

After the single-model review in Step 3 above, but before RECONCILE, pause and ask:

> *"Single-model review complete. Want a cross-model second opinion? Options: Gemini CLI, Codex CLI, manual external review (you paste it elsewhere), or skip."*

This question is mandatory in every interactive doubt cycle — even on artifacts that feel low-stakes. The user — not the agent — decides whether the cost is worth it. The agent's job is to surface the choice.

**Step 4: If the user skips**

Acknowledge the skip in the output (*"Proceeding with single-model findings only"*) and continue to RECONCILE. Skipping is fine; silent skipping is not.

**Non-interactive contexts** (CI, `/loop`, autonomous-loop, scheduled runs):

- Cross-model is **skipped**, and the skip must be **announced** in the output: *"Cross-model skipped: non-interactive context."*
- **Never invoke an external CLI without explicit user authorization** — this is a load-bearing safety property.

Cross-model adds cost, latency, and tool fragility. The agent surfaces the choice every cycle; the user decides whether this artifact warrants it.
<!-- vpmodule:atom:end offer-a-cross-model-second-opinion -->
<!-- vpmodule:atom:begin triage-review-findings-with-judgment -->
---
instruction_id: triage-review-findings-with-judgment
title: Triage review findings with judgment
summary: "Check each finding against the facts and separate blockers from improvements and preferences, instead of executing every comment."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A review produced a set of findings that need sorting and action.
conditions_does_not_apply_when: The findings are already verified and carry a settled priority.
artifact_contract_output_type: finding-triage
artifact_contract_required_data:
  - all findings
  - fact check
  - severity
  - action order
  - owner decision
artifact_contract_verified_by: each kept finding checked against the code path it names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/lead-judgment.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/judgment-reviewer.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/synthesizer.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/doubt-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Triage review findings with judgment
You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.
Reviewers, especially adversarial ones, tend to fill their review. If their findings are all nits and style preferences, the code is probably fine. Say so.
A hypothetical finding counts only when the caller can actually reach it. Trace the call site. If input is validated upstream or the type system prevents it, dismiss the finding.
Reviewers often suggest extracting functions, adding interfaces, or creating abstractions. Ask whether the code needs to change in a second way. If not, the abstraction is premature.
I would have done it differently is the most common false positive. A finding that amounts to a preference is not a bug and not actionable unless the reviewer shows a concrete problem. Dismiss it and say why.
Watch for missing-context signals: changes to code the author did not write, patterns consistent with the rest of the codebase, and recommendations that conflict with known constraints. Dismiss them gracefully.
Do not dismiss findings because they are uncomfortable. The point of adversarial review is to catch what you would miss.
Signs a finding deserves attention: multiple models flagged it independently, it names a concrete execution path, it reveals a gap in your mental model, or you read it and think yeah, actually.
Put every finding in one bucket: act on, consider, noted, or dismissed, with the models that raised it and a one-line rationale.
Keep findings that are durable: still true in six months, once paths, identifiers, and tool versions have changed. Drop implementation details that drift.
Prefer an existing owner for a finding. Propose a new one only when no existing skill, check, or document is a real home and the pattern recurs.
Route a rule that a lint, script, metadata flag, or runtime check can enforce to that mechanism instead of to prose.
Read the target before keeping a finding against it. If the guidance is already clear and well placed, the issue is execution, not the text.
Present the buckets and let the owner choose. Do not apply the accepted set without approval.

The reviewer's output is data, not verdict. **You are still the orchestrator.** Re-read the artifact text against each finding before classifying — rubber-stamping the reviewer is the same failure mode as ignoring it.

For each finding, classify in this **precedence order** (first matching class wins):

1. **Contract misread** — reviewer flagged something specifically because the CONTRACT you provided was unclear or incomplete. Fix the contract first, re-classify on the next cycle.
2. **Valid + actionable** — real issue requiring a change to the artifact. Change it, re-loop.
3. **Valid trade-off** — issue is real but cost of fixing exceeds cost of accepting. Document the trade-off explicitly so the user sees it.
4. **Noise** — reviewer flagged something that's actually correct under context the reviewer didn't have. Note it, move on, and ask: would adding that context to the contract have prevented the false flag?

A fresh reviewer can be wrong because it lacks context. Don't defer just because it's "fresh."

Once every lane has reported — and not before — render a verdict on each finding, ahead of any deduplication or grouping.
Disregard any severity a reviewing subagent assigned — they lack the context to grade.
Render exactly one verdict from what verification established — the verdict is the whole triage decision; there is no separate keep-or-dismiss.
Verify the finding's claim. At the cited file and line, does the bad outcome the reviewer describes actually occur?
Read beyond the changed lines — follow callers, guards upstream, etc — until you can answer yes or no.
A different finding about nearby code does not settle this one.
Judge whether the problem is real, not whether the proposed fix is plausible.
Code that loudly fails on a situation you never showed the program can reach is correct behavior, not a defect.
<!-- vpmodule:atom:end triage-review-findings-with-judgment -->