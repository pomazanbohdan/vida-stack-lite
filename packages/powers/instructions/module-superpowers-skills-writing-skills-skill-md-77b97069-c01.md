---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-writing-skills-skill-md-77b97069-c01"
title: "superpowers: skills/writing-skills/SKILL.md module"
summary: "Carrier for 5 atomic instructions from superpowers:skills/writing-skills/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/writing-skills/SKILL.md\"}"
atom_ids:
  - close-guidance-loopholes
  - decide-whether-to-write-guidance
  - match-guidance-form-to-failure
  - specify-output-format
  - test-guidance-against-baseline
atom_count: 5
atoms: "[{\"atom_id\":\"close-guidance-loopholes\",\"file_sha256\":\"d53530c1fa3a6239e28eafe4220a53391526225b9c18e3e36cb8c84a16243c2a\",\"content_sha256\":\"c6ab7a235fda2321eb8f7ce872c935325f429ebaba45a3d0913208eeacb1b23c\",\"file_bytes\":2190,\"body_bytes\":866},{\"atom_id\":\"decide-whether-to-write-guidance\",\"file_sha256\":\"2743cff6bb10c200814271787a0d2cc42152670b49636b20fa6444ed6dc55044\",\"content_sha256\":\"217e44de11232060766369d0fffe3c4739dbfdf0305d343c559873535984460d\",\"file_bytes\":2147,\"body_bytes\":1049},{\"atom_id\":\"match-guidance-form-to-failure\",\"file_sha256\":\"071fb949db746f376b0a08406c6761f9e02d56a9d0a4879103e868fc95b83958\",\"content_sha256\":\"5776cebc78498390097031bf64cb18d69a5d736ddcb5a1e73a65fab68ba7492e\",\"file_bytes\":3476,\"body_bytes\":2087},{\"atom_id\":\"specify-output-format\",\"file_sha256\":\"21bfbce8b475b4fdfc7b48ee859adb993db40ffe31e27eea06a9424494e3826e\",\"content_sha256\":\"a45f36bebf5cadbc8552a6e6f0507bb98b0a90b30192e53249882a3ac4f42ef7\",\"file_bytes\":2211,\"body_bytes\":984},{\"atom_id\":\"test-guidance-against-baseline\",\"file_sha256\":\"6abfd45fa28577a2c35e87a0d92aed85b91c878e1990a4ddbdfd85a6253d5d14\",\"content_sha256\":\"84b446fab1646585a979c78bf9dfec483197bb17c27ad0e8d366b56fe1e2eaa1\",\"file_bytes\":2493,\"body_bytes\":1194}]"
carrier_sha256: 3fa4d4a6ed3a2ad83ee95dca48cc0392227ec5eb6cb7963161bf4116b05bf06c
carrier_bytes: 13080
revision: 1
status: active
---
<!-- vpmodule:atom:begin close-guidance-loopholes -->
---
instruction_id: close-guidance-loopholes
title: Close loopholes explicitly
summary: "Forbid the specific workarounds agents use, add a rationalization table and red flags, and re-test each counter until the rule holds."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The agent bypassed a rule or produced a new rationalization.
conditions_does_not_apply_when: The rule holds stably without new bypasses.
artifact_contract_output_type: closed-loophole
artifact_contract_required_data:
  - rationalization
  - prohibition
  - counter-example
  - re-test
artifact_contract_verified_by: the same scenario re-run after each counter
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/bulletproofing.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/persuasion-principles.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Close loopholes explicitly
Don't just state the rule; forbid specific workarounds.
Skills that enforce discipline need to resist rationalization.
Agents are smart and will find loopholes when under pressure.
Capture rationalizations from baseline testing.
Every excuse agents make goes in the table.
Make it easy for agents to self-check when rationalizing.
Add symptoms of when you are about to violate the rule to the description.
Add the foundational principle early: violating the letter of the rules is violating the spirit of the rules.
This cuts off entire class of "I'm following the spirit" rationalizations.
Agent found a new rationalization? Add an explicit counter.
Re-test until bulletproof.
Build a rationalization table from all test iterations.
Create a red flags list.
Re-test the same scenarios with the updated skill.
Plug holes systematically.
<!-- vpmodule:atom:end close-guidance-loopholes -->
<!-- vpmodule:atom:begin decide-whether-to-write-guidance -->
---
instruction_id: decide-whether-to-write-guidance
title: Decide whether guidance should exist at all
summary: "Create guidance only when a technique recurs across projects and others would benefit; steer one-off, project-specific, and mechanical rules elsewhere."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: You are deciding whether to create new guidance.
conditions_does_not_apply_when: The guidance already exists and only needs an edit.
artifact_contract_output_type: guidance-decision
artifact_contract_required_data:
  - recurrence across tasks
  - portability beyond one project
  - benefit to other agents
  - decision
artifact_contract_verified_by: reuse case exists beyond one task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Decide whether guidance should exist at all
Create guidance when the technique wasn't intuitively obvious to you.
Create it when you would reference it again across projects.
Create it when the pattern applies broadly, not only to one project.
Create it when others would benefit.
Do not create guidance for one-off solutions.
Do not create it for standard practices well documented elsewhere.
Do not create it for project-specific conventions; put those in the project's instructions file.
Do not create it for mechanical constraints.
If the constraint is enforceable with a regex or validation, automate it.
A skill is a reference guide for proven techniques, patterns, or tools.
Skills help future agents find and apply effective approaches.
Skills are reusable techniques, patterns, tools, and reference guides.
Skills are NOT narratives about how you solved a problem once.
Do not write a narrative about how you solved a problem once.
If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.
<!-- vpmodule:atom:end decide-whether-to-write-guidance -->
<!-- vpmodule:atom:begin match-guidance-form-to-failure -->
---
instruction_id: match-guidance-form-to-failure
title: Match the form of guidance to the failure
summary: "Classify the baseline failure first: prohibition for rule violations, a positive recipe for wrong-shaped output, a required slot for omissions, and a conditional for behavior that depends on a condition."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: You are choosing the form in which to state a rule.
conditions_does_not_apply_when: The failure type has not been established yet.
artifact_contract_output_type: guidance-form-choice
artifact_contract_required_data:
  - baseline failure type
  - chosen form
  - wording check
