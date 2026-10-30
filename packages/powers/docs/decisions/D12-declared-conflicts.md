---
type: Decision
title: 'D12 — Opposing instructions are declared, not narrowed away'
description: 'Two instructions that state opposite rules are declared as a conflicting pair: each names the other, the pair shares one theme pattern tag, and the catalogue reports the pair by name instead of applying both.'
status: stable
stale_after: '2027-10-20T00:00:00Z'
tags:
- vida-powers
- corpus
- catalog
- conflicts
- decision
sources:
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — delivery status and target status
- id: system-spec
  resource: /system-specification.md
  title: Vida Powers — system specification
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T23:40:00Z' }
verified: { by: human:repository-owner, at: '2026-10-20T23:40:00Z' }
revision: '2'
---

# Decision

## 1. The problem

Two donors — or one donor and the corpus that already exists — state **opposite**
rules about the same thing: migrate the callers and delete the old path in the
same wave, or keep the old interface working behind an adapter while the
backend moves; re-run the verification command at the moment of the claim, or
reuse the last successful run while the code has not changed; test at the
highest seam, or at the lowest level that captures the behaviour.

The step D criteria say that duplicates are first reduced **by narrowing**. That
is right for the same norm stated twice, and wrong for opposite norms: narrowing
one side of a contradiction hides the disagreement, and the catalogue then
applies two incompatible instructions in the same bundle without ever saying so.

## 2. The rule

An **opposing pair** is **declared**, not narrowed:

1. **The cross-reference.** Each instruction of the pair names the other in
   `compatibility_excludes` — a machine-readable statement that the two are
   alternatives, not a merge of their texts.
2. **One theme.** The pair carries **one shared pattern tag** — the marker of
   the theme the two disagree on. The tag is shared deliberately; each side
   keeps its own pattern tags for the approach it describes.
3. **The report.** The catalogue reports the pair **by name** (`SR-14`): when
   both sides enter one bundle, the composition fails with the names of the two
   instructions. The disagreement is never silent.

The texts of the pair are **not** changed to remove the disagreement. The
normative text of each side stays as its donor stated it (D11 §2).

## 3. The resolution path

Where the pair is a **policy choice** — the user decides which side applies —
the two sides are the **alternatives of one profile group** (D10): the shared
theme tag is the marker of the group, each alternative keeps its own pattern
tag, and the active alternative of the profile enters the bundle while the
other does not. The declared pair stays the statement of the disagreement in
the catalogue; the group is how the choice is carried.

Where the pair is not a user choice, the report of §2.3 is the end of it: the
catalogue names the conflict and the caller decides.

## 4. The declared pairs in the corpus

The table lists every pair the corpus currently declares — it is regenerated from
the instructions, so a pair that is added or removed is visible here. A pair
carries **one dedicated theme tag**: the one that names the disagreement. The
other shared tag, where there is one, is a topic tag that many instructions
carry and that therefore cannot identify the pair. The dedicated theme tag is
listed first.

Where the two sides are the alternatives of one profile group (§3), the group
marker is their theme: it names the policy the pair disagrees on, and each side
keeps its own pattern tag for the approach it describes.

| Pair | Shared tags |
|---|---|
| `adapt-the-old-interface-to-the-new-implementation` ↔ `migrate-callers-and-delete-legacy` | `migration-strategy` |
| `adjust-the-behaviour-to-the-context-degradation-signals` ↔ `measure-the-context-and-start-a-fresh-session-before-it-degrades` | `context-degradation-policy` |
| `choose-the-highest-test-seam` ↔ `choose-the-test-level` | `test-placement-strategy` |
| `clear-the-acceptance-criteria-before-the-next-step` ↔ `judge-the-acceptance-criteria-at-review-not-during-implementation` | `acceptance-criteria-timing-policy`, `testable-criteria` |
| `decide-whether-the-test-the-harness-or-the-application-is-wrong` ↔ `never-skip-or-silence-a-failing-test` | `failing-test-policy`, `test-design` |
| `declare-what-a-hook-produces-and-consumes` ↔ `fail-open-loudly-when-a-control-cannot-load` | `control-failure-posture-policy`, `control-tiering` |
| `delete-an-empty-section-instead-of-writing-none` ↔ `never-hide-a-gap-in-the-evidence` | `empty-result-posture-policy`, `empty-result-policy` |
| `format-quality-findings` ↔ `report-the-review-in-one-canonical-finding-shape` | `finding-presentation-policy`, `finding-severity-policy` |
| `hand-the-review-prompt-to-a-separate-session-when-no-subagent-exists` ↔ `keep-review-read-only` | `review-execution-policy`, `code-review` |
| `keep-review-read-only` ↔ `run-the-review-lenses-as-one-blocking-batch` | `review-application-policy` |
| `keep-review-read-only` ↔ `run-the-lenses-and-fix-what-they-find` | `review-fix-application-policy`, `code-review` |
| `label-code-review-findings` ↔ `report-the-review-in-one-canonical-finding-shape` | `finding-shape-policy`, `finding-severity-policy`, `code-review` |
| `let-each-lens-set-its-own-stance-toward-zero-findings` ↔ `review-adversarially` | `adversarial-empty-result-policy`, `code-review` |
| `optimize-guidance-triggers` ↔ `write-the-description-as-a-summary-and-trigger-phrases` | `description-shape-policy`, `instruction-authoring` |
| `place-checkpoints-and-front-load-the-risky-work` ↔ `put-one-checkpoint-at-the-end-of-the-meaningful-work` | `checkpoint-cadence-policy` |
| `prefer-a-prohibition-that-names-the-permitted-alternative` ↔ `write-directive-rules` | `directive-form-policy`, `instruction-authoring` |
| `prefer-the-explanation-over-the-shouting-rule` ↔ `write-directive-rules` | `rule-authority-policy`, `instruction-authoring` |
| `proceed-without-waiting-for-confirmation` ↔ `size-and-gate-the-work` | `approval-policy` |
| `run-bounded-fix-loop` ↔ `start-a-fresh-agent-for-each-revision-round` | `revision-round-continuity-policy`, `code-review` |
| `run-each-check-only-when-the-code-changed` ↔ `verify-before-completion` | `verification-rerun-policy` |
| `run-the-discussion-inline-when-the-agents-are-unavailable` ↔ `treat-a-required-delegation-as-mandatory` | `delegation-requirement-policy`, `subagent-delegation` |
| `the-local-record-is-the-working-copy-the-remote-is-pulled-back` ↔ `treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue` | `working-copy-authority-policy`, `single-source-of-truth` |

## 5. Consequences

- `compose` already reports an `excludes` pair by name (SR-14, design §7 rule
  5) — no change of the operation is needed; the declaration is what was
  missing.
- The step D criteria are corrected: narrowing applies to the **same** norm
  stated twice; opposite norms are declared (§2) and, where the user chooses,
  become the alternatives of one group (D10).
- The reviewer of a donor checks the declared pairs: a new instruction that
  contradicts an existing one is either merged into the same instruction (the
  same norm) or declared as an opposing pair.

---

# Rejected options

| Option | Why rejected |
|---|---|
| Narrowing one side of every contradiction until the texts agree | Hides the disagreement; the catalogue then applies two incompatible rules without saying so (§1) |
| Dropping one side of the pair | The donor's rule disappears from the corpus without a trace |
| A new mechanism (a separate conflict registry) | The catalogue already has the two fields needed: `compatibility_excludes` and the pattern tag (§2) |
| Resolving the pair automatically | Which side applies depends on the work and sometimes on the user; the catalogue reports, the caller decides (§3) |
