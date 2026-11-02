---
type: Decision
title: 'D17 — Source attribution boundary: no Powers legal-risk assessment'
description: 'Powers records exact source attribution and links; it does not assess legal risk, grant rights or clear content.'
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
revision: '1'
---

# Decision

## Accepted choice

On 2026-11-02 the repository owner directed that Powers must not perform a
legal-risk assessment, grant rights or claim legal clearance for source content.
Powers provides the exact source link and attribution instead. Owner admission
remains a separate product decision.

## Boundary

For every selected source or unit, Powers records:

- the canonical source path or URL;
- the pinned revision, or the retrieval date and content digest for an
  unpinned web source;
- the author/title and the applicable license label as metadata;
- the license file/path and its digest where one exists;
- the exact source locator for the selected text;
- the attribution/notice text that must accompany the content.

A missing, stale or contradictory source link/attribution blocks the dependent
source action. An ambiguous link/attribution asks the decision owner. Powers does
not decide whether the consumer's use is lawful; legal review and any permission
for a particular use remain outside the Powers product. The record is source
metadata, not a legal opinion.

## Consequences

- The former Powers "rights-cleared" gate is replaced by **source-attributed and
  owner-admitted** content.
- Source attribution/link, human fidelity review and owner admission are the
  required H1 gates.
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
