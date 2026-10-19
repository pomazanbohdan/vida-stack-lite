---
type: Implementation Plan
title: Vida Powers — план впровадження
description: Порядок етапів, ворота й приймальні критерії реалізації Vida Powers — від реєстрації продукту й канонічних документів до конвертації корпусу, Router, матеріалізації, Runtime-інтеграції та Standalone-режиму.
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- implementation-plan
- product-roadmap
- agent-orchestration
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: donors-manifest
  resource: ../donors.yaml
  title: Маніфест донорських джерел
- id: agent-system-specification
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification
- id: agent-testing
  resource: /../../agent/TESTING.md
  title: Agent verification gates
- id: okf
  resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
  title: Open Knowledge Format v0.2
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:01:10Z' }
verified:
- { by: deepseek/deepseek-flash, at: '2026-10-19T13:36:34Z' }
- { by: opencode/glm-5.3-flash-free, at: '2026-10-19T13:59:31Z' }
revision: '2.1'
---

# Vida Powers — план впровадження (rev 2.1)

Owner: продуктовий власник Vida Powers. Class: **derived execution roadmap** —
порядок робіт і ворота, не нормативна специфікація і не дозвіл на мутації.

Джерела істини: research `docs/research/vida-powers-product-research.md` (B-рівень) →
майбутні `business-requirements.md` / `system-specification.md` / `acceptance.md`
продукту (S-рівень) → реалізація й докази (C-рівень).

**Мета:** перетворити фіналізовану концепцію VP на реалізований, кваліфікований
продукт із канонічним instruction corpus, єдиною точкою входу, матеріалізацією
результатів і роботою у двох режимах (Standalone / Runtime).

**Архітектура:** VP — портативний плагін із власним каталогом інструкцій
(`VPCatalog/v1`) і одним Router-входом; каталог не дублює runtime-механізмів, а
проектується в наявний activation-шлях (`InstructionRegistry/v1` → research-декісії
та workflow-стадії). У Runtime виконання належить VIDA Core/Mastra, у Standalone —
головному LLM-агенту хоста.

**Стек:** Bun 1.4.3 (єдиний інструментальний ланцюг), TypeScript, JSON Schema
(`Type/vN`), Markdown+frontmatter, SQLite/HostState лише в Runtime-режимі.

**Специфікація:** `docs/research/vida-powers-product-research.md` (джерело B) →
S-документи, які створює Stage 1.

**Rev 2** переписано після незалежної валідації (вердикт **REJECTED**, 6 blocker /
12 major / 4 minor). Стан на 2026-10-19, гілка `powers`.

**Rev 2.1** — виправлення за раундом 2 валідації (вердикт
**ACCEPTED-WITH-CHANGES**): одна major (M-01 — місце схеми методологічного
профілю, додано рішення D8), шість minor, залишок DAG-суперечності (R-12) і
чотири прогалини покриття research. Див. §1a.

**Актуальність.** Останнє значне зміна: 2026-10-19. `stale_after` = 2026-11-19 —
після цієї дати план вважається застарілим і потребує перегляду. Незалежна
перевірка раунду 2 стосувалася rev 2; rev 2.1 застосувала її зауваження, тому
незалежна перевірка rev 2.1 лишається **GAP**. Runtime acceptance не
встановлено.

---

## Global Constraints

- VP не має власного workflow engine, scheduler, ledger, CAS або state store. Runtime
  залишається єдиним власником транзакційного стану, reservation і lease.
- Один canonical owner на кожен контракт. `InstructionRegistry/v1`, `HostState`,
  `WorkState/v1`, `ResearchResult/v1`, `DecisionRecord/v1`, `AcceptanceManifest/v1`,
  `WorkItem/v1`, `ImplementationScope/v1`, `ResearchSynthesis/v1`,
  `LifecycleArtifactReference/v1`, `WorkArtifactReference` — перевикористовуються,
  не дублюються. Розширений instruction registry пакета агента (D3) — окремий
  реєстр **для VP** з reuse наявного activation-шляху; друга активація не
  створюється, `research_decision.registry` не змінюється.
- `packages/agent` — власник runtime-власника. VP не редагує їх без окремого
  погодженого work item з runtime-власником.
- Кореневий `AGENTS.md` генерується з `packages/agent/templates/AGENTS.template.md`;
  шаблон забороняє project-specific content і замінюється wholesale. VP-інтеграція
  пише у project-owned поверхню споживача, не в пакет агента.
- `.vida/*` — **цільовий** споживацький layout, не чинний. Чинна конфігурація —
  `agent-runtime.config.v1.yaml` (секція `workflows:`) і поточні v1-контракти.
- Інструментальний ланцюг — лише Bun. `node`/`npm`/`npx` не підключаються до команд
  розробки. Повний шлях до Bun на поточній машині:
  `C:\Users\pomaz\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe`
  (не в PATH — виклик через повний шлях).
- Один writer на файл. Root володіє Git, спільними root-файлами (sidecar, config,
  `docs/products.map.md`, documentation policy, root `package.json`) і фінальними
  перевірками. Працівники не виконують Git-операцій.
- Документація продукту оформлена за Open Knowledge Format v0.2: bundle —
  `packages/powers/docs`; кореневий `index.md` оголошує `okf_version`; журнал
  `log.md` веде історію; кожна концепція має frontmatter із `type`, `sources`,
  `generated`, `verified`, `status`, `stale_after`. Перевірка —
  `bun packages/powers/tooling/check-okf.ts` (exit 0).
- Доказ: `BR → SR → AC → evidence`. `passed` неможливий без фактичного запуску.
  Статичний аналіз або наявність коду не закривають AC.
- Змінений вхід інвалідує лише прив'язаний до нього доказ.

## Review Focus

1. **Повторний запуск `vp-setup`** — не повинно з'явитися жодного дубля керованого
   блоку, hook-правила або запису; повторний запуск на незміненому вході дає
   порожній diff.
2. **Інструкція, вибрана не за тегом** — якщо інструкція обов'язкова (required) або
   є залежністю, вона потрапляє в bundle навіть з низьким relevance; теговий пошук
   не може її викинути.
3. **Конфлікт успадкування методології** — два суперечливі успадковані варіанти без
   локального рішення мають зупинити вибір і поставити питання власнику, а не
   застосувати «останній завантажений перемагає».
