---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-types-user-voice-md-188e98fc-c01"
title: "bmad-method: skills/bmad-deep-recon/types/user-voice.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-deep-recon/types/user-voice.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/types/user-voice.md\"}"
atom_ids:
  - count-distinct-voices-not-thread-length
  - keep-verbatim-quotes-and-redact-identities
  - read-a-workaround-as-unpriced-demand
  - read-feature-requests-as-willingness-to-wait
  - research-what-users-actually-experience
  - triangulate-forums-against-reviews-and-surveys
atom_count: 6
atoms: "[{\"atom_id\":\"count-distinct-voices-not-thread-length\",\"file_sha256\":\"efc0dfdbe42136672af122e6ff9ab9e313286b7af8faa716090d804debf535bb\",\"content_sha256\":\"60945760a0128420a62b9bb722f40384755eea6af2bff4ec33f27346f4142962\",\"file_bytes\":1276,\"body_bytes\":150},{\"atom_id\":\"keep-verbatim-quotes-and-redact-identities\",\"file_sha256\":\"948444148dcef1fdb6a6bd642083cbb42298185ccc621bdfa2d02d2bb38ef293\",\"content_sha256\":\"d2896af8d5df4710431c2494d1ad2c6b7d9b445a2f290731bf8a759f075545f2\",\"file_bytes\":1683,\"body_bytes\":406},{\"atom_id\":\"read-a-workaround-as-unpriced-demand\",\"file_sha256\":\"a7b0ec79f5ca64ee3a0779c3fea133cc8b25af60575dfb0a7ec0c2d8427d3c71\",\"content_sha256\":\"81bbfe96e61423d291ed1a33b5bd6d8c712ab57157e8efff4aafcb50335dbfaf\",\"file_bytes\":1154,\"body_bytes\":123},{\"atom_id\":\"read-feature-requests-as-willingness-to-wait\",\"file_sha256\":\"d8ac47ed043e6a598bb56b7ea5397c9c2538a2e7103295c6ecf33e1080e83ef2\",\"content_sha256\":\"c8485011918aad9828b50b0512b1350df746cb371f9a5c43dde8f2182feaeda8\",\"file_bytes\":1180,\"body_bytes\":122},{\"atom_id\":\"research-what-users-actually-experience\",\"file_sha256\":\"0ddc00cd16b58a530a5a9e4e4cadc7cd3a1dfc9576f508bc8a365c85267f56cd\",\"content_sha256\":\"ae71b33e2246d09fc421e33471e583488047637f372ffca042a611cf9e070a03\",\"file_bytes\":1920,\"body_bytes\":605},{\"atom_id\":\"triangulate-forums-against-reviews-and-surveys\",\"file_sha256\":\"844965938e2845ddbcc22aca4de698c9fce962603ddf51c23a1d2b9b9d1dcaad\",\"content_sha256\":\"aa5e2ea91fb090e725086ea0079571017840d039aa4fc025682dd8c286ddd0cd\",\"file_bytes\":1471,\"body_bytes\":234}]"
carrier_sha256: fccb8d16775763cb34f995394ae2c28561c539f7e8ff5d6c138f83521cf277d0
carrier_bytes: 9523
revision: 1
status: active
---
<!-- vpmodule:atom:begin count-distinct-voices-not-thread-length -->
---
instruction_id: count-distinct-voices-not-thread-length
title: "Count the distinct voices, not the thread length"
summary: "Distinguish the loud power users from the silent majority: count the distinct voices, not the length of the thread."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The prevalence of an opinion is to be claimed from community threads.
conditions_does_not_apply_when: The claim is about the experience of one person and not about how common it is.
artifact_contract_output_type: prevalence-evidence
artifact_contract_required_data:
  - the distinct voices counted
  - the threads they came from
artifact_contract_verified_by: every prevalence claim states the number of distinct voices behind it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Count the distinct voices, not the thread length
distinguish loud power-users from the silent majority — count distinct voices, not thread length
<!-- vpmodule:atom:end count-distinct-voices-not-thread-length -->
<!-- vpmodule:atom:begin keep-verbatim-quotes-and-redact-identities -->
---
instruction_id: keep-verbatim-quotes-and-redact-identities
title: Keep the verbatim quotes and redact the identities
summary: "Keep the user's own words verbatim, because a paraphrase destroys the evidence, and never let usernames, handles, emails or identifying links into the report or the working notes."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: User words are quoted in a research result.
conditions_does_not_apply_when: No user words are quoted; the finding is a metric or a count.
artifact_contract_output_type: redacted-quote
artifact_contract_required_data:
  - the verbatim quote
  - the redaction applied
