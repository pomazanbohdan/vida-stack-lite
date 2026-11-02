---
type: Decision
title: 'D17 — Source attribution boundary: no Powers legal-risk assessment'
description: 'Powers records a minimal per-source link, digest and locator; it does not assess legal risk.'
status: stable
stale_after: '2027-11-02T00:00:00Z'
tags:
- vida-powers
- source-attribution
- admission
- decision
sources:
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: d14
  resource: /decisions/D14-bounded-engineering-ux-guidance.md
  title: D14 — Bounded engineering, UX, product and business guidance
- id: step-h
  resource: /task-plan-step-h.md
  title: Step H source-admission plan
generated: { by: human:repository-owner, at: '2026-11-02T00:00:00Z' }
verified: { by: human:repository-owner, at: '2026-11-02T00:00:00Z' }
revision: '2'
---

# Decision

## Accepted choice

On 2026-11-02 the repository owner directed that Powers must not perform a
legal-risk assessment, grant rights or claim legal clearance for source content.
Powers provides the exact source link and attribution instead. Owner admission
remains a separate product decision.

## Boundary

Reuse the existing instruction `provenance` entry — `donor`, `license`,
`revision`, `path` — and add only two fields per source:

- `sha256` — the exact source file at that revision;
- `locator` — the exact selected line/codepoint/byte span or row/cell.

No other per-source fields are added. The donor manifest owns the license text,
license path and donor-level attribution; the package `NOTICE` owns the rendered
notice. Author/title is required source metadata. It is read from the source file
or donor manifest; if unavailable, the record is incomplete and blocks the
dependent unit. The notice is rendered from the donor manifest, source entry and
`NOTICE`. None of these is duplicated per instruction.

An instruction may have several source entries. A merged instruction retains
every entry and is current only when every entry is current.

A missing, stale or contradictory entry blocks the dependent source action. An
ambiguous entry asks the decision owner. Powers does not decide whether the
consumer's use is lawful; legal review and any permission for a particular use
remain outside the Powers product. The record is source metadata, not a legal
opinion.

## Source update tracking

The stored `sha256` is the update signal. When a donor advances:

- **current** — the source file hash and pin both match.
- **pin-stale** — the hash matches but the donor revision advanced; the text is
  unchanged and the pin can be updated after verification.
- **stale** — the file hash differs; the locator and instruction must be
  re-reviewed before publication.
- **missing** — the source path no longer exists; the dependent instruction is
  blocked or replaced.
- **unknown** — a legacy entry has no hash; it is not claimed current until
  backfilled.

Status is derived at check time, not stored. A donor update alone does not make
an instruction stale; only a changed source file does.

## Consequences

- The former Powers "rights-cleared" gate is replaced by **source-attributed and
  owner-admitted** content.
- Source attribution/link, human fidelity review and owner admission are the
  required H1 gates.
- A merged instruction keeps one provenance entry per source; staleness is
  evaluated per source, not per donor.
- Existing legacy entries remain readable; an entry without `sha256` reports
  `unknown` until it is backfilled, not current.
- A license label is recorded, not interpreted as legal clearance.
- Historical rights dossiers and HOLD decisions remain historical evidence; they
  are not a current legal gate and are not rewritten.
- H2/H3 source admission follows the same boundary when those phases become
  active.
- No Powers document claims legal compliance, permission or absence of legal risk.
- A complete attribution record needs no human question. An incomplete or
  contradictory record is an automatic block or an owner question under the
  existing clarification policy; it is not inferred.

## Rationale and trace

The owner instruction is the current business authority. It reconciles D14's
per-source source review and admission with the product boundary: Powers owns
source identity, attribution and content quality; the consumer/owner owns legal
review for a particular use.
