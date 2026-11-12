---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-technical-documentation-skill-md-23da85c1-c02"
title: "wondelai-skills: skills/technical-documentation/SKILL.md module"
summary: "Carrier for 5 atomic instructions from wondelai-skills:skills/technical-documentation/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/technical-documentation/SKILL.md\"}"
atom_ids:
  - technical-documentation-reference
  - technical-documentation-score
  - technical-documentation-structure
  - technical-documentation-voice
  - technical-documentation-words
atom_count: 5
atoms: "[{\"atom_id\":\"technical-documentation-reference\",\"file_sha256\":\"fb26710a9a7a1c8d864e9ec0e81fbf63d0d34f174d1c018949c32d580937ef8c\",\"content_sha256\":\"318c7c4ccc5f9ab3f8b3dcb5f943b9784f3ebdc2104143d32a935d886a24e441\",\"file_bytes\":2160,\"body_bytes\":927},{\"atom_id\":\"technical-documentation-score\",\"file_sha256\":\"519ba7f6f9cedcc6d54ba8d88eaae3ed3ff80b79f0100a8d601e2f1ce6aa3200\",\"content_sha256\":\"8e1abdbbce7399a280c2c7a9f494d539ca6d51891ac0db7f4bfee1ede866fc30\",\"file_bytes\":1824,\"body_bytes\":681},{\"atom_id\":\"technical-documentation-structure\",\"file_sha256\":\"c6f764efe573a0d015c30e085edb16e3df4ef617d9765e6f94be45d2376f9df7\",\"content_sha256\":\"b16ee7ed9a1c820530cde5c37c4accad8bd9ef629d6a3113c2ffd58b15e995de\",\"file_bytes\":2264,\"body_bytes\":1053},{\"atom_id\":\"technical-documentation-voice\",\"file_sha256\":\"bbe515dd4ba26fad457b67f1833e79496bdae5af72c3ec2b5010361470ddf617\",\"content_sha256\":\"c185d1cc91fa7610d71072b70af04fd620d8c3e706bb1ee8d586d37428098dda\",\"file_bytes\":2028,\"body_bytes\":866},{\"atom_id\":\"technical-documentation-words\",\"file_sha256\":\"56565469bc7d9683e3ce9faea2d2156257dd18a12bbe2e398337889a21cdf7ae\",\"content_sha256\":\"63db76c63614b1e13c3179ba0a4bc3ed94df17f604e2f5405efb2a8ef2d0ac6d\",\"file_bytes\":2060,\"body_bytes\":879}]"
carrier_sha256: e9a262e28b0fa6a9bcf63f6a74d50748990b7992bd6fea35be7f7a7aa2aa27a4
carrier_bytes: 10931
revision: 1
status: active
---
<!-- vpmodule:atom:begin technical-documentation-reference -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-reference
title: Complete reference documentation
summary: "Document every public class, method, field, constant and enum; open with the category verb; document parameters, returns and exceptions; name replacements for deprecated elements and give CLI help a usage line, synopsis and every flag."
capability_tags:
  - write-technical-prose
pattern_tags:
  - reference-completeness
conditions_applies_when: "API reference, docstrings or CLI help."
conditions_does_not_apply_when: Internal code with no public surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every public element has a consistent entry with parameters, returns and exceptions."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L131-L148"
status: active
revision: 1
---

# Complete reference documentation

Reference documentation rules (API, docstrings, CLI help): reference text is descriptive, complete, and formulaic — every entry must exist and read the same way. Document every public class, method, field, constant, and enum value; a missing entry reads as 'unsupported'. Method descriptions open with the category verb: 'Gets the...', 'Sets the...', 'Checks whether...', 'Creates a...', 'Returns...' — never 'This method...'. Non-boolean parameters start 'The...' or 'A...'; booleans read 'If true, ... If false, ...' (action) or 'True if ...; false otherwise' (state). Document return values and exceptions ('Thrown when...') for every method that has them. A deprecated element names its replacement in the first sentence. CLI --help (convention — Google has no --help page): usage line in [optional] syntax, one-line synopsis, every flag described with the same placeholder style.
<!-- vpmodule:atom:end technical-documentation-reference -->
<!-- vpmodule:atom:begin technical-documentation-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-score
title: Score the documentation
summary: "Score the ten diagnostic rows one point each, report the score, band, failed rows and exact edits, and treat blocking findings as a separate not-shippable gate."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing developer documentation.
conditions_does_not_apply_when: A code review that does not assess documentation.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, band, failed rows, edits and blocking status."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L23-L26"
status: active
revision: 1
---

# Score the documentation

