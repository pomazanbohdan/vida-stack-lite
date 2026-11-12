---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-interview-me-skill-md-bad3e108-c01"
title: "addy-skills: skills/interview-me/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/interview-me/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/interview-me/SKILL.md\"}"
atom_ids:
  - ask-one-question-with-a-guess
  - distinguish-what-they-want-from-what-they-should-want
  - flag-an-unanswerable-ask-as-a-blocker
  - require-an-explicit-yes-to-confirm-the-intent
  - state-a-read-with-a-confidence-number
  - stop-the-turn-after-the-intent-is-confirmed
  - stop-when-you-can-predict-the-reaction
  - write-back-the-statement-of-intent
atom_count: 8
atoms: "[{\"atom_id\":\"ask-one-question-with-a-guess\",\"file_sha256\":\"602b281f1ce7985bcb301e9a6578ba40b142d47287ff47f21c6d209299e00bf5\",\"content_sha256\":\"8aaf3aa22110af7ef15ff3a2640056d3045f5d116e99d3901ecda799118f8396\",\"file_bytes\":2824,\"body_bytes\":1411},{\"atom_id\":\"distinguish-what-they-want-from-what-they-should-want\",\"file_sha256\":\"664b5ca0a168956da84e4dfb5aa5982df056da15214abaa3bf23c34e6efd2bf1\",\"content_sha256\":\"eda82646a2357c2faca4409ddb7727adb43cb6a1290e0301aca1322cae81a50f\",\"file_bytes\":2140,\"body_bytes\":817},{\"atom_id\":\"flag-an-unanswerable-ask-as-a-blocker\",\"file_sha256\":\"829e3698b2962d9b45c5d96f7523ef99bf97785f79a1e16d2fec47c64870b821\",\"content_sha256\":\"5e5d7540c1ed77a6e20d398877b231e95c5fd30466735a504149f555c1a212a4\",\"file_bytes\":1928,\"body_bytes\":518},{\"atom_id\":\"require-an-explicit-yes-to-confirm-the-intent\",\"file_sha256\":\"c7ecda03493b51ecf9154d73928b808997fc01f72a56f2c56e3f17968cf16ccf\",\"content_sha256\":\"fab5a83e3600d66d2ad13e05335446dbc29182a9dfbf8c1fa24244e0da124542\",\"file_bytes\":2396,\"body_bytes\":991},{\"atom_id\":\"state-a-read-with-a-confidence-number\",\"file_sha256\":\"bd955750951c9b55a44c7779c981018160c2e2b3c15975fdcbf0d4f2ec806ce0\",\"content_sha256\":\"590b97d086ae6dd10d432882ad330aa8308fabb245e3eabd8318ee3d3db16510\",\"file_bytes\":2166,\"body_bytes\":935},{\"atom_id\":\"stop-the-turn-after-the-intent-is-confirmed\",\"file_sha256\":\"8a715aa87822648ba66f2f5717533896d0bf05b7e4f3774aec93b94f37db5c47\",\"content_sha256\":\"985e8dbc40bd3fa536048a2c30d1a2ba62450844dfa34a4e3a4b3e49ab595e87\",\"file_bytes\":1693,\"body_bytes\":437},{\"atom_id\":\"stop-when-you-can-predict-the-reaction\",\"file_sha256\":\"44fb68d9f80b750fb0821990b3ef7c55ec316a21e8f895d7e53c1aa765bb1910\",\"content_sha256\":\"b754768e813c3895b51baa8977e63dc628ceeb155f3994fc50e0ac33e34622c7\",\"file_bytes\":1926,\"body_bytes\":742},{\"atom_id\":\"write-back-the-statement-of-intent\",\"file_sha256\":\"c83311ef95f1bc97a46be04007568536ee60430e74f84d8d5643f85a9933ff33\",\"content_sha256\":\"5bd824749b450af52794a28a8d3084555786a8fcb6431050b70264b2dd684eb3\",\"file_bytes\":2219,\"body_bytes\":1029}]"
carrier_sha256: c075466c3ea73330d59afe1c423ad2033da5fa6ed5d872688a5c1bb790311956
carrier_bytes: 18387
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-one-question-with-a-guess -->
---
instruction_id: ask-one-question-with-a-guess
title: "Ask one question at a time, each with a guess"
summary: "Ask one focused question per turn, attach your guess and the reasoning behind it, and wait for the reaction before the next question."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The intent is still uncertain and the user is present to answer.
conditions_does_not_apply_when: "The answer is already known, or the question concerns a fact you can look up yourself."
artifact_contract_output_type: guessed-question
artifact_contract_required_data:
  - the single focused question
  - the guess at the answer
  - the reasoning that produced the guess
