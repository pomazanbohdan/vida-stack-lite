---
type: Decision
title: 'D8 — Методологічний профіль: одна схема VP, носій за середовищем'
description: 'Схема методологічного профілю — VP-owned (VPMethodologyProfile/v1); Runtime несе розділ у .vida/project.yaml, Standalone — той самий розділ у керованому YAML-блоці проєктного instruction-файлу, хост-прослойка — у конфіг-файлі проєкту.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- methodology-profile
- configuration-surface
- inheritance
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: d7
  resource: /decisions/D7-consumer-initialization.md
  title: D7 — Ініціалізація VP за середовищем
- id: project-config-schema
  resource: /../../agent/schemas/project-configuration.v1.schema.json
  title: VidaProjectConfig/v1 schema
- id: agent-system-spec
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification — initialized project layout
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

# Рішення

**Одна схема — різні носії.** Схема методологічного профілю належить **VP**:
`VPMethodologyProfile/v1` (власна схема `Type/vN`, власний owner). Фізичне місце
розміщення визначає середовище:

| Середовище | Носій профілю |
|---|---|
| Runtime (агентне середовище) | Розділ у `.vida/project.yaml` — цільовий споживацький layout |
| Standalone (VP без runtime агента) | Той самий розділ у керованому YAML-блоці проєктного instruction-файлу (`AGENTS.md`, або `CLAUDE.md`, якщо `AGENTS.md` відсутній) |
| Хост-прослойка (напр. Codex) | Той самий розділ у конфіг-файлі проєкту, зібраному з шаблонів прослойки |

Набір полів, семантика успадкування й правила конфлікту — **одні й ті самі** в усіх
середовищах; відрізняється лише файл-носій.

# Склад профілю

- Групи вибору: `testing-sequence`, `review-strategy`, `architecture`, `delivery` —
  кожна група має взаємовиключні альтернативи, сумісні доповнення й умовні залежності.
- Явне вибіркове успадкування між продуктами: профіль посилається на стабільні ID
  іншого продукту; неявне повне успадкування через спільний репозиторій **не**
  застосовується.
- Локальне перевизначення групи має пріоритет над успадкованим без повторного
  підтвердження; два суперечливі успадковані варіанти без локального рішення — це
  конфлікт для власника, а не «останній завантажений перемагає».
- Task-scoped override — тимчасовий виняток для конкретної задачі та продукту:
  запитується один раз, фіксується, передається дочірнім агентам; не змінює
  постійний профіль, інші продукти, permissions чи security gates.
- Live Inheritance: посилання на стабільні ID без version pinning; зміна поведінки —
  новий `pattern ID`, а не підміна тієї самої інструкції.
- Рівень флоу (`Full` / `Medium` / `Light`) — окрема властивість профілю: глибина,
  обов'язковість (`required` / `conditional` / `optional`) і застосовність — різні
  речі.

# Наслідки

1. **Схема — VP-owned**: `packages/powers/config/` + `VPMethodologyProfile/v1`;
   власний owner; жодного розширення runtime-схем «заради VP-сутності».
2. **Runtime-валідація розділу** в `.vida/project.yaml` — частина того самого
   runtime work item, що й розширений instruction registry (D3): runtime має
   прочитати й передати профіль. Один запит, не два.
3. **`.vida/project.yaml` лишається цільовим layout**; у чинному стані Runtime
   використовує `agent-runtime.config.v1.yaml` — розділ профілю з'являється в
   Runtime-конфізі разом із cutover (D7: три середовища, три носії).
4. **Standalone не залежить від `.vida`**: там профіль живеє в керованому блоці
   instruction-файлу, який пише `vp-setup`.
5. **Research §4.3 вже розводить середовища** саме так («Standalone — керований блок у
   `AGENTS.md`; Runtime — конфігурація продукту»), тому рішення узгоджується з
   B-джерелом, а не суперечить йому.

# Розглянуті варіанти

| Варіант | Суть | Висновок |
|---|---|---|
| (a) VP-owned схема, розділ у runtime-конфізі | Профіль — розширення чужої схеми | Відхилено: VP-сутність у чужому пакеті; runtime-зміна без потреби |
| (b) VP-owned схема + файл у продукті | Один файл, середовища посилаються | Відхилено: у споживацькому проєкті немає повного профілю без зовнішнього файлу |
| (c) Одна схема, носій за середовищем | Схема VP; Runtime — `.vida/project.yaml`, Standalone — instruction-файл, shim — конфіг проєкту | **Прийнято** |
| (d) Лише `.vida/project.yaml` | Runtime-єдиний носій | Відхилено: суперечить research §4.3 для Standalone; залежить від cutover |
| (e) Лише чинний runtime-конфіг | `agent-runtime.config.v1.yaml` | Відхилено: розбіжність із цільовим layout і окрема міграція |

# Вплив на інші рішення

- D7: D8 уточнює носій профілю в кожному з трьох середовищ; D7 не змінюється.
- D3: runtime work item об'єднує розширений instruction registry **і** читання
  методологічного профілю.
- D5: профіль задає рівень флоу, який роутінг (вибір LLM, формування агентів)
  установлює.

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
