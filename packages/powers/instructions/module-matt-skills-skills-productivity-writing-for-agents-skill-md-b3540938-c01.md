---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-productivity-writing-for-agents-skill-md-b3540938-c01"
title: "matt-skills: skills/productivity/writing-for-agents/SKILL.md module"
summary: "Carrier for 6 atomic instructions from matt-skills:skills/productivity/writing-for-agents/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/productivity/writing-for-agents/SKILL.md\"}"
atom_ids:
  - optimize-guidance-triggers
  - structure-and-compress-guidance
  - use-a-leading-word
  - write-directive-rules
  - write-minimal-agent-guidance
  - write-steps-with-completion-criteria
atom_count: 6
atoms: "[{\"atom_id\":\"optimize-guidance-triggers\",\"file_sha256\":\"f3f49c2b6521f8e92459bb5e2c32dae4fa515f35d2e3139baa42c4d2d31b8b63\",\"content_sha256\":\"3763b003a000d75437deb3fb273971ab1851346e0929c14e6eb8312cb319094b\",\"file_bytes\":5099,\"body_bytes\":3133},{\"atom_id\":\"structure-and-compress-guidance\",\"file_sha256\":\"36917482b399d670802ec93ac6d7a6e4a970c70c855b60e9ec4ad731b0c3fd38\",\"content_sha256\":\"1771bd65fdb002a7b3acec35265833061471fc0e1a6b80d701ec44591c7da4d8\",\"file_bytes\":4701,\"body_bytes\":2906},{\"atom_id\":\"use-a-leading-word\",\"file_sha256\":\"c5cc01ca809d99786b74a0c58429be46e44c426457df0a4d713b4bd09a539c33\",\"content_sha256\":\"6d7397d3f01d1cef5a13652e853b59deade33725ce7dfa5299dd954798ed8a08\",\"file_bytes\":2566,\"body_bytes\":1539},{\"atom_id\":\"write-directive-rules\",\"file_sha256\":\"0e0ad2b75c0ec6a89d2b0d9d265ecc8d777ac86a9cd4f246713327e029cb3bab\",\"content_sha256\":\"5546a22e2eb9dc854bfa0ec84bc7268328282485a391e5b3b4b624dcdcb5d09e\",\"file_bytes\":3131,\"body_bytes\":1652},{\"atom_id\":\"write-minimal-agent-guidance\",\"file_sha256\":\"f0081b4270c2013ba1c3dc2ce1d44cd5520b14bde96a6dc675c1f3b0b6f903e4\",\"content_sha256\":\"bbb8b39c3f53080d5b10e3e3a5a7fe2aaba1c1146636ce38d72c32af45fe2e6b\",\"file_bytes\":4737,\"body_bytes\":2859},{\"atom_id\":\"write-steps-with-completion-criteria\",\"file_sha256\":\"ab4901f60aba922cffc11f4524fbd45b78d6a81a14ffc88f7e294a1537676108\",\"content_sha256\":\"59ee318a4bc001d32f590b9f4b969f18aa5a204b6692b1a8f4118d8322632811\",\"file_bytes\":2868,\"body_bytes\":1648}]"
carrier_sha256: c73887e0031d90fba911d4267368bfcb1a257e489417b4d6777580369b37d98f
carrier_bytes: 23769
revision: 1
status: active
---
<!-- vpmodule:atom:begin optimize-guidance-triggers -->
---
instruction_id: optimize-guidance-triggers
title: Describe triggering conditions in the guidance
summary: "Write the description for discovery: concrete symptoms and contexts in third person, with no summary of the workflow."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - description-shape-policy
conditions_applies_when: The guidance must be found for the task it addresses.
conditions_does_not_apply_when: The guidance is always loaded together with the task.
artifact_contract_output_type: guidance-trigger
artifact_contract_required_data:
  - applies-when condition
  - symptoms
  - keywords
  - boundary
