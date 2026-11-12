---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-frontend-ui-engineering-skill-md-996c7968-c01"
title: "addy-skills: skills/frontend-ui-engineering/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/frontend-ui-engineering/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/frontend-ui-engineering/SKILL.md\"}"
atom_ids:
  - avoid-the-generic-ai-look
  - colocate-a-component-with-its-parts
  - derive-a-design-contract-from-references
  - design-mobile-first-and-check-the-breakpoints
  - design-the-loading-empty-and-error-states
  - keep-a-component-focused-on-one-job
  - make-every-interactive-element-keyboard-accessible
  - place-state-in-the-narrowest-scope-that-works
atom_count: 8
atoms: "[{\"atom_id\":\"avoid-the-generic-ai-look\",\"file_sha256\":\"6237211d75ad6a90bb1d5637517d80628c7525b238de55ea4e9c21640ac4c756\",\"content_sha256\":\"d7a6681ba38790a4db2a970dfa1fb8d51662a11785ea8c586614f9cccf9d8f14\",\"file_bytes\":2666,\"body_bytes\":1559},{\"atom_id\":\"colocate-a-component-with-its-parts\",\"file_sha256\":\"7b133a3379dc437157a06744c5168a6476ada6c5c2f3c514b5c82c5d5b4658ce\",\"content_sha256\":\"775ae7819b99b3c275ad3aa7a2c29a72d8a18bd54b279269d140f27a3d7fbbae\",\"file_bytes\":1495,\"body_bytes\":388},{\"atom_id\":\"derive-a-design-contract-from-references\",\"file_sha256\":\"11ea48a44c5842df4969c5b45294cc8e45a6f92b9a4e691fc0aa4752886c3e76\",\"content_sha256\":\"80e58509a3badf55e27e2c47a83c3cffed981486453a63d2cf3aee97bbe41c91\",\"file_bytes\":2149,\"body_bytes\":909},{\"atom_id\":\"design-mobile-first-and-check-the-breakpoints\",\"file_sha256\":\"5a327cc8b0b703e6c63fa3e31d2ec355ab7d612249087f744774b8b9fb4df2c9\",\"content_sha256\":\"8dccf3c0bbd942dd694e42a5c2fe819e2d453c2196af1877c727e2ee172c9b7c\",\"file_bytes\":1565,\"body_bytes\":481},{\"atom_id\":\"design-the-loading-empty-and-error-states\",\"file_sha256\":\"e43f335d97dd0bb6a663d991a8a0c1f8d6eabad31ccdec5e0925fa9606676afa\",\"content_sha256\":\"abfbb357388169cfb1b7d98a316117c9a931160577674d4da04e3622b26c93df\",\"file_bytes\":2777,\"body_bytes\":1647},{\"atom_id\":\"keep-a-component-focused-on-one-job\",\"file_sha256\":\"f1c483acdcc4537eb3c080cd1c63d1166a73ad9b0aca0e82e31226f60efe0b9a\",\"content_sha256\":\"ab1f8371b7982853383aaac359832c5a6f6898f1d728bd51555b58641e9fe921\",\"file_bytes\":1649,\"body_bytes\":577},{\"atom_id\":\"make-every-interactive-element-keyboard-accessible\",\"file_sha256\":\"f4a1d726da450da3f0eb196b98eca27fff355c245d9ecdc68a12310f56bb0c0e\",\"content_sha256\":\"fd6b51a17cd4f8baedfe5f9ac1bd74aeea7095c9b8d5af38173073a973948b58\",\"file_bytes\":2690,\"body_bytes\":1524},{\"atom_id\":\"place-state-in-the-narrowest-scope-that-works\",\"file_sha256\":\"10340aff128c85d329102ed10ace6cd258c69de180cb1226ebb5e9a533571cce\",\"content_sha256\":\"46b5ff9b471c382d606cbc6899329288b54187aded6aa97c36b3884ea2e8b184\",\"file_bytes\":1804,\"body_bytes\":702}]"
carrier_sha256: b712d12f4a2d0d199eca0254786e4036aabafe407f15cf47d8d8cce8f438347e
carrier_bytes: 17890
revision: 1
status: active
---
<!-- vpmodule:atom:begin avoid-the-generic-ai-look -->
---
instruction_id: avoid-the-generic-ai-look
title: Avoid the generic AI look
summary: "Use the product's own palette, spacing and content instead of the defaults a generated interface falls into."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: A user interface is being built or reviewed and could fall into the generated look.
conditions_does_not_apply_when: "The product's own design system already defines the visual language."
artifact_contract_output_type: aesthetic-decision
artifact_contract_required_data:
  - the defaults avoided
  - the product value used instead
artifact_contract_verified_by: "no listed default appears in the result and every choice comes from the product's own system"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Avoid the generic AI look

AI-generated UI has recognizable patterns. Avoid all of them:

| AI Default | Why It Is a Problem | Production Quality |
|---|---|---|
| Purple/indigo everything | Models default to visually "safe" palettes, making every app look identical | Use the project's actual color palette |
| Excessive gradients | Gradients add visual noise and clash with most design systems | Flat or subtle gradients matching the design system |
| Rounded everything (rounded-2xl) | Maximum rounding signals "friendly" but ignores the hierarchy of corner radii in real designs | Consistent border-radius from the design system |
| Generic hero sections | Template-driven layout with no connection to the actual content or user need | Content-first layouts |
| Lorem ipsum-style copy | Placeholder text hides layout problems that real content reveals (length, wrapping, overflow) | Realistic placeholder content |
| Oversized padding everywhere | Equal generous padding destroys visual hierarchy and wastes screen space | Consistent spacing scale |
| Stock card grids | Uniform grids are a layout shortcut that ignores information priority and scanning patterns | Purpose-driven layouts |
| Shadow-heavy design | Layered shadows add depth that competes with content and slows rendering on low-end devices | Subtle or no shadows unless the design system specifies |

"The AI aesthetic is fine for now" | It signals low quality. Use the project's actual design system from the start.

Generic "AI look" (purple gradients, oversized cards, stock layouts)
<!-- vpmodule:atom:end avoid-the-generic-ai-look -->
<!-- vpmodule:atom:begin colocate-a-component-with-its-parts -->
---
instruction_id: colocate-a-component-with-its-parts
title: Colocate a component with its parts
summary: "Keep the component, its tests, its stories, its hook and its types in one directory next to each other."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: A component and the files that belong to it are being placed on disk.
conditions_does_not_apply_when: The project keeps a single flat component directory by convention.
artifact_contract_output_type: component-layout
artifact_contract_required_data:
  - the directory of the component
  - the files kept in it
  - the responsibility of each file
artifact_contract_verified_by: the component and everything that belongs to it share one directory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Colocate a component with its parts

Colocate everything related to a component:

```
src/components/
  TaskList/
    TaskList.tsx          # Component implementation
    TaskList.test.tsx     # Tests
    TaskList.stories.tsx  # Storybook stories (if using)
    use-task-list.ts      # Custom hook (if complex state)
    types.ts              # Component-specific types (if needed)
```
<!-- vpmodule:atom:end colocate-a-component-with-its-parts -->
<!-- vpmodule:atom:begin derive-a-design-contract-from-references -->
---
instruction_id: derive-a-design-contract-from-references
title: Derive a design contract from references
summary: "Study real references, record the decisions they show, write a short design contract, then rebuild in the product's own language."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: The product needs a distinct visual direction for a new or reworked screen.
conditions_does_not_apply_when: "The screen already follows the product's existing design system and needs no new direction."
artifact_contract_output_type: design-contract
artifact_contract_required_data:
  - the references studied
  - the decisions recorded
  - the contract
  - the assumptions when no reference was available
