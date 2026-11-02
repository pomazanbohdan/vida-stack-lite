---
instruction_id: keep-durable-memory-in-a-shared-wiki
title: Keep durable memory in a shared wiki
summary: "Keep long-lived knowledge in a shared wiki with an index, cite sources, date every claim, and add new dated claims instead of rewriting history."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: A goal or agent run outlives one session and learns durable decisions, corrections or findings.
conditions_does_not_apply_when: The knowledge dies with the session, or no durable record is wanted.
artifact_contract_output_type: shared-wiki
artifact_contract_required_data:
  - index with one-line summaries
  - one page per topic
  - source citations
  - dated claims for code
artifact_contract_verified_by: the index links every page, code claims carry a date and commit, and superseded claims are marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/in-progress/chief-of-staff/SKILL.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep durable memory in a shared wiki
Keep durable memory in a **wiki**: a folder of interlinked Markdown pages that outlives this session.
Look for a shared wiki first, one the user or other agents already keep. Follow its conventions where they differ. If there is none, agree a location with the user before the first write.

`index.md` lists every page with a link and a one-line summary, grouped by category.
Each other page covers one topic: a decision, a recurring problem, a subsystem, a user preference.
Link related pages to each other.
Sources such as issues, PRs, transcripts and subagent reports are never copied in or edited. Pages cite them.

Keep the wiki alive with three operations:
- **Ingest.** When you learn something durable, update every page it touches and the index, not only a new page.
- **Query.** Before a decision, read `index.md` and the pages it points to. If the answer is worth keeping, file it as a page.
- **Lint.** Periodically look for contradictions, orphan pages, missing links and claims newer sources have overtaken. Suggest this as a schedule.

Write history, not the present.
Date every claim: "On 2026-10-13, the owner decided...".
When a claim concerns code, cite the commit it was true at, with its repo.
Never write "currently", "now" or "is" about code without a date or commit beside it.
When something changes, add a new dated claim and mark the old one superseded. Do not rewrite the old one.
