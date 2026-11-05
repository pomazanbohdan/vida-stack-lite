---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-structure
title: "Structure headings, lists, tables and notices"
summary: "Use sentence-case headings, imperative task headings and noun-phrase concept headings; introduce lists and tables, avoid empty or merged cells, use one notice per section, name link targets and never hide information in an image alone."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-structure
conditions_applies_when: Fixing page structure.
conditions_does_not_apply_when: A document with no headings or lists.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Headings, lists, tables, notices, links and alt text follow the rules."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L88-L111"
status: active
revision: 1
---

# Structure headings, lists, tables and notices

Structure is the reader's map: headings use sentence case and read as a table of contents; task headings are bare imperatives ('Create an instance'), concept headings are noun phrases ('Instance lifecycle'), and '-ing' headings are forbidden. Lists need an introductory sentence ending in a colon, every item in the same grammatical form, and numbering only when order matters; description lists (term -> definition) are preferred over two-column tables for paired data. Tables require a header row and an intro sentence, with no merged or empty cells because screen readers depend on them. Notices: Note = useful but optional; Caution = proceed carefully; Warning = harm or irreversible loss; do not stack them and one per section is a practical ceiling (marked inferred in source). Cross-references say 'see', never 'above' or 'below'. Link text names the target ('see Configure a custom domain'), never 'click here'. Alt text states the image's purpose; information must never live only in a picture.
