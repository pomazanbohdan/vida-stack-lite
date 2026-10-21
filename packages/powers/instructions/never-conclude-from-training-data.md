---
instruction_id: never-conclude-from-training-data
title: Never conclude from training data alone
summary: "What the model already knows proposes hypotheses and shapes the questions; every conclusion needs evidence retrieved this run, a claim that cannot be evidenced stays a belief, and thin evidence is reported as thin."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A conclusion about the world is about to be written.
conditions_does_not_apply_when: The conclusion is a statement about the artefacts in front of you and the evidence is already in hand.
artifact_contract_output_type: evidence-bound-claim
artifact_contract_required_data:
  - the claim
  - the evidence it rests on
  - the belief status when it cannot be evidenced
artifact_contract_verified_by: every conclusion in the artifact traces to evidence retrieved or imported in this run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/research.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/research-philosophy.md
status: active
revision: 3
---

# Never conclude from training data alone
What you already know proposes hypotheses, queries, and structure; conclusions require evidence retrieved or imported *this run*.
A claim you cannot evidence is stated as an unverified belief or not at all.
The model's memory and the project's files only shape the questions.
Thin evidence is reported as thin.

**Date your knowledge** - "As of my training" is a warning flag
**Prefer current sources** - the documentation source and the official docs trump training data
**Flag uncertainty** - LOW confidence when only training data supports a claim
**Research is Investigation, Not Confirmation**
**Bad research:** Start with hypothesis, find evidence to support it
**Good research:** Gather evidence, form conclusions from evidence
Training data is 6-18 months stale. Treat pre-existing knowledge as hypothesis, not fact.
**Verify before asserting** — don't state library capabilities without checking the official docs
**Prefer current sources** — the current documentation and the official docs trump training data
**Flag uncertainty** — LOW confidence when only training data supports a claim
**Report honestly:**
- "I couldn't find X" is valuable (now we know to investigate differently)
- "This is LOW confidence" is valuable (flags for validation)
- "Sources contradict" is valuable (surfaces real ambiguity)
**Avoid:** Padding findings, stating unverified claims as facts, hiding uncertainty behind confident language.
