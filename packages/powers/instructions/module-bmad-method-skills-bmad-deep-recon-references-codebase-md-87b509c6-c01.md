---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-codebase-md-87b509c6-c01"
title: "bmad-method: skills/bmad-deep-recon/references/codebase.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-deep-recon/references/codebase.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/codebase.md\"}"
atom_ids:
  - answer-in-chat-when-one-file-is-enough
  - ask-the-subagent-once-and-take-unsettled-questions-in-the-digest
  - describe-how-the-code-works-and-how-it-got-that-way
  - open-a-decision-record-only-when-the-ask-names-it
  - replace-an-unbounded-ask-with-bounded-asks
  - write-a-complete-delegation-brief
  - write-each-section-from-its-digests-in-their-words
  - write-questions-that-do-not-state-the-goal
atom_count: 8
atoms: "[{\"atom_id\":\"answer-in-chat-when-one-file-is-enough\",\"file_sha256\":\"348be7f802c59b295551827d42b15ce2ccd36b90a77654743aa124558568c874\",\"content_sha256\":\"0b5cc1152ff51fe30813cffe8877e75d9b6d23792a6674cf9e0f3747a0dc557d\",\"file_bytes\":1264,\"body_bytes\":176},{\"atom_id\":\"ask-the-subagent-once-and-take-unsettled-questions-in-the-digest\",\"file_sha256\":\"065ef3ae46b4efdcd5e342c03c99d896e3262ba2a12170cf3bad74ce5c93cc71\",\"content_sha256\":\"f3dfb9b560e50895ef7cc43e045b058cf2e607c4707be8d94417515b409d9e64\",\"file_bytes\":1557,\"body_bytes\":236},{\"atom_id\":\"describe-how-the-code-works-and-how-it-got-that-way\",\"file_sha256\":\"b34362c9a75e794018f82fef6bda2f5f0fc9d1bc6e04d3fa87f252d0bc47ff67\",\"content_sha256\":\"704d48a73c33bb7f9a490874cb86bcbabd44f91b371e044b5c658136028de48b\",\"file_bytes\":1768,\"body_bytes\":422},{\"atom_id\":\"open-a-decision-record-only-when-the-ask-names-it\",\"file_sha256\":\"0a01fc8dad59cdce2f88a887af84e554cae9404b890aa4a44e3070d511725e1f\",\"content_sha256\":\"22484ff6224ce8bf24b97966f42a9bbc3cf9b6efd73816a4b9f342b48d966283\",\"file_bytes\":1323,\"body_bytes\":181},{\"atom_id\":\"replace-an-unbounded-ask-with-bounded-asks\",\"file_sha256\":\"acfc728764092bcb30f67929c72ed22bd1d0667fdfba47771b0ca1c653ce05d2\",\"content_sha256\":\"4d6933cb4ee2efd938a0fefceddfc4af7abd989b1eab00b40c6d302abd83c323\",\"file_bytes\":1557,\"body_bytes\":448},{\"atom_id\":\"write-a-complete-delegation-brief\",\"file_sha256\":\"19ed58bb3a0d386cd7deb944efeae45a0471fdb936b7d267be588b8a8cf5d57a\",\"content_sha256\":\"415ba1a5389d21ba992c3ebfeb16bdba520df406a364833cac89ccff9bcadc17\",\"file_bytes\":4220,\"body_bytes\":1930},{\"atom_id\":\"write-each-section-from-its-digests-in-their-words\",\"file_sha256\":\"e38963e269f1637a139fcf7a0b85ff73ca0f179f91f7327b50d604ad12e0ae5a\",\"content_sha256\":\"e608c9285e371ab7f0c465a3fe58589f0502708f2fd14a36f065df73e11c9ccb\",\"file_bytes\":1846,\"body_bytes\":676},{\"atom_id\":\"write-questions-that-do-not-state-the-goal\",\"file_sha256\":\"9e85b1fd595ddd1b51f302b4244db0133e2ea50bc7771f1b9be078d024d4514e\",\"content_sha256\":\"50ebc1d08ed7a1f63cd6e8f6150f2fb9a5ed533cb4ce9f90f78f0924221731d4\",\"file_bytes\":1587,\"body_bytes\":463}]"
carrier_sha256: 063ea0d54919ad81aaf7096547ca4e8f721a5601c06e19b079525bcec811daca
carrier_bytes: 16323
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-in-chat-when-one-file-is-enough -->
---
instruction_id: answer-in-chat-when-one-file-is-enough
title: Answer in chat when one file is enough
summary: "An ask that one file answers is answered in chat with citations, and a document is produced only when the asker still wants it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The whole ask can be answered from a single file.
conditions_does_not_apply_when: The ask spans many parts of the repository.
artifact_contract_output_type: chat-answer
artifact_contract_required_data:
  - the answer
  - its citation
  - the decision on producing a document
