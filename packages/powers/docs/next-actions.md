---
type: Implementation Plan
title: 'Vida Powers — наступні дії в межах packages/powers'
description: 'Послідовність робіт у каталозі продукту: harness і скелет, канонічні документи, каталог зі скриптами, вертикальний зріз корпусу, скіли й маніфести, Work Items і findings, runtime-запити — з явними воротами й перевірками.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- implementation-plan
- next-actions
- scoped-plan
sources:
- id: roadmap
  resource: /implementation-plan.md
  title: Vida Powers — план впровадження (rev 2.1)
- id: d9
  resource: /decisions/D9-scoped-to-powers.md
  title: 'D9 — Робочий scope: лише packages/powers'
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: agent-package-conventions
  resource: /../../agent/package.json
  title: Vida Agent package — конвенції Bun-пакета
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

# Мета і межі

Обсяг робіт обмежено каталогом `packages/powers/` (D9). Спільні root-файли
репозиторію не змінюються; реєстрація продукту в них — відкладена залежність.

Мета цієї черги: **доводима конвеєр з корпусом і скілами**, придатний для
Standalone-середовища, з перевірками, що виконнюються, а не декларуються.

**Обмеження інфраструктури (рішення власника, 2026-10-19):** плагін **не має
власної інфраструктури**. Проєктний рантайм — Bun 1.4.3; плагін не вводить
власного рантайму, бандлера, пакетного менеджера, CLI-фреймворку чи тестового
раннера. Код плагіна **runtime-агностичний**: лише стандартні `node:` модулі,
без зовнішніх залежностей і без Bun-специфічних API у runtime-частині.
**Скрипти, що постачаються в скілах** (налаштування, пошук інструкцій), —
звичайний TS без збірки: працюють під Bun, Node або Deno. Машинні дані, які
читає код, — **JSON**; YAML лишається для людських маніфестів (`donors.yaml`).

# Порядок і ворота

```
A0 (gate) ──► A harness+скелет ──► B канонічні документи ──► C каталог+скрипти
                                                            │
                                                            ▼
                                      D вертикальний зріз корпусу (superpowers)
                                                            │
                        ┌───────────────────────────────────┴────────────────┐
                        ▼                                                    ▼
              E скіли + маніфести                              F Work Items + findings
                        └───────────────────────────────────┬────────────────┘
                                                            ▼
                                              G runtime-запити (документи)
```

