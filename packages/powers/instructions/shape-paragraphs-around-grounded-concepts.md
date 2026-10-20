---
instruction_id: shape-paragraphs-around-grounded-concepts
title: Shape paragraphs around grounded concepts
summary: "Grow an article paragraph by paragraph from a fixed pile, arguing each format choice and grounding every concept a block leans on before it uses it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Raw material is fixed and an article must be committed to a structure.
conditions_does_not_apply_when: The material is still being mined.
artifact_contract_output_type: shaped-article
artifact_contract_required_data:
  - opening
  - grounded set
  - blocks
  - format arguments
artifact_contract_verified_by: no block reaches for an ungrounded concept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/in-progress/writing-shape/SKILL.md
status: active
revision: 1
---

# Shape paragraphs around grounded concepts
The user has passed (or will pass) a markdown file of raw material. Treat it as the input pile: anything from a tidy list of fragments to a wall of unstructured prose to a transcript. The format does not matter. Read it end-to-end before doing anything else.
Then run a shaping session that produces a separate article document. This is **exploit**: the exploring is done, the pile is fixed: commit to a structure and mine the pile to fill it. Do not edit the raw material file: it is read-only to this skill.
## The loop
1. **Read the pile.** Read the input file in full. Form a sense of what's in it.
2. **Establish the prerequisites.** Settle with the user what the reader knows walking in: the concepts that are **grounded** from the start. Everything else must be grounded by a block before a later block can lean on it.
3. **Draft 2–3 candidate openings.** Each opening should imply a different thesis or angle for the article. Show all of them. Force the user to pick or compose a hybrid. The chosen opening defines what the rest of the article must do.
4. **Grow paragraph by paragraph.** After the opening lands, ask "given this opening, what does the reader need to hear next?" Pull material from the pile to answer. The next block may only lean on grounded concepts, and grounds new ones as it lands. Argue about the form the next block takes: a paragraph, a list, a table, a callout, a quote, a code block. Each format choice should be deliberate and defensible.
5. **Append to the article file as you go.** Don't batch. Write each agreed paragraph or block immediately so the user can see the article taking shape.
6. **Loop step 4 until the article is done.** The user decides when it's done.
## Grounding
Every **concept** has to be **grounded** before a block can lean on it: the reader either walked in knowing it or met it in an earlier block. A block that reaches for an ungrounded concept loses the reader. The unit is the concept, not the word for it: a block can lean on an idea the reader lacks even with no jargon in sight. Where a concept has a name (a **term**), grounding it means landing the idea and the term together.
A concept gets grounded one of two ways:
- **Prerequisite**: grounded before the opening. The reader brings it. Fixed at the start.
- **Introduced**: a block establishes it, and from then on it's grounded for the rest of the article.
Keep a running list of what's grounded. When you ask "what does the reader need to hear next?", an ungrounded concept the next move needs is itself the answer: ground it first (here or in an earlier block) or you can't make the move.
## Conversational feel
This is a grilling session inverted. In ideation, the question was "what are you actually noticing?" Here it's "what is this article actually arguing, and in what order does the reader need to hear it?" Push back. Refuse to let weak transitions slide. If a paragraph doesn't earn its place, cut it.
