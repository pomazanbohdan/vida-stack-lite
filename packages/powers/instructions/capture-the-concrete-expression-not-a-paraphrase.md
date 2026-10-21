---
instruction_id: capture-the-concrete-expression-not-a-paraphrase
title: "Capture the concrete expression, not a paraphrase"
summary: "A metric that the source states is captured with its name, its definition and the expression that computes it; the reference document owns the expression and the document that uses it links to it instead of repeating it."
capability_tags:
  - define-output-format
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "A fetched page states a metric, a dimension or a join."
conditions_does_not_apply_when: The page states nothing that can be captured in that shape.
artifact_contract_output_type: reference-document
artifact_contract_required_data:
  - the name
  - the definition
  - the expression
artifact_contract_verified_by: the expression is written out in full and the document that uses it links to the reference instead of repeating the expression
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 1
---

# Capture the concrete expression, not a paraphrase
When a fetched page contains any of the following content types, you **must** capture them in the appropriate doc — these are the highest-signal artifacts a web page can contribute and they are easy to lose in a topical paraphrase.
Capture the metric’s name, a one-line definition, and the **concrete SQL expression** (e.g. `COUNT(DISTINCT user_pseudo_id)`) — paraphrase is not enough.
Capture the two sides and the **concrete `ON` clause**.
Do not duplicate the SQL in the table doc; the reference owns it.
Body: the `ON` clause as a fenced SQL block, then one sentence on when to use this join.
These structured extractions bypass the four-gate reference test above.
