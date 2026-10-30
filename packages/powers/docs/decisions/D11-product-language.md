---
type: Decision
title: 'D11 — Product language: documentation in English, instructions from the donor originals'
description: 'All product documentation is maintained in English; corpus instructions are not translated but taken from the original donor texts; tags, schemas, error codes and terms — in English.'
status: stable
stale_after: '2027-10-20T00:00:00Z'
tags:
- vida-powers
- language
- corpus
- documentation
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — delivery status and target status
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T21:00:00Z' }
verified: { by: human:repository-owner, at: '2026-10-20T21:00:00Z' }
revision: '2'
---

# Decision

## 1. Documentation — in English

All product documentation (`packages/powers/docs/**`, `packages/powers/AGENTS.md`,
`packages/powers/README.md`) is maintained **in English**: the catalog design,
the system specification, the acceptance criteria, the business requirements, the traceability matrix,
the step plans, the decision records and the bundle log.

**Why:** documentation is text for people and for the tools that agent readers use;
a single-language product is cheaper to read and maintain, and changes in
it are clearer for external readers.

## 2. Instructions — from the donor originals, without translation

The body of a corpus instruction is the **normative text of the donor in the original language**
(all our donors are English-language). An instruction is **not translated** and not rewritten
"in our own words": it carries the donor's wording reduced to an atomic norm.

**Why:** a translation is already a second authorial edition, in which the risk of
invented rules and lost constraints appears. The original text remains verifiable
against the source, and the validator compares the norm with the original, not with a retelling.

**Permitted edits** (and only these): cutting parts that are not relevant to the norm;
merging duplicated sentences; replacing donor names with neutral ones; moving
the binding to the norm (conditions, completion criterion); adding an explicit step "what
is considered done" if the donor lacks it.

**Forbidden:** translation, inventing rules, weakening strictness, adding
requirements that the donor does not have.

## 3. Terms, tags and mechanisms — in English

Tag names, vocabulary descriptions, field and schema names, error codes,
`rationale` texts, tool messages and `SKILL.md` — **in English**; these are
machine and technical strings that live next to the donor originals.

## 4. Consequences for the corpus

Instructions that were written in Ukrainian are **rewritten from the donor
originals** (all three donors are processed again per the rule of §2). The source of
the norm, `provenance`, the tag vocabulary and the processing map are checked against the new texts;
the structure (segmentation, merging, map statuses) is preserved.

## 5. Consequences for the process

The rule "an instruction is the normative text of the donor" becomes part of the criteria for processing
donors (the step D plan) and is verified by review: the reviewer compares the instruction with the
original and records any divergence (a rule added, strictness changed,
a constraint lost).

---

# Rejected options

| Option | Why rejected |
|---|---|
| Ukrainian as the language of documentation and instructions | Owner decision (D11): documentation in English |
| Translating the instructions into English | Translation = a second edition; the original is more verifiable (§2) |
| Free retelling of the norm "in our own words" | The risk of invented rules — exactly what the review has already found (§2) |
