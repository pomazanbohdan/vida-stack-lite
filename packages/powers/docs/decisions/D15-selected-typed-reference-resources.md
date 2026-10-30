---
type: Decision
title: 'D15 — Selected typed reference resources'
description: 'Accepted reference-data families and their bounded retrieval contract.'
status: stable
stale_after: '2027-10-22T00:00:00Z'
tags:
- vida-powers
- reference-data
- catalog
- decision
sources:
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers product research
generated: { by: codex/gpt-6-luna, at: '2026-10-22T12:45:00Z' }
verified: { by: human:repository-owner, at: '2026-10-22T12:35:30Z' }
revision: '1'
---

# Decision

## Accepted choice

On 2026-10-22 the product owner accepted selected typed reference records in the same canonical catalog: palettes, font pairings, style records, icon lists, and standards checklists. Retrieval is by exact resource ID. This work is a separate phase after instruction and applicability work.

Actionable rules belong in instructions; reference records retain typed data and provenance. A source being CSV does not make its rows instructions or make the whole file eligible for retrieval. Materialize only selected, validated records.

## Boundary

D15 does not authorize a broad knowledge base, whole-file or automatic asset injection, BM25/Python dependencies, a second activation path, donor admission, rights clearance, a schema migration, implementation, or Runtime acceptance. Use the existing catalog and portable shipped reader.

## Rationale and trace

The owner selected the recommended D-b option in the corrected research amendment packages/powers/.tmp/panel/csv-framework-joint-research-c120-20261022/DECISION-r2.md (SHA-256 c0d09d203f8af86807f8381eec2e5f90bf8ea8144246e65652bee900c4840946). The M3.1 R2 review (SHA-256 d16d526824a89f60d6d05ad89e352a0ea7ae244956d2c1c9686df7f64b8e9aa2) found the proposal ready for owner decision; it is not evidence of implementation. This decision updates BR-22. System behavior and phases are specified in system-specification.md and task-plan-step-h.md.
