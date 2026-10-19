---
type: Design Document
title: Vida Powers — дизайн каталогу інструкцій
description: 'Як влаштований каталог інструкцій Vida Powers: структура пакета, формат інструкції, операції каталогу, взаємодія з методологічним профілем, валідація, тести й packaging.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- catalog
- design
- instruction-corpus
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — системна специфікація
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers — бізнес-вимоги
- id: decisions
  resource: /decisions/index.md
  title: Ухвалені рішення D1–D9
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — наступні дії в межах packages/powers
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '7'
---

# 1. Навіщо і для кого

Каталог — це **єдине місце, де живуть правила роботи** для агентів VP: одна
інструкція = одна атомарна норма (що і як робити в одному аспекті: тестування,
прийняття, research, review…). Каталог обслуговує три ролі:

- **Скіл `vp-mode`** (LLM) — читає каталог через операції, формує bundle для
  задачі й сам вибирає серед кандидатів.
- **Агент** — отримує вже вибрані тексти інструкцій і працює за ними.
- **Власник продукту** — редагує інструкції, веде словник тегів і аліаси, визначає
  сумісність і походження.

Ціль: **один canonical owner на правило**. Два агента з каталогу діють за однаковими
правилами; зміна правила в одному місці змінює його для всіх.

# 2. Цілі, не-цілі, анти-цілі

**Цілі (v1)**

- Одна інструкція = один `.md`-файл із метаданими; плоска тека, без директорій за
  донорами.
- Пошук і добір — детерміновані: теги + ефективний методологічний профіль.
- Операції `catalog.tags / search / get / compose` доступні з будь-якого рантайму
  без залежностей і без збірки.
- Походження, ліцензія й ревізія — у метаданих інструкції.
- Метадані читаються тим самим способом, що донорські `SKILL.md` (frontmatter),
  але розширені вимірами VP.

**Не-цілі (v1)**

- Семантичний (LLM) пошук: `catalog.ts` повертає детермінований shortlist, вибір
  робить скіл. Семантичне оцінювання — пізніше, як протокол `decision.evaluate` (D5).
- Проєктні перекриття: каталог **строго канонічний**; проєкт лише обирає профіль і
  обов'язкові ID. Проєктний шар — відкладене рішення (CAT-D1).
- Похідний пошуковий індекс: скрипт сканує `instructions/` і тримає мапу в
  пам'яті. Індекс з'явиться лише за вимірюванням.
- Мультимовність: v1 — мова продукту.
- Збірка корпусу з донорів (крок D) — окрема робота; цей дизайн визначає лише
  **формат**, який конвертер має писати.

**Анти-цілі (що зробить продукт непридатним)**

- Каталог без походження: інструкція без `provenance_*` не приймається.
- Каталог із власним рантаймом, залежностями або збіркою.
- Каталог, який сам вирішує конфлікти груп: вибір альтернативи — за профілем, не
  за пошуком (іначе пошук «testing» завжди падав би).
- Другий каталог: дублікати заборонені (SR-65).

# 3. Обмеження

| Обмеження | Джерело | Наслідок |
|---|---|---|
| Рантайм проєкту — Bun; власної інфраструктури в плагіні немає | NFR-01, D9 | Один `package.json`/`bunfig`/`tsconfig` у пакеті |
| Постачаваний код — без збірки під Bun/Node/Deno | NFR-02, SR-63 | Лише `node:` модулі; `import type`; без `enum`/`namespace`/parameter properties; шляхи з `import.meta.url` |
| Машинні формати — JSON | NFR-03, SR-62 | Дані, які читає **постачаваний** код, — JSON. Виняток — формат самої інструкції: `.md` з frontmatter обмеженого YAML-підмножини (власний формат продукту, §5). Dev-інструменти можуть читати YAML-маніфести продукту (`donors.yaml`) — SR-64 |
| Каталог не має LLM-клієнта | D5, NFR-01 | Скрипт повертає shortlist; вибір робить скіл |
| Інструкція має дві форми: документ (джерело) + запис реєстру (похідний) | SR-34, SR-35 | У v1 — лише документ; запис реєстру з'являється на етапі E |
| Межі системного реєстру — не модель VP | SR-36 | Розширення реєстру — runtime-запит, не частина цього дизайну |
| Конфлікти груп вирішує профіль | SR-25…SR-28 | `compose` приймає ефективний профіль; без нього конфлікт = помилка |
| Канонічність каталогу | BR-23, D9 | Проєктні інструкції не підтримуються у v1 |
| Плагин не має власного LLM-користувача | NFR-01 | Зовнішній провайдер — можливість хоста, не обов'язок VP |

