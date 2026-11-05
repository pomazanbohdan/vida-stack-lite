---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-quick-diagnostic
title: Run the documentation diagnostic
summary: "Check the ten diagnostic rows from audience and doc type through facts, headings, steps, samples, voice, links, timelessness and [EN] rules; apply the listed action for each no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of documentation.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L206-L220"
status: active
revision: 1
---

# Run the documentation diagnostic

The Quick Diagnostic is a 10-question pass/fail checklist whose failures drive the score and actions: (1) first paragraph states who the doc is for and what they'll be able to do -> add audience, outcome, and non-scope statements; (2) doc type matches the reader's task (tutorial/how-to/concept/reference/README) -> split by type and link between pages; (3) every command, flag, parameter, and behavior verified against code or the user -> verify or mark TODO(verify), not shippable until fixed; (4) headings read as a sentence-case table of contents (tasks imperative, concepts noun phrases) -> rewrite headings, add one where each new task starts; (5) all sequences are numbered steps, one imperative action each, condition first -> convert paragraphs to steps, move conditions forward; (6) every code sample introduced by a colon sentence with ALL_CAPS placeholders explained -> add intro sentences, fix and explain placeholders; (7) second person, active voice, present tense, no please/simply/just, no anthropomorphism -> rewrite sentence by sentence, cut filler; (8) descriptive links, 'see'-based cross-refs, alt-texted images, headed tables -> fix each, move image-only information into text; (9) timeless — no 'currently/new/soon', no pre-announced features -> remove time words, describe only shipped behavior; (10) [EN] word list, serial comma, contractions, American spelling, or the local guide -> apply the word list, run Vale if configured.
