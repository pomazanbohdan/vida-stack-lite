---
instruction_id: treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue
title: Treat the version-controlled copy as authoritative when you push to a catalogue
summary: "A catalogue has no merge story, so the version-controlled copy is the authority: push on merge and never pull a tracked corpus back."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
  - working-copy-authority-policy
conditions_applies_when: A corpus is pushed to a catalogue that cannot merge changes back.
conditions_does_not_apply_when: The catalogue can mirror the corpus and merge what comes back.
artifact_contract_output_type: sync-policy
artifact_contract_required_data:
  - the copy that is authoritative
  - the direction of the sync
artifact_contract_verified_by: the version-controlled copy is authoritative and the sync runs in one direction
compatibility_excludes:
  - the-local-record-is-the-working-copy-the-remote-is-pulled-back
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=connectors/gcp-knowledge-catalog.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat the version-controlled copy as authoritative when you push to a catalogue
**Renames orphan catalog state, deletes leave entries behind**, and there is no merge story.
Treat git as authoritative: push on merge, don't pull into a tracked bundle.