# 4. Структура пакета

```text
packages/powers/
  skills/
    vp-mode/
      SKILL.md                    ← основний скіл оркестрації (host-конвенція)
      scripts/
        schema.ts                 ← валідатор обмеженої підмножини JSON Schema
        frontmatter.ts            ← парсер обмеженого YAML-підмножини
        catalog.ts                ← операції tags/search/get/compose (+ CLI)
    vp-setup/
      SKILL.md                    ← допоміжний скіл налаштування
      scripts/
        setup.ts
  instructions/                   ← канонічні інструкції: плоско, .md + метадані
    test-first-development.md
    define-acceptance-criteria.md
    …
  scripts/                        ← інструменти підтримки продукту (як у донорів)
    check-okf.ts                  ← уже існує (переноситься з tooling/)
    check-corpus.ts               ← валідація корпусу
    validate-donors.ts            ← переноситься з .tmp
    convert.ts                    ← конвертер донорів (крок D)
  config/
    vpcatalog.v1.schema.json      ← схема catalog.json
    vpcorpusmap.v1.schema.json     ← схема мапи обробки (SR-66)
    vpinstruction.v1.schema.json   ← схема frontmatter інструкції (§5)
    vpeffectiveprofile.v1.schema.json ← схема ефективного профілю для compose
  docs/                           ← OKF-bundle (цей дизайн — частина bundle)
  tests/
    catalog.test.ts  frontmatter.test.ts  check-corpus.test.ts  catalog-cli.test.ts
    fixtures/{valid,invalid-tag,missing-provenance,conflicting}/
  catalog.json                    ← ідентичність каталогу + словник тегів + аліаси
  corpus-map.json                 ← мапа обробки: донор + файл → converted/split/merged/rejected
  package.json  bunfig.toml  tsconfig.json  .bun-version
```

**Правила**

- Інструкція: `instructions/<instruction_id>.md`; `instruction_id` — kebab-case,
  стабільний, не перевикористовується; `instruction_id` у frontmatter дорівнює
  імені файлу (валідатор перевіряє). Ім'я файлу без дат, статусів і `final-v2`.
- **Версія контенту — лише в метаданих:** `revision` у frontmatter; історія змін — у
  bundle-журналі `docs/log.md`. У назві файлу версії, дат і статусів немає.
  Виняток — імена схем (`config/*.v1.schema.json`): там версія формату в самій
  назві, за конвенцією репозиторію.
- Скрипти скіла — у `skills/<skill>/scripts/`; тулінг підтримки продукту — у
  `scripts/` у корені пакета (як `scripts/` у superpowers).
- Пер-хостові маніфести (`.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`) —
  етап E; **корінь плагіна = корінь пакета**, тобто вантаж = `skills/` +
  `instructions/` + `catalog.json` (+ `config/` для dev-інструментів). Операції
  знаходять каталог без окремої інсталяції.
- `tsconfig.json` `include` має покривати `scripts/**/*.ts`, `skills/**/*.ts`,
  `tests/**/*.ts` — інакше typecheck мовчки перестає перевіряти
  новий код.
- У knip-конфіг (`packages/agent/knip.config.ts`, owner-виняток D9 rev 2)
  entry-патерни workspace `packages/powers`: `scripts/*.ts` і `skills/*/scripts/*.ts`.
  Другий патерн додано на кроці C — одразу з появою першого скрипта скіла
  (без нього knip не бачить `skills/` і дає config hint).

# 5. Формат інструкції

`.md`-файл із frontmatter. Значення — **плоскі скаляри** та **YAML-блоки** для
списків; вкладених map немає (парсер без залежностей). Імена полів — канонічні з
S-документа; кожне складене поле S-документа має плоский префікс.

**Підмножина YAML у frontmatter.** Межі:

- `key: value` — скаляр, подвійні лапки або порожнє значення (`key:` → `''`);
- блок-список — рядки `- item` з відступом у два пробіли;
- **порожній список — лише `key: []`** (єдиний дозволений flow-літерал); інший
  flow (`[a, b]`, `{...}`) — помилка;
- значення, що містять `:`, беруться **в подвійні лапки** (неекранована `:` у
  значенні — помилка);
- `=`, `;`, `#` у значенні — літерали (коментар — лише рядок, перший
  не-пробільний символ якого — `#`);
- не підтримуються (помилка, а не мовчазне трактування): вкладені map, багаторядкові
  блоки (`|`, `>`), anchors/aliases, YAML-теги, список у списку, дублікат ключа.

```markdown
---
instruction_id: test-first-development
title: Test-first development
summary: Написати тест до реалізації, щоб поведінку можна було перевірити до того, як вона з'явиться.
capability_tags:
  - write-tests-first
  - design-test-cases
pattern_tags:
  - test-first-development
conditions_applies_when: зміна додає нову або змінює наявну поведінку.
conditions_does_not_apply_when: зміна торкається лише документації або коментарів.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - тест-кейси
  - очікувані результати
artifact_contract_verified_by: bun test
compatibility_excludes:
  - test-after-development
compatibility_requires:
  - define-acceptance-criteria
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=workflows/.../test-driven.md
status: active
revision: 1
---

# Test-first development

<нормативний текст: 20–80 рядків, імператив, самодостатній>
```

**Відповідність полів S-документа**

| Поле S-документа | Ключ у frontmatter |
|---|---|
| `instruction_id` | `instruction_id` |
| `title`, `summary` | `title`, `summary` |
| `capability_tags`, `pattern_tags` | `capability_tags`, `pattern_tags` |
| `conditions.applies_when` / `.does_not_apply_when` | `conditions_applies_when` / `conditions_does_not_apply_when` |
| `artifact_contract.output_type` / `.required_data` / `.verified_by` | `artifact_contract_output_type` / `_required_data` / `_verified_by` |
| `compatibility.excludes` / `.requires` | `compatibility_excludes` / `compatibility_requires` |
| `provenance` (джерело: donor, license, source_revision, source_path) | `provenance[]` — список рядків `donor=…; license=…; revision=…; path=…` |
| `status`, `revision` | `status`, `revision` |

**Правила валідації**

| Правило | Порушення |
|---|---|
| `instruction_id` = ім'я файлу, kebab-case, унікальний | `CATALOG_INVALID` |
| `title`, `summary` — непорожні рядки | `CATALOG_INVALID` |
| `capability_tags` ≥ 1; кожен тег kebab-case із ≥2 змістовними компонентами; є в словнику | `CATALOG_INVALID` / `CATALOG_TAG_UNKNOWN` |
| `pattern_tags` ≥ 1; ті самі правила | `CATALOG_INVALID` / `CATALOG_TAG_UNKNOWN` |
| `conditions_*` — непорожні рядки | `CATALOG_INVALID` |
| `artifact_contract_*` — для інструкцій, що виробляють результат, `output_type` і `verified_by` непорожні; для guidance — `output_type` = `none`, `required_data` порожній | `CATALOG_INVALID` |
| `compatibility_excludes`/`_requires` — відомі `instruction_id`; `requires` не містить себе | `CATALOG_DEPENDENCY_MISSING` / `CATALOG_INVALID` |
| `provenance` — список із щонайменше одного джерела; кожне — рядок `donor=…; license=…; revision=…; path=…`: `donor` ∈ `donors.yaml`, `license` збігається з маніфестом, `revision` **дорівнює** `donors.yaml[donor].head_sha`; те саме джерело двічі — не приймається | `CATALOG_INVALID` |
| `status` ∈ `active` \| `disabled`; `revision` — ціле ≥1 | `CATALOG_INVALID` |
| Виняток із правила тегів — лише через `catalog.json` → `tag_exemptions[]` (`instruction_id`, `dimension`, `reason`) | `CATALOG_INVALID` |

Тіло інструкції — нормативний текст; без дублювання research (research — концепція,
інструкція — норма).

