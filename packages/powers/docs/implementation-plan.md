# Vida Powers — план впровадження

Owner: продуктовий власник Vida Powers. Class: **derived execution plan** —
виконуваний порядок, не нормативна специфікація. Джерела істини: research-документ
`docs/research/vida-powers-product-research.md` (B-рівень), майбутні
`business-requirements.md` / `system-specification.md` / `acceptance.md` продукту
(S-рівень) та реалізація з доказами (C-рівень).

Статус: план запропонований, ще не затверджений власником. Цей документ не є
дозволом на зміни в `packages/agent`, на runtime-контракти чи на зовнішні
репозиторії. Дата: 2026-10-19. Гілка: `powers`.

---

## 1. Мета та рамка

**Мета:** перетворити фіналізовану концепцію VP на реалізований, кваліфікований
продукт із канонічним instruction corpus, єдиною точкою входу (Router),
матеріалізацією результатів і роботою у двох режимах (Standalone / Runtime).

**Рамка плану:** етапи 0–8 нижче. Етап 9 (дистрибуція, domain packs) — за
декларацією research-документа поза поточним scope.

**Принципи, що залишаються недоторканими** (з research §2, §4, §12 та з
`AGENT.sidecar.md`):

- VP не має власного workflow engine, scheduler, ledger чи state store. У Runtime
  виконання належить VIDA Core/Mastra, у Standalone — головному LLM-агенту хоста.
- Жодного дублювання наявних runtime-контрактів. Перевикористовуємо
  `InstructionRegistry/v1`, `ResearchResult/v1`, `DecisionRecord/v1`,
  `AcceptanceManifest/v1`, `WorkItem/v1`, `WorkState/v1`, `HostState`.
- Runtime залишається єдиним власником транзакційного стану, CAS, lease і
  reservation. Standalone не вводить системи захоплення прав.
- Жоден `passed` без фактичного виконання перевірки; доказ прив'язаний до
  конкретної редакції входу.
- Один writer на файл; Root володіє Git, спільними файлами та фінальними
  перевірками.

---

## 2. Вхідні джерела

