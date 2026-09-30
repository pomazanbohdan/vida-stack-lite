# Request clarification

Clarification establishes the smallest sufficient shared decision; it does not
rewrite the request, solve the task prematurely or require a universal field
catalog. Current user decisions and sidecar-routed BR/SR/AC remain normative.
The clarification record is derived work state with attributable provenance.

## Gap analysis

Before asking, classify a material gap as `missing`, `ambiguous`, `conflicting`,
`inferred_unconfirmed`, `retrievable`, `blocked` or `ready`. Record its
criticality, impact on acceptance, owner of truth, dependencies, candidate
values and whether it can be retrieved or safely inferred.

Choose one action:

- `ask` for user-owned intent, business priority, materially different outcomes,
  sensitive policy, irreversible action or authoritative conflict;
- `retrieve` for a verifiable project/public fact from an allowed source;
- `infer` only for a reversible low-impact assumption, with provenance and an
  expiry/confirmation mode;
- `proceed` when the missing value cannot affect current acceptance;
- `block` when execution or evidence would otherwise be unsafe or fabricated.

Project retrieval never silently resolves contradictory normative sources. If
the current request does not choose between them, ask the decision owner.

## QuestionCandidate/v1

Every material human question has one typed candidate with:

- `question_id`, `work_id`, target fields and `source_revision`;
- the analyzed `gap_class` and the selected action `ask`;
- type and criticality, `blocking`, decision owner and dependencies;
- concise context with exact conflicting/evidence pointers;
- one question that owns one decision;
- why the answer is needed and impact if unanswered;
- mutually exclusive options with consequence text;
- at most one evidence-backed recommended option and its rationale;
- `allow_other` and `allow_cannot_answer` when the option space or knowledge is
  not closed;
- status `open`, then attributable `answered`, `waived` or `expired`.

The reserved selection `other` is accepted only when `allow_other=true` and its
meaning is preserved in the attributable quote. `cannot_answer` and `defer`
are answer outcomes, not decisions: they preserve quote/pointer/timestamp but
leave the candidate `open`; a blocking question therefore continues to block
seal and delivery until a decision or separately authorized safe disposition.

Supported types are `single_choice`, `multi_choice`, `yes_no_confirm`,
`numeric_range`, `date_or_deadline`, `rank_priorities`, `select_artifact`,
`select_scope`, `constrained_free_text`, `confirm_inference`,
`resolve_conflict`, `provide_source_or_file` and `permission_request`.

Do not expose invented probabilities or hidden reasoning scores. Rank candidates
by blocking/essential status, outcome impact, irreversibility, risk reduction
and dependency coverage, then subtract user effort, redundancy, latency and
privacy cost. Ask only when the expected decision value remains positive.

## User-facing template

Use the smallest readable rendering:

```text
Decision <n>: <short title>
Context/evidence: <exact current conflict and source pointers>
Why now: <which implementation/acceptance branch depends on it>
Question: <one decision>
Options:
A. <label> — <observable consequence>
B. <label> — <observable consequence>
C. Other — <constrained free text>, when applicable
Recommendation: <one option or none> — <evidence-based rationale>
If unanswered: <block, safe default, defer with GAP, or expiry>
Reply: <option id plus optional correction>
```

Multiple choice is preferred only when options genuinely cover the decision.
Never hide an open space behind a false binary. Ask one question for a critical
conflict; ask 2–5 together only when they are short, independent and none of the
later questions depends on an earlier answer.

## Answer import

Bind the answer to `question_id` and source revision, preserve the user's quote
as Decision provenance, and map only an unambiguous selection to `answered`.
Record free-text corrections and new constraints separately. An ambiguous or
contradictory response remains open; it is never promoted to confirmed by model
inference. Recompute dependent questions and invalidate those made unnecessary.

Clarification stops when blocking fields are resolved/retrieved/waived/not
applicable, high-severity conflicts are absent, acceptance is executable and no
remaining candidate has positive decision value. If the user cannot answer,
offer an explicit safe default only when reversible; otherwise defer with an
owner/evidence target or keep the work blocked.

## Adaptive implementation profile

The portable runtime implements the smallest production-safe clarification
core: a session-owned intent check, gap routing, `QuestionCandidate/v1`, typed
answer import, source/revision binding, invalidation on replan/correction and
fail-closed seal/delivery gates. It reuses the ordinary B/S/AC/GAP trace as the
task specification instead of creating a second universal requirements model.

Keep normalization, retrieval, question ranking, implementation and
reconciliation in the current session while they share state or write scope.
Use a bounded specialist only for independently useful retrieval or domain
work. Fresh processes remain mandatory for plan assurance, the three blind
review lenses and architect escalation; logical roles and perspective slots do
not count as those agents.

The following are optional maturity extensions, not bootstrap requirements:

- a universal field catalog or versioned generic task model;
- probabilistic/EVPI scoring, embeddings or a learned pattern store;
- a diagnostic draft generator dedicated only to clarification;
- a permanent intent-monitor process or an always-on evaluator ensemble;
- prompt/POML/vendor compilers unrelated to repository development.

Add an extension only after observed task telemetry shows a repeatable gap that
the current B/S/AC/GAP trace and typed question contract cannot represent. It
must keep provenance, authority, compact re-entry and human-decision semantics
compatible with the existing runtime.
