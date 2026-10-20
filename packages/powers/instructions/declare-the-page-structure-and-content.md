---
instruction_id: declare-the-page-structure-and-content
title: Declare the page structure and content
summary: "The page declares its language, its title, its heading order and its table headers, and never presents a blank surface."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: A page or view is built or reviewed.
conditions_does_not_apply_when: "The work does not produce a document with headings, tables or a language."
artifact_contract_output_type: page-structure-review
artifact_contract_required_data:
  - the declared language
  - the heading order
  - the header cells of every table
artifact_contract_verified_by: "the page declares its language, has one top heading with no skipped levels, and every table has scoped header cells"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/accessibility-checklist.md
status: active
revision: 1
---

# Declare the page structure and content
Language declared (`<html lang="en">`)
Page has a descriptive `<title>`
Page has one `<h1>` and headings don't skip levels
Tables have `<th>` headers with scope
Meaningful empty states (not blank screens)