artifact_contract_verified_by: the guidance is found from a symptom-only request
compatibility_excludes:
  - write-the-description-as-a-summary-and-trigger-phrases
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/discovery.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/anthropic-best-practices.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-trigger.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Describe triggering conditions in the guidance
The description should only describe triggering conditions.
Do not summarize the skill's process or workflow in the description.
When a description summarizes the workflow, an agent may follow the description instead of reading the full content.
Start with "Use when..." to focus on triggering conditions.
Include specific symptoms, situations, and contexts.
Use concrete triggers that signal this guidance applies.
Describe the problem, not language-specific symptoms.
Keep triggers technology-agnostic unless the guidance itself is technology-specific.
If the guidance is technology-specific, make that explicit in the trigger.
Write in third person.
Use words an agent would search for.
Include error messages, symptoms, synonyms, and tool names.
Keep the description under 500 characters if possible.
Agents use the description to choose the right guidance from potentially 100+ available items.
The description must provide enough detail for an agent to know when to select this guidance.
A **context pointer** is a reference held in the agent's context that names some out-of-context material and encodes the condition for reaching it. A skill's description is one; a line naming a doc is the same object. The pointer's _wording_, not its target, decides when the agent reaches the material, and how reliably. A must-have target behind a weakly worded pointer is a variance bug: sharpen the wording first, and inline the material only if sharpening fails. A pointer does two jobs: state what the material is, and list the **branches** that should trigger reaching it (a branch is a distinct case the document handles, so different runs take different paths through it). Every word of an always-loaded pointer costs on every turn, so it earns even harder pruning than the body: front-load the leading word, use one trigger per branch, cut identity the body already carries.
Name the user's problem rather than a tool's symptom, unless the skill is about that tool.
Add `Not for ...`, naming the sibling skill, only when a trigger eval or a known sibling shows the skill taking its neighbour's requests.
All "when to use" lives here, none in the body, which is read only after the choice. A description that explains the procedure lets the model skip the body and improvise.
An agent's `Use when` opens with the user asking to talk to it by name, then carries the phrases and concepts of every capability that lives inside it, because the agent's description is the only trigger those capabilities have; a menu item that invokes an installed skill needs none, since that skill triggers itself.
Nothing on what it does before the `Use when`, or first person ("I help you"): Minor.
Procedure in the description: steps or flow the body should own. Minor; the model can skip the body and improvise.
"When to use" text in the body: an overview saying when the skill applies, trigger phrases under a heading. Minor; the model never sees it when choosing.
Pointers out of it must name a trigger the agent can observe — a path, a file type, a concrete task — never one it must judge.
<!-- vpmodule:atom:end optimize-guidance-triggers -->
<!-- vpmodule:atom:begin structure-and-compress-guidance -->
---
instruction_id: structure-and-compress-guidance
title: Keep guidance short and navigable
summary: "Keep the main file under 500 lines and move heavy reference into one-level-deep files, cutting every token that does not earn its place."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - progressive-disclosure
conditions_applies_when: The guidance or its reference material is getting long.
conditions_does_not_apply_when: The guidance is short and fits on one screen.
artifact_contract_output_type: structured-guidance
artifact_contract_required_data:
  - core guidance
  - extracted references
  - table of contents
  - links
artifact_contract_verified_by: the core guidance remains usable without the references
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/discovery.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/anthropic-best-practices.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep guidance short and navigable
Keep the body under 500 lines for optimal performance.
Split content into separate files when approaching this limit.
The main file serves as an overview that points agents to detailed materials as needed.
Move heavy reference over 100 lines into a separate file.
Keep principles and concepts inline.
Keep code patterns under 50 lines inline.
For reference files longer than 100 lines, include a table of contents at the top.
Keep references one level deep.
All reference files should link directly from the main file.
Don't repeat what is in cross-referenced skills.
Don't explain what is obvious from the command.
Don't include multiple examples of the same pattern.
Use cross-references instead of repeating workflow details.
Compress examples.
One excellent example beats many mediocre ones.
Every token competes with conversation history and other context.
Only add context agents don't already have.
Challenge each piece: does the agent really need this explanation?
Getting-started workflows aim for under 150 words each.
Frequently loaded guidance aims for under 200 words total.
Other guidance aims for under 500 words.
A document is built from two content types: **steps** (the ordered actions the agent performs) and **reference** (definitions, rules, facts consulted on demand). The core decision is where each piece sits on the **information hierarchy**, a ladder ranked by how immediately the agent needs the material: in-file step, in-file reference, disclosed reference. Push too little down and the top bloats; push too much and you hide material the agent actually needs. **Progressive disclosure** is the move down the ladder so the top stays legible. Branching is the cleanest disclosure test: inline what every branch needs, and push behind a pointer what only some branches reach. **Co-location** is the within-file companion: keep a concept's definition, rules, and caveats under one heading rather than scattered. **Sprawl** is the failure mode: a document simply too long, even when every line is live and unique. The cure is the ladder: disclose reference behind pointers, and split by branch or sequence so each path carries only what it needs.

