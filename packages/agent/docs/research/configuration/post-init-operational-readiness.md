---
type: Research
title: Після init — чинний флоу, ролі та операційна готовність Agent
---

# Після init: чинний флоу та операційна готовність Agent

Статус: досліджено й уточнено Root 2026-11-09 на запит користувача про вже
затверджений флоу, агентів та їхні дії. Чинний флоу відокремлений від
запропонованих перевірок і доробок; реалізація не розпочата.
Це supporting research, не нова системна специфікація,
Source grant, погоджений implementation plan чи Runtime acceptance.
Перевірено поточні файли репозиторію на HEAD
`4abdda0e1970c182a97f95a00bd19fd43fc7209f`, receipt та адресну наявність шляхів.
Чужі WIP і чинні дані не змінювалися. Тести та сценарії з ефектами не запускалися.

## Висновок та уточнення рекомендації

**Флоу розробки вже існує: запит → вибір workflow → synthesis → prewrite →
implementation → validation/test → delivery proposal.** У чинній cfg є одна
команда, 16 ролей, 10 профілів та 5 workflow. Відповідні selection, graph,
issue/report, ownership і receipt owners присутні в Source.

Попередня коротка відповідь недостатньо показувала цей наявний фундамент.
Наступний контур — **операційне підтвердження вже затвердженого флоу на
активній v2**, а не проєктування нового флоу чи нового набору агентів.
Спочатку провести одну звичайну задачу Agent через існуючий маршрут;
доробляти лише причинну прогалину, підтверджену цим проходженням.
Підготовка нової wiki/requirements не є універсальною передумовою: чинна
задача може спиратися на вже наявні канонічні документи через sidecar.

