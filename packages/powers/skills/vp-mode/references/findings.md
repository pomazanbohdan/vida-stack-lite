# Findings Procedure: Candidate, Append, Merge, Scope, UNKNOWN

## Candidate query

For a new observation, run the read-only candidate query before append:

```sh
bun <skill-dir>/scripts/catalog-cli.ts findings candidates --store <absolute-store-path> --event-file <absolute-observation-json>
```

Review the returned stored observations in append order. Exact candidate reasons are deterministic identity, `finding_id`, fingerprint, context, and provenance matches. The query can return more than one reason or candidate; it does not rank, prove semantic equivalence, or merge. Context object keys are canonicalized recursively, while strings and array order remain exact. Empty `{}` context matches only another empty context; empty provenance is invalid.

Compare each candidate's reproduction, context, and evidence with the new artifact. Exact event replay is idempotent. Every new primary observation requires a distinct caller-supplied `finding_id`; changed event bytes under an existing ID fail with `FINDING_ID_CONFLICT`. Keep unresolved or ambiguous observations separate. After the caller explicitly confirms equivalence, append the new observation with its own ID and evidence, then append a separate merge event that links it to the canonical `finding_id`. Never rewrite or delete prior rows and never treat a merge record as proof by itself.

## Append

Append through the same CLI only after candidate review:

```sh
bun <skill-dir>/scripts/catalog-cli.ts findings append --store <absolute-store-path> --event-file <absolute-event-json>
```

If append returns `FINDING_STORE_RECOVERY_REQUIRED`, treat the store state as unknown. Stop the caller flow, preserve the file, and request owner recovery before retrying.

## Merge

After candidate review and explicit confirmation of equivalence, append a separate merge event that links the new observation to the canonical `finding_id`. Never rewrite or delete prior rows and never treat a merge record as proof by itself.

## Scope expansion

An out-of-Work-Scope blocker requests owner permission before any scope expansion. Record the decision in the observation as `scope: { "decision": "within" | "beyond", "permission_request": "<text>" }`: `beyond` requires a non-empty permission request and `within` forbids one. The writer rejects a scope expansion recorded without that request; detecting that a finding is out of scope remains the caller's judgment. Recording a finding or merge grants no fix authority. Runtime findings remain with the Agent-owned state owner. After the main work, an optional human loop may present a proposal to fix a third-party problem. Without standing permission, do not perform the fix unless permission is granted (SR-55).

## UNKNOWN handling

When a candidate reason cannot be resolved or the context/provenance match fails deterministically, treat it as `UNKNOWN` and defer resolution to the owner recovery flow before proceeding with append operations.