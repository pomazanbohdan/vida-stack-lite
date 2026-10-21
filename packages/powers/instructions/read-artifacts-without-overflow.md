---
instruction_id: read-artifacts-without-overflow
title: Read large artifacts without overflowing context
summary: "Measure the file first, take line numbers and counts before content, and narrow any record over 500 characters."
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: An artifact must be read and its size or content may exceed the available context.
conditions_does_not_apply_when: The artifact is known to be short and fits one read.
artifact_contract_output_type: bounded-reading-record
artifact_contract_required_data:
  - artifact size
  - reading bounds
  - extracted fields
  - unread parts
artifact_contract_verified_by: a measured artifact and bounded excerpts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/references/context-safety.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.md
status: active
revision: 2
---

# Read large artifacts without overflowing context
One transcript record can exceed a megabyte or embed a whole history.
Printing one whole record can overflow the context of the session doing the diagnosis.
Every reader of a session file follows these rules for every file, every time.
That includes a controller and a subagent.
Measure before reading.
Get the line and byte counts, and list long lines.
Never `cat` or `grep` for content.
Get line numbers and counts first.
Then take small fields from specific lines.
Use the field-extraction commands established during discovery.
Apply them to the source in front of you.
Narrow anything over 500 characters.
If a command returns more than 500 characters for one record, tighten the field or the slice.
Read-only: never modify, move, or delete a session file.

**Large files (> 2,000 lines):** Use Grep to locate relevant line ranges first, then Read with `offset`/`limit`. Never reload the whole file for a second dimension.
