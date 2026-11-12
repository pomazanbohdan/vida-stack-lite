---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-canon-md-a9bbe736-c01"
title: "bmad-method: skills/bmad-toolsmith/canon.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-toolsmith/canon.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/canon.md\"}"
atom_ids:
  - derive-the-bar-from-the-consumer
  - judge-a-structure-by-running-the-smallest-version
  - keep-a-line-only-when-it-prevents-a-named-failure
  - keep-an-example-only-when-it-fixes-a-shape
  - keep-the-why-behind-a-non-obvious-goal
  - number-only-true-sequences
  - prefer-the-word-the-model-already-holds
  - truncate-before-you-delete
atom_count: 8
atoms: "[{\"atom_id\":\"derive-the-bar-from-the-consumer\",\"file_sha256\":\"1234c4f4a63b04b8ce9ecac035c126a840cd595dea56d886306683feacbbdd65\",\"content_sha256\":\"f87b81d5b782c38995b5a2b68bcd664c50430bb1c6e94abd9024123332851568\",\"file_bytes\":1909,\"body_bytes\":490},{\"atom_id\":\"judge-a-structure-by-running-the-smallest-version\",\"file_sha256\":\"b7cc80a43d7a71667802e734eaa1ae708b258504f1148394a304e28a536f0ca4\",\"content_sha256\":\"3c16403701a7e2fe61146c2324ab05f922c9ab6287aa85a71b910bab122711d0\",\"file_bytes\":2281,\"body_bytes\":1130},{\"atom_id\":\"keep-a-line-only-when-it-prevents-a-named-failure\",\"file_sha256\":\"332b0e64db1fe15551399467ed708870548852c03b70f28cc7d7caeba9da8fb0\",\"content_sha256\":\"d5ffa6e784c8ec54b6fbd9900ce0712b3f4383a5ecfb7d5687918f4bb5e25135\",\"file_bytes\":1815,\"body_bytes\":521},{\"atom_id\":\"keep-an-example-only-when-it-fixes-a-shape\",\"file_sha256\":\"110ce52bd96cbfb0ed839a75aa9e3629e0172989dc43343326391202ef37208d\",\"content_sha256\":\"7311430bf4a963b7420d330f7b76dbdc54d95b61a1f04d9ae419db04441fa109\",\"file_bytes\":1861,\"body_bytes\":569},{\"atom_id\":\"keep-the-why-behind-a-non-obvious-goal\",\"file_sha256\":\"3c6cf3119d4db77145658441b116460e3764909eaa3abc471702feda9d72f786\",\"content_sha256\":\"5d636f82ac8bf2d527495c7a84c527e2cc9a5755476d24f538aa880e83f1bfba\",\"file_bytes\":1776,\"body_bytes\":586},{\"atom_id\":\"number-only-true-sequences\",\"file_sha256\":\"05fe8e8296a8b6d1f0d6f110bca3a62425088a6c18850dab5e31a2a7f84f9666\",\"content_sha256\":\"f89a96bd2a63b14302954cec1ca269d403af022c400811351d81934d46582a96\",\"file_bytes\":1750,\"body_bytes\":423},{\"atom_id\":\"prefer-the-word-the-model-already-holds\",\"file_sha256\":\"7a31dbd3858cffcab6f92740cf2d6c08e542282ff6634fd3f4c24af9aa7059b5\",\"content_sha256\":\"1c58e6ab879a3b72cef0771a02047055bcc789ce6c876e7c7cca0021d8f0be14\",\"file_bytes\":1822,\"body_bytes\":611},{\"atom_id\":\"truncate-before-you-delete\",\"file_sha256\":\"d9f3cbb8a818188bb8b18d221a838ebad9856f5b46344c11d5002726fc08e5b3\",\"content_sha256\":\"063833478621940c64e812cdf4f4d602ad30453c1b5af308ecf3c31e59a7bef1\",\"file_bytes\":1587,\"body_bytes\":377}]"
carrier_sha256: 22ae085adc6b8fefd16d54900e23d8c61fd767752c0a08b5b71bf4be88341b32
carrier_bytes: 15866
revision: 1
status: active
---
<!-- vpmodule:atom:begin derive-the-bar-from-the-consumer -->
---
instruction_id: derive-the-bar-from-the-consumer
title: Derive the bar from the consumer
summary: "The consumer of the output decides what must be true of it, and completeness, rigor and tone all follow from who has to act on it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The quality bar of an output is not already fixed by its owner.
conditions_does_not_apply_when: The bar was set by the person who commissioned the work.
artifact_contract_output_type: consumer-derived-bar
artifact_contract_required_data:
  - the consumer
  - what the consumer must be able to do with it
  - what must be true of it
