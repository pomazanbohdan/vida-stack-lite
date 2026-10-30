---
instruction_id: write-the-change-log-newest-first-under-date-headings
title: Write the change log newest first under date headings
summary: "The log of a directory is a flat list of date-grouped entries, newest first, under ISO date headings."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: The history of the changes to a directory is recorded.
conditions_does_not_apply_when: The history is kept in the version control system alone.
artifact_contract_output_type: change-log
artifact_contract_required_data:
  - the date headings
  - the entries under each heading
  - the order of the headings
artifact_contract_verified_by: the headings are ISO dates and the newest entry comes first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write the change log newest first under date headings
A `log.md` file MAY appear at any level of the hierarchy to record the history of changes to that scope.
Date headings MUST use ISO 8601 `YYYY-MM-DD` form.
Log entries are prose; the leading bold word (`**Update**`, `**Creation**`, `**Deprecation**`) is a convention, not a requirement.
The format is a flat list of date-grouped entries, newest first:
