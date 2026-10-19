# Vida Powers

**Портативний агентний плагін із канонічним instruction corpus, єдиним скілом
оркестрації та матеріалізацією результатів.**

Живе в `packages/powers/` — третій продукт цього репозиторію поруч із
`packages/agent` (Vida Agent, runtime) і `packages/plugin` (Vida Codex,
прослойка між хостом Codex і агентом).

| Документ | Про що |
|---|---|
| [Research — продуктова концепція](docs/research/vida-powers-product-research.md) | B-рівень: навіщо продукт, які межі, які правила поведінки |
| [План впровадження](docs/implementation-plan.md) | Roadmap етапів 0–9, ворота, ризики |
| [Наступні дії](docs/next-actions.md) | Поточний обсяг у межах каталогу: A0 → A → B → C → D → E → F → G |
| [Рішення D1–D9](docs/decisions/index.md) | Ухвалені рішення з підставами та наслідками |
| [AGENTS.md](AGENTS.md) | Інструкції для агентів, які розробляють VP |
| [Маніфест донорів](donors.yaml) | Точні ревізії 8 донорських репозиторіїв, ліцензії, лічильники файлів |

---

## 1. Яку проблему розв'язує

Агент у сумісному AI-хості має знати **як саме** працювати: який методології
дотримуватись, які критерії прийняття застосувати, що вважати доказом, який
артефакт залишити по роботі. Без цього кожен агент вигадує власний процес, а
результат стає непорівнянним і неперевірюваним.

VP дає:

- **канонічний корпус атомарних інструкцій** — перетворені з перевірених джерел
  методики, кожна з умовами застосування, семантичним контрактом, тегами,
  provenance і правилами сумісності;
- **один вхід** — скіл `vp-mode` (оркестрація): користувач описує бажаний
  результат звичайною мовою, далі VP сам вибирає потрібні інструкції, формує
  bundle і запускає виконання або делегування;
- **продуктову політику методології** — групи вибору (тестування, review,
  архітектура, delivery), явне успадкування між продуктами, тимчасові винятки;
- **матеріалізацію** — читабельний і перевірюваний результат замість звіту в
  чаті, з окремими Work Items, критеріями прийняття та доказами;
- **порядок і межі** — scope-first, явні блокери замість тихих розширень, чесні
  GAP-записи.

## 2. Архітектура

```text
        джерела (superpowers, BMAD, matt-skills, addy-skills, pstack, GSD, ponytail, OKF)
                              │
                     конвертація (scripts/convert.ts)
                              ▼
   канонічний корпус  packages/powers/instructions/   VPCatalog/v1 (instruction .md + frontmatter)
   (інструкції + capability_tags / pattern_tags + умови + compatibility + provenance)
                              │
              пошук і добір  skills/vp-mode/scripts/catalog.ts   catalog.tags / search / get / compose
                              │                        decision.evaluate (+ Agent Fallback)
                              ▼
   bundle інструкцій  (роль, task contract, ефективна методологія, scope, AC, артефакти)
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
   `vp-mode` — оркестрація          матеріалізація
   (вибір LLM → агенти → рівень      (Work Item, AC, evidence, findings)
    флоу Full/Medium/Light)
              │                                │
              ▼                                ▼
   виконання / делегування          Work Items у packages/powers/docs/work/
```

**Межа з VIDA Runtime.** VP не має власного workflow engine, scheduler'а, ledger'а
або сховища стану. У Runtime виконання належить VIDA Core/Mastra, а VP постачає
інструкції та методологію. У Standalone VP працює самостійно: власний каталог,
власні скрипти, власні скіли, жодної залежності від runtime агента.

## 3. Інструкція та каталог

**Модель інструкції** (`VPCatalog/v1`): `instruction_id`, `capability_tags[]`
(що потрібно зробити), `pattern_tags[]` (за якою методикою), `conditions`
(коли застосовувати), `artifact_contract` (що має бути на виході), `compatibility`
(групи, виключення, залежності), `provenance` (донор, ліцензія, ревізія),
`revision`, `status`, `content`.

**Правила тегів:** kebab-case; кожен тег має щонайменше два змістовні компоненти
(`test-first-development`, а не `tdd`); тег не є агентом, skill'ом, кроком чи
дозволом. Сумісність визначається окремим реєстром: `test-first-development` і
`test-after-development` — взаємовиключні альтернативи в групі `testing-sequence`,
`risk-based-testing` — сумісне доповнення.

**Операції каталогу:**

| Операція | Результат |
|---|---|
| `catalog.tags` | Доступні capability/pattern теги з описами |
| `catalog.search` | Відібрані за тегами, роллю, продуктом і умовами ID, назви та короткі описи — без повних текстів |
| `catalog.get` | Текст точно вказаної інструкції |
| `catalog.compose` | Вибрані тексти, обов'язкові інструкції та залежності після перевірки сумісності |