artifact_contract_verified_by: "the bar names what the consumer needs true, and the consumer can act without the conversation in the room"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body sets a generic consumer-derived quality bar for unspecified outputs; its conditions do not name an output subject, so no listed content domain is supported."
---

# Derive the bar from the consumer
The consumer is the highest-leverage line: completeness, rigor and tone derive from it.
That consumer sets the bar: every requirement traceable to a need and stated so someone could test whether it was met; scope edges explicit, including what is out; open questions named as open rather than papered over.
Who or what consumes the output and what must be true of it for them to act without this conversation in the room, the one line that sets every bar
<!-- vpmodule:atom:end derive-the-bar-from-the-consumer -->
<!-- vpmodule:atom:begin judge-a-structure-by-running-the-smallest-version -->
---
instruction_id: judge-a-structure-by-running-the-smallest-version
title: Judge a structure by running the smallest version
summary: "A structure cannot be judged from inside one run, so the smallest version is written and both are run on the same input."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
  - code-minimization
conditions_applies_when: A piece of writing is elaborate and its worth is in question.
conditions_does_not_apply_when: The writing is already the smallest version.
artifact_contract_output_type: structure-comparison
artifact_contract_required_data:
  - the smallest version
  - the input both were run on
  - what the comparison showed
artifact_contract_verified_by: both versions were run on the same input and the result decided whether the structure stays
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Judge a structure by running the smallest version
You cannot judge structure from inside one run. Write the smallest version, around five lines: role, outcome, consumer, and any rule whose absence has done damage. Run both on the same input.
| What you see | What it means |
| --- | --- |
| Small one wins | The structure was a straitjacket. Cut it. |
| They tie | The structure is decoration. Defend each line or kill it. |
| Small one rougher but recoverable in a turn or two | You bought convenience, not quality. Allowed, if you are honest about it. |
| Small one materially worse and stays worse | The structure earned its keep, for now. |
Cheaper signals: one input five times (identical means over-determined, scattered means under-specified); different inputs (alike outputs mean the template out-shouts the input); steps marched in order.
Below your small version sits the bare model, and it rises with every release. What survives is what the model cannot do for itself: paths, downstream contracts, wiring between systems, knowledge that lives nowhere else. When a capability stops beating the bare model, retire it.
<!-- vpmodule:atom:end judge-a-structure-by-running-the-smallest-version -->
<!-- vpmodule:atom:begin keep-a-line-only-when-it-prevents-a-named-failure -->
---
instruction_id: keep-a-line-only-when-it-prevents-a-named-failure
title: Keep a line only when it prevents a named failure
summary: "A line earns its place only when it prevents a failure the model would otherwise make, and you can name the different action it causes."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - code-minimization
conditions_applies_when: A line of an instruction is judged for its value.
conditions_does_not_apply_when: The line names a convention the model cannot look up.
artifact_contract_output_type: justified-line
artifact_contract_required_data:
  - the line
  - the failure it prevents
  - the different action the model takes because of it
artifact_contract_verified_by: the different action the model takes without the line can be named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep a line only when it prevents a named failure
The core test. Would a capable model do this correctly without being told? If yes, cut. A line earns its place only by preventing a failure. It stays when you can name the different action the model takes without it.
Core-test failures: lines a capable model follows unprompted. "Make sure", "don't forget", templates that teach markdown, mechanics of a tool the model drives fluently, scoring formulas for judgment.
- Minor for a line or two
- Important for a section
<!-- vpmodule:atom:end keep-a-line-only-when-it-prevents-a-named-failure -->
<!-- vpmodule:atom:begin keep-an-example-only-when-it-fixes-a-shape -->
---
instruction_id: keep-an-example-only-when-it-fixes-a-shape
title: Keep an example only when it fixes a shape
summary: An example is kept only when the output diverges without it; a format line beats a worked artefact.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - output-formatting
conditions_applies_when: An instruction carries a worked example or a filled-in artefact.
conditions_does_not_apply_when: The artefact is the output itself and not an illustration.
artifact_contract_output_type: kept-example
artifact_contract_required_data:
  - the rule
  - the smallest fragment that shows the divergence
  - the rule the fragment belongs to
