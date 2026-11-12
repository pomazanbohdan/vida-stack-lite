---
type: Concept
title: Vida Powers — instruction change vector
description: 'Living multi-direction summary of instruction and documentation changes, with the change authority matrix and the donor batch table.'
status: stable
stale_after: '2027-11-02T00:00:00Z'
tags:
- vida-powers
- donor-updates
- instruction-quality
- vector
sources:
- id: log
  resource: /log.md
  title: Bundle update log
- id: next-actions
  resource: /next-actions.md
  title: Current Powers task list
- id: acceptance
  resource: /acceptance.md
  title: Acceptance criteria
- id: d12
  resource: /decisions/D12-declared-conflicts.md
  title: D12 — Opposing instructions are declared, not narrowed away
- id: profile
  resource: /../config/methodology-profile.json
  title: Methodology profile groups and defaults
generated: { by: human:repository-owner, at: '2026-11-02T16:00:00Z' }
verified: { by: human:repository-owner, at: '2026-11-02T16:00:00Z' }
revision: '27'
---

# Instruction change vector

This is the living summary of how donor updates change the instruction corpus.
It records direction and authority, not the full batch evidence. The batch entry
in `/log.md` and the donor baseline remain the evidence owners.

## Current vector

The global synthesis: instructions move from descriptive prose to an executable
contract.

- **Context before questions** — read the available material, then ask only the gap.
- **Ticket-first requirements** — read the initiative or epic first and treat its Requirements as settled.
- **Evidence-bound review** — the ticket's Requirements define intent, findings and verdicts live in a triage file, and a verification gap names the test that would catch it.
- **Explicit decisions** — approaches, design doc, approval gate before build.
- **Progressive disclosure** — short `SKILL.md` routes to `references/`.
- **Compaction-safe state** — ledger, wiki or reference, not session memory.
- **Human-attributed reports** — named filer and human summary.
- **Short user communication** — Outcome, Evidence, Decision/GAP, Next.
- **Gradual automation** — triggers, throttles, review brakes, loop caps.
- **Tracked updates** — provenance, map, baseline, renames and deletions.

## Direction vectors

| Direction | Current movement | Evidence | Derived / auto boundary | Owner decision |
|---|---|---|---|---|
| Engineering | Fresh context per subagent; four verification-gap shapes; file-backed triage; small batches; reference detail | superpowers, matt-skills, bmad-method | DERIVED after review: provenance, catalog/map/baseline; AUTO: links and counts | none for mechanical; review for semantic |
| Product / design | Context first; explicit approaches; design gate; ticket-aware handoff | superpowers, bmad-method | DERIVED after review: provenance, catalog/map; AUTO: links and counts | product policy for `user_decision: false` groups; no default for `user_decision: true`; scope and priority |
| Operations | Wiki memory; gradual automation; loop caps | matt-skills | DERIVED after review: provenance, catalog/map; AUTO: links and counts | operational policy, automation rollout |
| Documentation | Short contract; OKF/D6; conflict precedence; progressive disclosure | both batches | AUTO: broken local links, heading/count drift, log/vector rows | canonical scope, acceptance text |
| Communication | Outcome / Evidence / Decision / Next; less description for user messages only | adaptive-reporting | none | channel policy, formal standard |

A batch may touch several directions. The batch table adds `Direction` after
`Result`.

## Change authority

| Class | May change without a new owner decision | Examples |
|---|---|---|
| **AUTO** | Yes, when the edit preserves meaning and is deterministic | broken local link; heading/count drift in a derived summary; log/vector row; formatting; typo that does not change meaning |
| **DERIVED** | Yes, only after the source change is already authorized | catalog digest; map entry; baseline; NOTICE pin; corpus/map/baseline counts; provenance revision/path only when the source exists at the new pin and the content hash is unchanged |
| **REVIEW** | No; needs independent or human review | instruction body change that alters meaning, scope, conditions, strength, negation or examples; new/merged instruction; tag/domain/classification change; acceptance or contract text; new opposing pair; profile group change |
| **OWNER** | No; decision owner only | source admission; legal; business scope or priority; publication; default selection for `user_decision: true`; deletion of canonical content; product boundary |
| **BLOCKED** | No; missing evidence or unresolved conflict | unknown effect; stale hash; conflicting instructions without a declared pair; no attributable decision |