Бізнес-результат: користувач доручає невелику зміну конкретному продукту;
система зберігає роботу в належному місці, надає виконавцю правильні джерела,
проходить наявні перевірки й показує фактичний результат. Це продовження
відкритих наскрізних критеріїв [Task6](../../plans/runtime-project-model.md#task-6--temporary-end-to-end-acceptance-and-delivery).

## Власники затвердженого процесу

| Джерело | Що визначає | Межа |
| --- | --- | --- |
| [Runtime-first development](../../decisions/work-items/runtime-first-development.md) | Одна задача на цикл; почати через встановлений runtime; причинний repair за належної авторизації; звичайні hooks/PATCH/install; потім наступна задача | Реєстрація або INTAKE не означають завершення; коректна відмова не доводить дефект |
| [System specification](../../system-specification.md#authority-and-responsibilities) | Один Mastra graph owner, HostState для Work/Ledger/journal CAS, Cedar authorization і VIDA evidence/policy boundary | Специфікація описує контракт, а не сертифікує всі виконання |
| Installed `development-lifecycle` та `agent-allocation`, resolved через CLI 0.1.20 | Фактична Source authority, issue/report, recovery, незалежність, доставка і користувацьке acceptance | [Source lifecycle](../../../instructions/development-lifecycle.md) та [allocation](../../../instructions/agent-allocation.md) — навігаційні package owners; installed інструкції прочитані окремо |
| [Активна cfg](../../../../../agent-runtime.config.v1.yaml) | Команда, ролі, профілі, графи, routing, tools/egress та operational contracts | Ім'я файла історичне; поточний discriminator — `AgentRuntimeConfig/v2` |
| [Sidecar](../../../../../AGENT.sidecar.md) | Product roots, канонічні джерела, Root integration та збереження WIP | Навігаційний старий label `plugin` не переважає прийнятий v2 project identity |

## П'ять наявних маршрутів

Routing зіставляє team, project, canonical kind, intent, risk flags та labels.
`selectWorkflow` перевіряє дозволи команди, сортує bindings за зростанням
priority і обирає перший відповідний. У чинних bindings priority — 10/20/30/40/50;
усі мають wildcard project/risk та порожній label filter. Довільний текст
користувача не є прямим дозволом оминути typed selection і admission.

| Workflow | Kind + intent | Послідовність за графом | Attempts / assurance |
| --- | --- | --- | --- |
| `information_research_light` | research + information_research | documentation/code/platform research паралельно → synthesis | 1 / research_light |
| `implementation_new` | feature/pbi/story + implementation_new | research → synthesis → prewrite → develop → validators → tests → delivery proposal | 3 / code_full |
| `implementation_change` | feature/pbi/story/task + implementation_change | research → synthesis → prewrite → develop → validators з regression lens → tests → delivery proposal | 3 / code_full |
| `bug_fix` | bug + bug_fix | diagnostics/code research → synthesis → prewrite → fix → regression tests → validators → delivery proposal | 3 / bug_focused |
| `task_execution` | task + task_execution | synthesis → prewrite → develop → focused correctness/requirements → tests → delivery proposal | 2 / task_focused |

Для new research додатково є requirements lane; security/data research
умовний. Change research не містить окремого requirements researcher, але
подальша requirements validation залишається. Звичайний TASK не запускає
research автоматично: його synthesis споживає WorkItem. Якщо його даних
недостатньо, потрібен явний GAP/дозволений маршрут уточнення, а не вигадані
research результати чи приховане пропускання перевірок.

Порядок береться з `required_after` та графа; фізичне розташування `develop`
перед `review_source_prewrite` у YAML не означає виконання до prewrite.
Attempts — bound configured workflow; це не дозвіл повторити UNKNOWN effect.
Джерела: `workflow_bindings`/`workflows` у cfg;
[`selectWorkflow`](../../../src/config/runtime-config.ts#L2316),
[`compileDevelopmentWorkflow`](../../../src/orchestration/workflow-plan.ts#L130).

## Затверджені ролі та результати

Роль — відповідальність, профіль — модель/effort/tools, issued action —
конкретне доручення. 16 ролей не означають 16 постійно запущених процесів.
Root координує user intent, native session calls і інтеграцію; він не
підміняє HostState та не видає собі незалежне acceptance.

| Роль | Дія і потрібний результат | Профіль / межа |
| --- | --- | --- |
| `requirements-researcher` | Простежити намір і AC, повернути refs та конфлікти як ResearchResult | researcher; Source read-only |
| `documentation-researcher` | Перевірити official/configured docs, версії та суперечності | web-researcher; Source read-only |
| `code-researcher` | Знайти чинні symbols/callers/tests і невдалі підходи | codebase-mapper; без egress |
| `platform-researcher` | Перевірити platform/framework constraints за джерелами | web-researcher; Source read-only |
| `diagnostics-researcher` | Розібрати failures/logs і відокремити facts від root-cause hypotheses | codebase-mapper; без Source writes |
| `security-data-researcher` | Встановити authorization/privacy/data boundaries | researcher; умовний research lane |
| `research-synthesizer` | Об'єднати надані результати без вигадування фактів; DevelopmentTaskPacket та/або ResearchSynthesis за stage contract | researcher; не writer |
| `source-planner` | До writer: scope→AC, callers/scenarios, verification, rollback і budget dispositions; observation kind source_plan | architect; не пише reviewed Source |
| `security-prewriter` | До high-risk writer: root cause owner, affected callers, existing primitives, security gate; observation kind implementation_policy | reviewer-security; не post-write verdict |
| `developer-orchestrator` | Реалізувати immutable packet у точних owned paths; створити й виправити власні тести; ImplementationResult | executor; єдиний Source-writing профіль |
| `correctness-validator` | Перевірити behavior/root cause; fingerprint-bound verdict | reviewer-correctness; без Source writes |
| `regression-validator` | Перевірити affected callers і регресії | reviewer-correctness; окремий change lens |
| `requirements-validator` | Зіставити impl з acceptance та scope | reviewer-requirements; без Source writes |
| `security-data-validator` | Перевірити security/data після зміни | reviewer-security; умовний post-write lens |
| `tester` | Виконати дозволені packet/config verification commands, зберегти actual runner/results та GAP | tester; не бере production fix |
| `delivery-agent` | Підготувати fingerprint-bound deploy/do-not-deploy proposal після required receipts | delivery; proposal не дорівнює виконаній поставці |

Чинна cfg задає всім профілям `gpt-6-luna`. Executor і architect мають
reasoning max; researcher/web-researcher/codebase-mapper — xhigh;
reviewer-correctness/security/requirements, tester та delivery — high.
Перші два мають execution_mode standard, решта fast. Це configured settings,
не спостереження моделі кожного історичного виклику.

Tool policies: read_only — читання та web.search; developer додає
source.write/test.execute; validator — source.read/test.read; tester додає
test.execute; delivery має delivery.prepare/delivery.execute. Право в policy
не є approval конкретного ефекту. Egress `none` порожній; `official_docs`
обмежений configured hosts. Це логічні policy contracts, не обіцянка OS sandbox.
`ResolvedAgentProfile` прямо зберігає `enforcement_status: not_asserted`:
виконання enforcement доводиться окремо на actual boundary.

## Як проходить одна задача

| Перехід | Наявна дія/owner | Результат та межа |
| --- | --- | --- |
| Запит → контекст | Root + sidecar + validated ProjectContext + requirement routing | B→S→AC/evidence або конкретний GAP; typed material question лишається open без відповіді користувача |
| Контекст → admission | `admitLocalSessionWork` | Звіряє WorkItem/selection/project/scope/AC/intake/native session; створює керований work, а не дозвіл writer |
| Admission → wave | `MastraSessionBridge.start/resume`, Host producer reservation | Persisted Mastra suspension і узгоджені Host/journal bindings |
| Ready wave → issue | `MastraSessionLedger.issueWave`, CLI issue owner | Нові issue IDs і належні reservations перед native call; повтор уже issued wave відмовляє |
| Issue → фактичний agent | Root invokes native collaboration adapter | Видає точний role/profile/input; runtime CLI сам не запускає провайдера й не продовжує роботу після виходу сесії |
| Agent result → report | Root observation + journal/report owner | Зіставляє issue/action/source/settings; чекає результати всієї хвилі перед Mastra resume |
| Prewrite → Source | Host Source preflight + Cedar/VIDA + exact lease/CAS/user permission | Source plan для всіх Source задач; security-prewriter для high або security/data_loss/migration/high packet flags |
| Implementation → перевірки | Configured validators/tester + observed receipt owners | Поточні source/packet/fingerprint/issue joins; failed/stale/foreign proof не просуває stage |
| Proposal → доставка | Root + release/installer owners | Окремі formation/publication/install/readback; delivery-agent не проводить їх сам своїм proposal |
| Delivered → acceptance | Атрибутоване тестування користувачем | Work completion, установка і Runtime acceptance — різні стани |

Основні Source owners:
[`local-work-admission`](../../../src/orchestration/local-work-admission.ts#L77),
[`Mastra bridge`](../../../src/orchestration/mastra-session-bridge.ts#L799),
[`issueWave`](../../../src/orchestration/persistent-session-handoff.ts#L2120),
[`session action projection`](../../../src/orchestration/session-handoff.ts#L217),
[`observed validation`](../../../src/orchestration/observed-validation.ts#L56),
[`observed testing`](../../../src/orchestration/observed-testing.ts#L81).

Registry operational actions у cfg: `readConfig`, `readProjectContext`,
`selectWorkflow`, `buildDevelopmentTaskPacket`, `executeConfiguredWorkflow`,
`evaluateGovernance`, `runGovernedWrite`. Це окремий рівень від ролей агентів
і не перелік семи незалежних агентів. Mastra керує graph/snapshot, HostState —
Work/Ledger/journal і reservations, Cedar — authorization, VIDA — finite
tool/evidence checks. Другий scheduler або task-state owner не потрібен.

## Незалежність, відмови та evidence

- Research, planner, validator і tester не змінюють reviewed production Source.
  Developer verification не замінює independent tester чи Code review.
- Логічні views з одного виклику не стають незалежними агентами.
  Поточний `session-handoff.ts` явно допускає спільний tool invocation лише
  для correctness/requirements пари `task_execution/validate_focused` з
  окремими action/issue/results. Це не загальний дозвіл batching будь-яких ролей.
- Lifecycle окремо зберігає вимогу трьох fresh independent blind final reviews;
  дві focused views або кількість профілів її не замінюють.
- Prewrite observation не є post-write ValidationReceipt. Пізніший review
  не виправляє відсутній дозвіл до writer.
- `VidaValidatorVerdict/v1` і `VidaTesterVerdict/v1` — structured reports.
  Runtime звіряє їх із persisted observation і свіжою Source, а не довіряє
  слову PASS. `issueObservedTestReceipt` явно класифікує це як
  `caller_report_consistency`, `test_execution_verified:false`; це не native TestEvidence.
- UNKNOWN не дорівнює невиконанню. Expiry, interruption, повідомлення «done»
  чи новий operation ID не дозволяють повторити можливий ефект.
- Конфігурація ролі, membership у продукті та queued intent не дають Source
  authority. Потрібні actual admission, відповідний live owner і policy decision.
- Зміна in-scope Source скасовує пов'язаний proof; cfg/schema/bundle drift
  потребує підтриманого rebind. Не перезапускається весь lifecycle без причини.

## Що ще не доведено після init

| Спостереження | Висновок | Потрібна перевірка |
| --- | --- | --- |
| Є cfg, graph compiler, issuer, report та receipt code | Флоу існує і має реалізовані owners | Одна ordinary task на поточній delivered v2, без replay старих attempts |
| Локальний Markdown work store та operational WorkItem — різні контракти | Відсутність прямого caller у bounded пошуку не доводить непрацездатність флоу | Простежити той самий task ID від наявного record/admission шляху до result; не будувати bridge до встановлення прогалини |
| TASK graph не має окремого research stage | Це configured focused route, не missing-agent defect | Достатність WorkItem/packet для конкретної задачі; material GAP не приховувати |
| Develop new/change отримує явно selected lifecycle source; інші stage context refs не розгортають усі docs автоматично | Cfg knowledge registry не гарантує, що кожний агент прочитав BR/SR/AC | Inspect actual issued payload для одного сценарію: refs, content availability і правильні product roots |
| Official knowledge entries повертаються як unfetched_reference | Наявність URL не є проведеним web research | Зовнішні факти перевіряє відповідний дозволений research lane, якщо задача їх потребує |
| Receipt pending workspace binding має існуючий Host-owned bind route | Це підтриманий стартовий стан, не доказ невдалого init | Перевірити звичайне нове admission/binding через owner; не змінювати receipt вручну |
| Dynamic child tasks/loops/adaptive routing описані в Dynamic engine requirements | Це окремий target P2, а не доказ усієї реалізації | Окремий scope/acceptance після причинних P0; не блокувати ordinary TASK цією зрілістю |

Джерела: [`configured-context`](../../../src/orchestration/configured-context.ts#L138),
[`work store`](../../../src/work-items/store.ts),
[`runtime initialization`](../../../src/runtime-initialization.ts),
[`dynamic requirements`](../../system-specification.md#dynamic-engine-requirements).

## Встановлені факти

| Факт | Доказ поточного стану | Наслідок |
| --- | --- | --- |
| Модель v2 активна для agent/codex/powers | Live SHA256 cfg збігається з output hash у `.agent/runtime-initialization.v1.json`; provenance `adopted_existing` | Повторне погодження значень і повторний init не потрібні |
| Agent має docs/index, але не requirements і backlogs | Адресна перевірка `packages/agent/docs/index.md`, `docs/requirements`, `backlogs` | Не доказ блокування чинної задачі: використовувати наявні канонічні джерела й lazy store owner; матеріалізувати лише потрібну структуру |
| Codex docs/index, requirements і backlogs відсутні | Адресна перевірка `packages/codex/docs`, `docs/index.md`, `docs/requirements`, `backlogs` | Повну готовність Codex не встановлено активацією cfg |
| Powers docs/index і docs/work існують; requirements відсутній | Адресна перевірка `packages/powers/docs/index.md`, `docs/work`, `docs/requirements` | Існуючий store не є автоматично прийнятим сховищем нового runtime |
| Root source maps ще називають Codex як plugin | [Sidecar](../../../../../AGENT.sidecar.md), [product map](../../../../../docs/products.map.md) | Потрібне узгодження поточних навігаційних джерел через їхніх власників; історичні IDs та provider metadata не переписуються |
| Ініціалізатор перевіряє product roots і явні knowledge sources | `requireConfiguredDirectories`, `requireConfiguredKnowledge`, `validateGeneratedReferences` у [init-core.ts](../../../bin/init-core.ts) | У перевірених seams немає завершеної матеріалізації продуктової wiki та requirements; це підтверджує файловий стан |
| Модель і шляхи вже доходять до context | `applyProjectFields`, `buildProjectSetContext`, `productDefinitionPaths` у [project-context.ts](../../../src/config/project-context.ts) | Треба повторно використати чинний resolver, а не створювати другий |
| Stage context читає явно обрані knowledge source IDs | `configuredContextForStage`, `buildConfiguredContext` у [configured-context.ts](../../../src/orchestration/configured-context.ts) | Передавання продуктових BR/SR/AC через звичайний task flow потребує окремої наскрізної перевірки; сама cfg-карта каталогів цього не доводить |
| Work-item механіки вже існують | `createLocalWorkItem`, reclassify/reparent/resolve та журналювання у [store.ts](../../../src/work-items/store.ts) | Не потрібна друга task database або новий механізм нумерації |
| Store створює службову структуру через власний owner | `ensureOwner`/`applyOperation`, зокрема `ensureDirectoryAsync`, у тому самому store | Відсутній backlogs до першої роботи не доводить дефекту store; не слід вручну вигадувати його counter/index/owner |
| Зв'язок локального Markdown record з ordinary admission не підтверджений | Vex callers для createLocalWorkItem показали тестові callers; у перевірених bin та src/orchestration прямих викликів work-store API не виявлено; [local-work-admission.ts](../../../src/orchestration/local-work-admission.ts) приймає окремий WorkItem/v1 та scope/AC/intake | Це bounded integration/proof gap, не доказ відсутності будь-якого можливого SDK adapter. Спершу перевірити наявний шлях, потім виправляти лише причинну відсутню ланку |
| Receipt workspace binding pending | Поточний receipt; [bindRuntimeInitialization](../../../src/runtime-initialization.ts) має підтриманий Host-owned pending→bound перехід | Pending сам по собі не є помилкою. Потрібен доказ першої звичайної роботи на активній v2, без ручної зміни прапорця |
| Documentation policy не вмикає загальний gate | [policy](../../../../../docs/agent-instructions/documentation-policy.v1.json): required false, порожні canonical_roots/map_paths | Не можна видавати успіх Powers checker за перевірку Agent wiki або мовчки вмикати нові обов'язкові глобальні правила |

Семантика чинних paths, типів, ієрархії та збереження даних належить
[погодженому рішенню](../../decisions/configuration/runtime-project-model.md).
Початкові v1-спостереження у старіших topical research мають власні датовані
межі; вони не переважають активну v2 cfg та пізніше рішення користувача.

## Порівняння напрямків

| Напрямок | Користь | Обмеження | Пріоритет |
| --- | --- | --- | --- |
| Одна задача через чинний флоу Agent | Перевіряє операційну готовність уже затверджених roles/stages на активній v2 | Потрібні актуальні task/scope/AC та attribution; доробляються лише продемонстровані seams | Рекомендовано наступним |
| Спочатку весь накопичений quality debt | Поліпшує ширшу кваліфікацію | Сам по собі не створює wiki/workflow сценарій; обсяг великий | Вести окремими scoped задачами; причинні mandatory gates поточної зміни зберегти |
| Graph/GUI/Jira або одночасна інтеграція всіх продуктів | Можливі майбутні інтерфейси й derived navigation | Додає поверхні до ще не підтвердженого локального циклу | Після локальної вертикалі та окремого рішення |

Installed knowledge-graph instruction визначає граф як похідну навігацію та
дозволяє пряме читання канонічних джерел за його відсутності. Граф не є
передумовою цього контуру. Зовнішні трекери також не замінюють вимоги чи AC.

## Запропоновані доопрацювання

| Пріоритет | Доробка та бізнес-результат | Існуючий owner / залежність | Перевірний критерій завершення |
| --- | --- | --- | --- |
| P0, спочатку | Провести одну задачу Agent через існуючий task_execution | Чинний installed runtime, B/S/AC, admission, graph, native issue/report, exact Source owner | Спершу disposable consumer, потім погоджена мала реальна задача; synthesis → prewrite → implementation → validate_focused → test_task → prepare_delivery; task identity і results простежуються; policy/refusal не обходяться |
| P0, у цьому самому проходженні | Перевірити достатність source context і record/admission/result зв'язку | Чинні project-context/configured-context, work-items/store, local-work-admission/run | Actual issued payload містить потрібні refs/body; record та operational task не розходяться; існуючий шлях перевірений до рішення про новий adapter; missing critical source дає точний GAP |
| P0, критерій завершення | Закрити потрібну доставку та спостереження результату | Existing Host binding, Code/test, release/install owners і runtime-first decision | Перевірки та виконані effects мають свої докази; PATCH/install за контрактом self-development; повтор/restart не дублює ефекти; user Runtime acceptance окремо |
| P1, або причинна залежність поточної задачі | Read-only readiness та current source-map reconciliation | Чинні cfg/context/inspect owners; Root sidecar та derived map ownership | Видно різницю між configured/implemented/executed/delivered; stale plugin label не вибирає поточний продукт; aliases/provider/history збережені; відсутній folder не стає blanket execution gate |
| P1, коли потрібна сценарієм | Керована мінімальна wiki та навігація requirements/research/decisions | Existing safe-filesystem/configuration owners і чинні canonical docs | Лише погоджені відсутні структури; точне збереження наявних файлів; ідемпотентність і refusal на drift/symlink; BR/SR/AC не вигадуються; новий загальний documentation gate не вводиться |
| P1 | Зрозумілий operational status і діагностика | Наявні receipt/progress/inspection, без нового паралельного state engine | Окремо видно «cfg активна», «структура присутня», «робота допущена», «результат перевірений», «доставлено»; concrete refusal показує власника/причину/наступну дозволену дію; минулий UNKNOWN не стає новим FAIL або PASS |
| P1 | Кваліфікація причинних recovery/quality seams | Незмінні TESTING budgets, current task inventory та targeted faults | Для зміненого контуру перевірено відмови, concurrent ownership, stale input, crash/lost ack, resume, Windows filesystem; coverage/CRAP/correspondence/manual mutation звітуються фактично; історичні 5s/2s та full-suite gaps не закриваються за назвою focused PASS |
| P2 | Product-by-product rollout та закриття release debt | Codex owner setup; Powers B/S/AC/D2 owners; existing release/installer owners | Codex отримує власну підготовлену структуру та task proof; Powers інтегрується лише за його контрактом; старі release journals узгоджуються без переписування історії; installer recovery/offline proof мають власні спостереження |

Рекомендований перший bounded increment: один поточний TASK через затверджений
флоу Agent. Readiness/maps, wiki та adapter changes виконуються лише як окремо
визначені задачі або продемонстровані причинні залежності цього increment.
Не об'єднувати всі рядки таблиці в один writer issue чи rollout трьох продуктів.

## Що не входить у найближчий крок

- Масова міграція чи генерація нормативних BR/SR/AC із коду.
- Перенесення Powers corpus/work records, перейменування історичних IDs,
  Source permission з product membership або ручний reset DB/receipt.
- Новий task tracker, resolver, knowledge graph engine, GUI чи Jira/Azure API.
- Повторна реалізація вже доставлених Task1–5 чи повтор завершеного adoption.

## Межі доказів та наступне рішення

Дослідження спирається на current-source читання, Vex discovery/callers,
розбір чинної cfg, CLI resolution installed інструкцій, попередній cfg/receipt
join і адресні filesystem observations. Tests, build, public
work creation/admission, graph build, provider calls та Runtime acceptance не
виконувалися. Тестові callers не є доказом production integration; відсутній
каталог не доводить непрацездатність lazy store. Пропозиція не видає Source
authority і не вмикає documentation gate.

Це дослідження не переатестовує історичні runs чи всі п'ять workflow.
Current role/stage/operation counts отримані з активної cfg; execution claims
обмежені читанням Source. CODE-TOOLING.md у корені відсутній; discovery
виконано через Vex, точні spans — через LeanCTX. Нові агенти, Native Work,
provider calls, tests або live-state mutations для цього звіту не запускалися.

Після вибору bounded increment потрібні його точний B→S→AC контракт,
scope/callers/scenarios, потрібна незалежна prewrite перевірка і справжня
Source issuance перед реалізацією. Поточний стан і пріоритетна пропозиція:
[canonical queue](../../next-actions.md#proposed-next-contour).

Пов'язані документи: [wiki та requirements](wiki-and-requirements.md),
[product-documents](product-documents.md), [Task6](../../plans/runtime-project-model.md#task-6--temporary-end-to-end-acceptance-and-delivery),
[погоджена модель](../../decisions/configuration/runtime-project-model.md).
