---
type: Decision
title: 'D19 — Algorithm delegation for human-loop decisions'
description: 'Every human-loop decision offers the three-protocol algorithm; a user who delegates is asked whether to apply it automatically to that decision type, with scoped, revocable records and safety exclusions.'
status: stable
stale_after: '2027-11-03T00:00:00Z'
tags:
- vida-powers
- human-loop
- delegation
- decision
sources:
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: d17
  resource: /decisions/D17-source-attribution-boundary.md
  title: D17 — Source attribution boundary
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 — Blind three-protocol panel for H1 source review and admission
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
generated: { by: human:repository-owner, at: '2026-11-03T00:00:00Z' }
verified: { by: human:repository-owner, at: '2026-11-03T00:00:00Z' }
revision: '1'
---

# Decision

## Accepted choice

On 2026-11-03 the repository owner directed that Powers offer the three-protocol
algorithm at every point where a human loop is required. The algorithm is the
D18 panel: **V3 Delphi**, **V2 Adversarial** and **V4 Party chat**, run as three
blind agents with orchestrator aggregation.

The offer states the decision type, scope, required evidence, algorithm version,
what the algorithm will decide, and the limits. The user may:

1. decide the matter directly;
2. delegate this one decision to the algorithm;
3. decline the algorithm and keep the human loop.

If the user delegates, the algorithm runs under the D18 evidence rules and the
orchestrator records the decision. After the decision, the user is asked whether
to use the algorithm automatically for **that decision type and scope** on an
ongoing basis. The answer is recorded as a scoped standing preference.

## Offer behavior

- Before a human-loop decision, evaluate the excluded-decision list first. An
  excluded decision never reaches a standing-preference lookup.
- For a non-excluded decision, look up a standing preference that matches the
  declared decision type and scope **exactly**. There is no wildcard,
  inheritance or fuzzy matching. If zero or multiple preferences match, or the
  preference is stale, do not run automatically; offer the human decision and
  record the ambiguity.
- If exactly one valid preference matches, run the algorithm automatically,
  record the decision and notify the user. Do not ask the same question again
  unless the scope, decision type, algorithm version, prompt/configuration
  identity or evidence policy changes.
- If no preference exists, offer the algorithm. Do not silently replace the
  human decision with a model decision.
- Record the offer and the user's answer: `human`, `delegated-once`,
  `delegated-standing` or `declined`.
- If the algorithm cannot reach a decision because evidence is missing,
  contradictory or the disagreement is unresolved, escalate to the human with
  the exact unresolved reason. It never guesses or fills a gap.

## Standing preference

A standing preference is a scoped record, not blanket consent. It records:

- `decision_type` and `scope`;
- `algorithm_version` and prompt/configuration identity;
- `evidence_policy`;
- `granted_by`, `granted_at`;
- `review_cadence` (a periodic human check or `none`);
- `revocation` state and the next effective decision.

The preference applies only to the named decision type and scope, using exact
matching. Changing the type, scope, algorithm version, prompt/configuration
identity or evidence policy requires a new answer. The user may revoke or
narrow it at any time; revocation takes effect on the next decision. Every
automatic decision records the same evidence as a one-off decision; the
preference does not weaken evidence, attribution or audit.

## Excluded decisions

The algorithm may be offered, but delegation is refused, when the decision is:

- a legal-risk, rights or clearance decision (D17);
- a significant ambiguity with an external or irreversible effect, security,
  scope or product-policy authorization (BR-09);
- a secrets, credential, access-control or security-incident decision;
- a destructive or irreversible operation, data deletion, or a migration
  without a rollback;
- Runtime acceptance, user acceptance, human UAT or human testing (SR-71,
  BR-12);
- a decision that law, contract or host policy reserves to a human;
- a decision type that is not in the declared registry.

For an excluded decision, the offer states the exclusion and stops. A standing
preference cannot override an exclusion. Changing an exclusion requires its own
owner decision; D19 does not amend BR-09 or D17.

## Decision-type registry

Every delegable decision type is declared with:

- `decision_type` — stable identifier;
- `description` and `scope`;
- `evidence_required`;
- `algorithm_allowed` — yes/no;
- `exclusion_reason` when not allowed;
- `automatic_requires_preference` — always true; an automatic run requires a
  valid matching standing preference, never a default mode;
- `review_cadence`.

New decision types require an owner decision. The initial allowed type is the
H1 source-fidelity and source-admission review under D18. The excluded initial
types include legal/rights clearance, security and access control, destructive
operations, Runtime/user acceptance and any BR-09 authorization.

## Evidence and audit

Record the offer, the user's answer, the algorithm version, the three agent
outputs, the aggregation, every disagreement and its source-line resolution, the
standing preference and any revocation. Bind the record to the decision type,
scope, source SHA-256 values and decision IDs.

A standing preference is not a substitute for the decision evidence, and it is
not a permission, a legal clearance or a Runtime acceptance.

## Implementation boundary

This decision defines the product policy. It does not implement the offer,
preference store or automatic path. Existing human gates remain in force until
an offer/preference path is implemented, tested and reviewed. The D18 delegated
gate for H1 source publication remains a separate implementation dependency.

## Review evidence

T3 Codex/Luna (`gpt-6-luna`, read-only) first returned CHANGES with three
Important findings: a default automatic mode, missing prompt/configuration
identity and re-consent, and undefined preference precedence/matching. All three
were fixed. The re-review returned READY with 0 Critical / 0 Important /
0 Minor. The review record is retained under the existing donor-migration
evidence directory (`d19-algorithm-delegation-review.md`). This is a policy
review, not implementation, admission, legal clearance or human fidelity.

## Rationale

The owner wants the algorithm available wherever a human loop exists, but not
forced. Asking once per decision type avoids repeated questions while keeping
the scope, evidence, revocation and safety exclusions visible. The offer is
always made first; a standing preference is an explicit, scoped delegation, not
an inferred default.

## Consequences

- Every human-loop point gains an explicit algorithm offer.
- A user can delegate one decision or a standing decision type.
- Excluded decisions remain human and cannot be overridden by preference.
- Audit and notification records grow; the preference is not blanket consent.
- The algorithm's output is model evidence, not human fidelity, legal clearance
  or Runtime acceptance.
