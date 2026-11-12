---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-explore-and-validate-an-idea-md-486d60b2-c01"
title: "bmad-method: docs/plan/explore-and-validate-an-idea.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/plan/explore-and-validate-an-idea.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/explore-and-validate-an-idea.md\"}"
atom_ids:
  - close-the-idea-session-with-one-of-three-verdicts
  - write-the-distillate-for-the-next-stage
atom_count: 2
atoms: "[{\"atom_id\":\"close-the-idea-session-with-one-of-three-verdicts\",\"file_sha256\":\"99e1ce5908d12fca19938480a77f36d76de7f5764d09baf618eb4a1f2263131d\",\"content_sha256\":\"40a00d41cee665ac915a4f65b9b6c4296114ab50c4a14c65705ebc3308f95b57\",\"file_bytes\":1636,\"body_bytes\":473},{\"atom_id\":\"write-the-distillate-for-the-next-stage\",\"file_sha256\":\"30e5e8b5505fa6f8131a5a1322a66c7de84da6881f66f367e0369d971c148cc7\",\"content_sha256\":\"fad3fe7bfa5d569956008174718225321475955918f72c221c4a93135387cb90\",\"file_bytes\":3010,\"body_bytes\":1342}]"
carrier_sha256: 39c2e4975c6ba8c5e8d878f4aa356d2a5e38874b09e972443d4bee7eaa196e46
carrier_bytes: 4937
revision: 1
status: active
---
<!-- vpmodule:atom:begin close-the-idea-session-with-one-of-three-verdicts -->
---
instruction_id: close-the-idea-session-with-one-of-three-verdicts
title: Close the idea session with one of three verdicts
summary: "End the session hardened, killed or clearer, and treat all three as valid results; the written file is optional."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An idea has been questioned until it can be acted on or dropped.
conditions_does_not_apply_when: The idea was never questioned.
artifact_contract_output_type: idea-verdict
artifact_contract_required_data:
  - the outcome
  - the reason
  - the record
artifact_contract_verified_by: the outcome is one of the three and the reason behind it is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/explore-and-validate-an-idea.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body describes an idea session but names no supported domain; assigning product, research, or design-ux would infer context."
---

# Close the idea session with one of three verdicts
The session ends in one of three ways, and each is a valid result:
The idea is specific enough to use.
The idea does not hold up. The report records why.
You understand the idea better, but there is nothing to hand off. The session log is the record.
A conversation is the cheapest place to find a hole in the idea, because changing your mind there costs nothing.
Better thinking is the goal; a written file is optional.
<!-- vpmodule:atom:end close-the-idea-session-with-one-of-three-verdicts -->
<!-- vpmodule:atom:begin write-the-distillate-for-the-next-stage -->
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
<!-- vpmodule:atom:end write-the-distillate-for-the-next-stage -->