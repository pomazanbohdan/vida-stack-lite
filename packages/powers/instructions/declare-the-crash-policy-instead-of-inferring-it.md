---
instruction_id: declare-the-crash-policy-instead-of-inferring-it
title: Declare the crash policy instead of inferring it
summary: "The fail-open or fail-closed choice of a guard is a named declaration a reviewer can see, and it has no default, so a guard cannot fail open by omission."
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A guard or a hook can terminate in more than one way.
conditions_does_not_apply_when: The guard has exactly one possible termination.
artifact_contract_output_type: declared-crash-policy
artifact_contract_required_data:
  - the named termination vocabulary
  - the declared policy of each guard
  - the reason the guard carries next to the declaration
artifact_contract_verified_by: each guard declares its policy and there is no default that lets a guard fail open
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/hooks-declare-their-crash-policy.md
status: active
revision: 1
---

# Declare the crash policy instead of inferring it
Give every shipped enforcement hook (`hooks/*.js`, `hooks/*.sh`) a named, auditable termination vocabulary instead of a bare `process.exit(N)` scattered per file
make a hook's fail-open/fail-closed choice a declaration a reviewer can see, rather than an inference from which literal integer follows `process.exit(` in its outer `catch`.
which dispatches to `allow`/`deny` per a `HOOK_ON_CRASH` policy the caller must supply
`crash()` has no default policy, so a hook cannot fail open by omission.
Every one of the 19 enforcement hooks under `hooks/*.js` now declares `const ON_CRASH = HOOK_ON_CRASH.ALLOW` (or `DENY`) once, with a hook-specific comment naming why
No hook's effective exit code changed — this is a naming-and-declaration migration, not a behavior change.
now distinguish a genuine negative from "could not run" — on the latter they emit a stderr diagnostic and exit 0 instead of silently allowing every commit
The two streams are now written in independent try/catch blocks: previously a payload that failed to serialize on fd 1 aborted before fd 2 ever wrote, producing a deny with an empty stderr reason.
