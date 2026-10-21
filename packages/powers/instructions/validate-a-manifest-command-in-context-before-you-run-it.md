---
instruction_id: validate-a-manifest-command-in-context-before-you-run-it
title: Validate a manifest command in context before you run it
summary: "A command string taken from a manifest is checked against the allowed pattern in context, never by pasting it into a shell to be tested there."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A command or predicate value comes from a manifest that may be third-party.
conditions_does_not_apply_when: The value was written by you and is already known.
artifact_contract_output_type: validated-invocation
artifact_contract_required_data:
  - the value that was checked
  - the pattern it was checked against
  - the disposition when it failed
artifact_contract_verified_by: the value was checked in context and a value that failed was not run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 1
---

# Validate a manifest command in context before you run it
Validate it IN-CONTEXT first, before any shell use. It comes from a capability manifest, which may be third-party
Never by pasting it into a shell command to be tested there, because a value carrying a quote, `;`, a ` ` `, `$(`, or a newline would terminate the assignment and run as its own statement before any shell-side check could execute
A value that fails is a malformed manifest: record a warning, route it per the gate's `onError`, and do not run it
Pass `check.predicate` as a single argv element for the same reason — never re-quote it into a shell string, where an apostrophe would close the literal
