---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-idea-refine-skill-md-96e9bd9e-c01"
title: "addy-skills: skills/idea-refine/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/idea-refine/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/idea-refine/SKILL.md\"}"
atom_ids:
  - ask-sharpening-questions-before-expanding
  - audit-the-assumptions-behind-a-direction
  - challenge-assumptions-from-first-principles
  - cluster-ideas-into-distinct-directions
  - generate-a-bounded-set-of-variations
  - ground-ideation-in-the-existing-codebase
  - pick-the-lens-that-fits
  - push-back-on-a-weak-idea
atom_count: 8
atoms: "[{\"atom_id\":\"ask-sharpening-questions-before-expanding\",\"file_sha256\":\"cd7e8e13f932fbf0c2c23b0baf501a13223bd904020ce047a184cfe9901b7afb\",\"content_sha256\":\"04f42576234e6890846d83865063bf52bf3effa7062442e72f17b32947144090\",\"file_bytes\":1865,\"body_bytes\":578},{\"atom_id\":\"audit-the-assumptions-behind-a-direction\",\"file_sha256\":\"09d4b08326903178e62fb52831d432f98a4645655590aac32bbe97835a398514\",\"content_sha256\":\"c7e743c9692026bbeb4b44d80d2bb0bd3dea4fea816e4df0eea24f423e4a899a\",\"file_bytes\":2518,\"body_bytes\":1165},{\"atom_id\":\"challenge-assumptions-from-first-principles\",\"file_sha256\":\"d55313bbd6630a170dd54016390e521d06dd200a0b07e3eb5b09c3ba32988552\",\"content_sha256\":\"ddaa4044547dfa3d7bbfa89da0d25c4a17631733f74e5eabf3a99a30a82306d2\",\"file_bytes\":1901,\"body_bytes\":577},{\"atom_id\":\"cluster-ideas-into-distinct-directions\",\"file_sha256\":\"93e09cdcf345bd1bb84cf634b36d1a6cc4489428ed1025509ff73e62ca6059a4\",\"content_sha256\":\"33414477a90e201a85dba2f0dc48d0e2e7bc1f1fb126a613ad243635be1d9f14\",\"file_bytes\":1470,\"body_bytes\":332},{\"atom_id\":\"generate-a-bounded-set-of-variations\",\"file_sha256\":\"e927524addcfc6fd05f9cf8e25c3e3fb929545792bdfed288a4e9d359ab39d1b\",\"content_sha256\":\"470b66b4c7a0028f895168621b25565c4d00f9ab6b90e9864547c22b62af5a65\",\"file_bytes\":2377,\"body_bytes\":1077},{\"atom_id\":\"ground-ideation-in-the-existing-codebase\",\"file_sha256\":\"3af4530d0f1bd544967331831afe558712b19de5037f265715d4028df639c843\",\"content_sha256\":\"01ea440d00e66eed661af54e094b43bc0af68e5beb4b355a2357bdc1f8ed2876\",\"file_bytes\":1632,\"body_bytes\":392},{\"atom_id\":\"pick-the-lens-that-fits\",\"file_sha256\":\"d8cf7f3b2558b4821ad2515bfaf9e5c18f55dce38f527dbba73987d9af372df0\",\"content_sha256\":\"0d3f2d1d68491faf5b4b9bfa9148d7674020bbdd9d8165d83b6fd15c6e9275d2\",\"file_bytes\":2709,\"body_bytes\":1402},{\"atom_id\":\"push-back-on-a-weak-idea\",\"file_sha256\":\"dccdf90a161666be684a3327865e814514bb40158e4fb0dae22483d859630120\",\"content_sha256\":\"a3e01e4a2518e4f0f2d002428d541053db35680000f0b50df53fd2a8fcc9d008\",\"file_bytes\":2785,\"body_bytes\":1174}]"
carrier_sha256: bed4daa6d3b752fdb4249dcddeba41114dff2b52165ffb18c2ed30454e48f2af
carrier_bytes: 18290
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-sharpening-questions-before-expanding -->
---
instruction_id: ask-sharpening-questions-before-expanding
title: Ask sharpening questions before expanding
summary: Ask three to five sharpening questions and do not expand the idea until the audience and the success criteria are known.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An idea is still vague and has to be shaped before it can become a plan.
conditions_does_not_apply_when: The audience and the success criteria are already known.
artifact_contract_output_type: sharpening-questions
artifact_contract_required_data:
  - who this is for
  - what success looks like
  - the real constraints
  - what has been tried before
  - why now
