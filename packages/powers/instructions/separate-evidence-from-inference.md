---
instruction_id: separate-evidence-from-inference
title: Separate evidence from inference
summary: "Put every claim in a confidence tier, cite what it rests on, and state plainly what the search did not find."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: You deliver research or a diagnosis that a decision will rest on.
conditions_does_not_apply_when: The answer is obvious and contains no claim beyond what was observed.
artifact_contract_output_type: evidence-map
artifact_contract_required_data:
  - claim
  - tier
  - source
  - confidence
  - disconfirmation
artifact_contract_verified_by: every fact traced to a cited location in the sources
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/epistemics.md
status: active
revision: 1
---

# Separate evidence from inference
Code shows what it does, not why it exists. The why lives in commits, change requests, tickets, documents, and conversations, all incomplete, biased, and sometimes missing.
Every claim must sit in one tier, and the tier sets its section and its phrasing.
Direct: an explicit, textual citation answers the question, something an author wrote that says why. Phrase it confidently, in the present tense, with the citation.
Supported: multiple pieces of indirect evidence converge on one conclusion. No single source states it explicitly, but the pattern across sources makes it likely. Cite each item and show that the conclusion is derived.
Inferred: a reasonable reading of the context that nothing explicitly supports. It is your interpretation, not a fact from the record. Hedge it and show the chain.
Speculative: a plausible hypothesis on thin evidence, where other explanations fit equally well. Mark it as a guess and keep it beside the alternatives.
Unknown: you looked and could not find out. A valid, important outcome. Say what you searched, where, and what you found.
Confidence words imply direct or supported evidence and need a citation immediately adjacent. Never use them for inferences.
Hedges signal interpretation, not report. Use them in the inference section: appears to, seems to, likely, suggests, is consistent with, one reading is, plausibly.
Do not retrofit a clean rationale onto messy history. Do not assume the author did the right thing and work backward to justify it.
Do not turn an absence of evidence into evidence of absence. No one mentioning a concern does not mean there was none.
If the user embeds a hypothesis in the question, treat it as one candidate among others and check the evidence independently. Do not simply confirm it.
When evidence contradicts, surface both sources with citations and let the user make the call. Do not pick the one that fits a tidier narrative.
Do not cite code as evidence for its own intent.
Before delivering, check that every claim has a citation or moves to an inference or hypothesis, and that its phrasing matches its tier.
The output has a section for what is not known. If no gaps are mentioned, treat that as suspicious.
