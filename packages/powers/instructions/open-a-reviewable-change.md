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
status: active
revision: 1
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
