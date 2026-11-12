---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-types-competitive-md-11354873-c01"
title: "bmad-method: skills/bmad-deep-recon/types/competitive.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-deep-recon/types/competitive.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/types/competitive.md\"}"
atom_ids:
  - mine-the-review-ratings-for-pain-and-for-loyalty
  - read-job-postings-as-a-strategy-signal
  - read-pricing-pages-not-roundups
  - read-the-changelog-as-roadmap-truth
  - tear-down-a-named-competitor
  - try-the-product-yourself-when-a-trial-exists
  - verify-competitor-capability-claims-against-their-docs
atom_count: 7
atoms: "[{\"atom_id\":\"mine-the-review-ratings-for-pain-and-for-loyalty\",\"file_sha256\":\"461bba381eeae03e1de2653760be7ffe13932c32b35d4c5d937eccb29671182e\",\"content_sha256\":\"482f29ad7045670a9292ffc71693a03c1bf41d644748d3dd9a86fccbaf6e268f\",\"file_bytes\":1731,\"body_bytes\":200},{\"atom_id\":\"read-job-postings-as-a-strategy-signal\",\"file_sha256\":\"0900501824557deb54af95d4a7681a4ceef5b02b0807ab59e417494382f6b69f\",\"content_sha256\":\"fe9c511eab3339d8c89098a622c71c8984f8b236b8516999a6673a6ce650e287\",\"file_bytes\":1628,\"body_bytes\":191},{\"atom_id\":\"read-pricing-pages-not-roundups\",\"file_sha256\":\"6429596e15c445c897a5f442aca766514136fc264a350d7e5d63528f7dd8ea92\",\"content_sha256\":\"4b6acffc081f8f966fee5e4aeff37e5234ae9cfa72102e095e8d1a825e23ce49\",\"file_bytes\":1438,\"body_bytes\":173},{\"atom_id\":\"read-the-changelog-as-roadmap-truth\",\"file_sha256\":\"a28ffe56a6f172dd4bccaaee00b2e0b3961139fa9ef6f32bfc8a1a2bf6ac4255\",\"content_sha256\":\"1b4b1fcbe3fadaa78eaeeb6cd9e6416fecbcbc55066466f65c9304e1d6deb81a\",\"file_bytes\":1185,\"body_bytes\":90},{\"atom_id\":\"tear-down-a-named-competitor\",\"file_sha256\":\"796c0aaee3d54491f24dd132ca785588ce83561cbbc403ac6ea91804a79df567\",\"content_sha256\":\"b4de83c18d36eefec1eb316cbc20b304d50ac69ac8082e09e64bd7fadcc1de23\",\"file_bytes\":1894,\"body_bytes\":669},{\"atom_id\":\"try-the-product-yourself-when-a-trial-exists\",\"file_sha256\":\"44d876ad4f5fdfa5cfbc67287f80233d6bd816a48d0410d71eb2d158fd1dcf6a\",\"content_sha256\":\"2adc54da1837b5e9dd3d998ff8a9bbb4139941df4eb6dd99ff2a439d50bf425a\",\"file_bytes\":1174,\"body_bytes\":133},{\"atom_id\":\"verify-competitor-capability-claims-against-their-docs\",\"file_sha256\":\"c16c42965b4c38fef0ff2ba03cbe5c20ce0271550986c157215e4cab52d68ce9\",\"content_sha256\":\"07313a5546a40b90db17c574b5fd549670a688186770c841a0c8290882d9a779\",\"file_bytes\":1298,\"body_bytes\":146}]"
carrier_sha256: 39144a98d842d72c7c459d98f441f87f8bddaeffbf8481fd97000e8253da79ff
carrier_bytes: 11309
revision: 1
status: active
---
<!-- vpmodule:atom:begin mine-the-review-ratings-for-pain-and-for-loyalty -->
---
instruction_id: mine-the-review-ratings-for-pain-and-for-loyalty
title: Mine the review ratings for pain and for loyalty
summary: "The lowest ratings carry the pain and the highest ratings carry the reasons users stay; read both ends of the scale, and in a competitor's reviews the complaints are the wedge."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Complaints, pains or loyalty are to be evidenced from user reviews."
conditions_does_not_apply_when: No review corpus exists for the product or the competitor in question.
artifact_contract_output_type: review-evidence
artifact_contract_required_data:
  - the low-rated reviews mined for pain
  - the high-rated reviews mined for what keeps users
  - "the competitor's complaints used as a wedge"
artifact_contract_verified_by: every finding names the rating band it was mined from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Mine the review ratings for pain and for loyalty
1–3★ reviews are the gold for pains
their customers' 1–3★ reviews are your wedge
mine 1–3★ reviews for pain *and* 5★ for why they stay
<!-- vpmodule:atom:end mine-the-review-ratings-for-pain-and-for-loyalty -->
<!-- vpmodule:atom:begin read-job-postings-as-a-strategy-signal -->
---
instruction_id: read-job-postings-as-a-strategy-signal
title: Read job postings as a strategy signal
summary: "Job postings reveal a company's strategy and its tools months before either is announced; read them as a signal, not as a footnote."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: "The strategy, the trajectory or the tools of a company are to be read before they are announced."
conditions_does_not_apply_when: "The company does not hire, or the posting says nothing about the decision."
artifact_contract_output_type: signal-reading
artifact_contract_required_data:
  - the postings read
  - the signal each posting carries
  - the company the postings belong to
