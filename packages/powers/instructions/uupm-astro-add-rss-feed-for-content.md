---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-astro-add-rss-feed-for-content
title: "Add RSS feed for content"
summary: "RSS for blogs and content sites"
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-structure
conditions_applies_when: "SEO guidance for astro 7.1.6."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6; locator=stacks/astro.csv#L35"
status: active
revision: 1
---

# Add RSS feed for content

RSS for blogs and content sites

**Do:** @astrojs/rss for feed generation

**Don't:** No RSS feed

**Applies To:** astro 7.1.6

**Severity:** Low

**Good example:**

```text
rss() helper in pages/rss.xml.js
```

**Bad example:**

```text
No feed for blog
```
