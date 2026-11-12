---
type: Decision
title: 'D58 — Source-bound variant families'
description: 'One family catalog entry co-locates complete, source-bound variants without merging non-identical norms.'
status: stable
tags:
- vida-powers
- h2
- instruction-catalog
- source-bound-variants
- decision
sources:
- id: d16
  resource: /decisions/D16-faceted-instruction-browse.md
  title: D16 — Instruction form and domain facets
- id: d56
  resource: /decisions/D56-h2-contract.md
  title: D56 — H2 contract approval
- id: d57
  resource: /decisions/D57-d18-h2-csv-admission.md
  title: D57 — D18 delegated review for H2 CSV admission
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — acceptance criteria
generated: { by: 'opencode-go/gpt-6-luna', at: '2026-11-06T21:50:27Z' }
revision: '1'
---

# D58 — Source-bound variant families

Date: 2026-11-06  
Status: accepted.

The owner direction of 2026-11-06 authorizes phases P0–P4. A P5 corpus apply
requires explicit owner approval after its prepared plan and independent review;
P6 scale-up is outside this authorization and requires its own scope approval.
This decision authorizes the model and reversible preparation, not source
admission or corpus mutation.

## Context

H2 CSV rows can carry the same general purpose while differing in applicability,
metadata, or normative cells. Treating similar rows as one rewritten rule would
lose source-specific meaning and weaken the whole-cell fidelity contract. Keeping
every row as a separate search result, however, makes a related set appear as
unrelated catalog entries. The family is therefore a retrieval envelope, not a
newly synthesized norm.

