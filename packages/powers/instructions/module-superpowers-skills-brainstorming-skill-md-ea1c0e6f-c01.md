---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-brainstorming-skill-md-ea1c0e6f-c01"
title: "superpowers: skills/brainstorming/SKILL.md module"
summary: "Carrier for 8 atomic instructions from superpowers:skills/brainstorming/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/brainstorming/SKILL.md\"}"
atom_ids:
  - ask-one-open-question
  - choose-visual-or-textual-explanation
  - clarify-before-design
  - lay-out-approaches-before-design
  - offer-context-recon
  - play-back-understanding-in-chunks
  - size-and-gate-the-work
  - spike-throwaway-to-learn
atom_count: 8
atoms: "[{\"atom_id\":\"ask-one-open-question\",\"file_sha256\":\"04f58d6ee044398986916cf95b6262495a67746f3d21b7ec4a06794578660359\",\"content_sha256\":\"18b3b4f3ed3582b197a70cbec51ae59ed5f53ed34e886d8ec8ec4424f70329e1\",\"file_bytes\":4013,\"body_bytes\":2674},{\"atom_id\":\"choose-visual-or-textual-explanation\",\"file_sha256\":\"6a60217d0bcf902428f214c3da766b8ab6f99dbec5c324f0be7f26e1591b4716\",\"content_sha256\":\"c5886fad69d4f63060fe9264c8d8b241557b40f53b8c3e1d4f2337a9bdf3f126\",\"file_bytes\":2413,\"body_bytes\":1187},{\"atom_id\":\"clarify-before-design\",\"file_sha256\":\"b6fd212a5e3b68fabc64f2d91749bf60f071b07d7eac0015ffa775f6e41cfb1f\",\"content_sha256\":\"41e8fb32f2654ba2b44e1fe10c41bea4bd16fee2bad03709ecb9c9f608812c24\",\"file_bytes\":2578,\"body_bytes\":1280},{\"atom_id\":\"lay-out-approaches-before-design\",\"file_sha256\":\"af570d727c9245fa0b8a6f98b945dcfda47a0f0f68b14815c05c48005a2c4be1\",\"content_sha256\":\"fccdc706f038ccb441581dec2e090c484540d5d2f42851aa0d224c0cc203c022\",\"file_bytes\":2172,\"body_bytes\":812},{\"atom_id\":\"offer-context-recon\",\"file_sha256\":\"62a23b54d39701452faae1393c1564b1fc14009b196b29ce4c1b62db708c601e\",\"content_sha256\":\"57edef8808d096c19d0ece13514a111d7dcd09a27d7be094a9e688676f9582ba\",\"file_bytes\":3314,\"body_bytes\":2077},{\"atom_id\":\"play-back-understanding-in-chunks\",\"file_sha256\":\"1e03e2820d923b19a0075e5827c37111d9a7f1b66020132b6467301e56578140\",\"content_sha256\":\"546d0e3c209c98d99eb72e2e0527666b55873f923e8f07071046ca404b7332d8\",\"file_bytes\":2000,\"body_bytes\":906},{\"atom_id\":\"size-and-gate-the-work\",\"file_sha256\":\"bf4b8c905d9ec53f7ea796977263bef9089278ed39b3beb395d1d089497c1e90\",\"content_sha256\":\"c81160794d64df591564f2a6fdb2a2c19125e10f6a45c94120059c01a80a61e6\",\"file_bytes\":5170,\"body_bytes\":3108},{\"atom_id\":\"spike-throwaway-to-learn\",\"file_sha256\":\"354164bd52b446a9e509c49e94fec4a213cf8de4d328db5ffd475493fbfe9715\",\"content_sha256\":\"7685dbc3a1cd9da6bb81335ae4c3b68214b140343ff1507998fb695e24831cbf\",\"file_bytes\":2579,\"body_bytes\":1238}]"
carrier_sha256: 4505917dfd3e865ccea1463450bf6f7b0fbd298e38cd3dc126246c81f4f8f078
carrier_bytes: 25118
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-one-open-question -->
---
instruction_id: ask-one-open-question
title: Ask one open question at a time
summary: "Open by moving the work forward: echo a supplied request in about 200 words or ask one concrete open question, then ask only what the context leaves open."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: There is substantial uncertainty about what is actually wanted.
conditions_does_not_apply_when: The request already fixes the result and how it will be accepted.
artifact_contract_output_type: clarification-question
artifact_contract_required_data:
  - open question
  - purpose of the question
  - owner answer
