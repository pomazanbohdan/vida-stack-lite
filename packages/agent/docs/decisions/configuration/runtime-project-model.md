---
type: Design Proposal
title: Продукти, wiki та роботи — пропозиція для затвердження
---

# Продукти, wiki та роботи

Статус: затверджено до реалізації з анотаціями користувача. Codex identity стає `codex`; вкладеність типів налаштовується продуктом без hardcoded type matrix. Source/runtime ще потребують реалізації та доказів. Попередній review receipt стосується своїх sealed inputs і не є review нових анотацій. Канонічна системна специфікація узгоджує погоджений target з поточним Source. Operational work record: `.agent/work/runtime-project-model-implementation-20261102/WORK.md` під repository root.

## Результат для користувача

Цільова модель має продукти з незалежними прив’язками Source та документації. Кожен продукт має одну актуальну Markdown wiki з `index.md`, напрямки вимог і власне місце робіт. Ключ роботи показує repository, продукт і тип; підпорядкованість визначає product policy. Для початкового налаштування всіх трьох продуктів PBI містить TASK і BUG; BUG та TASK є кінцевими елементами, окремі TASK дозволені. Користувач працює звичайними запитами, без обов’язкового знання внутрішніх workflow-команд.

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

## Погоджені значення

| Питання                          | Рекомендація цього пакета                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefixes                         | Користувач підтвердив 2026-11-03: repository `VIDA`; Agent `AGENT`; Codex `CODEX`; Powers `POWERS`. Display prefixes не змінюють стабільні IDs                                                          |
| Початкові типи нової моделі      | `PBI`, `BUG`, `TASK`. Додавання нового коду потребує зміни runtime contract; продукт не перевизначає код                                                                                                |
| Enabled list                     | Обмежує створення та reclassification; читання й references уже збережених робіт залишаються доступними. Наявні team/provider обмеження також діють                                                     |
| Counter                          | Один монотонний counter на продукт для всіх типів; починається з 1 для нового порожнього store. Номери не перевикористовуються; пропуски дозволені                                                      |
| Identity                         | Незмінний `internal_id` UUID; human key — окреме поле                                                                                                                                                   |
| Key                              | `<repository-prefix>-<product-prefix>-<type-code>-<number>`, наприклад `VIDA-AGENT-BUG-43`; padding не є частиною identity                                                                              |
| Prefix validation                | Непорожні uppercase Latin letters/digits, prefix починається з літери; дефіс є розділювачем. Product prefixes унікальні в repository; aliases/canonical keys не можуть мати різних власників            |
| Reclassification                 | Зберігає `internal_id` і номер; змінює type та key; попередній key назавжди стає alias тієї самої роботи. Усі parent/child edges перевіряються повторно                                                 |
| Prefix/ownership change          | Для store з даними — лише підтримана явна migration operation; редагування cfg не переписує ключі або ownership автоматично                                                                             |
| Вкладеність                      | Нуль або один parent; без циклів; type combinations перевіряються за налаштуванням продукту. Будь-який enabled тип може бути parent/child, якщо налаштування це дозволяє; жоден тип не є leaf безумовно |
| Початкова policy трьох продуктів | Окремі `custom` maps з однаковими обраними значеннями: `PBI → TASK, BUG; BUG → []; TASK → []`; окремі TASK дозволені. BUG terminal підтверджено користувачем                                            |
| Міжпродуктові зв’язки            | Явні related/dependency references, окремі від parent. Перенесення ownership роботи між продуктами не додається як мовчазний ефект                                                                      |
| Документи                        | Root і `index.md` плюс каталогова карта напрямків. Paths не виводяться з code root; явно задані mappings можуть перетинатися                                                                            |

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
parent_id: <internal-id-of-pbi-42>
aliases: []
```

```text
VIDA-AGENT-PBI-42
├── VIDA-AGENT-BUG-43
├── VIDA-AGENT-TASK-44
└── VIDA-AGENT-TASK-45

