---
instruction_id: sanitize-an-identifier-before-you-build-a-path-from-it
title: Sanitize an identifier before you build a path from it
summary: "An identifier that came from the outside is reduced to a safe shape before it is used in a path or in a command line, and a name read from disk is cleaned before it is shown or used."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: An identifier or a file name from outside the agent is turned into a path.
conditions_does_not_apply_when: The identifier was written by the agent itself.
artifact_contract_output_type: sanitized-identifier
artifact_contract_required_data:
  - the raw identifier
  - the safe shape it was reduced to
  - the refusal when it cannot be made safe
artifact_contract_verified_by: only the safe shape reaches the path and the file name was cleaned before use
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/thread.md
status: active
revision: 1
---

# Sanitize an identifier before you build a path from it
Strip any characters not matching `[a-z0-9-]`. Reject slugs longer than 60 chars or containing `..` or `/`. If invalid, output "Invalid thread slug." and stop.
Before constructing any file path, sanitize the filename: strip non-printable characters, ANSI escape sequences, and path separators. Never pass raw filenames to shell commands via string interpolation.
