---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-sketch-md-d18e5ced-c01"
title: "gsd-core: gsd-core/workflows/sketch.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/sketch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/sketch.md\"}"
atom_ids:
  - build-toggleable-ui-variants
  - decompose-the-idea-into-narrow-visual-questions
  - ground-the-design-in-what-the-target-stack-can-build
  - propose-the-next-exploration-from-the-landscape
  - use-the-proven-shapes-in-the-next-artifact
atom_count: 5
atoms: "[{\"atom_id\":\"build-toggleable-ui-variants\",\"file_sha256\":\"9114b415e484ed087e298dfbcdc05b9157156fda22a5cd6b6566c12efb5e5871\",\"content_sha256\":\"758253cb1bd4817e4c53556f235f991915d94293a9175c413b3b27ae2d35f039\",\"file_bytes\":6047,\"body_bytes\":4896},{\"atom_id\":\"decompose-the-idea-into-narrow-visual-questions\",\"file_sha256\":\"acd2352d4da17e350d4fe62cc44fb71eab595c46c2793f87229a856842689af6\",\"content_sha256\":\"08c5136470345372539ea8004eed5d26217d56339f8a465544590cd7fb228dff\",\"file_bytes\":1489,\"body_bytes\":339},{\"atom_id\":\"ground-the-design-in-what-the-target-stack-can-build\",\"file_sha256\":\"2cd35e3d622b50681e86003060b475fd8150986a61cf160c5b8e049e28419a51\",\"content_sha256\":\"8a6ac1d0eb03bf7fe39f7ddcf13d49f8209f3f8b98cafc8e530d1a4d276ad5b1\",\"file_bytes\":2073,\"body_bytes\":831},{\"atom_id\":\"propose-the-next-exploration-from-the-landscape\",\"file_sha256\":\"d8f3bfb076553fb3082a9c78f0688a9ac68edd87f457e6e79fdde29516321cb5\",\"content_sha256\":\"3db9d49bfdc5cbeef2b9f63383c6c331c19de602a6230cbfbf5379c094e21494\",\"file_bytes\":2053,\"body_bytes\":867},{\"atom_id\":\"use-the-proven-shapes-in-the-next-artifact\",\"file_sha256\":\"9a99602d8f634a1c1344426f6b87411adac640acd446ba731e66f891a9f89736\",\"content_sha256\":\"39318d6c840bb4ffbeaafb5a5173427e44be8dfd64aa5b3c11886adf3dfb1728\",\"file_bytes\":2263,\"body_bytes\":909}]"
carrier_sha256: cc385f93d16ac0bdd84d096434c50df1557948990980c5a4f443fc7a90dee9ca
carrier_bytes: 14646
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-toggleable-ui-variants -->
---
instruction_id: build-toggleable-ui-variants
title: Build toggleable UI variants
summary: "Generate several structurally different UI variations on one route, switchable by URL, inside an existing page when one exists."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: The question is what something should look like.
conditions_does_not_apply_when: The question is about logic or state.
artifact_contract_output_type: ui-variant-set
artifact_contract_required_data:
  - variants
  - switcher
  - chosen variant
