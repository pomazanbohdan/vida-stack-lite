---
instruction_id: follow-the-high-value-links-out-of-a-seed-page
title: Follow the high-value links out of a seed page
summary: "A seed page is an index: the links to the authoritative pages behind it are followed and the chrome of the site is skipped, and the crawl continues while there is material left."
capability_tags:
  - research-primary-sources
pattern_tags:
  - explore-then-exploit
conditions_applies_when: A crawl starts from a list of seed URLs.
conditions_does_not_apply_when: The material is already in hand.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the seed pages
  - the links that were followed
  - the links that were skipped
artifact_contract_verified_by: "the authoritative links behind every seed were followed, the navigation, footer and marketing links were skipped, and the page budget was not exceeded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Follow the high-value links out of a seed page
From those links, pick the ones that look like they lead to **authoritative documentation** on topics related to the existing concepts.
A seed is usually an index or schema-reference page, so its most valuable outbound links are to **sample-query / cookbook pages, metric-definition pages, and field/enum reference pages** — follow those;
Skip nav links, site footers, login pages, "About us", marketing pages, cookie/privacy notices, and anything obviously tangential.
Their results in turn contain more links, which you can also follow — recursively, with your judgment as the filter.
Do not stop after one page: keep crawling relevant in-domain links until you have covered the material or hit the page budget.
Fetching only the seed page and stopping is **not** done — seeds are indexes; the value is one or two hops out.
You have actually fetched the seed pages and followed their high-value links (sample-query/cookbook, metric, and reference pages) until further in-domain fetches would have genuine diminishing returns.
A **max-pages budget** (a hard cap enforced by the `fetch_url` tool; you cannot exceed it).
If the page is irrelevant, low-signal, or already covered, do nothing.