artifact_contract_verified_by: "the contract names the screen's job, primary action, states, responsive rules and rejected patterns"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Derive a design contract from references

When the product needs a distinct visual direction, collect evidence before choosing a layout:

1. Search a trusted reference catalogue or use references supplied by the product team.
2. Study two or three relevant screens. Record decisions about hierarchy, density, navigation, controls, responsive behavior, and interaction states.
3. Turn those decisions into a short design contract before implementation. Name the screen's job, primary action, required states, responsive rules, and patterns to reject.
4. Rebuild the useful structure in the product's own components, tokens, content, and visual language. Never copy another product's branding, proprietary text, imagery, or exact layout.

Use references as evidence, not as templates. If references are unavailable, document the assumptions and verify the result against the product's existing design system.
<!-- vpmodule:atom:end derive-a-design-contract-from-references -->
<!-- vpmodule:atom:begin design-mobile-first-and-check-the-breakpoints -->
---
instruction_id: design-mobile-first-and-check-the-breakpoints
title: Design mobile first and check the breakpoints
summary: "Build the narrow layout first, then widen it, and check the result at the four named widths."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: A layout is built or changed and it must work at more than one width.
conditions_does_not_apply_when: The surface has a fixed width decided by the host.
artifact_contract_output_type: breakpoint-check
artifact_contract_required_data:
  - the mobile-first layout
  - the widths checked
  - the result at each width
artifact_contract_verified_by: the layout was checked at the four named widths
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Design mobile first and check the breakpoints

Design for mobile first, then expand:

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: single column */
  sm:grid-cols-2        /* Small: 2 columns */
  lg:grid-cols-3        /* Large: 3 columns */
  gap-4
">
```

Test at these breakpoints: 320px, 768px, 1024px, 1440px.

"We'll make it responsive later" | Retrofitting responsive design is 3x harder than building it from the start.
<!-- vpmodule:atom:end design-mobile-first-and-check-the-breakpoints -->
<!-- vpmodule:atom:begin design-the-loading-empty-and-error-states -->
---
instruction_id: design-the-loading-empty-and-error-states
title: "Design the loading, empty and error states"
summary: "Every view needs a loading surface, an empty state, an error state and a rollback for optimistic updates."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "A view shows data that is loaded, can be absent or can fail."
conditions_does_not_apply_when: The view has no data source.
artifact_contract_output_type: state-surface-set
artifact_contract_required_data:
  - the loading surface
  - the empty state
  - the error state
  - the rollback of the optimistic update
artifact_contract_verified_by: no view shows a blank screen and a failed optimistic update restores the previous state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Design the loading, empty and error states

## Loading and Transitions

```tsx
// Skeleton loading (not spinners for content)
function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

