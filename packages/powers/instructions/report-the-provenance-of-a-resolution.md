---
instruction_id: report-the-provenance-of-a-resolution
title: Report the provenance of a resolution
summary: "A resolver returns what it resolved and where it came from; a fallback is a visible value, never a silent substitution."
capability_tags:
  - curate-context
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A resolver reads configuration, anchors to a project root, or picks a workstream and may fall back to a default."
conditions_does_not_apply_when: The value is returned verbatim from a source that cannot be ambiguous.
artifact_contract_output_type: resolution-provenance
artifact_contract_required_data:
  - the resolved value
  - the provenance it came from
  - the diagnostic emitted when a configured input resolves empty
artifact_contract_verified_by: a caller can tell a configured-but-resolved-empty input from a not-configured one by reading the provenance field
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/adr/1411-resolution-provenance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Report the provenance of a resolution
Context resolution at a trust boundary — reading config, anchoring to a project root, resolving a workstream — **MUST report its provenance**.
A resolver may fall back, but the fallback **must be a visible value, not a silent substitution**.
1. **Deterministic anchoring.** Resolve the project root through **one** walk-up module.
Resolution MUST NOT depend on an arbitrary descendant cwd.
2. **Provenance, not a bare value.** A resolver returns *what* it resolved **and** *where it came from*.
Callers branch on the provenance field, never on the resolved contents, to detect degradation.
3. **Visible degradation.** A *configured* input that resolves empty MUST emit a diagnostic.
"Not configured" and "configured-but-resolved-empty" MUST be distinguishable in the output contract.
Resolution may still fall back to preserve continuity — a missing workstream config should not abort the verb.
A *configured* input that resolves empty **without** a reason is a CI-guarded regression