4. **Запізнілий результат підзадачі** — не переписує вже прийнятий результат
   батька; має окремий запис і явне опрацювання.
5. **Поза межами Work Scope** — знахідка блокуюча AC, але поза виданними
   повноваженнями, фіксується як блокер із запитом дозволу; scope не розширюється
   автоматично, а помилка чужого коду не тягне за собою чужу роботу.

---

## 1. Що змінено у rev 2

| ID | Зауваження валідації | Виправлення в rev 2 |
|---|---|---|
| R-01 | `InstructionRegistry/v1` має `maxItems: 64` і вбудований у `research_decision.registry`; корпус туди не вміщується | Stage 2 розділяє **каталог** (`VPCatalog/v1`, джерело корпусу) і **activation** (обмежена проекція ≤ 64 у наявний реєстр). D3 переформульовано |
| R-02 | `vp-setup` не має права редагувати `packages/agent/templates/AGENTS.template.md` | Stage 5 пише у project-owned поверхню споживача; зміна шаблону — окремий runtime-запит. D-04 виправлено |
| R-03 | `.vida/*` — ціль, а не чинний layout | Global Constraints + D-06; Stage 4/7 ціляться у чинний v1-конфіг. Додано рішення D7 |
| R-04 | Stage 1 фіксує S-контракти до D3/D4/D5 | D3/D4/D5 перенесені в Stage 0; Stage 1 розділено на стабільні інваріанти й відкладені розділи |
| R-05 | Розділ «plan не змінює runtime» суперечив Stage 2/5/7 | Кожен етап має блок **Runtime-запитів** з owner-ом; §8 переписано |
| R-06 | Дистрибуція поза scope, але Stage 8 вимагає `install+run` | Stage 5 отримує deliverable «пакунок + локальна інсталяція»; D4 блокує Stage 8; marketplace лишається Stage 9 |
| R-07 | Storage GAP надмірно блокує Runtime-режим | Stage 7 розділено на 7a (чинні v1-контракти) і 7b (workspace-БД після GAP) |
| R-08 | `findings` є не лише в `ResearchResult/v1` | D-08 переписано: перелічено `ResearchResult/v1`, `ResearchSynthesis/v1`, `final-assurance-review/state`; відсутній саме defect-registry |
| R-09 | `ArtifactReference` вже існує | D-07: `LifecycleArtifactReference/v1`, `WorkArtifactReference` перевикористовуються; до reuse додано `ResearchSynthesis/v1`, `ImplementationScope/v1` |
| R-10 | Stage 3 необмежений (6375 файлів) | Stage 3 отримав MVP-корпус, per-donor exit criteria, метрику покриття, exclusion-list, тестований конвертер, license/NOTICE manifest, шарди з одним інтегратором |
| R-11 | AC вигадував «≥2 capability-теги на інструкцію» | AC переписано на правило research: кожен тег kebab-case і має ≥2 змістовні компоненти; заповненість — де семантично застосовно, винятки задокументовані |
| R-12 | DAG суперечив залежностям | DAG перемальовано, додано оцінки S/M/L і зовнішні залежності |
| R-13 | AC невиконувані | Кожен етап має перевірювані AC із командою, артефактом і спостереженням; негативні AC замінено на позитивні інваріанти + конкретну перевірку; додано вимогу exact coverage/CRAP для нового VP-коду |
| R-14 | Stage 7 ігнорує три Lifecycle Scope | Stage 7 отримав окремий AC-блок щодо `parent`/`workflow`/`independent`, старт≠завершення, запит скасування ≠ зупинка |
| R-15 | Пропущено вимоги research §4.5, §4.6, §4.8, §4.9, §5 | Додано у Stage 2 (знімок у межах задачі, risk-adaptive updates, OKF-поля), Stage 4 (Light/Medium/Full, рольова композиція), Stage 5 (`workflow.options`, `decision.evaluate`, калібрування порога) |
| R-16 | Реєстрація продукту неповна | Stage 0 розширено: doc-policy `canonical_roots`/`map_paths`/changelog, повний набір полів проєкту, root `package.json` workspace, product KEY + allocator |
| R-17 | Етапи без ролей і без work item | Кожен етап має Role і Work item; shared-файли — Root; мутація тільки з work item |
| R-18 | D1(b) суперечить «exactly two products» | D1 переписано: (b) лише як owner-approved amendment sidecar + system-spec; додано варіант (c) — окремий репозиторій/пакет; для (a) зафіксовано Codex-only ризик |
| R-19 | Host hook-поверхня існує | D-05 переписано: runtime-hook API немає, але Codex native `/hooks` + trusted `SessionStart` hook існують; Stage 5 перевикористовує й кваліфікує їх, hook trust — явний GAP |
| R-20 | `file_count` pstack рахував весь монорепозиторій | `donors.yaml` уточнено: `file_count` (репозиторій) + `content_file_count` (169 для `pstack/`); OKF позначено як moving branch snapshot |
| R-21 | «7 донорів» vs «8 записів» | Узгоджено: 7 methodology donors + 1 format reference (OKF); OKF — формат/provenance-вхід, не методологія |
| R-22 | Число комітів не відтворювалось | Замість числа — точний commit і команда `git rev-list --count` |
| R-23 | D-01 неповний перелік полів; D-03 — неправильний шлях і сфера | Обидва рядки виправлено: повний перелік обов'язкових полів реєстру; `src/orchestration/configured-context.ts`, підтримка — лише workflow-stage `context_skill_refs` |
| R-24 | Паралельні donor-лейни без інтегратора | Stage 3: per-donor шарди + один інтегратор (Root) + правило digest |

---

## 1a. Що змінено у rev 2.1 (раунд 2 валідації)

Раунд 2 (`opencode/glm-5.3-flash-free`) дав вердикт **ACCEPTED-WITH-CHANGES**:
усі 24 знахідки раунду 1 виправлено фактичною зміною плану, перевіреною по Source;
залишилися одна major, шість minor і часткове покриття research.