artifact_contract_verified_by: the user and the success criteria are known before any option is generated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
  - product
---

# Ask sharpening questions before expanding

Ask 3-5 sharpening questions — no more. Focus on:

- Who is this for, specifically?
- What does success look like?
- What are the real constraints (time, tech, resources)?
- What's been tried before?
- Why now?

Do NOT proceed until you understand who this is for and what success looks like.

Questions diagnose before prescribing. Each question determines which *type* of problem this actually is.

**Don't skip "who is this for."** Every good idea starts with a person and their problem. Skipping it means designing for nobody.
<!-- vpmodule:atom:end ask-sharpening-questions-before-expanding -->
<!-- vpmodule:atom:begin audit-the-assumptions-behind-a-direction -->
---
instruction_id: audit-the-assumptions-behind-a-direction
title: Audit the assumptions behind a direction
summary: "For every direction, name the assumptions and sort them by how fatal they are if they turn out to be wrong."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has been chosen and the bets behind it have to be made visible before building.
conditions_does_not_apply_when: The direction was already validated against its assumptions.
artifact_contract_output_type: assumption-audit
artifact_contract_required_data:
  - the must-be-true assumptions
  - the should-be-true assumptions
  - the might-be-true assumptions
  - what could kill the idea
  - what is being ignored
artifact_contract_verified_by: every assumption sits in one of the three categories and the kill list is not empty of content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
---

# Audit the assumptions behind a direction

For every idea direction, explicitly list assumptions in three categories:

### Must Be True (Dealbreakers)

Assumptions that, if wrong, kill the idea entirely. These need validation before building.

Example: "Users will share their data with us" — if they won't, the entire product doesn't work.

### Should Be True (Important)

Assumptions that significantly impact success but don't kill the idea. You can adjust the approach if these are wrong.

Example: "Users prefer self-serve over talking to a person" — if wrong, you need a different go-to-market, but the core product can still work.

### Might Be True (Nice to Have)

Assumptions about secondary features or optimizations. Don't validate these until the core is proven.

Example: "Users will want to share their results with teammates" — a growth feature, not a core value proposition.

**Surface hidden assumptions.** For each direction, explicitly name:

- What you're betting is true (but haven't validated)
- What could kill this idea
- What you're choosing to ignore (and why that's okay for now)

This is where most ideation fails. Don't skip it.
<!-- vpmodule:atom:end audit-the-assumptions-behind-a-direction -->
<!-- vpmodule:atom:begin challenge-assumptions-from-first-principles -->
---
instruction_id: challenge-assumptions-from-first-principles
title: Challenge the assumptions from first principles
summary: "Break the idea down to what is actually true, list the assumptions, challenge each one, and rebuild from the truths."
capability_tags:
  - clarify-requirements
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Every idea so far feels like a small improvement on the status quo.
conditions_does_not_apply_when: The direction is already chosen and the assumptions are already validated.
artifact_contract_output_type: first-principles-analysis
artifact_contract_required_data:
  - what is actually true
  - "the assumptions, including the obvious ones"
  - the assumptions that can be challenged
  - what would be built from the truths
artifact_contract_verified_by: every assumption is listed and each challenged one is answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Challenge the assumptions from first principles

Break the idea down to its fundamental truths, then rebuild from there:

1. **What do we know is true?** (not assumed, not conventional — actually true)
2. **What are we assuming?** List every assumption, even the ones that feel obvious
3. **Which assumptions can we challenge?** For each, ask: "Is this actually a law of physics, or just how it's been done?"
4. **Rebuild from the truths.** If you only had the fundamental truths, what would you build?

Challenge every assumption. "How it's usually done" is not a reason.
<!-- vpmodule:atom:end challenge-assumptions-from-first-principles -->
<!-- vpmodule:atom:begin cluster-ideas-into-distinct-directions -->
---
instruction_id: cluster-ideas-into-distinct-directions
title: Cluster the ideas into distinct directions
summary: "After the user reacts to the expansion, cluster the ideas that resonated into two or three directions that differ in kind, not only in wording."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The user has reacted to the generated variations and the space has to be narrowed.
conditions_does_not_apply_when: No variations have been generated yet.
artifact_contract_output_type: direction-set
artifact_contract_required_data:
  - "2 to 3 directions"
  - the variations clustered into each direction
artifact_contract_verified_by: "each direction is meaningfully different from the others, not a variation on the same theme"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Cluster the ideas into distinct directions

After the user reacts to the expansion — indicating which ideas resonate, pushing back, adding context — shift to convergent mode:

**Cluster** the ideas that resonated into 2-3 distinct directions. Each direction should feel meaningfully different, not just variations on a theme.
<!-- vpmodule:atom:end cluster-ideas-into-distinct-directions -->
<!-- vpmodule:atom:begin generate-a-bounded-set-of-variations -->
---
instruction_id: generate-a-bounded-set-of-variations
title: Generate a bounded set of variations
summary: "Generate five to eight variations with named lenses, each with the reason it exists, and push past what the user initially asked for."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The idea has been sharpened and the space of possible directions is to be opened up.
conditions_does_not_apply_when: A direction is already chosen and only needs to be turned into a plan.
artifact_contract_output_type: idea-variations
artifact_contract_required_data:
  - "5 to 8 variations"
  - the lens that produced each variation
  - the reason each variation exists
artifact_contract_verified_by: "every variation names the lens that produced it and the set holds 5 to 8 entries, not 20"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Generate a bounded set of variations

Generate 5-8 idea variations using these lenses:

- **Inversion:** "What if we did the opposite?"
- **Constraint removal:** "What if budget/time/tech weren't factors?"
- **Audience shift:** "What if this were for [different user]?"
- **Combination:** "What if we merged this with [adjacent idea]?"
- **Simplification:** "What's the version that's 10x simpler?"
- **10x version:** "What would this look like at massive scale?"
- **Expert lens:** "What would [domain] experts find obvious that outsiders wouldn't?"

Push beyond what the user initially asked for. Create products people don't know they need yet.

**Don't generate 20+ ideas.** Quality over quantity. 5-8 well-considered variations beat 20 shallow ones.

**Don't just list ideas — tell a story.** Each variation should have a reason it exists, not just be a bullet point.

Variations have reasons. Each one explains *why* it exists (what lens generated it), not just *what* it is. The label (Inversion, Simplification, etc.) teaches the user to think this way themselves.
<!-- vpmodule:atom:end generate-a-bounded-set-of-variations -->
<!-- vpmodule:atom:begin ground-ideation-in-the-existing-codebase -->
---
instruction_id: ground-ideation-in-the-existing-codebase
title: Ground the ideation in the existing codebase
summary: "Scan the surrounding code for architecture, patterns, constraints and prior art, and ground the variations in what actually exists."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The ideation happens inside an existing codebase or project.
conditions_does_not_apply_when: There is no code or project around the idea.
artifact_contract_output_type: codebase-context
artifact_contract_required_data:
  - the existing architecture and patterns found
  - the constraints they impose
  - the prior art found
artifact_contract_verified_by: each variation refers to what the codebase already contains
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ground the ideation in the existing codebase

If running inside a codebase: scan for relevant context — existing architecture, patterns, constraints, prior art. Ground your variations in what actually exists. Reference specific files and patterns when relevant.