D16 establishes stable canonical instruction identity, facets, generated browse,
and a separately verified rollout. Its file-per-ID wording needs a narrow
amendment for an owner-approved family carrier; see the [D16 amendment](D16-faceted-instruction-browse.md#sbvf-amendment-d58).
D56 continues to own the v2 applicability and CSV row/cell contract, and D57
continues to own the delegated-review extension for H2 CSV admission. D58 adds a
family representation without rewriting those decisions.

## Decision

Adopt **Source-Bound Variant Families (SBVF)**:

- A **family** is one catalog and search entry. A **variant** is one complete
  source row, retaining its own body, normative cells, metadata, applicability,
  provenance, and fidelity evidence.
- Family IDs use the reserved `family-` prefix and are collision-checked.
  Family IDs and variant IDs are disjoint; every family has at least two unique
  variants; a variant belongs to exactly one family.
- Existing instruction IDs remain stable variant IDs and exact-lookup aliases.
  A family ID is new; it does not replace or consume a legacy variant ID.
- Non-identical normative cells are co-located, never semantically merged.
  Family bindings remain whole-cell. The separate D56 amendment allows a SPLIT
  row to bind exact code-point subspans as independent singleton instructions;
  held rows remain deferred until the owner resolves applicability.

## Data model

### `VPInstruction/v3`

`VPInstruction/v3` retains all `VPInstruction/v2` fields at the family level and adds required
`instruction_variants`, encoded as the existing one-line, double-quoted compact
JSON scalar. It contains at least two variants. Top-level `applicability` is
forbidden: applicability belongs to each variant.

Each variant retains complete metadata: `title`, `summary`, capability and
pattern tags, conditions, artifact contract, compatibility requirements and
exclusions, roles, products, provenance, status, revision, and classification
fields. It also carries:

- `variant_id`, which is the unchanged legacy instruction ID;
- `source: { donor, path, rowKey, rawSha256 }` for its exact source row;
- the original `sourceLabel` and its own decoded D56-shaped `applicability`
  object, including `frameworks[].versionRange` (`raw` plus `comparators`) where
  present (SR-82); and
- `contentSha256`, the SHA-256 of that variant's exact body payload.

The family body contains exactly one section per variant, in the declared array
order, and no text outside those sections:

```text
<!-- sbvf:variant:begin <variant-id> -->
<variant body>
<!-- sbvf:variant:end <variant-id> -->
```

The payload starts immediately after the begin-marker line feed and ends at the
start of the end-marker line. The family body is LF-only. Hash the payload's
exact UTF-8 bytes without trimming, newline conversion, or normalization.
Missing, duplicate, unknown, out-of-order, or colliding IDs; malformed marker
sets; top-level applicability; non-LF content; text outside sections; and hash
mismatches fail closed.

### Family-level projections

Family `title` and `summary` are explicit owner-reviewed display values, never
automatic semantic merges. Family capability/pattern tags and roles/products are
validated sorted unions; conditions are display/search text only. The family
artifact contract is neutral (`output_type: none`, empty `required_data`, and an
explanatory `verified_by`); family compatibility lists are empty. Provenance is an
ordered union. Each variant retains its complete original metadata; after family
expansion, variant conditions, artifact contract, compatibility, classification,
and applicability remain authoritative for that variant. Family-level
classification, status, and revision describe the carrier, not a replacement for
variant metadata.

### `VPCorpusMap/v3`

`VPCorpusMap/v3` retains v2 row and cell hashes, locators, dispositions, and
`mergedInto` behavior. Every binding adds required `variantId`; its
`instructionId` is the family ID. For a non-family instruction the binding keeps
`instructionId` and `variantId` equal to the legacy instruction ID and is treated
as a singleton; only a family member uses the family ID in `instructionId` and
the legacy ID in `variantId`. Each admitted family binding maps to exactly one
variant and each family variant is covered by exactly one admitted binding.
Variant IDs are unique globally and cannot be bound twice. Family bindings are
whole-cell only. A SPLIT row outside a family may use the exact code-point
subspan binding defined by the D56 amendment.

### `H2FidelityReceipt/v2` and `VPCatalog/v1`

`H2FidelityReceipt/v2` adds required `variantId` and `variantBodySha256`.
`instructionId` remains the variant ID, preserving D56/D57 receipt identity and
whole-cell review. The body hash must match the variant's `contentSha256`. An
existing v1 receipt remains valid for its exact variant when its instruction ID
and whole-cell binding match; existing v1 receipts are never rewritten. V2 is
for new admissions only, and D57's reviewer and evidence rules remain in force.

`VPCatalog/v1` is unchanged: it has one entry per family file, uses the family ID
as `instruction_id`, and hashes the whole file, including every variant. The
loader derives exact variant aliases from that file; there is no second catalog.

## Curation/admission

Grouping requires an owner-approved `config/sbvf-families.json` manifest naming
exact family and variant IDs, a rationale, approval actor/time, and the census
SHA. There is no automatic grouping by title, slug, text similarity, or
embedding. Structural checks can verify admitted rows, ready receipts, compatible
metadata, distinct row keys, and one-to-one binding; only the owner decides
whether the grouped source rows are appropriate members of one family.

`KEEP_ATOMIC` describes the source norm, not the number of files or catalog
entries. D56 `merged` remains reserved for identical normative cells in the same
CSV; it is not used for near-duplicates. SPLIT, held, deferred, and rejected rows
are not family members. A SPLIT row may become separate singleton instructions
under the D56 subspan amendment; D58 itself does not authorize source admission.

## Retrieval/compose

Search and browse return a family once, match against variant metadata, and may
annotate its variants and applicability; ranking counts the family once. An
exact variant ID selects only that variant. Selecting a family for automatic
`get` requires structured applicability context and succeeds only when exactly
one variant is applicable. Missing, conflicting, zero-match, multi-match, or
unresolved context fails closed; no default variant is chosen.

`compose` expands a selected family to all and only applicable variants. A
required family with no applicable variant or any unresolved variant fails
atomically. Dependency, profile, and exclusion closure runs on variant IDs.
Each expanded variant counts as one instruction toward the 20-instruction limit
and contributes its exact body bytes toward the 64,000 UTF-8-byte limit in
SR-58; the family carrier does not count as one instruction. No partial bundle is
returned on selection, closure, compatibility, or limit failure.

## Migration

Migration uses the existing prepared-batch writer in `scripts/convert.ts`, not a
second writer. A deterministic prepared plan binds the owner manifest, all target
before-images, intended family files, map and receipt updates, and member-file
deletions. It stages outputs, performs compare-and-swap (CAS) before writes,
retains before-images, and writes the catalog last as the commit point. Old
member files are deleted only in that reviewed batch.

After any partial or unknown effect, retries stay fenced until reconciliation
observes all-old, all-intended, mixed, or conflicting state. Recovery uses a
separately reviewed reverse prepared batch and verifies restored bytes against
the before-images; rollback is compensating work, not an automatic reset.
Existing v1 receipts are not targets for regeneration. P0–P4 preparation is
authorized; applying a P5 corpus batch requires explicit owner approval. P6
scale-up is not authorized by this decision's P0–P4 direction.

## Count semantics

Counts distinguish catalog families from atomic source-row variants. Co-location
does not reduce the number of norms.

| 2026-11-06 baseline | Count |
|---|---:|
| Corpus instructions | 3,746 |
| Admitted UUPM instructions | 468 |
| Remaining stack rows not yet admitted | 943: 850 provisional KEEP_ATOMIC + 93 REVIEW, with 8 SPLIT inside the 943 |
| Existing deferred rollup | 957: 13 UX + 9 SPLIT stack + 935 KEEP_ATOMIC |
| Rejected duplicate rows | 9 |
| Naive all-KEEP_ATOMIC ceiling | 4,681 |

The census must reconcile the raw 943-row classification with the existing
935/9/13 rollup before migration; the H2-A2 figures are not silently rewritten.
The 9th SPLIT row in that rollup is from an earlier `react.csv` batch. The
4,450–4,550 family-count planning range is contingent on owner-reviewed semantic
census, not a promise. Report family count and atomic-variant count separately.

## Alternatives rejected

- **Policy-only carrier:** rejected because a family label or sidecar mapping
  cannot replace a complete source-bound variant body, metadata, and exact-ID
  retrieval in the one catalog.
- **Receipt regeneration:** rejected because rewriting v1 receipts would alter
  existing D56/D57 evidence. V1 remains valid and unchanged for variants; v2 is
  reserved for new admissions.
- **Automatic merge/grouping:** rejected because title, slug, or semantic
  similarity cannot prove normative equivalence. Families co-locate; they do not
  synthesize or merge rules.

## Consequences/boundaries

D16 is amended only to permit the D58 owner-approved, reversible family
migration while retaining each legacy ID as an exact-lookup variant. D56 remains
the H2 v2/applicability and whole-cell CSV contract; D57 remains the H2 delegated
review decision. SR-58, SR-82, SR-90 and SR-92 continue to govern their existing
limits, applicability, prepared publication and facets, as extended by the new
requirements in [SR-102–SR-105](../system-specification.md#17-source-bound-variant-families-d58).

This P0 documentation change makes no code or schema change, admits no source,
does not apply a family migration, and establishes neither H2 acceptance nor
Runtime acceptance. P5 corpus apply needs explicit owner approval; subsequent
scale-up remains outside the authorized P0–P4 work.

## Owner decisions adopted

1. Use reserved, collision-checked `family-<slug>` IDs; keep every existing
   instruction ID as a unique exact-lookup variant ID.
2. Treat one family as one search/catalog entry and one variant as one complete
   source row; never semantically merge non-identical normative cells.
3. Preserve full per-variant metadata and D56 applicability; keep family
   bindings whole-cell, allow exact subspan binding for SPLIT singletons under
   D56, and leave held rows deferred.
4. Keep existing H2FidelityReceipt/v1 files byte-for-byte; use v2 only for new
   admissions while preserving D57 review authority.
5. Require structured context for family auto-selection, fail closed when
   unresolved, and apply the 20/64,000 limits and dependency/profile/exclusion
   closure per variant.
6. Require the owner-approved family manifest and prepared CAS migration with
   before-images, reconciliation, reviewed reverse rollback, and catalog-last
   publication.
7. Report family and atomic-variant counts separately; co-location is not a norm
   reduction, and 4,450–4,550 is a planning range only.
8. Implement P0–P4 under the 2026-11-06 owner direction; do not apply the P5
   corpus pilot without explicit owner approval.