## 5a. Формування інструкцій (крок D)

**Принцип: скрипт ніколи не пише нормативний текст.** Семантика (відбір,
сегментація, теґування, злиття) — робота агента; механіка (інвентаризація,
рендер, provenance, валідація) — робота скрипта. Конвертер — агент-процедура зі
скриптовою опорою, а не «магічний скрипт».

| Фаза | Хто | Що робить | Артефакт |
|---|---|---|---|
| 1. Інвентаризація | скрипт | обхід клону донора, перелік файлів-носіїв: шлях, розмір, frontmatter, заголовки | `inventory/<donor>.json` |
| 2. Відбір кандидатів | агент | відсіює те, що не є методологією (changelog, docs, інфраструктура) | `corpus-map.json` (записи `rejected` з причинами) |
| 3. Сегментація | агент | один donor-skill містить кілька норм — ділить на атомарні інструкції | специфікації інструкцій (JSON) |
| 4. Рендер + provenance | скрипт `convert.ts` | з специфікації генерує `.md` і **проставляє джерела** (донор, ліцензія, SHA, шлях) | `instructions/<id>.md` |
| 5. Злиття дублікатів | агент | одна норма = одна інструкція з усіма джерелами | інструкція + `provenance[]` |
| 6. Валідація й рецензія | скрипт + власник | `check-corpus.ts` → вибірка на рецензію → затвердження словника й груп | звіт покриття |

**Злиття дублікатів (фаза 5).** Семантично однакові норми з різних донорів не
лишаються окремими інструкціями:

- Одна норма присутня в корпусі **рівно один раз**; її джерела — в `provenance[]`.
- Формулювання зливається: береться **краща термінологія** з набору джерел, і
  терміни зводяться до контрольованого словника (теги, групи профілю, наші імена
  полів). Donor'івські формулювання зберігаються лише там, де вони несуть зміст, а
  не лексику.
- Зміна тексту або додавання джерела піднімає `revision` інструкції; подія
  записується в журнал bundle.
- Джерело одного донора може обґрунтувати кілька інструкцій (сегментація) — це
  нормально; заборонено лише дублювання самої норми.

**Мапа обробки (артефакт фази 2–5).** `packages/powers/corpus-map.json`
(`VPCorpusMap/v1`) — міст між донорами та корпусом: для кожного донора (з
зафіксованою ревізією) і кожного файлу-носія — результат обробки.

| Статус | Значення |
|---|---|
| `converted` | файл дав рівно одну інструкцію |
| `split` | файл розщеплено на кілька атомарних інструкцій |
| `merged` | норма злита з іншою інструкцією (у `contributed_sources` — джерела внеску) |
| `rejected` | файл відсіяно як не-методологія, з `reason` |

Властивості мапи: ключ — донор + ревізія + шлях, тому повторний прогін на тій самій
ревізії нічого не змінює (конвертація ідемпотентна), а зміна ревізії донора
видимається в мапі; відхилення фіксуються **у мапі**, а не в окремому звіті;
кожна інструкція корпусу має запис у мапі, і кожен запис мапи вказує на наявну
інструкцію — інакше помилка валідації. Інвентар (фаза 1) лишається у `.tmp`:
він детермінований із пін-клону й відтворюваний.

**Обсяг кандидатів (виміряно у клонах із `donors.yaml`)**

| Донор | `.md` | SKILL.md | Коментар |
|---|---|---|---|
| superpowers | 65 | 15 | + 45 доп. `.md` у skill'ах |
| ponytail | 60 | 12 | MVP-пара |
| BMAD | 327 | — | workflows/agents |
| matt-skills | 132 | — | |
| addy-skills | 113 | — | |
| pstack (у cursor/plugins) | 430 | — | наш донор — лише підкаталог `pstack/` (169 tracked-файлів — це `content_file_count` у `donors.yaml`; 430 — увесь монорепозиторій) |
| GSD | 1815 | — | переважно docs, не методологія |

MVP = superpowers + ponytail: ≈ 125 файлів-кандидатів → орієнтовно 25–40
інструкцій; остаточну кількість задає exit criteria кроку D.