Scoring target is 10/10, computed as the number of Quick Diagnostic rows passed (10 rows, 1 point each; the [EN] row auto-passes for non-English docs). Bands: 9-10 ships as is; 7-8 requires word- and voice-level edits only; 5-6 requires restructuring sections then re-editing; <=4 requires rewrite from the doc-type skeleton. Blocking findings — wrong or unverifiable facts, a procedure that cannot be completed, or information that exists only in an image or in an image without alt text — are a separate gate: the document is not shippable at any score until they are fixed. Report the score, the failed rows, and the exact edits that reach 10/10.
<!-- vpmodule:atom:end technical-documentation-score -->
<!-- vpmodule:atom:begin technical-documentation-structure -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-structure
title: "Structure headings, lists, tables and notices"
summary: "Use sentence-case headings, imperative task headings and noun-phrase concept headings; introduce lists and tables, avoid empty or merged cells, use one notice per section, name link targets and never hide information in an image alone."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-structure
conditions_applies_when: Fixing page structure.
conditions_does_not_apply_when: A document with no headings or lists.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Headings, lists, tables, notices, links and alt text follow the rules."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L88-L111"
status: active
revision: 1
---

# Structure headings, lists, tables and notices

Structure is the reader's map: headings use sentence case and read as a table of contents; task headings are bare imperatives ('Create an instance'), concept headings are noun phrases ('Instance lifecycle'), and '-ing' headings are forbidden. Lists need an introductory sentence ending in a colon, every item in the same grammatical form, and numbering only when order matters; description lists (term -> definition) are preferred over two-column tables for paired data. Tables require a header row and an intro sentence, with no merged or empty cells because screen readers depend on them. Notices: Note = useful but optional; Caution = proceed carefully; Warning = harm or irreversible loss; do not stack them and one per section is a practical ceiling (marked inferred in source). Cross-references say 'see', never 'above' or 'below'. Link text names the target ('see Configure a custom domain'), never 'click here'. Alt text states the image's purpose; information must never live only in a picture.
<!-- vpmodule:atom:end technical-documentation-structure -->
<!-- vpmodule:atom:begin technical-documentation-voice -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-voice
title: "Use direct, active, timeless voice"
summary: "Address the reader as you, make the actor explicit, use present tense and timeless wording, allow passive only for unknown actors, and ban please, simply, easily, just and anthropomorphism."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-voice
conditions_applies_when: Rewriting documentation voice.
conditions_does_not_apply_when: Quoted source text that must remain verbatim.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The text uses second person, active present tense and no banned filler."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L51-L69"
status: active
revision: 1
---

# Use direct, active, timeless voice

Voice rules: address the reader as 'you'; make the actor of every sentence explicit; describe behavior in present tense; write as if read in five years. 'We' hides the actor and 'the user' turns the reader into a third party — both weaken an instruction. Passive voice allowed only when the actor is unknown or irrelevant ('The file is encrypted at rest'). 'Will' belongs only to genuinely later effects ('The server sends an ack', not 'will send'). Contractions are fine — Google prefers 'isn't' over 'is not' for negations [EN]. Software does not want, see, or think ('The API detects', not 'the API sees'). No 'please' (reserve for asking permission), no 'simply/easily/just', no superlatives — if a step is easy the reader will notice. Timeless: cut 'currently', 'new', 'soon'; never pre-announce unreleased features.
<!-- vpmodule:atom:end technical-documentation-voice -->
<!-- vpmodule:atom:begin technical-documentation-words -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-words
title: Choose plain words and put conditions first
summary: "Put the condition before the instruction, keep one idea per sentence, spell out abbreviations, translate Latin abbreviations, follow the [EN] word list and define jargon for the stated reader."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-words
conditions_applies_when: Editing sentences and word choice.
conditions_does_not_apply_when: "Non-English text where [EN] rules are skipped."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Conditions precede actions and word choices follow the list or local guide.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L70-L87"
status: active
revision: 1
---

# Choose plain words and put conditions first

Sentence and word rules: put the condition before the instruction ('To delete the document, click Delete' — readers decide applicability before acting); one idea per sentence; choose the plain word the guide's word list prefers. Spell out an abbreviation on first use with the short form in parentheses; skip only universally known ones (URL, HTML). Latin abbreviations translate and scan poorly: 'for example' not 'e.g.', 'that is' not 'i.e.', omit 'etc.' or finish the list [EN]. 'can' = ability, 'may' = permission, 'might' = possibility [EN]. Word list samples [EN]: sign in (not log in), set up as a verb, lets you (not allows you to), through or by using (not via), after (not once), use (not leverage or utilize), checkbox, email. Jargon is fine for the stated reader and a defect for anyone else — define it or link it.
<!-- vpmodule:atom:end technical-documentation-words -->