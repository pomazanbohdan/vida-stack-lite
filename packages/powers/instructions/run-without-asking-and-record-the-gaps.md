---
instruction_id: run-without-asking-and-record-the-gaps
title: Run without asking and record the gaps
summary: "Without a live person: do not ask and do not greet, infer what you can into assumptions, route every gap that needs a human decision into open questions, and never invent a persona, a brand, an accessibility rule or a scope."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The run is unattended or driven by an automation context.
conditions_does_not_apply_when: A person is present and can answer.
artifact_contract_output_type: headless-result
artifact_contract_required_data:
  - the status
  - the assumptions
  - the open questions
artifact_contract_verified_by: "the status is complete, partial or blocked and every gap is listed as an open question"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/headless.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/customer-faq.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/internal-faq.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/manager.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project/steps/auto-mode-detection.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project/steps/auto-mode-config.md
status: active
revision: 3
---

# Run without asking and record the gaps
Headless when any of:
caller sets `headless: true` (or harness equivalent)
invocation is from another skill or non-interactive runner
first message is an automation context pre-supplying inputs
Ambiguous → default interactive.
Do not ask. Do not greet.
Validate the input schema only
— do not read any referenced files or documents yourself.
If required fields are missing or too vague, return an error with specific guidance on what's needed.
Complete the intent from what's provided, what exists in the workspace, or what you can discover.
If intent stays ambiguous after inference, halt with `status: "blocked"` and a one-sentence `reason`.
"complete" — stands on its own.
"partial" — artifact produced but `open_questions[]` non-empty or critical inputs inferred.
"blocked" — no artifact produced.
Inferences → `assumptions[]`. Gaps needing a human decision → `open_questions[]`. Do not invent persona, brand, accessibility, or scope detail.
Flag answers with low confidence so a human can review.
Flag high-risk areas and unknowns prominently.
Creative tools default off in headless. Caller can override; artifacts land in `.working/` and are not promoted unless the caller signals.
`intent` — "create", "update", or "validate". If absent, infer from the artifact set.
End with the JSON response. `intent` reflects detected intent. Omit keys for artifacts not produced.

An unattended run needs its input up front: without the document, return an error with the usage instead of starting the work.
In an unattended run, decide autonomously from the project context. If you hit a blocker, record it and stop.
Never work around a permission or access error - let it fail so it can be surfaced with resolution hints.
Auto mode requires an idea document — either:
Auto-include all table stakes features (users expect these)
Include features explicitly mentioned in provided document
Auto-defer differentiators not mentioned in document
Requirements approval: Auto-approve
Roadmap approval: Auto-approve