Carve by relevance, not size. The entry is paid on every invocation; a reference only when its branch fires. Carve what only some branches need and keep a routing map in the entry; leave what is too small to repay the indirection. A small skill is one file; a reference exists only when a branch has earned it. The budget is for what one run loads, not for the skill as a whole: a complex workflow is the right size when each branch sits in its own file and loads only when reached, whatever the total comes to. A carved file stands alone, because the entry can drop from context, and references stay one level deep.
Several operating modes get one reference each; one thing to do gets no router.
<!-- vpmodule:atom:end structure-and-compress-guidance -->
<!-- vpmodule:atom:begin use-a-leading-word -->
---
instruction_id: use-a-leading-word
title: Use a leading word
summary: "Reach for a compact concept already living in the model's pretraining and repeat it as a token, rather than spelling the idea out at every site."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The same idea is restated across a document or its pointers.
conditions_does_not_apply_when: No pretrained word fits the idea.
artifact_contract_output_type: leading-word
artifact_contract_required_data:
  - leading word
  - retired restatements
artifact_contract_verified_by: the idea collapses to one repeated token with no loss of meaning
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/writing-for-agents/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Use a leading word
A **leading word** is a compact concept already living in the model's pretraining that the agent thinks with while running the document (_lesson_, _fog of war_, _tracer bullets_). Repeated as a token, never as a sentence, it accumulates a distributed definition and anchors a whole region of behaviour in the fewest tokens, by recruiting priors the model already holds. Coining your own works if you define it clearly, but a made-up word recruits no priors: you pay in definition tokens what a pretrained word gives free; reach for an existing word first.
It anchors twice. In the body, _execution_: the agent reaches for the same behaviour every time the word appears, and inside flat reference it focuses attention on a class of thing to look for. In a pointer, _invocation_: when the same word lives in your prompts, your docs, and your codebase, the agent links that shared language to the material and reaches it more reliably.
Hunt for opportunities to refactor with leading words. A triad spelled out at three sites, a pointer spending a sentence to gesture at one idea. Each is a passage begging to collapse into a single token:
- "fast, deterministic, low-overhead" → _tight_ (a _tight_ loop).
- "a loop you believe in" → _red_, turning a fuzzy gate into a binary observable state (the loop goes _red_ on the bug, or it doesn't).
You win twice: fewer tokens, and a sharper hook for the agent to hang its thinking on. Assume every document is carrying restatements that leading words retire. Go find them.
<!-- vpmodule:atom:end use-a-leading-word -->
<!-- vpmodule:atom:begin write-directive-rules -->
---
instruction_id: write-directive-rules
title: Write mandatory rules as directives
summary: "State mandatory rules imperatively with no negotiation, and reserve persuasion for guidance that must hold under pressure."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - directive-form-policy
  - rule-authority-policy
conditions_applies_when: You are stating a mandatory rule for an executor.
conditions_does_not_apply_when: You are giving advice or describing an optional practice.
artifact_contract_output_type: directive-rule
artifact_contract_required_data:
  - required action
  - prohibition
  - exception
  - cost of violation
artifact_contract_verified_by: the rule has one unambiguous reading
compatibility_excludes:
  - prefer-the-explanation-over-the-shouting-rule
  - prefer-a-prohibition-that-names-the-permitted-alternative
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/persuasion-principles.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/writing-for-agents/SKILL.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write mandatory rules as directives
Use imperative language: "YOU MUST", "Never", "Always".
Use non-negotiable framing: "No exceptions".
Imperative language eliminates decision fatigue and rationalization.
"YOU MUST" removes decision fatigue.
Absolute language eliminates "is this an exception?" questions.
Explicit anti-rationalization counters close specific loopholes.
Clear triggers plus required actions equal automatic execution.
"When X, do Y" is more effective than "generally do Y".
Use authority for discipline-enforcing guidance and safety-critical practices.
For guidance and technique, use moderate authority and unity.
For reference material, use clarity only.
Avoid liking for compliance: it conflicts with honest feedback culture and creates sycophancy.
Use reciprocity sparingly; it can feel manipulative.
Do not use all seven principles at once: Authority, Commitment, Scarcity, Social Proof, Unity, Reciprocity, Liking.
The test: would this technique serve the user's genuine interests if they fully understood it?
**Negation** is the failure mode beside the leading-word lever: steering by prohibition drags the forbidden behaviour into context and makes it _more_ available, not less. _Don't think of an elephant_, and the elephant is all there is; the negation is a weak modifier the strongly-activated concept overruns, so the ban half-reads as an instruction to do the thing. Prompt the **positive**: state the target behaviour so the banned one is never spoken. A prohibition earns its place only as a hard guardrail you cannot phrase positively; even then, pair it with the positive target so attention lands on what to do.
<!-- vpmodule:atom:end write-directive-rules -->
<!-- vpmodule:atom:begin write-minimal-agent-guidance -->
---
instruction_id: write-minimal-agent-guidance
title: Write the smallest guidance for the observed failure
summary: "Write only the rules that address failures observed without the guidance, then re-run the same scenarios and revise until the agent complies."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The baseline failure has been observed and the guidance text must be written.
conditions_does_not_apply_when: No baseline test has been run yet.
artifact_contract_output_type: agent-guidance
artifact_contract_required_data:
  - observed failures
  - requirements
  - prohibitions
  - one example
artifact_contract_verified_by: each observed failure maps to a rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/discovery.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/set-and-maintain-project-context.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=AGENTS.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Write the smallest guidance for the observed failure
Run the baseline scenario before writing the skill.
Document the exact behavior: what choices the agent made.
Document the rationalizations the agent used, verbatim.
Document which pressures triggered violations.
Identify patterns in rationalizations and failures.
Write guidance that addresses those specific rationalizations.
Do not add extra content for hypothetical cases.
Run the same scenarios with the skill.
The agent should now comply.
If the agent still fails, the skill is unclear or incomplete.
Revise and re-test.
Address the specific baseline failures identified in the test.
Don't write contrived examples.
Don't create fill-in-the-blank templates.
Keep each meaning in a **single source of truth**: one authoritative place, so changing the behaviour is a one-place edit. **Duplication** costs maintenance and tokens, and inflates a meaning's prominence on the ladder past its real rank. The **environment** is a source of truth too (`package.json` scripts, config files, the directory layout, `--help` output), and a document that restates it is a **cache**: a copy of a lookup, earning its load only when the lookup is expensive. Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses. Check every line for **relevance**: does it still bear on what the document does? Hunt **no-ops** sentence by sentence: an instruction the model already obeys by default pays load to say nothing. When a sentence fails, delete the whole sentence rather than trim words from it.
Write the project rules file describing the real conventions, the ones in the code, not the ones in the wiki. Include build/test commands, directory meaning, known landmines
The agent will infer conventions from the worst file it happens to read. Tell it the real ones.
The block holds only what is expensive to rediscover, or that the agent learns only after it has already gone wrong.
Repo overviews, directory trees, and tech-stack lists never enter: agents read code better than prose about code, and the copy goes stale.
A pitfall goes in only when someone has seen the mistake.
A scan finding that looks like a trap becomes a question, not a line.
It re-checks and cuts; the block ends smaller or equal, never larger.
When the evidence supports ten lines, ten lines is the deliverable.
The test for every line: would removing this line change agent behavior?
Skills, workflows, tasks, and agent definitions are prompt text an agent reads in full on every run.
Length and ambiguity are paid on every run; a corner case is paid only when it occurs.
So do not add instructions for exotic cases — the model usually handles them from context, and the reviewing human can correct it when it does not.
Prefer deleting an instruction to hedging it.
<!-- vpmodule:atom:end write-minimal-agent-guidance -->
<!-- vpmodule:atom:begin write-steps-with-completion-criteria -->
---
instruction_id: write-steps-with-completion-criteria
title: Write steps with completion criteria
summary: "End every step on a completion criterion that is clear and demanding, and defend against premature completion by sharpening the bound before hiding later steps."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - completion-criteria
conditions_applies_when: A document states ordered steps an executor will follow.
conditions_does_not_apply_when: The document is all reference with no ordered steps.
artifact_contract_output_type: stepped-guidance
artifact_contract_required_data:
  - steps
  - completion criterion per step
artifact_contract_verified_by: each step names the condition that tells the executor it is done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write steps with completion criteria
Every step ends on a **completion criterion**, the condition that tells the agent the work is done. Two properties make it a lever:
- **Clarity**: can the agent tell done from not-done? A vague bound ("understanding reached") invites **premature completion**: ending the step before it is genuinely done, attention slipping to _being done_. The visible steps still ahead (the **post-completion steps**) supply the pull; the criterion's clarity is the resistance. Defend in order: **sharpen the bound first** (local and cheap); only if it is irreducibly fuzzy _and_ you observe the rush, hide the later steps by splitting the sequence. Hiding only works across a real context boundary (a hand-off or a subagent dispatch; an inline call leaves the later steps in context and clears nothing).
- **Demand**: how much it requires. "Every modified model accounted for" forces thorough work where "produce a change list" does not. Demand drives **legwork** (the digging the agent does within the work, latent in the wording rather than written as its own step), and it is not step-bound: "every rule applied" binds a body of flat reference just as "every step done" binds a sequence, which is how an all-reference document still carries an exhaustiveness bar.
The strongest criteria are both checkable and exhaustive.

Close every step on a condition the model can check. A step that ends on "once it is clear" or "when ready" lets the model declare itself done early. Name what has to be true at the end, covering everything the step touched, and make it something the model can verify from what is in front of it.
<!-- vpmodule:atom:end write-steps-with-completion-criteria -->