artifact_contract_verified_by: owner answer that resolves the uncertainty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/explore.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Ask one open question at a time
Open the conversation by moving the work forward.
If they already said what they want — a spec, a plan, a detailed request — aim for about 200 words for the whole message.
Echo their request back in your own words: what they want, who it's for, and why, as far as they've said.
Add what you found that bears on it: how the relevant parts work today and what the change would touch.
If you found a constraint, conflict, or cheaper path they may not have considered, say so plainly.
End with one line inviting corrections, then one open question about what they want: the thing their request leaves open whose answer would most change what gets built.
If they haven't described what they want, ask one open question in their own terms about the biggest thing their request leaves unsettled.
Say why you're asking: what the answer would change about what you build.
If they asked for brainstorming, end with your question.
If they didn't, add a light one-line offer to just get going instead.
If they take you up on it, state any significant how-it-gets-made choice (platform, language, medium) in one plain line, then do what they asked through the normal workflow.
Each message ends with one question: a single sentence with no list of example answers hanging off it.
Use plain language, pitched just a little above where your human partner is.
Match their vocabulary; never use process jargon.
Get them describing.
Open questions come first.
Their own words carry intent that your options can't.
Offer a short menu only when they're stuck.
When they say "just guess" or "what do you think?", propose something concrete.
Questions that work anchor in specifics: "Walk me through the last time..."
"If it could only do one of these well, which?"
"What would make you wince if I got it wrong?"
A guess they can correct often beats a question.
Do not read the territory out as questions.
One prompt per message while in dialogue; no multiple-choice menus.
Don't stack questions into a wall or hand a menu that invites lazy picking — both pull the user out of generating.
The only exceptions are the two up-front *process* choices (the stance, and the technique flow): *how* to run is theirs to pick; *what* to ideate never is.
Questions should probe: constraints, tradeoffs, users, scope, dependencies, risks
Listen for signals: "or" / "versus" / "tradeoff" indicate competing priorities worth exploring
Reflect back what you hear to confirm understanding before moving forward
Conversation should feel natural, not formulaic. Avoid rigid sequences. Follow the developer's energy — if they're excited about one aspect, go deeper there.
<!-- vpmodule:atom:end ask-one-open-question -->
<!-- vpmodule:atom:begin choose-visual-or-textual-explanation -->
---
instruction_id: choose-visual-or-textual-explanation
title: Choose a visual or textual explanation to fit the question
summary: "Offer a visual only when seeing answers the question better than reading, and keep requirements, scope, and tradeoffs in text."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The question may be clearer as an image or a diagram.
conditions_does_not_apply_when: "The question concerns only text, numbers, or a conceptual choice."
artifact_contract_output_type: explanation-choice
artifact_contract_required_data:
  - nature of the question
  - chosen medium
  - options or text
