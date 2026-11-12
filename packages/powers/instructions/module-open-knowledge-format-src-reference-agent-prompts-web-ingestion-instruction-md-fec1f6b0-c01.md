---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-src-reference-agent-prompts-web-ingestion-instruction-md-fec1f6b0-c01"
title: "open-knowledge-format: src/reference_agent/prompts/web_ingestion_instruction.md module"
summary: "Carrier for 8 atomic instructions from open-knowledge-format:src/reference_agent/prompts/web_ingestion_instruction.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"src/reference_agent/prompts/web_ingestion_instruction.md\"}"
atom_ids:
  - a-rejected-write-did-not-happen-read-it-again-and-retry
  - capture-the-concrete-expression-not-a-paraphrase
  - carry-every-key-into-a-replacement-record
  - close-with-a-short-completion-summary
  - follow-the-high-value-links-out-of-a-seed-page
  - link-every-new-reference-from-the-document-that-uses-it
  - merge-the-lists-instead-of-replacing-them
  - mint-a-reference-only-when-it-passes-the-gates
atom_count: 8
atoms: "[{\"atom_id\":\"a-rejected-write-did-not-happen-read-it-again-and-retry\",\"file_sha256\":\"2ca348d5fcd9b2284a8de62e9a37b6c7aba199d54fa2d519f2a242a386be536e\",\"content_sha256\":\"9c07b1a1f3f5d27aeb9b3039fc8e37fae947c767c10291cd1d23e309a6ecc991\",\"file_bytes\":1984,\"body_bytes\":742},{\"atom_id\":\"capture-the-concrete-expression-not-a-paraphrase\",\"file_sha256\":\"9e0c04577e87bf2bb9e77a9c3a36de9f7c8ad735612a18ac0b6535aff1a4a1ef\",\"content_sha256\":\"4097d4b6aba6edd28a3089cb9aa987f9a613ec6a3f55121b26a635bc80f9b39c\",\"file_bytes\":2011,\"body_bytes\":727},{\"atom_id\":\"carry-every-key-into-a-replacement-record\",\"file_sha256\":\"02179243eed76133476dfbf81d55ed270853e22078a9e32cd65058fd951faafd\",\"content_sha256\":\"5049f8c0e5f91633f2a748e7335042f7fa5d364689d85f89b232855d41011f81\",\"file_bytes\":2012,\"body_bytes\":777},{\"atom_id\":\"close-with-a-short-completion-summary\",\"file_sha256\":\"c1ba7bbfe58d09842aeb335c8d522301516563d50d175c843af762e4187b7d3c\",\"content_sha256\":\"ee47a31f1b989b923426f48b7db4d3e09fbf4ed00b88eaba6dfd62d9b4dbb8ab\",\"file_bytes\":2359,\"body_bytes\":902},{\"atom_id\":\"follow-the-high-value-links-out-of-a-seed-page\",\"file_sha256\":\"2fa97be702a58a9e19b78574a0a40a7ae278463a4a3670e2a7b8cc2721ba4711\",\"content_sha256\":\"9073f294f6091480d4229c79fd876d0a12494e3e2d537526bb5be38b0723cda2\",\"file_bytes\":2493,\"body_bytes\":1246},{\"atom_id\":\"link-every-new-reference-from-the-document-that-uses-it\",\"file_sha256\":\"f86b9ccbd7405997ac3fd707d18b41ef5df1c89205308f7f5dad6d6105ef958b\",\"content_sha256\":\"aa4272d72187a00373f8398add2c9a3ccd4ab09824e856599cddc79fe15215d9\",\"file_bytes\":2041,\"body_bytes\":840},{\"atom_id\":\"merge-the-lists-instead-of-replacing-them\",\"file_sha256\":\"72fb77e6b3c5089c874b6ee656cc2d1fc1b40bd82e72999f363c4e0e2f396d5f\",\"content_sha256\":\"eebb91d8617ccae43f78b1bec8c019e07adfbad065a6633af594c028f20654e7\",\"file_bytes\":1467,\"body_bytes\":317},{\"atom_id\":\"mint-a-reference-only-when-it-passes-the-gates\",\"file_sha256\":\"2d7a80459e378ec569788bc5d77edc24c072e435c64b55be6eb4753d717b6842\",\"content_sha256\":\"8d0f7f27bfd44ae882c8453ec1cac9420fc392bd6b78b21145c744f9f4a002ba\",\"file_bytes\":2726,\"body_bytes\":1463}]"
carrier_sha256: 5e1f363401ab694f2bf28b3768796a78d073cf612b0b7cda687801b53c0c8367
carrier_bytes: 18294
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-rejected-write-did-not-happen-read-it-again-and-retry -->
---
instruction_id: a-rejected-write-did-not-happen-read-it-again-and-retry
title: "A rejected write did not happen, so read it again and retry"
summary: "A write that returned an error changed nothing: the previous content is read again, copied in full, and the write is made again with the new content on top."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-rerun-policy
conditions_applies_when: A write of a document was refused by a guard or returned an error.
conditions_does_not_apply_when: The write was accepted.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the error the write returned
  - the content that was read again
  - the write that was made again
