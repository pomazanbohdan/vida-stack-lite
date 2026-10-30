---
instruction_id: mint-a-reference-only-when-it-passes-the-gates
title: Mint a reference only when it passes the gates
summary: "A new reference document is created only when it is referenceable by name, is not an overview page, can be cited from a primary document and is worth citing more than once; when in doubt it is not created."
capability_tags:
  - curate-context
pattern_tags:
  - specification-gate
conditions_applies_when: A new reference document is about to be created for a fetched page.
conditions_does_not_apply_when: The page describes a concept that is being enriched.
artifact_contract_output_type: reference-document
artifact_contract_required_data:
  - the result of each of the four gates
  - the id the reference was given
artifact_contract_verified_by: "all four gates hold for the created reference, and a page that fails a gate was not turned into one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mint a reference only when it passes the gates
**Mint a new reference concept** — only if the page meets all four of:
**Topic shape**: it defines something *referenceable by name* from a primary concept doc.
Allowed kinds: a business entity definition, a metric definition, an enum or status-code reference, a field/parameter glossary, a pricing/billing note, a units/timezone/identifier convention.
**Not bundle-level meta**: it is NOT an overview, introduction, "getting started", quickstart, tutorial, walkthrough, release notes, changelog, roadmap, FAQ, or product landing page.
If the page title or URL slug contains any of `overview`, `intro`, `getting-started`, `quickstart`, `tutorial`, `walkthrough`, `release-notes`, `changelog`, `roadmap`, `faq` — skip.
**Citation test**: you can plausibly write a sentence in a primary concept doc of the form `See the [X reference](/references/x.md) for ...` where X is a concrete noun (an entity, a metric, an enum, a field set).
If the best sentence you can write is "See the overview for context", it fails this test.
**Reuse test**: at least two existing concepts would benefit from citing it, OR one existing concept needs it as load-bearing background that doesn’t fit in its own doc.
When in doubt, **skip**. A bundle with zero `references/` docs is fine; a bundle full of `references/overview` and `references/getting_started` is noise.
The four gates still apply to *all other* `references/` mints.
