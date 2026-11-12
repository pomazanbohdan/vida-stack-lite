---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-docs-adoption-guide-md-c19d8859-c01"
title: "addy-skills: docs/adoption-guide.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:docs/adoption-guide.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"docs/adoption-guide.md\"}"
atom_ids:
  - adopt-a-methodology-in-sequenced-phases
  - converge-on-target-architecture
  - design-from-caller-usage
  - open-a-reviewable-change
  - write-design-document
atom_count: 5
atoms: "[{\"atom_id\":\"adopt-a-methodology-in-sequenced-phases\",\"file_sha256\":\"f42a4daaa13dc485873e7e2cf92f1dd10a0b5c5b5759a9ef01c01957f4539208\",\"content_sha256\":\"e08b4c693c541a981d89720f0cc301ebd5d9c2639afff4c9b1a73972b6b1cdda\",\"file_bytes\":3742,\"body_bytes\":2571},{\"atom_id\":\"converge-on-target-architecture\",\"file_sha256\":\"8ed14ca5db285a597fddc1a28a2fc292d5ae7d73493bc0ce8f952ad2a343a40c\",\"content_sha256\":\"224d33cd9343ebe9565501279e165eeb7f96a2f6a7dfe5bacfae5db06ff80a2c\",\"file_bytes\":3955,\"body_bytes\":2754},{\"atom_id\":\"design-from-caller-usage\",\"file_sha256\":\"4c1734d08dc7e4f85b56ad6b7b31c82dd7ae79934140fc6467faed397bb3b9e3\",\"content_sha256\":\"86be6acf961f436621c6f0670ce09434d88200fcaa719253900a178e7224f361\",\"file_bytes\":2583,\"body_bytes\":1254},{\"atom_id\":\"open-a-reviewable-change\",\"file_sha256\":\"efc87aceb90d22329050b94ed26329bb7f94c1303136b234ec15bbfb6b84690f\",\"content_sha256\":\"af2e2ff5e8c7511cc91a5a4c21e84dec3f6977d8374058a351c026d6c6669e06\",\"file_bytes\":3942,\"body_bytes\":2499},{\"atom_id\":\"write-design-document\",\"file_sha256\":\"6efed8cce03c7b9ebeaa4a69c96732cdc920c1f3a30d2e2f37bccbc75f1fc6fa\",\"content_sha256\":\"bd338037a4fe0c4e45995b98088c2fcfca5fa42ca0c954792ca4761beabba459\",\"file_bytes\":2604,\"body_bytes\":1265}]"
carrier_sha256: b4de16956a64e32d83a6c515001f05ef900146cc96e1a83eafd7af5ef6932698
carrier_bytes: 17393
revision: 1
status: active
---
<!-- vpmodule:atom:begin adopt-a-methodology-in-sequenced-phases -->
---
instruction_id: adopt-a-methodology-in-sequenced-phases
title: Adopt a methodology in sequenced phases
summary: "An established codebase is approached protectively first: the practices that read and protect it come first, the ones that change it come later, and the whole lifecycle is never loaded in one go."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A methodology is being introduced into a codebase that already exists.
conditions_does_not_apply_when: The project is new and has no existing behaviour to protect.
artifact_contract_output_type: adoption-order
artifact_contract_required_data:
  - the phases
  - what each phase adds
  - the gate each phase leaves on
artifact_contract_verified_by: the phases are ordered protective-first and each names the gate it leaves on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Adopt a methodology in sequenced phases
In an established codebase, the risk profile inverts: the danger isn't building the wrong thing, it's _changing_ something whose behavior nobody fully specified. The adoption order therefore starts with the skills that **read and protect** the codebase, and only later moves to the skills that **change** it.
Goal: the agent understands the codebase before it modifies anything.
Goal: two-speed adoption, legacy code stays under the Phase 1–2 regime; **new features get the greenfield treatment**.
The five-step triage (reproduce → localize → reduce → fix → guard) shines in unfamiliar code, and the "guard" step starts building the regression suite you don't have.
Legacy code is exactly the "unfamiliar code, high cost of being wrong" scenario this skill targets. Adversarial fresh-context review of the agent's claims about how the legacy system works catches confident hallucinations before they become commits.
Run it once across the existing attack surface (auth, input handling, dependencies, the dependency audit alone usually pays for the exercise), file what you find, then enforce it on new changes.
code-as-liability, compulsory vs. advisory deprecation, and zombie-code removal give you a disciplined way to shrink the legacy surface instead of just wrapping it.
retrofitted along the paths you actually debug: structured logging and RED metrics on the top incident sources first.
its measure-first rule prevents the classic legacy trap of optimizing code that was never the bottleneck.
**"Big bang" adoption.** Loading the full lifecycle onto a legacy codebase on day one produces specs for code that already exists and refactors without safety nets. Sequence it.
**Letting the agent refactor untested code.**
**Skipping
the project rules file
because "the code is the documentation."**
**Loading all skills into every session.** It wastes context and dilutes the ones that matter. Load by phase
**Deferring observability until "there's something to observe."** Instrument as you build, retrofitting structured logging is a brownfield problem you're choosing to create.
**Skipping the spec
because "it's just a prototype."** Prototypes become products. The spec is the cheapest artifact you'll ever write for this codebase.
Greenfield gets there in days; brownfield gets there in a quarter, and the difference is exactly the safety nets (context, characterization tests, boundaries) that the old codebase never had.
**From the start, treat these as always-on**
coverage debt is cheapest to avoid at zero.
<!-- vpmodule:atom:end adopt-a-methodology-in-sequenced-phases -->
<!-- vpmodule:atom:begin converge-on-target-architecture -->
---
instruction_id: converge-on-target-architecture
title: Converge on the target architecture
summary: "You own the contract; the structure changes and the behavior does not. Pin behavior, name the target shape, and move in small behavior-preserving steps."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: The current structure obstructs change and needs a stepwise rebuild.
conditions_does_not_apply_when: A local fix without a structural change is enough.
artifact_contract_output_type: convergence-plan
artifact_contract_required_data:
  - target state
  - current state
  - steps
  - temporary compromises