artifact_contract_verified_by: the document on disk holds the previous content plus the new content and the error was not treated as a success
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A rejected write did not happen, so read it again and retry
**A rejected write did not happen — fix it and retry, do not give up.**
Do not abandon the concept and do not move on as if it succeeded.
Re-call `read_existing_doc(concept_id)`, copy the **entire** existing `# Schema` (every field) and every existing `sources` entry verbatim into your new call, add only your new content on top, and call `write_concept_doc` again.
A table schema from the metadata pass is authoritative and complete — never shrink or summarize it;
augment field descriptions inline while keeping every field.
If after re-reading you still cannot add value without dropping existing content, mint a `references/<slug>` doc instead and skip the augmentation.
<!-- vpmodule:atom:end a-rejected-write-did-not-happen-read-it-again-and-retry -->
<!-- vpmodule:atom:begin capture-the-concrete-expression-not-a-paraphrase -->
---
instruction_id: capture-the-concrete-expression-not-a-paraphrase
title: "Capture the concrete expression, not a paraphrase"
summary: "A metric that the source states is captured with its name, its definition and the expression that computes it; the reference document owns the expression and the document that uses it links to it instead of repeating it."
capability_tags:
  - define-output-format
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "A fetched page states a metric, a dimension or a join."
conditions_does_not_apply_when: The page states nothing that can be captured in that shape.
artifact_contract_output_type: reference-document
artifact_contract_required_data:
  - the name
  - the definition
  - the expression
artifact_contract_verified_by: the expression is written out in full and the document that uses it links to the reference instead of repeating the expression
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Capture the concrete expression, not a paraphrase
When a fetched page contains any of the following content types, you **must** capture them in the appropriate doc — these are the highest-signal artifacts a web page can contribute and they are easy to lose in a topical paraphrase.
Capture the metric’s name, a one-line definition, and the **concrete SQL expression** (e.g. `COUNT(DISTINCT user_pseudo_id)`) — paraphrase is not enough.
Capture the two sides and the **concrete `ON` clause**.
Do not duplicate the SQL in the table doc; the reference owns it.
Body: the `ON` clause as a fenced SQL block, then one sentence on when to use this join.
These structured extractions bypass the four-gate reference test above.
<!-- vpmodule:atom:end capture-the-concrete-expression-not-a-paraphrase -->
<!-- vpmodule:atom:begin carry-every-key-into-a-replacement-record -->
---
instruction_id: carry-every-key-into-a-replacement-record
title: Carry every key into a replacement record
summary: "A record that is written again replaces the old one completely: the new record carries every key the old one had, and a key that is left out is lost."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - override-layering
conditions_applies_when: A record with a fixed set of keys is written again over an existing one.
conditions_does_not_apply_when: The record is created for the first time.
artifact_contract_output_type: record-replacement
artifact_contract_required_data:
  - every key the previous record had
  - the values that are kept
  - the key that may be dropped
