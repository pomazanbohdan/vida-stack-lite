---
type: Design Proposal
title: Продукти, wiki та роботи — пропозиція для затвердження
---
# Продукти, wiki та роботи

Статус: затверджено до реалізації з анотаціями користувача. Codex identity стає `codex`; вкладеність типів налаштовується продуктом без hardcoded type matrix. Source/runtime ще потребують реалізації та доказів. Попередній review receipt стосується своїх sealed inputs і не є review нових анотацій. Канонічна системна специфікація узгоджує погоджений target з поточним Source. Operational work record: `.agent/work/runtime-project-model-implementation-20261102/WORK.md` під repository root.

## Результат для користувача

У репозиторії є продукти з незалежними прив’язками Source та документації. Кожен продукт має одну актуальну Markdown wiki з `index.md`, напрямки вимог і власне місце робіт. Ключ роботи показує repository, продукт і тип; PBI та BUG містять підпорядковані роботи. Користувач працює звичайними запитами, без обов’язкового знання внутрішніх workflow-команд.

## Погоджені обмеження

- Карта вкладена в `projects[]`; цільові IDs `agent`, `codex`, `powers`. Codex ID змінюється наскрізно явно, з належним identity-conversion owner для існуючих references. Джерела: [рішення про документи](product-documents.md), [ідентифікація робіт](../work-items/identity-and-types.md).
- Source і документи можуть лежати незалежно та перетинатися; спільний файл може належати кільком mappings. Membership не надає write authority.
- Єдина wiki, тематичні актуальні дослідження/рішення, окремі каталоги BR/SR, AC і тест-кейсів за напрямками. Індекси — `index.md` за OKF v0.2. Окремих internal/wiki-output корпусів немає.
- У підтримуваних документах — поточний результат; уточнення оновлюють той самий запис одразу. Git зберігає історію. Raw receipts та fenced UNKNOWN зберігають свої owners поза активними документами.
- Prefix репозиторію та продукту окремі. Коди типів фіксовані у runtime; продукт задає лише enabled list. Тип входить у ключ.
- Вкладеність generic: підтримувані типи й коди визначає runtime; продукт обирає enabled list та allowed parent/child combinations. Type-specific leaf/edge заборони не hardcode-яться. Приклади PBI/BUG/TASK ілюструють одну конфігурацію, не обмежують інші.
- Root AGENTS/sidecar discovery і чинна специфікація не замінюються wiki index без підтриманого переходу. Powers лишається в project-document mode; його runtime integration не входить у цей пакет.

## Обраний підхід

Продукт є входом до конфігурації. Його явна карта визначає code selectors, wiki, напрямки та work-item store. Один resolver нормалізує repository-relative paths і повертає bindings усіх відповідних продуктів. Спільне розташування не обирає одного власника мовчки. Markdown є підтримуваним Source wiki та робіт; future GUI використовує ті самі записи.

Навігація, вимоги й операційний стан мають різні ролі, але друга копія документів не створюється. Наявні ownership/CAS/lease, safe filesystem, UNKNOWN та assurance policy з [sidecar](../../../../../AGENT.sidecar.md) зберігаються. Дизайн не видає додаткових прав запису або delivery.

## Конкретні рекомендації до затвердження

| Питання | Рекомендація цього пакета |
| --- | --- |
| Prefixes | Repository `VIDA`; продукти `AGENT`, `CODEX`, `POWERS`. Стабільні IDs не перейменовуються |
| Початкові типи нової моделі | `PBI`, `BUG`, `TASK`. Додавання нового коду потребує зміни runtime contract; продукт не перевизначає код |
| Enabled list | Обмежує створення та reclassification; читання й references уже збережених робіт залишаються доступними. Наявні team/provider обмеження також діють |
| Counter | Один монотонний counter на продукт для всіх типів; починається з 1 для нового порожнього store. Номери не перевикористовуються; пропуски дозволені |
| Identity | Незмінний `internal_id` UUID; human key — окреме поле |
| Key | `<repository-prefix>-<product-prefix>-<type-code>-<number>`, наприклад `VIDA-AGENT-BUG-43`; padding не є частиною identity |
| Prefix validation | Непорожні uppercase Latin letters/digits, prefix починається з літери; дефіс є розділювачем. Product prefixes унікальні в repository; aliases/canonical keys не можуть мати різних власників |
| Reclassification | Зберігає `internal_id` і номер; змінює type та key; попередній key назавжди стає alias тієї самої роботи. Усі parent/child edges перевіряються повторно |
| Prefix/ownership change | Для store з даними — лише підтримана явна migration operation; редагування cfg не переписує ключі або ownership автоматично |
| Вкладеність | Нуль або один parent; без циклів; type combinations перевіряються за налаштуванням продукту. Будь-який enabled тип може бути parent/child, якщо налаштування це дозволяє; жоден тип не є leaf безумовно |
| Міжпродуктові зв’язки | Явні related/dependency references, окремі від parent. Перенесення ownership роботи між продуктами не додається як мовчазний ефект |
| Документи | Root і `index.md` плюс каталогова карта напрямків. Paths не виводяться з code root; явно задані mappings можуть перетинатися |