artifact_contract_verified_by: every signal names the posting it was read from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - business
  - research
---

# Read job postings as a strategy signal
job postings reveal strategy six months early
job postings name the real tools and skills
funding history + job postings reveal competitor trajectory
<!-- vpmodule:atom:end read-job-postings-as-a-strategy-signal -->
<!-- vpmodule:atom:begin read-pricing-pages-not-roundups -->
---
instruction_id: read-pricing-pages-not-roundups
title: "Read the pricing pages, not the roundups"
summary: "Read a competitor's pricing page directly for the prices and its archived pricing pages for the direction the prices move; a roundup is not the source."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: The pricing of a competitor or of a market is to be established.
conditions_does_not_apply_when: The price is a private negotiated price that nobody publishes.
artifact_contract_output_type: pricing-evidence
artifact_contract_required_data:
  - the current prices
  - the direction the archived pages show
artifact_contract_verified_by: every price and every direction names the page it was read from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Read the pricing pages, not the roundups
archived pricing pages (Wayback) show pricing direction, not just position
read competitor pricing pages directly, never roundups
<!-- vpmodule:atom:end read-pricing-pages-not-roundups -->
<!-- vpmodule:atom:begin read-the-changelog-as-roadmap-truth -->
---
instruction_id: read-the-changelog-as-roadmap-truth
title: Read the changelog as roadmap truth
summary: "A competitor's changelog and release notes are their roadmap: read them for where the product is going."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: The direction of a competitor product is to be established.
conditions_does_not_apply_when: "The competitor publishes no release notes, or the question is about the past rather than the direction."
artifact_contract_output_type: roadmap-signal
artifact_contract_required_data:
  - the releases read
  - the direction they show
artifact_contract_verified_by: every stated direction names the release note it came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - business
  - research
---

# Read the changelog as roadmap truth
their changelog and release notes are roadmap truth
<!-- vpmodule:atom:end read-the-changelog-as-roadmap-truth -->
<!-- vpmodule:atom:begin tear-down-a-named-competitor -->
---
instruction_id: tear-down-a-named-competitor
title: Tear down a named competitor
summary: "Position against a named competitor: offer and features, pricing and packaging, positioning and messaging, trajectory, and their customers' voice, in that priority, pruned to the decision."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: "A decision turns on how a specific, named competitor is positioned."
conditions_does_not_apply_when: The question is about an unnamed field; that is the market pack.
artifact_contract_output_type: research-pack
artifact_contract_required_data:
  - the named competitor
  - the decision the teardown serves
  - the five dimensions in priority order
artifact_contract_verified_by: the teardown answers every dimension of the pack in the pack priority order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
  - research
---

# Tear down a named competitor
Serves: position against *named* competitors
sharpen differentiation, anticipate their next move.

(Surveying an unnamed field is the market type; this pack is for teardowns of specific players.)

1. Offer & feature teardown — what they actually ship, tried directly where possible
2. Pricing & packaging — models, tiers, what changed recently and which direction
3. Positioning & messaging — who they claim to serve, the story they tell, the gap between claim and product
4. Trajectory — funding, hiring, release cadence: where they're headed
5. Their customers' voice — what users of *their* product praise and complain about
<!-- vpmodule:atom:end tear-down-a-named-competitor -->
<!-- vpmodule:atom:begin try-the-product-yourself-when-a-trial-exists -->
---
instruction_id: try-the-product-yourself-when-a-trial-exists
title: Try the product yourself when a trial exists
summary: Try the product yourself when a trial exists; an hour in the product beats ten reviews.
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: "A competitor's product can be used and its behaviour is to be established."
conditions_does_not_apply_when: "No trial, demo or sandbox exists."
artifact_contract_output_type: first-hand-evidence
artifact_contract_required_data:
  - the product tried
  - what was seen in it
artifact_contract_verified_by: the finding names what was seen in the product itself
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - research
---

# Try the product yourself when a trial exists
try the product yourself when a trial exists — an hour in-product beats ten reviews
<!-- vpmodule:atom:end try-the-product-yourself-when-a-trial-exists -->
<!-- vpmodule:atom:begin verify-competitor-capability-claims-against-their-docs -->
---
instruction_id: verify-competitor-capability-claims-against-their-docs
title: Verify a competitor capability claim against their docs
summary: Sales-facing comparison pages overclaim; verify what a competitor claims it can do against their own documentation.
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A capability of a competitor is to be stated in the result.
conditions_does_not_apply_when: The capability is tried directly in the product rather than read.
artifact_contract_output_type: capability-record
artifact_contract_required_data:
  - the capability claim
  - the documentation line that backs it
artifact_contract_verified_by: "every capability claim is backed by a line of the competitor's own documentation"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Verify a competitor capability claim against their docs
sales-facing comparison pages overclaim — verify capability claims against their docs
<!-- vpmodule:atom:end verify-competitor-capability-claims-against-their-docs -->