---
instruction_id: triage-review-findings-with-judgment
title: Triage review findings with judgment
summary: "Check each finding against the facts and separate blockers from improvements and preferences, instead of executing every comment."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A review produced a set of findings that need sorting and action.
conditions_does_not_apply_when: The findings are already verified and carry a settled priority.
artifact_contract_output_type: finding-triage
artifact_contract_required_data:
  - all findings
  - fact check
  - severity
  - action order
  - owner decision
artifact_contract_verified_by: each kept finding checked against the code path it names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/lead-judgment.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/judgment-reviewer.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/synthesizer.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 2
---

# Triage review findings with judgment
You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.
Reviewers, especially adversarial ones, tend to fill their review. If their findings are all nits and style preferences, the code is probably fine. Say so.
A hypothetical finding counts only when the caller can actually reach it. Trace the call site. If input is validated upstream or the type system prevents it, dismiss the finding.
Reviewers often suggest extracting functions, adding interfaces, or creating abstractions. Ask whether the code needs to change in a second way. If not, the abstraction is premature.
I would have done it differently is the most common false positive. A finding that amounts to a preference is not a bug and not actionable unless the reviewer shows a concrete problem. Dismiss it and say why.
Watch for missing-context signals: changes to code the author did not write, patterns consistent with the rest of the codebase, and recommendations that conflict with known constraints. Dismiss them gracefully.
Do not dismiss findings because they are uncomfortable. The point of adversarial review is to catch what you would miss.
Signs a finding deserves attention: multiple models flagged it independently, it names a concrete execution path, it reveals a gap in your mental model, or you read it and think yeah, actually.
Put every finding in one bucket: act on, consider, noted, or dismissed, with the models that raised it and a one-line rationale.
Keep findings that are durable: still true in six months, once paths, identifiers, and tool versions have changed. Drop implementation details that drift.
Prefer an existing owner for a finding. Propose a new one only when no existing skill, check, or document is a real home and the pattern recurs.
Route a rule that a lint, script, metadata flag, or runtime check can enforce to that mechanism instead of to prose.
Read the target before keeping a finding against it. If the guidance is already clear and well placed, the issue is execution, not the text.
Present the buckets and let the owner choose. Do not apply the accepted set without approval.

The reviewer's output is data, not verdict. **You are still the orchestrator.** Re-read the artifact text against each finding before classifying — rubber-stamping the reviewer is the same failure mode as ignoring it.

For each finding, classify in this **precedence order** (first matching class wins):

1. **Contract misread** — reviewer flagged something specifically because the CONTRACT you provided was unclear or incomplete. Fix the contract first, re-classify on the next cycle.
2. **Valid + actionable** — real issue requiring a change to the artifact. Change it, re-loop.
3. **Valid trade-off** — issue is real but cost of fixing exceeds cost of accepting. Document the trade-off explicitly so the user sees it.
4. **Noise** — reviewer flagged something that's actually correct under context the reviewer didn't have. Note it, move on, and ask: would adding that context to the contract have prevented the false flag?

A fresh reviewer can be wrong because it lacks context. Don't defer just because it's "fresh."