Обов'язкові інструкції й залежності потрапляють у bundle незалежно від
relevance-score; обмеження реєстру research-контуру на VP не поширюється.

**Походження.** Кожна інструкція має donor + ліцензію + ревізію; ревізії
зафіксовані в `donors.yaml`, копії донорів — у `.tmp/donors` (ігнорується Git).
Ліцензії донорів: MIT × 7, Apache-2.0 (Open Knowledge Format) — див.
`donors.yaml`.

## 4. Вибір і роутінг

**Instruction Selection** обирає множину інструкцій. **Workflow Routing** обирає
LLM для виконання, формує з нього агентів за фіксованим довідником (каталогом)
і встановлює рівень флоу — `Full`, `Medium`, `Light` чи інший визначений
профілем.

**Decision Provider** — provider-нейтральний інтерфейс `decision.evaluate`:
реалізації — master LLM агента (типово) або зовнішній провайдер, якщо його
задає host-конфіг. VP не прив'язується до вендора й не називає провайдера
наперед. **Agent Fallback обов'язковий:** недоступність, timeout, помилка API,
некоректний формат, невідомий candidate ID або недостатня впевненість → вибір
переходить до головного агента, а джерело рішення, обрані ID і причина fallback
матеріалізуються. Поріг relevance калібрується **per operation**; приклад
значення з research не є універсальною константою.

## 5. Методологічна політика

Методологія — **продуктова політика**, а не ситуативний вибір агента. Профіль
(`VPMethodologyProfile/v1`) містить групи вибору, правила явного вибіркового
успадкування між продуктами, локальні перевизначення та task-scoped override
(тимчасовий виняток для конкретної задачі, який не змінює постійний профіль,
permissions чи security gates). Конфлікт успадкування — питання власнику, а не
«останній завантажений перемагає».

**Одна схема, різні носії:** Runtime — розділ у `.vida/project.yaml`; Standalone —
той самий розділ у керованому YAML-блоці проєктного instruction-файлу; хост-прослойка —
у конфіг-файлі проєкту.

## 6. Скіли та ініціалізація

| Скіл | Роль |
|---|---|
| `vp-mode` | **Основний скіл оркестрації.** Єдина робоча точка входу: запит → добір інструкцій → bundle → виконання або делегування |
| `vp-setup` | **Допоміжний скіл налаштування.** Виявляє проєкти, ідемпотентно пише конфігурацію, налаштовує доступні hooks, перевіряє активацію |

`vp-setup` ініціалізує за середовищем:

| Середовище | Куди пише конфігурацію |
|---|---|
| Standalone (без runtime агента) | Керований YAML-блок у проєктному `AGENTS.md` (або `CLAUDE.md`, якщо `AGENTS.md` відсутній) |
| Поставка агента без хост-систем | Конфіг-файл агентного runtime |
| Хост-прослойка (напр. Codex) | Конфіг-файл проєкту, зібраний з шаблонів прослойки |

## 7. Канали доставки

1. **Окремий плагін VP** — per-host manifests (`.codex-plugin/`,
   `.claude-plugin/`, `.cursor-plugin/`, `.muse-plugin/`, …), скіли, хук, власні
   скрипти; встановлення через `vp-setup`.
2. **Збірка в пакет поставки агента** — VP-інструкції їдуть у native-поставку
   разом із розширеним instruction registry; канонічна копія лишається в VP, у
   пакет — згенерований артефакт із Source-зв'язком.
3. **Marketplace** — `packages/powers` сам є marketplace-власником; Codex —
   перевірений перший хост, решта — заявлена підтримка з позначеним обмеженням.

## 8. Матеріалізація, Work Items, findings

Матеріалізація перевикористовує наявні runtime-контракти (`WorkItem/v1`,
`WorkState/v1`, `ResearchResult/v1`, `DecisionRecord/v1`,
`AcceptanceManifest/v1`, `ImplementationScope/v1`, `LifecycleArtifactReference/v1`)
і додає лише відсутні частини. `artifact_contract` у кожній інструкції задає тип
виходу, дані, місце матеріалізації та спосіб перевірки; перевірка
наявності/формату/digest окремо від семантичної.

**Work Items VP** живуть у `packages/powers/docs/work/` як OKF-концепції зі
стабільним ID, AC, evidence і типізованими зв'язками (`derived-from`, `informs`,
`implements`, `tests`, `blocks`, `supersedes`, `changes`, `found-during`).

