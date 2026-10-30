---
instruction_id: never-drop-an-unknown-reviewer-silently
title: Never drop an unknown reviewer silently
summary: "A reviewer entry that is neither a configured instance nor a known built-in is a hard error that is reported, never silently dropped."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review resolves the list of reviewers it will run.
conditions_does_not_apply_when: Every entry resolves to a configured instance or a known built-in.
artifact_contract_output_type: reviewer-resolution
artifact_contract_required_data:
  - the entry that did not resolve
  - the error that was raised
artifact_contract_verified_by: the unresolved entry was reported instead of dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/reviewer-instances.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never drop an unknown reviewer silently
An entry that is NEITHER a defined instance NOR a built-in slug is a **hard error** (likely a typo'd instance name) - stop and report it. Do NOT silently drop it.
Instances participate ONLY via
the default reviewers. They never appear under `--all` or explicit `--<cli>` flags, and there are no per-instance CLI flags.
An instance is **available** iff its base `cli` is detected
`model`/`agent`/instance-name are opaque: pass them as separate argv elements. They are NEVER interpolated into shell strings.
