---
instruction_id: review-a-requirements-document-dimension-by-dimension
title: Review a requirements document dimension by dimension
summary: "Walk the fixed dimensions, form a verdict on each one, and write findings only where they add information; the overall verdict is earned by the dimension verdicts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A requirements document is up for review.
conditions_does_not_apply_when: The review is a mechanical check of the format.
artifact_contract_output_type: dimension-review
artifact_contract_required_data:
  - the verdict per dimension
  - the findings per dimension
  - the overall verdict
  - the mechanical notes
artifact_contract_verified_by: every dimension carries a verdict and each finding cites a location and quotes the text
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-validation-checklist.md
status: active
revision: 1
---

# Review a requirements document dimension by dimension
A judgment rubric for the validator subagent. Walk the PRD with these dimensions in mind and write substantive findings — not box-ticking.
The goal is a review that tells the user whether this PRD is *good*, not whether it has the right section headers.
Be specific — cite locations, quote phrases, name what's missing. Abstract criticism is failure of nerve.
For each of the seven dimensions below, form a judgment — *strong / adequate / thin / broken* — backed by specifics from the PRD.
Write findings only where they add information. A `strong` dimension may need no findings; a `broken` one needs concrete, fixable ones.
Severity ranks impact on the PRD's usefulness, not how easy the fix is.
A vague Vision statement is *critical* even though it's a one-paragraph fix; a glossary drift might be *Minor* even though it appears in many places.
The overall verdict is your synthesis — 2–3 sentences that name what holds up and what's at risk. Earn it with the dimension judgments.
- **[Critical|Important|Minor]** [Title] (§ location) — [Note]. *Fix:* [suggested fix].
## Decision-readiness
Can a decision-maker act on this PRD? Are the trade-offs surfaced honestly, or has the PRD smoothed everything to neutral? Would someone pushing back find their objection acknowledged or dodged?
Look for:
- Decisions that are stated as decisions, not buried as "considerations."
- Trade-offs named with what was given up, not just what was chosen.
- Open Questions that are actually open — not rhetorical questions with an answer in the next sentence.
- `[NOTE FOR PM]` callouts at real tensions, not at safe checkpoints.
Red flag: a PRD where every choice "balances" everything, every NFR is "important," every persona "values" the product.
## Substance over theater
Is the content earned, or is it furniture?
## Strategic coherence
Does the PRD have a thesis? Do the features serve a unified arc, or is it a list of capabilities someone wanted?
Look for:
- A stated thesis the PRD bets on (problem framing, user insight, market move).
- Feature prioritization that follows from the thesis — not from "what's easy first."
- Success Metrics that validate the thesis, not metrics that just measure activity (DAU/MAU when the thesis is about engagement quality is a tell).
- Coherent MVP scope kind — problem-solving, experience, platform, or revenue — with scope logic that matches.
Red flag: a PRD that reads as a backlog with section headings.
## Done-ness clarity
Would an engineer reading this PRD know what "done" looks like for each FR?
Acceptance criteria implied or explicit. Sometimes the FR's consequences carry this; sometimes the PRD genuinely needs an Acceptance section.
## Scope honesty
Are omissions explicit, or is the reader meant to infer them?
Look for:
- `[ASSUMPTION: …]` tags on inferences the user didn't directly confirm, indexed at the end.
- `[NOTE FOR PM]` callouts at deferred decisions and unresolved tensions.
- De-scoping proposed honestly, not done silently.
## Downstream usability
If this PRD feeds UX, architecture, or story creation, can those workflows source-extract from it cleanly?
Look for:
- Glossary present; every domain noun used identically across FRs, UJs, SM definitions.
- FR / UJ / SM IDs contiguous, unique, and cross-references that resolve.
- Each section makes sense pulled out alone — cross-references via Glossary terms, not "see above."
- UJs each have a named protagonist; no floating UJs.
For standalone PRDs (no downstream), this dimension matters less — say so.
## Shape fit
Has the PRD been forced into a shape that doesn't match the product?
- Consumer product / multi-stakeholder B2B / meaningful UX → UJs with named protagonists are load-bearing.
- Internal tool, single-operator role → capability spec shape; UJs may be overhead; SMs may be operational rather than user-facing.
- Regulatory or compliance update → constraint traceability is non-negotiable; UJs may be irrelevant.
- Hobby / solo → rigor light, substance bar still applies.
- Brownfield → existing-code references must be accurate; new UJs and existing UJs must be distinguished.
- Chain-top (feeds UX → architecture → stories) → downstream usability matters more; standalone PRDs can be lighter on traceability.
Flag PRDs that are over-formalized (UJ density for a single-operator tool) or under-formalized (consumer product with no UJs).
## Mechanical notes
Cover these as a tail section, not a primary dimension. They matter for downstream but don't drive the verdict on whether the PRD is good.
- Glossary drift (case, plural, synonyms across the PRD).
- ID continuity (gaps, duplicates, unresolved cross-references).
- Assumptions Index roundtrip (every inline `[ASSUMPTION]` indexed; index entries all appear inline).
- UJ protagonist naming (each UJ has a named protagonist carrying context inline).
- Required sections present for the agreed stakes and product type.
