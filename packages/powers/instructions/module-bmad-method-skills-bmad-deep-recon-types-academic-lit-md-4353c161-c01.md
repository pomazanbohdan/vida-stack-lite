---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-types-academic-lit-md-4353c161-c01"
title: "bmad-method: skills/bmad-deep-recon/types/academic-lit.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-deep-recon/types/academic-lit.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/types/academic-lit.md\"}"
atom_ids:
  - chase-citations-in-both-directions
  - corroborate-load-bearing-claims-with-a-second-independent-source
  - label-every-citation-as-preprint-or-peer-reviewed
  - read-one-survey-before-twenty-abstracts
  - run-a-literature-review
  - set-a-freshness-bar-for-each-class-of-claim
  - take-benchmark-numbers-from-the-original-paper
  - weigh-an-empirical-claim-before-relying-on-it
atom_count: 8
atoms: "[{\"atom_id\":\"chase-citations-in-both-directions\",\"file_sha256\":\"791b4a15af6e2ae04128ef93cff4725ef20b9321109a67812b985f0163927080\",\"content_sha256\":\"e223228070a92c7800eda3548fbf307468699c33f52df58b03635b0d578a9253\",\"file_bytes\":1252,\"body_bytes\":140},{\"atom_id\":\"corroborate-load-bearing-claims-with-a-second-independent-source\",\"file_sha256\":\"ddb27005adee065ebc9d359d4eb92c618e9ce8032e8077be9cfc8703f90c51c4\",\"content_sha256\":\"d08074f6216caec4033ce60dcf644bcd7f7f4ba05311b617fbefa55434920d45\",\"file_bytes\":3437,\"body_bytes\":1317},{\"atom_id\":\"label-every-citation-as-preprint-or-peer-reviewed\",\"file_sha256\":\"fc2493228cbb1f0331b58c00b09165fa7b57f084069563634992143da1542697\",\"content_sha256\":\"9601e8f1c82b9f362085405e208de370c01d483cee3c961f8963e8352566d168\",\"file_bytes\":1192,\"body_bytes\":130},{\"atom_id\":\"read-one-survey-before-twenty-abstracts\",\"file_sha256\":\"5c87323bf6673b1bafd1416bbe25d6795b192aa95b805416871ec750254718af\",\"content_sha256\":\"e73c9c4fc1aaecab5d11d1f22ac743fc173395eae238f5b5e40685d2c92d9281\",\"file_bytes\":1151,\"body_bytes\":95},{\"atom_id\":\"run-a-literature-review\",\"file_sha256\":\"09299143d0155ec8e79bcaea6394ea463ddae36f556254abc9adf0f60cf2f267\",\"content_sha256\":\"22f67eb27ae85b3a21b8e10cc4e75eb54c55daade70e74b429f217760c2ac6cb\",\"file_bytes\":1875,\"body_bytes\":587},{\"atom_id\":\"set-a-freshness-bar-for-each-class-of-claim\",\"file_sha256\":\"ee2a454afac27a18714cd10d962d9ff8cbb83da8c0bbf413a0a643f8dc2e1d55\",\"content_sha256\":\"5e09ba2200b381daecb88159e7fb49b65ed75a95ea7c4878e7bfe5ace797fbbf\",\"file_bytes\":2794,\"body_bytes\":860},{\"atom_id\":\"take-benchmark-numbers-from-the-original-paper\",\"file_sha256\":\"162ae7f8589cdb7a91fba817000e522d6646b64c5491d10aa65affe3b1162217\",\"content_sha256\":\"7a6155f6c94c7a2eb4c13662a4400422d256491737f6c5d9d3a4a4948f2ee18b\",\"file_bytes\":1243,\"body_bytes\":140},{\"atom_id\":\"weigh-an-empirical-claim-before-relying-on-it\",\"file_sha256\":\"d4c793b53935fc24e2fd83f0da3832548308f3a68a4d74dee492cefd73916ea3\",\"content_sha256\":\"48325083690b6e0b340382e1a6247e6011d6d5c72d85c720c6851ab84eee493a\",\"file_bytes\":1342,\"body_bytes\":182}]"
carrier_sha256: 8bdf09226ac4782a4ae37119c4b907f235f17ac5a2d34c1b44e0e6ae08d87930
carrier_bytes: 15435
revision: 1
status: active
---
<!-- vpmodule:atom:begin chase-citations-in-both-directions -->
---
instruction_id: chase-citations-in-both-directions
title: Chase citations in both directions
summary: "Chase the citations in both directions: who the paper cites and who cites the paper, to find the work it stands on and the work that stands on it."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A paper has to be placed in the body of work around it.
conditions_does_not_apply_when: "The source has no citation graph, such as a regulation, a filing or a pricing page."
artifact_contract_output_type: citation-graph
artifact_contract_required_data:
  - the references the paper cites
  - the papers that cite it
