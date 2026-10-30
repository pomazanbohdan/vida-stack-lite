---
instruction_id: write-minimal-agent-guidance
title: Write the smallest guidance for the observed failure
summary: "Write only the rules that address failures observed without the guidance, then re-run the same scenarios and revise until the agent complies."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The baseline failure has been observed and the guidance text must be written.
conditions_does_not_apply_when: No baseline test has been run yet.
artifact_contract_output_type: agent-guidance
artifact_contract_required_data:
  - observed failures
  - requirements
  - prohibitions
  - one example
artifact_contract_verified_by: each observed failure maps to a rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/adoption-guide.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/set-and-maintain-project-context.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=AGENTS.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Write the smallest guidance for the observed failure
Run the baseline scenario before writing the skill.
Document the exact behavior: what choices the agent made.
Document the rationalizations the agent used, verbatim.
Document which pressures triggered violations.
Identify patterns in rationalizations and failures.
Write guidance that addresses those specific rationalizations.
Do not add extra content for hypothetical cases.
Run the same scenarios with the skill.
The agent should now comply.
If the agent still fails, the skill is unclear or incomplete.
Revise and re-test.
Address the specific baseline failures identified in the test.
Don't write contrived examples.
Don't create fill-in-the-blank templates.
Keep each meaning in a **single source of truth**: one authoritative place, so changing the behaviour is a one-place edit. **Duplication** costs maintenance and tokens, and inflates a meaning's prominence on the ladder past its real rank. The **environment** is a source of truth too (`package.json` scripts, config files, the directory layout, `--help` output), and a document that restates it is a **cache**: a copy of a lookup, earning its load only when the lookup is expensive. Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses. Check every line for **relevance**: does it still bear on what the document does? Hunt **no-ops** sentence by sentence: an instruction the model already obeys by default pays load to say nothing. When a sentence fails, delete the whole sentence rather than trim words from it.
Write the project rules file describing the real conventions, the ones in the code, not the ones in the wiki. Include build/test commands, directory meaning, known landmines
The agent will infer conventions from the worst file it happens to read. Tell it the real ones.
The block holds only what is expensive to rediscover, or that the agent learns only after it has already gone wrong.
Repo overviews, directory trees, and tech-stack lists never enter: agents read code better than prose about code, and the copy goes stale.
A pitfall goes in only when someone has seen the mistake.
A scan finding that looks like a trap becomes a question, not a line.
It re-checks and cuts; the block ends smaller or equal, never larger.
When the evidence supports ten lines, ten lines is the deliverable.
The test for every line: would removing this line change agent behavior?
Skills, workflows, tasks, and agent definitions are prompt text an agent reads in full on every run.
Length and ambiguity are paid on every run; a corner case is paid only when it occurs.
So do not add instructions for exotic cases — the model usually handles them from context, and the reviewing human can correct it when it does not.
Prefer deleting an instruction to hedging it.