| Шар | Джерело | Роль у плані |
|---|---|---|
| B | `docs/research/vida-powers-product-research.md` | продуктова концепція, вимоги до поведінки |
| B/C | `donors.yaml` | зафіксовані знімки 8 донорів (7 методологічних + OKF) |
| S | `packages/agent/docs/system-specification.md` | канонічна поведінка Runtime |
| S | `packages/agent/instructions/development-lifecycle.md` | політика Source-авторизації, CAS, evidence |
| S | `packages/agent/TESTING.md` | ворота перевірок |
| S | `AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, `docs/products.map.md` | ownership, реєстрація продуктів, карта джерел |

---

## 3. Звірка концепції з поточним Source

| # | Твердження research | Фактичний стан у репозиторії | Дельта | Дія |
|---|---|---|---|---|
| D-01 | Канонічний каталог атомарних інструкцій із `capability_tags`/`pattern_tags` (§4.2) | `InstructionRegistry/v1` існує: `instruction_id`, `owner`, `revision`, `source_sha256`, `activation_class` (`always_on`/`lane_entry`/`triggered_domain`/`closure_reflection`), `triggers`, `phases`, `lanes`, `output_schema`, `max_bytes`, `privacy`, `content`; активується в `src/research-decision.ts` | Реєстр є, але **без вимірів тегів і сумісності**; VP їх додає | Розширити реєстр (новий optional-блок) або ввести `VPInstruction/v1` — рішення D3 |
| D-02 | Каталог donor-методик (§4.1) | Донорів у репозиторії немає; 7 знімків зафіксовано в `donors.yaml`, локальні копії в `.tmp/donors` | Немає жодного контента | Етап 3: конвертація |
| D-03 | Один вхід: Router Skill + `vp-setup` (§1, §3) | Хост-скіли вже підтримуються: `configured-context.ts:63` приймає `.codex/skills/<name>/SKILL.md`; `runtime-config.ts:1330` валідує skill refs | Формат хоста є, Router-логіки й corpus-резолвера немає | Етап 5 |
| D-04 | `vp-setup` керує `AGENTS.md` (§3) | Кореневий `AGENTS.md` **генерується** з `packages/agent/templates/AGENTS.template.md`; sidecar вимагає змінювати template, а не файл | Прямий запис у `AGENTS.md` створить розбіжність із генератором | Setup пише лише власний блок у template/sidecar-суб'єкт; генерація — єдиний writer |
| D-05 | Bootstrap і session/compaction hooks (§3) | Hooks-поверхні в `packages/agent/src` немає (пошук `hook|session_start|compaction` — лише внутрішні tool hooks Mastra) | Фіча зелена | Етап 5 з host-адаптером, без нової runtime-поверхні |
| D-06 | Методологія як політика продукту, профілі, успадкування (§4.3, §4.4) | Споживацька конфігурація: `.vida/project.yaml` (`VidaProjectConfig/v1`), `.vida/agents.yaml`, `.vida/flows.yaml` (system-spec §132–190) | Немає поверхні для методологічних профілів і успадкування | Етап 4 |
| D-07 | Матеріалізація: `Research → Decision → Requirement → Work Item → Test Case → Evidence` (§6) | Контракти наявні в `agent-runtime.config.v1.yaml#artifact_contracts` і `packages/agent/schemas/*.json` (31 схема) | `ArtifactReference` і `Action/Event Record` не мають власних контрактів; `WorkItem/v1`/`WorkState/v1` є | Етап 6: перевикористати наявні, додати лише прогалини |
| D-08 | Findings: product-scoped реєстр, єдиний writer, hybrid dedup (§8.3, §8.4) | `findings` існує лише як поле `ResearchResult/v1` та в `src/research-decision.ts`; окремого реєстру дефектів немає | Потрібен новий реєстр (Standalone JSONL / Runtime — ізоляція в наявній БД) | Етап 6 |
| D-09 | Runtime: `.vida/work/workspace.v1.sqlite`, HostState, CAS, lease (§2, §8.1, §10) | Реалізовано в `src/host-state.ts`; у system-spec зафіксовано, що окрема storage-admission БД лишається **GAP** проти цільової workspace-БД | VP не має права створювати другу БД; Runtime-режим VP залежить від закриття storage GAP | Етап 7 — залежність від окремого runtime-треку, не від VP |
| D-10 | Decision Provider «Jeff/Jev» (§4.8) | У репозиторії такого компонента немає; згадка лише в research | Поняття не визначене | Рішення D5: або назвати конкретний провайдер, або зафіксувати provider-нейтральний інтерфейс із fallback |
| D-11 | Wiki/work layout, стабільні ID, relations (§9) | Конфіг має `wiki_root`, `wiki_output_root`, `task_prefix`; продуктових Wiki-сторінок немає | Потрібні правила іменування + алокатор ID + типізовані relations | Етап 6 |
| D-12 | Standalone без VIDA Runtime, marketplace-доставка (§1, §3) | Єдина публічна доставка агента — native executable; npm = лише SDK (§ sidecar «Native-only public delivery»); marketplace у репозиторії відсутній | VP = нова поверхня доставки | Рішення D4 (канал) + етап 9 |
| D-13 | Розташування продукту | `packages/powers/` — новий каталог, **не зареєстрований**: у `agent-runtime.config.v1.yaml` лише `agent` і `plugin`; `packages/plugin` — порожній «Codex plugin product workspace» (`package.json` лише) | Collision: VP vs наявний placeholder plugin-продукту | Рішення D1 (owner) — блокує етапи 1–2 |
| D-14 | `changelog_ref` у frontmatter research-документа | `vida-powers-product-research.changelog.md` відсутній | Порушений власний §7.1 | Етап 0/1: створити changelog-артефакт або прибрати посилання |
| D-15 | `validation_scope: conversation-consistency` | Документ не звірявся з кодом; snapshot `bb4345e` — на 186 комітів позаду HEAD | Актуальність не підтверджена | Цей план — перша така звірка; research оновлюється за §7.1 |

---

## 4. Відкриті рішення (owner)

