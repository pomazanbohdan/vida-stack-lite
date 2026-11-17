---
type: Implementation Plan
title: 'Vida Powers — next actions within packages/powers'
description: 'The single owner of delivery status, order and gates: the A-G sequence, the E5a/E5b host target status, the remaining forward stages, deferred product questions and the separately accepted Step H content extension.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- implementation-plan
- next-actions
- scoped-plan
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: d9
  resource: /decisions/D9-scoped-to-powers.md
  title: 'D9 — Work scope: only packages/powers'
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: agent-package-conventions
  resource: /../../agent/package.json
  title: Vida Agent package — Bun package conventions
generated: { by: codex/gpt-6.1-sol, at: '2026-11-02T11:40:29Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '50'
---

# Goal and boundaries

## Current project-document rollout

Owner instruction dated 2026-11-02 authorizes BR-25 / SR-98 / AC-74–AC-78.
The B/S/AC update is recorded before implementation. The active packet creates
the Powers-owned role bootstrap, adapts document procedures, and lets Root
wire the project sidecar/profile. Native installer/manifests, harness activation
and Agent runtime/template/config changes are not part of this packet.
Bootstrap source, project-owned sidecar/profile and bounded local usage are
implemented. The packet closed with 765 pass, 4 skip, 0 fail, with typecheck
and OKF passing; focused bootstrap/contract evidence is 19 pass. The current
package gate is recorded in "Key decisions of the queue".
The 8-ID applied map passes its receipt. Independent Luna source review ACCEPT:
0 Critical / 0 Important / 1 Minor, with the ledger Minor corrected by Root.
AC-74–AC-78 carry bounded component/project/contract evidence. This packet's
implementation and adoption are complete; host delivery and runtime work remain
separate. Actual forced compaction was not tested.
Pinned Knip remains exit 1 despite `issues: []`: the config hint targets the
Agent `knip.config.ts` self-entry. Removing that entry fixes the pinned gate but
breaks the pre-commit hook's unused-file check, so the entry is retained. This is
an external Agent/config conflict; no Powers gate was weakened and the gate is
not claimed PASS.

The Powers writer stays within `packages/powers/` (D9). The current owner
instruction separately authorizes Root to adopt the documents through
`AGENT.sidecar.md` and `vida-project-profile.json`. Root AGENTS, runtime
templates/configuration and native host delivery are outside this packet.

## Open task list (refreshed 2026-11-10)

A0, A-D, F and the H0 baseline are closed for their bound inputs. H0
documentation acceptance and `.69` native fixture parity remain open or
unreconciled. H1 AC-59 is accepted, but AC-47–AC-58 remain open as
source-admission and packet-sign-off criteria; this is not a code gap. E source
and skills are implemented, but E5a/E5b host qualification remains open. F is
closed as Standalone component-only, AC-22 remains partial/deferred, and donor
update tracking is closed. D59 lossless modules are accepted and the
3,746 → 1,482 campaign is applied; the module update path is READY. The
remaining Powers-owned work is:

1. **H2-A2 — CSV semantic admission (COMPLETE).** All 1,434 UUPM rows
   have terminal dispositions: **1,414 admitted / 0 deferred /
   20 rejected**. Final batch misc-singletons-migration applied as
   VECTOR batch 51 (map 5773, catalog 8054, 2,404 instructions;
   `sbvf-verify` verified). The non-family KEEP_ATOMIC lane is complete (VECTOR
   batches 39–45; catalog 2,389). P6 batch 1 (web-ux-pairs) is applied
   (VECTOR batch 46; map 5768, catalog 8049): 6 deferred rows admitted
   as family variants + 6 ux singletons migrated to `VPInstruction/v3`
   families under the luna-accepted `sbvf-*` admission machinery.
   P6 batch 2 (js-ts-web) is applied (VECTOR batch 47; map 5769,
   catalog 8050→2,390 instructions): 10 families, 13 deferred
   admissions + 9 singleton migrations; the D58-violating
   `family-avoid-unnecessary-effects-d6b2db8c` was excluded by owner
   ruling. Svelte L53 "Use semantic elements" is applied as a
   KEEP_ATOMIC singleton (VECTOR batch 48; map 5770, catalog 8051,
   2,391 instructions) after the owner dissolved its family-of-one;
   the svelte avoid-effects row (L48) is applied as KEEP_ATOMIC
   singleton `uupm-svelte-avoid-unnecessary-effects` (VECTOR batch
   49; map 5771, catalog 8052, 2,392 instructions).
   `sbvf-verify` `.x` versionRange bug is fixed (`variantContextVersion`,
   canonical expandRange semantics) — batch 50 verified cleanly.
   Owner rulings: web-ux-pairs approved; semantic-elements family
   dissolved (svelte L53 → KEEP_ATOMIC singleton, APPLIED as VECTOR
   batch 48); evidence = stack-review JSON; avoid-unnecessary-effects
   family excluded from js-ts-web (D58 violation — its svelte row
   reverts to a singleton, APPLIED as VECTOR batch 49). xaml-mvvm is
   applied (VECTOR batch 50; map 5772,
   catalog 8053, 2,403 instructions; `sbvf-verify` verified after the
   `.x` versionRange fix). misc-singletons-migration — the final
   batch — is applied (VECTOR batch 51; deferred = 0). Machinery
   hardened: `sbvf-verify` `.x` versionRange fix +
   D58 census guards (same-rowKey / whole-cell / SPLIT-row) +
   receipt/evidence realpath containment — all luna-accepted.
   Remaining closeout: full product test suite + format/OKF checks,
   final audit, commit decision. Per-batch
   KEEP_ATOMIC Mobile rows, 44
   `react-performance` rows, 107 KEEP_ATOMIC `react.csv`/`react-native.csv`
   rows and 211 KEEP_ATOMIC `angular`/`astro`/`avalonia`/`flutter` rows are
   admitted; 20 rows are rejected as duplicate norms (18 earlier
   duplicates plus the two D57 sibling-covered rejects). `Touch Target
   Size` is resolved: it was split into the singleton instructions
   `uupm-ux-touch-target-size-ios`, `uupm-ux-touch-target-size-android` and
   a subspan binding on `uupm-ux-target-size-minimum` (Web), each with an
   `H2FidelityReceipt/v2`. All 12 prepared D18 SPLIT rows are now admitted
   (11 `ux-guidelines.csv` rows + `stacks/react.csv` L9) as 31
   `VPInstruction/v1.2` singletons with exact code-point subspan bindings
   and `H2FidelityReceipt/v2` (batch 34; catalog 1,515). The SPLIT contract
   gap is closed in Source by the D56 amendment, and the live map is
   `VPCorpusMap/v3` with singleton `variantId` values;
   `audit-report.ts`, `source-updates.ts`, `convert.ts` and the SBVF
   census/plan path are v3-aware. Stack semantic review (cycle 1–2,
   2026-11-10): all 943 deferred stack rows received per-row dispositions
   from ten parallel flash agents, each file independently validated by
   luna with adjudicated corrections; consolidated result is 849
   KEEP_ATOMIC, 10 SPLIT, 11 REJECT_DUPLICATE and 73 HELD. The D57
   deferred-sibling dedup amendment is applied (same-batch sibling
   coverage, per-cell/per-fragment full coverage, cross-row subspan
   binding). Nine stack SPLIT rows are admitted as 21
   `VPInstruction/v1.2` singletons with subspan bindings and
   `H2FidelityReceipt/v2` (batch 35; catalog 1,536). `winui.csv` L34 is
   resolved by batch 38 (catalog 1,540): admitted as two SR-111 singleton
   SPLITs outside its mislabeled family (SR-105/D58 exclude SPLIT rows
   from families). Batch 36 (catalog 1,537) admitted
   `nuxt-ui.csv` L57 as the `use-range-when-needed` singleton with the
   locale fragment cross-bound to the L71-derived instruction per the D57
   amendment, and resolved 9 REJECT_DUPLICATE rows against already-admitted
   instructions; laravel L47 and nextjs L61 were resolved by the D57
   same-batch rule inside NF-02/NF-03 (batches 42–43). `Readable Font Size` is resolved by batch 37 (catalog
   1,538): admitted as the neutral `VPInstruction/v1.2` singleton
   `uupm-ux-readable-font-size` under the consilium decision — the seven
   Mobile siblings set the precedent and no `mobile` vocabulary token is
   needed (platform facts are conjunctive, D56/SR-82); the UX deferred
   remainder is zero. `csv-map.ts` locator validation now covers every
   `locators[]` entry per D56 §9. Dispositions live in
   `packages/powers/.tmp/h2a2-stack-review/*.json`; the family batch plan
   (45 READY families, 5 batches) is `.tmp/h2a2-family-plan.json` — note
   `winui.csv` L34's `split-family` label is an artifact: SR-105/D58
   categorically exclude SPLIT rows from families, so L34 is staged as
   two singleton SPLIT instructions outside the family (the xaml-mvvm
   batch drops to 48 rows). Next, in order:
   1. ~~Materialize the remaining non-family KEEP_ATOMIC rows~~ — DONE:
      all seven NF batches applied (VECTOR batches 39–45; catalog
      2,389; dispositions 1,342/72/20). NF-01..05 were applied after
      the luna re-check ACCEPTed the `pattern_tags: []` fix; the 12
      empty-pattern rows carry `tag_exemptions` (pattern dimension).
   2. Family-aware admission per D58/P6 — COMPLETE for UUPM: machinery
      ACCEPTED by luna (`sbvf-admission.ts` +
      `SBVFAdmissionManifest/v1` extending `sbvf-*`, Option A);
      batches 1–4 applied (VECTOR 46 web-ux-pairs, 47 js-ts-web
      minus the D58-excluded avoid-effects family, 50 xaml-mvvm,
      51 misc-singletons-migration); both dissolved svelte rows
      applied as singletons (VECTOR 48–49). **H2-A2 complete:
      deferred = 0, all 1,434 rows dispositioned.** Machinery
      hardened and luna-accepted: `sbvf-verify` `.x` versionRange
      fix + D58 census guards (same-rowKey / whole-cell / SPLIT-row)
      + receipt/evidence realpath containment. Closeout: full
      product test suite + format/OKF + final audit + commit
      decision. Per-batch
      flow: manifest draft → owner approval → config/ → plan regen →
      apply → verify → docs. Apply strictly sequentially; plans must
      be regenerated against live revisions before each apply.
   - **Validator gap resolved (2026-11-10):** `csv-map.ts` now resolves
     every binding-cell `locator` and `locators[]` entry against the owning
     parsed row per D56 §9 — integer line/row/column, one-based column equal
     to the bound cell, and line inside the cell's physical-line span;
     receipt `locators` must mirror bindings. Regression tests cover
     wrong-column, unoccupied-line, invalid-type and empty-list cases;
     `check-corpus` reports 0 issues on the live corpus.
   Done when every row has a terminal disposition, admitted rows have
   instructions and READY receipts (v1, or v2 for subspan bindings), the
   applicator has run over the admitted batch, and `check-corpus` proves
   row/cell coverage.
2. **H2-SBVF — source-bound variant families (D58; P5 APPLIED).**
   D58 is accepted; P0–P4b implementation, the isolated rehearsal and
   the P5 pilot apply are done. Pilot A (`useState`, `useReducer`)
   was applied 2026-11-12 after owner chose a fresh plan over the
   superseded assessment: 4 singletons migrated into 2
   `VPInstruction/v3` families (VECTOR batch 52; plan SHA
   `91d66675…`; `sbvf-verify` verified; family_ids normalized to the
   `-<8hex>` convention). The 2026-11-06 census (3,746 catalog entries at that
   time) covers 1,434 CSV rows: 468 admitted, 957 deferred and 9 rejected; the
   deferred set is 13 UX rows (11 SPLIT, 2 held), 9 SPLIT stack rows and 935
   undispositioned stack rows (historical census; the live corpus is now
   fully dispositioned — see item 1). The original pilot dry-run plan
   (SHA `2db034af…`, pre-D59 catalog) was superseded; the applied P5
   plan SHA is `91d66675…` bound to live map 5774 / catalog 8055.
   P6 scale-up ran under per-batch owner approvals (VECTOR 46–51).
   Family and atomic-variant counts stay separate. **H2-SBVF fully
   closed/accepted:** the owner accepted H2 on 2026-11-12 via the
   bound H2-D receipt `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H2D-RECEIPT.md`
   (SHA-256 `857f3001f2fd2e4d665899c36c70bcb60172a3ac97d14c4b2103a6727d147251`);
   AC-82/AC-83 are verified (owner, 2026-11-12).
3. **H2-D — H2 acceptance receipt and sign-off (DONE — owner accepted
   H2 on 2026-11-12).** Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H2D-RECEIPT.md` (SHA-256
   `857f3001f2fd2e4d665899c36c70bcb60172a3ac97d14c4b2103a6727d147251`,
   evidence `h2d-evidence/`): corpus-map `VPCorpusMap/v3` rev 5774
   (sha `7f02b5bf…`), catalog rev 8055 (sha `4a88ea15…`, 2,402
   instructions), 52 VECTOR batches; gates — `bun test --coverage`
   1,039 pass / 5 skip / 0 fail with 100% funcs/lines/statements,
   typecheck/format/`check-corpus` (0 issues)/`check-vector` (52
   batches)/`check-okf` all exit 0, Node runtime search/get exit 0
   under Node v26.13.1 with the H2-C receipt, and an independent
   disposition audit clean (1,449 bindings, 0 missing/mismatched
   receipts). The pinned Knip external conflict remains open (item 16)
   and is not claimed PASS.
4. **H3-A — typed reference resources pilot (ACCEPTED 2026-11-13).**
   The 25-record `font-pairing` pilot is complete and owner-accepted:
   `VPReferenceResource/v1`, in-place `VPCatalog/v1` `resources[]` and
   in-place `VPCorpusMap/v3` `admitted` resourceIds are live;
   `catalog.resource.get`, CLI `resource --id`, compose `--resource-id`
   and the shared 64,000-byte resource budget are implemented and tested;
   25 `uupm-font-pairing-*` records are materialized from
   `typography.csv` rows 1–25 (catalog rev 8056 `ad4afdc6…`, map rev
   5775 `b76066b8…`; rows 26–74 stay deferred outside the pilot). D18
   delegated panel: 15 blind reviews, aggregation 25/25 accept
   (19 direct + 6 orchestrator-adjudicated on deterministic
   digest/hash/schema evidence; 0 amend / 0 reject). Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3A-RECEIPT.md` with evidence
   `h3a-evidence/` and `h3-d18/`; gates — `bun test --coverage` 1,097
   pass / 5 skip / 0 fail with 100% funcs/lines, typecheck 115 files,
   format/`check-corpus`/`check-vector`/`check-okf` exit 0, Node
   v26.13.1 resource smoke; the pinned Knip external conflict remains
   open (item 16) and is not claimed PASS. AC-52/AC-54/AC-55 are
   `verified (component)`; AC-50/AC-51/AC-53 and the other H3-family
   criteria stay open.
5. **H3-B — `palette` typed reference resources pilot (ACCEPTED
   2026-11-13).** The 25-record `palette` pilot is complete and
   owner-accepted: 25 `uupm-palette-*` `VPReferenceResource/v1`
   records materialized from `colors.csv` rows 1–25 (catalog rev
   8057 `966ca770…`, map rev 5776 `6b5d6f5f…`; rows 26–192 stay
   deferred outside the pilot with explicit reasons). D18 delegated
   panel: 15 blind reviews, aggregation **25/25 accept — 3/3 direct
   protocol accepts per record, 0 amend / 0 reject / 0 manual, no
   adjudication needed**. Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3B-RECEIPT.md` with
   evidence `h3b-d18/`; gates — `bun test --coverage` 1,102 pass /
   5 skip / 0 fail with 100% funcs/lines, typecheck 115 files,
   format/`check-corpus` (0 issues)/`check-vector`/`check-okf` exit
   0, Node v26.13.1 resource smoke incl. type-mismatch/unknown
   negatives; the pinned Knip external conflict remains open
   (item 16) and is not claimed PASS. AC-52/AC-54/AC-55 keep
   `verified (component)` scope. **Remaining H3 scope (each needs a
   separate owner-approved admission gate):** the other three D15
   resource types (`style`, `icon-list`, `standards-checklist`), the
   49 deferred `typography.csv` rows, the 167 deferred `colors.csv`
   rows, and the remaining uupm data families (`styles.csv`,
   `icons.csv`, `charts.csv`, `motion.csv`, `landing.csv`,
   `products.csv`, `ui-reasoning.csv`, `app-interface.csv`,
   `google-fonts.csv`); `poteto-plugins` remains unpinned in
   donors.yaml. H3-A was committed at `49842c09`; all H3-B changes
   are uncommitted at HEAD `49842c09` — the commit decision is
   Root-owned.
6. **H3-C — `style` typed reference resources pilot (ACCEPTED
   2026-11-16).** The 25-record `style` pilot is complete and
   owner-accepted: 25 `uupm-style-*` `VPReferenceResource/v1`
   records materialized from `styles.csv` rows 1–25 (catalog rev
   8058 `35833e57…`, map rev 5777 `ad02beae…`; the file has 88 data
   rows, rows 26–88 stay deferred outside the pilot with explicit
   reasons). Payload contract: all 29 CSV columns except `No` as 28
   verbatim string keys; complex donor cells (`cost:…|drivers:…`,
   `☐` checklists, emoji markers) preserved unparsed. Six donor
   `Status: deprecated` rows (20–25) admitted per positional-pilot
   parity; `payload.status` preserves the donor verdict. D18
   delegated panel: 15 blind reviews, aggregation **25/25 accept —
   3/3 direct protocol accepts per record, 0 amend / 0 reject /
   0 manual, no adjudication needed**. Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3C-RECEIPT.md`
   with evidence `h3c-d18/`; gates — `bun test --coverage` 1,112
   pass / 5 skip / 0 fail with 100% funcs/lines, typecheck 117
   files, format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
   exit 0; the pinned Knip external conflict remains open
   (item 16) and is not claimed PASS. AC-52/AC-54/AC-55 keep
   `verified (component)` scope. **Remaining H3 scope (each needs a
   separate owner-approved admission gate):** the other two D15
   resource types (`icon-list`, `standards-checklist`), the
   49 deferred `typography.csv` rows, the 167 deferred `colors.csv`
   rows, the 63 deferred `styles.csv` rows, and the remaining uupm
   data families (`icons.csv`, `charts.csv`, `motion.csv`,
   `landing.csv`, `products.csv`, `ui-reasoning.csv`,
   `app-interface.csv`, `google-fonts.csv`); `poteto-plugins`
   remains unpinned in donors.yaml. H3-A was committed at
   `49842c09`; H3-B and H3-C were committed together at
   `79360c0c` — commit decisions are Root-owned.
7. **H3-D — `icon-list` typed reference resources pilot (ACCEPTED
   2026-11-16).** The 25-record `icon-list` pilot is complete and
   owner-accepted: 25 `uupm-icon-*` `VPReferenceResource/v1`
   records materialized from `icons.csv` rows 1–25 (catalog rev
   8059 `0866cb7c…`, map rev 5778 `e7820907…`; the file has 105
   data rows, rows 26–105 stay deferred outside the pilot with
   explicit reasons). Payload contract: all 11 CSV columns except
   `No` as 10 verbatim string keys; `Icon Name` is the slug
   source. Independent Luna validation READY 0 findings; D18
   delegated panel: 15 blind reviews, aggregation **25/25 accept —
   3/3 direct protocol accepts per record, 0 amend / 0 reject /
   0 manual, no adjudication needed**. Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3D-RECEIPT.md`
   with evidence `h3d-d18/`; gates — `bun test` 1,115 pass / 5
   skip / 0 fail, typecheck 117 files, format/`check-corpus` (0
   issues)/`check-vector`/`check-okf` exit 0; the pinned Knip
   external conflict remains open (item 16) and is not claimed
   PASS. AC-52/AC-54/AC-55 keep `verified (component)` scope.
   **Remaining H3 scope (each needs a separate owner-approved
   admission gate):** the deferred rows of the five piloted CSVs
   (80 `icons.csv`, 49 `typography.csv`, 167 `colors.csv`,
   63 `styles.csv`, 7 `app-interface.csv`), and the remaining uupm
   data families (`charts.csv`, `motion.csv`, `landing.csv`,
   `products.csv`, `ui-reasoning.csv`, `google-fonts.csv`);
   `poteto-plugins` remains unpinned in donors.yaml. H3-D was
   committed at `22513200`.
8. **H3-E — `standards-checklist` typed reference resources pilot
   (ACCEPTED 2026-11-16).** The 25-record `standards-checklist`
   pilot is complete and owner-accepted: 25 `uupm-standard-*`
   `VPReferenceResource/v1` records materialized from
   `app-interface.csv` rows 1–25 (catalog rev 8060 `ce135a33…`,
   map rev 5779 `0e85c46b…`; the file has 32 data rows, rows 26–32
   stay deferred outside the pilot with explicit reasons). Payload
   contract: all 11 CSV columns except `No` as 10 verbatim string
   keys (`category`, `issue`, `keywords`, `platform`, `description`,
   `do`, `dont`, `code_example_good`, `code_example_bad`,
   `severity`); slug derives from composite `Category`+`Issue`.
   Independent Luna validation READY 0 findings; D18 delegated
   panel: 15 blind reviews, aggregation **25/25 accept — 3/3
   direct protocol accepts per record, 0 amend / 0 reject / 0
   manual, no adjudication needed**. Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3E-RECEIPT.md`
   with evidence `h3e-d18/`; gates — `bun test` 1,115 pass / 5
   skip / 0 fail, typecheck 117 files, format/`check-corpus` (0
   issues)/`check-vector`/`check-okf` exit 0; the pinned Knip
   external conflict remains open (item 16) and is not claimed
   PASS. AC-52/AC-54/AC-55 keep `verified (component)` scope.
   **All five D15 resource types are now piloted (182 typed
   resources live).** Remaining H3 scope (each needs a separate
   owner-approved admission gate): the deferred rows of the five
   piloted CSVs and the remaining uupm data families
   (`charts.csv`, `motion.csv`, `landing.csv`, `products.csv`,
   `ui-reasoning.csv`, `google-fonts.csv`); `poteto-plugins`
   remains unpinned in donors.yaml. H3-E changes are committed
   with this documentation update — commit decisions are
   Root-owned.
9. **H3-F — `standards-checklist` remainder pilot (ACCEPTED
   2026-11-16).** The final 7 deferred rows of `app-interface.csv`
   (rows 26–32) are admitted as `uupm-standard-*`
   `VPReferenceResource/v1` records — **the CSV is now fully
   dispositioned: 32/32 admitted, 0 deferred** (catalog rev 8061
   `ebaca4a4…`, map rev 5780 `f684a978…`; 132 typed resources
   live). Mechanism: new `--remainder` mode in
   `materialize-resources.ts` — admits only rows after the pilot
   limit, requires the existing `csvSources` ledger, re-verifies
   pinned `rawSha256`/`headersDigest`, and cannot re-admit or
   re-slug rows 1–25. Independent Luna validation READY 0
   findings; D18 delegated panel: 6 blind reviews (2 batches × 3
   protocols), aggregation **7/7 accept — 3/3 direct accepts per
   record, 0 amend / 0 reject / 0 manual**. Bound receipt
   `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3F-RECEIPT.md`
   with evidence `h3f-d18/`; gates — typecheck 117 files,
   format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
   exit 0, targeted `bun test` 66 pass / 0 fail after the
   D-S8-1-driven `plugin-payload.test.ts` target-list update;
   the pinned Knip external conflict remains open (item 16) and
   is not claimed PASS. AC-52/AC-54/AC-55 keep
   `verified (component)` scope.
   **Remaining H3 scope (each needs a separate owner-approved
   admission gate):** the deferred rows of the four piloted CSVs
   (30 `icons.csv`, 49 `typography.csv`, 167 `colors.csv`,
   63 `styles.csv` — 309 rows total) and the remaining uupm data
   families (`charts.csv`, `motion.csv`, `landing.csv`,
   `products.csv`, `ui-reasoning.csv`, `google-fonts.csv`);
   `poteto-plugins` remains unpinned in donors.yaml.
10. **H3-G — `icon-list` wave-2 pilot (ACCEPTED 2026-11-17).**
    icons.csv rows 26–50 admitted as 25 `uupm-icon-*`
    `VPReferenceResource/v1` records via the new bounded-wave
    `--remainder --limit` mode (catalog rev 8062 `f7ba828f…`,
    map rev 5781 `11d22c85…`; 157 typed resources live).
    icons.csv then stood at 50 admitted / 55 deferred (rows
    51–105). `--remainder` admissibility binds to
    ledger-deferred rowKeys only — admitted rows can never be
    re-admitted. Independent Luna validation READY 0 findings;
    D18 delegated panel: 15 blind reviews (5 batches × 3
    protocols), aggregation **25/25 accept — 0 amend / 0 reject
    / 0 manual**. Bound receipt
    `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3G-RECEIPT.md`
    with evidence `h3g-d18/`; gates — typecheck 117 files,
    format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
    exit 0, full `bun test` 1,115 pass / 5 skip / 0 fail,
    `build-manifests --check` ok; the pinned Knip external
    conflict remains open (item 16) and is not claimed PASS.
    AC-52/AC-54/AC-55 keep `verified (component)` scope.
    **Remaining H3 scope (each needs a separate owner-approved
    admission gate):** icons.csv rows 76–105 (30 rows — final
    wave), the deferred rows of `typography.csv` (49),
    `colors.csv` (167) and `styles.csv` (63) — 309 rows total —
    and the remaining uupm data families (`charts.csv`,
    `motion.csv`, `landing.csv`, `products.csv`,
    `ui-reasoning.csv`, `google-fonts.csv`);
    `poteto-plugins` remains unpinned in donors.yaml.
11. **H3-H — `icon-list` wave-3 pilot (ACCEPTED 2026-11-17).**
    icons.csv rows 51–75 admitted as 25 `uupm-icon-*`
    `VPReferenceResource/v1` records via the `--remainder
    --limit 25` bounded-wave mode — no code changes, the H3-G
    mechanism was reused (catalog rev 8063 `3fd1be08…`, map rev
    5782 `88fa6835…`; 182 typed resources live). icons.csv now
    stands at 75 admitted / 30 deferred (rows 76–105 — the
    final wave). Independent Luna validation READY 0 findings;
    D18 delegated panel: 15 blind reviews (5 batches × 3
    protocols), aggregation **25/25 accept — 0 amend / 0 reject
    / 0 manual**. Bound receipt
    `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3H-RECEIPT.md`
    with evidence `h3h-d18/`; gates — typecheck 117 files,
    format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
    exit 0, full `bun test` 1,115 pass / 5 skip / 0 fail,
    `build-manifests --check` ok; the pinned Knip external
    conflict remains open (item 16) and is not claimed PASS.
    AC-52/AC-54/AC-55 keep `verified (component)` scope.
    **Remaining H3 scope (each needs a separate owner-approved
    admission gate):** icons.csv rows 76–105 (30 rows — final
    wave), the deferred rows of `typography.csv` (49),
    `colors.csv` (167) and `styles.csv` (63) — 309 rows total —
    and the remaining uupm data families (`charts.csv`,
    `motion.csv`, `landing.csv`, `products.csv`,
    `ui-reasoning.csv`, `google-fonts.csv`);
    `poteto-plugins` remains unpinned in donors.yaml.
12. **E5a/E5b host qualification.** Production manifest inputs now
   exist (`config/plugin-manifest-inputs.json`, owner-approved
   D-S8-1 target set: portable, codex, claude, cursor,
   muse-package, antigravity — devin/kimi/root-marketplace/muse/
   muse-catalog stay deferred; `muse-catalog` descoped from E5b per
   D-S8-2). Outputs formed and `--check` clean: root `plugin.json`,
   `.codex-plugin/`, `.agents/plugins/marketplace.json`,
   `.claude-plugin/`, `.cursor-plugin/`, and `.tmp/` native
   formations for muse-package/antigravity. Public metadata
   (`privacyPolicyUrl`, `termsOfServiceUrl`, `contact.email`)
   remains unset pending owner values. Native host installation,
   publication channel (D-S8-3, needs public repo), and Runtime
   acceptance remain open. The `.54` fixtures are not production
   outputs; `.67` is `NOT_CLOSED`; `.70` is an evidence baseline
   only.
13. **D19 algorithm delegation implementation.**
   offer/preference/offer-record mechanism is implemented and
   independently validated (Luna READY, 0 findings): decision-type
   registry with canonical exclusion and allowed floors, exact
   type+scope matching, sealed `VPStandingPreference/v1` and
   `VPAlgorithmOffer/v1` artifacts, SHA-verified preference refs.
   Deferred by design: call-site wiring into human-loop instructions,
   algorithm execution/notification, per-decision SHA binding. The
   mechanism was committed at `7972b8f7` — commit decisions are
   Root-owned.
14. **D16 v1.2 re-binding.**
   not a prerequisite for the migrated corpus or the compact CLI. The frozen
   40-ID trial stays v1.1-bound.
15. **Stage 8 — Standalone mode, portability and installation.**
   deterministic catalog library, and a minimal scenario on at least two
   compatible hosts. **First dated run evidence (2026-11-16,
   `stage8-20261116`, HEAD `4db70aa6`, Bun 1.4.4, Node v26.13.1 smoke
   PASS):** the minimal scenario (install → profile →
   `catalog-cli search/get` → `resource` → findings append →
   no-durable-state assertion) passed on four rows — portable
   (direct CLI), opencode and pi (`install-plugin.ts` project-scope
   junctions + `--check`), codex (manifest/skill validation). All
   state assertions clean; receipts under
   `packages/powers/.tmp/stage8-20261116/` (gitignored). This is
   install-target/CLI evidence on one Windows host — not live agent
   sessions, not Runtime acceptance, and marketplace-channel rows
   remain blocked on owner decisions D-S8-1..3.
16. **External Knip conflict.**
   on the `knip.config.ts` self-entry; the Agent/config owner must resolve it.
   The H2-D receipt (owner-accepted 2026-11-12) re-confirms the same
   `issues: []` exit 1 external conflict — not PASS; item stays open.
17. **Separate Runtime acceptance.**
   verified; they do not establish installation or Runtime acceptance.
18. **Candidate next scopes (owner approval required; not started).**
    module packaging would extend D59 carriers to the 468 CSV atoms; the
    remaining H2-A2 stack rows are already tracked under item 1. Neither is
    authorized by the current D59 acceptance.

Closed or removed from the open set: A0; A-D; E1-E4 (E5 host qualification
remains open); F (component-only, AC-22 partial/deferred); H0 baseline
(closed at `fafb4015`; `.81` review MET, doc reconciliation done
2026-11-16);
H1 AC-59 (accepted, but AC-47–AC-58 remain open); donor update tracking (all 8
donors current, baseline 1,258 files); D59 lossless modules (accepted
2026-11-08; catalog 3,746 → 1,482, 682 carriers / 2,946 atoms;
`module-update` READY, AC-91); G (outside Powers).

**Open acceptance gap (not active conversion):** H0 documentation acceptance and
final native fixture parity on the eight `.69` Markdown paths were reconciled
on 2026-11-16: `packages/powers/AGENTS.md` §5 and this list now record the H0
baseline as closed at `fafb4015` per `task-plan-step-h.md`, matching the `.81`
independent review verdict (cumulative H0 baseline criteria MET; its two Minor
findings are stale-text items, one in a since-deleted file). F AC-22
remains partial/deferred: no real finding event or semantic/equivalence
acceptance is claimed. H1 AC-47–AC-58 remain open until per-source attribution,
D18 panel/aggregation receipts and the delegated gate path are complete. AC-59
accepts the 25-file pilot as the D18 baseline; it does not by itself authorize
H1 conversion.

## Historical task list (2026-11-02, superseded by the refreshed open list)

1. **F workstream — closed (component-only)** — the owner accepted Powers
   Standalone component evidence on 2026-11-02. AC-22 remains partial/deferred;
   a real finding event and semantic/equivalence acceptance are not claimed.
2. **H1 source attribution/admission** — select the exact source subset, record
   the exact source link/attribution, run the D18 three-protocol blind panel and
   aggregate its decisions before any conversion.
3. **Host qualification** — production manifest inputs/outputs, native host
   installation and portable/host acceptance remain deferred.
4. **External Knip conflict** — Agent/config owner must resolve the
   `knip.config.ts` pre-commit versus pinned-gate conflict; Powers does not own it.
5. **Donor update tracking — closed 2026-11-03** — the 8 corpus donors have a per-file baseline
   (`source-baseline.json`, 1,258 files / 3,278 instructions). The read-only
   `check-source-updates` reports `current`, `pin-stale`, `stale`, `missing` or
   `unknown` and lists affected instruction IDs; `build-source-baseline` is the
   explicit refresh. `triage-donor-updates` reports added/modified/deleted files
   and new-file dispositions. Upstream check 2026-11-02: 7 of 8 used donors have
   newer revisions (Open Knowledge Format is current). Superpowers was processed
   first: pin advanced, 87 provenance revisions updated, 4 source paths moved to
   reference files, 2 new instructions added. Matt-skills was processed second:
   pin advanced, 69 provenance revisions updated, 8 content updates, 2 new
   instructions added (shared wiki and gradual automation), 5 in-progress
   reference files rejected. Bmad-method was processed third in ten content
   batches and one pin batch: B1–B2 covered ticket-aware PRD, QA, architecture
   and UX; B3 moved `bmad-spec` to `bmad-agent-po`; B4 gave review a ticket
   content class, four verification-gap shapes and file-backed triage; B5
   reviewed 56 ticket instructions; B6 made build read the ticket and run its
   `## Verification`; B7 moved retro and replan to the ticket model; B8 updated
   walkthrough, PRFAQ and forge; B9 updated agents, toolsmith, deep recon,
   product brief and method help; B10 added 10 new `bmad-agent-po` instructions.
   The pin advanced `cfba3ff5` → `bd70c643`; provenance on 752 existing instructions
   was updated, the deletion map was applied, and the baseline was rebuilt at
   1,200 files. Independent Luna review is READY at `56ebc15e` with 0 Critical /
   0 Important / 0 Minor. Addy-skills followed: pin advanced `aeac41d4` →
   `301b02b1`, provenance on 392 instructions updated, 10 content updates, and
   14 eval files rejected as harness material. Catalog revision 6,357; map
   2,791; baseline 1,200. Gsd-core followed: pin advanced `19f2d5e8` →
   `bfab8249`, provenance on 1,343 instructions updated, 6 content updates and
   5 new review instructions; 25 candidates were rejected as donor docs, and
   212 packaging/translation documents plus 22 stale map records were reconciled.
   Catalog 7,343; map 3,429; baseline 1,258. Remaining triage: none; pstack and
   ponytail have no used-file impact, and Open Knowledge Format is current.
   Independent Codex/Luna review is READY at `d6428765` with 0 Critical /
   0 Important / 0 Minor.
   **Closed 2026-11-03:** all 8 donors are current and no donor batch remains.
   `docs/VECTOR.md` is the living summary; update it and run `check-vector` in
   every batch.
6. **Algorithm delegation offer (D19) — policy READY; implementation open** —
   every declared human-loop decision must offer the D18 three-protocol
   algorithm. A user who delegates is asked about a scoped, revocable standing
   preference for that decision type; excluded decisions remain human. T3
   Codex/Luna policy review is READY 0/0/0. The offer/preference path is not
   implemented; for decision types outside H1, existing human gates remain until
   it is tested and reviewed.

Out of Powers scope: Agent runtime integration, D3/D8, VP-7/G, Agent
`WorkItem/v1`, runtime findings/artifacts, and the runtime effective-profile
carrier. Product instructions and current status live in
`packages/powers/AGENTS.md`.

The goal of this queue: **a provable pipeline with the corpus and the skills**, suitable for
the Standalone environment, with checks that are executed rather than declared.

**Infrastructure constraint (owner decision, 2026-10-19):** the plugin **has no
infrastructure of its own**. The product runtime is Bun 1.4.4; the plugin introduces no
runtime, bundler, package manager, CLI framework or test
runner of its own. The plugin code is **runtime-agnostic**: only standard `node:` modules,
no external dependencies and no Bun-specific APIs in the runtime part.
**Scripts shipped in the skills** (setup, instruction search) —
plain TS without a build: they run under Bun or Node. Machine data that the code
reads — **JSON**; YAML remains for human manifests (`donors.yaml`).

# Order and gates

The read-only `scripts/packet.ts` proposal checker reports mechanical checks and
unchecked bases; independent final review and corpus custody remain open. It does
not grant semantic acceptance or authorize a migration.

```
A0 (gate) ──► A harness+skeleton ──► B canonical documents ──► C catalog+scripts
                                                            │
                                                            ▼
                                      D full eight-donor corpus
                                                            │
                        ┌───────────────────────────────────┴────────────────┐
                        ▼                                                    ▼
              E skills + manifests                             F Work Items + findings
                        └───────────────────────────────────┬────────────────┘
                                                            ▼
                                              G Agent-runtime handoff (out of Powers scope)
                                                            │
                                                            ▼
                                  H D14/D15 content extension (H0 → H1 → H2 → H3)
```

| Step | Content | Gate (evidence required) | Estimate | Status |
|---|---|---|---|---|
| **A0** | Check the risk for the foreign lint gate before the first TS file | `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0 | S | **closed 2026-10-19** |
| **A** | Product skeleton and harness **following the conventions of `packages/agent`** (without its own infrastructure): `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml`, its own install directory (`bun.lock`), the directories `scripts/ tests/ config/ instructions/ skills/` | `bun run --cwd packages/powers test` → 13 pass / 0 fail; `bun run --cwd packages/powers typecheck` → "No type errors"; a plain-TS script runs identically under `node` and `bun` | S | **closed 2026-10-19** |
| **B** | Product canonical documents: `business-requirements.md`, `system-specification.md`, `acceptance.md`, the matrix research § → SR § → AC id | The matrix is complete; `check-okf.ts` → exit 0; doc-check → `failures: []` | M | **closed 2026-10-19** |
| **C** | Catalog and scripts: VP schemas in `config/`, the frontmatter parser, the catalog model with the operations `catalog.tags/search/get/compose` and a deterministic `decision.evaluate`, the CLI, the seed corpus, `catalog.json`, `corpus-map.json`, `scripts/check-corpus.ts`, `scripts/convert.ts`; the shipped tooling — in `skills/vp-mode/scripts/` | `bun run --cwd packages/powers test` → 0 fail; `test:coverage` → threshold 1.0; `typecheck` → 0 errors; `check-corpus.ts` → exit 0; knip → `{"issues":[]}`; doc-check → `failures: []` | M | **closed 2026-10-20** |
| **D** | Full eight-donor corpus: donor inventory, selection, segmentation into atomic instructions, merging of duplicates, rendering `.md` with `provenance`; the processing map `corpus-map.json`; the converter `scripts/convert.ts`; the shipped tooling — in `skills/vp-mode/scripts/` | `check-corpus.ts` → exit 0; map ↔ corpus consistent; `provenance` ↔ `donors.yaml`; mapping pass first; agent creates genuinely new unique tags; owner approves the corpus | M | **closed 2026-10-20 for MVP; extended 2026-10-21** (2510 instructions from 8 donors; 2790 processing-map records) |
| **E** | The source entries `vida-bootstrap` (project-document role bootstrap), `vp-mode` (orchestration) and `vp-setup` (setup) in `skills/`, together with shipped scripts; per-host manifests generated by the package builder; E5a source/schema/fixture implementation; [E5b native layouts and deferred hosts](#delivery-target-status-e5ae5b) | Repeated setup is idempotent; manifests match supported formats, validate rooted skills and ownership, and preserve read-only recovery checks; shipped skill scripts remain runtime-agnostic | M | **in progress** — E1–E3 closed; E4 implemented; the project-document `vida-bootstrap` source entry is complete and included in the three-skill host manifest/installer inventory; host qualification remains open; `.54` formed local Muse/Antigravity fixtures; production inputs/outputs now exist for the six D-S8-1 targets (`--check` clean), `muse-catalog` is descoped from E5b (D-S8-2), and Muse digest proof is no longer pending. The locally verified `.65` review marks `.62` CODE+EVIDENCE READY with no code blocker. `.67` remains `NOT_CLOSED` with `packagePass: false`; `.70` marks it READY only as an evidence baseline. Host installation, publication and Runtime acceptance remain open. |
| **F** | VP Work Items in `docs/work/` (OKF concepts with stable IDs, AC, evidence); append-only Standalone findings store API, CLI caller, `artifact_contract`, and caller procedure | Query-before-append; exact replay; explicit merge event; scope and no-fix boundaries remain separate | M | **closed 2026-11-02 as Powers Standalone component-only; AC-22 remains partial/deferred** — current package suite (2026-11-02): 839 pass / 4 skip / 0 fail; focused F (2026-11-02): 141 pass / 0 fail / 1,258 assertions across findings, artifacts and catalog-cli. No `findings.jsonl` or `artifacts.jsonl` exists. The following F-specific coverage and typecheck counts are historical for their inputs. Coverage fails unchanged 1.0 thresholds: LCOV F 473/480, L 3991/4038, B 0/0; no statement counter. Uncovered lines: `catalog-cli.ts` 40-42, 138, 142-164, 169-183; `findings.ts` 314, 322-323, 343, 354. Typecheck: 29 files; Knip `issues: []`; corpus: 2,510 instructions / 0 issues; donors: 9 / OK; map/pairs/pair agreement: 0 findings; pair table: 22; fidelity audit: 1,910 divergent lines; OKF: 34 concepts / 0 failures or warnings; Markdown: 5 docs / 44 links / 0 failures. `audit specs` has no canonical JSON spec input. On 2026-10-30 the artifact-reference and findings scope-gate extension added component evidence for AC-20, AC-21 and AC-23; AC-22 remains partial and AC-24 component-only; no real event or host/Runtime acceptance; the 839-test and 34-concept numbers are historical for their inputs. F is Powers Standalone only; VP-7 and Agent runtime data are not F dependencies. VP-7/G are historical Agent-runtime evidence; root reconciliation remains open. Closure decision: the owner closed the F task on 2026-11-02 for Powers Standalone component evidence; AC-22 remains partial, and a real finding event plus semantic/equivalence acceptance remain deferred. AC-20/21/23/24 remain component-only. No Runtime/Agent claim. |
| **G** | Agent-runtime request for D3+D8 (extended instruction registry + profile reading) | Owned by the Agent runtime developer; not a Powers active task | — | **Out of Powers scope.** The historical `REQ-D3-D8` packet remains retained as handoff evidence, but Powers does not own its sending, admission or runtime implementation. No active handoff, send or Runtime acceptance is claimed in this lane. |
| **H** | D14/D15 accepted scope, implemented only through the gated phases in [Step H](task-plan-step-h.md): baseline closeout, source-attributed Wondelai method subset, engineering/UX applicability and CSV map, then selected typed JSON resources | H0 current hash-bound gates and review record; H1 complete disposition, source attribution/link and D18 panel evidence; H2 versioned applicability and cell-level evidence; H3 exact-ID, safety and shared-budget evidence | L | **25-file H1 pilot + 1 next-batch file are applied; 321 instructions.** The owner allowed general methods plus selected product/business methods, set a 25-file pilot, moved CSV to H2, admitted no typed families, and replaced the H1 human fidelity/owner-admission loop with three blind Codex Luna reviewers (V3 Delphi, V2 Adversarial, V4 Party chat) plus orchestrator aggregation (D18). Ten held captures contain 602 held units and 57 bounded model comparisons; no complete/admitted source packet is evidenced. The owner approved excluding 60 out-of-carrier copies while preserving 421/30/391 intake accounting. The approved 25-file set (8 engineering / 9 product-UX / 8 business-marketing) is captured, mechanically decomposed into 391 draft units and 4,039 spans, and sealed with 25 selections and 25 `PASS_MECHANICAL_ONLY` receipts in the existing H1 evidence directory; a read-only Luna validation returned READY 0/0/0. The D18 panel then ran six batches × three blind Codex Luna protocols on all 25 files: 391 units → 219 unanimous / 164 majority / 8 manual / 0 unresolved; final 230 accept / 80 amend / 0 merge / 81 reject. The panel decisions artifacts contain 310 final units with 25 selections and 25 `PASS_MECHANICAL_ONLY` checks; every file passed `checkDecomposition`. The main defect is mechanical span width: many units cover only the heading/first line, so the specs must use full-section locators. The eight engineering subsets and seventeen product/design and business files are **applied** (297 instructions; corpus 3,278 instructions, map 3,429, baseline 1,258, catalog revision 7,343). The other 1 file is **not admitted**: no `InstructionSpec`/packet exists for them, and the delegated gate path is implemented, tested and independently reviewed by T3 Codex/Luna (READY 0/0/0). Selected-text disposition for the remaining files, per-source attribution, spec drafts, the 25-file pilot, matched measurement, H2/H3 and Runtime acceptance remain open. Further H1 conversion remains blocked by missing per-source attribution/specs for the remaining files; independent preparation may continue. H1 uses the existing `request-clarification.md` gap routing: missing/technical evidence is an automatic block; ambiguity/conflict asks the owner; attribution is recorded, not inferred; the D18 review is delegated model review, not human fidelity. |

# Delivery target status (E5a/E5b)

The owner chose a root marketplace for Muse, with the plugin nested under `plugins/vida-powers/`,
and a separate compatible plugin root for Antigravity. D4b remains the business owner; D10 §5's
earlier universal `source: "."` layout is superseded for these two targets only.

| Target | Status | Mapping or output | Basis and remaining gap |
|---|---|---|---|
| Portable root | `format-mapped` | Root `plugin.json` formed from production inputs; standard `skills/` discovery; no `skills` or `catalog` field | Output formed and `--check` clean; no host install |
| Codex | `host-verified` (historical D4b status) | `.codex-plugin/plugin.json` uses `skills: "./skills/"`; `.agents/plugins/marketplace.json` uses local source `./` | Output re-formed under the six-target inputs; `--check` clean; no new host qualification |
| Claude | `format-mapped` | `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` formed from production inputs | Output formed and `--check` clean; no host qualification |
| Cursor | `format-mapped` | `.cursor-plugin/plugin.json` formed from production inputs | Output formed and `--check` clean; no host qualification |
| Muse package | `format-mapped` | `.tmp/vp-manifest-formations/muse/plugins/vida-powers` package payload + `.muse-plugin/plugin.json` | Formation output under `.tmp` (gitignored); `--check` clean |
| Muse / root marketplace | Descoped from E5b (D-S8-2, 2026-11-16) | Root marketplace output withheld | `muse-catalog` stays `MANIFEST_MUSE_CATALOG_NOT_READY`; first-party digest proof descoped — no digest work pending |
| Antigravity | `format-mapped` | `.tmp/vp-manifest-formations/antigravity` plugin-root payload + `plugin.json` | Formation output under `.tmp` (gitignored); `--check` clean; published-schema/parser tolerance still unverified |
| Devin | Docs-declared fallback only | `.devin-plugin/plugin.json` → `.claude-plugin/plugin.json` → root `plugin.json` | Format mapping only; deferred target; no host installation or acceptance |
| Kimi | Import documented; native target deferred | Plugin Builder imports the Codex, Claude and root manifests | No Kimi-native manifest is required; no host acceptance claimed |

Host manifest inventory includes all three source entries (`vida-bootstrap`,
`vp-mode`, `vp-setup`). Production inputs (`config/plugin-manifest-inputs.json`,
D-S8-1 target set) and outputs for portable/codex/claude/cursor plus `.tmp`
muse-package/antigravity formations now exist and pass `--check`. Host
installation, public metadata values, the publication channel (D-S8-3), and
Runtime acceptance remain open. This section is the current E5a/E5b status
owner; superseded per-target receipt counts stay bound to their inputs in Git
history at commit `04a9a1ee` (`docs/task-plan-step-e.md`).

# Forward stages

Stages 0-5 are closed; Stage 6 remains open as recorded in the table above. Stage 7 is the Runtime
track (7a, then 7b after the storage GAP outside VP) and remains outside this scope. Three further
product-side stages are defined here.

| Stage | Content | Dependencies | Estimate |
|---|---|---|---|
| 8 | Standalone mode, portability and installation: one deterministic catalog library for Standalone and Runtime, transparent last-write attribution without hidden overwrite, a host support matrix, and install plus run of a minimal scenario on at least two compatible hosts | 5, 6, D4 | M |
| 9 | Deferred scope after D14/D15: unselected domains, a future UI over the VIDA API and issue-tracker synchronization stay outside scope; the marketplace channel stays in scope (D4) | — | — |
| 10 | D14/D15 bounded content extension, phased H0 → H1 → H2 → H3 in [Step H](task-plan-step-h.md) | 2, 3, H0 | L overall |

Stage 8 requires a dated host matrix, no durable execution state beyond explicit local records, and
recorded real limitations instead of pseudo-documents. Stage 10 admits no source, makes no source-attribution decision
and closes no phase by estimate; it is not on the Stage 7b critical path. The closed critical path
was 0 → 1 → 2 → 3 → 4 → 5 → 7a → 7b, with Stage 2 the narrowest point. The full stage sequence,
estimates and plan boundaries previously lived in `docs/implementation-plan.md`; its historical
revisions remain in Git at commit `04a9a1ee`.

# Quality gates and risks

VP gates are the commands in `AGENTS.md` §4 and the queue's definition of done below; they run
alongside the repository gates owned by `packages/agent/TESTING.md`. The mutation gate is launched
only with separate manual authorization, VP lanes never touch frozen measurements, and
`local:candidate`/`ci` are not launched outside the delivery lane.

| Risk | Consequence | Safeguard |
|---|---|---|
| The VP catalog is read as a second registry | Two activation paths | One activation engine, a mapping test, and a runtime request instead of a local fork |
| `vp-setup` writes into the agent package | Template damage and consumer contamination | Read-only access to installed paths plus a managed block in the project-owned surface |
| The design relies on `.vida`, which does not exist | Stages 4 and 7 do not run | Target the current v1 config; `.vida` is a separate cutover track (D7) |
| Scope drifts into neighboring products | Silent methodology substitution | Explicit inheritance, a conflict becomes a question, Stage 4 ACs |
| The Runtime mode is blocked by the storage GAP | Integration stays unproven | 7a does not depend on the GAP; 7b is a separate gate |
| A host hook trust GAP | `vp-setup` is not activated | Record the GAP, never bypass it; the host matrix shows the limitation |
| The Decision Provider is unavailable | Undefined behavior | Provider-neutral interface plus the mandatory Agent Fallback (D5) |

# Deferred product questions

The CAT-D1, CAT-D2, CAT-D5, CAT-D6 and CAT-D7 deferrals, with their SR/AC state, are owned by the
[deferred decisions table](traceability.md#deferred-decisions-cat-d--srac); this queue does not
restate them.

Four owner decisions outside this queue were recorded in `.agent-archive-20261113/work/vp-next-steps/WORK.md`
("The open items that are not this work"). All four were answered on 2026-10-30: `Deprecated` is a
valid ADR status and stays unlocked; the `approval-policy` marker stays a topic tag while group
membership comes from the profile alternatives; the D12 §4 wording is accepted as written; and the
context-degradation pair became the `context-degradation-policy` user-decision group.

# Owner-gated scope — Step H content extension

Step H (D14/D15) is tracked as a separate owner-gated scope. H1 source admission uses the D18 blind three-protocol panel; other source review and packet sign-off remain manual. A complete attribution record needs no question.

**Owner decisions (2026-11-03):**

1. Wondelai is allowed for **general methods plus selected product/business methods**.
2. The first pilot is **25 candidate files**.
3. The **1,434 normative CSV rows** are taken later, after H1, as H2 work; they are not part of H1.
4. **No typed reference family** is admitted now; H3 stays deferred.
5. The H1 human fidelity/owner-admission loop is **replaced** by three blind Codex Luna reviewers (V3 Delphi, V2 Adversarial, V4 Party chat) plus orchestrator aggregation (D18). The aggregation is the admission decision for the exact H1 subset; it is delegated model review, not human fidelity.

These decisions set scope, not per-source admission. The owner approved the proposed 8/9/8 pilot set on 2026-11-03 for preparation only; it is not admitted. AC-47 to AC-58 stay open until per-source attribution, D18 panel/aggregation receipts and the delegated gate path exist. AC-59 was accepted by the owner on 2026-11-06. H1 preparation may proceed; dependent conversion stays blocked at each packet.

**Step H current state (2026-11-10):** H1 AC-59 is accepted; the 25-file pilot is the accepted baseline for scaling the D18 admission method. The H2 contract is approved and tracked as [D56](decisions/D56-h2-contract.md). All 8 H2 Markdown families are admitted as source admission only, 98 instructions total. H2 implementation covers the v2 schemas, applicability, CSV intake, fidelity validation, CLI context flags and the applicator; Node runtime evidence is recorded and Deno is excluded by owner decision. The H2-B coverage gate is closed at 100% functions and lines. The H2-A source gate is closed: donor `uupm` is pinned at `56ea9cf1`, 24 CSVs are allowlisted and all 1,434 rows are mapped. 481 UX/performance/stack rows are admitted (99 non-Mobile KEEP_ATOMIC, 7 Mobile KEEP_ATOMIC, 44 react-performance, 107 KEEP_ATOMIC react/react-native stack, 211 KEEP_ATOMIC angular/astro/avalonia/flutter stack rows and 13 SPLIT rows materialized as singletons) with delegated D18 receipts; 944 rows remain deferred and 9 stack rows are rejected as duplicates. `Touch Target Size` is resolved by SPLIT; `Readable Font Size` stays held pending an owner-approved `mobile` applicability token. The SPLIT contract is implemented in Source (D56 amendment, v3 map/v2 receipt shape, validator tests) and the live map is `VPCorpusMap/v3`; the v3 migration and all 12 prepared SPLIT rows are applied (batch 34; catalog 1,515). The remaining 8 stack SPLIT rows plus 935 undispositioned stack rows are still open. CSV semantic admission for the remaining rows and H2 acceptance remain open. H3 remains gated by H2 acceptance. H2 does not inherit H1 acceptance.

# Key decisions of the queue

- **Current package gate state (2026-11-10):** the owner-selected Powers pin is Bun 1.4.4. The canonical package suite records 995 passed, five expected Windows skips, zero failures; strict typecheck passes; the corpus check reports 1,515 catalog carriers with zero issues, of which 682 are modules holding 2,946 atoms, 332 are non-CSV singletons and 501 are CSV entries; catalog revision 8,036; corpus map 5,755 (3,429 records, `VPCorpusMap/v3`) with 502 CSV bindings and matching fidelity receipts; baseline 9 donors / 1,258 files; OKF and documentation checks pass. The coverage gate passes at 100.00% functions and 100.00% lines under the unchanged 1.0 threshold. The 2026-11-06 retrieval hardening adds relevance-ranked `tags --query`, `confidence`/`runnerUp`/`patternSource`, an `ambiguous:` line, `search --for --strict` exit 3, a discovery-only note and English/Ukrainian requirements aliases; the benchmark holds 68 recorded cases plus one split-intent ambiguity case. H2-A2 has 481 admitted CSV rows (99 non-Mobile KEEP_ATOMIC, 7 Mobile, 44 react-performance, 107 react/react-native stack, 211 angular/astro/avalonia/flutter stack and 13 SPLIT rows), 944 deferred rows (943 stack + 1 held UX) and 9 rejected duplicate rows. The 2026-11-09 module update path adds prepared plan/apply/verify/rollback for a changed packaged atom with AC-91 component evidence. The 2026-11-10 H2-A2 work adds the exact code-point subspan contract (v3 map/v2 receipt shapes, validator tests), the v3 migration and the owner-approved staged SPLIT apply (batch 34: 31 singletons). These are component evidence only. The repository `lint:knip:pinned` gate remains **not green**: it exits 1 with JSON `issues: []` and a config hint for the Agent `knip.config.ts` self-entry. Removing that entry fixes the pinned gate but makes the pre-commit hook report the config file as unused; the entry is restored. This is an unresolved external gate conflict, not a Powers PASS. Earlier test and coverage receipts remain historical for their inputs. F caller qualification, real donor admission, delivery and Runtime acceptance remain separate open gates.

- **B before C:** the S-documents fix the contract of `catalog.*` and of the profile; the code implements
  an already approved contract, not an assumption.
- **C before D:** the catalog format is verified on an empty/smallest set
  before scaling to the donors.
- **D began as a vertical slice:** superpowers proved the pipeline
  inventory → instructions → tags → dedup → provenance. The same exit criteria were
  then applied to all eight donors: superpowers, ponytail, matt-skills, addy-skills,
  bmad-method, pstack, gsd-core and open-knowledge-format.
- **E after D:** the skills consume the catalog; first — a proven catalog.
- **F in parallel with E** (different files: `docs/work/` and `skills/`), but one writer per
  file.
- **G is outside Powers:** the D3/D8 Agent-runtime request and its handoff are owned by
  the Agent runtime developer. Powers retains the historical request/Work Item as handoff
  evidence only and does not own sending, admission or runtime implementation.
- **H is phased after the current core closeout:** H1 uses the Markdown pipeline with source attribution and the D18 panel aggregation; H2 owns engineering/UX applicability and CSV cell mapping; H3 adds typed resources only after H2. No estimates or earlier phase receipts close a later gate.
- **2026-10-25 scope reconciliation:** D14/BR-22/SR-81/AC-47 now include individually selected product/business methods. SR-88–SR-91 and AC-56–AC-59 govern source packets, D18 panel admission for H1, prepared publication/recovery and matched measurement. [Step H](task-plan-step-h.md#source-packet-and-publication-qualification) owns the execution order and current evidence pointer. Raw capture and synthetic qualification do not close the admitted H1 pilot.

# Requirements for the first TS file (A0 gate)

1. `packages/powers` is **not** part of the workspace of the root package → `bun run --cwd packages/powers test`
   must work on its own `package.json` and its own `bunfig.toml`.
2. The agent's knip scans the repository as a whole; a workspace for `packages/powers` has been added
   (owner decision, D9 rev 2): `packages/agent/knip.config.ts`, the block `packages/powers`
   with `entry: ['scripts/*.ts', ...tests]`, `project: [codeFiles]`, `ignoreBinaries: ['check']`;
   the `.tmp` scratch directory is excluded by `.gitignore` itself; the pattern `skills/*/scripts/*.ts`
   is added at step E, when the skills directory appears (otherwise knip gives a config hint).
   Confirmation of the risk by an actual run: `bun run --cwd packages/agent
   lint:knip:pinned` — **executed 2026-10-19**, `{"issues":[]}`, exit 0.
3. If the run reveals other remarks (e.g. "unlisted binary" for `bun`), the decision is
   a pinpoint edit of the `packages/powers` block in the knip config (owner exception D9 rev 2).
4. VP tests must not depend on the agent's dependencies; the standard Bun library
   and local modules.

# Files of the queue (all in `packages/powers/`)

| Path | Responsibility | Step |
|---|---|---|
| `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml` | The package skeleton, mirrors the conventions of `packages/agent` | A |
| `skills/vp-mode/scripts/catalog.ts` | The `catalog.*` operations + `decision.evaluate` | C |
| `scripts/convert.ts` | The donor → catalog converter | D |
| `scripts/check-corpus.ts` | Corpus check: tags, provenance, dedup, coverage | D |
| `scripts/check-okf.ts` | Check of the OKF compatibility of the bundle (already created) | existing |
| `config/vpcatalog.v1.schema.json`, `config/vpinstruction.v1.schema.json`, `config/vpeffectiveprofile.v1.schema.json`, `config/vpcorpusmap.v1.schema.json` | VP schemas | C |
| `catalog.json` | Catalog manifest: identity, tag vocabulary, aliases, corpus listing with `sha256` | C |
| `corpus-map.json` | Processing map: donor + file → converted/split/merged/rejected | D |
| `instructions/` | Canonical instructions: `.md` + metadata, flat | D |
| `skills/vida-bootstrap/`, `skills/vp-mode/SKILL.md`, `skills/vp-setup/SKILL.md` and their `scripts/` | Project-document role bootstrap plus orchestration and setup skills with their tooling | C, D, E |
| `docs/task-plan-step-h.md` | Phased D14/D15 plan with H0-H3 gates | H |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Per-host plugin/marketplace manifests | E |
| `docs/work/` | VP Work Items (OKF concepts) | F |
| `docs/requests/` | Historical Agent-runtime handoff evidence; not an active Powers surface | — |
| `docs/business-requirements.md`, `docs/system-specification.md`, `docs/acceptance.md` | Product canonical documents | B |
| `tests/` | Bun tests of the VP harness | A–F |

# Deferred dependencies (outside the current scope)

| Dependency | Blocks | Status |
|---|---|---|
| Registration in the root files (sidecar, config, doc-policy, products.map, README, knip, root package.json) | VP Runtime mode, CI, inclusion in the documentation policy | Deferred (D9) |
| Runtime request D3+D8: extended instruction registry and profile reading | Agent-runtime owner; not a Powers active dependency | Historical handoff evidence only |
| Cutover of `.vida/*` | Runtime mode with the target layout | External runtime track |
| A public Git repository for the marketplace | Channel 3 | Requires an owner decision |

# Definition of done for the queue

The original A-G queue is considered closed when: (1) the eight existing donors have been
processed, the corpus contains 2513 instructions and the map contains 2839 file records
(`check-corpus.ts` → exit 0); (2) `catalog.*` and `decision.evaluate` have tests and work
without Runtime; (3) `vp-mode` and `vp-setup` install locally and idempotently, while `vida-bootstrap` remains a project-document entry until host delivery is authorized; (4) a VP
Work Item has AC and evidence; (5) `check-okf.ts` and repository documentation checks
pass; and (6) `docs/log.md` records the changes. The D3+D8 Agent-runtime request is
owned by the Agent runtime developer and is not a Powers closure condition.
Step H is a separate accepted scope extension. It is complete only under the H0-H3 definition
in `task-plan-step-h.md`; accepting D14/D15 does not close those implementation gates.

## D16 instruction organization

The owner authorized stable canonical files with independent form/domain facets. [D16](decisions/D16-faceted-instruction-browse.md), BR-24 and [SR-92](system-specification.md#15-faceted-instruction-metadata-d16) own the contract; AC-60–AC-64 carry component evidence, and the current v1.2 re-binding of the frozen trial remains the only open D16 step.

1. Frozen 40-ID sample, 24 selectors and relevance judgments: captured. Old-code baseline: 30 fresh-process runs and 2,839 warm queries; same-input three-structure prototype: captured. Beam accepted the exact evidence as READY_AS_OLD_CODE_BASELINE_AND_STRUCTURE_PROTOTYPE. Retained evidence: packages/powers/.tmp/panel/donor-migration-architecture-20261025/instruction-organization-20261026/implementation-r1/baseline-prototype-root-r3/. These results establish no speedup or full-corpus recall.
2. The historical v1.1 schema/reader, optional filters, generated browse, opt-in strict corpus check and converter-owned metadata staging were Root-qualified and independently reviewed by Beam for their bound inputs. The historical converter milestone passed 564 tests with one expected Windows skip and zero failures, with 100% functions/lines. Luna's isolated trial tools were prepared, but Root's static preflight review was NOT_READY: one inherited D16 binding was stale, await expressions occurred in parameter defaults, and the before-state check compared legacy classification with future assignments. No tool mode, fixture or trial batch was executed in that attempt. The frozen measurement that did run keeps its v1.1 binding and reports INCONCLUSIVE timings; current v1.2 Source and migration require a fresh binding before any new performance or quality claim.
3. The prepared 40-ID treatment is retained with its query, label, judgment and timing bindings (AC-64, component). A v1.2 re-binding runs only before a new matched-comparison claim; it is not a prerequisite for the migrated corpus or the compact CLI.
4. Corpus classification is complete for the pre-pilot corpus: all 3,278 IDs are v1.2, 2,439 are classified with form and at least one domain, and 839 carry an explicit unclassified reason (90 prior plus the 10 clean-code, 11 pragmatic-programmer, 11 ddia-systems, 10 domain-driven-design, 10 software-design-philosophy, 10 refactoring-patterns, 10 working-with-legacy-code, 10 system-design, 10 continuous-discovery, 10 inspired-product, 11 jobs-to-be-done, 10 mom-test, 21 lean-startup, 10 lean-ux, 23 ux-heuristics, 19 design-everyday-things, 12 refactoring-ui, 12 obviously-awesome, 13 crossing-the-chasm, 9 good-strategy-bad-strategy, 11 blue-ocean-strategy, 15 one-page-marketing, 14 storybrand-messaging and 15 made-to-stick pilot instructions). AC-60-AC-63 carry component evidence; the strict corpus check reports zero issues.
5. Root publishes only the qualified reviewed Source. Formation, installation and attributable Runtime acceptance remain separate. H1 source-attribution, fidelity, admission and pilot gates remain unchanged.

## Owner-requested retrieval workflow refinement

The owner refined the instruction-discovery workflow on 2026-10-26: vp-mode must explain how tasks become search terms and canonical tags; list-valued CLI flags accept one occurrence such as --query pr review and --id A B; lists return ID plus description; applicable results are deduplicated by canonical identity; all chosen texts are fetched together; opposing instructions retain declared profile/compatibility handling. Direction, capability, pattern, form and context remain separate axes. Root .tmp snapshots are explicit source selections, not an implicit union with production.

The current derived design is RETRIEVAL-DESIGN-r3.md with VP-MODE-ROUTING-PROPOSAL-r3.md; the executable task plan is RETRIEVAL-IMPLEMENTATION-PLAN-r1.md, all under packages/powers/.tmp/panel/donor-migration-architecture-20261025/instruction-organization-20261026/implementation-r1/. These are implementation inputs, not replacements for canonical B/S. BR-24/SR-93 now reconcile the compact CLI projection while preserving the existing library APIs and frozen sample outputs.

Current Source implements compact discovery, profile-aware search, approach selection and explanation, and compose-backed multi-ID text retrieval. The 598-test coverage gate, 24/24 metadata queries, corpus checks and real-corpus exercise are historical evidence for their bound inputs. The current reader and checker accept v1.2 only; all 2,510 catalog instructions have been migrated. The strict corpus check reports zero issues; AC-65–AC-69 and Runtime acceptance remain separate.

**2026-11-06 retrieval hardening:** `tags --query` now ranks exact/name/alias/
description matches and an earlier tag-name token; `resolveIntent` reports
`confidence`, `runnerUp` and `patternSource`; `search --for` prints `ambiguous:`
and labels a frequency pattern `(default for capability)`; `--strict` exits 3 on
a weak or ambiguous resolution; unprofiled search prints `discovery only`; the
pagination hint names `tags --query`. Catalog revision 7,348 adds English and
Ukrainian requirements aliases and ADR/runbook aliases; `AGENT.sidecar.md`
records the project retrieval chain. The benchmark held 68 recorded cases at the 2026-11-06 input, plus one
split-intent ambiguity case; that package suite was 884 pass / 4 skip / 0 fail
with 100% functions and lines. AC-70–AC-72 evidence is reconciled in
`acceptance.md`; installation and Runtime acceptance remain separate.

On 2026-10-30 the same Source state records 659 passed with four expected Windows skips, zero failures and 693/693 functions plus 5,402/5,402 lines (seed 20261019); the 598-test receipt stays historical.

1. **2026-10-30:** the completed v1.2 migration evidence is reconciled and the package gates pass (see the current gate state above). The step stays open for one reason only: the repository Knip gate fails on `packages/agent` research files that D9 places outside this scope, so its repair needs a separate owner request. Legacy records are not readable through the current v1.2-only reader.
2. A v1.2 re-binding of the frozen 40-ID classification treatment runs only before a new matched-comparison claim; retain the original failed/prepared tools and reconcile changed bindings explicitly.
3. Keep the existing library inspection/diagnostic APIs, profile/conflict owner, atomic errors, dependency closure and session limits intact during publication.
4. Preserve the documented task-evidence routing and real CLI examples; Source publication does not establish installed skill activation or Runtime acceptance.
5. Measure the reference route, then compare optional BM25 metadata ranking only if demonstrated retrieval misses justify it. No speedup, semantic-confidence or ranking winner is assumed.
6. The separately frozen 40-ID trial stays retained under its v1.1 binding; a v1.2 re-binding and matched comparison happen only before a new claim. Corpus classification is complete and is not a prerequisite for basic CLI work; this does not close H1, source admission, installation or Runtime gates.

Inactive-alternative dependency substitution uses the declared instruction mapping instead of the first tag carrier. Historical focused tests and corpus audit remain bound to their inputs; the audit observed 21 dependency edges, none activating substitution between then-current declared alternatives. Follow-ups remain open: define cross-group substitution semantics before expanding it and qualify current checker/profile integration. Package-wide qualification and Runtime acceptance remain separate.

The owner explicitly authorized execution: complete CLI, library and skill improvements first, then continue donor work. Preserve Luna implementation / Root integration and native checks. For every new independent validation, first try an approved free model (DeepSeek V4.1 Flash Free, Beam Free or Nemotron 3 Ultra Free); on availability/quota refusal make at most one DeepSeek V4.1 Flash fallback. The owner connected OpenCode Go and enabled Global; its verified route is opencode-go/deepseek-v4.1-flash, distinct from the opencode route that rejected insufficient balance. The next validation starts free again. A substantive NOT_READY finding requires repair, not fallback bypass. Keep measured snapshots immutable and requalify changed inputs without relabeling historical proof.

* **Gate count after skill-contract tests:** The README §6 test gating note directs to docs/log.md for the current gate state. After running , the gate count reflects the latest test results and contract verification status.