artifact_contract_verified_by: the answer was given in chat with a citation before any document was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Answer in chat when one file is enough
- An ask one file answers gets its answer in chat, cited, and a run only if the user still wants the document; headless, run as asked.
<!-- vpmodule:atom:end answer-in-chat-when-one-file-is-enough -->
<!-- vpmodule:atom:begin ask-the-subagent-once-and-take-unsettled-questions-in-the-digest -->
---
instruction_id: ask-the-subagent-once-and-take-unsettled-questions-in-the-digest
title: Ask the subagent once and take what it could not settle in the digest
summary: "Each worker gets one message with nothing from the original ask, and whatever it could not settle comes back inside its digest rather than a second message."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A research worker is being dispatched.
conditions_does_not_apply_when: The worker has already been dispatched and is answering.
artifact_contract_output_type: single-message-dispatch
artifact_contract_required_data:
  - the one message sent
  - what the worker could not settle
  - where it landed
artifact_contract_verified_by: the worker received one message and every open point is in its digest
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Ask the subagent once and take what it could not settle in the digest
- No second message: what a subagent could not settle goes in its digest.
- One message, with nothing from the ask
- the return contract: a digest, not raw results
<!-- vpmodule:atom:end ask-the-subagent-once-and-take-unsettled-questions-in-the-digest -->
<!-- vpmodule:atom:begin describe-how-the-code-works-and-how-it-got-that-way -->
---
instruction_id: describe-how-the-code-works-and-how-it-got-that-way
title: Describe how the code works and how it got that way
summary: "The document says how the relevant code works at one commit and how it got that way, with every claim cited to a line or a commit, and it names its readers."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A research document about a repository is being written.
conditions_does_not_apply_when: The work is a code change rather than a description of existing code.
artifact_contract_output_type: codebase-research-document
artifact_contract_required_data:
  - how the code works at the commit
  - how it got that way
  - the citation on every claim
artifact_contract_verified_by: every claim carries a citation to a line or a commit and the document covers one commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/research.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Describe how the code works and how it got that way
One ask about a repository, whether a question, a ticket or a goal, becomes a short document that says how the relevant code works at one commit and how it got that way, every claim cited to a line or a commit
- Its readers are the plan step that will change the code and a person checking one claim
and no recommendation in it: what to change is the reader's choice.
<!-- vpmodule:atom:end describe-how-the-code-works-and-how-it-got-that-way -->
<!-- vpmodule:atom:begin open-a-decision-record-only-when-the-ask-names-it -->
---
instruction_id: open-a-decision-record-only-when-the-ask-names-it
title: Open a decision record only when the ask names it
summary: "A decision record enters the context only when the ask names or continues it, because a document in context gets repeated whether or not it still holds."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The repository holds decision records and a research run is being set up.
conditions_does_not_apply_when: The ask names a decision record explicitly.
artifact_contract_output_type: decision-record-selection
artifact_contract_required_data:
  - the decision records listed
  - the one opened
  - the reason it was opened
artifact_contract_verified_by: only the decision record the ask named was opened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Open a decision record only when the ask names it
- and open one only when the ask names or continues it, since a document in context gets repeated whether or not it still holds.
<!-- vpmodule:atom:end open-a-decision-record-only-when-the-ask-names-it -->
<!-- vpmodule:atom:begin replace-an-unbounded-ask-with-bounded-asks -->
---
instruction_id: replace-an-unbounded-ask-with-bounded-asks
title: Replace an unbounded ask with bounded asks
summary: "An ask that no set of questions can answer is turned into a short list of bounded asks, and no run starts until they exist."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The ask is too wide to answer as it stands.
conditions_does_not_apply_when: The ask is already bounded by a question set.
artifact_contract_output_type: bounded-ask-list
artifact_contract_required_data:
  - the bounded asks
  - where a question stopped
  - the next ask to draft
