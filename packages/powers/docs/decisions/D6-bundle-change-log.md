---
type: Decision
title: 'D6 — Журнал змін продукту: bundle-лог за Open Knowledge Format'
description: 'Історія змін концепцій VP ведеться в bundle-журналі packages/powers/docs/log.md за форматом Open Knowledge Format v0.2 (§9); окремий файл *changelog.md не ведеться.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- change-log
- okf
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: okf
  resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
  title: Open Knowledge Format v0.2
- id: bundle-index
  resource: /index.md
  title: Бundle-індекс документації Vida Powers
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

# Рішення

Історія змін концепцій Vida Powers ведеться **у bundle-журналі
`packages/powers/docs/log.md`** за форматом Open Knowledge Format v0.2 (§9): дата,
вид зміни, що саме змінилося. Окремий файл `*changelog.md` **не ведеться**.

# Контекст

- Research §7.1 вимагає окремий пов'язаний журнал змін / audit-артефакт, який
  записує зміну вмісту, дату, виконавця і причину, і який не змішується з
  тематичним research.
- Open Knowledge Format v0.2 §9 визначає журнал як окремий файл `log.md` у
  ієрархії, із заголовками дат у форматі ISO 8601 `YYYY-MM-DD` і записами
  найновіші спершу.
- Наш bundle уже має `log.md`; research-документ посилався на неіснуючий
  `vida-powers-product-research.changelog.md` (помилка frontmatter, виправлена
  на `vida.changelog_ref: /log.md`).

# Наслідки

1. `vida.changelog_ref` у research-документі вказує на `/log.md` (bundle-відносний
   шлях).
2. Будь-яка зміна концепції VP супроводжується записом у `log.md` (дата, вид
   зміни, що змінилося).
3. Тематичний research-документ **не** містить журналу змін у своєму тілі (§7.1).
4. Записи журналу є частиною bundle і проходять перевірку `check-okf.ts`.

# Розглянуті варіанти

| Варіант | Суть | Висновок |
|---|---|---|
| (a) Окремий `*changelog.md` на документ | Своя історія для research | Відхилено: дублює журнал bundle й розходиться з OKF-конвенцією |
| (b) Bundle-журнал `log.md` | Одна історія на весь bundle | **Прийнято** |

# Вплив на інші рішення

- D1, D2 не змінюються.
- Інші decision-записи VP ведуть власну історію через `revision` у frontmatter і
  bundle-журнал.

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