artifact_contract_verified_by: the user reacts to the guess before the next question is asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - research
---

# Ask one question at a time, each with a guess

Format:

```
Q: <one focused question>
GUESS: <your hypothesis for the answer, with the reasoning that produced it>
```

Wait for the user to react before asking the next question.

**Why one at a time, not a batch:**

- The user can't react to your hypotheses if you bury them in a list
- Batches encourage skim-reading and surface answers
- The third question often depends on the answer to the first; asking them all at once locks in the wrong framing
- The user's energy for thinking carefully is finite; spend it one question at a time

**Why attach a guess:**

- The user reacts faster to a wrong guess than they generate an answer from scratch
- It commits you to a hypothesis you can be visibly wrong about, which keeps you honest
- It surfaces *your* assumptions, which is what the interview is meant to expose

The risk here is a polite user agreeing with your guess to be agreeable. Mitigate by being visibly willing to be wrong, and occasionally guess in a direction you expect the user to push back on.

One or two questions at a time, in whatever order the gaps call for, each with the answer you would infer so the user can just confirm. A user who arrives with a hardened idea or says they want to move fast gets a confirmation and a read-back, not an interview.
After each answer, briefly reflect what you heard and how it shapes your thinking.
<!-- vpmodule:atom:end ask-one-question-with-a-guess -->
<!-- vpmodule:atom:begin distinguish-what-they-want-from-what-they-should-want -->
---
instruction_id: distinguish-what-they-want-from-what-they-should-want
title: Distinguish what they want from what they should want
summary: "Watch for answers that pattern-match convention or best practice, and ask what they would actually want if they did not have to justify it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The user answers with convention, best-practice language or a buzzword instead of a specific outcome."
conditions_does_not_apply_when: "The answer already names a concrete outcome, user and measure."
artifact_contract_output_type: intent-probe
artifact_contract_required_data:
  - the convention or buzzword heard
  - the probe asked
  - "the user's own answer"
artifact_contract_verified_by: the probe was asked and the answer names a specific outcome rather than a category
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body asks for concrete user intent when an answer is only convention or a buzzword; it gives no task subject that grounds a listed domain.
---

# Distinguish what they want from what they should want

The most dangerous answers are the ones where the user says what a thoughtful answer *sounds like* rather than what they actually want. Watch for:

- Answers that pattern-match best-practice talk ("I want it to be scalable", "clean architecture") without specifics
- Answers that defer to convention ("the way most apps do it", "the standard approach")
- Phrases like "I should probably…", "I think I'm supposed to…", "good engineering practice says…"
- Buzzwords as goals — when "modern", "scalable", "robust" are the answer instead of a specific outcome

When you hear these, the question to ask is:

> *"If you didn't have to justify this to anyone, what would you actually want?"*

That single question often does more work than the previous five.
<!-- vpmodule:atom:end distinguish-what-they-want-from-what-they-should-want -->
<!-- vpmodule:atom:begin flag-an-unanswerable-ask-as-a-blocker -->
---
instruction_id: flag-an-unanswerable-ask-as-a-blocker
title: Flag an unanswerable ask as a blocker
summary: "Do not interview without a live user; in a non-interactive run, report the underspecified ask as a blocker instead of guessing, and never resolve the intent by guessing."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The work runs without a live, responsive user to answer questions."
conditions_does_not_apply_when: A live user is present and can answer the questions.
artifact_contract_output_type: blocker-report
artifact_contract_required_data:
  - the underspecified ask
  - the non-interactive context
artifact_contract_verified_by: "the ask is reported as a blocker and nothing was guessed on the user's behalf"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Flag an unanswerable ask as a blocker