artifact_contract_verified_by: "no key of the previous record is missing in the new one, except `generated`, which is omitted so the tool refreshes it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Carry every key into a replacement record
`write_concept_doc` does a full replacement, not a patch — the `frontmatter` argument **must include every key** the existing doc had (`type`, `title`, `description`, `resource`, `tags`, etc.).
Omitting a key drops it.
The augmentation rule is about which *values* you keep, not which *keys* you send.
Copy `type` verbatim from the existing frontmatter into your new dict.
The web page’s `<title>` is not the concept’s title.
The web page URL goes in the `sources` list, never in `resource`.
You may refine `description` if the web page surfaces a more accurate one-sentence summary; otherwise copy it verbatim.
Leave `generated` unset (omit the key) so the tool refreshes it.
This is the *only* key you may legitimately drop.
<!-- vpmodule:atom:end carry-every-key-into-a-replacement-record -->
<!-- vpmodule:atom:begin close-with-a-short-completion-summary -->
---
instruction_id: close-with-a-short-completion-summary
title: Close with a short completion summary
summary: "The run ends with one or two sentences: what changed, the verification and review result including what was deferred, and the commit hash; never a file list and never a process narration."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The work is finished and the result is reported to the person who asked for it.
conditions_does_not_apply_when: The work is paused for a handoff or the result is still being produced.
artifact_contract_output_type: completion-summary
artifact_contract_required_data:
  - what changed
  - the verification and review result
  - what was deferred
  - the commit hash when one was created
artifact_contract_verified_by: "the summary is one or two sentences and names the change, the result and the commit without listing files"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-05-present.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Close with a short completion summary

Change `{plan_file}` status to `built` in the frontmatter.

If version control is available and the tree is dirty, create a local commit with a conventional message derived from the plan title.

NEVER auto-push.

Display a very short completion summary — one or two sentences — including:

- What changed.
- The verification and review result, including whether anything was deferred.
- The commit hash, if one was created.

Do not list changed files, repeat details from the plan, or narrate the process unless the user asks.

Offer applicable next actions in one short line: when version control and a remote are available

- create a pull request (and push first if needed)
- or make another change

End your session with one short sentence summarizing what you did: how many pages you fetched, how many docs you updated, how many references you minted.
<!-- vpmodule:atom:end close-with-a-short-completion-summary -->
<!-- vpmodule:atom:begin follow-the-high-value-links-out-of-a-seed-page -->
---
instruction_id: follow-the-high-value-links-out-of-a-seed-page
title: Follow the high-value links out of a seed page
summary: "A seed page is an index: the links to the authoritative pages behind it are followed and the chrome of the site is skipped, and the crawl continues while there is material left."
capability_tags:
  - research-primary-sources
pattern_tags:
  - explore-then-exploit
conditions_applies_when: A crawl starts from a list of seed URLs.
conditions_does_not_apply_when: The material is already in hand.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the seed pages
  - the links that were followed
  - the links that were skipped
artifact_contract_verified_by: "the authoritative links behind every seed were followed, the navigation, footer and marketing links were skipped, and the page budget was not exceeded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Follow the high-value links out of a seed page
From those links, pick the ones that look like they lead to **authoritative documentation** on topics related to the existing concepts.
A seed is usually an index or schema-reference page, so its most valuable outbound links are to **sample-query / cookbook pages, metric-definition pages, and field/enum reference pages** — follow those;
Skip nav links, site footers, login pages, "About us", marketing pages, cookie/privacy notices, and anything obviously tangential.
Their results in turn contain more links, which you can also follow — recursively, with your judgment as the filter.
Do not stop after one page: keep crawling relevant in-domain links until you have covered the material or hit the page budget.
Fetching only the seed page and stopping is **not** done — seeds are indexes; the value is one or two hops out.
You have actually fetched the seed pages and followed their high-value links (sample-query/cookbook, metric, and reference pages) until further in-domain fetches would have genuine diminishing returns.
A **max-pages budget** (a hard cap enforced by the `fetch_url` tool; you cannot exceed it).
If the page is irrelevant, low-signal, or already covered, do nothing.
<!-- vpmodule:atom:end follow-the-high-value-links-out-of-a-seed-page -->
<!-- vpmodule:atom:begin link-every-new-reference-from-the-document-that-uses-it -->
---
instruction_id: link-every-new-reference-from-the-document-that-uses-it
title: Link every new reference from the document that uses it
summary: "A reference that no document links to is unfinished: it is cited from the primary document that needs it, and both sides of a join cite it, before the work is declared done."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A new reference document has been written.
conditions_does_not_apply_when: No reference document was created.
artifact_contract_output_type: reference-document
artifact_contract_required_data:
  - the references that were created
  - the document that cites each of them