artifact_contract_verified_by: "the project's checks passing after every step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/refactoring.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Converge on the target architecture
You own the contract: the structure changes, the behavior does not.
If cleanup reveals a missing feature or a real bug, split it out and ship the structural change first against the pinned contract.
Pin the behavior contract first with a characterization test, snapshot, or equivalence harness that captures current behavior before any structure moves.
If the area has no coverage, write the pin before touching structure.
Type check and lint are not a pin.
Name the structure the code is missing.
Boring code stays when the shape is already clear and local.
The reshape must delete branches or invalid states, not add indirection.
Name the target shape: what the module layout, types, and call graph should be if built today.
Subtract before you add.
Delete dead code, collapse one-caller wrappers, drop redundant validators, and remove orphan references before introducing the new shape.
The smallest change that reaches the target shape ships.
A speculative cleanup that "might help" gets reverted.
Move in small behavior-preserving steps, each keeping the pin green.
For API reshapes, migrate every caller and delete the old API in the same wave.
No compatibility shims, no parallel old-and-new paths.
Spot-check every rename against the actual files; renames silently miss usages in strings, prose, and back-references.
Prove behavior is unchanged on the real artifact, not "it compiles".
For larger reshapes, run an equivalence check: a script that diffs old-vs-new outputs, a recorded baseline replayed against the new code, or a smoke run on the matching surface.
Confirm the change is worth keeping: the success measure is reduced reader load.
If the diff does not lower reader load somewhere, revert it.
Rebase into small ordered commits: a subtraction commit, then the reshape, then any follow-on cleanup.
Don't aim for global coverage; aim for coverage _where change is planned_. For untested legacy behavior, write characterization tests, tests that pin down what the code currently does, right or wrong, before any modification. The Beyonce Rule applies: if the agent liked a behavior enough to depend on it, it should have put a test on it.
Goal: every area the agent will touch gets a safety net first.
No characterization tests, no refactor. This is the single most expensive shortcut in brownfield adoption.
Chesterton's Fence is the operative principle: the skill forces the agent to understand _why_ code exists before removing it.
Behavior-preserving simplification plus characterization tests is the lowest-risk way to make legacy code changeable.
Treating the legacy system's behavior as wrong by default. Chesterton's Fence: the weird retry loop may be load-bearing. Understand, then change.
<!-- vpmodule:atom:end converge-on-target-architecture -->
<!-- vpmodule:atom:begin design-from-caller-usage -->
---
instruction_id: design-from-caller-usage
title: "Derive the interface from the caller's usage"
summary: "Write the caller's usage first and derive the type sketch from it, so the API is described to a hypothetical user and the implementation works back from there."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A package or API that other code will use is being designed.
conditions_does_not_apply_when: The interface is already fixed by an external contract and cannot change.
artifact_contract_output_type: caller-first-interface
artifact_contract_required_data:
  - usage sketch
  - types
  - signatures
  - module map
