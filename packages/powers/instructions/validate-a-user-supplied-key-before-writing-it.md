---
instruction_id: validate-a-user-supplied-key-before-writing-it
title: Validate a user-supplied key before writing it
summary: "A key the user supplies is checked against a closed shape before any write, and a namespace that comes from a registry is closed: a key that merely looks right does not make it writable."
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A user-supplied name becomes a key in a configuration namespace.
conditions_does_not_apply_when: The name is chosen from a fixed list the interface offers.
artifact_contract_output_type: key-validation
artifact_contract_required_data:
  - the key
  - the shape it was checked against
  - the rejection
artifact_contract_verified_by: the rejected key was refused before any write and the registry-derived namespace accepted nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 1
---

# Validate a user-supplied key before writing it
slug inputs are checked against `^[a-zA-Z0-9_-]+$` before any write
inputs containing path separators
whitespace, or shell metacharacters are rejected
This closes off skill-injection attacks on that open namespace (dynamic key pattern)
the gate is membership in the closed, registry-derived settable set
slug shape alone never makes a `review.models.*` key writable
