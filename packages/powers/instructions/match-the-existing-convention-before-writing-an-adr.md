---
instruction_id: match-the-existing-convention-before-writing-an-adr
title: Match the existing convention before writing a record
summary: "Find the project's established convention for the record and follow it; fall back to a default only when no convention exists."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A decision record is about to be written into a project.
conditions_does_not_apply_when: The convention was already established in this session.
artifact_contract_output_type: convention-match
artifact_contract_required_data:
  - the convention that was found
  - "the location, format, numbering and headings it fixes"
  - any conflict that was surfaced
artifact_contract_verified_by: the new record follows the convention that the project already uses
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Match the existing convention before writing a record

Before creating an ADR, inspect the available repository context for an established convention — existing ADRs, project instructions, and ADR-related configuration or tooling. An established convention overrides the defaults below. Match:

- **Location and format** — e.g. `docs/adr/*.md`, `Documentation/Decisions/*.rst`, a MADR layout, or an `adr-tools` setup. Match the existing directory, file extension, and markup (Markdown vs reStructuredText).
- **Numbering and naming** — continue the existing sequence and filename pattern (`ADR-004-Title.rst`, `0004-title.md`, …); don't restart at 001 or introduce a second scheme.
- **Section headings** — reuse the project's heading set rather than imposing this template's.

If the available evidence conflicts, surface the conflict rather than silently introducing another scheme. Only when no convention can be established do you apply the default below.