**Findings** — продуктово-скоуповий реєстр дефектів: Standalone — append-only
JSONL; Runtime — продуктова ізоляція в наявній SQLite/HostState. Запис
централізований (один writer), дедуплікація гібридна: ідентичність →
fingerprint → семантичні кандидати → перевірка еквівалентності. Створення
finding'у **не** є авторизацією виправлення.

## 9. Структура репозиторію

```text
packages/powers/
  AGENTS.md                     інструкції для агентів-розробників
  README.md                     цей файл
  donors.yaml                   маніфест донорів (ревізії, ліцензії, лічильники)
  docs/                         OKF-bundle (index.md, log.md, research/, decisions/, work/, requests/)
  config/                       схеми VP (VPCatalog/v1, VPInstruction/v1, VPEffectiveProfile/v1, VPCorpusMap/v1)
  instructions/                 канонічні інструкції: .md + метадані, плоско
  skills/                       vp-mode, vp-setup (+ їхні scripts/)
  .codex-plugin/ .claude-plugin/ .cursor-plugin/ .agents/plugins/   per-host маніфести
  scripts/                      підтримка продукту: check-okf.ts, check-corpus.ts, convert.ts, validate-donors.ts
  catalog.json                  ідентичність каталогу, словник тегів, аліаси, перелік корпусу з sha256
  corpus-map.json               мапа обробки: донор + файл → converted/split/merged/rejected
  tests/                        тести harness'у
  .tmp/                         scratch: клони донорів (ігнорується Git)
```

## 10. Як працювати з VP

**Знайти інструкцію** — `catalog.search` за capability/pattern тегами; повний
текст — лише через `catalog.get`.

**Додати інструкцію** — новий атомарний норматив у корпусі з тегами, умовами,
`artifact_contract`, provenance (донор + ліцензія + ревізія) і `revision`; потім
оновити звіт покриття.

**Додати донора** — зафіксувати ревізію в `donors.yaml`, клонувати знімок у
`.tmp/donors`, прогнати інвентар → інструкції → теги → dedup → конфлікти →
provenance; зафіксувати рішення про кожен dedup-збіг.

**Зібрати bundle** — `catalog.compose` за тегами, роллю та ефективною
методологією: обов'язкові інструкції та залежності потрапляють у bundle
незалежно від relevance.

**Завести Work Item** — концепція в `docs/work/`: стабільний ID, мета, scope, AC,
зв'язки з іншими Work Items; докази — окремими записами.

**Перевірити продукт** — `bun packages/powers/scripts/check-okf.ts`,
`bun tooling/agent/check-documentation.ts <явний список .md-файлів>` (каталог замість
списку обирає один документ і робить перевірку порожньою), `bun run --cwd
packages/powers test`, `bun run --cwd packages/powers test:coverage`.

## 11. Дорожня карта

| Крок | Зміст | Статус |
|---|---|---|
| A0 | Перевірка ризику для lint-гейту агента | **закрито** — гейт `{"issues":[]}`, exit 0 |
| A | Скелет продукту й harness (Bun-пакет, тести) | **закрито** — 13/13 тестів, typecheck exit 0 |
| B | Канонічні документи продукту (BR/SR/AC + матриця) | **закрито** |
| C | `VPCatalog/v1`, `VPMethodologyProfile/v1`, операції `catalog.*`, `decision.evaluate` | план |
| D | Вертикальний зріз корпусу: superpowers → ponytail → решта | план |
| E | Скіли `vp-mode`/`vp-setup`, per-host маніфести, marketplace | план |
| F | Work Items, findings (Standalone), `artifact_contract` | план |
| G | Runtime-запит (D3 + D8) як документ | план |

Детально — у [docs/next-actions.md](docs/next-actions.md).

## 12. Статус і відкладене

**Готово:** продуктова концепція (research), roadmap, дизайн каталогу, десять записів
рішень (D1–D9 і D4b), OKF-bundle з валідатором, маніфест донорів із 8
зафіксованими знімками (7 методологічних донорів і Open Knowledge Format).

**Відкладене за межами поточного scope:** реєстрація в спільних root-файлах
репозиторію; runtime-запит D3+D8; cutover `.vida/*`; публікація marketplace;
Runtime-режим VP загалом.

**Статус:** `research_status: finalized`; реалізація: кроки A0, A і B закрито —
наступний крок C (каталог і скрипти).

## 13. Ліцензії джерел

Корпус VP походить з семи донорських проєктів (Superpowers, BMAD Method, Matt
Pocock Skills, Addy Osmani Agent Skills, Cursor pstack, GSD Core, Ponytail) і
Open Knowledge Format v0.2. Ліцензії: MIT × 7, Apache-2.0 (OKF). Точні ревізії
та ліцензійні атрибути — у `donors.yaml`; NOTICE-текст для Apache-2.0 має бути
доданий під час конвертації (крок D).