artifact_contract_verified_by: both directions were followed and each side is listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Chase citations in both directions
chase citations both directions — who they cite and who cites them (Semantic Scholar/Google Scholar)
<!-- vpmodule:atom:end chase-citations-in-both-directions -->
<!-- vpmodule:atom:begin corroborate-load-bearing-claims-with-a-second-independent-source -->
---
instruction_id: corroborate-load-bearing-claims-with-a-second-independent-source
title: "Corroborate load-bearing claims with a second, independent source"
summary: The claims a pack names as two-source classes are carried only by two sources that are independent of each other; the same source twice is not a second source.
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A conclusion rests on a claim that falls into a two-source class.
conditions_does_not_apply_when: "The claim does not carry the conclusion, or the pack does not list it as a two-source class."
artifact_contract_output_type: corroborated-claims
artifact_contract_required_data:
  - the two-source classes of each pack
  - the second source for each claim
  - how the two sources are independent of each other
artifact_contract_verified_by: every claim in a two-source class carries two sources that are independent of each other
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-verification-protocol.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Corroborate load-bearing claims with a second, independent source
### Academic Literature Pack
Two-source classes: any empirical claim a conclusion rests on — independent replication or corroboration, not the same lab twice.

### Competitive Research Pack
Two-source classes: traction and market-share claims; any capability claim of theirs that your differentiation rests on.

### Domain Research Pack
Two-source classes: regulatory and compliance assertions; quantitative industry figures a recommendation rests on; claims about a gatekeeper's policy.

### Market Research Pack
Two-source classes: market size and growth figures; any quantitative claim a recommendation rests on; competitor traction claims.

### Technical Research Pack
Two-source classes: version/compatibility claims; performance or scale numbers a recommendation rests on; claims that a technology or pattern failed — one post-mortem is an anecdote.

### User-Voice Research Pack
Two-source classes: any prevalence claim ("most users…", "the top complaint is…") — two independent communities, not two threads in the same one.

**Single Source Reliance** - Trap: Relying on a single source for critical claims. Prevention: Require multiple sources: official docs (primary), release notes (currency), additional source (verification).
<!-- vpmodule:atom:end corroborate-load-bearing-claims-with-a-second-independent-source -->
<!-- vpmodule:atom:begin label-every-citation-as-preprint-or-peer-reviewed -->
---
instruction_id: label-every-citation-as-preprint-or-peer-reviewed
title: Label every citation as preprint or peer-reviewed
summary: Label every citation as preprint or peer-reviewed; a preprint is not acceptance.
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A citation is carried into the result.
conditions_does_not_apply_when: "The source is not a paper: a specification, a filing or a product page carries no review status."
artifact_contract_output_type: citation-record
artifact_contract_required_data:
  - the citation
  - "its status: preprint or peer-reviewed"
artifact_contract_verified_by: every citation carries its peer-review status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Label every citation as preprint or peer-reviewed
label preprint vs peer-reviewed on every citation — arXiv is not acceptance
<!-- vpmodule:atom:end label-every-citation-as-preprint-or-peer-reviewed -->
<!-- vpmodule:atom:begin read-one-survey-before-twenty-abstracts -->
---
instruction_id: read-one-survey-before-twenty-abstracts
title: Read one survey before twenty abstracts
summary: "Find one good survey before reading twenty abstracts: it maps the area and points at the papers worth reading."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: The literature of an area has to be entered.
conditions_does_not_apply_when: The question is about one named paper rather than an area.
artifact_contract_output_type: literature-entry
artifact_contract_required_data:
  - the survey read
  - the papers the survey points at
artifact_contract_verified_by: the reading started from a survey and not from a list of abstracts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Read one survey before twenty abstracts
find one good survey before reading twenty abstracts
<!-- vpmodule:atom:end read-one-survey-before-twenty-abstracts -->
<!-- vpmodule:atom:begin run-a-literature-review -->
---
instruction_id: run-a-literature-review
title: Run a literature review on the academic dimensions
summary: "Ground a decision in published research: cover the canon, the state of the art, the methods and their limits, the live debates and the labs to watch, in that priority, pruned to the decision."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A decision is about to be grounded in published research.
conditions_does_not_apply_when: "The question is about a competitor, a market, a domain, a technology or the users of a product; those packs answer it."
artifact_contract_output_type: research-pack
artifact_contract_required_data:
  - the decision the review serves
  - the five dimensions in priority order
  - what each dimension contributes to the decision
