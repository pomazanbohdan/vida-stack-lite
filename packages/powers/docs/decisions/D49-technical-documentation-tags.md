---
type: Decision
title: 'D49 - Technical-documentation tags for the H2 technical-documentation batch'
description: 'Eight pattern tags with catalog definitions let document-type fit, voice, words, structure, procedures, reference completeness, changelogs and the audit protocol carry accurate metadata.'
status: stable
stale_after: '2027-11-05T00:00:00Z'
tags:
- vida-powers
- engineering
- pattern-tags
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
---

# D49 — Technical-documentation tags for the H2 technical-documentation batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `technical-documentation`. The source
adapts Google's Developer Documentation Style Guide and Technical Writing
courses: reader and document-type fit, voice, word choice, structure,
procedures and code, reference completeness, changelogs, and a severity-ordered
audit protocol. The existing `write-technical-prose` capability covers the
capability; the document-specific patterns are new.

## Decision

Add eight pattern tags with explicit definitions to `catalog.tag_dictionary`:

| Pattern | Definition |
|---|---|
| `document-type-fit` | An approach in which a page serves one reader and one document type. |
| `document-voice` | An approach in which the reader is addressed directly in active, present, timeless prose. |
| `document-words` | An approach in which the condition precedes the instruction and plain words replace jargon. |
| `document-structure` | An approach in which headings, lists, tables and notices form the reader's map. |
| `procedure-steps` | An approach in which a procedure is a numbered list of single imperative actions with runnable samples. |
| `reference-completeness` | An approach in which every public element is documented in a consistent formula. |
| `changelog-structure` | An approach in which release notes state what changed, what it means and what to do. |
| `documentation-audit` | An approach in which facts are verified before style is judged and findings are reported in severity order. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`technical-documentation` uses the existing `write-technical-prose` capability
with these patterns. The score, common-mistakes and quick-diagnostic
instructions carry pattern tags only, with capability exemptions. This is H2
source admission; structured applicability under the H2 v2 contract remains
pending.

## Consequences

`catalog.json` revision advances by the eight tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