artifact_contract_verified_by: the owner selects or confirms the presented option
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/visual-companion.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Choose a visual or textual explanation to fit the question
Offer the visual companion whenever seeing would help more than reading.
Offer it the first time one of these moments comes up, never upfront.
The offer is its own message with nothing else in it.
If they decline, stay in text and don't offer again unless they raise it.
Per question, ask: would they understand this better by seeing it?
Mockups, layouts, diagrams, and side-by-side designs go in the browser.
Requirements, scope, tradeoffs, and conceptual choices stay in text.
A question about a UI topic isn't automatically a visual question.
Show mockups for something they'll look at: a screen, a page, a printout, a sign.
Show a layout or arrangement: of a screen, a room, a schedule.
Show a flow or a sequence of steps.
Show options that would look different from each other.
Show a structure that's easier to see than read: a diagram, a timeline, a map.
Use it for mockups to react to, side-by-side options, and throwaway prototypes they can click.
It's a tool, not a mode: accepting it doesn't send every question to the browser.
"This might be easier if I show you. Want me to open a browser tab with some mockups?"
<!-- vpmodule:atom:end choose-visual-or-textual-explanation -->
<!-- vpmodule:atom:begin clarify-before-design -->
---
instruction_id: clarify-before-design
title: "Check the brief through the builder's eyes"
summary: "Have a fresh builder read the design and report only questions where a wrong guess would change the plan, then sort the answers into the document, your calls, and the owner's decisions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A project-scale brief or design document is ready to hand to a builder.
conditions_does_not_apply_when: "There is no brief yet, or it has already been checked and approved."
artifact_contract_output_type: design-brief
artifact_contract_required_data:
  - brief
  - builder questions
  - question groups
  - revised brief
artifact_contract_verified_by: every important builder question is answered in the brief
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/builder-check-prompt.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - engineering
---

# Check the brief through the builder's eyes
Dispatch a fresh builder with the design document and its domain.
For a small change, the short design goes straight to the owner without this builder check.
The builder has been handed a design document and asked to put together a plan to build what it describes.
The builder will not be able to talk to the person who wrote it.
Report only the questions the builder would still need answered before planning this well.
Report places where the builder would have to guess and a wrong guess would matter.
For each, give the question and why the answer changes the plan.
Rank them by importance.
Skip anything the document explicitly leaves to the builder.
Skip anything the builder could reasonably decide.
Skip nitpicks about wording.
If nothing important is left, say "nothing important left".
Sort what the builder asks into three piles: answered already, minor, and theirs.
Answered already by the conversation or the project: put the answer in the document.
Minor: settle it yourself and mark it in the document as your call.
Theirs: only your human partner can answer it, and the answer changes what gets built.
Bring the "theirs" pile in one message, most important first.
That's the only round of questions the check produces.
<!-- vpmodule:atom:end clarify-before-design -->
<!-- vpmodule:atom:begin lay-out-approaches-before-design -->
---
instruction_id: lay-out-approaches-before-design
title: Lay out the approaches before the design
summary: "Once the owner's intent is clear, present the real ways to build it in a message of their own, recommend one when several remain, and get their choice before writing the design; when only one way is sensible, say so."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The owner's intent is understood and the work is moving from what they want to how it gets built.
conditions_does_not_apply_when: There is only one sensible way and no real choice to present.
artifact_contract_output_type: approach-options
artifact_contract_required_data:
  - approaches when more than one remains
  - trade-offs for each
  - recommendation and reason when more than one remains
  - owner choice when more than one is presented
artifact_contract_verified_by: the owner chooses among multiple approaches, or the single sensible way is stated and accepted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Lay out the approaches before the design
Once you understand what they want, and before you write anything up, put the ways of building it in a message of their own.
Come up with several real alternatives and drop the weak ones, including any that work against why they want it and any the existing work rules out.
Present the two or three that remain, grounding each in what the project actually does and saying what it trades off.
When you present more than one, recommend one and say why, then ask which way they want to go.
When there's genuinely one sensible way, say so and explain why the others don't fit; no choice is needed.
This is for how it gets built; for what they want, get them describing first.
The chosen approach, or the single sensible way, goes into the design document under Approaches.
<!-- vpmodule:atom:end lay-out-approaches-before-design -->
<!-- vpmodule:atom:begin offer-context-recon -->
---
instruction_id: offer-context-recon
title: Offer context recon
summary: "When the owner supplied context, read the referenced material and connected code before asking; when further looking would help, offer to check the code, documents, or data and reuse the recovered context."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The decision lacks facts that the available material can supply.
conditions_does_not_apply_when: "The facts are already supplied, or looking would not change the decision."
artifact_contract_output_type: recon-proposal
artifact_contract_required_data:
  - missing facts
  - what to inspect
  - what to look for
  - consent