| ID | Зауваження раунду 2 | Виправлення в rev 2.1 |
|---|---|---|
| M-01 (major) | Stage 4: поверхня конфігурації методології в чинному v1-конфізі вимагає розширення `agent-runtime-config.v1.schema.json` і валідатора `runtime-config.ts` — це runtime-owned зміна без Runtime-запиту; D7 вирішує layout споживача, а не місце схеми | Додано рішення **D8** (де живе схема профілю; рекомендація — VP-owned `Type/vN`, варіант (a) лише за runtime work item) + блок Runtime-запиту в Stage 4; D7 відділено від D8 |
| m-02 (minor) | D-07 приписував `AcceptanceManifest/v1`, `ImplementationScope/v1`, `WorkState/v1` до `artifact_contracts` конфігу — там лише `WorkItem/v1`, `ResearchResult/v1`, `ResearchSynthesis/v1`, `DecisionRecord/v1` | D-07 переписано з точним переліком обох груп |
| m-03 (minor) | D-07 називав поле `fingerprint` | Виправлено на `implementation_fingerprint` |
| m-04 (minor) | Таблиця правок посилалася на «§9», а розділ «Межі плану» — §8 | Посилання виправлено |
| m-05 (minor) | Проекція в реєстр має матеріалізуватися в `agent-runtime.config.v1.yaml#research_decision.registry.instructions.N` (жорсткий шаблон `source_path`), тобто в Root-owned root-файлі; Stage 2 не зазначав координацію з Root | Stage 2: додано межу реєстру, узгодження з Root і заборону паралельного запису в root-конфіг + AC на `test:config:pinned` |
| m-06 (minor) | Формулювання note у `donors.yaml` про ліцензію pstack плутане | `donors.yaml`: note переформульовано (окремий `pstack/LICENSE`, MIT) |
| m-07 (minor) | Друкарські помилки («Позa межами», «Numeral-адреса», «інварідує») | Виправлено |
| R-12 (залишок) | ASCII-DAG показував Stage 5 → 6, а таблиця — залежності Stage 6 від 1, 2, 3; Stage 7a не показано | DAG перемальовано за таблицею залежностей |
| Покриття research | Частково не покриті: §12 (межі автономності), §7.3 (життєвий цикл Work Item), §9.3 (похідний індекс), §5 (UI-агент ≠ людське прийняття) | Додано AC у Stage 1 (§7.3), Stage 6 (§9.3, UI≠human acceptance), Stage 8 (§12, compaction) |

---

## 2. Звірка концепції з поточним Source (rev 2)

| ID | Твердження research | Фактичний стан | Дія |
|---|---|---|---|
| D-01 | Каталог атомарних інструкцій із двома вимірами тегів (§4.2) | `InstructionRegistry/v1`: `instruction_id`, `owner`, `revision`, `source_path`, `source_sha256`, `summary_sha256`, `activation_class` (`always_on`\|`lane_entry`\|`triggered_domain`\|`closure_reflection`), `triggers`, `phases`, `lanes`, `output_schema`, `max_bytes`, `privacy`, `status`, `content`; `instructions` — `maxItems: 64`; вбудований у `research_decision.registry` конфігу; активація через `src/research-decision.ts` | Stage 2: `VPCatalog/v1` + власні скрипти; розширений реєстр пакета агента — runtime work item (D3) |
| D-02 | 7 донорів (§4.1) | 7 methodology donors + 1 format reference (OKF) у `donors.yaml`; копії в `.tmp/donors`, знімки зафіксовані | Stage 3 |
| D-03 | Один вхід: Router + `vp-setup` | Skill refs підтримані **лише** як workflow-stage `context_skill_refs` (`.codex/skills/<name>/SKILL.md`): `src/orchestration/configured-context.ts:63`, `src/config/runtime-config.ts:1330-1333`. Загального skill discovery немає | Stage 5 |
| D-04 | `vp-setup` керує `AGENTS.md` (§3) | `AGENTS.template.md` забороняє project-specific content і замінюється wholesale; consumer не редагує встановлений пакет | Stage 5: писати у project-owned поверхню |
| D-05 | Session/compaction hooks (§3) | Runtime-hook API в `packages/agent/src` відсутній. Хост-поверхня є: Codex native `/hooks` review, trusted `SessionStart` hook, кваліфікація через `tooling/agent/cloud-pstack-setup.ts`; новий/змінений hash потребує native review — trust GAP, не синтезується | Stage 5: перевикористання + кваліфікація, trust GAP явний |
| D-06 | Методологія як політика продукту (§4.3, §4.4) | Чинна конфігурація — `agent-runtime.config.v1.yaml` (`workflows:`); `.vida/project.yaml` — ціль. Профілів методології немає | Stage 4 + рішення D7 |
| D-07 | Матеріалізація §6 | `LifecycleArtifactReference/v1` (kind, artifact_schema, record_id, path, sha256, source_revision, scope_id, ac_ids, generation, `implementation_fingerprint`, delivery_cycle_id, principal, decision, disposition) і `WorkArtifactReference` уже існують. У `artifact_contracts` чинного конфігу: `WorkItem/v1`, `ResearchResult/v1`, `ResearchSynthesis/v1`, `DecisionRecord/v1`. `AcceptanceManifest/v1`, `ImplementationScope/v1`, `WorkState/v1` існують як схеми й кодифіковані контракти в коді, але **не** як записи `artifact_contracts` | Stage 6: перевикористати наявні контракти, додати лише прогалини |
| D-08 | Findings: реєстр дефектів (§8.3, §8.4) | `findings` — поле `ResearchResult/v1`, `ResearchSynthesis/v1`, `final-assurance-review/state`; окремого defect-registry з життєвим циклом і dedup немає | Stage 6 |
| D-09 | Runtime: HostState/CAS/lease (§8.1, §10) | Реалізовано; окрема storage-admission БД лишається GAP проти цільової `workspace.v1.sqlite`; чинні v1-контракти дійсні | Stage 7a / 7b |
| D-10 | Decision Provider «Jeff/Jev» (§4.8) | У коді відсутній | Рішення D5 |
| D-11 | Wiki/work layout, ID, relations (§9) | У конфігу є `wiki_root`, `wiki_output_root`, `task_prefix`; продуктових Wiki-сторінок немає | Stage 6 |
| D-12 | Standalone + marketplace (§1, §3) | Публічна доставка агента — native executable; npm = лише SDK; marketplace відсутній | Stage 5/8 + D4; Stage 9 |
| D-13 | Розташування продукту | `packages/plugin` = «Vida Codex» — Codex-прослойка між хостом Codex і агентом (`README.md:14`; `openai-execution-backends.md:34-36`); `packages/powers` — третій продукт, ще не зареєстрований; у конфігу лише `agent` і `plugin` | D1 вирішено: `packages/powers`; реєстрація — Stage 0 |
| D-14 | `changelog_ref` у research | Файлу немає | Stage 0 (D6) |
| D-15 | Актуальність research | Snapshot `bb4345e` — предок HEAD; відстань вимірюється командою `git rev-list --count bb4345e..HEAD` (стан змінюється щодня) | Оновлення research за §7.1 після Stage 1 |