This needs a live, responsive user. **Do not invoke in non-interactive contexts** like CI pipelines, scheduled runs, or autonomous loops. If you are in one of those and the ask is underspecified, flag that as a blocker for the user instead of guessing.

Resolve intent from the invocation prompt and loaded artifacts. Do not fantasize or leave open questions.
If the intent cannot be resolved, stop with status `blocked` and the unresolved questions as the blocking condition.
<!-- vpmodule:atom:end flag-an-unanswerable-ask-as-a-blocker -->
<!-- vpmodule:atom:begin require-an-explicit-yes-to-confirm-the-intent -->
---
instruction_id: require-an-explicit-yes-to-confirm-the-intent
title: Require an explicit yes to confirm the intent
summary: "Only an explicit yes confirms the restated intent; delegation, ambiguity, a polite exit and silence are not a yes."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A restated statement of intent has been written back and the user has replied.
conditions_does_not_apply_when: The user corrected the restate and a new one has not yet been written.
artifact_contract_output_type: intent-confirmation
artifact_contract_required_data:
  - "the user's reply"
  - whether the reply is an explicit yes
  - the follow-up asked when it is not
artifact_contract_verified_by: "the confirmation is an explicit yes, not delegation, ambiguity or silence"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Require an explicit yes to confirm the intent

The gate is an explicit "yes." The following are **not** yes:

- "Whatever you think is best." → The user is delegating, which means they don't have 95% confidence either. Re-ask with two concrete options framed as a choice.
- "Sounds good." → Ambiguous. Ask: "Anything you'd refine?" Silence isn't confirmation.
- "Sure, let's go." → Often a polite exit, not an endorsement. Same follow-up.
- Silence followed by "okay let's start." → The user has given up on the interview, not converged. Stop and ask whether you've missed something.

If they correct you, fold the correction in and restate. Loop until you get an explicit yes.

Never infer the positive choice from an ambiguous answer: re-ask once, and if the answer is still ambiguous, treat it as a refusal.
When you have enough signal, ask: "I think I have a good sense of the direction. Ready for me to sketch, or want to keep discussing?"
Only proceed when the user says go.
<!-- vpmodule:atom:end require-an-explicit-yes-to-confirm-the-intent -->
<!-- vpmodule:atom:begin state-a-read-with-a-confidence-number -->
---
instruction_id: state-a-read-with-a-confidence-number
title: State the read with a confidence number
summary: "Before asking anything, write down the current best understanding in one sentence together with an honest confidence number."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "An ask is underspecified and no plan, spec or code exists yet."
conditions_does_not_apply_when: "The ask is unambiguous and self-contained, or the user has explicitly asked for speed over verification."
artifact_contract_output_type: intent-read
artifact_contract_required_data:
  - the one-sentence read of what the user wants
  - the confidence number
  - "the reason when the confidence is below ~70%"
artifact_contract_verified_by: "the confidence number is one the executor can defend, and any number below ~70% carries a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - research
---

# State the read with a confidence number

Before asking anything, write down your current best read of what the user wants in **one sentence**, plus an honest confidence number (0–100%):

```
HYPOTHESIS: You want a way to answer "how are we doing?" in standup, and "dashboard" was the convention that came to mind.
CONFIDENCE: ~30% — missing: who it's for, what "metrics" means in context, and what success looks like
```

The number forces honesty. If you wrote down a high number but can't actually predict the user's reactions to the next three questions you'd ask, the number is wrong. Start at the confidence level you can defend.

When confidence is below ~70%, append a brief reason on the same line — what's still unresolved or missing. This tells the user exactly what the interview needs to surface, and prevents the number from being a vague signal.

The number is a claim, not a mood: you must be able to defend it.
<!-- vpmodule:atom:end state-a-read-with-a-confidence-number -->
<!-- vpmodule:atom:begin stop-the-turn-after-the-intent-is-confirmed -->
---
instruction_id: stop-the-turn-after-the-intent-is-confirmed
title: Stop the turn after the intent is confirmed
summary: "On an explicit yes, deliver the confirmed statement of intent, offer the downstream paths, and end the turn without starting any of them."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - requirements-clarification
conditions_applies_when: The user has confirmed the statement of intent with an explicit yes.
conditions_does_not_apply_when: "The intent is not yet confirmed, or the downstream step was already chosen and agreed."
artifact_contract_output_type: turn-handoff
artifact_contract_required_data:
  - the confirmed statement of intent
  - the downstream paths offered
  - the end of the turn
