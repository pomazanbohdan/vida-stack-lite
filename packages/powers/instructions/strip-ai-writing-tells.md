---
instruction_id: strip-ai-writing-tells
title: Strip AI writing tells
summary: "Remove template phrasing and empty conclusions until the text reads like ordinary human writing, without losing meaning."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: You prepare text a person will read and it must not look generated.
conditions_does_not_apply_when: The text is a service template with fixed wording.
artifact_contract_output_type: edited-text
artifact_contract_required_data:
  - removed phrases
  - rewritten passages
  - meaning check
artifact_contract_verified_by: a read-through confirming no sentence lost meaning
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/unslop/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "Body lists general prose-editing rules for any human-read text; conditions distinguish editable text from fixed templates, but neither establishes a supported domain."
---

# Strip AI writing tells
Edit text to remove patterns that read as machine-written. Scan for the patterns below, then rewrite. Preserve meaning and match the intended tone.
Cut superficial -ing phrases such as highlighting, ensuring, reflecting, showcasing, and fostering. Delete them or expand them with real sources.
Name the source of a vague attribution, such as experts believe, industry reports suggest, or some critics argue. Name it or delete it.
Replace machine vocabulary with plain words: additionally, crucial, delve, enhance, foster, garner, interplay, intricate, landscape, pivotal, showcase, tapestry, testament, underscore, vibrant.
Say is or has instead of serves as, stands as, boasts, or features.
State the point directly instead of not just X but Y.
Do not force ideas into groups of three. Use the natural number.
Pick one name for a thing and repeat it instead of cycling through synonyms.
Drop false ranges, where from X to Y does not describe a meaningful scale. List the topics directly.
Avoid em dashes. Use periods or commas. Avoid mid-sentence colons, decorative boldface, title case headings, decorative emojis, and curly quotes.
Remove chatbot phrases and sycophantic tone. Respond directly.
Cut filler: in order to becomes to, due to the fact that becomes because, and it is important to note that becomes nothing.
Reduce excessive hedging to the single hedge the evidence supports.
Replace generic conclusions with specific plans or facts.
Prefer the concrete word over an abstract metaphor noun, and say what a thing does rather than how it feels.
Shorten or split dense sentences. One idea per sentence.
Prefer active voice, and name the actor when it is known.
Cut adverbs or use a stronger verb. Prefer the plain word.
Do not over-compress: keep articles, verbs, and whole sentences, and spell out arrows and abbreviations.
If a rule makes a sentence worse, fix the sentence another way or leave it alone. A sentence that follows every rule and sounds like a machine wrote it has failed.
