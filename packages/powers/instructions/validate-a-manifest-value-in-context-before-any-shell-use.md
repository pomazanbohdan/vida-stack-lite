---
instruction_id: validate-a-manifest-value-in-context-before-any-shell-use
title: Validate a manifest value in context before any shell use
summary: "A value that came from a manifest is checked in the context, never by pasting it into a shell command to be tested there; a value that fails the check is a malformed manifest and is skipped with a warning."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A value read from a manifest is about to reach a shell or an invocation.
conditions_does_not_apply_when: The value was written by you in this session and is trusted.
artifact_contract_output_type: validated-invocation
artifact_contract_required_data:
  - the pattern the value was checked against
  - the warning recorded for a value that failed
  - the way the value was passed on
artifact_contract_verified_by: the value was checked before any shell use and a value that failed was never run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate a manifest value in context before any shell use
Check the query value you read from `activeHooks` against `^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)*$` yourself, IN-CONTEXT - **never** by pasting it into a shell command to be tested there, because a value carrying a quote, `;`, a `` ` ``, `$(`, or a newline would terminate the assignment and run as its own statement before any shell-side check could execute.
A value that fails is a malformed manifest: record a warning, skip that hook, continue to the next entry. Only a value that has passed is run, with the phase number appended:
Pass `check.predicate` as a **single argv element** for the same reason - never re-quote it into a shell string, where an apostrophe would close the literal.
**Validate `check` before any shell use.**
`check.query` and `check.predicate` come from a capability manifest, which may be third-party