artifact_contract_verified_by: no tool was invoked and no downstream work started in the turn that carried the confirmation
compatibility_excludes: []
compatibility_requires:
  - require-an-explicit-yes-to-confirm-the-intent
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Stop the turn after the intent is confirmed

When the user confirms the statement of intent with an explicit "yes":

1. **Deliver the confirmed Statement of Intent.**
2. **Offer downstream paths** (offer to save it to a document, draft a spec, or move to task planning after the spec).
3. **STOP YOUR TURN IMMEDIATELY.** Do NOT invoke tools or start downstream work in this turn. Hand control back to the user to choose the next step.
<!-- vpmodule:atom:end stop-the-turn-after-the-intent-is-confirmed -->
<!-- vpmodule:atom:begin stop-when-you-can-predict-the-reaction -->
---
instruction_id: stop-when-you-can-predict-the-reaction
title: Stop when you can predict the reaction
summary: "End the interview when you can predict the user's reaction to the next three questions, and stop earlier if several rounds pass without progress."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The interview has run for a number of rounds and the intent may already be settled.
conditions_does_not_apply_when: The ask was unambiguous and no interview was needed.
artifact_contract_output_type: interview-stop
artifact_contract_required_data:
  - the prediction test and its answer
  - "the restate produced, or the step-back offered"
artifact_contract_verified_by: the prediction test was answered and either the restate was produced or the user was told what is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Stop when you can predict the reaction

You're done when you can answer yes to this:

> *Can I predict the user's reaction to the next three questions I would ask?*

If yes, you have shared understanding. Stop interviewing and produce the restate. If no, you're not done; ask the next question.

This is a checkable test, not a vibe. It also has a floor: if you've gone several rounds and still can't predict, that's information about the ask, not a reason to keep grinding. Stop and tell the user: "I've asked X questions and I still can't predict your reactions. Something foundational is missing. Want to step back?"

Three or more rounds without your confidence visibly rising: you're asking the wrong questions, step back and reframe.
<!-- vpmodule:atom:end stop-when-you-can-predict-the-reaction -->
<!-- vpmodule:atom:begin write-back-the-statement-of-intent -->
---
instruction_id: write-back-the-statement-of-intent
title: Write back the statement of intent
summary: "Restate what you now think the user wants in their own words and a fixed set of lines, so it can be confirmed or corrected line by line."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: Your confidence in the intent is high enough to write it down.
conditions_does_not_apply_when: "The intent is still unresolved, or the ask was unambiguous and self-contained."
artifact_contract_output_type: statement-of-intent
artifact_contract_required_data:
  - outcome
  - user
  - why now
  - success
  - constraint
  - out of scope
artifact_contract_verified_by: "the user can confirm or correct each line, the out-of-scope line is present, and the intent is saved only after the user confirms"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/interview-me/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Write back the statement of intent

When your confidence is high, write back what you now think the user wants. Keep it tight (5–8 lines), use their language where possible, and structure it so the user can confirm or correct line by line:

```
Here's what I now think you want:

- Outcome:      <one line>
- User:         <one line — who benefits>
- Why now:      <one line — what changed>
- Success:      <one line — how we know it worked>
- Constraint:   <one line — the binding limit>
- Out of scope: <one line — what we're explicitly not doing>

Yes / no / refine?
```

Including "Out of scope" is non-negotiable. Half of misalignment is silent disagreement about what is *not* being built.

The output of this work is a **confirmed statement of intent**: the restate, with an explicit yes. Specs, plans, and task lists are downstream; they consume the intent this produces.

If the user wants the intent to persist (a multi-session project, a handoff to another collaborator), offer to save it to a document.
<!-- vpmodule:atom:end write-back-the-statement-of-intent -->