---
instruction_id: size-and-gate-the-work
title: Size and gate the work
summary: Name the size of the work in plain words and build only after the human approves the full description.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - approval-policy
  - approval-policy-gate
conditions_applies_when: "The need could be a quick task, a small change, or a project with a design."
conditions_does_not_apply_when: The owner has already approved the size and the full description of the result.
artifact_contract_output_type: work-size-decision
artifact_contract_required_data:
  - size
  - agreed description
  - work boundary
artifact_contract_verified_by: owner confirms the stated size and description
compatibility_excludes:
  - proceed-without-waiting-for-confirmation
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/choose-a-planning-path.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/index.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/start-in-an-existing-codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/build-a-change.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/the-phase-loop.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/context-engineering.md
status: active
revision: 6
---

# Size and gate the work
Once you understand what the user wants, pick a size and say it in plain words. They can override it.
A quick, clear task: the request itself is the full description. Do it.
A small change: describe it in chat, then build it through the normal workflow.
A project with a written design: write a design document, then make a full plan.
If the work grows mid-task, stop, say so, and step up a size.
If this is really several independent projects, say so, agree on an order, and take them one at a time.
Nothing gets built until the human approves the full description: in chat for a small change, the document for a project.
Building includes writing product code, scaffolding, installing dependencies, creating projects, and invoking an implementation skill.
Reading and exploring are fine before approval.
Two exceptions: the human opted out of the questions, or they approved a spike. A spike stays labeled throwaway, and keeping what it produced is a new request that comes back through the gate.
After a project's document is approved, the next step is the plan.
The written design must let a talented builder in the domain plan without going back to the human partner.
Cover intent and the why, goals, non-goals, anti-goals, constraints, the parts of the how the human decided, and what is left to the builder.
Mark anything you are guessing as your guess; only what the human said goes in as theirs.
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
