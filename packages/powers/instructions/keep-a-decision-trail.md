---
instruction_id: keep-a-decision-trail
title: Keep a decision trail
summary: "Ship a one-page rationale alongside the sketch: the problem, the caller's usage, the shape, the synthesis decision, the tradeoffs, the alternatives, and the open questions."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: "A design, a rewrite, or a long run makes choices a later reader has to reconstruct."
conditions_does_not_apply_when: The change is mechanical and its reason is visible in the diff.
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - problem
  - usage
  - shape
  - synthesis decision
  - tradeoffs
  - alternatives
  - open questions
artifact_contract_verified_by: a later reader reconstructs the choice from the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/rationale-template.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/09-make-it-yours.md
status: active
revision: 1
---

# Keep a decision trail
The prose that ships alongside the type sketch is one page.
Use sentence-case headings and no boilerplate.
Record the problem: what we're trying to do, and what about the existing system or constraints makes the shape non-obvious.
Name the constraints the design must honor, such as existing types to interoperate with, callers we can't break, and invariants that crossed our boundary, so the reader sees the same constraints you saw.
Record the usage from the caller's view before the type sketch: the README or quickstart the consumer reads, plus two or three realistic call sites in their own code.
Record the shape: data structures first, then how data flows through the signatures.
Name the load-bearing decisions.
State which invariants are encoded in types, where validation lives, and what the system deliberately does not do.
Judge interface depth explicitly: what complexity the public surface hides, what remains exposed to callers, and why the interface is no larger than needed.
Record the synthesis decision: which candidate became the base and why, what was adapted from each of the others, and what was rejected and why.
Record the tradeoffs accepted, one bullet per tradeoff, in the form we accept X in exchange for Y.
Name anything a future reader might mistake for an oversight, including things that look like premature optimization or premature simplification.
Name at least one concrete alternative shape, with one line on why it lost.
Judge each alternative on interface depth, not implementation simplicity alone.
Name the complexity it exposes to callers and the complexity it hides.
Phrase open questions and risks as questions, not assertions, so the human's answer is the resolution rather than a comment.
Name the first thing to build against the sketch in one sentence.
When the usage and the sketch diverge, reconcile the sketch to the usage, not the reverse.
The caller's experience is the spec; the types serve it.