artifact_contract_verified_by: "the variants disagree about structure, not colour, and the winner is folded into the real page"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/prototype/UI.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Build toggleable UI variants
Generate **several radically different UI variations** on a single route, switchable from a floating bottom bar. The user flips between variants in the browser, picks one (or steals bits from each), then throws the rest away.
A UI prototype is much easier to judge when it's **butting up against the rest of the app**: real header, real sidebar, real data, real density. A throwaway route on its own is a vacuum: every variant looks fine in isolation. Default to mounting the variants inside an existing page whenever there's a plausible existing page to host the variants. Only reach for a new throwaway route if the prototype genuinely has no nearby home.
## Process
### 1. State the question and pick N
Default to **3 variants**. More than 5 stops being radically different and starts being noise, so cap there.
Write down the plan in one line, in the prototype's location or a top-of-file comment.
### 2. Generate radically different variants
Draft each variant. Hold each one to:
- The page's purpose and the data it has access to.
- The project's component library / styling system.
- A clear exported component name.
Variants must be **structurally different**: different layout, different information hierarchy, different primary affordance, not just different colours. Three slightly-tweaked card grids isn't a UI prototype, it's wallpaper. If two drafts come out too similar, redo one with explicit "do not use a card grid" guidance.
### 3. Wire them together
Create a single switcher component on the route:
```tsx
// pseudo-code, adapt to the project's framework
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```
For an existing page: keep all the existing data fetching above the switcher; only the rendered subtree changes per variant.
For a new page: the throwaway route mounts the same switcher.
### 4. Build the floating switcher
A small fixed-position bar at the bottom-centre of the screen with three pieces:
- **Left arrow**: cycles to the previous variant (wraps around).
- **Variant label**: shows the current variant key and, if the variant exports a name, that name too. e.g. `B (Sidebar layout)`.
- **Right arrow**: cycles forward (wraps around).
Behaviour:
- Clicking an arrow updates the URL search param (use the framework's router) so the variant is shareable and reload-stable.
- Keyboard: `←` and `→` arrow keys also cycle. Don't intercept arrow keys when an `<input>`, `<textarea>`, or `[contenteditable]` is focused.
- Visually distinct from the page so it's obviously not part of the design being evaluated.
- Hidden in production builds: gate on `process.env.NODE_ENV !== 'production'` or an equivalent check, so a stray prototype merge can't ship the bar to users.
Put the switcher in a single shared component so both sub-shapes can reuse it.
### 5. Hand it over
Surface the URL (and the `?variant=` keys). The user will flip through whenever they get to it. The interesting feedback is usually **"I want the header from B with the sidebar from C"**, which is the actual design they want.
### 6. Capture the answer and clean up
Once a variant has won, capture the answer (which variant and why), then capture the prototype as a primary source. Fold the winner into the real code and move the rest onto the throwaway branch, not into main:
- **Existing page**: fold the winner into the existing page; drop the losing variants and the switcher from main.
- **New page**: promote the winning variant to a real route; drop the throwaway route and the switcher from main.
The full set of variants is the primary source, so it lands on the throwaway branch, not the bin, since variant components and the switcher left in the main branch rot fast and confuse the next reader.
## Anti-patterns
- **Variants that differ only in colour or copy.** That's a tweak, not a prototype. Real variants disagree about structure.
- **Sharing too much code between variants.** A shared `<Header>` is fine; a shared `<Layout>` defeats the point. Each variant should be free to throw out the layout.
- **Wiring variants to real mutations.** Read-only prototypes are fine. If a variant needs to mutate, point it at a stub: the question is "what should this look like", not "does the backend work".
- **Promoting the prototype directly to production.** The variant code was written under prototype constraints (no tests, minimal error handling). Rewrite it properly when you fold it in.
All variants preserved (winner marked, not others deleted).
First round — dramatic differences: 2-3 meaningfully different approaches.
Subsequent rounds — refinements: Subtler variations within the chosen direction.
<!-- vpmodule:atom:end build-toggleable-ui-variants -->
<!-- vpmodule:atom:begin decompose-the-idea-into-narrow-visual-questions -->
---
instruction_id: decompose-the-idea-into-narrow-visual-questions
title: Decompose the idea into narrow visual questions
summary: "A design idea becomes two to five narrow visual questions, each answered by its own exploration, and the list is agreed before anything is built."
capability_tags:
  - design-user-interface
pattern_tags:
  - specification-gate
conditions_applies_when: A design idea is about to be explored and it is wider than one question.
conditions_does_not_apply_when: The question to answer is already narrow and settled.
artifact_contract_output_type: question-decomposition
artifact_contract_required_data:
  - the questions
  - the approach per question
  - the risk per question
artifact_contract_verified_by: every question is one specific visual question and the list is agreed before building
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Decompose the idea into narrow visual questions
Break the idea into 2-5 design questions.
Each sketch answers one specific visual question.
"Design the whole app" — too broad
"Set up the component library" — that's implementation
"Pick a color palette" — apply it to UI instead
Present the table and get alignment before building.
<!-- vpmodule:atom:end decompose-the-idea-into-narrow-visual-questions -->
<!-- vpmodule:atom:begin ground-the-design-in-what-the-target-stack-can-build -->
---
instruction_id: ground-the-design-in-what-the-target-stack-can-build
title: Ground the design in what the target stack can build
summary: "Before anything is designed, the target stack is identified, its available primitives and its constraints are checked, and at least one direction follows the path of least resistance."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - design-system-adherence
conditions_applies_when: A design is about to be produced for a target implementation.
conditions_does_not_apply_when: There is no target stack yet and the work is free-form exploration.
artifact_contract_output_type: stack-grounding
artifact_contract_required_data:
  - the target stack
  - the primitives it provides
  - the constraints that affect the design
artifact_contract_verified_by: the design only uses what the stack can build and one direction follows the easiest path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Ground the design in what the target stack can build
Before sketching, ground the design in what's actually buildable.
**a. Identify the target stack.** Check for package.json, Cargo.toml, etc.
**b. Check component/pattern availability.** Use context7 (resolve-library-id → query-docs) or web search to answer:
**c. Note constraints that affect design:**
Platform conventions (iOS nav patterns, desktop menu bars, terminal grid constraints)
Framework limitations (what's easy vs requires custom work)
Existing design tokens or theme systems already in the project
**d. Let research inform variants.** At least one variant should follow the path of least resistance for the target stack.
**Skip when unnecessary.** Greenfield project with no stack, or user says "just explore visually." The point is grounding, not gatekeeping.
<!-- vpmodule:atom:end ground-the-design-in-what-the-target-stack-can-build -->
<!-- vpmodule:atom:begin propose-the-next-exploration-from-the-landscape -->
---
instruction_id: propose-the-next-exploration-from-the-landscape
title: Propose the next exploration from the landscape
summary: "The next candidate work is derived from what the existing explorations already proved: the gaps between them, and the surfaces nobody has explored yet."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: A set of explorations already exists and the next one has to be chosen.
conditions_does_not_apply_when: The next piece of work is already decided.
artifact_contract_output_type: exploration-proposals
artifact_contract_required_data:
  - the consistency gaps found
  - the unexplored surfaces
  - the design questions each proposal answers
artifact_contract_verified_by: every proposal names a concrete gap or unexplored surface and carries a design question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Propose the next exploration from the landscape
**Visual consistency gaps:** Two sketches made independent design choices that haven't been tested together.
**State combinations:** Individual states validated but not seen in sequence.
**Responsive gaps:** Validated at one viewport but the real app needs multiple.
**Theme coherence:** Individual components look good but haven't been composed into a full-page view.
**Unsketched screens:** UI surfaces assumed but unexplored.
**Interaction patterns:** Static layouts validated but transitions, loading, drag-and-drop need feeling.
**Edge case UI:** 0 items, 1000 items, errors, slow connections.
**Polish passes:** Typography, spacing, micro-interactions, empty states.
If consistency risks exist, present them as concrete proposed sketches with names and design questions. If no meaningful gaps, say so and skip.
<!-- vpmodule:atom:end propose-the-next-exploration-from-the-landscape -->
<!-- vpmodule:atom:begin use-the-proven-shapes-in-the-next-artifact -->
---
instruction_id: use-the-proven-shapes-in-the-next-artifact
title: Use the proven shapes in the next artifact
summary: "The next artifact is built from what the earlier work already proved — the real field names, the real data shapes and the real interaction states — instead of generic placeholders."
capability_tags:
  - curate-context
pattern_tags:
  - context-relay
conditions_applies_when: "An artifact is produced after earlier work has already proven data shapes, components or interaction patterns."
conditions_does_not_apply_when: No earlier work has proven anything that this artifact could carry.
artifact_contract_output_type: carried-context
artifact_contract_required_data:
  - the proven shapes
  - the states the artifact shows
  - the components it names
artifact_contract_verified_by: the artifact uses the proven names and states and no generic placeholder
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ultraplan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Use the proven shapes in the next artifact
Mockups are still pure HTML, but they should reflect what's actually been proven — real data shapes, real component names, real interaction patterns.
Use real field names and data shapes from spike findings instead of generic placeholders
Show realistic UI states that match what the spikes proved (e.g., if streaming was validated, show a streaming message state)
Reference real component names and patterns from the target stack
Include interaction states that reflect what the spikes discovered (loading, error, reconnection states)
Read REQUIREMENTS.md if it exists (`requirements_path` is not null) — extract a concise summary (key requirements relevant to this phase, not the full document).
Read RESEARCH.md if it exists (`research_path` is not null) — extract a concise summary of technical findings. Including this reduces redundant cloud research.
<!-- vpmodule:atom:end use-the-proven-shapes-in-the-next-artifact -->