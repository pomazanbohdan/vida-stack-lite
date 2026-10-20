---
instruction_id: write-technical-prose-to-a-standard
title: Write technical prose to a standard
summary: "Write so a tired engineer understands on the first read: pick one mode, cut every word that does no work, and leave no sentence open to two readings."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: "You write an explanation, report, documentation, or change description for a person."
conditions_does_not_apply_when: The text is a machine format with a fixed schema.
artifact_contract_output_type: technical-text
artifact_contract_required_data:
  - thesis
  - structure
  - examples
  - reader check
artifact_contract_verified_by: a reader unfamiliar with the context finds the answer unaided
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/technical-writing/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/in-your-own-words/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/_STYLE_GUIDE.md
status: active
revision: 2
---

# Write technical prose to a standard
Write so a tired engineer understands on the first read.
Cut every word that does no work. If the sentence survives without a word, the word goes.
Use the short, everyday word. Use, not utilize. Help, not facilitate. Do, not perform. A long word has to buy its length with precision.
When a rule makes a sentence worse, fix the sentence another way or leave it alone. A sentence that follows every rule and sounds like a machine wrote it has failed.
The codebase is the word list. Write the real symbol, file, flag, or command name, not a synonym or a description of it.
Do not invent jargon. Use the words a developer would say out loud. A named pattern is fine when the text says what it means the first time.
Vary the rhythm. Mix sentence lengths on purpose. Short sentences land a point; longer ones carry a fact with its condition or consequence.
Have a view where the mode allows it. Explanation weighs trade-offs. Reference stays dry.
Be specific over sterile: a column rename fails the build, not schema changes can cause issues.
Pick one mode first. Action and learning is a tutorial. Action and work is a how-to. Understanding and work is reference. Understanding and learning is explanation.
Do not mix modes. Split and link instead.
Talk to the reader as you, in the present tense. Say who does what. Write instructions as commands.
Put the condition before the instruction. Put the common case first, exceptions after.
Do not pre-announce, and do not start consecutive sentences with the same phrase.
Link with words that say where the link goes. Never click here.
Headings carry the point, not just the topic. Use sentence case, one top-level heading per page, and no skipped levels.
Numbered lists for sequences, bullets for everything else. Introduce a list with a complete sentence and keep items parallel.
One instruction per sentence. Split long instructions and long sentences.
Keep words like only and not next to the word they change. Make every it, they, and this point at one obvious thing.
Call each thing by one name everywhere. Skip idioms, colloquialisms, Latin abbreviations, and metaphors.
A change description and a commit message are writing too. A change body is a briefing a reviewer can read in under a minute. Do not paste logs, identifier lists, or metric tables. Link them.
Make the main point easy to find and act on.
Prefer concrete, familiar words and short sentences.
Use literal language.
Avoid decorative metaphors, and do not use a metaphor instead of explaining how something works.
Give the gist before qualifications and detailed mechanics.
Remove repetition, opening text that delays the point, inflated claims, and caveats that do not change the reader's decision.
Define an unfamiliar term at first use.
