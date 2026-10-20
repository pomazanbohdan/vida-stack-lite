---
instruction_id: write-one-beat-at-a-time
title: Write one beat at a time
summary: "Write an article as a journey of beats, writing only the chosen beat and re-reading the file before each next beat."
capability_tags:
  - write-technical-prose
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Raw material exists and an article must be shaped from it.
conditions_does_not_apply_when: The article is already structured.
artifact_contract_output_type: beat-by-beat-article
artifact_contract_required_data:
  - beats
  - grounded set
  - pivots
artifact_contract_verified_by: each offered next beat is reachable from the current grounded set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/in-progress/writing-beats/SKILL.md
status: active
revision: 1
---

# Write one beat at a time
The user has passed (or will pass) a markdown file of raw material. This is **exploit**: the exploring is done, the pile is fixed. Commit to a path through it and mine the pile to fill each beat.
If the user did not say where to save the article, ask once and remember the path.
Then run a beat-by-beat journey, choose-your-own-adventure style:
1. **Establish the prerequisites.** Before any beats, settle with the user what the audience already knows walking in: the concepts that are **grounded** from the start. Everything else must be grounded by a beat before a later beat can use it.
2. Write 2–3 candidate **starting beats**, drawn from the raw material. Each is a different entry point into the article. Each may only lean on grounded concepts; note what new concepts each one grounds. Show the user the beats before writing to the article file. The user picks one. Preview what beats that pick unlocks.
3. Once the user picks a starting beat, write **only that beat** to the article file. A beat may be one sentence or several paragraphs, whatever that beat naturally is. Stop there.
4. Re-read the article file from disk. Then offer 2–3 candidate **next beats**: different directions the journey could pivot to from where the article now stands. Each must be reachable from the current grounded set; note what each one grounds.
5. Loop steps 3–5 until the article reaches a natural end.
## What is a beat
A beat is one move in the journey. It does one thing: sets a scene, lands a point, asks a question, drops an aside, twists the angle. Then it stops, leaving the reader at a place where the next beat can pivot.
If a "beat" needs five paragraphs and three subheadings, it's not a beat; it's two beats glued together. Split it.
## Writing rhythm
- Append one beat at a time. Never write ahead.
- Re-read the article file from disk before every write. Preserve user edits absolutely.
- If the user edits a previous beat substantially, let it change what comes next.
- If the user says "rewrite that beat" or "go back and try a different beat 3", do it: edit in place, leave the rest alone.
