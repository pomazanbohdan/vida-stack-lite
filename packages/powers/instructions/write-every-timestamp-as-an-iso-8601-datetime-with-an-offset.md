---
instruction_id: write-every-timestamp-as-an-iso-8601-datetime-with-an-offset
title: Write every timestamp as an ISO 8601 datetime with an offset
summary: "Every timestamp a document carries is an ISO 8601 datetime with an explicit UTC offset, so that two readers compare the same instants."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - output-formatting
conditions_applies_when: A timestamp is written into a document of a knowledge corpus.
conditions_does_not_apply_when: "The value is a plain date without a time, such as the heading of a log entry."
artifact_contract_output_type: timestamp-field
artifact_contract_required_data:
  - the timestamp
  - the UTC offset it carries
artifact_contract_verified_by: every timestamp is an ISO 8601 datetime with an explicit UTC offset
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Write every timestamp as an ISO 8601 datetime with an offset
Every timestamp-valued key is an ISO 8601 datetime with an explicit UTC offset, for example `2026-06-30T14:00:00Z`.
`generated.at`: An ISO 8601 datetime marking the content's last meaningful change.
Consumers use it to tell a recent edit from a stale fact.
`verified`: A list of verification events, each with `by` (an actor) and `at` (an ISO 8601 datetime).