**Що не переноситься** (research §4.1): execution engines, tracker integrations,
журнали стану донорів. Відсіювання — на фазі 2, і кожне відсіювання фіксується з
причиною у звіті відбору.

# 6. Формат `catalog.json`

```json
{
  "schema": "VPCatalog/v1",
  "catalog_id": "vida-powers",
  "revision": 1,
  "source_revision": "<git commit корпусу>",
  "updated_at": "2026-10-19T00:00:00Z",
  "tag_dictionary": {
    "capability": { "write-tests-first": "…" },
    "pattern": { "test-first-development": "…" }
  },
  "tag_aliases": { "tdd": "test-first-development" },
  "tag_exemptions": [
    { "instruction_id": "…", "dimension": "capability", "reason": "…" }
  ],
  "instructions": [
    { "instruction_id": "test-first-development", "path": "instructions/test-first-development.md", "sha256": "…" }
  ]
}
```

- `catalog.json` — єдиний машинний файл каталогу: ідентичність + словник тегів +
  аліаси + винятки + перелік інструкцій із `sha256`.
- Опис тегу обов'язковий: тег без опису → помилка (SR-05).
- `tag_aliases` — напрям **«аліас → канонічний»** (`{ "tdd": "test-first-development" }`); пошук зводить аліас до канонічного тегу, `catalog.tags` показує канонічні теги й їхні аліаси.
- `tag_exemptions` — єдиний механізм запису відхилень.

**Як фіксується довідник тегів.** `catalog.json` —
єдине місце словника: `tag_dictionary` (тег → опис), `tag_aliases`
(у `tag_aliases` напрям **«аліас → канонічний»**), `tag_exemptions`. Процес пакетний, без перепитувань на
кожен тег:

1. Під час формування агент збирає потрібні теги, але **не** додає їх у словник.
2. Наприкінці обробки донора (або всієї фази) агент видає **пропозицію пакета**:
   новий тег + одне речення опису + де вживається.
3. Власник затверджує пакет **одним проходом**; теги потрапляють у `catalog.json`.
4. Далі конвертуються інструкції, які їх використовують; валідатор вимагає, щоб
   кожен вжитий тег мав опис.

Довідник — також **авторитет термінології для злиття**: терміни зливаної
інструкції беруться зі словника; новий термін потрапляє в пакетну пропозицію, а не
«як вийде». Групи й активна альтернатива — не в довіднику, а в методологічному
профілі (профіль володіє групами; довідник — значеннями тегів).

# 7. Операції

Чисті функції над каталогом + CLI-обгортка. Вивід — **JSON на stdout**; помилка —
JSON на stderr (`{code, message, details}`) і ненульовий exit-код. Скрипт не знає про
LLM, хости й репозиторій; каталог знаходить **від власного файлу** (`import.meta.url`),
з перекриттям `--catalog <path>` (тести, альтернативні розкладки).

| Операція | Вхід | Вихід | Помилки |
|---|---|---|---|
| `catalog.tags` | — | `{capability:[{tag,description,aliases[]}], pattern:[…]}` | `CATALOG_INVALID` |
| `catalog.search` | `capability[]`, `pattern[]`, `instruction_ids[]` | `{results:[{instruction_id,title,summary,capability_tags,pattern_tags,revision}]}` — **без `content`** | `CATALOG_INVALID` |
| `catalog.get` | `instruction_id` | `{instruction:{…усі поля…}}` | `CATALOG_ID_UNKNOWN`, `CATALOG_INSTRUCTION_DISABLED` |
| `catalog.compose` | `capability[]`, `pattern[]`, `required_ids[]`, `profile` | `{instructions:[{instruction_id,title,summary,content,artifact_contract,selection_reason}]}` | `CATALOG_ID_UNKNOWN`, `CATALOG_REQUIRED_CONFLICT`, `CATALOG_PROFILE_CONFLICT`, `CATALOG_DEPENDENCY_MISSING`, `CATALOG_DEPENDENCY_DISABLED` |

**Семантика пошуку** (SR-10)

- У межах одного виміру — «хоча б один» збіг; між вимірами — «і».
- Задано лише один вимір — інший не застосовується.
- Аліаси зводяться до канонічних тегів **до** збігу.
- `status: disabled` не потрапляє в результат.
- `tag_exemptions` не впливають на пошук (це валідаційні винятки).