| ID | Рішення | Варіанти | Рекомендація | Блокує |
|---|---|---|---|---|
| D1 | Розташування продукту | (a) VP = наявний `packages/plugin`; (b) `packages/powers` = третій продукт | **(b)**, якщо VP не є Codex-специфічним продуктом: research визначає VP як host-portable, тоді як `packages/plugin` — «Codex plugin product workspace» із власною майбутньою специфікацією. Якщо VP реалізується саме як Codex plugin — **(a)**, щоб не завести третій продукт | 1, 2 |
| D2 | Власник і реєстрація продукту | repository owner + призначений product owner | Призначити product owner; внести рядок у ownership map sidecar, `projects`/`code_selectors`/`delivery_group` у `agent-runtime.config.v1.yaml`, рядок у `docs/products.map.md` | 1, 2 |
| D3 | Формат інструкції | (a) розширити `InstructionRegistry/v1`; (b) окрема `VPInstruction/v1` + власний реєстр | **(a)** з новим optional-блоком (`capability_tags`, `pattern_tags`, `conditions`, `compatibility`, `artifact_contract`, `provenance`): існуючі digest/privacy/activation-семантики й один власник збережуться; (b) створює другий реєстр і другий activation-шлях | 2, 3 |
| D4 | Канал доставки | Codex plugin marketplace / власний пакет / обидва | Визначити до Stage 5: `vp-setup` і формат skill-ів залежать від каналу | 5, 9 |
| D5 | Decision Provider | конкретний провайдер / provider-нейтральний інтерфейс | Provider-нейтральний інтерфейс `decision.evaluate` + обов'язковий Agent Fallback (research §4.8); «Jeff» не існує в коді | 3, 4 |
| D6 | Журнал змін research | створити `*.changelog.md` / прибрати посилання | Створити changelog-артефакт — research сам вимагає його (§7.1) | 1 |

---

## 5. Етапи

Кожен етап має одну відповідальну роль, приймальні критерії (AC) і доказ.
Критерії не закриваються без фактичного виконання перевірки.

### Stage 0 — Рішення, реєстрація, гігієна продуктового кореня
**Мета:** зняти блокери D1, D2, D6 і створити легальну основу продукту.

Роботи:
- Оформити Decision-записи (окремий артефакт за research §7.2) за D1, D2, D6.
- Зареєструвати продукт: рядок ownership map у `AGENT.sidecar.md`; `projects`,
  `code_selectors`, `delivery_group` у `agent-runtime.config.v1.yaml`; рядок у
  `docs/products.map.md`; `package.json` продукту з власним неймом (не
  `vida-stack-lite`).
- Створити changelog research-документа (D6).
- Визначити власника файла `donors.yaml` і правило: зміна `head_sha` тільки разом
  із переопрацюванням змісту.

AC: конфіг валідується; doc-check проходить; кожне з D1/D2/D6 має Decision-запис
із посиланням на доказ.

Доказ: вивід валідації конфігу, `bun tooling/agent/check-documentation.ts`,
decision-записи.

Залежності: ні. Блокує: 1, 2.

---

### Stage 1 — Канонічні документи продукту (B → S)
**Мета:** перенести концепцію з research-рівня в нормативні B/S документи.

Роботи:
- `business-requirements.md`: цілі, незалежні від реалізації вимоги, межі
  (Standalone/Runtime), обмеження автономності, розподіл зон (§2 таблиця).
- `system-specification.md`: спостережувана поведінка — контракт Router,
  операції `catalog.*`, модель інструкції й реєстру, методологічний профіль,
  `artifact_contract`, Join/Lifecycle Scope, Scope-First, Findings-реєстр,
  правила layout/ID, режими Configured/Dynamic.
- `acceptance.md`: AC зі стабільними ID, прив'язані до SR-пунктів.
- Матриця простеження: research § → SR § → AC id. Текст, який не має SR-прив'язки,
  переноситься або видаляється.

AC: кожен нормативний абзац research має пункт SR або позначку «контекст, не норма»;
кожен AC має ID і прив'язку; жоден AC не закритий «наявністю коду».

Доказ: doc-check, таблиця простеження, незалежний review документа.

Залежності: Stage 0.

---

### Stage 2 — Формат інструкції, реєстр і операції каталогу
**Мета:** дати VP одну модель інструкції, сумісну з наявним runtime.

