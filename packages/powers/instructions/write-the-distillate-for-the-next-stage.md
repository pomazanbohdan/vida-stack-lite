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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/verdict.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/explore-and-validate-an-idea.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-todo.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/check-todos.md
status: active
revision: 5
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
End with the recommended next step: ask Sofia (`bmad-agent-po`) to write the initiative's requirements from the PRFAQ and detail pack, or update them if the initiative file exists; go through `bmad-prd` first only when the requirements still need drawing out.