**Ефективний профіль** — JSON, який передає host:

```json
{
  "schema": "VPEffectiveProfile/v1",
  "groups": {
    "testing-sequence": { "active": "test-first-development", "alternatives": ["test-first-development", "test-after-development"] }
  }
}
```

Активна альтернатива — **pattern-тег** (методологія), а не `instruction_id`; так
групи лишаються про методології (SR-26), а інструкція прив'язується до них своїми
`pattern_tags`. Розв'язання успадкування та override — поза `compose` (крок Stage 4);
`compose` приймає вже розв'язаний ефективний профіль і лишається чистою функцією.

**Правила `compose`**

1. `required_ids` входять **завжди**, навіть якщо не збігаються з тегами (SR-13).
2. Збіги за тегами → `selection_reason: "matched"`.
3. Транзитивні `compatibility_requires` → `"dependency"`; невідома або вимкнена
   залежність → помилка.
4. **Групи вирішує профіль:** якщо група має активну альтернативу, інструкції з
   іншими `pattern_tags` цієї групи до bundle не потрапляють. Помилка лише коли:
   (а) сам профіль суперечний (дві активні альтернативи в одній групі);
   (б) `required_ids` суперечить активній альтернативі;
   (в) дві інструкції з різних груп мають пряме `compatibility_excludes` один на
   одного.
5. Без профілю: будь-яка пара з `compatibility_excludes` → помилка (SR-14).
6. Порядок виводу — стабільний (за `instruction_id`).

**Семантика `decision.evaluate` (D5).** У v1 операція реалізована **детерміновано**:
`decision.evaluate` приймає вже допустимі кандидати й повертає shortlist або причину
відмови (немає кандидатів, невідомий candidate ID, кандидат поза допустимими,
некоректний формат). Семантичне оцінювання робить скіл `vp-mode`; зовнішній
провайдер — можливість хоста, а не обов'язок VP. Контракт D5/SR-16…SR-21 зберігає
усі поля (джерело рішення, обрані ID, причина fallback).

# 8. Потік використання

```text
Standalone:
  користувач → скіл vp-mode (LLM)
      → skills/vp-mode/scripts/catalog.ts search/compose → shortlist + тексти
      → скіл обирає/уточнює → bundle → виконання → матеріалізація

Bundled (етап E):
  агент → розширений instruction registry пакета агента (похідна проекція)
      → ті самі інструкції з instructions/
```

Один і той самий набір інструкцій обслуговує обидва режими; різниця — у способі
доставки інструкцій до виконавця.

# 9. Валідація та цілісність

- `check-corpus.ts` (dev-інструмент у `scripts/`): перевіряє всі правила §5, словник
  і аліаси, унікальність id, `requires`/`excludes` на невідомі id, узгодженість
  `provenance_license` із `donors.yaml` (YAML читається dev-інструментом — SR-64;
  JSON-дубля немає, один owner). Вивід — рядки «файл: правило» або JSON, ненульовий
  exit.
- Мапа обробки й корпус узгоджені: інструкція без запису в `corpus-map.json` →
  помилка; запис мапи на неіснуючу інструкцію → помилка; `rejected` без причини →
  помилка.
- `source_revision` каталогу vs фактичний стан інструкцій — **не** блокер у v1:
- **Цілісність корпусу** перевіряється вже у v1: `catalog.json` є єдиним переліком корпусу
  з `sha256` кожної інструкції (CAT-D3, SR-76, AC-42); файл поза маніфестом, запис без
  файлу й розбіжний digest — помилки. Digest **пакунка** в агент-пaketі (етап E) — окреме питання.
- Валідація виконується перед комітом змін у `instructions/` (ручна команда або
  hook — на розсуд власника).

# 10. Тести й ворота

Команди: `bun run --cwd packages/powers test` (швидкий цикл), `test:coverage`
(`bun test --coverage`, поріг покриття 1.0 з `bunfig.toml`), `typecheck`.