Роботи (за D3):
- Схема інструкції: `instruction_id`, `capability_tags[]`, `pattern_tags[]`,
  `conditions`, `artifact_contract`, `compatibility` (групи, виключення, залежності),
  `provenance` (донор, ліцензія, ревізія джерела), `revision`, `status`.
- Правила тегів: kebab-case, щонайменше два змістовні компоненти; `test-first-development`
  канонічний, `TDD` — аліас; тег ≠ агент/skill/крок/дозвіл.
- Операції `catalog.tags` / `catalog.search` / `catalog.get` / `catalog.compose`:
  контракт результату, межі, поведінка при відсутності, обов'язковість залежностей.
- Інтеграція з `InstructionRegistry/v1`: один реєстр, один activation-шлях, збереження
  digest/privacy/`max_bytes` семантики; заборона паралельного registry.

AC: валідація схемою; пошук повертає лише ID/назву/короткий опис; compose не
повертає повні тексти поза запитаним bundle; конфліктні групи виявляються;
жоден сценарій не створює другий реєстр.

Доказ: schema-тести, юніт-тести операцій каталогу, контрактний тест реєстру.

Залежності: Stage 1 (D3).

---

### Stage 3 — Конвертація донорів у канонічний corpus
**Мета:** перетворити 8 знімків на атомарні інструкції з provenance.

