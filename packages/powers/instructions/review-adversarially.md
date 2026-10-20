---
instruction_id: review-adversarially
title: Review adversarially
summary: "Look for the way the change breaks instead of confirming its quality, and state every finding with a concrete path and a severity."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change or design is ready and needs review independent of its author.
conditions_does_not_apply_when: Only a mechanical format or build check is needed.
artifact_contract_output_type: adversarial-review
artifact_contract_required_data:
  - findings
  - scenario
  - impact
  - severity
  - verdict
artifact_contract_verified_by: a reviewer reproduction of each claimed failure scenario
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=agents/comment-sicko.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/code-quality-review.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/rubric.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/divergent-reviewer.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/tooling-reviewer.md
status: active
revision: 1
---

# Review adversarially
Spawn one reviewer per configured model. The adversarial signal comes from model diversity, not assigned personas. The deliverable is a synthesized verdict. Do not auto-apply changes.
Identify what to review from context: named files or a diff, the full changeset against the base branch, or the files behind recent work. Package the diff with the surrounding context a reviewer needs.
Before spawning reviewers, state the intent in one clear paragraph from the user's message, the commit messages, the change description, and the code. If you are unsure about the intent, ask before proceeding.
Give every reviewer the same intent, the same code, the same rubric, and the same code-quality lens. Tell them to challenge the execution, not the goal.
Review through whichever lenses are relevant: correctness, root causes against symptoms, structural integrity, verification, complexity budget, and security. Do not force lenses that do not apply.
When you find a potential bug, trace the execution path. Do not flag that a value could be null; show the call chain that makes it null.
For each security finding, trace the input path through the code and show it.
For each finding, provide severity, the concrete problem, the evidence and reasoning, and a suggestion only when there is a concrete alternative.
Do not restate what the code does without identifying a problem. Do not praise the code. An empty review is a valid outcome.
As results come back, merge findings that describe the same issue differently and note which models raised each one. Findings two or more models raised independently are the highest signal.
Note disagreements. When one model flags something and another explicitly says the opposite, that is context for the verdict.
Act as the lead reviewer, a pragmatic senior engineer, not a neutral aggregator. Put every finding in one bucket: act on, consider, noted, or dismissed.
Act on: real issues affecting correctness, security, or maintainability given the actual goals. They would block a real change.
Consider: legitimate, but not clearly worth the cost of addressing now. Worth the user's attention.
Noted: technically valid but not actionable, context-dependent, premature, or low impact at this stage.
Dismissed: wrong, nitpicky, or missing context, with a brief reason.
Watch for findings that reveal the reviewer did not understand the context: changes to code the author did not touch, patterns consistent with the rest of the codebase, or approaches that conflict with known constraints. Dismiss those gracefully.
Do not dismiss findings just because they are uncomfortable. Multiple models agreeing, a concrete execution path, a gap in your mental model, or a reaction of yeah, actually are signals to keep the finding.
Be especially careful about dismissing security findings and correctness bugs. They deserve more scrutiny even from a single model.