---

## 3. Рішення (owner)

| ID | Рішення | Варіанти | Рекомендація | Блокує |
|---|---|---|---|---|
| D1 | Розташування продукту | (a) VP = `packages/plugin`; (b) `packages/powers` як третій продукт; (c) окремий репозиторій/пакет | **ВИРІШЕНО 2026-10-19**: (b) — VP живе в `packages/powers` як третій продукт; `packages/plugin` лишається Codex-прослойкою. Decision: `docs/decisions/D1-product-placement.md` | вирішено |
| D2 | Власник і реєстрація | окрема роль «Vida Powers owner»; реєстрація продукту | **ВИРІШЕНО 2026-10-19**: монорепозиторій продуктів — кожен плагін має власного owner'а, документацію, набір задач і простір роботи; Work Items VP — у продукті, координація — у `.agent/`. Decision: `docs/decisions/D2-ownership-and-work-space.md` | вирішено |
| D3 | Формат інструкції та каталогу | (a) розширити `InstructionRegistry/v1`; (b) `VPCatalog/v1` + проекція; (c) окрема VP-активація; (d) два режими | **ВИРІШЕНО 2026-10-19**: (d) — VP самостійний: власний каталог `VPCatalog/v1` і власні скрипти `catalog.*`, плагін зі скілом запуску і хуком; у режимі збирання в пакет агента пакет мусить мати свій розширений instruction registry (runtime work item). `research_decision.registry` не змінюється. Decision: `docs/decisions/D3-instruction-catalog-and-registry.md` | вирішено |
| D4 | Канал доставки | Codex plugin marketplace / власний пакет / обидва | Обидва: мінімальний локальний/git-пакунок (блокує Stage 8) + marketplace як окреме рішення Stage 9 | 5, 8 |
| D5 | Decision Provider | конкретний провайдер / provider-нейтральний інтерфейс | Provider-нейтральний `decision.evaluate` + обов'язковий Agent Fallback; «Jeff» не існує в коді | 2, 4, 5 |
| D6 | Журнал змін research | створити `*.changelog.md` / прибрати посилання | Вирішено форматом: bundle-журнал `packages/powers/docs/log.md` (OKF §9), на який вказує `vida.changelog_ref`; окремий `*.changelog.md` не потрібен | 0 |
| D7 | Цільовий споживацький layout | чинний v1-конфіг / `.vida` cutover | Цілитися в чинний v1-конфіг; `.vida` — залежність від окремого runtime-треку (cutover не виконано) | 4, 7 |
| D8 | Де живе схема методологічного профілю | (a) розділ у `agent-runtime.config.v1.yaml`; (b) VP-owned схема/файл | **(b)**: `agent-runtime-config.v1.schema.json` і валідатор у `runtime-config.ts` належать runtime-власнику, тож додавання розділу = runtime work item. VP-owned схема `Type/vN` не торкається runtime; інтеграція з runtime — лише через наявні `context_skill_refs`/конфіг. **(a)** — лише за окремим погодженим runtime work item | 4 |

---

## 4. Етапи

Правила етапу: один Role, перелік файлів, інтерфейси, AC із командою й
артефактом, доказ, залежності, оцінка. Кожен етап додатково зобов'язаний
підготувати **власний task-level план** (bite-sized кроки, точні файли, точні
тести) за `writing-plans` перед виконанням; цей документ визначає порядок і
ворота, task-план визначає кроки.

Спільна частина AC: артефакт існує за вказаним шляхом; команда завершується
кодом 0; доказ записано у work item. Для коду VP: exact coverage 100% і CRAP у
межах базової лінії, за аналогією з `packages/agent` (`test:coverage` +
`coverage:gate` + `crap`), підтверджені в task-плані етапу.

### Stage 0 — Рішення, реєстрація, гігієна
**Role:** product owner + Root (shared-файли). **Оцінка:** S. **Work item:** VP-0.

Роботи:
- Decision-записи (окремий артефакт, research §7.2) за D1, D2, D3, D4, D5, D6, D7, D8;
  зберігаються в `packages/powers/docs/decisions/` як OKF-концепції типу `Decision`.
  D1 — **зафіксовано** (`docs/decisions/D1-product-placement.md`). D3, D4 і D8 — до
  Stage 1, бо Stage 1 фіксує S-контракти, а Stage 4 потребує визначеного місця
  схеми профілю.
- Реєстрація продукту (перелік із D1-рішення, власник — repository owner):
  1) `AGENT.sidecar.md` — «exactly two products», «two product roots»,
     «Repository projects are …» + рядок у ownership map; 2)
     `packages/agent/docs/system-specification.md` — «approved target keeps product
     Source in packages/agent and packages/plugin» і рядок проєктів; 3)
     `agent-runtime.config.v1.yaml` — `projects` із 11 обов'язковими полями схеми,
     `repository.code_selectors`, `delivery_group`; 4) `packages/agent/knip.config.ts` —
     workspace-блок `packages/powers`; 5)
     `docs/agent-instructions/documentation-policy.v1.json` — `packages/powers/docs` у
     `canonical_roots`; 6) `docs/products.map.md` — рядок VP; 7) `README.md` — рядок
     «Vida Powers» у таблиці продуктів; 8) root `package.json` — `workspaces` +=
     `packages/powers`, плюс `packages/powers/package.json` і `.bun-version`.
- `packages/plugin` лишається Codex-прослойкою і не входить у реєстрацію VP; його
  canonical documents заповнює Plugin owner.
- Product-space VP за D2: `ledger_root: packages/powers/docs/work` (Work Items і
  докази — версіоновані OKF-концепції в продукті), координація — у `.agent/`;
  `task_prefix` VP відмінний від `TASK`, щоб не було колізій ідентифікаторів.
