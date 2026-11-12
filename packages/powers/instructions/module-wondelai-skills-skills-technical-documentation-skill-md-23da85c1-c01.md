---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-technical-documentation-skill-md-23da85c1-c01"
title: "wondelai-skills: skills/technical-documentation/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/technical-documentation/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/technical-documentation/SKILL.md\"}"
atom_ids:
  - technical-documentation-apply
  - technical-documentation-audit
  - technical-documentation-changelog
  - technical-documentation-common-mistakes
  - technical-documentation-core
  - technical-documentation-procedures
  - technical-documentation-quick-diagnostic
  - technical-documentation-reader
atom_count: 8
atoms: "[{\"atom_id\":\"technical-documentation-apply\",\"file_sha256\":\"1ccffcef9ea877a11dfa63ede6f2ff4f50c70ef326b67925de6c733585192805\",\"content_sha256\":\"1b9a99a802d451a199cf8e219c6207bd874ffa0f3dd182fb722ebfdb5471450d\",\"file_bytes\":1514,\"body_bytes\":307},{\"atom_id\":\"technical-documentation-audit\",\"file_sha256\":\"4cbf71431675e1f4df8f02e3fdfdf23fe6aa29d0b0bf5d4629df76d8c57ebe62\",\"content_sha256\":\"9d072d38c8db63811017607a6caee36f0d6152544b23d1579c417a67855a8533\",\"file_bytes\":3283,\"body_bytes\":2041},{\"atom_id\":\"technical-documentation-changelog\",\"file_sha256\":\"9c10adc2420ebf8ac9258ff8638a120996c9c42e834c8a7ae9911af05a9328c0\",\"content_sha256\":\"5a6924e4d4ee98b5665707e5417da0f343d300fb0d6a11a1695fded99d5270a5\",\"file_bytes\":2201,\"body_bytes\":990},{\"atom_id\":\"technical-documentation-common-mistakes\",\"file_sha256\":\"f6079f8062a7fc2e8cde0edf6805b57237997bb6ddf59f358148e29898b90a4e\",\"content_sha256\":\"e45fbc0f53fdaae8a89d779ee5cd42992375ba8b14c915ac945ffc61fbe6f282\",\"file_bytes\":2007,\"body_bytes\":854},{\"atom_id\":\"technical-documentation-core\",\"file_sha256\":\"cabdb667743d2e0a125bc494224e242c33e07a7320a552db89a489be68334f9d\",\"content_sha256\":\"5314f43179e4b0a6029e78831022a3668c778292848e30c28427b6d2c4e698c7\",\"file_bytes\":2092,\"body_bytes\":957},{\"atom_id\":\"technical-documentation-procedures\",\"file_sha256\":\"8e7aa867515726593e4be127b96d53a61f3b114ad6a4f45d361ddc3573218290\",\"content_sha256\":\"1c26f67301ee1bb096375a52484c213b7622f5c3cdf9f5995c426e4a48d40606\",\"file_bytes\":2222,\"body_bytes\":1028},{\"atom_id\":\"technical-documentation-quick-diagnostic\",\"file_sha256\":\"ae254f39adf04bf1d4fa02708224d2ea39da2a80d3c3b5f98bed2a54d5a49195\",\"content_sha256\":\"650312e71bf47062aabed6f81ec3532fd7f3d7c1e2a1ec6fb43d785419a750f5\",\"file_bytes\":2712,\"body_bytes\":1494},{\"atom_id\":\"technical-documentation-reader\",\"file_sha256\":\"d57d60244dcb1a07e98531bbad56473488c730780bed8dc932024cdf295483ed\",\"content_sha256\":\"d3e52c1e7663382a1493492a9d88c749d73b9984c9d1299445608fed50a04a38\",\"file_bytes\":2137,\"body_bytes\":944}]"
carrier_sha256: 0d27b77de9ca70886b44cca37b069965af4c314aed6f22e6cc9691e0cd5169db
carrier_bytes: 19155
revision: 1
status: active
---
<!-- vpmodule:atom:begin technical-documentation-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-apply
title: Apply the documentation discipline
summary: "When auditing, writing or improving developer documentation, start from the reader's task, verify every fact against code, then apply the style guide in severity order: structure, then voice, then word choice."
capability_tags:
  - write-technical-prose
pattern_tags:
  - documentation-audit
conditions_applies_when: "Any audit, write or improve task on developer documentation."
conditions_does_not_apply_when: Marketing or landing-page copy.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The work starts from the reader's task and applies rules in severity order."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply the documentation discipline