artifact_contract_verified_by: no run started against an unbounded ask and every stopped question names its next ask
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Replace an unbounded ask with bounded asks
- An ask with no such set ("document the whole project") gets a short list of bounded asks instead and no run; headless, end `blocked` with them in `open_questions`.
- When a question’s budget runs out, or an answer opens a question the set does not hold, that question stops: write what its digests hold, and put where it stopped and the next ask, drafted by the rules above, in `## Open questions`.
<!-- vpmodule:atom:end replace-an-unbounded-ask-with-bounded-asks -->
<!-- vpmodule:atom:begin write-a-complete-delegation-brief -->
---
instruction_id: write-a-complete-delegation-brief
title: Write a complete delegation brief
summary: "Give the executor the result, context, bounds, acceptance check, and report contract, so the task needs no clarifying question."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "You hand work to another agent, a person, or a separate run."
conditions_does_not_apply_when: The work happens in the same conversation and no context has to cross a boundary.
artifact_contract_output_type: delegation-brief
artifact_contract_required_data:
  - result
  - context
  - bounds
  - acceptance check
  - report format
artifact_contract_verified_by: the delegate completes the task without a clarifying question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=agents/poteto-agent.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/templates/reproduce-automation-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/templates/triage-automation-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/runner-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/reviewer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/references/prompting.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/investigator-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/synthesizer-prompt.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write a complete delegation brief
A brief states the goal and the check for done. The workflow supplies the steps, so a few plain sentences beat a specification.
Say what is wrong or what the user wants. State the done check so it can pass or fail. Make it better and a duration are not checks.
Ask for the proof to show: the real command output, a recording of the flow, the stored value, or a before and after number.
Include what the user already knows: a symptom, a reproduction step, a log, or a link, which saves the executor a search.
State the real constraints: reproduce first, do not change code yet, zero behavior change, or let me review before proceeding. Each changes what the executor does.
Leave out the how. Say what to achieve and leave room to find a better way.
Leave out a list of skills or steps. A hand-written order drops or reorders steps the workflow keeps. Name a skill only to override one choice.
Leave out the user's theory of the cause until the executor has restated the problem. A stated guess narrows the search.
A dispatch describes one task, not the session's history. Do not paste accumulated prior-task summaries.
The brief is the single source of requirements. Exact values such as numbers, strings, signatures, and test cases appear only in it.
Include the interfaces and decisions from earlier work that the brief cannot know, and your resolution of any ambiguity you noticed.
Name the report contract and where the full report goes. The executor returns status, what changed, a one-line check summary, and concerns.
The executor never dispatches its own reviewer. Review arrives from the delegating side after the report.
A brief that needs a clarifying question is incomplete. Close the gap before dispatching.
Subagents answer them from the code and its history knowing only the questions, because a researcher who knows what is being built reports what should be instead of what is.
<!-- vpmodule:atom:end write-a-complete-delegation-brief -->
<!-- vpmodule:atom:begin write-each-section-from-its-digests-in-their-words -->
---
instruction_id: write-each-section-from-its-digests-in-their-words
title: "Write each section from its digests, in their words"
summary: "A section is written from the digests alone and in their words, each claim keeping the citation its digest gave it; the shared-method section appears only when two answers meet there."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The digests for a question have landed.
conditions_does_not_apply_when: The digests for the question have not landed yet.
artifact_contract_output_type: research-section
artifact_contract_required_data:
  - the section text
  - the citation on each claim
  - the shared-method section
artifact_contract_verified_by: every section comes from its digests and keeps the citations they carried
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Write each section from its digests, in their words
Write each question’s section as its digests land, from them alone and in their words, each claim with its citation as the digest gave it (code `path:line (symbol) @ sha`, history `sha "subject" #pr`); a `what touches X` section keeps every call site its digest cites, each with its citation, since the list is the answer.
- `## Where the answers meet`, after the question sections and only when two answers pass through the same method: each such method, the questions whose answers reach it, and the checks there that reject a value or throw, every line a claim the question sections already cite, with that citation.
<!-- vpmodule:atom:end write-each-section-from-its-digests-in-their-words -->
<!-- vpmodule:atom:begin write-questions-that-do-not-state-the-goal -->
---
instruction_id: write-questions-that-do-not-state-the-goal
title: Write questions that do not state the goal
summary: "The questions sent to the researchers name the code to look at and never the change that is being considered, so that the answer describes what is there."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A research ask about a repository has to become questions.
conditions_does_not_apply_when: The questions already exist and are agreed.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the questions
  - the shape of each question
  - the parts of the code they cover
artifact_contract_verified_by: no question states the intent or names what the ask wants built
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - research
---

# Write questions that do not state the goal
Write questions that send researchers to every part of the code the ask depends on, none stating the intent or naming what the ask wants built: "how does a job run end?", not "where would cancellation go?" or "can a running job be cancelled?".
- Four shapes: `how does X work`, `why is X this way`, `where does X live`, `what touches X`.
- An ask from a ticket or goal also gets a question on how that code is tested.
<!-- vpmodule:atom:end write-questions-that-do-not-state-the-goal -->