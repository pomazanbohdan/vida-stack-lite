---
instruction_id: mine-fragments-before-structuring
title: Mine fragments before structuring
summary: "Widen the space of what could be written by mining heterogeneous fragments and appending them to one document, before any structure is committed."
capability_tags:
  - write-technical-prose
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Raw material for a piece does not yet exist and must be gathered.
conditions_does_not_apply_when: The fragments are already gathered.
artifact_contract_output_type: fragment-file
artifact_contract_required_data:
  - fragments
  - working title
  - append-only file
artifact_contract_verified_by: "no structure, outline or phase is imposed while mining"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/in-progress/writing-fragments/SKILL.md
status: active
revision: 1
---

# Mine fragments before structuring
This is pure **explore**: widen the space of what could be written without committing to structure. Committing is _exploit_, a separate skill's job. Run a grilling session that produces fragments, interviewing the user relentlessly about whatever they want to write about. Imposing phases, outlines, or article structure is out of scope here.
As fragments emerge from either side of the conversation, append them to a single markdown file.
If the user did not pass a path, ask once where to save the document, then remember it for the rest of the session.
Capture fragments from the very first thing the user says, including the initial prompt.
On first write, put a single H1 at the top with a working title (it can change later) and nothing else: no metadata, no TOC, no date.
## What is a fragment
A fragment is any piece of text that might survive into the final article. It must be _readable by the author_ (the author can tell what it means), but it does not need to define its terms or be comprehensible to a cold reader. The bar is "is this a piece of good writing?", not "is this a self-contained argument?"
A **leading word**: a compact metaphor or coinage the whole piece can hang on (one term that names the idea, the way _tracer bullets_ or _fog of war_ names a whole pattern). Of these, the leading word is the most valuable fragment to land. It is load-bearing: name the right one in explore and it shapes the structure, the transitions, and the title later, paying dividends through the entire exploit phase. When the conversation circles a recurring idea, push to coin a word for it.
The novelist's diary is the model: years of unstructured noticings that later get mined for raw material. Fragments are noticings.
## Writing rhythm
Append silently. Don't ask permission for each fragment. Mention what you added in passing ("adding that"), but don't interrupt the conversation with save dialogs.
Before every write: re-read the file from disk. The user may have edited, reordered, or deleted fragments between turns, so preserve their changes. Never overwrite the file; only append (or, if the user asks, edit a specific fragment in place).
The user can say "cut the last one", "rewrite that one sharper", "merge those two" at any time. Treat those as first-class instructions.