Користувач затвердив пакет з анотаціями, які мають пріоритет над прикладами. Number зберігається при зміні типу, type prefix змінюється; relation checks використовують product configuration. Затвердження не встановлює Runtime acceptance і не дозволяє немарковану міграцію існуючих даних.

## Wiki та напрямки

```text
<documents.root>/
  index.md
  requirements/
    runtime/
      business/index.md
      system/index.md
      acceptance/index.md
      test-cases/index.md
    delivery/...
  research/<topic>/index.md
  research/<topic>/<subject>.md
  decisions/<topic>/index.md
  decisions/<topic>/<subject>.md
```

Напрямки є явними cfg IDs, не виводяться з назв папок. Наведені напрямки та destinations для трьох продуктів конкретизовані у [cfg-пакеті](project-config.proposed.yaml). Збережена Agent специфікація є чинним системним джерелом до погодженого розбиття. Новий index може посилатися на неї; дубль не створюється.

Індекс перелічує доступні записи й дає progressive navigation. Каталог є межею discovery; агент читає релевантні документи, а не весь corpus. Concept-файли мають OKF `type`; unknown concept types не відкидаються лише через назву. Дослідження, AC, test-case description та фактичний verification report мають різне призначення й не підміняють одне одного.

Один досліджений предмет має один активний запис; рішення посилається на дослідження, а дослідження — на рішення. Редагування нормалізує поточний зміст без r1/r2-копій або хронологічних дописів. Технічні metadata зберігають source pin і межі актуальності.

## Ініціалізація та відсутні джерела

- Authorised init/adoption може створити обрані каталоги та навігаційні індекси. Він зберігає наявні канонічні файли, не вигадує BR/SR/AC і не перезаписує чужі значення.
- Shape cfg має валідні repository/product IDs, prefixes, enabled codes та явні paths. Paths нормалізуються з repository root; guards safe filesystem owner не обходяться.
- Root wiki/index потрібні перед використанням продуктового knowledge context. Якщо їх немає, inspection показує setup gap і запропонований init; звичайне читання інших доступних джерел не блокується.
- Відсутня категорія не блокує всі операції. Перед зміною поведінки workflow встановлює її B/S/AC trace з користувацького наміру та канонічних документів потрібних напрямків. Якщо потрібного джерела або матеріального рішення бракує — зупиняється залежна зміна; supporting read-only дослідження триває.
- Test-case документи та actual verification evidence потрібні для приймання нової/зміненої поведінки; їх відсутність не перетворюється на вигаданий PASS. Джерела B/S не генеруються з коду як нормативна істина.
- Final published index посилається на існуючі записи. Плановані, але не створені папки cfg-прикладу не видаються за готові документи.

## Work-item record і приклад

Канонічний work-item concept зберігається у `<storage_root>/items/<internal_id>.md`. Назва файла стабільна; індекс показує human key. Lookup index є похідним від current records та їхніх aliases; rebuild не змінює ownership. Механізм counter/reservation використовує належного одноосібного writer і чинні CAS/lease правила; перерване резервування може залишити gap, але не повторне використання номера.

Приклад полів record, не реальна створена робота:

```yaml
type: Work Item
internal_id: b8c04006-5bf6-4348-97a1-5cf90b6e4872
key: VIDA-AGENT-TASK-44
kind: TASK
project_id: agent
parent_id: <internal-id-of-bug-43>
aliases: []
```

```text
VIDA-AGENT-PBI-42
├── VIDA-AGENT-BUG-43
│   └── VIDA-AGENT-TASK-44
└── VIDA-AGENT-TASK-45
```

Reparent в межах продукту зберігає key. `TASK → BUG` змінює key на `VIDA-AGENT-BUG-44`, додає old key в aliases й зберігає stable file/ID та number. Операція перевіряє всі зв’язки за чинною product hierarchy policy: `BUG → BUG` дозволений або відхиляється саме нею, а не hardcoded runtime rule. Canonical key та alias resolving до одного internal ID.

Продуктовий enabled list та чинні team/provider policies перевіряються разом; product list не розширює team rights. Existing provider IDs, mappings та старі record types не видаляються через початковий каталог цієї моделі. Непідтримані legacy records потребують явного mapping/adoption, а не silent rewrite.

