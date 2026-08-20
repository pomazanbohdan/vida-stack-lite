# Project Sidecar — Unconfigured Template

This sidecar is intentionally neutral and contains no product, tenant,
customer, business, platform or environment data.

## Runtime activation

- Runtime bundle: `agent-runtime/`.
- Capability id: `agent-development-runtime`.
- Derived lifecycle state belongs under `.planning/agent-flow/`.
- Durable work records belong under `.agent/work/<work-id>/`.

## Project source map

No project sources are configured in this repository. Before any product
mutation, replace this section with the consuming project's authoritative
business, system-specification, code, test and operational source locations.

## Validation

Portable runtime validation is defined by `agent-runtime/TESTING.md` and
`agent-runtime/tooling/package.json`. Product validation commands must be
declared by the consuming project's sidecar rather than invented here.

## Safety boundary

Keep this repository free of product source, tenant/customer data, business
records, credentials, raw logs, runtime receipts and generated projections.
An unconfigured sidecar is a deliberate fail-closed state for product work.
