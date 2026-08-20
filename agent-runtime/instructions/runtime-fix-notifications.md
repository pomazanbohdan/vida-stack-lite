# Runtime-fix notifications

Every confirmed portable-runtime or host-runtime fix has a mandatory developer
notification step. The notification is not a delivery approval and does not
change a checkpoint; it is a compact derived record that keeps affected
developer tasks on the same runtime version and route.

## Required sequence

1. Finish the bounded runtime correction and record the changed runtime paths,
   old behavior, expected behavior, validation result and evidence pointers.
2. Resolve every affected active work checkpoint and its exact Codex thread ID.
   Include all affected work IDs; do not notify an unrelated task.
3. Create one `RuntimeFixNotification/v1` with the same source revision as the
   fix. It must contain the compact next operation for each developer and the
   verification state (including checks not run). If several bounded lanes
   produced partial records for the same fix, merge them with the shared
   `mergeNotifications` helper first; mismatched fixes/source revisions fail
   closed instead of creating multiple competing notifications.
4. Deliver the record once to every attributable developer thread through the
   host collaboration surface. The host may fan out the same immutable record;
   it must not rewrite the message per recipient or turn it into authority.
5. If a thread ID or host send capability is missing, persist the notification
   with `status: "blocked"` and `GAP-HOST-DEVELOPER-NOTIFICATION-001`. Never
   claim that a message was sent and never fabricate a thread, receipt or
   checkpoint update. Resolve the GAP before the affected developer is asked
   to continue on the repaired route.

The notification is intentionally compact. It includes no full logs, prompts,
stack traces, source dumps, secrets or private reasoning. Full evidence stays
at its existing pointer. It is `derived_non_authoritative`: it cannot approve
reviews, start correction, authorize delivery or replace a runtime receipt.

## Repository command

Prepare a JSON input using the fields in
`schemas/runtime-fix-notification.v1.schema.json`, then run:

```text
npm run agent-runtime:notify:runtime-fix -- --input <repo-relative-json> --output summary
```

The command writes an immutable record under
`.planning/agent-flow/runtime-notifications/` and reports
`pending_host_dispatch` or the typed host GAP. A repeated invocation with the
same semantic identity is idempotent; a changed payload with the same identity
fails closed as an identity collision. The command itself never sends a
thread message, because portable runtime must not pretend to own the Codex
host API.

## Message content contract

The host message must state, in this order:

- what runtime defect was fixed;
- which runtime/schema/instruction files changed;
- which checks passed and which remain not run;
- the exact next typed operation for the developer;
- what product scope, checkpoint authority and delivery state were not changed;
- the notification/evidence pointer.

The same rule applies when a fix is made by the root orchestrator, a runtime
maintenance task or a bounded runtime-defect lane. A product-only fix does not
need this notification unless it also changes portable runtime behavior.
