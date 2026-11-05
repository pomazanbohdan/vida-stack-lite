---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-changelog
title: Write release notes and migration guides
summary: "Use Keep a Changelog with Unreleased on top, newest first, ISO dates, diff-linked headings and the fixed categories; never paste commits, put breaking changes first and make migration guides procedures with verification and rollback."
capability_tags:
  - write-technical-prose
pattern_tags:
  - changelog-structure
conditions_applies_when: "Release notes, changelogs or migration guides."
conditions_does_not_apply_when: An internal commit log.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Entries follow the structure, categories and migration procedure."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L149-L165"
status: active
revision: 1
---

# Write release notes and migration guides

Release notes, changelogs, and migration guides: a changelog is documentation for the reader who is about to upgrade; each entry states what changed, what it means for them, and what to do — in Keep a Changelog structure, in the voice of the rest of the docs. Newest version first, an 'Unreleased' section on top, ISO dates in version headings, version headings linked to diffs. Group entries under Added / Changed / Deprecated / Removed / Fixed / Security; never paste commit messages. Breaking changes go first in the version with a link to migration steps (convention). A deprecation entry names the replacement and the removal version or date. A migration guide is a procedure: 'Before you begin' (versions, backups), numbered steps with before/after snippets, 'Verify the migration', rollback. Apply the Google layer to every entry: second person for actions, no 'currently/new', code font for flags and APIs, one tense used consistently.