artifact_contract_verified_by: owner approves the recon scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/recall/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Offer context recon
When the project or the owner already provides context — a spec, a plan, a handoff, referenced files, connected code, or earlier conversation — read it before the first message.
Keep reading until you can explain how the relevant parts work today and what the change would touch.
Never ask what the project or their context already answers.
Once you have that grounding and looking further would help, offer to go look: the codebase or project, the user's own files and data, or the web.
Say what you would look for. The user decides whether you go.
Before acting or resuming work, rebuild the user's recent working context from their own history, live state, and the shared record of reports, fixes, and incidents.
Read only what the in-scope threads need, then stop.
Lock the scope before searching: pin the time window, the topic if named, and the workspace. State the scope back.
Never quietly turn all into recent, and never read another project's history without being asked.
Search the user's own history for what they did and decided.
Sweep the shared record whenever the topic names a feature, file, subsystem, area, or bug. The default is to sweep, not a judgment call.
Hand the shared-record sweep to the history investigators, but steer the question from why this was built this way to what is the current state, what has been tried and did not hold, and what users still report.
Skip the shared-record sweep only for pure activity recall with no named target, where the user's own history and live state are the entire answer.
Verify against live state: check the branches, changes, and tickets the search surfaced.
Lead with a capsule of at most five bullets, then one line per thread with a status tag, then the recurring problems, then the single most useful next move.
Cite history findings by their identifier and shared-record findings by their source.
Sanitize private context before any public output.
An adjacent feature stays out unless it blocks this one.
When the capsule outgrows a screen, cut detail before cutting threads.
<!-- vpmodule:atom:end offer-context-recon -->
<!-- vpmodule:atom:begin play-back-understanding-in-chunks -->
---
instruction_id: play-back-understanding-in-chunks
title: Play back understanding in chunks
summary: "Describe each understood part back in about 200-300 words, keep the owner's words separate from your proposals, and ask what is wrong or missing before moving on."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The need has several parts that must be confirmed separately.
conditions_does_not_apply_when: The need fits in one short sentence and has no parts.
artifact_contract_output_type: understanding-playback
artifact_contract_required_data:
  - chunk playback
  - owner words separated from proposals
  - owner correction
artifact_contract_verified_by: owner correction of each playback
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Play back understanding in chunks
Play back as you go.
As soon as you understand one part well enough to describe it, describe that part back in about 200-300 words.
Describe what it's for and who it serves, or how one piece behaves.
Then return to questions about the next part.
Playback and questions alternate through the whole conversation.
The last chunk covers whatever is left.
Only what they said goes in as theirs.
Anything you filled in goes in as your proposal, with your reason.
End each chunk by asking what's wrong or missing.
Before you send a chunk, check it: does it describe something they'll look at?
If so, and they haven't seen the visual companion offer yet, send the offer instead.
Hold the chunk for the next message.
Once they've accepted, put a mockup next to the description.
People often haven't finished working out what they want.
Good questions help them think it through.
<!-- vpmodule:atom:end play-back-understanding-in-chunks -->
<!-- vpmodule:atom:begin size-and-gate-the-work -->
---
instruction_id: size-and-gate-the-work
title: Size and gate the work
summary: "Name the size of the work in plain words and build only after the human approves the design doc: short for a small change, full for a project."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - approval-policy
  - approval-policy-gate
  - approval-policy-choice-gate
conditions_applies_when: "The need is a small change or a project that needs a design doc."
conditions_does_not_apply_when: The owner has already approved the size and the design doc.
artifact_contract_output_type: work-size-decision
artifact_contract_required_data:
  - size
  - approved design doc
  - work boundary
