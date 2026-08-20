# GSD Core 1.11 integration

The managed stack is pinned to `gsd-1.11.0_ponytail-4.9.0`. The release is
installed as an immutable release directory and selected through the managed
`current.txt` pointer. The previous release remains installed for explicit
rollback; it is not silently accepted by the v1.11 capability contract.

## Applied core capabilities

The repository-owned capability uses the native GSD lifecycle hooks and the
following v1.11 surfaces:

- `plan:post` uses the plan-drift guard for undeclared same-wave coupling and
  cross-artifact fact drift before execution. Findings return to the plan
  route; they do not become a reason to broaden implementation scope.
- Per-plan `agent_hint` routing is delegated to the native GSD resolver once
  for the implementation lane. It is deliberately absent from reviewer,
  security, architect and delivery dispatches, where the portable runtime's
  independent profile and authority rules remain in force.
- `execute:post` is the complexity-trigger extension point. A refactor is
  proposed only when the static complexity/CRAP evidence crosses the existing
  threshold. The native proposal is consumed at most once for one bounded
  root-cause correction under the testing protocol; a repeated proposal is a
  typed GAP, never an open-ended self-review loop and never a bypass of
  review, security, Runtime or delivery gates.
- `verify:post` uses the native scope/diff and goal-backward consistency
  checks when available. A committed diff outside the declared implementation
  scope remains a typed finding.
- Native `verification.status` is queried once at the verify/ship boundary and
  only its compact status, next action and evidence pointers are forwarded.
  The query is reused only while phase, source and revision remain bound.
- capability skill disclosure, resolved host runtime, install scope and the
  installed model/config posture come from the v1.11 installer manifest. The
  runtime records only compact pointers; it does not copy full skill prompts or
  duplicate core discovery logic.

## Deliberately not delegated to GSD

The portable runtime remains the authority for checkpoint CAS, FIFO ownership,
PlatformKnowledgeContext, exact-three receipts, architect diagnosis, Runtime
dispositions and delivery. GSD plan/complexity/drift findings are evidence and
routing inputs. They cannot authorize mutation or delivery and cannot replace
the runtime's independent gates.

Codex-specific reviewer model/profile selection remains explicit in the review
preflight. GSD's passive model posture is therefore observed, not used to
silently replace the configured `gpt-5.6-luna/xhigh` assurance profile.

## Optimization rules

1. Resolve the installed core version, profile and host capability once per
   lifecycle invocation; reuse the immutable install manifest.
2. Let native GSD perform plan-drift, source-grounding, wave-scope,
   goal-backward and complexity checks instead of adding parallel parsers to
   `agent-runtime`.
3. Pass compact finding pointers, counts and the native `next_action` to the
   next phase; retain full diagnostics in derived evidence.
4. Query native verification status once at the current phase boundary and
   reuse it only for the same source/revision.
5. A complexity finding may cause one bounded execute:post refactor route. If
   the same root cause persists, stop and report a typed GAP rather than
   appending another correction loop.
6. Do not reduce required PlatformKnowledge, exact-three, reverse-validation,
   security, Runtime or delivery evidence for a faster path.

## v1.11 feature activation

The installer and lifecycle launcher set the following first-party keys in the
namespaced workstream configuration, idempotently:

- `workflow.agent_hint_routing=true`;
- `workflow.plan_drift_precheck=true`;
- `workflow.schema_drift_gate=true`;
- `refactor.trigger_enabled=true`.

The last feature is advisory in GSD Core: it writes a scoped refactor proposal
and does not edit source or authorize shipping. `workflow.auto_advance` and
`workflow._auto_chain_active` are not enabled by this repository because they
could bypass human or assurance checkpoints. Native transition/auto-chain
helpers may consume an already-authorized runtime `next_action`, but they may
not invent authority or release host handles, and they never auto-approve human,
review, Runtime or delivery authority.

## Upgrade and rollback

`script/Install-AgentDevelopmentRuntime.ps1` validates the current managed
release, installs the repository capability through native `gsd-tools`, and
renders all eight lifecycle hooks. A rollback is an explicit operator action:
restore the prior managed pointer and the matching repository pin together,
then rerun the installer and contracts. No package files are patched in place.