artifact_contract_verified_by: "the rule alone on a fresh model reproduces the output, or the kept fragment shows the divergence it fixes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/cut.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Keep an example only when it fixes a shape
An example earns its place only by fixing a shape. A format line beats a worked artifact. Delete the example and run the rule alone on a fresh model: if the output conforms, the example was explanation; if it diverges in a way one more clause cannot fix, keep the smallest fragment that shows the divergence, beside the rule it fixes. General knowledge, such as what a good bug report looks like, needs no example. Where the project will hold its own instances after the first run, point at those rather than ship a sample.
<!-- vpmodule:atom:end keep-an-example-only-when-it-fixes-a-shape -->
<!-- vpmodule:atom:begin keep-the-why-behind-a-non-obvious-goal -->
---
instruction_id: keep-the-why-behind-a-non-obvious-goal
title: Keep the why behind a non-obvious goal
summary: "A rule carries the failure it prevents, so it can reach the case its author never saw; a stripped why is under-writing, not leanness."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A rule is written for a goal the model cannot infer.
conditions_does_not_apply_when: The goal is self-evident and the rule needs no reason.
artifact_contract_output_type: rule-with-reason
artifact_contract_required_data:
  - the rule
  - the failure it prevents
artifact_contract_verified_by: "the rule names the failure it prevents once, in plain words"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the why behind a non-obvious goal
Keep the why behind a non-obvious goal. Without its reason a rule cannot reach the case you did not foresee. A stripped why is under-writing, not leanness.
ALL-CAPS MUST, ALWAYS and NEVER mean the prompt is patching a symptom the author once saw. A model braces against a command and applies it literally; a rule with its reason survives the case the author did not foresee. Write the failure the rule prevents, once.
A stripped why: a non-obvious rule with no reason, so it cannot reach the unforeseen case. Minor; under-writing, not leanness.
<!-- vpmodule:atom:end keep-the-why-behind-a-non-obvious-goal -->
<!-- vpmodule:atom:begin number-only-true-sequences -->
---
instruction_id: number-only-true-sequences
title: Number only true sequences
summary: "Numbering says order matters, so it is used only where steps feed each other; independent steps are bullets."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - completion-criteria
conditions_applies_when: Steps of an instruction are laid out as a list.
conditions_does_not_apply_when: The steps are already an ordered procedure with no choice.
artifact_contract_output_type: step-list
artifact_contract_required_data:
  - the steps that feed each other
  - the independent steps
artifact_contract_verified_by: "every numbered step depends on the one before it, and the independent ones are bullets"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The source gives generic numbering guidance without identifying engineering, design, product, business, research, or a concrete operations workflow."
---

# Number only true sequences
Number only true sequences. Numbering says order matters, so the model marches. Number steps that feed each other; bullet independent ones; steps that were never separate are one goal sentence.
Numbered lists that are not sequences: independent steps the model will march through. Minor; the recommendation holds the goal sentence that replaces them. A sequence guarding a named failure stays.
<!-- vpmodule:atom:end number-only-true-sequences -->
<!-- vpmodule:atom:begin prefer-the-word-the-model-already-holds -->
---
instruction_id: prefer-the-word-the-model-already-holds
title: Prefer the word the model already holds
summary: A term the model met in training arrives with its meaning attached; a coined term pays its definition on every use.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - concise-communication
conditions_applies_when: A word is chosen for an instruction or a document.
conditions_does_not_apply_when: The domain has no established word and the coinage is the term of art.
artifact_contract_output_type: chosen-term
artifact_contract_required_data:
  - the term chosen
  - the meaning it carries with it
artifact_contract_verified_by: the same word is used unchanged everywhere it appears
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Prefer the word the model already holds
A term the model met in training arrives with its meaning attached: idempotent, read-back, dry run. Choose it over a coined term, which costs its definition on every use, and over a run of adjectives that circle it. Having chosen the word, reuse it as it is; each paraphrase spends tokens and loosens the meaning. A term only this skill uses is a sign the plain word was not looked for.
A prohibition where a positive form says the same, or a coined term and adjective runs where one word the model knows would do:
- Minor
- recommend the positive sentence or the word
<!-- vpmodule:atom:end prefer-the-word-the-model-already-holds -->
<!-- vpmodule:atom:begin truncate-before-you-delete -->
---
instruction_id: truncate-before-you-delete
title: Truncate before you delete
summary: "Most long lines hide a needed nudge wrapped in explanation, so the instruction and one clause of why are kept before the line is cut."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - code-minimization
conditions_applies_when: A long line of an instruction is considered for removal.
conditions_does_not_apply_when: The line is short and already only the instruction.
artifact_contract_output_type: truncated-line
artifact_contract_required_data:
  - the instruction that survives
  - the one clause of why that survives
artifact_contract_verified_by: the shortened line still carries the nudge and the reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/cut-roles.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Truncate before you delete
Truncate before you delete. Most long lines hide a needed nudge wrapped in explanation. Keep the instruction and the one clause of why.
Work at every scale: a sentence the model does not need, the words inside a sentence that carry nothing, a passage that a few load-bearing words can replace. There is no token target; leave a lean file as it is.
<!-- vpmodule:atom:end truncate-before-you-delete -->