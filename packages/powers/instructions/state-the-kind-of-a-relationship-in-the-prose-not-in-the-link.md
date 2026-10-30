---
instruction_id: state-the-kind-of-a-relationship-in-the-prose-not-in-the-link
title: "State the kind of a relationship in the prose, not in the link"
summary: "A link says that two documents are related; which relation it is comes from the prose around the link, not from the link itself."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - cross-reference-linking
conditions_applies_when: A link between two documents is written.
conditions_does_not_apply_when: The relation is already carried by the place of the document in the hierarchy.
artifact_contract_output_type: described-relationship
artifact_contract_required_data:
  - the link
  - the prose that names the kind of relation
artifact_contract_verified_by: the kind of relation is stated in the prose and not encoded in the link
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# State the kind of a relationship in the prose, not in the link
A link from concept A to concept B asserts a *relationship*.
The specific kind (parent/child, references, joins-with, depends-on) is conveyed by the surrounding prose, not by the link itself.
Consumers that build a graph view typically treat all links as directed edges of an untyped relationship.
