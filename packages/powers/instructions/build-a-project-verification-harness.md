---
instruction_id: build-a-project-verification-harness
title: Build a project-local verification harness
summary: "Give the project a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, and capture evidence."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: "The project has no scripted way to prove UI, CLI, or service behavior."
conditions_does_not_apply_when: An existing harness can already drive the app; use it first instead of generating a new one.
artifact_contract_output_type: verification-harness
artifact_contract_required_data:
  - launch command
  - readiness check
  - drive recipe
  - evidence
  - cleanup
artifact_contract_verified_by: the harness runs from a clean checkout and fails on a known break
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/references/feature-map-example/README.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/references/feature-map-example/create-note.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/references/feature-map-example/search.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/06-verify-and-ship.md
status: active
revision: 1
---

# Build a project-local verification harness
Every serious project needs a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, and capture evidence.
Write the output for the next agent, not for a human: it will be read cold, mid-task, by an agent that has never seen the app.
Interview the repo, not the user.
Answer from the codebase and only ask the user what you cannot observe.
Establish the surface: what does a user actually touch?
Establish how the app starts locally, preferring the repo's own documented dev command.
Establish how an agent can interact with it programmatically: existing harnesses first, and only then a generic recipe.
Establish what evidence can be captured: screenshots, terminal transcripts, response bodies, logs, exit codes, database state.
Establish whether two instances can run side by side; refusing to double-drive a shared instance beats corrupting the user's session.
If the checkout doesn't build or start as-is, fix that first or report it precisely before generating, because a skill written against a broken base teaches wrong steps.
Generate launch, doctor, drive, evidence, and cleanup sections, each grounded in what the interview actually found, with no placeholders left.
Launch must reach a usable state from an empty data dir, including any migrations and seed data.
Ready means usable, not just that a process answers.
Include one read-only check that answers whether this instance is worth driving.
Prefer stable handles, such as ARIA labels, data attributes, prompt strings, and route paths, over coordinates and tab order.
Exercise the real user path, not internal setters or test-only endpoints.
Capture the action and the resulting state, not just the final screen.
Verify side effects alongside what's visible.
Never kill by process name; kill what you started.
Cleanup removes instances and scratch state, never the evidence: proof artifacts survive the teardown, in a location the skill names.
Seed a feature map with a README index and one file per feature.
Each feature file answers, from the user's point of view: what the feature is, how to reach it, how to drive it with the harness, and what observable end state proves it works.
Never weaken the journey to make it pass.
Run its own instructions end to end once: launch, doctor, drive one mapped feature, capture evidence, clean up.
After cleanup, confirm the evidence still exists at the named location, because a cleanup that eats the proof fails this step.
A generated skill that was never executed is a draft, not a deliverable.
