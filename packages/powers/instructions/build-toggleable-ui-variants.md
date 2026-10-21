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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/prototype/UI.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch.md
status: active
revision: 2
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