| Тест | Що перевіряє |
|---|---|
| `frontmatter.test.ts` | парсер: скаляри, YAML-блоки, коментарі, порожні значення, не-ASCII, помилки формату |
| `catalog.test.ts` | правила §5; пошук не повертає `content`; аліас → канонічний тег; `get` на невідомому/вимкненому id; compose: required + залежності + конфлікт без профілю + відкидання неактивної альтернативи профілем + прямий `excludes` + порядок виводу; `disabled` не в пошуку |
| `check-corpus.test.ts` | `check-corpus` на фікстурах: невідомий тег, відсутнє provenance, невідомий `requires`, дубль id, несумісна ліцензія, інструкція без запису в мапі, запис мапи на відсутню інструкцію |
| `catalog-cli.test.ts` | CLI: JSON на stdout, код на stderr, ненульовий exit, пошук каталогу відносно файлу |
| `catalog-manifest.test.ts` | маніфест `catalog.json` ↔ диск: файл поза маніфестом, запис без файлу, розбіжний `sha256` (AC-42) |

Фікстури — мінімальні каталоги: `valid/`, `invalid-tag/`, `missing-provenance/`,
`conflicting/`.

# 11. Команди

```sh
bun run --cwd packages/powers test                              # швидкий цикл
bun run --cwd packages/powers test:coverage                     # покриття (поріг 1.0)
bun run --cwd packages/powers typecheck                         # типізація
bun packages/powers/scripts/check-corpus.ts                     # валідація корпусу
bun packages/powers/scripts/check-okf.ts                        # OKF-сумісність bundle
bun packages/powers/skills/vp-mode/scripts/catalog.ts tags     # ручна перевірка операцій
bun run --cwd packages/agent lint:knip:pinned                   # репозиторний lint-гейт
```

# 12. Ухвалені рішення (з кого)

**Writer-дисципліна.** `convert.ts` — **єдиний** writer для `instructions/`, `catalog.json` і
`corpus-map.json`; runtime-скрипти лише читають. `catalog.json` тримає перелік
корпусу з `sha256` кожної інструкції (CAT-D3); валідатор перевіряє мапу, диск і
digest.

| Рішення | Хто | Альтернативи, які відкинуто |
|---|---|---|
| Інструкція = `.md` + метадані, плоска тека | **власник** | JSON-файли; директорії за донорами |
| Джерела інструкції — список; злиття дублікатів з кращою термінологією | **власник** | «канонічна + відкинута» |
| Кодування списку джерел — скаляри `donor=…; license=…; revision=…; path=…` | **власник (a)** | список мапів; компактний рядок |
| Конвеєр формування (фази 1–6) — у дизайні | **власник** | лише в плані кроку D |
| Мапа обробки `corpus-map.json` (donor+revision+файл → converted/split/merged/rejected) | **власник** | звіт у README без файлу-стану |
| `catalog.json` — єдиний перелік корпусу з `sha256` (CAT-D3) | **власник** | digest лише на етапі E |
| Довідник тегів — пакетне затвердження власником | **власник** | поштучне підтвердження; підтвердження не потрібне |
| Тулінг усередині скіла; підтримка продукту — у `scripts/` | **власник** | усе в `tooling/` |
| Каталог VP **замінює** модель D3: джерело — `.md`-інструкції, `catalog.json` — ідентичність + словник + аліаси + винятки | **власник** | JSON-каталог з інструкціями всередині |
| Вантаж плагіна = коренець пакета (`skills/` + `instructions/` + `catalog.json`) | **власник** | окрема інсталяція корпусу |
| Проєктний шар інструкцій | **власник (c)** — відкладено, v1 канонічний | overlay |
| Канонічні імена полів — з S-документа; скіли — host-конвенція | автор | власний набір імен у розрізненні |
| Групи й активна альтернатива — у профілі; `excludes` — попарна виключка інструкцій | автор | `excludes` між тегами |
| `compose` приймає розв'язаний ефективний профіль | автор | розв'язання успадкування всередині compose |
| Без похідного індексу в v1 | автор | індекс як артефакт |
| Без LLM-клієнта: shortlist → вибір робить скіл | автор | семантичний пошук у VP |
| Аліаси тегів — у `catalog.json` | автор | аліас у метаданих інструкції |
| Пошук каталогу — відносно файлу скрипта | автор | cwd / env-змінна |
| Ворота: `test` + `test:coverage` + `typecheck`; CRAP/mutation — відкладено | автор | Stryker-залежність у VP |
| Dev-інструменти читають YAML-маніфести; постачаваний код — лише JSON | автор | JSON-дубль ліцензій |
| Дизайн у `packages/powers/docs/` | **власник (a)** | `docs/superpowers/specs/…` |