VIDA-AGENT-TASK-46 (окрема робота)
```

Reparent в межах продукту зберігає key. `TASK → BUG` змінює key на `VIDA-AGENT-BUG-44`, додає old key в aliases й зберігає stable file/ID та number. Операція перевіряє всі зв’язки за чинною product hierarchy policy: у початковій policy `BUG → BUG` заборонений через terminal BUG; інша явно обрана policy може дозволити цю комбінацію. Canonical key та alias resolving до одного internal ID.

Продуктовий enabled list та чинні team/provider policies перевіряються разом; product list не розширює team rights. Existing provider IDs, mappings та старі record types не видаляються через початковий каталог цієї моделі. Непідтримані legacy records потребують явного mapping/adoption, а не silent rewrite.

## Початковий стан нашого repository

| Продукт           | Цільова wiki                           | Рекомендований work store   | Readiness                                                                                                                                                               |
| ----------------- | -------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent (`agent`)   | `packages/agent/docs`, index створений | `packages/agent/backlogs`   | Canonical SR збережений; BR/AC/domain split та повна OKF qualification потребують adoption                                                                              |
| Codex (`codex`)   | `packages/codex/docs`                  | `packages/codex/backlogs`   | Є лише package manifest; docs/requirements setup та явна identity conversion входять у adoption                                                                         |
| Powers (`powers`) | `packages/powers/docs`                 | `packages/powers/docs/work` | Store обраний за [продуктовим D2](../../../../powers/docs/decisions/D2-ownership-and-work-space.md), а не за суперечливим root backlogs value; формат/дані не мігровані |

Prefixes у YAML підтверджені користувачем. Цільові paths потребують перевірки під час setup та adoption. Підтверджені значення не доводять readiness трьох installed products і не змінюють активний cfg. Для Powers перед activation потрібне узгодження його B/S/AC та D2 щодо глобальних type codes/нової моделі; Root не переписує ці продуктові документи як побічний ефект дизайну.

## Adoption і порядок реалізації

1. Узгодити Agent S/AC і потрібні продуктові owners; implementation виконує Luna, validation — OpenCode/DeepSeek V4.1 Flash, Root володіє інтеграцією, Git і delivery.
2. Реалізувати один config/path/work-item owner з contract validation, а не паралельні resolver/ID constructors.
3. До зміни чинних strict schemas/artifacts підготувати обов’язковий repair/migration owner. Plan фіксує before-images, source bindings, conflicts та зміни references; inspect/resume не повторює невизначені effects.
4. Legacy cfg та data лишаються читабельними до явного переходу. Не перейменовувати власників/старі IDs на підставі їхнього вигляду. Ambiguous ownership і UNKNOWN залишаються fenced.
5. Adopt по продукту після перевірки inputs і readiness; failures не перетворюють частковий стан на success. Гарантія atomicity/rollback або resumable repair визначається owner до першого apply.
6. Не переносити canonical SR/BR і не активувати новий cfg тільки тому, що YAML-приклад parseable. Формування/інсталяція нового runtime і attributable user acceptance мають власні докази.

Future GUI, інтеграція Jira/Azure API, Powers runtime integration, нові work-item типи поза початковим набором і загальний `.vida` storage rollout не входять у цей пакет реалізації.

## Критерії приймання реалізації

| Перевірка                 | Очікуваний результат                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Розділені code/wiki roots | Правильні sources незалежно від consumer cwd; зміна code root не переміщує docs                                                                       |
| Перетин mappings          | Усі належні продукти resolving явно; ownership не вгадується                                                                                          |
| Напрямки                  | BR/SR/AC/test cases runtime і delivery ізольовані по явних mappings                                                                                   |
| Індекси та OKF            | Scoped перевірка Agent corpus, navigation і concept metadata; Powers-only checker не видається за Agent gate                                          |
| Відсутні джерела          | Точний setup/trace gap; залежна зміна зупинена без вигаданих documents/PASS                                                                           |
| Enabled types             | Невідомий/вимкнений код не створюється й не призначається; існуючі роботи не зникають                                                                 |
| Counter                   | Parallel/crash tests не дають duplicate/reused numbers; gaps не маскуються                                                                            |
| Reclassification          | internal ID/file незмінні; typed key оновлений; старий key resolving через alias; edges повторно перевірені                                           |
| Containment               | Різні product policies дозволяють різні type combinations; негативні cycle/multi-parent/cross-product та edge, заборонений саме product configuration |
| Legacy adoption           | IDs/provider references збережені; unknown ownership не підмінена припущенням                                                                         |
| Переривання migration     | Inspect/resume/repair узгоджують exact inputs і effects, без втрати final docs або silent overwrite                                                   |
| Межі доказів              | Source, scoped checks, delivered artifact та Runtime acceptance звітуються окремо                                                                     |

## Engineering contract clean-init v2

Статус: Root implementation decision за чинним user grant; contract ще не реалізований і не активований. Task 3 виконується окремим delivery cycle. Delivered 0.1.9 має лише legacy init/configure; він не доводить готовність нового clean init або повного product setup.

- Додати окремий `ConsumerCleanInitializationOperation/v2`; strict v1 codec/schema зберегти byte-identical. Наявність або відсутність історичних v1 effects не вгадується. v1 можна читати через його owner; v2 owner не застосовує, не перетворює і не знімає fence v1 pending.
- v2 лишає file-only archive для відомих managed integration outputs та старого `.agent/runtime-initialization.v1.json`. Project directory moves залишаються окремому configure owner. `.agent/work`, configured product stores, Source/wiki/evidence, metadata та чужий WIP не стають archive candidates.
- v2 `preserved` містить file observations `{type:'file',path,identity,size,sha256}` для project-owned integration outputs: `AGENT.sidecar.md`, а коли вони вже project-owned — також `AGENTS.md` і `docs/agent-instructions/documentation-policy.v1.json`. Binding включає ці before-images; preserved content не записується заново, а новий receipt описує фактичні bytes. Config не стає preserved замість requested initialization. Підготовка/init/resume потребують additive preservation seam; обхід post-init копіюванням не дозволено.
- `protected_paths` фіксує actual canonical product Source/wiki/work/evidence union і захищений work/coordination store; owner повторно derives/перевіряє його перед effects. Не підставляти guessed `docs`/`backlogs` замість configured paths. Fixed internal metadata guards діють окремо. Preserved paths можуть бути всередині protected roots; рух protected source або destination заборонений. Власний archive history — окрема exact destination namespace, а не дозвіл рухати його вміст.
- Один v2 immutable binding охоплює root/workspace/runtime/request, archive inventory/targets, preserved observations та protected union. Progress CAS прив’язаний до exact pending bytes. Data validation не надає authorization, maintenance, native completion або acceptance.
- 8 MiB обмежує весь serialized operation. `prepared.intent.maxLength` є додатковою межею поля, а не обіцянкою, що intent розміром 8 MiB поміститься в envelope: metadata, UTF-8 та JSON escaping зменшують фактичну місткість. Native owner звіряє кожну project identity з конкретним mapping; C1 count-check не підміняє цю перевірку.
- Підтримати Windows і Linux через наявні safe observation/move owners. Відсутня native capability дає точну відмову до effects; не послаблювати no-follow/identity/CAS.
- Init/config storage admission не вважається Host maintenance. До effect-owner writer окремо фіксуються фактичний maintenance verifier, lock ordering і scope quiescence. Caller boolean або operator claim не підміняє native fence. `.vida` product data не видаляються, щоб пройти gate-only seam.
- Public boundary — plan/inspect/apply/resume з правдивим help та package/native parity. Partial/ambiguous operation зберігає pending fence; generic retire/unfence для неузгодженого стану не додається. Terminal history retirement допустимий лише після verified completed initialization і current valid state.
- Реальний init цього repository чекає delivered Tasks 4–5: `plugin` не перейменовується побічно під час Task 3. Уже погоджені IDs/prefixes/mappings повторно не запитуються.

Task 3 перевіряється послідовними Source units: C1 — pure strict v2 codec/schema і contract tests; C2 — capture/protection/preservation та maintenance/admission seams; C3 — effect/recovery owner і public CLI/help/inventory. C1 не має filesystem effects і не є готовим clean-init owner. Жоден unit не відкладає required checks або scoped PATCH delivery після завершення всього Task 3.

C3 Source state (2026-11-05): strict plan/inspect/apply/resume/retire routes and
the existing gate-only refusal for `.vida` data are present. Apply remains bound
to legacy YAML capture. The final combined native fault/recovery case closed
PASS at1 executed case/28 assertions/0 failures; public apply/release/retire
closed at1/15/0. Raw JUnit corrects the retained Luna25 count without changing
the original report.
Four older full-path timeouts remain UNKNOWN, Root apply-01/02 remain FAIL, and
Root apply-03/guard-02 remain closed PASS. Root R8 four cases/46 assertions,
prepared two/38, publication/refusal two/58 and CLI seven/16 closed, as did
formatter, lint, four typechecks, AST, help/inventory and Vex update. The
[Task3 record](../../plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner)
binds receipts and independent review. Source stays0.1.9; installed runtime
0.1.11 is separate. Native Code closeout, delivery and installation remain open.

## Джерела і межі затвердження

- [Документи продуктів](../../research/configuration/product-documents.md).
- [Чинні path fields і consumers](../../research/configuration/runtime-paths.md).
- [OKF, wiki і напрямки вимог](../../research/configuration/wiki-and-requirements.md).
- [Typed keys та containment](../../research/work-items/jira-model.md).
- [Правило поточних тематичних записів](../documentation/current-state-records.md).

Затверджено цей дизайн з користувацькими анотаціями. [YAML-форма](project-config.proposed.yaml) узгоджується під час implementation planning; при конфлікті діють анотації. Окремо прямо дозволені temp acceptance, PATCH release/build, зовнішнє системне оновлення та [чистий init нашого repository](clean-init-authorization.md). Init/help мають описувати запити до користувача й усі кроки налаштування; виконані effects і Runtime acceptance ще потребують власних доказів.
