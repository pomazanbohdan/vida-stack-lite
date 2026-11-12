---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-planning-artifacts-md-7378d4b2-c01"
title: "gsd-core: docs/reference/planning-artifacts.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/reference/planning-artifacts.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/planning-artifacts.md\"}"
atom_ids:
  - compare-only-numbers-measured-the-same-way
  - mark-a-behaviour-dependent-truth-unverified-until-a-test-exercises-it
  - match-by-exact-key-and-fail-closed-on-ambiguity
  - pause-work-with-a-handoff
atom_count: 4
atoms: "[{\"atom_id\":\"compare-only-numbers-measured-the-same-way\",\"file_sha256\":\"2eb95ab8ba52e0be0000920b87fad5762be3949c718700947bbe41d22b6463fe\",\"content_sha256\":\"b24a49742a16e4dd062f6bfe31b69da0e7ce06e474fa35c8a77ab6ef692f4e88\",\"file_bytes\":1473,\"body_bytes\":292},{\"atom_id\":\"mark-a-behaviour-dependent-truth-unverified-until-a-test-exercises-it\",\"file_sha256\":\"85cd1a89bfb01402a16c9b2f562b277c024656a6adb53a9c4182b36317f24486\",\"content_sha256\":\"2dea7b0679b0fc2d5995c927b3ca235254faf69ab67b425f5b7c0159c1366c12\",\"file_bytes\":1525,\"body_bytes\":258},{\"atom_id\":\"match-by-exact-key-and-fail-closed-on-ambiguity\",\"file_sha256\":\"52d1308746a826379477b4578e2fd58e17733eab2112099ca59c148f378b423e\",\"content_sha256\":\"687a5170d50f782616968a349c85d3e4f99a514c79714df141ddb8f692c050ce\",\"file_bytes\":1557,\"body_bytes\":323},{\"atom_id\":\"pause-work-with-a-handoff\",\"file_sha256\":\"84da18e4324e3ebf7b30996cd09c2af4a47bd4e106b867477d529befe1da30f9\",\"content_sha256\":\"a4615c6b814f54110a32995e2eb5626f383ad3e3d31ce6e6b8f6a53f032f7d20\",\"file_bytes\":3277,\"body_bytes\":1776}]"
carrier_sha256: b6a67b85aa4d43318cb9f319384c4984f4cdae3e6260f3726e1409ca27d2f2af
carrier_bytes: 8429
revision: 1
status: active
---
<!-- vpmodule:atom:begin compare-only-numbers-measured-the-same-way -->
---
instruction_id: compare-only-numbers-measured-the-same-way
title: Compare only numbers measured the same way
summary: "A measurement is compared with an estimate only when both were taken with the same method; a ratio between two different measurement methods measures the methods, not the miss."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: An estimate and an actual measurement are about to be compared.
conditions_does_not_apply_when: Both numbers come from the same measurement method.
artifact_contract_output_type: measurement-scale
artifact_contract_required_data:
  - the scale of the estimate
  - the scale of the measurement
  - why they must be the same
artifact_contract_verified_by: both numbers were taken with the same scale and the ratio means what it should
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/planning-artifacts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Compare only numbers measured the same way
- `tokens` uses the **same scale as the estimate**, not a harness-reported token count — an executor subagent cannot read its own consumption, and a ratio between two different measurement methods would measure the methods rather than the miss.
<!-- vpmodule:atom:end compare-only-numbers-measured-the-same-way -->
<!-- vpmodule:atom:begin mark-a-behaviour-dependent-truth-unverified-until-a-test-exercises-it -->
---
instruction_id: mark-a-behaviour-dependent-truth-unverified-until-a-test-exercises-it
title: Mark a behaviour-dependent truth unverified until a test exercises it
summary: A truth that depends on runtime behaviour is not counted as verified when no test exercises it; it is excluded from the score and routed to a human.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A truth that depends on a state transition, a cleanup or an ordering invariant is being scored."
conditions_does_not_apply_when: A test exercises the behaviour and the truth is directly observed.
artifact_contract_output_type: behaviour-unverified
artifact_contract_required_data:
  - the behaviour-dependent truth
  - the field it is counted in
  - where it is routed
