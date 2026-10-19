---
type: Decision
title: 'D9 — Робочий scope: лише packages/powers, реєстрація в root-файлах відкладена'
description: 'Поточний обсяг робіт VP обмежено каталогом packages/powers; реєстрація продукту в спільних root-файлах репозиторію (sidecar, config, doc-policy, products.map, README, knip, root package.json) відкладена як зовнішня залежність.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- scope
- deferral
- repository-integration
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: d2
  resource: /decisions/D2-ownership-and-work-space.md
  title: D2 — Модель власності й робочого простору VP у монорепозиторії
- id: knip-config
  resource: /../../agent/knip.config.ts
  title: Knip-конфігурація репозиторію
- id: documentation-policy
  resource: /../../agent-instructions/documentation-policy.v1.json
  title: DocumentationPolicy/v1
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T00:00:00Z' }
revision: '1'
---

# Рішення

**Поточний обсяг робіт VP обмежено каталогом `packages/powers/`.** Жоден спільний
root-файл репозиторію не змінюється. Реєстрація продукту в репозиторії (sidecar,
`agent-runtime.config.v1.yaml`, документаційна політика, `docs/products.map.md`,
`README.md`, knip-конфігурація, root `package.json`) — **відкладена** як зовнішня
залежність, яка потребує окремого кроку з власником репозиторію.

# Що залишається в межах каталогу

| Можна робити зараз | Не можна робити зараз |
|---|---|
| Канонічні документи продукту (BR/SR/AC), research, decision-записи, OKF-bundle | Реєстрацію продукту в `AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, doc-policy, `products.map.md`, `README.md` |
| Схеми VP (`VPCatalog/v1`, `VPMethodologyProfile/v1`) і власні скрипти `catalog.*` | Зміни в `packages/agent` (розширений instruction registry, читання профілю) |
| Конвертація корпусу донорів, тести, provenance | Зміни в CI та в пакунок агента |
| Скіли `vp-mode` і `vp-setup`, per-host plugin/marketplace manifests | Публікація marketplace (потрібен публічний Git-репозиторій) |
| Work Items і findings VP у продукті (Standalone-режим) | Runtime-режим VP (потребує реєстрації й runtime-запиту) |

# Наслідки

1. **Runtime-запити оформлюються документами** в `packages/powers/docs/requests/`
   (D3 + D8), а не змінами в `packages/agent`; виконання — поза поточним scope.
2. **Продукт не входить у документаційну політику репозиторію**: `canonical_roots`
   не містить `packages/powers/docs` (R-16). Еквівалент забезпечує власна
   документаційна дисципліна продукту: OKF-bundle, журнал `docs/log.md`,
   `bun packages/powers/tooling/check-okf.ts` і репозиторний
   `bun tooling/agent/check-documentation.ts` як локальна перевірка посилань.
3. **Ризик для чужого lint-гейту** (не перевірено: залежності не встановлені):
   knip-конфігурація агента сканує репозиторій цілом (`--directory ../..`) і має
   workspace для `.`, `packages/agent`, `packages/plugin` — файли `packages/powers/**`
   можуть опинитися «unlisted» і впасти на `lint:knip` (`--max-issues 0`,
   `--treat-config-hints-as-errors`). Перевірка перед першим TS-файлом у VP:
   `bun --cwd packages/agent run lint:knip:pinned`. Якщо ризик підтвердиться —
   потрібна root-зміна (owner) або відкладення TS-коду.
4. **Bun-версія продукту** — пін `1.4.3`, як у `packages/agent/.bun-version`;
   інструментальний ланцюг — лише Bun.
5. **Runtime-режим VP не доводиться** у поточному scope: немає ані реєстрації, ані
   runtime-запиту. Доведеться Standalone-частину: власний каталог, власні скрипти,
   скіли, корпус, Work Items, findings.

# Розглянуті варіанти

| Варіант | Суть | Висновок |
|---|---|---|
| (a) Повний scope, включно з root-реєстрацією | Stage 0 виконується одразу | Відхилено: робота поза каталогом VP не узгоджена з поточним обмеженням |
| (b) Лише `packages/powers` | Обмеження каталогом, реєстрація відкладена | **Прийнято** |
| (c) Без коду взагалі — лише документи | Тільки bundle, без TS | Відхилено: без harness'у перші ж вимірювання доказів неможливі; ризик knip перевіряється gate'ом перед першим TS-файлом |

# Вплив на інші рішення

- D1, D2 не змінюються; D2-fix (реєстрація) стає відкладеною частиною.
- D3, D4b, D5, D7, D8 мають VP-частину, яка реалізується в каталозі, і зовнішню
  частину (runtime-запит, публікація), яка відкладена.
- План впровадження: Stage 0 розділяється на **0a** (всередині каталогу) і **0b**
  (root-реєстрація, відкладено).

# Повноваження

Рішення власника репозиторію від 2026-10-19, зафіксоване в поточній розмові.