artifact_contract_verified_by: the chosen form matches the observed failure type
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/bulletproofing.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Match the form of guidance to the failure
Before writing guidance, classify the baseline failure.
The form that bulletproofs one failure type measurably backfires on another.
If the agent skips or violates a rule under pressure, use a prohibition.
If the agent skips or violates a rule under pressure, add a rationalization table and red flags.
If the agent complies but the output has the wrong shape, state what the output is: its parts, in order.
If the agent omits a required element, make it a required field or slot in the template the agent fills in.
If behavior should depend on a condition, key it to an observable predicate.
Do not use soft guidance for a rule violation.
Do not use a prohibition list for a wrong-shaped output.
Do not use prose reminders near the template for an omitted required element.
Do not use an unconditional rule with exemption clauses for conditional behavior.
Do not write nuance clauses.
"Don't X unless it matters" reopens the negotiation.
Express a real exception as its own conditional on an observable predicate.
Exemption clauses don't scope.
"This limit doesn't apply to code blocks" still suppresses code blocks.
If part of the output must be exempt, restructure so the rule can't reach it.
Micro-test your own case rather than assuming.
Never reach for the prohibition by default.

When a line exists because of a failure you saw, decide what kind of failure it was before writing the line, since each kind takes a different form. A rule the model skipped takes the rule with its reason. Output in the wrong shape takes a contract that says what the output is. A piece left out takes a slot in the template where it goes. A wrong move under some condition takes that condition, stated as something the model can observe. A fix in the wrong form patches nothing.
Say what to do rather than what to avoid. A sentence about the wrong behaviour puts that behaviour in front of the model; a sentence about the right one leaves it out. Keep a prohibition only where no positive form says the same thing, and put the right behaviour beside it.
<!-- vpmodule:atom:end match-guidance-form-to-failure -->
<!-- vpmodule:atom:begin specify-output-format -->
---
instruction_id: specify-output-format
title: Specify the output format at the required strictness
summary: "State the output contract at the strictness the consumer needs, show the shape in a template or example, and keep the terminology consistent."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The result must be readable or processable by someone else.
conditions_does_not_apply_when: The shape of the result does not affect its usability.
artifact_contract_output_type: output-contract
artifact_contract_required_data:
  - strictness level
  - template
  - required fields
  - example of the shape
artifact_contract_verified_by: the result matches the chosen strictness level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/anthropic-best-practices.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Specify the output format at the required strictness
Provide templates for output format.
Match the level of strictness to your needs.
For strict requirements, say: ALWAYS use this exact template structure.
For flexible guidance, give a sensible default format and use your best judgment based on the analysis.
Adjust sections as needed for the specific analysis type.
Include the required sections in the template itself.
Provide input/output pairs where output quality depends on seeing examples.
Examples help agents understand the desired style and level of detail more clearly than descriptions alone.
Keep terminology consistent throughout the guidance.
Choose one term and use it throughout: always "API endpoint", always "field", always "extract".
Do not mix "API endpoint", "URL", "API route", and "path".
Do not mix "field", "box", "element", and "control".
Do not mix "extract", "pull", "get", and "retrieve".
Consistency helps agents understand and follow instructions.
<!-- vpmodule:atom:end specify-output-format -->
<!-- vpmodule:atom:begin test-guidance-against-baseline -->
---
instruction_id: test-guidance-against-baseline
title: Test the guidance against baseline behavior
summary: "Establish what the agent does without the guidance, document the rationalizations verbatim, then compare the guided run against that baseline."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Guidance is being created or changed to alter an executor's behavior."
conditions_does_not_apply_when: The text is pure reference with no rules that can be violated.
artifact_contract_output_type: baseline-scenario
artifact_contract_required_data:
  - scenario
  - baseline choice
  - rationalization
  - re-test
artifact_contract_verified_by: behavior changes between the baseline and guided runs
compatibility_excludes: []
compatibility_requires:
  - close-guidance-loopholes
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/references/testing-skills-with-subagents.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Test the guidance against baseline behavior
Testing skills is just TDD applied to process documentation.
Run scenarios without the skill and watch the agent fail.
Write the skill addressing those failures and watch the agent comply.
Close loopholes and stay compliant.
If you didn't watch an agent fail without the skill, you don't know if the skill prevents the right failures.
Create pressure scenarios with 3+ combined pressures.
Give agents a realistic task with pressures.
Document choices and rationalizations word-for-word.
Identify patterns: which excuses appear repeatedly?
Note effective pressures: which scenarios trigger violations?
This is identical to TDD's "write failing test first".
You must see what agents naturally do before writing the skill.
Run the baseline with no guidance present.
Record the option the agent selects.
Write guidance addressing only the failures you observed.
Compare the baseline run and the guided run.
Behavior must change between the two runs.
Tests pass once does not mean bulletproof.
Continue the refactor cycle until no new rationalizations appear.
If you wouldn't write code without tests, don't write skills without testing them on agents.
<!-- vpmodule:atom:end test-guidance-against-baseline -->