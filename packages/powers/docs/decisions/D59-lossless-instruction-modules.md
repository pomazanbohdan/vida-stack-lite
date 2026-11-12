---
type: Decision
title: 'D59 — Lossless instruction modules'
description: 'Package complete atom payloads in owner-approved carriers without merging norms, while the map and fidelity receipts stay atom-level.'
status: stable
tags:
- vida-powers
- h2
- instruction-catalog
- lossless-modules
- decision
sources:
- id: d16
  resource: /decisions/D16-faceted-instruction-browse.md
  title: D16 — Instruction form and domain facets
- id: d56
  resource: /decisions/D56-h2-contract.md
  title: D56 — H2 contract approval
- id: d58
  resource: /decisions/D58-source-bound-variant-families.md
  title: D58 — Source-bound variant families
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — acceptance criteria
generated: { by: 'opencode-go/deepseek-v4.1-flash', at: '2026-11-08T23:00:00Z' }
revision: '1'
---

# D59 — Lossless instruction modules

Date: 2026-11-08  
Status: accepted by the repository owner.

## Context

The non-CSV corpus contains many map-primary source groups with 2–8 complete
atoms. Keeping every atom as a separate catalog entry inflates the catalog and
retrieval list while adding no semantic value: the atoms remain distinct norms
and must not be merged. D58 solves the same packaging pressure for CSV
source-bound variants; its family markers, variant IDs and whole-cell receipts
belong to the CSV layer and do not describe non-CSV atoms.

D16 owns stable canonical IDs and permits an owner-approved carrier migration
that preserves every legacy ID. D59 uses that boundary for a different carrier
form: a lossless module holds the complete original atom files, not a new
synthesized instruction.

## Decision

Adopt **lossless instruction modules** as a catalog packaging layer:

- A **module** is one catalog entry whose `instruction_id` equals the module ID
  and the file basename. It contains 2–8 complete atom payloads from one
  map-primary source group. A one-atom remainder stays an ordinary singleton
  atom file; atoms shared by several source groups are assigned once.
- Modules are **not** a semantic merge. Every atom keeps its stable ID, body,
  metadata, provenance, fidelity evidence and exact-lookup behavior.
- The **map stays atom-level**. No `moduleId` is added to map bindings.
  Fidelity receipts remain CSV-only and are never rewritten by module
  migration.
- A module is a **carrier, not a compose unit**. `get(module)` fails with
  `CATALOG_MODULE_ATOM_REQUIRED`; compose expands matched active atoms and
  applies dependencies, applicability, exclusions and profile policy to atom
  IDs. Expanded atoms count toward the existing 20-instruction and 64,000-byte
  limits.
- A module is **not updated in place**. A changed atom requires a new
  owner-approved prepared migration; the carrier is replaced with a new
  revision and the same atom IDs. Donor-update tracking remains atom-level.

## Carrier format

`VPInstructionModule/v1` is described by
`config/vpinstructionmodule.v1.schema.json`. The flat frontmatter carries the
module ID, title, summary, source `{donor,path}`, ordered `atom_ids`,
`atom_count`, the compact `atoms` record list, `carrier_sha256`,
`carrier_bytes`, `revision` and `status`.

The LF-only body contains exactly one section per declared atom, in declared
order, with no text outside the sections:

```text
<!-- vpmodule:atom:begin <atom-id> -->
<exact original atom file, including frontmatter and body>
<!-- vpmodule:atom:end <atom-id> -->
```

`file_sha256`, `content_sha256`, `file_bytes` and `body_bytes` bind the exact
payload and parsed body. `carrier_sha256` and `carrier_bytes` bind the module
body. Module IDs use the source donor/path slug, a SHA-256-derived eight-hex
suffix and a deterministic `cNN` ordinal; the schema rejects collisions,
out-of-range counts, invalid IDs, malformed markers and hash mismatches.

## Catalog, map and receipts

The catalog contains module carriers and singleton atom IDs. The corpus checker
distinguishes:

- **catalog carriers** — module entries plus singleton and CSV entries;
- **atomic records** — module members, singleton atoms and CSV atoms.

Map coverage, tags, compatibility, profile references and fidelity checks stay
atom-scoped. A module ID is not a map binding and is not a new source unit.

## Migration

Module migration uses the existing prepared-batch writer and ownership rules:

- an owner-approved source-group selection and ordered module queue;
- bound before-images, exact atom payloads and a catalog-last target order;
- compare-and-swap preflight, retained recovery evidence and reconciliation of
  partial or unknown effects;
- a separately reviewed reverse batch for rollback, newest module first;
- a strict verify against the batch's terminal catalog state after apply;
  `--historical` may re-check an older batch without weakening the strict
  latest-state gate;
- no automatic grouping by title, slug or embedding similarity, and no
  in-place carrier edit outside the writer.

## Evidence

The owner authorized the 3-atom GSD and 8-atom Addy pilots and then 20 scale
batches. The applied campaign produced 682 module carriers holding 2,946 atoms;
332 non-CSV singletons and all 468 CSV entries remain top-level. The catalog
moved 3,746 → **1,482** entries (−2,264, −60.4%) with catalog revision 8,034.
The map revision 5,752 (3,429 records) and 468 fidelity receipt hashes are
unchanged. An integrity check observed all 3,278 map atoms and 468 CSV atoms
exactly once, with zero missing, unexpected or duplicate IDs. The package
suite is 980 pass / 5 skip / 0 fail with 100% functions and lines; the batch,
corpus, vector and OKF checks pass. The prepared update path for a changed
packaged atom is implemented with planned/verified/rollback coverage and
AC-91. AC-86–AC-91 carry the component evidence. This is bounded Source
acceptance, not installation or Runtime acceptance.

## Consequences

- Search lists a module once; callers select atom IDs for exact work.
- Retrieval and compose stay atom-scoped, so declared conflicts and
  dependencies keep their existing behavior.
- Carrier files are larger and require the module parser; the catalog and
  atomic counts must be reported separately.
- A donor update that changes a packaged atom needs a new prepared carrier
  migration rather than a direct atom-file replacement.
- No new runtime, service, dependency, second catalog or semantic merge is
  introduced.

## Related decisions

D16 is amended to permit lossless module carriers. D58 remains the CSV
variant-family contract and is not changed. D56/D57 continue to own the H2
contract and delegated review; D17 continues to own source attribution; D12
continues to own declared conflicts.

## D16 amendment

See [D16 — lossless module amendment](D16-faceted-instruction-browse.md#lossless-module-amendment-d59).
