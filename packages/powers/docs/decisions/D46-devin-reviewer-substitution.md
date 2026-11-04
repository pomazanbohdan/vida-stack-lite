---
type: Decision
title: 'D46 - Devin reviewer substitution for remaining H1 reviews'
description: 'The owner directs the remaining H1 plan reviews and D18 protocols to Codex Luna''s substitute, Devin SWE-2 Flash, with the actual reviewer and model recorded per batch.'
status: stable
stale_after: '2027-11-04T00:00:00Z'
tags:
- vida-powers
- business
- source-admission
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
---

# D46 — Devin reviewer substitution for remaining H1 reviews

Date: 2026-11-04
Status: accepted

## Context

D18 selected three blind Codex Luna protocols for H1 source admission. The
owner has directed that research and review work use the Devin provider instead
of Luna, and that a stalled Devin run may be nudged with a continue instruction.
Devin advertises `swe-2-flash-medium` (SWE-2 Flash Medium) under the
`acpRegistry_devin` provider instance; `swe2flash` is not a model ID.

## Decision

For the remaining H1 batches, plan reviews and the three blind D18 protocols run
on Devin `swe-2-flash-medium` with mode `ask` for read-only reviews and
`accept-edits` only when the protocol must write its own result file. The
aggregation tool reads the actual `reviewer` and `model` from each result file,
so batch evidence records the substitution rather than attributing the work to
Luna.

The D18 rules themselves are unchanged: three independent protocols, no reading
of each other's results, unanimous or 2-of-3 carry, and orchestrator resolution
of three-way splits and source ambiguities. Batches already reviewed and applied
on Luna keep their recorded reviewer; they are not relabelled.

## Consequences

Reviewer provenance changes for `next-21` onward. A Devin review carries the
same evidentiary role as a Luna review but is not human fidelity, legal
clearance or Runtime acceptance. If Devin is unavailable, the batch stops and
reports the provider failure rather than silently falling back to Luna.