artifact_contract_verified_by: the behaviour-dependent truth was not counted as verified and was routed to a human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/planning-artifacts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mark a behaviour-dependent truth unverified until a test exercises it
- it is excluded from `score`, counted in the `behavior_unverified` frontmatter field, and routed to `human_needed`, so a behaviour-dependent gap can no longer count toward a clean N/N.
<!-- vpmodule:atom:end mark-a-behaviour-dependent-truth-unverified-until-a-test-exercises-it -->
<!-- vpmodule:atom:begin match-by-exact-key-and-fail-closed-on-ambiguity -->
---
instruction_id: match-by-exact-key-and-fail-closed-on-ambiguity
title: Match by the exact key and fail closed on ambiguity
summary: "A record is matched to its owner by the exact key, and when more than one record matches, or the matched record is not readable, the run surfaces the conflict and stops instead of picking one."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A record written by another component has to be matched to the thing it belongs to.
conditions_does_not_apply_when: Exactly one record matches and it is readable.
artifact_contract_output_type: exact-key-match
artifact_contract_required_data:
  - the key that is matched
  - the number of records that matched
  - what happens when the match is ambiguous
artifact_contract_verified_by: the record was matched by its exact key and an ambiguous match stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/planning-artifacts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Match by the exact key and fail closed on ambiguity
- Match a manifest to a plan by its exact `plan_id` (string-equal — phase ids may contain `.`).
- If more than one manifest matches a single `plan_id`, or a matched manifest is not valid JSON, fail closed: surface the conflict and stop; never pick one heuristically.
<!-- vpmodule:atom:end match-by-exact-key-and-fail-closed-on-ambiguity -->
<!-- vpmodule:atom:begin pause-work-with-a-handoff -->
---
instruction_id: pause-work-with-a-handoff
title: Pause work with a handoff
summary: "Leave a checkpoint a cold-start agent can resume from: stop at a safe boundary, make the work durable, and write the resume note off-context."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: You stop work before completion and will return later or hand it to someone else.
conditions_does_not_apply_when: The work is finished and the result is already accepted.
artifact_contract_output_type: handoff-note
artifact_contract_required_data:
  - done
  - verified
  - state
  - open questions
  - next step
  - suggested skills
artifact_contract_verified_by: a fresh session resumes from the note without asking questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/pause-safely.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/handoff/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/in-progress/claude-handoff/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/planning-artifacts.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Pause work with a handoff
You own a clean stop.
Leave a checkpoint a cold-start agent can resume from.
On "keep going", "going to bed, keep going", or "don't stop", do not pause.
Stop at a safe boundary: finish the current atomic step or back out of it.
Start nothing new, and cancel any nested subagents.
Take no irreversible action to pause.
No pull request and no push unless you already had one out.
Make the work durable.
Commit uncommitted edits as one clear `docs(pause):` commit on the current branch so nothing is lost.
If the tree is broken, say so in the commit body in one line.
Write the resume note off-context.
Capture intent, what you were doing, progress and what is verified, current state, next steps, key files, and gotchas.
If a work trail exists, point at it instead of duplicating it.
Report where you are in the loop, what is on disk versus still in your head, the commits you made, whether the tree is clean, and the first action on resume.
This is a pause, not a final report.
Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows) - not the current workspace. Include a "suggested skills" section in the document, naming which skills the next agent should call. Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead. Redact any sensitive information, such as API keys, passwords, or personally identifiable information.
- **Purpose**: Machine-readable pause state written when work is interrupted. Contains the resume point, in-progress context, and continuation instructions. Consumed exactly once — on resume.
<!-- vpmodule:atom:end pause-work-with-a-handoff -->