AUTO never decides meaning. DERIVED is not an independent authorization; it
mirrors a change that REVIEW or OWNER already approved. A source path or revision
change is DERIVED only when the source file exists at the new pin and the content
hash is unchanged; otherwise it is REVIEW or BLOCKED. Canonical deletion is
OWNER, not REVIEW.

## Opposing instructions and defaults

No new default mechanism is added. The existing owners decide:

- **D12** declares opposing pairs. Each side names the other in
  `compatibility_excludes`; both texts stay; the catalogue reports the pair.
- **`methodology-profile.json`** owns policy groups:
  - `user_decision: false` with `default` — the default applies; record it.
  - `user_decision: true` — no default; the user chooses at setup. The decision
    owner resolves only an attributable exception. Dependent work blocks while
    the choice is open.
- **Duplicate** — merge into one canonical owner; not a default.
- **Stale or superseded** — mark deprecated/disabled; not a default.
- **Project-specific preference** — record as a profile selection and project
  decision; not as a corpus-wide default.
- **Unresolved opposition outside a profile group** — declare the pair; block
  the dependent composition; do not silently pick.

No batch, model or repair may invent a default. An owner decision is not a
product-owner default and cannot override `user_decision: true`.

## Batch log

| Batch | Donor | Pin | Existing instructions | Content updates | New instructions | Rejected / removed | Result | Direction |
|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | superpowers | `bb92a77741419a4ab5f06e711a283343f1ada0c3` → `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | 87 | 8 | 2 | 18 deleted; 2 rejected; 1 duplicate removed | 2,512 / 2,782 / 1,201 | product/design; engineering; documentation |
| 2 | matt-skills | `49dd158d1076134a641b33efb035946536778336` → `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | 69 | 8 | 2 | 16 deleted; 9 rejected | 2,514 / 2,776 / 1,202 | engineering; operations; documentation |
| 3 | bmad-method | `cfba3ff5f982c1809e060606e399f55ebd7bce5e` → `bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41` | 752 | 96 | 10 | 16 deleted used files; 18 new candidates reviewed | 2,524 / 2,777 / 1,200 | product/design; engineering; operations; documentation |
| 4 | addy-skills | `aeac41d4d005999432bb7312f7ff06383a91d59d` → `301b02b12bff98e4688e6984af6556802322bbde` | 392 | 10 | 0 | 14 eval files rejected | 2,524 / 2,791 / 1,200 | engineering; documentation |
| 5 | gsd-core | `19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005` → `bfab82492374a847a01417707a1a38e9e7cf097e` | 1,343 | 6 | 5 | 25 new candidates; 212 packaging/translation docs rejected; 22 stale map records removed | 2,529 / 3,008 / 1,202 | engineering; operations; documentation |
| 6 | wondelai-skills | `c172996495bed0fcd26896a9416b2093fd7073f0` | 0 | 0 | 749 | 25-file H1 pilot + 31 next-batch files applied; 30 journey files excluded; 0 candidates pending H1 selection | 3,278 / 3,429 / 1,258 | engineering; product/design; business |
| 7 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 99 | 99 UX-guideline instructions admitted from 1,434 CSV rows; 1,335 deferred; delegated D18 receipts | 3,377 / 3,429 / 1,258 | engineering; product/design; documentation |
| 8 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 7 | 7 KEEP_ATOMIC Mobile UX instructions admitted after three-protocol SWE-2 review; Touch Target Size held for SR-82 applicability; 1,328 remain deferred (1 held Mobile, 12 non-Mobile UX including 1 held, 44 react-performance, 1,271 stack) | 3,384 / 3,429 / 1,258 | engineering; product/design; documentation |
| 9 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 44 | 44 react-performance instructions admitted after two SWE-2 reviews; 1,284 remain deferred (11 SPLIT UX, 2 held UX, 1,271 stack) | 3,428 / 3,429 / 1,258 | engineering; documentation |
| 10 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 107 | 107 KEEP_ATOMIC stack instructions admitted after five SWE-2 reviews; 9 duplicate rows rejected; 1,168 remain deferred (13 UX, 1 SPLIT stack, 1,154 undispositioned stack) | 3,535 / 3,429 / 1,258 | engineering; documentation |
| 11 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 211 | 211 KEEP_ATOMIC stack instructions admitted after four SWE-2 reviews (angular 50, astro 53, avalonia 56, flutter 52); astro 11 tag corrections applied; 957 remain deferred (13 UX, 9 SPLIT stack, 935 undispositioned stack) | 3,746 / 3,429 / 1,258 | engineering; documentation |
| 12 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 3,746 | 11 atoms packaged into 2 lossless carriers; no content updates | 0 | 9 catalog entries removed (3,746→3,737); 11 atoms preserved | 3,737 / 3,429 / 1,258 | engineering; documentation |
| 13 | open-knowledge-format | `ad30107c31c06aec8a7d5636e0d1058118604e6f` | 3,737 | 53 atoms packaged into 10 lossless carriers; no content updates | 0 | 43 catalog entries removed (3,737→3,694); 53 atoms preserved | 3,694 / 3,429 / 1,258 | documentation |
| 14 | ponytail | `6f1c2bfff0c837d268929a7c4e490918eb4fab29` | 3,694 | 15 atoms packaged into 3 lossless carriers; no content updates | 0 | 12 catalog entries removed (3,694→3,682); 15 atoms preserved | 3,682 / 3,429 / 1,258 | engineering |
| 15 | matt-skills | `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | 3,682 | 36 atoms packaged into 14 lossless carriers; no content updates | 0 | 22 catalog entries removed (3,682→3,660); 36 atoms preserved | 3,660 / 3,429 / 1,258 | engineering; documentation |
| 16 | superpowers | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | 3,660 | 51 atoms packaged into 13 lossless carriers; no content updates | 0 | 38 catalog entries removed (3,660→3,622); 51 atoms preserved | 3,622 / 3,429 / 1,258 | engineering; documentation; product/design |
| 17 | addy-skills | `301b02b12bff98e4688e6984af6556802322bbde` | 3,622 | 292 atoms packaged into 50 lossless carriers; no content updates | 0 | 242 catalog entries removed (3,622→3,380); 292 atoms preserved | 3,380 / 3,429 / 1,258 | engineering; documentation |
| 18 | addy-skills | `301b02b12bff98e4688e6984af6556802322bbde` | 3,380 | 75 atoms packaged into 11 lossless carriers; no content updates | 0 | 64 catalog entries removed (3,380→3,316); 75 atoms preserved | 3,316 / 3,429 / 1,258 | engineering; documentation |
| 19 | wondelai-skills | `c172996495bed0fcd26896a9416b2093fd7073f0` | 3,316 | 312 atoms packaged into 50 lossless carriers; no content updates | 0 | 262 catalog entries removed (3,316→3,054); 312 atoms preserved | 3,054 / 3,429 / 1,258 | product/design; engineering |
| 20 | wondelai-skills | `c172996495bed0fcd26896a9416b2093fd7073f0` | 3,054 | 298 atoms packaged into 50 lossless carriers; no content updates | 0 | 248 catalog entries removed (3,054→2,806); 298 atoms preserved | 2,806 / 3,429 / 1,258 | product/design; engineering |
| 21 | wondelai-skills | `c172996495bed0fcd26896a9416b2093fd7073f0` | 2,806 | 137 atoms packaged into 21 lossless carriers; no content updates | 0 | 116 catalog entries removed (2,806→2,690); 137 atoms preserved | 2,690 / 3,429 / 1,258 | product/design; engineering |
| 22 | bmad-method | `bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41` | 2,690 | 205 atoms packaged into 50 lossless carriers; no content updates | 0 | 155 catalog entries removed (2,690→2,535); 205 atoms preserved | 2,535 / 3,429 / 1,258 | engineering; documentation; product/design |
| 23 | bmad-method | `bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41` | 2,535 | 208 atoms packaged into 50 lossless carriers; no content updates | 0 | 158 catalog entries removed (2,535→2,377); 208 atoms preserved | 2,377 / 3,429 / 1,258 | engineering; documentation; product/design |
| 24 | bmad-method | `bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41` | 2,377 | 190 atoms packaged into 50 lossless carriers; no content updates | 0 | 140 catalog entries removed (2,377→2,237); 190 atoms preserved | 2,237 / 3,429 / 1,258 | engineering; documentation; product/design |
| 25 | bmad-method | `bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41` | 2,237 | 23 atoms packaged into 7 lossless carriers; no content updates | 0 | 16 catalog entries removed (2,237→2,221); 23 atoms preserved | 2,221 / 3,429 / 1,258 | engineering; documentation; product/design |
| 26 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 2,221 | 179 atoms packaged into 50 lossless carriers; no content updates | 0 | 129 catalog entries removed (2,221→2,092); 179 atoms preserved | 2,092 / 3,429 / 1,258 | engineering; documentation |
| 27 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 2,092 | 141 atoms packaged into 50 lossless carriers; no content updates | 0 | 91 catalog entries removed (2,092→2,001); 141 atoms preserved | 2,001 / 3,429 / 1,258 | engineering; documentation |
| 28 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 2,001 | 159 atoms packaged into 50 lossless carriers; no content updates | 0 | 109 catalog entries removed (2,001→1,892); 159 atoms preserved | 1,892 / 3,429 / 1,258 | engineering; documentation |
| 29 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 1,892 | 171 atoms packaged into 50 lossless carriers; no content updates | 0 | 121 catalog entries removed (1,892→1,771); 171 atoms preserved | 1,771 / 3,429 / 1,258 | engineering; documentation |
| 30 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 1,771 | 189 atoms packaged into 50 lossless carriers; no content updates | 0 | 139 catalog entries removed (1,771→1,632); 189 atoms preserved | 1,632 / 3,429 / 1,258 | engineering; documentation |
| 31 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 1,632 | 198 atoms packaged into 50 lossless carriers; no content updates | 0 | 148 catalog entries removed (1,632→1,484); 198 atoms preserved | 1,484 / 3,429 / 1,258 | engineering; documentation |
| 32 | gsd-core | `bfab82492374a847a01417707a1a38e9e7cf097e` | 1,484 | 3 atoms packaged into 1 lossless carrier; no content updates | 0 | 2 catalog entries removed (1,484→1,482); 3 atoms preserved | 1,482 / 3,429 / 1,258 | engineering; documentation |
| 33 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 2 | Touch Target Size SPLIT admitted: iOS/Android singleton VPInstruction/v2 with platform applicability and exact subspans; web fragment bound to existing uupm-ux-target-size-minimum; corpus-map migrated to VPCorpusMap/v3; Readable Font Size stays deferred pending a mobile vocab token | 1,484 / 3,429 / 1,258 | product/design; documentation |
| 34 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 31 | D18 panel SPLIT rows materialized: 11 ux-guidelines.csv rows + stacks/react.csv L9 → 31 VPInstruction/v1.2 singletons with exact code-point subspan bindings and H2FidelityReceipt/v2; deferred UX remainder is Readable Font Size only (mobile vocab token pending); stack deferred 944→943 | 1,515 / 3,429 / 1,258 | engineering; product/design; documentation |
| 35 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 21 | Reviewed stack SPLIT rows materialized: 9 stacks/*.csv rows → 21 VPInstruction/v1.2 singletons with subspan bindings and H2FidelityReceipt/v2 (winui L34 deferred to SBVF family batch); D57 deferred-sibling dedup amendment recorded; stack deferred 943→934 pending family/non-family admission batches | 1,536 / 3,429 / 1,258 | engineering; product/design; documentation |
| 36 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 1 | nuxt-ui.csv L57 SPLIT admitted: use-range-when-needed singleton with exact subspan bindings; locale fragment cross-bound to the L71-derived instruction per D57 amendment (claim-equivalence, row-owned locators); 9 REJECT_DUPLICATE rows resolved against already-admitted instructions (html-tailwind ×2, javafx ×4, shadcn ×2, vue ×1); 2 sibling-covered rejects ride with NF batches; csv-map.ts locators[]/locator validation tightened per D56 §9 | 1,537 / 3,429 / 1,258 | engineering; product/design; documentation |
| 37 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 1 | Readable Font Size admitted as neutral VPInstruction/v1.2 KEEP_ATOMIC (uupm-ux-readable-font-size) per consilium decision: Mobile siblings precedent, no vocabulary change ("Mobile is source context, not a vocabulary platform token"); H2FidelityReceipt/v1 whole-cell bindings; UX deferred remainder now zero | 1,538 / 3,429 / 1,258 | engineering; product/design; documentation |
| 38 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 2 | winui.csv L34 'Support keyboard navigation' admitted as two SR-111 singleton SPLITs (tab-navigation, access-keys) with exact code-point subspans, H2FidelityReceipt/v2 and H2SplitEvidence/v1; row excluded from family-support-keyboard-navigation-b8dc783f per SR-105/D58 (family plan 'split-family' label was an artifact; xaml-mvvm batch drops to 48 rows); Applies To col-10 coverage recorded per L57 precedent | 1,540 / 3,429 / 1,258 | engineering; product/design; documentation |
| 39 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 133 | NF-06 non-family KEEP_ATOMIC batch applied: 133 stacks rows (uno, uwp, vue) materialized as VPInstruction/v1.2 singletons — template bodies, whole-cell H2FidelityReceipt/v1 bindings cols 2–7, reviewed Category→tag table, per-stack conditions constants; 42 deprecated rows materialized status:active per deprecated-keep-atomic-v1; engine .tmp/h2a2-nf-apply.ts, luna-validated | 1,673 / 3,429 / 1,258 | engineering; documentation |
| 40 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 93 | NF-07 non-family KEEP_ATOMIC batch applied: 93 stacks rows (winui, wpf) materialized as VPInstruction/v1.2 singletons with the same contract; winui evidence carries no L34 claim (L34 admitted separately in batch 38) | 1,766 / 3,429 / 1,258 | engineering; documentation |
| 41 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 119 | NF-01 non-family KEEP_ATOMIC batch applied: 119 stacks rows (html-tailwind, javafx) materialized as VPInstruction/v1.2 singletons; 1 empty pattern_tags row admitted with catalog tag_exemptions entry (pattern dimension) per CORPUS_TAG_EMPTY rule | 1,885 / 3,429 / 1,258 | engineering; documentation |
| 42 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 98 | NF-02 non-family KEEP_ATOMIC batch applied: 98 stacks rows (jetpack-compose, laravel); laravel.csv L47 flipped deferred->rejected per D57 sibling-covered dedup (covered by same-batch admitted siblings); 1 pattern tag exemption added | 1,983 / 3,429 / 1,258 | engineering; documentation |
| 43 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 130 | NF-03 non-family KEEP_ATOMIC batch applied: 130 stacks rows (nextjs, nuxt-ui); nextjs.csv L61 flipped deferred->rejected per D57; 3 pattern tag exemptions added | 2,113 / 3,429 / 1,258 | engineering; documentation |
| 44 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 128 | NF-04 non-family KEEP_ATOMIC batch applied: 128 stacks rows (nuxtjs, shadcn); 4 pattern tag exemptions added | 2,241 / 3,429 / 1,258 | engineering; documentation |
| 45 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 148 | NF-05 non-family KEEP_ATOMIC batch applied: 148 stacks rows (svelte, swiftui, threejs); 11 deprecated rows materialized status:active per deprecated-keep-atomic-v1; 3 pattern tag exemptions added. Non-family lane complete: all 849 KEEP_ATOMIC rows dispositioned; deferred remainder is 72 family-held rows only | 2,389 / 3,429 / 1,258 | engineering; documentation |
| 46 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 12 | P6 batch 1 web-ux-pairs SBVF admission applied (first family batch under D58 machinery): 6 deferred stack rows admitted as whole-cell family variants + 6 ux singletons migrated into 6 VPInstruction/v3 family files; H2FidelityReceipt/v2 + H2FamilyAdmissionEvidence/v1; owner-approved manifests in config/ (approved_by=human:repository-owner); plan SHA 6f6d53a9…; sbvf-verify outcome verified; check-corpus 0 issues | 2,389 / 3,429 / 1,258 | engineering; product/design; documentation |
| 47 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 22 | P6 batch 2 js-ts-web SBVF admission applied: 10 families — 13 deferred stack rows admitted as whole-cell family variants + 9 singleton→family migrations into VPInstruction/v3; family-avoid-unnecessary-effects-d6b2db8c excluded per owner ruling (D58 same-rowKey/subspan violation; its svelte row admitted separately as singleton); plan SHA 4c0c719b…; check-corpus 0 issues; sbvf-verify blocked by tool bug (.x versionRange) — variant selection independently verified 22/22 | 2,390 / 3,429 / 1,258 | engineering; documentation |
| 48 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 1 | svelte.csv L53 "Use semantic elements" admitted as KEEP_ATOMIC singleton uupm-svelte-use-semantic-elements after owner dissolved family-use-semantic-elements-24a21964 (family-of-one); VPInstruction/v1.2 + H2FidelityReceipt/v1 + merged svelte-evidence row; owner-rulings supplement preserves HELD review; check-corpus 0 issues | 2,391 / 3,429 / 1,258 | engineering; documentation |
| 49 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 1 | svelte.csv L48 "Avoid unnecessary effects" admitted as KEEP_ATOMIC singleton uupm-svelte-avoid-unnecessary-effects — svelte member of D58-excluded family-avoid-unnecessary-effects-d6b2db8c admitted outside the family per owner ruling; VPInstruction/v1.2 + H2FidelityReceipt/v1 + svelte-evidence merge carrying both svelte singleton rows; luna re-check ACCEPT; check-corpus 0 issues | 2,392 / 3,429 / 1,258 | engineering; documentation |
| 50 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 55 | P6 batch 3 xaml-mvvm SBVF admission applied: 18 families — 48 deferred stack rows admitted as whole-cell variants + 7 singleton→family migrations (6 avalonia, 1 react-native); keyboard-navigation family scoped avalonia+wpf (winui L34 SPLIT excluded); plan SHA eff1e3a1…; sbvf-verify outcome verified (post-.x-fix); check-corpus 0 issues | 2,403 / 3,429 / 1,258 | engineering; documentation |
| 51 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 4 | P6 batch 4 misc-singletons-migration SBVF admission applied — FINAL family batch: 2 families, 4 variants, 3 deferred admissions (swiftui L5, javafx L16, swiftui L17) + 1 flutter singleton migration; plan SHA 396a1067…; sbvf-verify verified; check-corpus 0 issues. UUPM corpus fully dispositioned: 1,414 admitted / 0 deferred / 20 rejected | 2,404 / 3,429 / 1,258 | engineering; documentation |
| 52 | uupm | `56ea9cf174ed86786187daa9de0e6247cb0747e4` | 0 | 0 | 4 | H2-SBVF P5 pilot applied (owner-approved fresh plan): 2 families — useState/useReducer — 4 admitted singletons migrated to VPInstruction/v3 (react+react-native variants each); family_ids normalized to -<8hex> convention; plan SHA 91d66675…; sbvf-verify verified; check-corpus 0 issues; dispositions unchanged 1,414/0/20 | 2,402 / 3,429 / 1,258 | engineering; documentation |

Legend: result = corpus instructions / map records / baseline files.

## Staged batches

| Stage | Donor | Scope | Content updates | Status |
|---|---|---|---:|---|
| B1 | bmad-method | `bmad-prd` + `bmad-qa-generate-e2e-tests` ticket awareness | 6 | folded into batch 3 |
| B2 | bmad-method | `bmad-architecture` + `bmad-ux` ticket-first | 10 | folded into batch 3 |
| B3 | bmad-method | `bmad-spec` reviewed against the new ticket owner | 2 | folded into batch 3; 17 repoints applied |
| B4 | bmad-method | `bmad-code-review` + `bmad-review` ticket and triage rules | 24 | folded into batch 3 |
| B5 | bmad-method | `bmad-ticket` reviewed against the new `bmad-agent-po` owner | 6 | folded into batch 3; 56 source repoints applied |
| B6 | bmad-method | `bmad-build` + `bmad-build-auto` ticket context and verification | 8 | folded into batch 3 |
| B7 | bmad-method | `bmad-retrospective` + `bmad-correct-course` + `bmad-project-context` | 12 | folded into batch 3; 9 correct-course repoints applied |
| B8 | bmad-method | `bmad-walkthrough` + `bmad-prfaq` + `bmad-forge-idea` | 12 | folded into batch 3 |
| B9 | bmad-method | `bmad-agent-*`, `bmad-toolsmith`, `bmad-deep-recon`, `bmad-product-brief`, method help | 16 | folded into batch 3 |
| B10 | bmad-method | new `bmad-agent-po` workflow, ticket, spec and slice rules | 10 new | folded into batch 3 |

The bmad-method B1–B10 content batches are folded into batch 3; no staged batch remains.
A staged batch changed instruction content before the pin and provenance advanced.
It was not a completed batch and made no admission claim.

## Applied provenance moves

The moves below were applied in batch 3.

| From | To | Reason |
|---|---|---|
| `skills/bmad-spec/SKILL.md` | `skills/bmad-agent-po/references/spec.md` | bmad-spec removed; Sofia owns ticket requirements |
| `skills/bmad-spec/assets/spec-template.md` | `skills/bmad-agent-po/references/spec.md` | template replaced by the ticket template |
| `skills/bmad-spec/assets/headless-schemas.md` | `skills/bmad-agent-po/references/spec.md` | headless requirements now live in the ticket workflow |
| `skills/bmad-ticket/**` | `skills/bmad-agent-po/**` (same relative path) | bmad-ticket removed; Sofia owns the ticket workflow |
| `skills/bmad-ticket/assets/{initiative,epic,story}-template.md` | `skills/bmad-agent-po/assets/ticket-template.md` | three container templates merged into one |
| `skills/bmad-ticket/customize.toml` | `skills/bmad-agent-po/customize.toml` | customization moved with the skill |
| `skills/bmad-correct-course/**` | `skills/bmad-agent-po/references/replan.md` | correct-course removed; replan owns the change path |

## Batch update rule

After every donor batch or repair review:

1. Add one row to the batch table with the donor, pin, counts, result and direction.
2. Update the direction vectors only when the direction changed; do not rewrite history.
3. Keep open work in `next-actions.md`, acceptance state in `acceptance.md` and completed history in `log.md`.
4. Run `bun packages/powers/scripts/check-vector.ts` before commit.

The check fails when a processed donor pin or the latest corpus, map or baseline
count is stale. This file records authority, not the status of individual
findings; no second ledger is created.