artifact_contract_verified_by: the review answers every dimension of the pack in the pack priority order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Run a literature review on the academic dimensions
Serves: ground an approach in published research, scan the state of the art, run a defensible literature review, cite properly in technical writing.

1. The canon — seminal papers and the best recent surveys of the area
2. State of the art — current best results, benchmarks, and how they're measured
3. Methods & limitations — what the leading approaches assume and where they break
4. Open problems & live debates — what the field disagrees about right now
5. Who works on this — the labs and groups whose output to watch
<!-- vpmodule:atom:end run-a-literature-review -->
<!-- vpmodule:atom:begin set-a-freshness-bar-for-each-class-of-claim -->
---
instruction_id: set-a-freshness-bar-for-each-class-of-claim
title: Set a freshness bar for each class of claim
summary: Each research pack sets a maximum age per class of claim; a source older than its bar no longer supports the claim it was cited for.
capability_tags:
  - research-primary-sources
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A research claim is about to be carried by a source.
conditions_does_not_apply_when: "The claim is about seminal work; it has no freshness bar, but check whether it was since superseded."
artifact_contract_output_type: freshness-bars
artifact_contract_required_data:
  - "the freshness bar of each research pack: academic literature, competitive, domain, market, technical, user voice"
  - the claim class each bar applies to
artifact_contract_verified_by: every class of claim has one stated bar and every cited source sits inside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
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

# Set a freshness bar for each class of claim
Freshness: state-of-the-art claims ≤ 12 mo (ML ≤ 6 mo) · seminal work has no freshness bar — but check whether it was since superseded.
Freshness: pricing & features ≤ 3 mo · trajectory signals ≤ 6 mo · customer sentiment ≤ 12 mo.
Freshness: structure ≤ 3 yr · player landscape ≤ 18 mo · regulatory status: verify current on every load-bearing claim, whatever its date · tech adoption ≤ 18 mo, AI-adoption claims ≤ 6 mo.
Freshness: size/growth ≤ 18 mo · pricing & feature claims ≤ 3 mo · behavior data ≤ 2 yr · GTM benchmarks ≤ 12 mo.
Freshness: versions & compatibility ≤ 1 mo · ecosystem signals ≤ 6 mo · landscape ≤ 12 mo (AI-adjacent ≤ 3 mo) · patterns ≤ 2 yr.
Freshness: sentiment ≤ 18 mo · complaints re-checked against the current version before citing.
<!-- vpmodule:atom:end set-a-freshness-bar-for-each-class-of-claim -->
<!-- vpmodule:atom:begin take-benchmark-numbers-from-the-original-paper -->
---
instruction_id: take-benchmark-numbers-from-the-original-paper
title: Take benchmark numbers from the original paper
summary: "Take a benchmark number from the paper that produced it, never from a competitor's comparison table."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A performance or quality number is carried into the result.
conditions_does_not_apply_when: No original paper exists for the number; a price or a headcount is taken from its owner.
artifact_contract_output_type: benchmark-record
artifact_contract_required_data:
  - the number
  - the paper it was taken from
artifact_contract_verified_by: "every number names the paper it came from and not a third party's table"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Take benchmark numbers from the original paper
take benchmark numbers from the original paper, never from a competitor's comparison table
<!-- vpmodule:atom:end take-benchmark-numbers-from-the-original-paper -->
<!-- vpmodule:atom:begin weigh-an-empirical-claim-before-relying-on-it -->
---
instruction_id: weigh-an-empirical-claim-before-relying-on-it
title: Weigh an empirical claim before relying on it
summary: "Check the retraction and replication status of any load-bearing empirical claim, and treat a result shown by one lab only as a lead, not a fact."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A conclusion rests on an empirical result from the literature.
conditions_does_not_apply_when: The claim is a definition or a stated method rather than a result.
artifact_contract_output_type: claim-weight
artifact_contract_required_data:
  - the claim
  - its retraction and replication status
  - the labs that showed it
artifact_contract_verified_by: the status and the number of labs are stated for every load-bearing claim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Weigh an empirical claim before relying on it
check retraction and replication status on any load-bearing empirical claim
a result only ever shown by one lab is a lead, not a fact
<!-- vpmodule:atom:end weigh-an-empirical-claim-before-relying-on-it -->