Title plus the skill's operating summary: when auditing, writing, or improving developer documentation, start from the reader's task, verify every fact against the code, then apply the style guide in severity order — structure before voice, voice before word choice.
<!-- vpmodule:atom:end technical-documentation-apply -->
<!-- vpmodule:atom:begin technical-documentation-audit -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-audit
title: "Run the audit, rewrite or write protocol"
summary: "Confirm mode, reader and language; honor local style; read the checklist; verify facts before style; apply severity order; output the mandatory audit template, a scored rewrite with change log, or a document with TODO(verify) gaps."
capability_tags:
  - write-technical-prose
pattern_tags:
  - documentation-audit
conditions_applies_when: "Running a documentation audit, rewrite or write."
conditions_does_not_apply_when: A quick style-only edit.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The output follows the mandatory template and severity order, and no fact is invented or deleted."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L166-L192"
status: active
revision: 1
---

# Run the audit, rewrite or write protocol

Three modes share one discipline: intake -> local conventions -> read as the reader -> verify facts -> apply rules by severity -> output in a fixed shape. Protocol: (1) Intake — confirm mode (audit, improve, or write), document type, reader and level, and language; for write mode the reader's task and fact sources (code paths, existing docs) are required, do not start without them. (2) Local style guide — look for CONTRIBUTING.md, STYLE.md, docs/style-guide.md, .vale.ini, and conventions existing docs already follow; they win over Google; Vale with the Google package can automate the [EN] word/punctuation layer if wanted. (3) Read references/audit-checklist.md before any audit or improve pass; never cite a rule ID not read there. (4) Read the doc cold as the target reader, then check every command, flag, parameter, and behavior against the code before judging style. (5) Apply rules in severity order: Blocking -> High (structure, accessibility, missing reference entries) -> Medium (voice, notices, intro sentences) -> Low (word list, punctuation [EN]). (6) Output — a finding's location is one the reader can find (heading path plus line number when auditing a file); improve mode outputs a one-line 'Score before -> after', the full rewritten document, then a '## Change log' table (Change | Rule ID + name | Why); write mode outputs the document with TODO(verify) for every gap. Facts stated in the source document count as received from the user: keep them, marked TODO(verify) when unconfirmed, never delete them; never include a command, flag, or parameter not seen in code or received from the user. Audits must always use the fixed template: '# Documentation Audit: [path or title]' with Score X/10 and band, Shippable yes/no, Diagnostic N/10 with failed rows and reasons, Doc type/reader, Language, Local style guide, Blocking findings, a Findings table (# | Location | Rule ID+name | Before | After | Severity), and a Rewrite plan ordered structure -> voice -> words.
<!-- vpmodule:atom:end technical-documentation-audit -->
<!-- vpmodule:atom:begin technical-documentation-changelog -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-changelog
title: Write release notes and migration guides
summary: "Use Keep a Changelog with Unreleased on top, newest first, ISO dates, diff-linked headings and the fixed categories; never paste commits, put breaking changes first and make migration guides procedures with verification and rollback."
capability_tags:
  - write-technical-prose
pattern_tags:
  - changelog-structure
conditions_applies_when: "Release notes, changelogs or migration guides."
conditions_does_not_apply_when: An internal commit log.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Entries follow the structure, categories and migration procedure."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L149-L165"
status: active
revision: 1
---

# Write release notes and migration guides

Release notes, changelogs, and migration guides: a changelog is documentation for the reader who is about to upgrade; each entry states what changed, what it means for them, and what to do — in Keep a Changelog structure, in the voice of the rest of the docs. Newest version first, an 'Unreleased' section on top, ISO dates in version headings, version headings linked to diffs. Group entries under Added / Changed / Deprecated / Removed / Fixed / Security; never paste commit messages. Breaking changes go first in the version with a link to migration steps (convention). A deprecation entry names the replacement and the removal version or date. A migration guide is a procedure: 'Before you begin' (versions, backups), numbered steps with before/after snippets, 'Verify the migration', rollback. Apply the Google layer to every entry: second person for actions, no 'currently/new', code font for flags and APIs, one tense used consistently.
<!-- vpmodule:atom:end technical-documentation-changelog -->
<!-- vpmodule:atom:begin technical-documentation-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-common-mistakes
title: Avoid the listed documentation mistakes
summary: "Avoid feature-first organization, style before facts, click-here links, buried steps, stacked notices, bracketed placeholders and meaning rewrites; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing documentation for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L194-L205"
status: active
revision: 1
---

# Avoid the listed documentation mistakes

A table of seven recurring documentation mistakes with their failure mode and fix: (1) organizing by feature instead of reader task -> name the reader's task, pick the doc type, one task per page; (2) fixing style before verifying facts -> check every command and parameter against code first; (3) 'click here' and 'see below' link/cross-reference text -> link text names the target, cross-refs say 'see'; (4) steps buried in paragraphs with passive and future tense -> numbered imperative steps, condition first, present tense; (5) stacked Note/Warning boxes -> one notice per section, fold the rest into body text; (6) '<your-key>' or 'YOUR_API_KEY' placeholders -> ALL_CAPS placeholders explained after the sample; (7) rewriting meaning while 'fixing style' -> facts unchanged, unknowns become TODO(verify).
<!-- vpmodule:atom:end technical-documentation-common-mistakes -->
<!-- vpmodule:atom:begin technical-documentation-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-core
title: "Write for the reader's task"
summary: "Write for the reader's task rather than the feature list; treat the guide as guidelines, keep a project style guide first, and apply [EN] rules only to English without translating unless asked."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-type-fit
conditions_applies_when: All documentation work.
conditions_does_not_apply_when: A document with no reader task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The document names its reader task, precedence and language layer."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L14-L22"
status: active
revision: 1
---

# Write for the reader's task

Write for the reader's task, not the product's feature list; prose should be conversational but not frivolous, precise, and consistent. The guide's rules are guidelines, not absolute rules: depart from them when doing so improves the content (established domain terminology wins) but stay consistent within the document. Precedence: a project's own style guide first, then Google's Developer Documentation Style Guide, then Merriam-Webster (spelling), the Chicago Manual of Style (general style), and the Microsoft Writing Style Guide (technical style). Rules come in two layers: structural and content rules (headings, procedures, code samples, second person, active voice, timeless docs, accessibility) apply to documentation in any language; rules tagged [EN] (spelling, serial comma, contractions, the word list) apply only to English text and must be skipped for other languages. Never translate a document unless asked.
<!-- vpmodule:atom:end technical-documentation-core -->
<!-- vpmodule:atom:begin technical-documentation-procedures -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-procedures
title: Write procedures and code samples
summary: "Use numbered single imperative actions, optional prefixes, sub-step letters, bold UI names and device verbs; use code font, ALL_CAPS placeholders explained after the sample, and runnable minimal samples wrapped at 80 characters."
capability_tags:
  - write-technical-prose
pattern_tags:
  - procedure-steps
conditions_applies_when: Writing steps or code samples.
conditions_does_not_apply_when: Conceptual prose with no action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each step is one action with a runnable sample and explained placeholders.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L112-L130"
status: active
revision: 1
---

# Write procedures and code samples

A procedure is a numbered list of single imperative actions, each stating where to act and what to expect; code is set in code font, introduced by a sentence ending in a colon, and uses placeholders the reader cannot mistake for literals. One action per step; optional steps get an 'Optional:' prefix; a single-step procedure is a bullet, not '1.'. Sub-steps run a, b, c; document the shortest path, not every alternative. UI element names are bold and match on-screen casing; use 'click' for a mouse, 'tap' for touch, 'select' when device-agnostic. Code font applies to filenames, paths, commands, flags, parameters, and values — not product names. Placeholders are ALL_CAPS_WITH_UNDERSCORES, never '<your-key>' or 'YOUR_API_KEY', and are explained right after the sample ('Replace PROJECT_ID with...'). Command syntax uses [optional], {a|b} for exclusive choices, and '...' for repeatable arguments. Samples are runnable, minimal, wrapped at 80 characters, and show the expected output.
<!-- vpmodule:atom:end technical-documentation-procedures -->
<!-- vpmodule:atom:begin technical-documentation-quick-diagnostic -->
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
<!-- vpmodule:atom:end technical-documentation-quick-diagnostic -->
<!-- vpmodule:atom:begin technical-documentation-reader -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-reader
title: Match the document type to the reader
summary: "Name one reader and one task, pick tutorial, how-to, concept, reference or README, state audience and scope, list prerequisites before step one, and end procedures with verification and next steps."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-type-fit
conditions_applies_when: Choosing or restructuring a document type.
conditions_does_not_apply_when: A mixed page with no single reader task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The document names one reader, one type, audience/scope and a verification ending."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L29-L50"
status: active
revision: 1
---

# Match the document type to the reader

Every page serves one reader with one task; name the audience and level and what the reader will be able to do afterwards before writing, and pick the document type that fits: tutorial (learn by doing), how-to (accomplish a task), concept (understand), reference (look up), README (orient and start). Per Google convention, open a doc with an audience statement and a scope plus non-scope statement; list prerequisites in a 'Before you begin' section before step 1 rather than inside a step; put key points first in the intro (what the reader gets, not product history); end every procedural page with a verification ('Confirm that...') and a 'What's next' section. A page mixing concept, procedure, and reference should be split into linked pages; a tutorial teaches one path end to end while a how-to assumes context; a README orients with what it is, who it's for, a three-step start, and links out.
<!-- vpmodule:atom:end technical-documentation-reader -->