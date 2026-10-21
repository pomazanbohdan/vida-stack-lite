---
instruction_id: synthesize-the-tag-view-at-consumption-time
title: Synthesize the tag view at consumption time
summary: "Tags stay in the frontmatter of each document; a consumer that wants a tag-browsing view builds it while reading, not from a separate tag file."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A consumer wants to browse a corpus by tag.
conditions_does_not_apply_when: The corpus carries no tags.
artifact_contract_output_type: tag-view
artifact_contract_required_data:
  - the tags of each document
  - the view built from them
artifact_contract_verified_by: the view was synthesized from the frontmatter and no separate tag file is kept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Synthesize the tag view at consumption time
The format does not specify a separate file format for aggregating documents by tag; a consumer that wants a tag-browsing view can synthesize one at consumption time by scanning frontmatter.