**Don't ignore the codebase.** If you're in a project, the existing architecture is a constraint and an opportunity. Use it.
<!-- vpmodule:atom:end ground-ideation-in-the-existing-codebase -->
<!-- vpmodule:atom:begin pick-the-lens-that-fits -->
---
instruction_id: pick-the-lens-that-fits
title: Pick the lens that fits the idea
summary: Choose the one ideation framework that fits the idea and apply it fully instead of running every framework mechanically.
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Several ideation frameworks are available and one of them has to be chosen.
conditions_does_not_apply_when: The framework to use is already fixed by the task.
artifact_contract_output_type: chosen-lens
artifact_contract_required_data:
  - the chosen framework
  - why it fits this idea
artifact_contract_verified_by: "one framework is named and applied, not all of them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/converge.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Pick the lens that fits the idea

Use these frameworks selectively. Pick the lens that fits the idea — don't mechanically run every framework. The goal is to unlock thinking, not to follow a checklist.

**Best for:**

- SCAMPER — improving or reimagining existing products and features. Less useful for greenfield ideas.
- How Might We — reframing stuck thinking. When someone is anchored on a solution, pull them back to the problem.
- First Principles — breaking out of incremental thinking. When every idea feels like a small improvement on the status quo.
- Jobs to Be Done — understanding the real problem. When you're not sure if you're solving the right thing.
- Constraint-Based Ideation — cutting through complexity. When the idea is growing too large or too vague.
- Pre-mortem — evaluating a direction. Stress-testing ideas that feel good but haven't been pressure-tested.
- Analogous Inspiration — expanding the idea. Generating variations that feel genuinely different from the obvious approach.
pick **one** convergence move that fits the goal — don't hand the user a menu of methods; choose the one that suits *this* decision and name it.
Run it to a result, log the outcome, and stop when a clear short-list or single direction emerges.
Two or three convergence moves chained is fine (e.g. cluster → score the clusters); more than that is usually over-processing.
<!-- vpmodule:atom:end pick-the-lens-that-fits -->
<!-- vpmodule:atom:begin push-back-on-a-weak-idea -->
---
instruction_id: push-back-on-a-weak-idea
title: Push back on a weak idea
summary: "Say plainly when an idea is weak, push back on complexity and on real value, and keep a point of view instead of offering neutral options."
capability_tags:
  - design-experiments
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A direction or idea under evaluation is weak, over-complex or of doubtful value."
conditions_does_not_apply_when: The idea has already been agreed and only needs to be turned into a plan.
artifact_contract_output_type: pushback
artifact_contract_required_data:
  - the weakness named
  - the reason it is a weakness
  - the direction you would push towards
artifact_contract_verified_by: the weakness is named specifically and the pushback states what to do instead
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-forge-idea/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/explore-and-validate-an-idea.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body gives generic ideation-partner tone without enough source-specific content to assign an approved subject domain.
---

# Push back on a weak idea

**Be honest, not supportive.** If an idea is weak, say so with kindness. A good ideation partner is not a yes-machine. Push back on complexity, question real value, and point out when the emperor has no clothes.

**Don't be a yes-machine.** Push back on weak ideas with specificity and kindness.

The skill has opinions. It tells you what it thinks matters and why — not just neutral options.

Phase 2 is honest. Ideas get called out for low differentiation or high complexity.

Tone: Direct, thoughtful, slightly provocative. You're a sharp thinking partner, not a facilitator reading from a script. Channel the energy of "that's interesting, but what if..." — always pushing one step further without being exhausting.
Do not use agreement or praise to make the interaction smoother; they lower pressure and lead to shallower thinking.
Agreement is allowed only when it helps the user think better.
Praise is noise.
In attack mode, never agree with the idea until the user ends the mode.
Finding out cheaply that an idea doesn't hold is the win. Don't steer the session toward a yes.
It does not agree or praise unless that helps you think.
<!-- vpmodule:atom:end push-back-on-a-weak-idea -->