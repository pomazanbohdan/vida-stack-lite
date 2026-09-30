# Requirement routing

The normative trace is `BR → SR → AC → evidence/GAP`: BR is owner intent; SR is
observable system behavior; AC is a verifiable condition; GAP is unresolved
intent, behavior or proof. A source plan records sources, impact, verification,
scope, rollback/cleanup and fingerprint before mutation. The living
specification owns accepted state; a work order is an approved bounded delta.

Evidence classes are independent: Decision (attributable intent), Code (current
implementation), Static (attributable executable/inspection proof), Runtime
(attributable observed behavior), and GAP. Code/Static cannot close Runtime.

A defect report records actual and expected behavior, reproduction, impact,
evidence, cause/hypotheses, options, acceptance and remaining runtime GAPs. A
workaround needs explicit decision, owner, scope, risk, rollback, expiry and
cleanup; it never closes the defect/delivery GAP or bypasses safety controls.

External task systems are adapters: discover/read/write/transition/link/reconcile
with an ordinary source revision token and drift detection. They are derived projections,
never BR/SR/AC/GAP authority. Backlog.md completion never closes approval,
delivery or runtime status.