artifact_contract_verified_by: every reference that was created is linked from at least one primary document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Link every new reference from the document that uses it
Cite it back (MANDATORY, not optional): a minted metric reference is **incomplete until a primary table doc links to it**.
An orphan `references/metrics/<slug>.md` that no table cites is a bug, not a deliverable.
Cite it back (MANDATORY): as with metrics, a minted join reference is incomplete until **both** sides link to it.
Before you stop, **verify no reference you minted is orphaned**: every `references/metrics/<slug>.md` and `references/joins/<a>__<b>.md` you wrote this session must be linked from at least one primary table doc’s `# Metrics` / `# Joins` section.
If any is still uncited, go back and augment the contributing table doc(s) now — do not end the session with orphan references.
A metric reference you minted but never linked is worse than not minting it.
<!-- vpmodule:atom:end link-every-new-reference-from-the-document-that-uses-it -->
<!-- vpmodule:atom:begin merge-the-lists-instead-of-replacing-them -->
---
instruction_id: merge-the-lists-instead-of-replacing-them
title: Merge the lists instead of replacing them
summary: "A list that the record already holds grows by the new entries; the entries it held are kept, so the record never loses what it already stated."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - expand-contract
conditions_applies_when: A record that already carries lists is written again with new entries for them.
conditions_does_not_apply_when: The record is created for the first time.
artifact_contract_output_type: record-replacement
artifact_contract_required_data:
  - the entries the record already held
  - the new entries
artifact_contract_verified_by: every previous entry is still in the record and the new entries are added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Merge the lists instead of replacing them
For `tags`, pass the union of existing tags plus any new ones (merge, don’t replace).
For `sources`, pass the union of existing entries plus any new ones (merge, don’t replace) — the tool refuses a write that shrinks the list.
Add an entry for the page you ingested.
<!-- vpmodule:atom:end merge-the-lists-instead-of-replacing-them -->
<!-- vpmodule:atom:begin mint-a-reference-only-when-it-passes-the-gates -->
---
instruction_id: mint-a-reference-only-when-it-passes-the-gates
title: Mint a reference only when it passes the gates
summary: "A new reference document is created only when it is referenceable by name, is not an overview page, can be cited from a primary document and is worth citing more than once; when in doubt it is not created."
capability_tags:
  - curate-context
pattern_tags:
  - specification-gate
conditions_applies_when: A new reference document is about to be created for a fetched page.
conditions_does_not_apply_when: The page describes a concept that is being enriched.
artifact_contract_output_type: reference-document
artifact_contract_required_data:
  - the result of each of the four gates
  - the id the reference was given
artifact_contract_verified_by: "all four gates hold for the created reference, and a page that fails a gate was not turned into one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mint a reference only when it passes the gates
**Mint a new reference concept** — only if the page meets all four of:
**Topic shape**: it defines something *referenceable by name* from a primary concept doc.
Allowed kinds: a business entity definition, a metric definition, an enum or status-code reference, a field/parameter glossary, a pricing/billing note, a units/timezone/identifier convention.
**Not bundle-level meta**: it is NOT an overview, introduction, "getting started", quickstart, tutorial, walkthrough, release notes, changelog, roadmap, FAQ, or product landing page.
If the page title or URL slug contains any of `overview`, `intro`, `getting-started`, `quickstart`, `tutorial`, `walkthrough`, `release-notes`, `changelog`, `roadmap`, `faq` — skip.
**Citation test**: you can plausibly write a sentence in a primary concept doc of the form `See the [X reference](/references/x.md) for ...` where X is a concrete noun (an entity, a metric, an enum, a field set).
If the best sentence you can write is "See the overview for context", it fails this test.
**Reuse test**: at least two existing concepts would benefit from citing it, OR one existing concept needs it as load-bearing background that doesn’t fit in its own doc.
When in doubt, **skip**. A bundle with zero `references/` docs is fine; a bundle full of `references/overview` and `references/getting_started` is noise.
The four gates still apply to *all other* `references/` mints.
<!-- vpmodule:atom:end mint-a-reference-only-when-it-passes-the-gates -->