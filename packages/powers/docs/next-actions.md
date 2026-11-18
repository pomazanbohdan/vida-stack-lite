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
revision: '59'
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
This packet recorded pinned Knip exit 1 for the Agent configuration self-entry. The current disposition is tracked in the remaining-work queue.

The Powers writer stays within `packages/powers/` (D9). The current owner
instruction separately authorizes Root to adopt the documents through
`AGENT.sidecar.md` and `vida-project-profile.json`. Root AGENTS, runtime
templates/configuration and native host delivery are outside this packet.

## Open task list (refreshed 2026-11-18)

### Remaining work authority (2026-11-18)

This is the current remaining-work queue for 2026-11-18. It records state and gates only: no row grants task authorization, owner acceptance, CAS apply, commit, installation, publication or Runtime acceptance. Closed evidence stays closed: P0 is technically closed, H2 is owner-accepted with AC-82/AC-83 verified, and H3-A through H3-L are owner-accepted. H3-M `colors.csv` rows 26–75 are committed at `ed5062a3` (`powers: integrate H3-M and compact CLI reports`) after the integrated proof `.tmp/integrated-h3m-cli-proof/receipt.json`: frozen suite 1,120 pass / 5 skip / 0 fail, same-input `check:manifests` stdout 122 B compact vs 1,025,524 B `--verbose` (9,166 outputs) and `check-okf` 233 B vs 5,117 B `--verbose` (77 documents), corpus 2,402 instructions and vector 52 batches; the default manifest-test reproducibility drift is closed by a hermetic test and no token/time claim is made. H3-N `colors.csv` rows 76–100 (owner instruction "Затвердити й застосувати 25 палітр") are owner-approved, applied and independently validated on 25 records: live catalog revision 8,069 (`b5a237d2…`, 2,402 instructions, 399 typed resources) and corpus-map revision 5,788 (`d2833fc6…`); `colors.csv` is 100 admitted / 92 deferred with rows 101–125 next; H3-N is committed at `b5370b0b` (`Update Agent runtime and Powers resources`) with the live catalog at 399 typed resources. H3-N apply result `.tmp/h3n-r25-apply-evidence/result.json` SHA-256 `8697c77c…0172`, D18 r25 aggregation `d5027460…` (50 accept / 25 v4-manual on missing canonical-digest recompute, resolved by Root's 25 digest checks and owner 25/25 approval), Pi READY, corpus 2,402 / vector 52; the original 50-record `.tmp/h3n-palette-wave-2/` staging stays retained fallback history. Frozen package proof r2 `.tmp/h3n-frozen-package-proof-r2/receipt.json` recorded 1,152 pass / 5 skip / 0 fail with 100% line and function coverage. Manifests, static checks and pinned Knip passed. Both Agent fixes are committed at `34bf2dc3` after the full Git hook passed. AC-44 and AC-81 stay open within their recorded scope. The AC-ledger evidence reconciliation and the D58 AC-84/AC-85 evidence reconciliation are recorded closed 2026-11-18 in `acceptance.md` (historical rev 27); AC-47/AC-57 H1 sign-off and bounded AC-50 remain open owner follow-ups.

Authorities: [detailed evidence entries](#open-task-list-refreshed-2026-11-18), [E5/Stage 8 delivery status](#delivery-target-status-e5ae5b), [Step H owner-gated scope](#owner-gated-scope--step-h-content-extension), [key queue decisions](#key-decisions-of-the-queue), [D16](#d16-instruction-organization), [deferred dependencies](#deferred-dependencies-outside-the-current-scope), [definition of done](#definition-of-done-for-the-queue).

#### Executable engineering follow-up

| Priority | Track | State | Owner | Size | Dependency | Completion condition |
|---|---|---|---|---|---|---|
| P1 | D-S8-5 formal frozen-input package receipt | Frozen proof r2 `.tmp/h3n-frozen-package-proof-r2/receipt.json` passed the suite, coverage, typecheck, format, corpus, vector, OKF, manifests and strict pinned Knip. The Agent fixes are committed at `34bf2dc3` after the full Git hook passed. Documentation-only manifest rebind is recorded separately. | Vida Powers engineering | M | Stable package inputs for the approved D-S8-1 targets; external Knip disposition | Record the exact package inputs and applicable check results in the formal receipt. Retain the P0-r2 suite (1,115 pass / 5 skip / 0 fail) as separate technical evidence. D-S8-4 host evidence is tracked independently |
| P2 | D19/AC-81 call-site, execution, notification and digest wiring | Component authority and digest passed Pi review. The registry-denial regression closes the D19 line-334 coverage gap in `.tmp/h3n-frozen-package-proof-r2/receipt.json` (1,152 pass / 5 skip / 0 fail and 100% line/function coverage). H1 wiring, authenticated dispatch, notification and source-line adjudication remain open. | Vida Powers engineering | M | Bounded scope approval | Call sites wired and per-decision digest/notification implemented, tested and receipted, or explicitly deferred by owner decision |
| P2 | F/AC-22 plus AC-34/AC-44 engineering acceptance evidence | AC-22 partial — real scratch replay recorded (1 row / 3,483 bytes, byte-identical replay, Pi READY); semantic dedup and Runtime stay open. AC-34 declared-risk audit component evidence (103 pass / 0 fail, Pi READY) with classification provenance still declared and no approval. AC-44 has explicit-heading diagnostic evidence in frozen proof r2. Other severity formats and donor-criteria fidelity remain open | Vida Powers engineering | M | Bounded assignment; existing F findings/artifacts surfaces | Real finding event/semantic dedup evidence plus automated risk/severity classification, or explicit owner deferral; classified as engineering acceptance follow-up, not new authorization |
| P3 | Default-root manifest test reproducibility | CLOSED 2026-11-18 at `ed5062a3`: the default-root manifest check runs against hermetic tracked/fixture inputs; the earlier gitignored-formations drift is resolved | Vida Powers engineering | S | — | Closed by the hermetic test in the H3-M/compact-CLI commit; no further action |

#### Owner-gated

| Priority | Track | State | Owner | Size | Dependency | Completion condition |
|---|---|---|---|---|---|---|
| P1 | H3-M post-apply closeout | CLOSED 2026-11-18 at commit `ed5062a3` (`powers: integrate H3-M and compact CLI reports`): integrated proof `.tmp/integrated-h3m-cli-proof/receipt.json` records frozen suite 1,120 pass / 5 skip / 0 fail, same-input `check:manifests` 122 B compact vs 1,025,524 B `--verbose` and `check-okf` 233 B vs 5,117 B `--verbose`, corpus 2,402 / vector 52; live catalog 8,069/map 5,788 after H3-N | Root owns commit; Vida Powers engineering owns suite/manifest evidence | M | — | Closed: suite/manifest evidence integrated and committed at `ed5062a3`; no Runtime claim and no next-wave admission |
| P1 | D-S8-4 live host-session and second-host scope decision | Stage 8 dated run evidence covers four install-target rows (portable/opencode/pi/codex local/CLI paths) on one Windows host. Live agent sessions remain unverified | Vida Powers owner | M | Owner scope decision | The owner decides whether to require live agent sessions and second-host or OS evidence, or approves a reduced scope. Record native installs and live discovery for the approved matrix |
| P1 | `colors.csv` waves 3–6 | Owner-gated sequential scope after H3-N (rows 76–100 committed at `b5370b0b`): rows 101–125, 126–150, 151–175 and 176–192 (25/25/25/17), each requiring its own approval; 92 deferred rows remain | Vida Powers owner | L | H3-N applied; per-wave staged evidence | Each wave is staged, reviewed, explicitly accepted and applied, or explicitly stopped; after final wave `colors.csv` is fully dispositioned |
| P1 | H1 designated packet/attribution/SR-81/89/90/100 evidence sign-off | Live Wondelai map recount: 421 file entries, 56 split to 749 unique instruction IDs, 365 rejected, zero pending selection; `donors.yaml` supports. Older 25-file/297-instruction and selected-text wording is historical; the reconciled ledger binds this sign-off to AC-47/AC-57 | Vida Powers owner/manual gate | L | Per-source attribution/spec/packet evidence | Designated packet/attribution/SR-81/89/90/100 evidence sign-off complete or explicitly blocked; no blanket new conversion or reopening excluded files |
| P2 | AC-50 bounded D57/H2 evidence owner decision | Open: the H2-D receipt and D57 delegated review supply scoped phase/fidelity evidence and H2 owner acceptance is recorded separately for AC-82/AC-83, but no exact owner decision closes AC-50 | Vida Powers owner | S | H2-D receipt `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H2D-RECEIPT.md`, D57 delegated review | Owner decides whether the bounded H2 evidence closes AC-50 or records the remaining gap; no new conversion inferred |
| P2 | Delivery owner inputs: native host installation, AC-27 host capabilities, AC-28 Node evidence reconciliation, public metadata and D-S8-3 channel | Manifest outputs exist for six D-S8-1 targets; public metadata values and publication channel need owner; existing Node v26.13.1 smoke is limited | Vida Powers owner/Root | M | Owner values/decisions and host evidence | Owner supplies metadata/channel decision; host capabilities and Node evidence reconciled without data guesses; installation/publication evidence recorded separately |
| P2 | Unmapped UUPM families and `poteto-plugins` | Six families (`charts`, `motion`, `landing`, `products`, `ui-reasoning`, `google-fonts`) need classification/fit/attribution; `poteto-plugins` is an unpinned approval candidate with no active pin | Vida Powers owner | L | Owner scope decision and donor/source evidence | Owner-approved classification/fit/attribution plan and any admitted subset has receipts, or explicit rejection; no blanket conversion |

#### Conditional

| Priority | Track | State | Owner | Size | Dependency | Completion condition |
|---|---|---|---|---|---|---|
| P3 | D16 v1.2 trial rebind | Frozen 40-ID trial remains v1.1-bound; rebind only before a new matched-comparison claim | Vida Powers engineering | S | New comparison claim | Fresh binding/run precedes any new claim, or no action |
| P3 | D59 module packaging extension to 468 CSV atoms | Not authorized by current D59 acceptance | Vida Powers owner + engineering | L | Separate owner approval | Approved bounded plan/apply/receipts exist, or scope remains deferred |
| P3 | CAT-D6 mutation gate and unresolved setup approval/context policy choices | Owner/conditional decisions; CAT-D1/D2/D5/D7 chosen v1 modes are not current coding backlog | Vida Powers owner | M | Owner decisions | Decisions recorded; no coding backlog inferred |

#### External / Agent-owned

| Priority | Track | State | Owner | Size | Dependency | Completion condition |
|---|---|---|---|---|---|---|
| P1 | Runtime/AC-37/AC-39 and `.vida` cutover | Separate Agent-owned runtime track; no Powers release/Runtime claim | Agent runtime owner | L | Agent runtime owner | Runtime acceptance/cutover evidence by owner; Powers remains component/source owner only |

Sizes S/M/L are relative planning estimates for queue ordering, not
commitments. Rows whose completion requires an owner decision or approval
are deferred until that decision is recorded; they are not executable
engineering work today.

Current order and gates:

- **P0 — product test gate (TECHNICALLY CLOSED 2026-11-18).** The
  evidence-backed full `bun run --cwd packages/powers test` gate is
  green: `TestReceipt/v1` `.tmp/p0-full-proof-r2/receipt.json`
  (assignment `powers-20261118-p0-full-proof-r2`, HEAD `99c0c1f9`,
  Bun 1.4.4, seed 20261019) records 1,115 pass / 5 skip / 0 fail —
  1,120 tests across 57 files, 5,563 expectations, 697.34 s, exit 0 —
  with typecheck (117 files), `format:check`, `check-corpus`
  (`issues: []`, 2,402 instructions), `check-vector` (52 batches) and
  `check-okf` (`failures: []`, `warnings: []`) all exit 0 and 20/20
  SHA-256 binds matched. The earlier `.tmp/p0-full-proof/` r1 run was
  red on an `sbvf-admission.test.ts` timeout; scoped timeout fixes on
  three tests strictly preserving assertions (the SBVF test keeps its
  existing CRLF) produced the green r2. This is technical closure of
  the test gate only — not H3-L owner acceptance, not a commit and
  not Runtime acceptance.
- **P1 — H3-L owner gate (CLOSED 2026-11-18).** H3-L rows 76–88 are
  owner-accepted via bound receipt
  `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3L-RECEIPT.md`;
  `styles.csv` is fully dispositioned (88/88 admitted, 0 deferred).
  The retained failing suite runs stay historic evidence; the green
  suite is `.tmp/p0-full-proof-r2/` (`TestReceipt/v1`, 1,115 pass /
  5 skip / 0 fail). The H3-L commit `efb62665` is observed; further
  integration remains Root-owned.
- **P2 — H3 `colors.csv` wave plan (H3-M committed at `ed5062a3`; H3-N committed at `b5370b0b`; later waves owner-gated).** Live catalog rev 8,069/map 5,788 keeps `colors.csv` at 100 admitted / 92 deferred: H3-M rows 26–75 (physical lines 27–76) were applied as 50 `uupm-palette-*` `VPReferenceResource/v1` records and committed at `ed5062a3` with the integrated proof `.tmp/integrated-h3m-cli-proof/receipt.json` (frozen suite 1,120 pass / 5 skip / 0 fail; same-input `check:manifests` stdout 122 B compact vs 1,025,524 B `--verbose`, `check-okf` 233 B vs 5,117 B `--verbose`; hermetic manifest-test reproducibility; no token/time claim), and H3-N rows 76–100 (physical lines 77–101) were owner-approved ("Затвердити й застосувати 25 палітр"), applied as 25 more records and independently validated — apply result `.tmp/h3n-r25-apply-evidence/result.json` SHA-256 `8697c77c…0172`, D18 r25 aggregation `d5027460…` (50 accept / 25 v4-manual on missing canonical-digest recompute, resolved by Root's 25 digest checks and owner 25/25 approval), Pi READY, corpus 2,402 / vector 52; the original 50-record `.tmp/h3n-palette-wave-2/` staging stays retained fallback history. H3-M bound evidence is `.tmp/h3m-palette-wave-1/` plus `.tmp/h3m-apply-evidence/result.json` and `H3M-RECEIPT.md` (D18 150/150 accept, staged audit/CLI clean, Pi/GPT-6 Luna READY, live-vs-staged envelopes equal except `updated_at`). Rows 101–125, 126–150, 151–175 and 176–192 (25/25/25/17) proceed only as later owner-gated waves. H3-N is committed at `b5370b0b` (399 live typed resources, 100 admitted / 92 deferred); the separate D19/AC-44 worktree changes await the full package rerun and Root commit. Six unmapped UUPM families and unpinned `poteto-plugins` stay gated.

Parallel open tracks are consolidated in [Remaining work authority](#remaining-work-authority-2026-11-18): H1 designated sign-off (AC-47/AC-57) and bounded AC-50 owner decision, D19/F/AC-34/AC-44 follow-up (manifest reproducibility closed at `ed5062a3`; frozen package proof r2 1,152/5/0 with 100% line and function coverage), D-S8-4/D-S8-5 delivery qualification and owner metadata/channel, H3-N committed at `b5370b0b` and later `colors.csv` waves, unmapped UUPM families/`poteto-plugins`, conditional D16/D59/CAT work, and external Agent/runtime dependencies. Runtime acceptance stays outside Powers. The detailed evidence entries follow:

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
   At that stage the remaining closeout was the full product test suite +
   format/OKF checks, final audit and commit decision; P0-r2 and H2-D owner
   acceptance later closed that technical/acceptance evidence while commit
   stayed Root-owned. Per-batch
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
      + receipt/evidence realpath containment. The then-remaining
      closeout was the full product test suite + format/OKF + final
      audit + commit decision; P0-r2 and H2-D owner acceptance later
      closed that technical/acceptance evidence while commit stayed
      Root-owned. Per-batch
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
   receipts). The pinned Knip external conflict remains open (item 19)
   and is not claimed PASS.

   The H3 wave entries below are chronological. Their per-wave
   "remaining admission gate" lists are historical for their wave dates;
   current remaining H3 scope is recorded in the 2026-11-18 authority
   section above and in item 14.
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
   open (item 19) and is not claimed PASS. AC-52/AC-54/AC-55 are
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
   (item 19) and is not claimed PASS. AC-52/AC-54/AC-55 keep
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
   (item 19) and is not claimed PASS. AC-52/AC-54/AC-55 keep
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
   external conflict remains open (item 19) and is not claimed
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
   external conflict remains open (item 19) and is not claimed
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
   the pinned Knip external conflict remains open (item 19) and
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
    conflict remains open (item 19) and is not claimed PASS.
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
    conflict remains open (item 19) and is not claimed PASS.
    AC-52/AC-54/AC-55 keep `verified (component)` scope.
    **Remaining H3 scope (each needs a separate owner-approved
    admission gate):** icons.csv rows 76–105 (30 rows — final
    wave), the deferred rows of `typography.csv` (49),
    `colors.csv` (167) and `styles.csv` (63) — 309 rows total —
    and the remaining uupm data families (`charts.csv`,
    `motion.csv`, `landing.csv`, `products.csv`,
    `ui-reasoning.csv`, `google-fonts.csv`);
    `poteto-plugins` remains unpinned in donors.yaml.
12. **H3-I — `icon-list` wave-4 pilot (ACCEPTED 2026-11-17).**
    icons.csv rows 76–105 admitted as 30 `uupm-icon-*`
    `VPReferenceResource/v1` records via the `--remainder
    --limit 30` bounded-wave mode — no code changes, the H3-G
    mechanism was reused (catalog rev 8064 `c65f3225…`, map rev
    5783 `84d42324…`; 212 typed resources live). **icons.csv is
    now fully dispositioned: 105/105 admitted, 0 deferred.**
    Independent Luna validation READY 0 findings; D18 delegated
    panel: 18 blind reviews (6 batches × 3 protocols),
    aggregation **30/30 accept — 0 amend / 0 reject / 0 manual**
    (four reviewers hit output token limits and were retried
    once each with an early-write instruction; the counted 18
    reviews are the successful attempts). Bound receipt
    `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3I-RECEIPT.md`
    with evidence `h3i-d18/`; gates — typecheck 117 files,
    format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
    exit 0, `build-manifests --check` ok; full `bun test`
    1,114 pass / 5 skip / 1 fail where the single failure is
    the known `build-manifests` concurrent-run flake (passes
    standalone); the pinned Knip external conflict remains open
    (item 19) and is not claimed PASS. AC-52/AC-54/AC-55 keep
    `verified (component)` scope.
    **Remaining H3 scope (each needs a separate owner-approved
    admission gate):** the deferred rows of `typography.csv`
    (49), `colors.csv` (167) and `styles.csv` (63) — 279 rows
    total — and the remaining uupm data families (`charts.csv`,
    `motion.csv`, `landing.csv`, `products.csv`,
    `ui-reasoning.csv`, `google-fonts.csv`);
    `poteto-plugins` remains unpinned in donors.yaml.
13. **H3-J — `font-pairing` wave-1 pilot (ACCEPTED 2026-11-17).**
    typography.csv rows 26–74 admitted as 49 `uupm-font-pairing-*`
    `VPReferenceResource/v1` records via the `--remainder --limit 49`
    bounded-wave mode — no code changes (catalog rev 8065
    `06aaf219…`, map rev 5784 `16b6988e…`; 261 typed
    resources live). Payload adds dual-source provenance:
    typography.csv row locator plus one google-font-licenses.json
    family locator per unique heading/body font, with
    `font_licenses` and `license_source` bindings. **typography.csv
    is now fully dispositioned: 74/74 admitted, 0 deferred.**
    Wave sizing follows the 2026-11-17 consilium (devin-a/b + Luna):
    50-record waves ordered typography → styles → colors,
    7 waves total, ~171 reviews; fallback to 25 on any
    amend/reject/manual or adjudication per family.
    Independent Luna validation READY 0 findings; D18 delegated
    panel: 30 blind reviews (10 batches × 3 protocols),
    aggregation raw 39 accept / 10 amend / 0 reject / 0 manual →
    **49/49 accept after orchestrator adjudication** of the 10
    `font_licenses` key-order amend verdicts (canonicalJson sorts
    object keys recursively for every record; member order is not
    semantic; first-seen Heading→Body order preserved in
    provenance and the name→license mapping). Nine reviewers
    hit output token limits and were retried (later retries
    script-driven via `h3j-d18/check-batch.ts`); the counted 30
    reviews are the successful attempts. Bound receipt
    `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3J-RECEIPT.md`
    with evidence `h3j-d18/`; gates — typecheck 117 files,
    format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
    exit 0, `build-manifests --check` ok; full `bun test`
    1,113 pass / 5 skip / 2 fail / 1 error where both failures
    are the deterministic `build-manifests.test.ts` default-root
    `--check` timeout (real check now ~39 s > test budget as the
    corpus grew — test-infrastructure debt, not a product
    defect); the pinned Knip external conflict remains open
    (item 19) and is not claimed PASS. AC-52/AC-54/AC-55 keep
    `verified (component)` scope.
    **Remaining H3 scope (each needs a separate owner-approved
    admission gate):** the deferred rows of `colors.csv` (167)
    and `styles.csv` (63) — 230 rows total — and the
    remaining uupm data families (`charts.csv`, `motion.csv`,
    `landing.csv`, `products.csv`, `ui-reasoning.csv`,
    `google-fonts.csv`); `poteto-plugins` remains unpinned in
    donors.yaml.
14. **H3-K/H3-L — `style` waves 1–2 (H3-K ACCEPTED 2026-11-17;
    H3-L ACCEPTED 2026-11-18).** H3-K rows 26–75 were admitted as 50
    `uupm-style-*` `VPReferenceResource/v1` records via the
    `--remainder --limit 50` bounded-wave mode — no code changes
    (catalog rev 8066 `70a451e5…`, map rev 5785 `840f3b26…`; 311 typed
    resources live). Payload is 28 verbatim string fields mapped
    positionally from styles.csv columns 1–28 (column `No`
    excluded); single styles.csv provenance locator per record.
    Independent hy4-flash-free validation READY 0 findings
    (owner-authorized substitute for the Luna seat); D18 delegated
    panel: 30 blind reviews (10 batches × 3 protocols), aggregation
    **50/50 accept — 0 amend / 0 reject / 0 manual** (no adjudication
    needed). Five reviewers hit output token limits and were retried
    script-driven via `h3k-d18/check-batch.ts`; the counted 30 reviews
    are the successful attempts. Bound receipt
    `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3K-RECEIPT.md`
    with evidence `h3k-d18/`; gates — typecheck 117 files,
    format/`check-corpus` (0 issues)/`check-vector`/`check-okf`
    exit 0, `build-manifests` regenerated + `--check` ok; full
    `bun test` 1,113 pass / 5 skip / 2 fail / 1 error (1,120 tests,
    57 files, 503.33 s): the retained `.tmp/h3k-test.log` shows one
    `tests/module-update.test.ts` unnamed beforeEach/afterEach hook
    timeout (6,684.80 ms) and one `tests/build-manifests.test.ts`
    actual-Bun-CLI timeout (5,013.15 ms), plus the post-timeout
    unhandled `expected exitCode 0, received 1` at
    `tests/build-manifests.test.ts:1753` — the same retained
    test-infrastructure debt pattern as H3-J while `--check`
    itself passes (`ok:true`); not claimed PASS. H3-K keeps
    AC-52/AC-54/AC-55 `verified (component)` scope.
    H3-L rows 76–88 were admitted as the final 13 `uupm-style-*`
    `VPReferenceResource/v1` records via the `--remainder`
    bounded-wave mode — no code changes (catalog rev 8067
    `b0404164…`, map rev 5786 `ca0bb810…`; 324 typed resources live;
    `styles.csv` fully dispositioned 88/88). Payload contract and
    provenance are identical to H3-K. Independent hy4-flash-free
    validation READY 0 findings (reported by the draft without a
    standalone retained artifact); D18 delegated panel evidence in
    `.tmp/h3l-d18/` has 9 blind reviews (3 batches × 3 protocols)
    and aggregation **13/13 accept — 39/39 verdicts accept, 0 amend
    / 0 reject / 0 manual** (one b3-delphi retry after an
    output-token limit). Deterministic verifiers `.tmp/h3l-verify.ts`
    and `.tmp/h3l-d18/verify.ts` report ALL CLEAN: 88/88 digests,
    payload verbatim, manifest/map/disk agreement and 13 wave IDs.
    Other gates — `typecheck` exit 0 (117 files), `format:check`
    exit 0, `check-corpus` exit 0 (`issues: []`, 2,402 instructions),
    `check-vector` exit 0 (52 batches), `check-okf` exit 0,
    `build-manifests` regenerated all six D-S8-1 formations +
    `--check` ok:true (Muse catalog readiness remains the pre-existing
    `MANIFEST_MUSE_CATALOG_NOT_READY`). Full suite:
    `TestReceipt/v1` `.tmp/p0-full-proof-r2/receipt.json` (SHA-256
    `77d33259…f6f0`, assignment `powers-20261118-p0-full-proof-r2`,
    HEAD `99c0c1f9`) records `bun test` 1,115 pass / 5 skip / 0 fail
    — 1,120 tests, 57 files, 5,563 expectations, 697.34 s, seed
    20261019, exit 0 — with 20/20 SHA-256 binds matched across the
    7 modified tracked files and 13 untracked H3-L resources. The
    earlier `.tmp/h3l-test.log` (1,113 pass / 5 skip / 2 fail /
    1 error) and `.tmp/p0-full-proof/` r1 stay retained historic
    evidence. **H3-L is owner-accepted 2026-11-18** via bound receipt
    `.agent-archive-20261113/work/h2-sbvf-option-b-20261106/H3L-RECEIPT.md`
    (finalized from `H3L-RECEIPT-DRAFT.md`, which stays preserved
    unchanged as frozen evidence); the same owner instruction
    authorized staging-only preparation of `colors.csv` rows 26–75;
    that H3-M wave has since been owner-approved, applied and
    independently validated (see `H3M-RECEIPT.md`).
    The product changes were uncommitted at HEAD `99c0c1f9` at
    evidence freeze; the commit is Root-owned and no commit is
    claimed here. The H3-L commit `efb62665` is now observed.
    H3-L keeps AC-52/AC-54/AC-55 `verified (component)`
    scope; it is not Runtime acceptance. `styles.csv` is fully
    dispositioned: 88/88 admitted, 0 deferred. Remaining H3 scope
    (each needs a separate owner-approved admission gate): the
    deferred rows of `colors.csv` (117 live deferred after H3-M
    rows 26–75; rows 76–192 owner-gated)
    and the remaining uupm data families (`charts.csv`, `motion.csv`,
    `landing.csv`, `products.csv`, `ui-reasoning.csv`,
    `google-fonts.csv`); `poteto-plugins` remains unpinned in
    donors.yaml.
    **H3-M/H3-N — `palette` waves 1–2 (H3-M CLOSED 2026-11-18 at
    `ed5062a3`; H3-N COMMITTED 2026-11-18 at `b5370b0b`).** H3-M rows 26–75
    were applied as 50 `uupm-palette-*` records and committed at
    `ed5062a3` with the integrated proof
    `.tmp/integrated-h3m-cli-proof/receipt.json` (frozen suite
    1,120 pass / 5 skip / 0 fail; same-input `check:manifests`
    stdout 122 B compact vs 1,025,524 B `--verbose` and
    `check-okf` 233 B vs 5,117 B `--verbose`; corpus 2,402 /
    vector 52; hermetic manifest-test reproducibility; no
    token/time claim). H3-N rows 76–100 (physical lines 77–101)
    were owner-approved ("Затвердити й застосувати 25 палітр"),
    applied as 25 more `uupm-palette-*` records via the
    `--remainder --limit 25` bounded-wave mode — no code changes
    (live catalog rev 8069 `b5a237d2…` with 399 typed resources,
    map rev 5788 `d2833fc6…`; `colors.csv` now 100 admitted /
    92 deferred). D18 r25: 75 reviews over 5 shards, vote tally
    50 accept / 25 manual — every v4-party-chat verdict cited the
    missing canonical-digest recompute; Root ran the 25 digest
    checks (`verify.ts`, all assertions pass) and the owner
    approved 25/25. Apply result
    `.tmp/h3n-r25-apply-evidence/result.json` SHA-256
    `8697c77c234952e8ccb5aa468a772b0ba0bc6a851d572816789e502d2f260172`;
    sealed aggregation `d5027460…`; live resources equal sealed
    25/25 and envelopes equal except `updated_at`; Pi READY,
    `check-corpus` 2,402 / `check-vector` 52. The original
    50-record `.tmp/h3n-palette-wave-2/` staging stays retained
    fallback history (`fallback-decision.json`). Remaining H3
    scope (each needs a separate owner-approved admission gate):
    `colors.csv` rows 101–125, 126–150, 151–175 and 176–192
    (25/25/25/17) and the remaining uupm data families
    (`charts.csv`, `motion.csv`, `landing.csv`, `products.csv`,
    `ui-reasoning.csv`, `google-fonts.csv`); `poteto-plugins`
    remains unpinned in donors.yaml. H3-N catalog/map/resource
    changes are committed at `b5370b0b`; the separate D19/AC-44
    worktree changes await the full package rerun and Root commit;
    AC-52/AC-54/AC-55 keep `verified (component)` scope.
15. **E5a/E5b host qualification.** Production manifest inputs now
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
   acceptance remain open. D-S8-5 package gates passed in frozen proof r2. D-S8-4 live app discovery and second-host scope remain open. The `.54` fixtures are not production
   outputs; `.67` is `NOT_CLOSED`; `.70` is an evidence baseline
   only.
16. **D19 algorithm delegation implementation.**
   offer/preference/offer-record mechanism is implemented and
   independently validated (Luna READY, 0 findings): decision-type
   registry with canonical exclusion and allowed floors, exact
   type+scope matching, sealed `VPStandingPreference/v1` and
   `VPAlgorithmOffer/v1` artifacts, SHA-verified preference refs.
   Deferred by design: call-site wiring into human-loop instructions,
   algorithm execution/notification, per-decision SHA binding. The
   mechanism was committed at `7972b8f7` — commit decisions are
   Root-owned.
17. **D16 v1.2 re-binding.**
   not a prerequisite for the migrated corpus or the compact CLI. The frozen
   40-ID trial stays v1.1-bound.
18. **Stage 8 — Standalone mode, portability and installation.**
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
   sessions, not Runtime acceptance. Marketplace-channel rows remain
   blocked on owner decision D-S8-3; Muse catalog/root marketplace is
   descoped by D-S8-2. D-S8-5 package gates passed in frozen proof r2. D-S8-4 live app discovery and second-host scope remain open.
19. **External Knip conflict resolved.** The pinned gate and the full Git hook passed after the two owner-approved Agent fixes in `34bf2dc3`. The H2-D receipt retains the earlier exit 1 as historical evidence.
20. **Separate Runtime acceptance.**
   verified; they do not establish installation or Runtime acceptance.
21. **Candidate next scopes (owner approval required; not started).**
    D59 module packaging would extend carriers to the 468 CSV atoms; the
    six unmapped UUPM families and unpinned `poteto-plugins` need
    classification/fit/attribution; contingent source, benchmark, module
    and mutation work stays separately gated. CAT-D1/D2/D5/D7 chosen v1
    modes are not current coding backlog. None is authorized by the
    current D59 acceptance or this queue.

Closed or removed from the open set: A0; A-D; E1-E4 (E5 host qualification
remains open); F (component-only, AC-22 partial/deferred); H0 baseline
(closed at `fafb4015`; `.81` review MET, doc reconciliation done
2026-11-16);
H1 AC-59 (owner-verified; packet/attribution/SR-81/89/90/100 sign-off
remains open; the acceptance-ledger reconciliation is recorded closed);
H2 (owner-accepted;
1,434 rows dispositioned — 1,414 admitted / 0 deferred / 20 rejected);
H3-A through H3-L owner-accepted typed-resource waves; H3-M committed
at `ed5062a3` and H3-N committed at `b5370b0b`; the AC-ledger
evidence reconciliation and the D58 AC-84/AC-85 evidence reconciliation
(recorded 2026-11-18 in `acceptance.md` rev 28; D58 closed as no
component gap with the AC-85 manifest-only enforcement disclosure); the
P0 product test gate (technical closure
2026-11-18, suite evidence `.tmp/p0-full-proof-r2/`); donor update
tracking (all 8
donors current, baseline 1,258 files); D59 lossless modules (accepted
2026-11-08; catalog 3,746 → 1,482, 682 carriers / 2,946 atoms;
`module-update` READY, AC-91); G (outside Powers).

**Acceptance notes (not active conversion):** H0 baseline documentation was
reconciled on 2026-11-16: `packages/powers/AGENTS.md` §5 and this list now
record the H0 baseline as closed at `fafb4015` per `task-plan-step-h.md`,
matching the `.81` independent review verdict (cumulative H0 baseline criteria
MET; its two Minor findings are stale-text items, one in a since-deleted
file). The `.69` native fixture parity material remains retained evidence,
not a current queue blocker. F AC-22 remains partial/deferred: no real finding
event or semantic/equivalence acceptance is claimed. H1 AC-59 is
owner-verified; the reconciled ledger (`acceptance.md` rev 27, SHA-256
`44b50958…5933`; evidence
`packages/powers/.tmp/ac-ledger-evidence/rework/RESULT.md`) records
AC-47/AC-57 open as designated packet/attribution/SR-81/89/90/100
evidence sign-off, AC-50 open bounded to D57/H2 phase/fidelity
evidence pending an exact owner decision, and
AC-48/AC-49/AC-51/AC-53/AC-56/AC-58 `verified (component)` against the
accepted H2 evidence; AC-84/AC-85 carry `verified (component)` D58
evidence (`packages/powers/.tmp/d58-ac84-85-evidence/MATRIX.md`, 14/6/4
focused tests, Pi READY component; AC-85 automatic grouping is
manifest/schema-policy enforced with no direct negative fixture). The live Wondelai map recount is 421 file entries,
56 split to 749 unique instruction IDs, 365 rejected and zero pending
selection; older 25-file/297-instruction and selected-text wording is
historical. H3-L is owner-accepted 2026-11-18 (bound `H3L-RECEIPT.md`);
`styles.csv` is fully dispositioned 88/88 admitted, 0 deferred. H3-M
`colors.csv` rows 26–75 are committed at `ed5062a3` after integrated
proof `.tmp/integrated-h3m-cli-proof/receipt.json` (frozen suite
1,120 pass / 5 skip / 0 fail; compact `check:manifests` 122 B vs
`--verbose` 1,025,524 B, `check-okf` 233 B vs 5,117 B; hermetic
manifest-test reproducibility; no token/time claim). H3-N
`colors.csv` rows 76–100 are owner-approved, applied and
independently validated on 25 records (apply result
`.tmp/h3n-r25-apply-evidence/result.json` `8697c77c…0172`; live
catalog rev 8069 `b5a237d2…` / map rev 5788 `d2833fc6…`, 100
admitted / 92 deferred); its source/data changes are committed at `b5370b0b`.

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
| **H** | D14/D15 accepted scope, implemented only through the gated phases in [Step H](task-plan-step-h.md): baseline closeout, source-attributed Wondelai method subset, engineering/UX applicability and CSV map, then selected typed JSON resources | H0 current hash-bound gates and review record; H1 complete disposition, source attribution/link and D18 panel evidence; H2 versioned applicability and cell-level evidence; H3 exact-ID, safety and shared-budget evidence | L | **H0 baseline closed; H1 AC-59 owner-verified while designated packet/attribution/SR-81/89/90/100 sign-off remains open; H2 owner-accepted (1,414 admitted / 0 deferred / 20 rejected); H3 typed-resource waves live through H3-M (`styles.csv` 88/88 admitted; `colors.csv` rows 26–75 applied and independently validated, rows 76–192 owner-gated with next batch 76–125).** Historical 2026-11-06 owner decisions: the owner allowed general methods plus selected product/business methods, set a 25-file pilot, moved CSV to H2, admitted no typed families, and replaced the H1 human fidelity/owner-admission loop with three blind Codex Luna reviewers (V3 Delphi, V2 Adversarial, V4 Party chat) plus orchestrator aggregation (D18). At that time ten held captures contained 602 held units and 57 bounded model comparisons; no complete/admitted source packet was evidenced. The owner approved excluding 60 out-of-carrier copies while preserving 421/30/391 intake accounting. Historical 2026-11-06 evidence: the approved 25-file set (8 engineering / 9 product-UX / 8 business-marketing) is captured, mechanically decomposed into 391 draft units and 4,039 spans, and sealed with 25 selections and 25 `PASS_MECHANICAL_ONLY` receipts in the existing H1 evidence directory; a read-only Luna validation returned READY 0/0/0. The D18 panel then ran six batches × three blind Codex Luna protocols on all 25 files: 391 units → 219 unanimous / 164 majority / 8 manual / 0 unresolved; final 230 accept / 80 amend / 0 merge / 81 reject. The panel decisions artifacts contain 310 final units with 25 selections and 25 `PASS_MECHANICAL_ONLY` checks; every file passed `checkDecomposition`. The main defect is mechanical span width: many units cover only the heading/first line, so the specs must use full-section locators. The eight engineering subsets and seventeen product/design and business files are **applied** (297 instructions; corpus 3,278 instructions, map 3,429, baseline 1,258, catalog revision 7,343). The other 1 file is **not admitted**: no `InstructionSpec`/packet exists for them, and the delegated gate path is implemented, tested and independently reviewed by T3 Codex/Luna (READY 0/0/0). At that time selected-text disposition for the remaining H1 files, per-source attribution, spec drafts and matched measurement remained open. Current 2026-11-18 state: H2 is owner-accepted, H3 continues through owner-gated waves and Runtime acceptance remains separate; the live Wondelai map recount is 421 file entries, 56 split to 749 unique instruction IDs and 365 rejected with zero pending selection (`donors.yaml` supports); the 25-file/297-instruction and selected-text wording above is historical. Keep the designated packet/attribution/SR-81/89/90/100 evidence sign-off (AC-47, AC-56–AC-58 open; AC-48/AC-49/AC-50/AC-51/AC-53 need acceptance-ledger reconciliation to the already accepted H2 evidence). No blanket new conversion or reopening of excluded files is queued; independent preparation may continue only inside an owner-approved packet. H1 uses the existing `request-clarification.md` gap routing: missing/technical evidence is an automatic block; ambiguity/conflict asks the owner; attribution is recorded, not inferred; the D18 review is delegated model review, not human fidelity. |

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
muse-package/antigravity formations now exist and pass `--check` for the six
D-S8-1 targets. Stage 8 dated run evidence covers four install-target rows on
one Windows host (portable/opencode/pi/codex local paths; not live sessions);
D-S8-5 package gates passed in frozen proof r2. D-S8-4 live app discovery and second-host scope remain open. Native host
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

These decisions set scope, not per-source admission. The owner approved the proposed 8/9/8 pilot set on 2026-11-03 for preparation only; it is not admitted. At that decision point AC-47 to AC-58 stayed open until per-source attribution, D18 panel/aggregation receipts and the delegated gate path existed; the delegated gate path has since been implemented and independently reviewed, AC-59 was accepted by the owner on 2026-11-06, and the current sign-off/ledger state is recorded in the 2026-11-18 sections above. H1 preparation may proceed only inside an owner-approved packet; dependent conversion stays blocked at each packet.

**Step H current state (2026-11-18):** H0 baseline reconciliation is complete; H1 AC-59 is owner-verified while the designated packet/attribution/SR-81/89/90/100 evidence sign-off remains open (the reconciled ledger records AC-47/AC-57 open H1 sign-off, AC-50 open bounded to D57/H2 evidence, and AC-48/AC-49/AC-51/AC-53/AC-56/AC-58 verified component). The live Wondelai map recount is 421 file entries, 56 split to 749 unique instruction IDs, 365 rejected and zero pending selection; older 25-file/297-instruction and selected-text wording is historical. H2 is owner-accepted: donor `uupm` is pinned at `56ea9cf1`, all 1,434 CSV rows are dispositioned (1,414 admitted / 0 deferred / 20 rejected), and H2 does not inherit H1 acceptance. H3 typed-resource waves are live through H3-N (`app-interface.csv`, `icons.csv`, `typography.csv` and `styles.csv` fully dispositioned; `styles.csv` 88/88 admitted); `colors.csv` rows 26–100 are applied and independently validated (H3-M committed at `ed5062a3`; H3-N committed at `b5370b0b`; 100 admitted / 92 deferred; next owner-gated waves rows 101–125, 126–150, 151–175, 176–192), with rows 101–192 still owner-gated; six unmapped UUPM families and unpinned `poteto-plugins` stay gated. Runtime acceptance remains separate.

# Key decisions of the queue

- **Current package gate state (2026-11-18):** the owner-selected Powers pin is Bun 1.4.4. The live catalog is revision 8,069 (`b5a237d2…`) with 2,402 instructions and 399 typed `resources[]` entries; corpus map revision 5,788 (`d2833fc6…`). Focused product gates reported for the H3-L worktree are green: strict typecheck (117 files), `format:check`, `check-corpus` (`issues: []`, 2,402 instructions), `check-vector`, `check-okf` (`failures: []`, `warnings: []`) and `build-manifests --check` (`ok:true`; Muse catalog readiness remains the pre-existing `MANIFEST_MUSE_CATALOG_NOT_READY`). The product test gate is technically closed 2026-11-18: `.tmp/p0-full-proof-r2/` (`TestReceipt/v1`, assignment `powers-20261118-p0-full-proof-r2`, HEAD `99c0c1f9`, Bun 1.4.4, seed 20261019) records `bun run --cwd packages/powers test` 1,115 pass / 5 skip / 0 fail — 1,120 tests / 57 files / 5,563 expectations / 697.34 s, exit 0 — with typecheck, format, corpus, vector and OKF checks all exit 0 and 20/20 SHA-256 binds matched. The earlier r1 run `.tmp/p0-full-proof/` was red on an `sbvf-admission.test.ts` timeout; scoped timeout fixes strictly preserving assertions closed it. The earlier red `.tmp/h3l-test.log` (module-update hook timeout, build-manifests CLI timeout, post-timeout assertion at `tests/build-manifests.test.ts:1753`) remains retained historic evidence. H3-L owner acceptance closed
2026-11-18 via the bound `H3L-RECEIPT.md`; the H3-L wave commit
`efb62665` is observed and further integration remains Root-owned. H2 is owner-accepted with 1,434 rows dispositioned (1,414 admitted / 0 deferred / 20 rejected). The H3-M `colors.csv` rows 26–75 wave is committed at `ed5062a3` under bound `H3M-RECEIPT.md` plus the integrated proof `.tmp/integrated-h3m-cli-proof/receipt.json` (frozen suite 1,120 pass / 5 skip / 0 fail; same-input `check:manifests` stdout 122 B compact vs 1,025,524 B `--verbose` and `check-okf` 233 B vs 5,117 B `--verbose`; corpus 2,402 / vector 52; hermetic manifest-test reproducibility; no token/time claim). The H3-N `colors.csv` rows 76–100 wave is owner-approved, applied and independently validated on 25 records (apply result `.tmp/h3n-r25-apply-evidence/result.json` `8697c77c…0172`; D18 r25 50 accept / 25 v4-manual resolved by Root digest checks and owner 25/25; Pi READY; palette 100 admitted/92 deferred); its source/data changes are committed at `b5370b0b`. The remaining-work queue tracks the follow-up package proof. The AC-ledger evidence reconciliation and the D58 AC-84/AC-85 evidence reconciliation are recorded closed in `acceptance.md` rev 28; AC-47/AC-57 H1 sign-off and bounded AC-50 remain open owner follow-ups. The owner-approved removal of the redundant Agent `knip.config.ts` self-entry passes `lint:knip:pinned` in the working tree. The earlier hook invocation reported the configuration file as unused with an absolute Windows `--config` path. The owner approved the staged root-relative hook argument under D9. The full hook exited 0 on a staged snapshot of the two approved changes. Both Agent fixes are committed at `34bf2dc3`. Earlier test and coverage receipts remain historical for their inputs. F caller qualification, real donor admission, delivery and Runtime acceptance remain separate open gates.

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