| Крок | Зміст | Ворота (має бути доказ) | Оцінка |
|---|---|---|---|
| **A0** | Перевірити ризик для чужого lint-гейту до першого TS-файлу | `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0 | S | **закрито 2026-10-19** |
| **A** | Скелет продукту й harness **за конвенціями `packages/agent`** (без власної інфраструктури): `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml`, власна install-тека (`bun.lock`), каталоги `scripts/ tests/ config/ instructions/ skills/ docs/work/ docs/requests/` | `bun run --cwd packages/powers test` → 13 pass / 0 fail; `bun run --cwd packages/powers typecheck` → «No type errors»; plain-TS скрипт однаково виконується під `node` і `bun` | S | **закрито 2026-10-19** |
| **B** | Канонічні документи продукту: `business-requirements.md`, `system-specification.md`, `acceptance.md`, матриця research § → SR § → AC id | Матриця повна; `check-okf.ts` → exit 0; doc-check → `failures: []` | M |
| **C** | Схеми `VPCatalog/v1` і `VPMethodologyProfile/v1` у `config/`; операції `catalog.tags/search/get/compose` у `tooling/`; `decision.evaluate` з fallback (D5) | Тести операцій: лише ID/опис у пошуку, обов'язкові + залежності в compose, конфлікт груп → помилка, кожен trigger fallback → fallback з причиною | L |
| **D** | Вертикальний зріз корпусу на superpowers: інвентар → атомарні інструкції → теги → dedup → provenance; конвертер `tooling/convert.ts` як тестований інструмент | Інвентар 100% tracked-файлів-носіїв; кожна інструкція: ≥2 змістовні компоненти в кожному тегу, provenance, ліцензія; dedup-рішення зафіксовані; тести конвертера + `check-corpus.ts` → exit 0 | L |
| **E** | Скіли `vp-mode` (оркестрація) і `vp-setup` (налаштування) у `skills/`, разом із **постачаваними скриптами** `skills/*/scripts/` (налаштування, пошук інструкцій) — plain TS без збірки; per-host `plugin.json` і `marketplace.json`; `vp-setup` writers (Standalone → керований YAML-блок у `AGENTS.md`/`CLAUDE.md`) | Повторний запуск setup → порожній diff; setup не змінює встановлений пакет агента; маніфести валідні схемою; постачавані скрипти виконуються без Bun-специфічних API (перевірка запуском під `node`) | M |
| **F** | Work Items VP у `docs/work/` (OKF-концепції зі стабільними ID, AC, evidence); findings JSONL (Standalone, append-only); `artifact_contract` | Work Item має ID/AC/evidence і зв'язки; findings: повторна доставка не створює подію; dedup-випадки зафіксовані | M |
| **G** | Runtime-запити як документи в `docs/requests/`: один запит на D3+D8 (розширений instruction registry + читання профілю) | Запит має власника, перелік файлів, вимірюваний результат | S |

# Ключові рішення черги

- **B перед C:** S-документи фіксують контракт `catalog.*` і профілю; код реалізує
  вже затверджений контракт, а не припущення.
- **C перед D:** формат каталогу перевіряється на порожньому/найменшому наборі
  до масштабування на донорів.
- **D вертикальним зрізом:** один донор (superpowers) доводить весь конвеєр
  інвентар → інструкції → теги → dedup → provenance. Після нього — ponytail,
  matt-skills, addy-skills, BMAD, pstack, GSD за тим самим exit criteria.
- **E після D:** скіли споживають каталог; спершу — доведений каталог.
- **F паралельно з E** (різні файли: `docs/work/` і `skills/`), але один writer на
  файл.
- **G останнім:** runtime-запит формується на основі реалізованих контрактів, а не
  на основі задуму.

# Вимоги до першого TS-файлу (A0-гейт)

1. `packages/powers` **не** входить у workspace root-пакета → `bun run --cwd packages/powers test`
   має працювати на власному `package.json` і власному `bunfig.toml`.
2. Knip агента сканує репозиторій цілом; workspace для `packages/powers` додано
   (owner-рішення, D9 rev 2): `packages/agent/knip.config.ts`, блок `packages/powers`
   з `entry: ['scripts/*.ts', ...tests]`, `project: [codeFiles]`, `ignoreBinaries: ['check']`;
   scratch-тека `.tmp` виключена самим `.gitignore`; патерн `skills/*/scripts/*.ts`
   додається на кроці E, коли з'явиться тека скілів (інакше knip дає config hint).
   Підтвердження ризику фактичним прогоном: `bun run --cwd packages/agent
   lint:knip:pinned` — **виконано 2026-10-19**, `{"issues":[]}`, exit 0.
3. Якщо прогін виявить інші зауваження (напр. «unlisted binary» для `bun`), рішення —
   точечна правка блоку `packages/powers` у knip-конфізі (owner-виняток D9 rev 2).
4. Тести VP не повинні залежати від залежностей агента; стандартна бібліотека Bun
   і локальні модулі.

# Файли черги (все в `packages/powers/`)

| Шлях | Відповідальність | Крок |
|---|---|---|
| `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml` | Скелет пакета, дзеркалить конвенції `packages/agent` | A |
| `skills/vp-mode/scripts/catalog.ts` | Операції `catalog.*` + `decision.evaluate` | C |
| `scripts/convert.ts` | Конвертер донорів → каталог | D |
| `scripts/check-corpus.ts` | Перевірка корпусу: теги, provenance, dedup, покриття | D |
| `scripts/check-okf.ts` | Перевірка OKF-сумісності bundle (вже створено) | наявний |
| `config/vpcatalog.v1.schema.json`, `config/vp-methodology-profile.v1.schema.json` | Схеми VP | C |
| `instructions/` | Канонічні інструкції: `.md` + метадані, плоско | D |
| `corpus-map.json` | Мапа обробки: донор + файл → converted/split/merged/rejected | D |
| `skills/vp-mode/SKILL.md`, `skills/vp-setup/SKILL.md` + їхні `scripts/` | Скіли оркестрації й налаштування разом із тулінгом | C, D, E |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Per-host plugin/marketplace manifests | E |
| `docs/work/` | Work Items VP (OKF-концепції) | F |
| `docs/requests/` | Runtime-запити до agent maintainer | G |
| `docs/business-requirements.md`, `docs/system-specification.md`, `docs/acceptance.md` | Канонічні документи продукту | B |
| `tests/` | Bun-тести harness'у VP | A–F |

# Відкладені залежності (поза поточним scope)

| Залежність | Блокує | Статус |
|---|---|---|
| Реєстрація в root-файлах (sidecar, config, doc-policy, products.map, README, knip, root package.json) | Runtime-режим VP, CI, включення в документаційну політику | Відкладено (D9) |
| Runtime-запит D3+D8: розширений instruction registry і читання профілю | Бundled-режим, Runtime-інтеграція | Запит готується в G |
| Cutover `.vida/*` | Runtime-режим із цільовим layout | Зовнішній runtime-трек |
| Публічний Git-репозиторій для marketplace | Канал 3 | Потребує рішення власника |

# Визначення завершення черги

Черга вважається закритою, коли: (1) корпус із superpowers + ponytail
конвертовано й перевірено (`check-corpus.ts` → exit 0); (2) `catalog.*` і
`decision.evaluate` мають тести й працюють без Runtime; (3) `vp-mode` і `vp-setup`
встановлюються локально та ідемпотентно; (4) Work Item VP заведено з AC і
evidence; (5) runtime-запит D3+D8 оформлено; (6) `check-okf.ts` і репозиторний
doc-check проходять; (7) увесь bundle-журнал `docs/log.md` відображає ці зміни.
