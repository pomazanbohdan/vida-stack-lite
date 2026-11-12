---
type: Decision
title: 'D57 - D18 delegated review for H2 CSV admission'
description: 'The owner extends the D18 three-protocol delegated review to H2 CSV semantic admission, with actor, model and evidence recorded per receipt; the 2026-11-10 amendment adds deferred-sibling dedup coverage.'
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

## Amendment — deferred-sibling dedup coverage (2026-11-10)

Status: applied under the owner's 2026-11-10 direction to the H2-A2 stack
review. It extends the duplicate-rejection evidence rule for CSV semantic
admission; it changes no row hash, cell hash, locator, disposition value,
binding shape, receipt shape or validator check.

`REJECT_DUPLICATE` may cite coverage by instructions admitted from sibling
rows **in the same admission batch** (deferred-sibling coverage), in addition
to coverage by already-admitted instructions. A rejected row's `reason` must
name the covering sibling rows (file, line/locator) and the instruction IDs
or bindings that carry the coverage.

Normative rule:

1. Coverage counts only for sibling rows of the **same CSV source** whose
   dispositions reach `admitted` in the **same admission batch** as the
   rejection is applied. "Same admission batch" is the atomic set of
   same-CSV-source dispositions applied together in one apply run. Coverage
   by a row that remains `deferred`, `held`, `merged`-away, or rejected
   itself does not count.
2. **Partial coverage is not sufficient for rejection.** Every
   `normative-*` column cell of the candidate rejected row must be covered —
   whole-cell or by exact code-point subspan — by the union of the covering
   instructions' bound cells. Coverage is assessed per cell and per
   normative fragment, not per row: a cell whose Do text is covered but
   whose Don't or code-example cell carries an uncovered claim defeats
   rejection for the whole row. Any normative fragment left uncovered
   forces admission (KEEP_ATOMIC or SPLIT), never rejection.
3. A row whose coverage is partial is admitted with its unique units, and
   each covered fragment is bound by exact code-point subspan to the
   instruction admitted from the covering sibling row — the same cross-row
   subspan mechanism already used for `Touch Target Size` — instead of
   being duplicated into a second instruction. Every unique fragment is
   bound to the row's own admitted instruction(s); every covered fragment
   is bound by subspan to the covering instruction. The row's admitted
   bindings still cover every `normative-*` cell under the D56 §6.4 union
   rule (whole-cell or subspan, separator-only gaps evaluated over the
   union of subspan intervals across all bindings touching the column).
   Every code point of the cell must fall inside a bound span or a
   separator-only gap.
4. Rejection under deferred-sibling coverage creates no bindings and no
   fidelity receipt for the rejected row; the covering instructions carry
   their own READY receipts as usual. `reason` is required and must cite
   the covering rows and their admitted instruction IDs (or binding
   locators).
5. Deferred-sibling coverage does not merge, weaken or reinterpret norms.
   Coverage is claim-based, not literal: a fragment is "covered" only when
   a specific bound cell of the covering instruction establishes the same
   claim, and the coverage record must cite that bound cell and explain the
   mapping. Superficial topical similarity (same component, same prop
   name, same substring appearing in unrelated cells) is not coverage. The
   covering instructions must each independently satisfy the D56
   no-translation/no-strengthening fidelity rule against their own bound
   cells.
6. **Locator ownership is not transferable.** A cross-row subspan binding
   may name an `instructionId` admitted from a sibling row (external
   instruction identity is permitted), but every binding cell `locator` and
   `locators` entry must still resolve to a parsed cell in the **owning
   map row** per D56 §9. The covering instruction's own locators continue
   to point at its own row; the partially covered row never borrows the
   sibling's locators.

**Precedent.** Cross-row subspan binding is already accepted practice: the
`Touch Target Size` resolution bound a Web subspan on
`uupm-ux-target-size-minimum` derived from `ux-guidelines.csv` L105, and the
review JSONs record the analogous `ux-guidelines.csv` L23 fragment bound to
that instruction. This amendment generalizes the same mechanism from
already-admitted coverage to same-batch sibling coverage; it introduces no
new binding shape.

