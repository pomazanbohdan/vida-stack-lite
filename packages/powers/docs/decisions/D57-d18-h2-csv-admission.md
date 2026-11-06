---
type: Decision
title: 'D57 - D18 delegated review for H2 CSV admission'
description: 'The owner extends the D18 three-protocol delegated review to H2 CSV semantic admission, with actor, model and evidence recorded per receipt.'
status: stable
stale_after: '2027-11-06T00:00:00Z'
tags:
- vida-powers
- h2
- source-review
- decision
sources:
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
- id: d56
  resource: /decisions/D56-h2-contract.md
  title: D56 - H2 contract approval
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
revision: '1'
---

# D57 — D18 delegated review for H2 CSV admission

Date: 2026-11-06
Status: accepted

## Context

The H2 contract kept H2 semantic fidelity human under SR-89 unless the owner
recorded a separate decision extending D18 to H2. The owner extended D18 to H2
on 2026-11-06 for CSV semantic admission.

## Decision

H2 CSV admission may use the D18 three-protocol delegated review. Each
binding's `H2FidelityReceipt/v1` may use `reviewer.kind: delegated` when it
records `reviewer.actor`, `reviewer.model` and an evidence path with its
SHA-256. Human review remains mandatory for non-H2 sources and for any H2
binding outside this decision.

Delegated review remains model review. It is not human fidelity, legal
clearance, source admission, H2 acceptance or Runtime acceptance.

## Consequences

- `verifyFidelityReceipt` accepts delegated receipts only when the model and
  evidence are present.
- The approved D56 contract remains in force; this decision records the
  separate extension that its section 7 anticipated.
- H2 acceptance still requires every admitted binding to have a valid receipt
  and all remaining H2 gates.
