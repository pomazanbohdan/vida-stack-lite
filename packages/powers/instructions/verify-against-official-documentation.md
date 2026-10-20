---
instruction_id: verify-against-official-documentation
title: Verify against the official documentation
summary: "Fetch the one documentation page that covers the feature, follow the source hierarchy, and never cite a secondary write-up as a primary source."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A framework-specific decision is about to be made.
conditions_does_not_apply_when: "The correctness of the work does not depend on a specific version, or the user explicitly asked for speed over verification."
artifact_contract_output_type: source-verification
artifact_contract_required_data:
  - the fetched page
  - the source tier
  - the extracted patterns
  - the deprecation notes
artifact_contract_verified_by: the fetched source is the page for the feature and it sits in the source hierarchy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/source-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ecosystem.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/start/get-answers-about-bmad.md
status: active
revision: 2
---

# Verify against the official documentation

### Step 2: Fetch Official Documentation

Fetch the specific documentation page for the feature you're implementing. Not the homepage, not the full docs — the relevant page.

**Source hierarchy (in order of authority):**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Official documentation | react.dev, docs.djangoproject.com, symfony.com/doc |
| 2 | Official blog / changelog | react.dev/blog, nextjs.org/blog |
| 3 | Web standards references | MDN, web.dev, html.spec.whatwg.org |
| 4 | Browser/runtime compatibility | caniuse.com, node.green |

**Not authoritative — never cite as primary sources:**

- Stack Overflow answers
- Blog posts or tutorials (even popular ones)
- AI-generated documentation or summaries
- Your own training data (that is the whole point — verify it)

**Be precise with what you fetch:**

BAD:  Fetch the React homepage
GOOD: Fetch react.dev/reference/react/useActionState

BAD:  Search "django authentication best practices"
GOOD: Fetch docs.djangoproject.com/en/6.0/topics/auth/

After fetching, extract the key patterns and note any deprecation warnings or migration guidance.

When official sources conflict with each other (e.g. a migration guide contradicts the API reference), surface the discrepancy to the user and verify which pattern actually works against the detected version.

## Red Flags

- Citing Stack Overflow or blog posts instead of official documentation
- Fetching an entire docs site when only one page is relevant

When the user names a marketplace or registry, fetch its current docs then rather than describing it from memory.
Be specific — "What does step 3 of the PRD workflow do?" beats "How does PRD work?"
Verify surprising claims — LLMs occasionally get things wrong. Check the source file.