artifact_contract_verified_by: "the project's type checks and a test that uses the proposed call"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/04-design.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the interface from the caller's usage
For a package or API that other code will use, start with the doc a user would read.
Write the caller's usage first and derive the type sketch from it.
Writing the tutorial first forces the caller's view.
You describe the API to a hypothetical user and work back to the implementation.
The doc also becomes a concrete target the agent checks its own work against.
Ground the design first over the code it touches, before writing the usage sketch.
Naming a file isn't grounding.
Keep a tutorial a tutorial instead of drifting into reference and explanation at once.
The caller's usage is written first in each design attempt, followed by types, signatures, and a module map.
Name the writing standard when the doc itself matters.
Establish why the current shape exists when the design moves ownership or layers.
Write the plan after the design settles, not before.
If implementation shows types that only compile with forced casts, treat that as proof the design is wrong.
Fill in code against the chosen sketch.
When new code must talk to old code, design the boundary contract-first. Hyrum's Law is not theoretical in a years-old codebase, someone depends on every observable behavior, including the bugs.
<!-- vpmodule:atom:end design-from-caller-usage -->
<!-- vpmodule:atom:begin open-a-reviewable-change -->
---
instruction_id: open-a-reviewable-change
title: Open a reviewable change
summary: "Keep the change to one task and give the reviewer a reason, the scope, the proof, and the blast radius without making them guess."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: You publish a change for review by another person or agent.
conditions_does_not_apply_when: The change does not leave the local working copy.
artifact_contract_output_type: reviewable-change
artifact_contract_required_data:
  - goal
  - description
  - verification method
  - risks
  - change scope
artifact_contract_verified_by: the described change checks reproduced from the description
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/opening-a-pr.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/shipping.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Open a reviewable change
Work from a separate worktree off the main branch; subagents inherit it.
Commit liberally, then rebase into small, ordered commits before opening the pull request.
Each commit is a future pull request: landable and ordered to tell the story.
Amend when the fix belongs in a just-made commit; make a new commit when it is separable.
A commit body does not restate the subject.
The pull request body is a one-minute briefing for a reviewer who has the diff, not a lab notebook.
It says why the change exists, what it leaves out, what it could break, and how you proved it works.
Write short, simple sentences with few identifiers and no walls of text.
Use a title of the form type(scope): subject, with no trailing period.
The type is one of feat, fix, docs, refactor, test, chore, or perf.
The scope is the area, and the subject is short, imperative, and names a real symbol when one carries the change.
In the body, state why the change exists.
State what changed in one to three short bullets.
State the scope: what it covers and what it deliberately leaves out.
State tradeoffs only when a reviewer would otherwise ask about a rejected alternative.
State the blast radius: who or what it touches and why that is safe or risky.
State the verification: each bullet a real run path and its outcome.
Attach videos or screenshots when they prove a claim.
Prefer five narrow pull requests to one large one.
Open every pull request ready, never as a draft.
After opening, post the URL and keep building; do not start a babysit unless the user asks for one.

## Change Descriptions
Every change needs a description that stands alone in version control history.

**First line:** Short, imperative, standalone. "Delete the FizzBuzz RPC" not "Deleting the FizzBuzz RPC." Must be informative enough that someone searching history can understand the change without reading the diff.

**Body:** What is changing and why. Include context, decisions, and reasoning not visible in the code itself. Link to bug numbers, benchmark results, or design docs where relevant. Acknowledge approach shortcomings when they exist.

**Anti-patterns:** "Fix bug," "Fix build," "Add patch," "Moving code from A to B," "Phase 1," "Add convenience functions."
Small atomic commits matter _more_ in brownfield: when a change to old code breaks something subtle, a ~100-line commit is bisectable; a 2,000-line "modernization" commit is not.
atomic commits and ~100-line changes are habits, not retrofits.
<!-- vpmodule:atom:end open-a-reviewable-change -->
<!-- vpmodule:atom:begin write-design-document -->
---
instruction_id: write-design-document
title: Write a design another builder can plan from
summary: "Write a plain design that covers intent, goals, approaches, constraints, decided choices, and what remains to the builder; use the short form for a small change and check the full form from the builder's seat."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The work has project scale and needs a written description before a plan.
conditions_does_not_apply_when: It is a quick task or a small change that can be described in chat.
artifact_contract_output_type: design-document
artifact_contract_required_data:
  - intent
  - goals and non-goals
  - approaches and owner choice
  - constraints
  - owner decisions
  - builder boundary
artifact_contract_verified_by: builder review finds no blocking question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Write a design another builder can plan from
For a project, write a plain document a talented builder in the domain could plan from without going back to your human partner.
For a small change, the short design covers the same points in a line or two each and goes straight to the owner, without the builder check.
Cover intent and the why.
Cover goals, non-goals, and anti-goals.
Cover constraints.
Cover approaches: the two or three ways you considered, what each trades off, which one they picked, and why.
Cover the parts of the how they decided, as they decided them.
Cover what's left to the builder.
In a software repo, the design goes in the project's specs directory with a dated topic name.
Commit it.
Otherwise, ask where it goes.
Your human partner's preferences override both.
Any choice you make goes in the design as your call, never as something they agreed to.
For a project, do not hand over the document until the builder check is back.
Without a subagent tool, read the document as that builder yourself.
Update the document with their answers.
Hand it over with a short list of the calls you made so they can check those while reading.
The spec's boundaries section is where you declare what legacy surface the feature may and may not touch.
<!-- vpmodule:atom:end write-design-document -->