artifact_contract_verified_by: owner confirms the stated size and approves the design doc
compatibility_excludes:
  - proceed-without-waiting-for-confirmation
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/choose-a-planning-path.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/index.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/start-in-an-existing-codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/build-a-change.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/the-phase-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/context-engineering.md
status: active
revision: 9
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Size and gate the work
Once you understand what they want and they've picked an approach, say how big the work is in plain words. They can override it.
A small change: write a short design doc covering what you already covered together, then build it through the normal workflow.
A project: write the full design doc, then make a full plan.
Short or full, the design doc has an Approaches part: the two or three ways you considered, what each trades off, which one they picked, and why.
If the work grows mid-task, stop, say so, and step up a size.
If this is really several independent projects, say so, agree on an order, and take them one at a time.
Nothing gets built until the human approves the design doc: the short one for a small change, the full one for a project.
Building includes writing product code, scaffolding, installing dependencies, creating projects, and invoking an implementation skill.
Reading and exploring are fine before approval.
Two exceptions: the human opted out of the questions, or they approved a spike. A spike stays labeled throwaway, and keeping what it produced is a new request that comes back through the gate.
After the design doc is approved, the next step is the plan.
The written design must let a talented builder in the domain plan without going back to the human partner.
Cover intent and the why, goals, non-goals, anti-goals, constraints, approaches, the parts of the how the human decided, and what is left to the builder.
Only what they said goes in as theirs; anything you filled in goes in as your proposal with your reason.
Bring only the questions that the human alone can answer, most important first, and update the document with their answers.
A typical session is one goal: about 500 lines of code added or changed (not counting tests) in a small handful of files.
The size of the intent decides how many implementation sessions follow.
One coherent outcome that needs several sessions is an epic.
Scope is only one signal: use more planning when the work has high risk, unclear requirements, broad architectural reach, cross-system effects, or coordination between people or teams.
Every path uses the same implementation unit.
Larger work adds shared context around that unit and repeats it; it does not switch to a separate delivery system.
Every path runs the same loop.
Bigger work enters it earlier and goes round it more often; it does not become a different way of delivering.
Too little planning costs one implementation run: the implementer looks at the code first, and stops to ask when it cannot settle the intent. Too much planning costs documents nobody reads.
- **5 — Scope Sanity** | Plans stay within context budget: 2–3 tasks per plan (4 = warning, 5+ = Critical), ≤ 8–10 files per plan (15+ = Critical).
- When in doubt, split. A smaller phase completes faster, verifies more confidently, and makes it easier to course-correct if a design decision turns out to be wrong.
- if the task could be fully specified in a single, short prompt and completed in one agent turn without further clarification, skip the phase loop.
<!-- vpmodule:atom:end size-and-gate-the-work -->
<!-- vpmodule:atom:begin spike-throwaway-to-learn -->
---
instruction_id: spike-throwaway-to-learn
title: "Spike to learn, then throw the spike away"
summary: "Offer a quick throwaway build when learning by doing is cheapest, keep it untested and unpolished, and bring only the lesson back."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "Uncertainty concerns behavior, feasibility, or the look of the result."
conditions_does_not_apply_when: The question can be closed by discussion or existing material.
artifact_contract_output_type: throwaway-spike
artifact_contract_required_data:
  - prototype question
  - prototype boundary
  - knowledge gained
artifact_contract_verified_by: the spike answers the stated question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/prototyping.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - research
---

# Spike to learn, then throw the spike away
Agentic work is waterfall.
It is very, very fast.
A quick throwaway build is often the cheapest way to learn what they want.
A quick throwaway build is also the cheapest way to learn whether something works.
Offer one when it would help.
When they just want to spike, get out of the way.
Spikes get no tests or minimal ones.
Spikes aren't bulletproof.
Spikes skip the plan, implementation, and review process.
Bring what the spike taught you back into the conversation.
Two exceptions: a spike they said yes to may be built; it stays labeled throwaway.
Keeping what it produced is a new request that comes back through this gate.
Use it for throwaway prototypes they can click.
If it grows mid-task, stop, say so, and step up a size.

Ask the user to decide this on purpose.
The outcome to avoid is a prototype that becomes the real product with nobody deciding it should, and with no spec.
prototype code written to learn fast seldom meets the codebase's standards
Never declare VALIDATED after a single happy-path test.
Document the investigation trail, not just the conclusion.
Do not rush to a verdict. A spike that says "VALIDATED — it works" with no nuance is almost always incomplete.
<!-- vpmodule:atom:end spike-throwaway-to-learn -->