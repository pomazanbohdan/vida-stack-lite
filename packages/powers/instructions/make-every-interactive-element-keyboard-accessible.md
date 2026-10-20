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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 1
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
