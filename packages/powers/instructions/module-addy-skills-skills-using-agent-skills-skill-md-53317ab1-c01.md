---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-using-agent-skills-skill-md-53317ab1-c01"
title: "addy-skills: skills/using-agent-skills/SKILL.md module"
summary: "Carrier for 4 atomic instructions from addy-skills:skills/using-agent-skills/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/using-agent-skills/SKILL.md\"}"
atom_ids:
  - apply-the-definition-of-done-to-every-change
  - name-the-confusion-before-continuing
  - push-back-with-quantified-reasons
  - stay-inside-the-requested-scope
atom_count: 4
atoms: "[{\"atom_id\":\"apply-the-definition-of-done-to-every-change\",\"file_sha256\":\"025e816eef257d4f5ac2a01b84eeb4f9f261af049f4a26284afaed5b85d8d8fd\",\"content_sha256\":\"535c5bcae4ca2c8efcfb5f8d3d2bd3fa3ac3ed1a14d395af316a6b09e203543b\",\"file_bytes\":1776,\"body_bytes\":579},{\"atom_id\":\"name-the-confusion-before-continuing\",\"file_sha256\":\"baa365de7fc0c7b4a9cfe60c373a26e6bcf9875d9a9ed19e7bf72edf874f0608\",\"content_sha256\":\"e92866fde8397588f7fe753e747cc1887e5abdaf7d6202b2c3add82b565763f2\",\"file_bytes\":1644,\"body_bytes\":486},{\"atom_id\":\"push-back-with-quantified-reasons\",\"file_sha256\":\"76d1bc7d92bafd07ee9eb9649633cfafb0a26062ba65d7d6f04e8392bd8b4732\",\"content_sha256\":\"9fa42b4aad0335d33f69831888ec1c24c1a8e7e19b758cf3a3451e45510a7b92\",\"file_bytes\":1671,\"body_bytes\":534},{\"atom_id\":\"stay-inside-the-requested-scope\",\"file_sha256\":\"c846eb7204bb188c5d46cad3e8c190a5cd8cdd27d454a4fca71ccd904c9f42fa\",\"content_sha256\":\"3da1e0fff5b0c1d64a5b481de62ab3c4acf6770c22e2967511254151fcbcb523\",\"file_bytes\":2872,\"body_bytes\":1216}]"
carrier_sha256: 2c787e5775bea9b5fa735f66f70a1bfa5108e836093ba5977c9e4d386cad15ed
carrier_bytes: 8482
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-the-definition-of-done-to-every-change -->
---
instruction_id: apply-the-definition-of-done-to-every-change
title: Apply the definition of done to every change
summary: "Every change clears the project-wide bar: tests pass, no regressions, the behaviour is verified at runtime and the documentation is updated."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: "Any change is about to be called done, whatever workflow produced it."
conditions_does_not_apply_when: "The work changes no runtime behaviour, such as a comment-only edit."
artifact_contract_output_type: definition-of-done-check
artifact_contract_required_data:
  - the test result
  - the regression check
  - the runtime verification
  - the documentation update
artifact_contract_verified_by: all four items of the bar are met and the task acceptance criteria were met as well
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/using-agent-skills/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Apply the definition of done to every change

## Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Per-skill verification is the local check. The project-wide bar that applies to *every* change, regardless of which skill is active, is the Definition of Done: tests pass, no regressions, behavior verified at runtime, docs updated. It complements each task's acceptance criteria rather than replacing them.
<!-- vpmodule:atom:end apply-the-definition-of-done-to-every-change -->
<!-- vpmodule:atom:begin name-the-confusion-before-continuing -->
---
instruction_id: name-the-confusion-before-continuing
title: Name the confusion before continuing
summary: "When the request, the instructions and the code disagree, stop, name the specific contradiction, present the tradeoff and wait for the resolution."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stop-on-conflict
conditions_applies_when: Two sources that both govern the work contradict each other.
conditions_does_not_apply_when: "The ambiguity is routine and reversible; choose the safest interpretation, record it and continue."
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the contradiction
  - the two sources
  - the options
  - the question
artifact_contract_verified_by: the conflict is named in specific terms and resolved before the work continues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/using-agent-skills/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Name the confusion before continuing

## Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.

**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"
<!-- vpmodule:atom:end name-the-confusion-before-continuing -->
<!-- vpmodule:atom:begin push-back-with-quantified-reasons -->
---
instruction_id: push-back-with-quantified-reasons
title: Push back with quantified reasons
summary: "Point at the problem, quantify the concrete downside, propose an alternative, and accept the human's decision when they override you."
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: An approach you are asked to follow has clear problems.
conditions_does_not_apply_when: The approach has no clear problem; implement it.
artifact_contract_output_type: technical-objection
artifact_contract_required_data:
  - the issue
  - the quantified downside
  - the alternative
  - the response to the override
artifact_contract_verified_by: "the objection names the issue, its cost and an alternative, and the human's override is accepted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/using-agent-skills/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Push back with quantified reasons

## Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.
<!-- vpmodule:atom:end push-back-with-quantified-reasons -->
<!-- vpmodule:atom:begin stay-inside-the-requested-scope -->
---
instruction_id: stay-inside-the-requested-scope
title: Stay inside the requested scope
summary: "Touch only what the request names: no orthogonal clean-up, no side-effect refactoring, no deletion of unused code and no unrequested features."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A change is implemented next to code that is not part of the request.
conditions_does_not_apply_when: The change removes the code that the request itself makes dead.
artifact_contract_output_type: scope-boundary
artifact_contract_required_data:
  - the files in scope
  - the neighbours left untouched
artifact_contract_verified_by: no file outside the request changed and no unrequested feature was added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/using-agent-skills/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/edit.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/insert-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/research-only-early-exit.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-execution.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stay inside the requested scope

## Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

Read the entry and only the files the change touches; the rest stays unread so it stays unchanged.

Do only the step you were asked for: do not create the artefacts of the next step, do not commit on the user behalf, and do not touch the surrounding records.
The research-only mode stops after the research: the planning, checking and verification stages are not run, the research-complete summary is printed and the workflow exits cleanly.
Before modifying any code not explicitly listed in the plan's `<files>` section, ask: Is this in my Circle of Control (plan scope) or my Circle of Concern (things I notice but shouldn't fix)? If Circle of Concern: document it as a deviation note or deferred item, do NOT fix it. The executor's job is to build what the plan says, not to improve the codebase.
<!-- vpmodule:atom:end stay-inside-the-requested-scope -->