// Optimistic updates for perceived speed
function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);

      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      );

      return { previous };
    },
    onError: (_err, _taskId, context) => {
      queryClient.setQueryData(['tasks'], context?.previous);
    },
  });
}
```

## Meaningful Empty and Error States

```tsx
// Don't show blank screens
function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div role="status" className="text-center py-12">
        <TasksEmptyIcon className="mx-auto h-12 w-12 text-muted" />
        <h3 className="mt-2 text-sm font-medium">No tasks</h3>
        <p className="mt-1 text-sm text-muted">Get started by creating a new task.</p>
        <Button className="mt-4" onClick={onCreateTask}>Create Task</Button>
      </div>
    );
  }

  return <ul role="list">...</ul>;
}
```

Missing error states, loading states, or empty states
<!-- vpmodule:atom:end design-the-loading-empty-and-error-states -->
<!-- vpmodule:atom:begin keep-a-component-focused-on-one-job -->
---
instruction_id: keep-a-component-focused-on-one-job
title: Keep a component focused on one job
summary: "A component does one thing, and a component that grows past two hundred lines is split instead of extended."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: A component is being written or grown.
conditions_does_not_apply_when: The component is a single leaf with no behaviour of its own.
artifact_contract_output_type: component-scope
artifact_contract_required_data:
  - the single job of the component
  - the line count
  - the split decision
artifact_contract_verified_by: the component does one thing and no component exceeds the size that triggers a split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep a component focused on one job

**Keep components focused:**

```tsx
// Good: Does one thing
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
      <span className={task.done ? 'line-through text-muted' : ''}>{task.title}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
        <TrashIcon />
      </Button>
    </li>
  );
}
```

Components with more than 200 lines (split them)
<!-- vpmodule:atom:end keep-a-component-focused-on-one-job -->
<!-- vpmodule:atom:begin make-every-interactive-element-keyboard-accessible -->
---
instruction_id: make-every-interactive-element-keyboard-accessible
title: Make every interactive element keyboard accessible
summary: "Give every control a real focusable element, an accessible name and a managed focus, so the page can be used without a mouse."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "A user interface contains controls, form inputs or overlays."
conditions_does_not_apply_when: The interface is a static image with no interaction.
artifact_contract_output_type: keyboard-access-check
artifact_contract_required_data:
  - the focusable elements
  - the accessible names
  - the focus behaviour
  - the keyboard path checked
artifact_contract_verified_by: the whole page can be reached and operated by keyboard alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Make every interactive element keyboard accessible

## Keyboard Navigation

Every interactive element must be keyboard accessible

```tsx
<button onClick={handleClick}>Click me</button>        // ✓ Focusable by default
<div onClick={handleClick}>Click me</div>               // ✗ Not focusable
<div role="button" tabIndex={0} onClick={handleClick}    // ✓ But prefer <button>
     onKeyDown={e => {
       if (e.key === 'Enter') handleClick();
       if (e.key === ' ') e.preventDefault();
     }}
     onKeyUp={e => {
       if (e.key === ' ') handleClick();
     }}>
  Click me
</div>
```

## ARIA Labels

```tsx
// Label interactive elements that lack visible text
<button aria-label="Close dialog"><XIcon /></button>

// Label form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Or use aria-label when no visible label exists
<input aria-label="Search tasks" type="search" />
```

## Focus Management

```tsx
// Move focus when content changes
function Dialog({ isOpen, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // Trap focus inside dialog when open
  return (
    <dialog open={isOpen}>
      <button ref={closeRef} onClick={onClose}>Close</button>
      {/* dialog content */}
    </dialog>
  );
}
```

No keyboard navigation testing.

"Accessibility is a nice-to-have" | It's a legal requirement in many jurisdictions and an engineering quality standard.
<!-- vpmodule:atom:end make-every-interactive-element-keyboard-accessible -->
<!-- vpmodule:atom:begin place-state-in-the-narrowest-scope-that-works -->
---
instruction_id: place-state-in-the-narrowest-scope-that-works
title: Place state in the narrowest scope that works
summary: "Pick the smallest state scope that fits the need, and stop passing props through components that never read them."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: State has to be placed or moved in a user interface.
conditions_does_not_apply_when: The state is server state owned by the data layer.
artifact_contract_output_type: state-placement
artifact_contract_required_data:
  - the scope chosen
  - what the scope is for
  - the prop chain checked
artifact_contract_verified_by: no state sits in a wider scope than it needs and no prop passes through three levels
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Place state in the narrowest scope that works

**Choose the simplest approach that works:**

```
Local state (useState)           → Component-specific UI state
Lifted state                     → Shared between 2-3 sibling components
Context                          → Theme, auth, locale (read-heavy, write-rare)
URL state (searchParams)         → Filters, pagination, shareable UI state
Server state (React Query, SWR)  → Remote data with caching
Global store (Zustand, Redux)    → Complex client state shared app-wide
```

**Avoid prop drilling deeper than 3 levels.** If you're passing props through components that don't use them, introduce context or restructure the component tree.
<!-- vpmodule:atom:end place-state-in-the-narrowest-scope-that-works -->