# 13. Відкладені рішення

| ID | Питання | Статус |
|---|---|---|
| CAT-D1 | Проєктний шар інструкцій (overlay) | Відкладено: v1 канонічний |
| CAT-D2 | Семантичний `decision.evaluate` у VP | Відкладено: v1 детерміновано; протокол D5 готовий |
| CAT-D3 | Digest-зв'язка інструкцій | **Вирішено 2026-10-19:** digest у `catalog.json` (перелік корпусу), генерує `convert.ts` |
| CAT-D4 | Мова інструкцій | v1 — мова продукту |
| CAT-D5 | Ієрархія каталогу (підкаталоги) | v1 — плоско |
| CAT-D6 | CRAP/mutation-гейт для VP | Відкладено: потрібна нова залежність (Stryker) — потребує згоди власника |
| CAT-D7 | Чи VP має власний `index.md`/навігацію корпусом | Відкладено: bundle-індекс уже є; корпус навігується пошуком |
| CAT-D8 | Хто затверджує словник тегів і групи | Механізм вирішено: власник, пакетним проходом; конкретні теги — на етапі D |
| CAT-D9 | Скільки інструкцій вважається достатньою для MVP | Відкладено до кроку D: exit criteria |
| CAT-D10 | Де зберігається звіт відбору та злиття | Відкладено до кроку D: звіт кроку, не корпус |

# 14. Синхронізація нормативних документів (у межах цього work item)

| Документ | Що змінюється |
|---|---|
| `decisions/D3-instruction-catalog-and-registry.md` | rev 2: канонічний каталог = `.md`-інструкції + `catalog.json` (ідентичність, словник, аліаси, винятки); bundled-проєкція без змін |
| `system-specification.md` | SR-01, SR-06, SR-07, SR-15, SR-76, SR-34, SR-62 |
| `acceptance.md` | AC-01 (валідація інструкції-файлу, список джерел), AC-42 (маніфест ↔ диск), 
| `traceability.md` | рядок D3; посилання на дизайн каталогу як джерело |
| `docs/index.md`, `docs/log.md` | дизайн у bundle-індексі; записи про зміни |

# 15. Простеження з research

| Research § | Елемент дизайну |
|---|---|
| §4.1 канонізація донорів | формат інструкції, `provenance[]` (кілька джерел), ліцензійна прив'язка, злиття дублікатів, мапа обробки (§5a) |
| §4.2 два виміри тегів | `capability_tags`, `pattern_tags`, ≥2 компоненти, словник, аліаси; термінологія зливається за словником |
| §4.3–4.5 методологія як політика | `compose` + профіль як розв'язувач конфліктів; успадкування/override — Stage 4 |
| §4.6 risk-adaptive оновлення | `revision` інструкції + журнал змін (OKF) |
| §4.7 операції каталогу | `tags/search/get/compose` (§7) |
| §4.8 два селектори | детермінований shortlist від каталогу; вибір — у скілі |
| §4.9 OKF | `catalog.json` і журнал — у нашому bundle; інструкції — продуктовий формат |
| §6.2 `artifact_contract` | поля `artifact_contract_*` |
| §9.2 стабільні імена | `instructions/<id>.md` |

# 16. Що залишено будівничному

- Точний код і порядок парсеру frontmatter (підмножина: скаляри, YAML-блоки,
  коментарі, порожні значення, не-ASCII).
- Структура модуля `catalog.ts` (функції, типи, експорти) і точний протокол CLI
  (прапорці, stdout/stderr, коди виходу).
- Формат і коди помилок `check-corpus.ts`.
- Точний набір seed-інструкцій (5–8) із research/SR — щоб перевірити правила, аліаси
  й конфлікти груп.
- Структура тестів і фікстур.
- Чи `frontmatter.ts` лишається окремим файлом (рішення автора: так — він потрібен
  і `check-corpus.ts`).