## Початковий стан нашого repository

| Продукт | Цільова wiki | Рекомендований work store | Readiness |
| --- | --- | --- | --- |
| Agent (`agent`) | `packages/agent/docs`, index створений | `packages/agent/backlogs` | Canonical SR збережений; BR/AC/domain split та повна OKF qualification потребують adoption |
| Codex (`codex`) | `packages/codex/docs` | `packages/codex/backlogs` | Є лише package manifest; docs/requirements setup та явна identity conversion входять у adoption |
| Powers (`powers`) | `packages/powers/docs` | `packages/powers/docs/work` | Store обраний за [продуктовим D2](../../../../powers/docs/decisions/D2-ownership-and-work-space.md), а не за суперечливим root backlogs value; формат/дані не мігровані |

Цільові paths і prefixes у YAML є конкретною пропозицією для затвердження, не доказом readiness трьох installed products. Для Powers перед activation потрібне узгодження його B/S/AC та D2 щодо глобальних type codes/нової моделі; Root не переписує ці продуктові документи як побічний ефект дизайну.

## Adoption і порядок реалізації

1. Узгодити Agent S/AC і потрібні продуктові owners; implementation виконує Luna, validation — OpenCode/DeepSeek V4.1 Flash, Root володіє інтеграцією, Git і delivery.
2. Реалізувати один config/path/work-item owner з contract validation, а не паралельні resolver/ID constructors.
3. До зміни чинних strict schemas/artifacts підготувати обов’язковий repair/migration owner. Plan фіксує before-images, source bindings, conflicts та зміни references; inspect/resume не повторює невизначені effects.
4. Legacy cfg та data лишаються читабельними до явного переходу. Не перейменовувати власників/старі IDs на підставі їхнього вигляду. Ambiguous ownership і UNKNOWN залишаються fenced.
5. Adopt по продукту після перевірки inputs і readiness; failures не перетворюють частковий стан на success. Гарантія atomicity/rollback або resumable repair визначається owner до першого apply.
6. Не переносити canonical SR/BR і не активувати новий cfg тільки тому, що YAML-приклад parseable. Формування/інсталяція нового runtime і attributable user acceptance мають власні докази.

Future GUI, інтеграція Jira/Azure API, Powers runtime integration, нові work-item типи поза початковим набором і загальний `.vida` storage rollout не входять у цей пакет реалізації.

## Критерії приймання реалізації

| Перевірка | Очікуваний результат |
| --- | --- |
| Розділені code/wiki roots | Правильні sources незалежно від consumer cwd; зміна code root не переміщує docs |
| Перетин mappings | Усі належні продукти resolving явно; ownership не вгадується |
| Напрямки | BR/SR/AC/test cases runtime і delivery ізольовані по явних mappings |
| Індекси та OKF | Scoped перевірка Agent corpus, navigation і concept metadata; Powers-only checker не видається за Agent gate |
| Відсутні джерела | Точний setup/trace gap; залежна зміна зупинена без вигаданих documents/PASS |
| Enabled types | Невідомий/вимкнений код не створюється й не призначається; існуючі роботи не зникають |
| Counter | Parallel/crash tests не дають duplicate/reused numbers; gaps не маскуються |
| Reclassification | internal ID/file незмінні; typed key оновлений; старий key resolving через alias; edges повторно перевірені |
| Containment | Різні product policies дозволяють різні type combinations; негативні cycle/multi-parent/cross-product та edge, заборонений саме product configuration |
| Legacy adoption | IDs/provider references збережені; unknown ownership не підмінена припущенням |
| Переривання migration | Inspect/resume/repair узгоджують exact inputs і effects, без втрати final docs або silent overwrite |
| Межі доказів | Source, scoped checks, delivered artifact та Runtime acceptance звітуються окремо |

## Джерела і межі затвердження

- [Документи продуктів](../../research/configuration/product-documents.md).
- [Чинні path fields і consumers](../../research/configuration/runtime-paths.md).
- [OKF, wiki і напрямки вимог](../../research/configuration/wiki-and-requirements.md).
- [Typed keys та containment](../../research/work-items/jira-model.md).
- [Правило поточних тематичних записів](../documentation/current-state-records.md).

Затверджено цей дизайн з користувацькими анотаціями. [YAML-форма](project-config.proposed.yaml) узгоджується під час implementation planning; при конфлікті діють анотації. Окремо прямо дозволені temp acceptance, PATCH release/build, зовнішнє системне оновлення та [чистий init нашого repository](clean-init-authorization.md). Init/help мають описувати запити до користувача й усі кроки налаштування; виконані effects і Runtime acceptance ще потребують власних доказів.
