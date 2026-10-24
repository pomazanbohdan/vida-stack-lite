# Key428 independent review

Date: 2026-10-24 UTC

Reviewers: blind, read-only native Luna agents `/root/key428_final_diff_review`
and `/root/key428_nonresearch_review`.

Scope: the pending `bin/run.ts` helper exports and the focused test in
`tests/run-entrypoint.test.ts` covering packet-only development stages,
matched/unmatched observations, research status conversion, and omission of
research-prefixed aliases for a non-research stage.

Finding: no must-fix. The helper bodies are unchanged, the test uses a real
`SessionBridgeRequest` fixture, the activation is present, and its matching
stage is `develop`, so the false arm of the report-identified ternary is
reached. Assertions retain generic activation/binding aliases and exclude
research-prefixed aliases. `bin/run.ts` is not exposed by the package export
map. The no-activation branch remains outside this packet and is not one of the
selected four arms. A minor label mismatch was fixed per reviewer suggestion
(`developer` role/fixture IDs). Final check evidence is recorded in WORK.
No edits or commands were run by either reviewer.