- Product KEY (для `<KEY>-W<NNNN>` / `<KEY>-<N>`) і правило алокації ID.
- Changelog research-документа: bundle-журнал `packages/powers/docs/log.md`
  (OKF §9) ведеться при кожній зміні концепції; посилання `vida.changelog_ref`
  веде саме туди.

AC:
- `bun --cwd packages/agent run test:config:pinned` → exit 0 (config валідний).
- `bun tooling/agent/check-documentation.ts <усі змінені .md>` → `failures: []`.
- `bun --cwd packages/agent run test:pinned` → exit 0 (doc-policy тест проходить
  після розширення `canonical_roots`).
- `bun packages/powers/tooling/check-okf.ts` → exit 0 (bundle відповідає OKF v0.2).
- Кожне з D1–D8 має Decision-запис із owner, датою, варіантами та причиною.
- `git ls-files packages/powers` показує зареєстровані файли; `packages/powers/docs`
  присутня в `canonical_roots`.

Доказ: decision-записи, вивід трьох команд, diff реєстрації.

Залежності: ні.

---

### Stage 1 — Канонічні документи продукту (B → S)
**Role:** product owner. **Оцінка:** M. **Work item:** VP-1. **Потребує:** Stage 0.

Роботи:
- `business-requirements.md`: цілі, межі Standalone/Runtime, обмеження
  автономності, зони (§2), вимоги до матеріалізації й доказу.
- `system-specification.md`: спостережувана поведінка — контракт Router, операції
  `catalog.*`, модель інструкції та каталогу, методологічний профіль, `artifact_contract`,
  Join/Lifecycle Scope, Scope-First, Findings-реєстр, layout/ID/relations, режими.
- `acceptance.md`: AC зі стабільними ID, прив'язані до SR-пунктів.
- Матриця простеження research § → SR § → AC id. Нормативний текст без SR-прив'язки
  або переноситься, або позначається «контекст, не норма».
- Research-документ оновлюється **на місці** (§7.1): у ньому лише актуальний
  фіналізований зміст, історія — у окремому changelog-артефакті; принципово нові
  теми — окремі research-документи. Оновлення джерела запускає оцінку впливу на
  пов'язані рішення, вимоги, задачі й перевірки (§7.6); актуальність записується
  явно, а не виводиться з наявності файлу.

Розділення на стабільне й відкладене: інваріанти, що не залежать від D3/D4/D5
(межі, Scope-First, матеріалізація, доказова дисципліна), фіксуються зараз;
розділи про формат каталогу, канал доставки та decision provider — після Stage 0.

AC:
- Кожен нормативний абзац research має SR-пункт або позначку «контекст».
- Кожен AC має ID і прив'язку до SR; жоден AC не закривається «наявністю коду».
- Матриця простеження перевірена на повноту (рядки research § 1–14).
- Research-документ не містить хронології, нотаток попередніх версій і
  формулювань «раніше було …»; зміни зафіксовано в changelog-артефакті з датою,
  виконавцем і причиною; нові теми мають окремі документи, а не копії.
- Життєвий цикл Work Item (§7.3) зафіксовано в S-документі з окремими AC:
  чернетка уточнюється на місці; після прийняття scope заморожується, зміни
  вимагають контрольованого перегляду; завершена задача не переписується під
  новий запит — створюється новий Work Item із зв'язком (`changes`, `extends`,
  `follows-up`, `fixes`) зі своїми AC та evidence.
- `bun tooling/agent/check-documentation.ts packages/powers/docs/*.md` → `failures: []`.
- Створені S-документи входять до bundle за OKF v0.2 (frontmatter, `sources`,
  `generated`, `verified`, `status`, `stale_after`); `bun packages/powers/tooling/check-okf.ts`
  → exit 0.

Доказ: три документи, матриця, doc-check, незалежний review документа.

Залежності: Stage 0 (зокрема D3/D4/D5).

---

### Stage 2 — Формат інструкції, каталог, власні скрипти `catalog.*`
**Role:** product owner + implementer. **Оцінка:** L. **Work item:** VP-2. **Потребує:** Stage 1 (D3).

Роботи (за D3: VP самостійний — власний каталог і власні скрипти):
- `VPCatalog/v1`: канонічний корпус у продукті (`packages/powers/corpus/`), без
  ліміту на кількість записів. Поля інструкції: `instruction_id`,
  `capability_tags[]`, `pattern_tags[]`, `conditions`, `artifact_contract`,
  `compatibility` (групи/виключення/залежності), `provenance` (донор, ліцензія,
  ревізія джерела), `revision`, `status`, `content`.
- Правила тегів: kebab-case; кожен тег має ≥2 змістовні компоненти; `TDD` — аліас
  `test-first-development`; тег ≠ агент/skill/крок/дозвіл.
- **Власні скрипти VP** `catalog.tags` / `catalog.search` / `catalog.get` /
  `catalog.compose`: детерміновані, реалізовані в коді VP, працюють без Runtime.
  Контракт результату, межі, поведінка при відсутності, обов'язковість залежностей.
- **Специфікація розширеного instruction registry пакета агента** (для bundled-режиму):
  власна схема й власна секція конфігурації, з розширеним набором полів VP;
  `research_decision.registry` не змінюється.
- Знімок застосованих інструкцій у межах активної задачі (research §4.5).
- Risk-adaptive оновлення (research §4.6): класи зміни → перевірка/прийняття.
- OKF-поля для довідкових записів: `index.md`, `sources`, `stale_after`, історія
  (research §4.9).