Роботи:
- Детермінований інвентар: для кожного донора — перелік файлів-носіїв методологій
  (у gsd-core 3987 файлів — інвентар обов'язковий).
- Виділення атомарних інструкцій: одна норма/техніка = один instruction_id.
- Тегування за capability/pattern, зіставлення дублікатів між донорами
  (напр. TDD у superpowers/BMAD/matt-skills), реєстр конфліктів.
- `artifact_contract` для інструкцій, що виробляють результат.
- Provenance: донор + ліцензія + ревізія (джерело — `donors.yaml`).
- Реєстр сумісності: взаємовиключні групи (напр. `testing-sequence`:
  `test-first-development` vs `test-after-development`), сумісні доповнення, умовні
  залежності.
- Порядок: **superpowers → ponytail** (малі, самодостатні) для валідації формату,
  далі matt-skills, addy-skills, BMAD, pstack, GSD, OKF-розширення.

AC: кожен донор має інвентар і покриття; кожна інструкція має ≥2 capability-теги,
≥1 pattern-тег, provenance і ліцензію; невирішені конфлікти — у реєстрі, не
заховані; дублікати мають зафіксоване рішення; corpus має digest і версію.

Доказ: вивід пайплайну, звіт покриття, семплинг людської перевірки, digest корпусу.

Залежності: Stage 2.

---

### Stage 4 — Методологічна політика продукту
**Мета:** визначити, як VP приймає методологічні рішення (research §4.3, §4.4, §4.5).

Роботи:
- Поверхня конфігурації: розширення `.vida/project.yaml` (`VidaProjectConfig/v1`)
  або окремий розділ — за D-06, з одним owner і схемою `Type/vN`.
- `Effective Methodology Profile`: групи (testing-sequence, review-strategy,
  architecture, delivery), явне вибіркове успадкування між продуктами, локальне
  перевизначення, конфлікт → питання власнику (не «останній завантажений перемагає»).
- Task-scoped override: запитується один раз, фіксується, передається дочірнім
  агентам, не змінює постійний профіль і не розширює permissions.
- Live Inheritance: посилання на стабільні ID без version pinning + правило
  «зміна поведінки = новий pattern ID».

AC: профіль визначається детерміновано; конфлікт успадкування блокує вибір і
формулює питання; override задокументований і не протікає в сусідні продукти;
семантика інструкції не змінюється під тим самим ID.

Доказ: тести матриці резолюції, schema-тести конфігурації, приклад конфлікту.

Залежності: Stage 2, 3.

---

### Stage 5 — Router Skill і `vp-setup`
**Мета:** дати одну точку входу й безпечне налаштування (research §1, §3).

Роботи:
- Router Skill: прийом запиту звичайною мовою → вибір інструкцій → композиція
  bundle (роль, task contract, методологія, scope, вимоги матеріалізації, посилання
  на артефакти) → делегування або виконання. Fallback на головного агента.
- `vp-setup`: виявлення проєктів, ідемпотентне додавання керованого блоку
  інтеграції, збереження сторонніх інструкцій, налаштування доступних hooks,
  зіставлення layout, перевірка активації.
- Інтеграція з генератором: керований VP-блок додається через
  `packages/agent/templates/AGENTS.template.md` (єдиний writer) — не прямим записом
  у `AGENTS.md`.
- Host-адаптер сесій: bootstrap мінімальних правил, відновлення після compaction
  без повторного виконання завершених дій.

AC: повторний запуск setup не створює дублікатів блоків/записів; активація
перевіряється для початку сесії, відновлення після compaction і контексту
делегованого агента; bootstrap не завантажує весь corpus; варіативність
вибору (за research §4.3) перепитується один раз.

Доказ: тести setup (повторний запуск — порожній diff), матриця підтримки хостів,
журнал активації.

Залежності: Stage 3, 4, D4.

---

### Stage 6 — Матеріалізація, Work Items, Findings
**Мета:** реалізувати artifact-first і централізований реєстр дефектів.

Роботи:
- Матеріалізація: перевикористати `ResearchResult/v1`, `DecisionRecord/v1`,
  `AcceptanceManifest/v1`, `WorkItem/v1`, `WorkState/v1`; додати лише прогалини —
  `ArtifactReference` і `Action/Event Record` (§6.1) — з власними owner'ами.
- `artifact_contract` в інструкціях: тип виходу, дані й посилання, місце
  матеріалізації, спосіб перевірки; перевірка наявності/формату/digest окремо від
  семантичної перевірки.
- Work layout: стабільні ID (`<KEY>-W<NNNN>-<slug>`, `<KEY>-<N>`), алокатор ID,
  типізовані relations (`derived-from`, `informs`, `implements`, `tests`, `blocks`,
  `supersedes`, `changes`, `found-during`), shallow storage.
- Findings: Standalone — append-only JSONL на продукт; Runtime — продуктова
  ізоляція в наявній SQLite/HostState, без другої БД і без другого JSONL-власника.
  Централізований запис через один writer; hybrid dedup (ідентичність → fingerprint
  → семантичні кандидати → перевірка еквівалентності); історія append-only.

AC: `passed` неможливий без фактичного запуску; запізнілий результат не переписує
прийнятий результат батька; невизначеність і блокери записуються чесно; dedup
проходить затверджену таблицю випадків; жоден сигнал findings не стає авторизацією
виправлення.

Доказ: контрактні тести, тести інтеграції в Runtime-режимі, тести Standalone,
приклад dedup-таблиці.

Залежності: Stage 1, 2, 3.

---

### Stage 7 — Runtime-інтеграція: Configured і Dynamic
**Мета:** вбудувати VP у наявне виконання без другої машини (§2, §2.2, §2.3, §8.2).

Роботи:
- Configured: інструкції VP підставляються у етапи `.vida/flows.yaml`; зовнішні
  етапи не додаються, gates не обходятся.
- Dynamic: адаптація в межах затвердженої мети й scope; маршрут не компілюється
  VP-власним графом.
- Selective Join: `blocking` / `non-blocking`; non-blocking не робить підзадачу
  незалежною; обов'язковість AC/gate не знижується.
- Work Scope vs Lifecycle Scope: мапинг на наявні lease/HostState механіки; у
  Standalone — прозора атрибуція без системи прав.
- Scope-First: блокер зафіксовано, дозвіл запитано, scope не розширюється
  автоматично; сторонні баги — окремий Finding.

AC: VP-інструкції застосовуються в обох режимах; порушення scope не проходить
непомітно; у Runtime не з'являється другий scheduler/ledger/БД; підзадача з
`non-blocking` не блокує батьківський етап і не переписує його результат.

Доказ: інтеграційні тести Runtime, фікстура configured-flow, докази роботи в
Runtime-режимі.

Залежності: Stage 5, 6. Зовнішня залежність: Runtime-трек storage admission
(D-09) — VP не закриває його, але не створює другу БД.

---

### Stage 8 — Standalone-режим і переносимість
**Мета:** підтвердити, що VP працює без VIDA Runtime (§1, §3, §12).

Роботи:
- Спільна детермінована бібліотека/скрипти каталогу для Standalone і Runtime
  (Bun/TS — відповідає codebase; дублювання правил пошуку заборонено).
- Прозора атрибуція останнього запису без lease/локів; конфлікти розводяться
  практичними засобами хоста, прихований перезапис заборонений.
- Portability contract: обмеження кожного хоста (сесійні події, compaction,
  subagents, локальні записи) і матриця підтримки.
- Перевірка на реальних хостах, а не на папері.

AC: install+run без VIDA Runtime на щонайменше двох сумісних хостах з робочими
`catalog.*` і матеріалізацією; заявлені обмеження підтверджені спостереженням;
жодне твердження про підтримку не залишається недоведеним.

Доказ: матриця хостів із записами спостережень, журнал сесій.

Залежності: Stage 5, 6.

---

### Stage 9 — поза scope (окремим рішенням)
Дистрибуція та marketplace (§1), domain packs (§11), майбутній UI поверх VIDA API
(§9.3), зовнішня синхронізація issue-трекерів (§8.3). Кожен — з власним рішенням
про обсяг.

---

## 6. Критичний шлях і порядок

```
Stage 0 ──► Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► Stage 5 ──► Stage 6 ──► Stage 7
                │                                        │          │
                │                                        ▼          ▼
                └──► (changelog, decisions)            Stage 8 (Standalone)
```

- Stage 2 — найвужче місце: від нього залежать і corpus, і методологія, і Router.
- Stage 3 — найдовша за обсягом робота (7 донорів); паралелізація лише за
  **дисциплінами** (окремий donor = окремий lane), з одним writer на файл корпусу.
- Stage 5 і Stage 6 частково паралельні (Router ↔ матеріалізація) після Stage 3.
- Stage 7 і Stage 8 — незалежні один від одного, обидва після Stage 5/6.

## 7. Ворота якості (з `TESTING.md` і lifecycle)

- Інструментальний ланцюг — лише Bun; `node`/`npm`/`npx` не підключаються до
  команд розробки.
- Зміни в `packages/agent` — тільки за погодженим work item з окремим власником
  файла; VP-спостереження, що вимагають змін у runtime, оформлюються як запит
  до runtime-власника, а не як правка в VP- Lane.
- Root виконує фінальні перевірки, інтеграцію та Git; робочі лейни не виконують
  Git-операцій і не дублюють фінальні перевірки.
- Числові виміри: current coverage-кампанія репозиторію не зупиняється; VP-ланки
  не торкаються frozen-вимірювань.
- Докази: `BR → SR → AC → evidence`; кожен AC має файл/тест із фактичним запуском.
  Статичний аналіз або наявність коду не закривають AC.

## 8. Ризики

| Ризик | Наслідок | Запобіжник |
|---|---|---|
| Третя логіка реєстру інструкцій (D3) | Два activation-шляди, розбіжна семантика | Один реєстр; D3 вирішується до Stage 2 |
| Прямий запис у `AGENTS.md` | Розбіжність із генератором template | Managed-блок через template (D-04) |
| Scope розширюється на сусідні продукти | Непомітна підміна методології | Явне успадкування; конфлікт → питання (Stage 4) |
| Runtime-режим блокований storage GAP | VP-інтеграція не доводиться | VP не створює БД; залежність трекається окремо (D-09) |
| Обсяг конвертації корпусу | Етап 3 не завершується | Почати з малих донорів; формат валідується до масштабування |
| «Jeff»/Decision Provider не існує | Невизначена реалізація | Provider-нейтральний інтерфейс + обов'язковий fallback (D5) |
| Незареєстрований продукт | Робота поза картою проєкту, ніхто не відповідає | Stage 0 (D1, D2) |

## 9. Що plan не робить

- Не змінює runtime-контракти, схеми й `packages/agent` — це запити до
  runtime-власника.
- Не створює другий scheduler, DAG-компілятор, ledger або сховище стану.
- Не визначає «Jeff» і не прив'язує VP до vendor API.
- Не запускає конвертацію корпусу і не стверджує, що вона виконана.
- Не вважає дослідження доказом готовності: research-факти й код — різні
  величини.
