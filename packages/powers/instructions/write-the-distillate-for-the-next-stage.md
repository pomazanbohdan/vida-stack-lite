---
instruction_id: write-the-distillate-for-the-next-stage
title: Write the distillate for the next stage
summary: "Always produce a distillate: dense bullets grouped by theme, each standing alone with enough context for a downstream agent, carrying the rejected framings, the open questions and the verdict findings."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A concept has been worked through and a downstream stage will pick it up.
conditions_does_not_apply_when: No downstream stage consumes the result.
artifact_contract_output_type: distillate
artifact_contract_required_data:
  - the theme groups
  - the rejected framings and why they were dropped
  - the open questions and unknowns
  - the verdict findings as actionable items
artifact_contract_verified_by: "each bullet stands alone and the outcome names the verdict as forged, needs-heat, or cracked"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/verdict.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/explore-and-validate-an-idea.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-todo.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/check-todos.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
  - research
---

# Write the distillate for the next stage
Always produce the distillate.
Distillate content: Dense bullet points grouped by theme. Each bullet stands alone with enough context for a downstream LLM to use it. Include:
Rejected framings and why they were dropped
Requirements signals captured during coaching
Technical context, constraints, and platform preferences
Competitive intelligence from discussion
Open questions and unknowns flagged during internal FAQ
Scope signals — what's in, out, and maybe for MVP
Resource and timeline estimates discussed
The Verdict findings (especially "needs more heat" and "cracks") as actionable items
```
{
  "status": "complete",
  "verdict": "forged|needs-heat|cracked",
  "key_risks": ["top unresolved items"],
  "open_questions": ["unresolved items from FAQs"]
}
If it reads like a document, it is too long.
The captured item carries enough context to be understood weeks later, without the original conversation.
Replace the rendered section wholesale with the literal value; do not reformat, re-wrap, re-order, or hand-edit the bullets.
