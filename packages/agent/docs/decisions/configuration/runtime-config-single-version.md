---
type: Decision
title: Єдина версія runtime-конфігурації — v1 несе весь функціонал
---

# Єдина версія runtime-конфігурації

Статус: затверджено користувачем 2026-11-13. Ця запис замінює версійний розділ «Task 4/5 versioned runtime contract» у [runtime-project-model.md](runtime-project-model.md) — дві паралельні версії конфігурації скасовуються.

## Рішення

- `AgentRuntimeConfig/v1` — **єдина** версія runtime-конфігурації, безстроково. Нові версії під час розробки першої версії продукту не створюються.
- Єдиний v1-контракт несе **весь** затверджений функціонал продуктової моделі: repository/product prefixes, `documents` (root/index/requirements areas/research/decisions), `work_items` (enabled types, hierarchy), code selectors, delivery groups, path overrides. Тобто v2-семантика зливається в єдиний v1 — це не повернення до застарілого v1.
- Жодних міграцій, upgrade-, adoption- і config-rebind маршрутів між версіями: версіонної двійковості не існує, тому мігрувати нічого.
- Існуючі сховища, журнали, leases і recovery-операції для live-робіт зберігаються — вони не є версійною міграцією конфігурації.

## Наслідки

- `agent-runtime.config.v1.yaml` повертається до `schema: AgentRuntimeConfig/v1`; його поточна структура (products/documents/work_items) стає канонічним v1-контентом.
- Видаляються: v2-схеми конфігурації, v2-гілки завантаження/валідації, product-model адаптер і версійний dispatch у `loadRuntimeConfig`/`project-configuration`, consumer-configuration v2/v3 варіанти, project-upgrade підсистема та повʼязані endpointʼи.
- `source-preflight.ts` та інші перевірки `AgentRuntimeConfig/v1` лишаються коректними без змін — вони й далі єдина точка істини.
- Будь-яка майбутня зміна форми конфігурації — це еволюція єдиної v1-схеми, а не нова версія; зворотна сумісність старих артефактів не є вимогою до першого релізу.