Runtime-запит (власник — agent maintainer): додати в пакет агента розширений
instruction registry (схема + секція конфігурації + читання наявним resolver'ом);
активація, дайджести, `privacy`, `max_bytes` і перевірка `output_schema` — ті самі,
що вже є в runtime; **другий activation engine не створюється**. VP не редагує
`packages/agent` сам.
Межа реєстру: VP-записи **не** потрапляють у `research_decision.registry.instructions.N`
(жорсткий шаблон `source_path`), а йдуть у власну секцію реєстра пакета агента.
Секція реєстра живе в root-конфізі (Root-owned), тому запис у неї — узгодження
з Root; паралельний запис у root-конфіг заборонений.

AC:
- Схема валідує інструкцію; невалідна — зрозуміла помилка з полями.
- `catalog.search` повертає лише ID/назву/короткий опис; повний текст — тільки
  через `catalog.get`/`compose`.
- `catalog.compose` включає обов'язкові інструкції та залежності незалежно від
  relevance-score; конфліктні групи виявляються помилкою сумісності.
- Каталог не має ліміту на кількість записів; обмеження реєстру research-контуру
  на VP не поширюється.
- Скрипти `catalog.*` працюють **без VIDA Runtime**: каталог і операції дають
  результат у процесі без пакета агента.
- Специфікація розширеного реєстра пакета агента прийнята runtime-власником до
  закриття Stage 2; запис у секцію реєстра валідується валідатором конфігу;
  `bun --cwd packages/agent run test:config:pinned` → exit 0.
- Точний набір команд і тестів — у task-плані етапу; код VP має exact coverage 100%
  і CRAP у базовій лінії.

Доказ: schema-тести, юніт-тести операцій, тест проекції, звіт покриття.

Залежності: Stage 1.

---

### Stage 3 — Конвертація донорів у корпус
**Role:** окремі donor-лейни + Root-інтегратор. **Оцінка:** L (найбільша). **Work item:** VP-3. **Потребує:** Stage 2.

Межі обсягу (обов'язкові до старту):
- **MVP-корпус:** superpowers + ponytail повністю, далі matt-skills, addy-skills,
  BMAD, pstack, GSD — по черзі з exit criteria. Ціль MVP: зафіксована кількість
  інструкцій (затверджується в task-плані) + повне покриття capability-тегів
  життєвого циклу (research §5).
- **Exit criteria на донора:** інвентар → атомарні інструкції → теги → dedup →
  конфлікти → `artifact_contract` → provenance; підписаний звіт покриття.
- **Exclusion-list:** донорські execution engines, tracker integrations, журнали
  стану, монолітні промпти не переносяться (research §4.1).
- **Конвертер** — підтримуваний тестований TS-інструмент під Bun, а не разова
  процедура; має власні тести.
- **License/NOTICE manifest** для кожного донора (MIT × 7, Apache-2.0 для OKF з
  обов'язковим NOTICE-текстом).
- **Шарди:** кожен донор пише власний output-шард; інтегратор — Root; digest
  корпусу рахується після інтеграції, не під час паралельної роботи.

AC:
- Для кожного обробленого донора: інвентар із 100% файлів-носіїв (tracked) і
  звіт покриття.
- Кожна інструкція: `capability_tags` і `pattern_tags` заповнені там, де це
  семантично застосовно; винятки — з обґрунтуванням у реєстрі; кожен тег —
  kebab-case і має ≥2 змістовні компоненти.
- Кожна інструкція має `provenance` (донор + ліцензія + ревізія з `donors.yaml`),
  `revision`, `status`.
- Невирішені конфлікти — у реєстрі конфліктів, не заховані в тексті.
- Рішення про кожен dedup-збіг зафіксоване (канонічний ID + зв'язок).
- Інструкції, що виробляють результат, мають `artifact_contract`.
- Конвертер має тести; `bun --cwd packages/powers run test:coverage` — exit 0.
- License/NOTICE manifest присутній для кожного донора.

Доказ: інвентарі, звіти покриття, digest корпусу, тести конвертера, семплинг
людської перевірки (щонайменше 10% інструкцій, не менше 30 одиниць — розмір
затверджується в task-плані етапу).

Залежності: Stage 2.

---

### Stage 4 — Методологічна політика продукту
**Role:** product owner + implementer. **Оцінка:** M. **Work item:** VP-4. **Потребує:** Stage 2, 3; D8.

Роботи:
- Поверхня конфігурації: схема методологічного профілю — VP-owned `Type/vN`
  (D8-варіант b), з одним owner-ом. D8-варіант (a) (розділ у
  `agent-runtime.config.v1.yaml`) можливий лише за окремим runtime work item;
  D7 визначає цільовий layout споживача, а не місце схеми профілю.
- `Effective Methodology Profile`: групи (testing-sequence, review-strategy,
  architecture, delivery), явне вибіркове успадкування між продуктами, локальне
  перевизначення, конфлікт → питання власнику.
- Task-scoped override: запитується один раз, фіксується, передається дочірнім
  агентам, не змінює постійний профіль, permissions і security gates.
- Live Inheritance: посилання на стабільні ID без version pinning; зміна поведінки
  = новий pattern ID.
- Light/Medium/Full і рольова композиція (research §5): глибина, обов'язковість
  (`required`/`conditional`/`optional`) і застосовність — окремі властивості.

Runtime-запит (власник — runtime-власник): якщо D8 = (a), розширення
`agent-runtime-config.v1.schema.json` і валідатора `runtime-config.ts` під
методологічний розділ. VP не редагує `packages/agent` сам; за D8 = (b) запиту не
потрібно.

AC:
- Профіль визначається детерміновано для (продукт × задача) — тестова матриця.
- Конфлікт успадкування зупиняє вибір і формулює питання; «останній завантажений
  перемагає» не застосовується.
- Override задокументований, передається дочірнім агентам і не протікає в сусідні
  продукти.
- Семантика інструкції не змінюється під тим самим ID; зміна → новий pattern ID.
- Light/Medium/Full не пропускають обов'язкові AC, матеріалізацію й mandatory gates.

Доказ: тести матриці резолюції, schema-тести конфігурації, приклад конфлікту.

Залежності: Stage 2, 3.

---

### Stage 5 — Router Skill, `vp-setup`, пакунок
**Role:** implementer (+ runtime-власник для host-hook кваліфікації). **Оцінка:** L. **Work item:** VP-5. **Потребує:** Stage 3, 4, D4.

Роботи:
- Router Skill: запит звичайною мовою → вибір інструкцій → bundle (роль, task
  contract, ефективна методологія, scope, вимоги матеріалізації, посилання на
  артефакти) → делегування або виконання; fallback на головного агента.
- `workflow.options` і `decision.evaluate` (§4.8) як provider-нейтральні операції;
  поріг relevance — калібрований параметр, не універсальна константа.
- `vp-setup`: виявлення проєктів; ідемпотентне додавання керованого блоку
  **у project-owned поверхню споживача** (не в пакет агента); збереження
  сторонніх інструкцій; налаштування доступних host hooks; зіставлення layout;
  перевірка активації.
- Host-hook кваліфікація: перевикористати наявну native `/hooks` поверхню; зміна
  hash потребує native review — trust GAP фіксується, не обходиться.
- Пакунок: формат + локальна/git-інсталяція (без marketplace).

AC:
- Повторний запуск `vp-setup` на незміненому вході → порожній diff (тест).
- `vp-setup` не змінює жодного файлу встановленого пакета агента (тест на
  read-only до встановлених шляхів).
- Активація перевіряється для: початку сесії, відновлення після compaction, контексту
  делегованого агента; точні імена подій — host-адаптер.
- Bootstrap не завантажує весь корпус у сесію.
- Відсутність host-можливості позначається як обмеження, а не як еквівалентна
  перевірка.
- Пакунок встановлюється локально й проходить smoke-перевірку.

Доказ: тести setup (повторний запуск), матриця підтримки хостів, журнал активації,
запис пакування/інсталяції.

Залежності: Stage 3, 4, D4.

---

### Stage 6 — Матеріалізація, Work Items, Findings
**Role:** implementer + runtime-власник (для реєстрів Runtime). **Оцінка:** L. **Work item:** VP-6. **Потребує:** Stage 1, 2, 3.

Роботи:
- Матеріалізація: перевикористати `ResearchResult/v1`, `ResearchSynthesis/v1`,
  `DecisionRecord/v1`, `AcceptanceManifest/v1`, `ImplementationScope/v1`,
  `WorkItem/v1`, `WorkState/v1`, `LifecycleArtifactReference/v1`,
  `WorkArtifactReference`; створити лише відсутні частини (Action/Event Record,
  зв'язки relations) — з власним owner-ом.
- `artifact_contract` в інструкціях: тип виходу, дані й посилання, місце
  матеріалізації, спосіб перевірки; перевірка наявності/формату/digest окремо від
  семантичної перевірки.
- Work layout: стабільні ID, алокатор ID, типізовані relations (`derived-from`,
  `informs`, `implements`, `tests`, `blocks`, `supersedes`, `changes`,
  `found-during`), shallow storage.
- Пошук і навігація (§9.3): первинний пошук за ID, filename, title, body, тип,
  продукт, tags/labels і relations; повнотекстовий індекс — **похідний**,
  відновлюваний, не дублює нормативні документи; чужі нормативні документи поза
  `wiki_root` індексуються за посиланням, а не копіюються.
- Findings: Standalone — append-only JSONL на продукт; Runtime — продуктова
  ізоляція в наявній SQLite/HostState; централізований запис через один writer;
  hybrid dedup (ідентичність → fingerprint → семантичні кандидати → перевірка
  еквівалентності); історія append-only.

AC:
- `passed` неможливий без фактичного запуску перевірки (тест на підроблений PASS).
- Запізнілий результат підзадачі не переписує прийнятий результат батька; має
  окремий запис (тест).
- Blocking-знахідка поза scope фіксується як блокер + запит дозволу; scope не
  розширюється (тест).
- Dedup: підтверджений дублікат зв'язується з канонічним `finding_id` зі збереженням
  нового evidence; неоднозначність не об'єднується; повторна доставка не створює
  повторної події (таблиця випадків).
- Створення findings не є авторизацією виправлення (тест).
- Похідний індекс відновлюється з нормативних джерел і не є їхньою копією; після
  перенесення нормативного документа поза `wiki_root` він індексується за
  посиланням (тест).
- UI-агент, що виконав сценарій у браузері, **не** є людським прийняттям: без
  потрібної відповіді людини результат лишається `awaiting-human-verification`, а не
  PASS (тест на заборону фіктивного PASS).

Доказ: контрактні тести, тести інтеграції Runtime-режиму, тести Standalone, таблиця
dedup-випадків.

Залежності: Stage 1, 2, 3.

---

### Stage 7 — Runtime-інтеграція
**Role:** implementer + runtime-власник. **Оцінка:** L. **Work item:** VP-7. **Потребує:** Stage 5, 6.

**7a — на чинних v1-контрактах.** Configured: інструкції VP підставляються у етапи
конфігу; зовнішні етапи не додаються, gates не обходяться. Dynamic: адаптація в
межах затвердженої мети й scope; VP не компілює власний граф. Selective Join:
`blocking`/`non-blocking`; non-blocking не робить підзадачу незалежною. Scope-First:
порушення → блокер, не тихе розширення.

**7b — цільове сховище** (після закриття storage-admission GAP на стороні
runtime-власника): перенесення findings/work-операцій у `workspace.v1.sqlite`
без другої БД.

**Lifecycle Scope (AC-блок для 7a):** три області `parent` / `workflow` /
`independent`; для кожної — власник, ідентичність, місце результату, спостережуваний
стан, механізм завершення/скасування. Підтвердження старту ≠ підтвердження
завершення; запит скасування ≠ доказ зупинки. Standalone явно не має durable
execution.

AC:
- VP-інструкції застосовуються в обох режимах (тест із зафіксованим bundle).
- У Runtime не з'являється другий scheduler/ledger/БД: перевірка — інвентаризація
  процесів/файлів до і після інтеграції.
- `non-blocking` підзадача не блокує батьківський етап і не переписує його
  результат.
- Runtime-режим не залежить від закриття storage GAP (7a); 7b має власний gate.
- Lifecycle Scope: для кожної з трьох областей є зафіксований власник і
  спостережуваний стан; тест на «start ≠ completion» і «cancel request ≠ stopped».

Доказ: інтеграційні тести Runtime, фікстура configured-flow, докази роботи в
Runtime-режимі, інвентаризація відсутності другого стану.

Залежності: Stage 5, 6; 7b — зовнішня залежність від runtime-треку.

---

### Stage 8 — Standalone-режим, переносимість, інсталяція
**Role:** implementer. **Оцінка:** M. **Work item:** VP-8. **Потребує:** Stage 5, 6, D4.

Роботи:
- Спільна детермінована бібліотека/скрипти каталогу для Standalone і Runtime (Bun/TS);
  дублювання правил пошуку заборонено.
- Прозора атрибуція останнього запису без lease/локів; конфлікти розводяться
  практичними засобами хоста; прихований перезапис заборонений.
- Portability contract: обмеження кожного хоста (сесійні події, compaction,
  subagents, локальні записи) і матриця підтримки.
- Перевірка на реальних хостах: install + run мінімального сценарію.

AC:
- Install + run без VIDA Runtime щонайменше на двох сумісних хостах; `catalog.*` і
  матеріалізація працюють.
- Жодне твердження про підтримку не залишається недоведеним: матриця містить
  спостереження з датою і хостом.
- У Standalone немає durable execution-інфраструктури: перевірка — відсутність
  файлів стану/БД, крім явних локальних записів.
- Межі автономності (§12): агент не розширює scope без дозволу, не змінює
  методологію продукту самостійно, не скасовує mandatory gates; реальні failures,
  обмеження й незавершені GAPs фіксуються, псевдодокументи не створюються.
- Відновлення після compaction відновлює pointers і стан, а не повторює вже
  завершені змістовні дії.

Доказ: матриця хостів із записами спостережень, журнал сесій, запис інсталяції.

Залежності: Stage 5, 6, D4.

---

### Stage 9 — поза scope (окремим рішенням)
Дистрибуція через marketplace (§1), domain packs (§11), майбутній UI поверх VIDA API
(§9.3), зовнішня синхронізація issue-трекерів (§8.3). Кожен — з власним рішенням
про обсяг.

---

## 5. Залежності та оцінки

```text
Stage 0 ──► Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► Stage 5
   S          M          L          L          M          L
                        │          │          │          │
                        └──► Stage 6 ◄─────────┘          │
                             (1,2,3)  ▲                 │
                                   └───┴── Stage 7a (5,6) ──► Stage 7b
                                        │
                                        └──► Stage 8 (5,6)

Stage 7b — після закриття storage GAP поза VP.
```

| Stage | Залежності | Оцінка | Зовнішні залежності |
|---|---|---|---|
| 0 | — | S | рішення власника D1–D8 |
| 1 | 0 | M | — |
| 2 | 1 | L | D3; можливий runtime-запит |
| 3 | 2 | L | — |
| 4 | 2, 3 | M | D8; D7 (layout споживача) |
| 5 | 3, 4 | L | D4; host-hook кваліфікація |
| 6 | 1, 2, 3 | L | runtime-власник для Runtime-реєстрів |
| 7a | 5, 6 | L | — |
| 7b | 7a | M | storage-admission GAP (runtime-трек) |
| 8 | 5, 6 | M | D4; реальні хости |

Критичний шлях: 0 → 1 → 2 → 3 → 4 → 5 → 7a → 7b (найдовший ланцюг; Stage 6
залежить від 1, 2, 3, тож не входить у ланцюг до 7a). Найвужче місце — Stage 2
(від нього залежать corpus, методологія, Router). Найдовша робота — Stage 3
(7 донорів); паралелізація — за донорами з шардами й одним інтегратором (Root).

---

## 6. Ворота якості

Команди з `packages/agent/TESTING.md` (виконуються з `packages/agent`):

| Перевірка | Команда |
|---|---|
| Конфігурація | `bun bin/bun.ts run test:config:pinned` |
| Звичайна фаза агента | `bun bin/bun.ts run test:pinned` |
| HostState і lifecycle | `bun bin/bun.ts run test:host-state:pinned` |
| Coverage і CRAP | `bun bin/bun.ts run test:coverage:pinned` |
| Збережений coverage-звіт | `bun bin/bun.ts run coverage:gate:pinned` |
| Збережений CRAP-звіт | `bun bin/bun.ts run crap:pinned` |
| Статична якість | `bun bin/bun.ts run quality:static:pinned` |
| Формат | `bun bin/bun.ts run format:check:pinned` |
| Локальна матриця | `bun bin/bun.ts run local:candidate:pinned` |
| Портативний підмножина | `bun bin/bun.ts run verify:portable:pinned` |
| Документація (repo) | `bun tooling/agent/check-documentation.ts <paths>` |

Для VP-продукту Stage 2 створює власний harness з паралельними скриптами
(`bun --cwd packages/powers run test|typecheck|format:check|test:coverage|crap`).
До Stage 2 VP не має коду, тому його ворота не застосовуються — документи
перевіряються doc-check-ом, а конфіг — `test:config:pinned`.

Правила: mutation-гейт (`test:mutation:pinned`) запускається лише з окремою
ручною авторизацією; поточна coverage-кампанія репозиторію не зупиняється;
VP-лейки не торкаються frozen-вимірювань; `local:candidate`/`ci` не запускаються
поза delivery-ланом.

---

## 7. Ризики

| Ризик | Наслідок | Запобіжник |
|---|---|---|
| `VPCatalog/v1` + проекція сприймають як «другий реєстр» | Два activation-шляди | Проекція ≤64 у наявний реєстр; mapping-тест; runtime-запит замість локального роздвоєння |
| `vp-setup` піде в пакет агента | Псування шаблону, зараження споживачів | AC на read-only до встановлених шляхів; managed-блок у project-owned поверхні |
| VP-дизайн спирається на `.vida`, якого немає | Етапи 4/7 не виконуються | Ціль — чинний v1-конфіг; `.vida` — окремий cutover-трек (D7) |
| Scope розширюється на сусідні продукти | Непомітна підміна методології | Явне успадкування; конфлікт → питання; AC у Stage 4 |
| Runtime-режим блокований storage GAP | Інтеграція не доводиться | 7a не залежить від GAP; 7b — окремий gate |
| Обсяг Stage 3 не завершується | Корпус не готовий | MVP-корпус, exit criteria на донора, метрика покриття |
| Decision Provider не існує | Невизначена реалізація | Provider-нейтральний інтерфейс + обов'язковий fallback (D5) |
| Незареєстрований продукт | Робота поза картою проєкту | Stage 0 (D1, D2) + повна реєстрація полів |
| Hook trust GAP на новому хості | `vp-setup` не активується | Trust GAP фіксується, не обходиться; host-матриця показує обмеження |

---

## 8. Межі плану

- План не змінює runtime-контракти й схеми сам. Будь-яка потреби `packages/agent`
  оформлюється окремим runtime-owned work item із власним owner-ом.
- План не створює другий scheduler, DAG-компілятор, ledger або сховище стану.
- План не визначає «Jeff» і не прив'язує VP до vendor API.
- План не запускає конвертацію корпусу і не стверджує, що вона виконана.
- Research-документ залишається єдиним B-джерелом; S-контракти з'являються у
  Stage 1 і зберігають research як джерело.
- Кожен етап до виконання має власний task-level plan (bite-sized кроки, точні
  файли, точні тести) — цей roadmap визначає порядок і ворота, не кроки.