artifact_contract_verified_by: "the quote is verbatim and carries no username, handle, email or identifying link"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/forensics.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
  - operations
---

# Keep the verbatim quotes and redact the identities
keep verbatim quotes, redacted — user words carry evidence paraphrase destroys
but usernames, handles, emails, and identifying links never enter the report or the working notes
Replace absolute paths with relative paths (strip `$HOME` prefix)
Remove any API keys, tokens, or credentials found in git diff output
Truncate large diffs to first 50 lines
<!-- vpmodule:atom:end keep-verbatim-quotes-and-redact-identities -->
<!-- vpmodule:atom:begin read-a-workaround-as-unpriced-demand -->
---
instruction_id: read-a-workaround-as-unpriced-demand
title: Read a workaround as unpriced demand
summary: "A workaround is unpriced demand: someone laboring around a gap has already voted."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Users are seen working around a gap in the current options.
conditions_does_not_apply_when: The behaviour is a preference and not a way around a gap.
artifact_contract_output_type: demand-evidence
artifact_contract_required_data:
  - the workaround observed
  - the gap it works around
artifact_contract_verified_by: every demand claim names the workaround it was read from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - research
---

# Read a workaround as unpriced demand
a workaround is unpriced demand — someone laboring around a gap has already voted
<!-- vpmodule:atom:end read-a-workaround-as-unpriced-demand -->
<!-- vpmodule:atom:begin read-feature-requests-as-willingness-to-wait -->
---
instruction_id: read-feature-requests-as-willingness-to-wait
title: Read feature requests as willingness to wait
summary: "A feature-request board measures willingness to wait, not willingness to pay."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A requested feature is taken as demand for it.
conditions_does_not_apply_when: "The request came with a payment, a contract or a signed order."
artifact_contract_output_type: request-evidence
artifact_contract_required_data:
  - the request
  - the requests it collected
artifact_contract_verified_by: the finding states what the request measures and does not claim a payment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - business
  - product
  - research
---

# Read feature requests as willingness to wait
feature-request boards measure willingness to wait, not willingness to pay
<!-- vpmodule:atom:end read-feature-requests-as-willingness-to-wait -->
<!-- vpmodule:atom:begin research-what-users-actually-experience -->
---
instruction_id: research-what-users-actually-experience
title: Research what users actually experience
summary: "Establish what users of a product or a category really experience and want: who they are and what they hire the product for, where the current options fail them, why they stay and what they moved away from, and their own words."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: "Personas, jobs-to-be-done or requirements are to be grounded in evidence rather than assumption."
conditions_does_not_apply_when: The user is one named person whose experience is already known.
artifact_contract_output_type: research-pack
artifact_contract_required_data:
  - the decision the study serves
  - the five dimensions in priority order
  - the users own words behind each dimension
artifact_contract_verified_by: the study answers every dimension of the pack in the pack priority order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - research
---

# Research what users actually experience
Serves: understand what users of a product or category actually experience and want — personas, jobs-to-be-done, requirements grounded in evidence rather than assumption.

1. Who they are & their jobs-to-be-done — the progress they're hiring the product to make
2. Complaint & workaround patterns — where current options fail them
3. Delight & switching triggers — why they stay, what made them move
4. Unmet needs & requests — what they ask for, and the deeper need under the ask
5. Their language — the words users say, versus the words vendors use
<!-- vpmodule:atom:end research-what-users-actually-experience -->
<!-- vpmodule:atom:begin triangulate-forums-against-reviews-and-surveys -->
---
instruction_id: triangulate-forums-against-reviews-and-surveys
title: Triangulate the forums against reviews and surveys
summary: "Forums, chat servers and question-and-answer sites surface what surveys miss, because people lie less when nobody is asking; but they over-sample the loud, so triangulate against reviews and survey data."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Community threads are used as evidence of what users experience.
conditions_does_not_apply_when: No reviews and no survey data exist to triangulate against.
artifact_contract_output_type: triangulated-evidence
artifact_contract_required_data:
  - the communities read
  - the reviews and survey data they are triangulated against
artifact_contract_verified_by: every community finding is corroborated by a second and different source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - research
---

# Triangulate the forums against reviews and surveys
forums, Discord, and Reddit surface what surveys miss — people lie less when nobody's asking — but they over-sample the loud, so triangulate against reviews and any survey data
<!-- vpmodule:atom:end triangulate-forums-against-reviews-and-surveys -->