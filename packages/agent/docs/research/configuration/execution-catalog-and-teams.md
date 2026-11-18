---
type: Research
title: Каталог виконання, три склади команд і повний development workflow
---

# Каталог виконання та повний development workflow

Статус: основну архітектуру погоджено з умовами 2026-11-09; уточнення
2026-11-10 про split/package/custom/metadata/product routing опрацьовано
Root як нову design revision. SWE-2 Flash і DeepSeek 4.1 Flash завершили
review: обидва APPROVE_WITH_CHANGES, 0 Critical/3 Important разом; Root
виправив findings. Користувач погодив revision 2026-11-10 і доручив реалізацію
та init цього repository зі збереженням налаштувань. Реалізація не почата.
Вимоги користувача зафіксовані в [рішенні](../../decisions/configuration/execution-catalog-and-teams.md).
Консиліум завершено: 8/8 read-only сесій (SWE-2 Flash і DeepSeek 4.1 Flash;
Type 2 V3/V2/V4 + Type 3) дали APPROVE_WITH_CHANGES, без PASS. Targeted
SWE/V3 і DeepSeek/V2 re-check також завершено з APPROVE_WITH_CHANGES:
0 Critical; 4 Important виправлено Root без нового кола консиліуму.
Користувач затвердив 10 рішень і політику final-state-only: без v2/v3,
без довгоживучого legacy; тимчасовий repair tool видаляється після міграції.
Це design approval with conditions, не implementation plan і не Runtime acceptance.

## Намір та рекомендація

Новий репозиторій отримує комплект виконання від потреби до перевіреної
поставки. Він може вимикати, налаштовувати й доповнювати елементи.
Рівень визначає склад команди, не глобальний ліміт паралельності.
Різні tasks/batches працюють незалежно за чинними admission/ownership/CAS.

**Package catalog → явна локальна cfg → validated execution plan
→ чинні Mastra/HostState/Cedar/VIDA owners.** Один compiler та engine;
новий scheduler або паралельний tracker не створюються.

## Відновлені домовленості та поточна реалізація

- [Dynamic engine requirements](../../system-specification.md#dynamic-engine-requirements),
  epic `EPIC-CONFIGURABLE-AGENT-SYSTEM-001`, визначає typed blocks,
  dependencies/joins, gates, child identity, loops, allowlisted routing,
  persisted decisions, restart та UNKNOWN/no-reissue.
- [Збережений backlog](../../../../../.agent/work/vida-013-planning-20261002/BACKLOG-PRIORITIES-20261006.md#accepted-p2-boundaries)
  містить ті самі core/flow/child/routing контури. Це відновлені записи;
  дослівний первісний чат про три конкретні склади не знайдено.
- Чинні roles/profiles/teams/workflows та їхні owners описані в
  [дослідженні чинного флоу](post-init-operational-readiness.md).
- [Component codec](../../../src/config/project-configuration.ts) уже
  розділяє project/agents/flows; [layout selector](../../../src/config/project-paths.ts)
  обирає один формат без fallback. Це foundation, не готовність нової capability.
- [Compiler](../../../src/orchestration/workflow-plan.ts) і
  [validator](../../../src/config/runtime-config.ts) мають special cases
  конкретних stage/role/workflow IDs. Довільний YAML сам їх не усуває.
- [Existing-storage upgrade](../../../src/config/project-upgrade.ts) має
  явну відмову `legacyStorageOverlapExcluded=false`. Каталог не обходить її
  й не вимагає міграції БД лише заради нових налаштувань.

## Варіанти

| Варіант | Наслідок | Пропозиція |
| --- | --- | --- |
| Три hardcoded pipelines | Дублювання phases/gates; складні custom definitions | Відхилити |
| Live inheritance від package defaults | Оновлення пакета мовчки змінює consumer | Відхилити |
| Локальний catalog + один validated compiler | Явні зміни, відтворюваний план, reuse core | Рекомендувати |

## Складові package/custom і project routing

Підстава: пряме уточнення користувача 2026-11-10 — розбити agents.yaml,
явно відокремити template/custom definitions, додати metadata оновлень та
обирати flows глобально за kind і окремо для products. Це замінює попередню
Root-пропозицію трьох великих project/agents/flows документів, а не змінює
активний installed config. Final-state-only та чинні effect owners збережені.

### Фізичні компоненти та один manifest

Root порівняв файли на кожний entry і файли за п'ятьма видами definitions.
Рекомендація — bounded файли за видом: менше manifest entries, немає directory
discovery, але package/custom видно без читання body. Per-entry file tree
не додає потрібної цьому slice capability і не вводиться.

```text
.vida/
  project.yaml
  routing.yaml
  catalog/
    enabled.yaml
    package/
      roles.yaml
      profiles.yaml
      tasks.yaml
      teams.yaml
      workflows.yaml
    custom/
      roles.yaml
      profiles.yaml
      tasks.yaml
      teams.yaml
      workflows.yaml
```

Це 13 документів одного конфігу. project.yaml — єдиний manifest та owner
operational/product settings; він явно перелічує 12 components з canonical
relative path, stable file_id та SHA256 exact bytes. Довільні include/glob,
додаткові active каталоги, network lookup і fallback до agents.yaml/flows.yaml
відсутні. Duplicate IDs/paths, aliases, traversal, symlinks і unknown component
відмовляють. Наявний safe-reader/no-follow owner завантажує exact closure.
Empty custom files матеріалізуються як валідні entries: {}, а не шукаються
в альтернативному місці. project.yaml не містить власний self-hash; його
bytes разом з component pins входять у existing config-operation/Host binding.

schemas: VidaProjectConfig; ExecutionCatalogComponent з finite kind
roles/profiles/tasks/teams/workflows та origin package/custom;
ExecutionCatalogEnablement; ExecutionRouting. Composed AgentRuntimeConfig
лишається in-memory projection existing codec, не другим writable store.
Проміжних v2/v3 та паралельних normal readers немає.

### Origin, refs, custom scope і редагування

Managed package files — локально materialized template snapshot конкретного
qualified package artifact. Update читає цей snapshot, не latest bundle defaults.
Їх body змінює тільки explicit package-update operation з currentness/consent.
Custom files належать репозиторію; package update зберігає їх exact bytes.
Користувач може створити власні roles, profiles, tasks, teams і workflows.

Identity = (origin, kind, id); serialized refs мають точну форму
package:role/source-planner або custom:profile/api-review. Singular kinds
role/profile/task/team/workflow фіксовані; id має формат
[a-z0-9][a-z0-9._-]{0,79}. Усі dependency refs qualified; bare-name lookup
і user-over-package shadowing заборонені. Однакові короткі назви у двох
origins допустимі, але це різні identities. Duplicate в одному namespace — error.

Редагування package definition утворює custom fork з повним copied body та
новим qualified ref; derived_from/base body digest записує provenance owner.
Це не live extends або partial patch. Preview показує exact rebindings;
без явно прийнятого rebind package teams/workflows не перемикаються на fork.
Fixed VIDA graph не змінюється під package ref; fork має custom workflow ref.
Будь-який custom effect проходить ті самі class/tool/Cedar/Host obligations.

Fork і rebind мають різні outcomes. Fork створює повний custom body та
provenance; без accepted rebind він disabled і не змінює чинний execution.
Rebind input називає old/new ref та exact route/rule reference paths, які
потрібно змінити. Owner будує typed reverse-reference graph і frozen diff.
Кожний definition ancestor на selected path, body якого потребує зміни,
копіюється повністю під новий custom ID; original package або custom body
не переписується. У копії міняється explicit child ref; next ancestor так
само fork-иться до repository-owned route. Несумісний class/contract/scope,
ID collision або неповний dependency path відмовляє, не створює alias.

Якщо workflow не містить ref, що змінюється, його не fork-ять механічно.
Приклад: source-planner role → package generic-standard team → route.
Rebind створює custom role і full custom team з потрібним task assignment;
new route вказує custom team, але зберігає незмінний package workflow.
Якщо package workflow прямо посилається на змінений role/team/task,
потрібний також full custom workflow і route.workflow_ref на цю копію.
Shared named route копіюється під новий route_id; тільки явно selected
global/product/kind rules переприв'язуються. Інші consumers старих refs
не перемикаються. Нова route — повний target, не runtime patch/inheritance.

Accepted diff включає всі new custom definitions, provenance, exact enable
switches для їх dependency closure, new route та selected rule changes.
Existing switches/package files та unrelated custom entries збережені.
Default creation не вмикає копії самостійно. Owner повторно перевіряє scope,
obligations/Cedar/independence і публікує один config-operation target під
CAS/pending/maintenance. Це один supported configure effect, не mutation
окремого package field або silent override. Lost ack має той самий owner.

Scope кожного entry: repository або explicit product_ids із validated project
model. Scope лише звужує придатність; не створює project identity чи rights.
Team/role/profile/task/workflow scope перетинається на selected Work product.
Окремий custom каталог на кожний product і другий project resolver не потрібні.

### File metadata і єдиний provenance owner

Кожний документ має meta.file_id, meta.revision, meta.created_at і
meta.updated_at. File_id стабільний; revision — positive integer, перевірений
порівнянням із last activated image під CAS. Created_at зберігається; updated_at
оновлює owning operation при зміні target file. Тimestamps мають RFC3339 UTC
і created_at <= updated_at; вони інформаційні, не доказ currentness/authority.
Пізніший timestamp не перемагає content conflict і не виправляє stale lease.

Managed file meta.source містить package_id, package_version та source_id.
project.catalog_source прив'язує цей source_id до qualified immutable package
artifact/manifest ref і його SHA256. Artifact hash не вбудовується у файли
всередині самого artifact: немає self-hash циклу. Усі п'ять managed файлів
походять з одного
verified package snapshot; змішування releases відмовляє. Значення задає
release owner, не вручну обраний наступний PATCH. Managed file timestamps
описують package-produced image; custom/settings timestamps — repository owner
image. Вони не є filesystem mtime чи доказом часу інсталяції. Package version та content
revision — metadata оновлення, не лінія сумісності schema v2/v3.

Entry provenance має один home:
project.catalog_provenance[origin][kind][id]. Запис посилається на source
file_id, body_digest та optional derived_from {ref, base_body_digest}.
File-level source/version належить file meta; entry record не дублює його
як окрему editable істину. project manifest pins exact file bytes; entry
body_digest виключає metadata та enablement. Self-referential digest немає.

```yaml
schema: ExecutionCatalogComponent
kind: roles
origin: custom
meta:
  file_id: custom-roles
  revision: 3
  created_at: '2026-11-10T09:00:00Z'
  updated_at: '2026-11-10T10:30:00Z'
entries:
  api-reviewer:
    scope: {product_ids: [agent]}
    actor_class: independent_validator
    capabilities: [correctness_validation]
    allowed_effects: [read]
```

Це proposed example, не write на реальний installed cfg або release receipt.
Enablement лежить тільки в catalog/enabled.yaml: explicit qualified ref →
boolean для кожного entry, обох origins. Definitions не дублюють enabled.
Перший init матеріалізує валідний routing.yaml з global.default_route на
generic-standard та enabled closure package generic flow, advertised teams,
roles/profiles/tasks і required assurance. Routing та enablement не порожні;
лише п'ять custom components можуть мати entries: {}. Root пропонує default
completion_profile source_only, якщо setup не запитав інший явний outcome:
usable baseline не потребує вигаданого deployment target. Explicit deployment
потребує configured/qualified target або дає input_required/refusal, а не
silent downgrade. Fixed VIDA route/Extended створюється за explicit setup для
допустимого Agent framework product/target; до цього package VIDA definitions
доступні для inspect, але не видаються за активну delivered route.
Fresh-init qualification мусить виконати strict load → default resolve →
enabled closure → compiled plan для declared product/kind без custom entries.
Package update не змінює existing local switches. Нові package entries
пропонуються disabled до explicit enable;
новий custom entry також потребує explicit switch. Malformed disabled entry
не приховується від strict validation. Advertised routes/levels повинні мати
enabled dependency closure; disable referenced entry потребує atomic reroute
або відключення залежних routes, не silent fallback.

### Package update і custom preservation

Update owner звіряє previous package snapshot, current manifest/files та
incoming qualified artifact. Це three-way currentness/disposition, а не
довільний merge managed body з user edits. Змінений вручну managed snapshot
дає conflict; owner пропонує explicit custom fork/rebinding, не overwrite.
Custom bytes і existing enabled values не переписуються package update-ом.
Нове incoming managed body змінює тільки package namespace. Втрачені package
IDs, broken custom dependencies, class/contract incompatibility, missing
baseline або modified managed bytes блокують activation до exact disposition.
Removing retired refs із enablement/routes/custom definitions — явний diff,
не ігнорування orphan references. Derived custom fork отримує advisory при
зміні свого base; його body не оновлюється без explicit прийняття.
Security-floor checks можуть відмовити unsafe flow; мовчазного виправлення
або успадкування permissions немає. Unknown update effect лишає fence.

### Workflow routing за work kind та product

routing.yaml — єдиний owner routing rules. Definitions workflows не містять
конкуруючих workflow_bindings; products не зберігають другі copies цих rules.
Він містить routes (named complete targets), global default/by_kind і optional
product default/by_kind. Kind IDs читаються з чинного enabled work-item catalog
(task/pbi/bug наведені як приклади); project IDs — з validated product model.
Unknown/disabled kind або foreign product відмовляє до fallback.

Final routing input / admission boundary: ValidatedRoutingInput містить
work_id/attempt, canonical_kind, exact admitted project_ids, optional requested
route_id та requested execution_level. Canonical kind — business work-item kind
із catalog, не stage kind/flow ID. Project set надходить від validated Work
owner, не виводиться з cwd, provider або переліку змінених файлів. Старий
WorkItemSelection.kind/project замінюється canonical_kind/project_ids у final
selection contract; первісний business project_id у Work лишається bound до
admitted identity. Немає другого selection input з незалежними значеннями.

Доля інших current Work dimensions визначена явно:
- intent зберігається як typed Work intent (information_research,
  implementation_new, implementation_change, bug_fix, task_execution), але
  не обирає workflow. Один product/kind із new/change отримує той самий route
  без explicit іншого allowed route. Registered intent_is може вибрати
  допустиму внутрішню branch обраного graph, без обходу mandatory gates.
- risk_flags зберігаються raw; canonical lifecycle risk обчислює/перевіряє
  trusted Host. Вони визначають obligations/prewrite/security checks, не flow
  або team level. High risk не викликає silent reroute/level escalation.
- labels зберігаються як Work/context metadata, не routing selectors і не
  permission. Нова label-based route/довільний predicate не додається.
- Caller-supplied team/team_id не є final admission input: такий extra field
  strict schema відхиляє. Team отримується лише з selected route/level.
- Старий workflow_binding.priority/intent/risk/label/team filtering видаляється
  з final routing; ordinary Host scheduling priority тут не змінюється.

Intent, raw flags, labels, actual risk і resolved selection входять у immutable
Work/packet/context bindings; «не routing input» не означає «не перевіряти».
Змінений intent/flags/labels не приймається за старий frozen input при report/
restart. Caller metadata не переписує canonical Host risk або Source rights.
Repair inventories старі bindings: різні targets за intent/risk/labels/priority
не колапсуються автоматично в один kind route. Потрібні explicit owner
disposition/rebinding, configured named routes або supported internal branch;
непредставлений binding conflict блокує activation. Old issued Work/history
не переписуються; final runtime не містить legacy filter fallback.

Кожний route — цілісний target: enabled, workflow_ref, teams_by_level,
default_level, completion_profile і delivery_target коли потрібний. Усе
qualified. Missing field не запозичується з менш specific route. Default
level мусить бути у teams_by_level; team declares matching level і compatible
allowed_work_kinds/products. Source/effect/independence floor не змінюється.

Resolution для одного product:
1. Explicit route_id у Work, лише коли його прийняття дозволив фактичний
   existing owner та product policy; declaration сама не є permission.
2. products[product_id].by_kind[kind].
3. products[product_id].default_route.
4. global.by_kind[kind].
5. global.default_route.

Absence означає успадкування наступного tier. Null, duplicate YAML keys,
ambiguous rule або selected disabled/missing route — refusal, не fallback.
Product default перекриває global kind rules для всіх kinds цього product;
для часткового override треба задати лише product.by_kind. Routes не
вибираються порядком файлів чи timestamp-ом. Global default обов'язковий.

Після вибору route immutable execution_level = explicit Work level або
route.default_level; team_ref = route.teams_by_level[level]. Відсутній level
відмовляє, не auto-escalates. Completion profile/target беруться з того самого
route; override потребує explicit complete configured route, не patch fields.
Resolved route_id + rule tier/product/kind + route digest + qualified
workflow/team refs + level + completion target входять у existing packet/
attempt/journal та effective plan. Result/issue/restart перевіряють їх binding.

Для Work із кількома bound products resolver оцінює кожний product. Без
explicit allowed common route усі повинні отримати той самий route_id та
effective target; інакше refusal і Root розбиває request на disjoint Works
зі збереженням початкової human attribution. Однаковий route з різних tiers
допустимий: packet зберігає sorted per-product tuples {product_id,
canonical_kind, rule_tier, rule_key, route_id, route_digest}, і кожний tuple
звіряється при report/restart. Selected target/level/team мусять збігатися;
однакова назва route не приховує різні target bytes. Product не вгадується з cwd,
file path, provider tenant або ID. Новий WorkGroup/scheduler не створюється.

```yaml
schema: ExecutionRouting
meta:
  file_id: repository-routing
  revision: 1
  created_at: '2026-11-10T09:00:00Z'
  updated_at: '2026-11-10T09:00:00Z'
routes:
  generic-standard:
    enabled: true
    workflow_ref: package:workflow/generic-development
    default_level: standard
    teams_by_level:
      compact: package:team/generic-compact
      standard: package:team/generic-standard
      extended: package:team/generic-extended
    completion_profile: source_only
  agent-api:
    enabled: true
    workflow_ref: custom:workflow/api-development
    default_level: extended
    teams_by_level:
      extended: custom:team/api-extended
    completion_profile: deployment
    delivery_target: vida-runtime
global:
  default_route: generic-standard
  by_kind:
    task: generic-standard
    pbi: generic-standard
    bug: generic-standard
products:
  agent:
    by_kind:
      bug: agent-api
```

Приклад після explicit custom/deployment setup: Agent bug → custom api
flow/Extended; Agent task та інші products без override → global generic
source_only. Fresh seed не містить agent-api override без custom setup.
Custom workflow/team/roles/profiles у цьому
фрагменті мають бути окремо fully defined і enabled, інакше validation refuse.
Немає припущення, що наведений deployment adapter вже qualified.

### Atomic publication, activation і потрібні checks

Усі 12 components + project manifest входять у один existing configuration
operation before/target closure. Intent/pending reader barrier передує effects;
owner пише components і root manifest, звіряє afterimages/receipt та лише тоді
прибирає barrier. Хоч manifest фізично пишеться останнім, від half-image
захищають pending/maintenance і digest checks, не порядок write сам по собі.
Lost ack → той самий operation/generation/result lookup; third state UNKNOWN.
Не додається другий activation ledger, settings store або normal loader.

Configure preview/fork/enable/route/update готує exact diff під чинним owner;
manual edit active file дає digest drift і блокує current execution до supported
reconciliation. Timestamp не робить такий edit активним. No hot reload:
quiescence/rebind правила, immutable issued bodies та повний pending cutover
gate попереднього дизайну збережені. Empty custom files не перезаписуються
repeat init; package update не міняє repository routing без explicit action.

До Source потрібні exact codec/path/schema/resource/caller map і policy check.
Qualification: 13-file closure; unknown/missing/foreign/traversal/alias refs;
namespace duplicates/shadowing; custom scope/class/Cedar; timestamp vs revision/
digest; unchanged custom bytes/switches on update; removed-ID conflicts;
all five routing tiers, whole-route semantics, disabled-target refusal,
foreign kinds/products, multi-product conflict, level/team binding; interrupted
component/manifest writes, restart and lost ack; native package closure.
Попередній frozen plan PASS не поширюється на ці нові contracts автоматично.

## Модель каталогу

| Сутність | Що визначає |
| --- | --- |
| Role | Компетенція, відповідальність, supported task capabilities та заборони |
| Profile | Модель/effort, tools/egress, mutation scope; не дозвіл конкретного ефекту |
| Task definition — робоче завдання | Мета, inputs/context, деталізація дій, outputs, acceptance, effect і failure/recovery contract |
| Team preset | Склад учасників, mapping task → role/profile та independence constraints |
| Workflow | Task nodes, typed conditions, dependencies, joins і terminal outcome |
| Registered operation adapter | Фактичний Host/CLI/CI/deploy owner із permission, reservation, actual result та verification |

Task definition не додає бізнес-типів TASK/BUG/PBI. Це повторно використаний
крок; його instance зв'язується з чинними WorkIdentity/attempt/action.
Визначення має technical id/version, purpose, contracts, source refs,
інструкції, checks/AC, effect class та terminal outcomes. Instance додає
поточні scope/config/bundle bindings, inputs та observed result.
Instruction text не розширює capability і не надає permission.

## Повна цепочка для всіх рівнів

| Крок | Завдання і результат | Gate |
| --- | --- | --- |
| 1. Intake | Встановити outcome, продукт, scope, delivery target і відкриті рішення | Material question блокує залежну дію; retrievable факти читаються |
| 2. Research | Вимоги/docs/code/platform/security факти та альтернативи | Facts, assumptions, conflicts та GAP відділені; джерела перевірені |
| 3. Business analysis | Business outcome, сценарії, межі й AC | B → AC та attributable рішення; код не замінює намір |
| 4. System analysis | API/data/effects, безпека, сумісність і failure states | B → S → C; reuse owners; material choice має decision owner |
| 5. Implementation plan | Draft packet, files/callers, порядок, checks і recovery | Packet sealed після test plan; незалежний prewrite до Source |
| 6. Test design | До коду визначити happy/refusal/boundary/recovery сценарії й oracles | План перевіряє observable behavior; не видається за execution |
| 7. Implementation | Змінити owned Source, створити/виправити тести й виконати focused checks | Actual authority, lease/CAS, один writer і preservation |
| 8. Independent verification | Tests/statics на стабільному candidate | Actual runner/process/outputs; failures/skips/UNKNOWN збережені |
| 9. Independent review | Correctness, requirements та applicable security/regression | Fresh independent contexts за policy; writer не перевіряє себе |
| 10. Correct and recheck | Причинний correction batch із actionable findings | Тільки affected proof invalidated; UNKNOWN не replay |
| 11. Release preparation | AC/docs, deploy plan, target/artifact, consent і recovery | Current final assurance і normal hooks; proposal не поставка |
| 12. Delivery execution | Через registered adapter сформувати/опублікувати/розгорнути candidate | Окремий дозволений ефект, actual invocation/result і target |
| 13. Delivery verification | Deployed version/artifact/resources і health/smoke | Фактична ціль; failed/unknown effect має supported recovery |
| 14. Closeout | Canonical task/docs, результат та gaps | Source/tests/review/delivery/install/user acceptance розділені |

Prod — явно обраний target зі своїм permission/adapter, не shell із YAML.
Для VIDA це native release/install/readback; для іншого продукту — його
registered deploy owner. Tool block може виконати delivery без LLM-ролі,
але не без authorization/result. Цей draft не дозволяє prod deploy зараз.

## Три різні склади generic команди

Рівні задають різний розподіл робіт, а не обіцянку загального числа 3/5/8.
Початкові 3/5/8 позначали спеціалізації, але не враховували обов'язкових
fresh reviewers; таку чисельність вилучено з рекомендації. Actual actor
instances виводяться з task graph, обраного preset і required assurance.
Повний actor plan видно до dispatch; паралельність налаштовується окремо.

| Рівень | Базовий склад | Повна цепочка |
| --- | --- | --- |
| Compact | A: аналітик-універсал; D: розробник; Q: QA; явний assurance roster | Research/B/S/plan згруповані за спеціалізацією A; test design/execution — Q; required reviewers мають окремі fresh instances |
| Standard | R: researcher; A: аналітик; D: розробник; Q: QA; V: reviewer; assurance roster | Research та review отримують власні спеціалізації; B/S/plan — A; незалежні gates не зливаються |
| Extended | R: researcher; B: бізнес-аналітик; S: системний аналітик; P: test designer; D: розробник; T: test executor; V: reviewer; L: delivery; assurance roster | Окремі business/system analysis, test design/execution та delivery preparation; додаткові фахівці лише за declared task input/output/join |

Team preset зберігає business members і явний `assurance_roles` mapping
implemented capability → available role/profile. Enabled зберігається тільки
у catalog/enabled.yaml. Це не permission pool: кожне
assignment потребує свого issued action та перевірок Host. Більший рівень
додає спеціалізацію; обов'язковий safety floor однаковий.

### Повний mapping робочих завдань

Літера в таблиці — спеціалізація, а не дозвіл використати той самий history
для незалежного review. Повторні issued stages не виконуються наперед одним
tool call. Об'єднання кількох read-only task definitions можливе лише якщо
compiler явно створив один block із повним input/output contract до issue.

| Кроки | Compact | Standard | Extended | Instance/effect межа |
| --- | --- | --- | --- | --- |
| 1 intake | Root/A | Root/A | Root/B | User decisions та admission лишаються у своїх owners |
| 2 research | A | R | R + явні domain specialists | Distinct research outputs; один aggregator зберігає refs/конфлікти |
| 3 business analysis | A | A | B | Власний AC/trace artifact; не Source permission |
| 4 system analysis | A | A | S | Contract/effect/recovery artifact |
| 5 plan + prewrite | A author + fresh planner | A author + fresh planner | S author + fresh planner | Planner відокремлений від автора пакета і writer; security row нижче |
| 6 test design | Q | Q | P | Scenarios/oracles; production Source не редагується |
| 7 implementation | D | D | D | Один Source writer на exact owned paths |
| 8 tests/statics | fresh Q | fresh Q | fresh T | Independent of D; лише configured verification |
| 9 review | fresh A/Q profiles | fresh V/A profiles | fresh V/B + security profile | Required roles/cardinality нижче; не self-review |
| 10 correction | D + affected verification actors | D + affected verification actors | D + affected verification actors | Same causal scope; new changed-byte proof, не replay UNKNOWN |
| 11 release preparation | L з assurance roster | L з assurance roster | L + assurance reviewers | Лише delivery-agent/delivery profile готує DeliveryInstruction; required final assurance окремі |
| 12 execute delivery | trusted adapter | trusted adapter | trusted adapter | LLM лише готує input; effect owner виконує |
| 13 verify delivery | Q read-only verifier | Q/V read-only verifier | T/V read-only verifier | Окремий observed target check, не самооцінка publisher |
| 14 closeout | Root/A | Root/A | Root/L | Derived task/docs update; user Runtime acceptance окремо |

### Cardinality та independence: deterministic rules

Для generic Source-producing run safety floor визначається effect/risk і
чинною lifecycle policy, а не назвою flow або рівнем. Proposed finite rules:

| Gate | Low/medium Source | High або high/security/data_loss/migration flags | Вимога до actor |
| --- | --- | --- | --- |
| source_plan | 1 | 1 | Fresh read-only planner, не packet/plan author або writer |
| implementation_policy | 0 | 1 | Fresh security prewriter; до reservation/Source issue |
| focused correctness | 1 | 1 | Read-only, independent of writer |
| focused requirements | 1 | 1 | Read-only, independent of writer |
| focused security/data | 0 | 1 | Fresh security validator; prewrite не замінює його |
| independent tester | 1 | 1 | Окремий від writer test execution actor |
| final assurance, коли вимагає lifecycle | 3 review + 3 reverse actions | 3 review + 3 reverse actions | 3 fresh distinct agents/histories; reverse повертається кожному його reviewer |

Current `final-assurance.ts` має саме 6 actions: три review та три reverse,
а не шість нових незалежних reviewer agents. Його `excluded_actor_ids`
відсікає writer/focused actors; existing owner перевіряє ці identities.
Усі застосовні reverse/CLEAR/documentation gates зберігаються. Валідний
N/A можливий лише за явним чинним policy contract, не рішенням team preset.

У new generic route correctness/requirements не зливаються в один tool call.
Вузький чинний дозвіл sharing для task_execution/validate_focused не
переноситься у кінцевий generic route; після repair старий dispatch видаляється.

Compiler будує symbolic actor slots для кожного required assignment,
звіряє role capabilities, profile tools/mutation scope, enabled refs і
independence constraints, тоді рахує actual required instances. Свідомо
спільний profile допустимий; спільний actor/history — лише там, де owner
явно дозволяє. При issue symbolic slot зв'язується з observed native identity.
Відсутність enabled сумісного actor/profile дає dependency/gate GAP до issue.
Жоден слот не береться з вимкненого каталогу або недозволеного provider.
Екран plan показує склад, окремі guards, actual instances та причини additions;
mandatory guards не маскуються маркетинговим числом малого preset.

Рівень не вимикає Source planner/security/final assurance. Якщо дозволений
склад не забезпечує required незалежність, compile відмовляє і показує
потрібну роль або допустимий більший preset. Немає silent auto-enable чи
auto-escalation. Три fresh blind final reviews не стають одним викликом
через Compact. Configured/issued/observed settings залишаються окремими.

Паралельність — незалежний execution/resource параметр. Різні tasks/batches
мають свої admissions. Exact shared write paths серіалізує чинний FIFO/claim
owner; загального ліміту агентів для репозиторію цей design не вводить.
Same-request contours зберігають attribution; новий WorkGroup не додається.

## Контракт фактичної доставки та recovery

`DeliveryInstruction/v1` — намір/план. `DeliveryReceipt/v1` має status
approved/feedback/rejected і сам по собі не доводить виконання deploy.
Значення цих DTO не переосмислюються. Generic terminal delivery потребує
`DeliveryEvidence/v1`: typed read-only projection на records adapter owner.
Вона не є другим журналом ефектів і не приймає caller approval за authority.

| Частина proposed projection | Обов'язкові bindings/evidence |
| --- | --- |
| Work/run | WorkIdentity, attempt, action/issue, actor/session attribution, current scope/config/bundle/plan refs |
| Candidate | implementation fingerprint; qualified artifact identity/version; delivery instruction ref; immutable asset refs |
| Target | repository/product, adapter id/version, explicit environment/target identity, operation owner/id та generation/CAS ref |
| Permission | Actual owner-validated authorization/consent reference і policy decision; JSON declaration не створює permission |
| Invocation | Існуючий tool/CI/job/deployment handle, observed invocation/result refs, process/service terminal status; без env secrets |
| Verification | Окремий observed readback того самого target/candidate; exact artifact/version/resources та declared health/smoke results |
| Recovery | Current owner operation state/ref, permitted next operation та retained failure/UNKNOWN; не новий competing state owner |

Projection має finite outcomes: `verified_delivered`, `failed_known`,
`no_effect_proven`, `unknown`. Owner command success без target verification
не є verified_delivered. Missing receipt або unobserved timeout дає unknown,
а не no_effect_proven. Failed/unknown не задовольняють terminal gate.

Після lost acknowledgement спочатку inspect/reconcile того самого owner
operation і повернення вже persisted result; не повтор deploy. UNKNOWN
фенсує залежні effects, доки owner не встановить terminal/no-effect або
підтримане recovery. Rollback дозволений лише якщо target adapter має
qualified restore operation і його окремий authorization; успішний rollback
не видається за успішний desired deploy. Протилежний/третій стан лишає fence.

Для VIDA projection посилається на CI/native formation/publication/
installer/readback records qualified executing bundle. Історичні receipts
зберігаються як evidence; цей каталог не створює ще одну лінію їхніх schemas.
Інший deploy adapter мусить реалізувати той самий evidence
мінімум та qualify його до activation. Наявність repo catalog entry не
означає готового production adapter. Відсутній owner/qualification дає GAP.

Task definition приклад: independent-test має input packet + candidate +
test plan; перевіряє їх currentness; виконує лише обрані configured commands;
зберігає runner, process close, raw result/JUnit та skipped/failed/unknown;
не редагує Source; повертає typed результат із refs і передає product defect
writer/Root. Report consistency не перейменовується на native execution proof.

## Generic та fixed

- `generic-development`: один blueprint повної цепочки, параметризований
  team preset і registered task definitions; не три engine implementations.
- `vida-development`: наш fixed graph із VIDA Source/Code/test/final
  assurance/native delivery/install gates, на тих самих task/effect owners.
- П'ять existing workflow не обираються для нових робіт. Перед cutover їхні
  active attempts мають supported terminal/suspended disposition без прав
  продовження; UNKNOWN блокує cutover. Історія лишається immutable evidence,
  не executable legacy graph. Package bindings ведуть на два кінцеві flows;
  старі requests не переприв'язуються і не відтворюються під новим graph.
- Custom role/profile/task/team/workflow отримує custom qualified identity.
  Зміна fixed graph — explicit custom copy/rebind, не заміна package baseline.
  Custom workflow selectable лише через explicit enabled binding після всіх
  тих самих obligation/independence/adapter checks; це не повернення п'яти
  legacy defaults і не третій package workflow.

## Package та repository ownership

Package містить versioned definitions і generic/fixed presets. Перший init
матеріалізує їх в обрану локальну cfg з baseline provenance. Локальні values
після цього явні; package update не підмішує defaults на кожний запуск.
Повторний init не перетирає custom entries.

Enabled/disabled у catalog/enabled.yaml діє repository-wide для обох origins
roles/profiles/tasks/teams/workflows. Вимкнений запис зберігається й
перевіряється strict schema, але вилучається
з selectable bindings, allowlists, effective graph та new assignments. Увімкнений
workflow з missing/disabled dependency не активується; повертається точний
dependency path. Вимкнення guard не скасовує required gate. Product selection
не розширює permissions. Custom definitions мають supported contracts і
finite capabilities; новий effect/tool потребує registered implementation.
YAML не виконує довільний код, імпорт або shell.

Package update — explicit three-way currentness/disposition previous package /
current local components / incoming artifact за split contract вище. Package
body і custom body мають різних owners: modified managed bytes — conflict,
custom body package update не переписує. Entry provenance має один home
project.catalog_provenance[origin][kind][id]; source package/version належать
referenced file meta. Missing baseline, retired referenced ID або incompatible
contract/class блокують activation. Custom IDs не видаляються автоматично.

Enabled — local-only selection map у catalog/enabled.yaml, не definition body.
Перший seed задає explicit selections; update зберігає existing switches і
пропонує нові entries disabled. Body hashes не включають file metadata чи
enablement; full cfg/component/plan bindings включають exact files і switches.
Local disable плюс incoming package body update не є body conflict.

Security update показує advisory і exact diff; мовчазного overwrite немає.
Owner приймає виправлення або явно вимикає affected flow. Required safety
floor відмовляє unsafe compile, навіть якщо локальний override збережений.
Run фіксує effective definitions/profiles/graph до issue; старі issued bodies
не змінюються. Disable не скасовує native request або можливий effect.

## Persistence і сумісність

Кінцевий cfg має один 13-file manifest layout із section «Складові package/custom
і project routing». agents.yaml/flows.yaml не стають active umbrella або aliases.
Root monolithic YAML — лише input temporary repair. Identifiers без version
ladder: VidaProjectConfig, ExecutionCatalogComponent, ExecutionCatalogEnablement,
ExecutionRouting; один composed AgentRuntimeConfig. Package/catalog revision
і content digest зберігаються;
aliases до старих discriminators, dual-read та directory fallback відсутні.
Це конкретизація final-state-only, а не твердження про чинні readers.

**Final-state-only.** Немає перехідних `v2`/`v3` successor-схем і немає
довгоживучого legacy. Каталог додається в один кінцевий стан; існуючі
v1/v2 документи є лише входами тимчасового repair tool. Repair tool має
owner-а, точні beforeimage/consent/CAS/maintenance та умову видалення;
після успішної міграції він і старі readers/schemas/fallbacks видаляються.
Не додаються dual-read, version matrix, compatibility shim або новий
settings store. Якщо для поля/контракту вже є свіжий successor або
замінник, старий шлях прибирається, а не підтримується паралельно.

Важлива поточна залежність: `project-paths.ts` обирає DB paths за cfg layout.
До activation цей owner має відокремити config-document layout від explicit
storage identities/paths. Repair зберігає фактичні Host/Mastra/ledger DB paths,
file/root identity та data; не зливає DB і не вмикає storage upgrade.
`legacyStorageOverlapExcluded=false` не змінюється заради каталогу. Новий init
використовує qualified storage owner; для старого Host відсутність доведеного
storage/opener boundary блокує activation, а не дозволяє обхід.

### Активація exact candidate та recovery

Existing configure plan/apply/resume owner і його pending namespace лишаються
єдиним owner config effects (`consumer-configuration-operation.ts`). Новий
кінцевий record має discriminator `ConsumerConfigurationOperation`, без alias
до старих `/v1`–`/v3`; старі журнали не отримують нової семантики. Це заміна
формату в тому самому owner, не новий operation framework або effect store.

План фіксує repository/workspace/root і DB identities; operation id/generation;
executing bundle/schema/catalog digests; exact before bytes/presence усіх cfg,
initialization outputs/receipt; exact target bytes; selected level/bindings;
current Work/Ledger/Journal CAS; owner-validated consent і maintenance refs.
Candidate digest охоплює цей frozen target, не caller path або версію рядком.

Apply повторно перевіряє currentness, native recorded-token maintenance,
quiescence, connection closure та exclusive admission. Intent записується до
effects у чинному journal. Pending barrier не знімається, поки всі components,
refs, initialization receipt і afterimages не перевірені. Half-published cfg
не читається як активний; окремого activation ledger/file не додається.

Після lost acknowledgement спочатку inspect persisted result тієї самої
operation id/generation. Exact completed operation повертає той самий result
без effects/нових прав. Якщо результат не terminal, лише той самий supported
resume звіряє кожний before/target state; третій стан або невідомий effect
залишає UNKNOWN і maintenance/pending fence. Нова apply/reissue заборонена
до owner terminal/no-effect reconciliation або qualified recovery. Restore
потребує окремо дозволеного exact-beforeimage owner; автоматичного rollback,
reset або downgrading bundle немає. Init reconcile викликає цей owner.

### Temporary repair та видалення старих шляхів

Root інтегрує bundle-owned atomic artifact-repair owner і кваліфікує його
перед будь-якою зміною active schemas. Він inventory/binds підтримані inputs,
backup refs, exact before/target, consent/CAS/maintenance та opener boundary;
не лікує foreign/malformed/UNKNOWN inputs припущенням. Immutable requests,
results, authorization bytes, history та provider identities не переписуються.
Active old attempts спочатку закриваються supported owner; новий admission
не успадковує їхніх rights. RuntimeInitialization/v1 зберігає зміст provenance;
потрібне нове binding/receipt утворюється чесно owner-ом, не підробкою старого.

Cutover має два checkpoints одного переходу: qualified repair на явно
заданому adoption cohort, потім final bundle. Це межа rollout цього cohort,
не глобальна вимога знайти всі installations перед formation. Видалення tool
дозволене після verified target/receipt на кожному declared target, відсутності
всіх pending/UNKNOWN operations та executable old attempts і negative checks
старого dispatch. Це включає repair, configure, initialization і bound old
operation/archive refs, а не лише repair journal.

Перед видаленням old reader чинний `inspectConsumerConfigurationOperation`
на кожному target має повернути `no_pending`. `configuration_pending`,
`legacy_initialization_pending` та `unknown_pending` блокують cutover. Лише
той самий owning bundle/operation може виконати supported resume/reconcile,
довести terminal/no-effect disposition і штатно прибрати pending slot зі
збереженням immutable archive; після цього повторна inspection має дати
`no_pending`. Pending/UNKNOWN у bound archive refs також блокують removal.
До reconciliation зберігаються maintenance/pending fence та потрібний old
reader у repair checkpoint; final owner не вгадує старий record і не видаляє
його, щоб обійти barrier. Qualification містить negative fixture для кожного
з трьох pending statuses і pending/UNKNOWN archive, unchanged-state oracle,
а також positive terminal-disposition → no_pending → removal case.

Final bundle видаляє monolithic reader, V1|V2 config adapters,
old split discriminators, layout fallback/WeakMap routing, п'ять legacy flow
dispatch paths і сам repair tool. Raw backups/history зберігаються як opaque
evidence, не як fallback для resume. Невідомий старий consumer не переходить
непомітно: final CLI відмовляє і не активує його; збережений hash-bound repair
checkpoint є recovery artifact, не встановлений паралельний runtime reader.

Редагування готує draft, а activation не є hot reload. Чинні owners
вимагають допустимого quiescent/rebind стану; live/unknown effects блокують
активацію. Issued requests/results не переписуються. Hot per-run config
epochs потребували б окремого контракту, вони не оголошуються готовими.

### Єдиний persisted каталог і executable projection

Raw definitions мають один дім за (origin, kind): package/custom component
roles/profiles/tasks/teams/workflows. Окремі files routing та enablement
належать repository. Project містить operational/product settings, exact
12 component refs і єдину catalog_provenance[origin][kind][id]. Enabled не
дублюється у definition, routing rules не дублюються у workflows/products.
Ті самі definitions не дублюються в двох writable місцях.

Parsed catalog і resolved executable graph — різні typed values. Compiler
створює immutable in-memory projection; це не другий persisted config.
Full raw config/component binding включає definitions і enabled metadata,
execution plan додатково зв'язує selected resolved graph. Старий reader не
отримує новий стан під чужим discriminator; після міграції він видаляється.
Невідомі versions/fields відмовляють; disabled entries не стають способом
приховати malformed data.

## Compiler та виконання

1. Safe read єдиної selected cfg і strict schema identity check.
2. IDs/refs, enabled dependencies, assignments і supported contracts.
3. Розгортання selected task graph/team та finite typed conditions.
4. Reachable producers/inputs, mandatory gates, independence і terminal
   delivery evidence; назва workflow не є способом обходу.
5. Immutable effective plan з actual actor instances та bindings.
6. Existing Mastra start/suspend/resume; Root викликає native agents після
   issue; HostState зберігає reservation/Work/Ledger/journal CAS.
7. Report/receipt owners приймають observed results; UNKNOWN не reissue.

Special cases за legacy flow names замінюються finite package-owned
obligations. Старий dispatch видаляється після repair. Це VIDA validation,
не user rule language; editable cfg не може послабити required obligation.

Mastra має typed sequential/parallel/branching і joins; `.branch()` може
виконати кілька true branches. Single-choice conditions перевіряються до
effects: [офіційний control flow](https://mastra.ai/docs/workflows/control-flow).
Library capability не доводить VIDA qualification; provider effects і
permissions залишаються на чинному Host boundary.

## Реалізація після погодження

### Final contracts і owner matrix

Це Root technical choices для implementation plan; не твердження, що ці
поля вже є у Source. Старі strict DTO не приймають їх до qualified cutover.

| Value / artifact | Мінімальні поля та єдиний owner |
| --- | --- |
| Work admission | Immutable route/rule-tier/product/kind + qualified workflow/team + `execution_level: compact / standard / extended`, `completion_profile: source_only / artifact / deployment`; explicit allowed route > product kind > product default > global kind > global default; explicit level або chosen route default; ambiguous/unknown відмовляє. Fixed VIDA route вимагає extended |
| Effective catalog | `AgentRuntimeConfig` composed одним existing codec з 13 documents; project має operational/product/storage bindings і manifest/provenance; 5 package + 5 custom component files, enabled map та repository routing; немає umbrella або shadowing |
| Frozen plan | Selected workflow/team/level, graph/contract/catalog/component digests, actor slots, obligation set, completion target і scope; inline у current packet та existing Host attempt/Mastra snapshot, не новий file/table |
| Packet | Копія immutable level/profile, frozen plan, TestPlan ref і current source/config/bundle bindings; current packet builder/validator owns seal |
| BA/SA | `ResearchResult/v1` із finite contours `business` / `system`: source refs, findings/alternatives, assumptions/conflicts/gaps і AC/contract trace; `DecisionRecord/v1` лише для attributable owner decisions |
| Test plan | `TestPlan/v1`: work/attempt, packet_id, task_contract_digest, source/AC refs, scenario IDs, oracle, command/fixture, refusal/recovery cases, limits, required outputs; без implementation_fingerprint до коду |
| Post-code proof | Existing ImplementationResult/validator/tester owners bind candidate fingerprint; TestPlan — intent, не proof; native runner result лишається окремим |
| Delivery proof | `DeliveryEvidence/v1`: read-only projection work/run/plan/candidate/target/permission/invocation/verification/recovery refs та finite outcome; actual records owned registered operation, не LLM report |

Packet digest не має циклу: step 5 створює draft з immutable task_contract_digest
(scope/AC/contract inputs, без TestPlan/plan seal); step 6 binds TestPlan до нього;
builder seal включає TestPlan ref. Prewrite перевіряє sealed packet до Source.
Work identity/intake attribution, raw risk flags і canonical lifecycle risk
передаються чинними owners; рівень не переобчислює та не знижує risk.

`bindings_manifest_ref` bridge request зберігає чинний зміст: він не стає
псевдонімом effective_plan_digest. Existing request/packet/Host attempt і Mastra
snapshot contracts отримують explicit plan refs у кінцевому форматі; existing
journal фіксує їх у тих самих transitions. Full graph frozen у packet/snapshot,
raw catalog — лише у cfg. Restart читає frozen bindings, recompile тим самим
qualified compiler/bundle і порівнює plan digest; mismatch блокує, не підтягує
latest defaults. Catalog activation потребує quiescence/disposition, тому hot
config epochs або concurrent writable plan store не потрібні.

### Typed 14 × 3 chain

Позначення producer-ів — із mapping Compact/Standard/Extended вище. Тут
контракти, consumer gate та engine owner спільні для всіх трьох пресетів.
Шість існуючих stage kinds достатні: research/synthesize/develop/validate/
test/deliver. BA/SA/test-design — task definitions, не нові stage kinds.

| Step / producer C / S / E | Kind та output contract | Consumer / owner gate |
| --- | --- | --- |
| 1 Root+A / Root+A / Root+B | Host admission; immutable Work/intake outcome/level/target | Host lifecycle; unresolved material decision блокує залежні effects |
| 2 A / R / R lanes | research; ResearchResult/v1 | Mastra join; bounded sources/facts/conflicts, synthesize aggregate |
| 3 A / A / B | research business; ResearchResult/v1 + applicable DecisionRecord/v1 | System analysis споживає attributable AC, не вигадує approval |
| 4 A / A / S | research system; ResearchResult/v1 + applicable DecisionRecord/v1 | Draft packet споживає data/API/effect/recovery contracts |
| 5 A / A / S + fresh planner | synthesize draft packet; validate prewrite після step 6 | Existing packet/Source policy owner, actual issue before writer |
| 6 Q / Q / P | research test_design; TestPlan/v1 | Sealed packet та tester; planner ≠ writer, executor ≠ test designer |
| 7 D / D / D | develop; ImplementationResult/v1 | Existing Source owner, exact paths/lease/CAS; immutable candidate |
| 8 fresh Q / fresh Q / T | test; existing TesterInstruction/VidaTesterVerdict + retained runner records | Observed-testing owner; fingerprint/current inputs/process close; required skipped не PASS |
| 9 fresh validators / V+A / V+B+security | validate; existing ValidatorInstruction/VidaValidatorVerdict | Observed-validation owner; independent lenses і joins |
| 10 D + affected actors / same / same | FailureArtifact/v1 → bounded develop + rechecks | Existing max_attempts/correction owner; unknown effects не replay |
| 11 L+assurance / L+assurance / L+assurance | deliver спочатку створює DeliveryInstruction/v1/current manifest, потім final/reverse evidence | Delivery preparer має delivery-agent/delivery profile; final-assurance owner споживає цей manifest до execute |
| 12 registered operator / same / same | Host operation actual result; reference in DeliveryEvidence/v1 | operations.registry adapter authorization/reservation/CAS, не Mastra LLM side effect |
| 13 tester/verifier / same / same | Host readback; DeliveryEvidence/v1 | Independent target verification через existing operation/evidence owner |
| 14 Root / Root / Root | Host lifecycle closeout + canonical docs/task disposition | Completion profile terminal; user Runtime acceptance окремо |

### Executable presets і instance expansion

Конкретні package IDs: `generic-compact`, `generic-standard`,
`generic-extended`, `vida-fixed`. Кожний team record має members,
task_assignments (definition → role/profile), assurance_roles, independent_of,
allowed_work_kinds і allowed_projects. Default generic scope: TASK/BUG/PBI у
validated selected projects; fixed VIDA — лише Agent framework work. Route
вказує qualified workflow + level→team map; довільний team_id не обходить level.

Compact використовує research-analyst/read-only profile для research+BA+SA;
Standard — researcher і analyst; Extended — business/system/platform research
lanes, окремі business/system analysts. Нові analyst/test-planner definitions
мають read-only actor class; QA specialization має окремі test-design і
test-execution slots. Writer: developer-orchestrator/developer profile;
prewrite: source-planner/source-planner і за ризиком security-prewriter;
validation: correctness-validator, requirements-validator, security-validator;
delivery preparation: delivery-agent/delivery. Назви profiles тут — package
contract IDs, які implementation має зареєструвати/звірити, не aliases tool rights.

Expansion: select immutable level → resolve explicit team/tasks → topological
graph → derive obligations з Host risk/effects → create required slots → apply
independence edges → validate enabled role/profile/tools → assign stable slot
IDs → bind actual native actor/history at issue. Reuse дозволений лише для
non-independent read-only tasks після спостереження попереднього result.
Test designer ≠ executor; всі focused validators ≠ writer і один одному;
prewriters ≠ plan author/writer; final three ≠ writer/focused actors і між собою.
Три reverse actions повертаються тим самим final actors, не додають ще три.

Приклади frozen plans, коли lifecycle вимагає final assurance; delivery
verification reuse незалежного tester дозволений після його accepted result:

| Приклад | Analysis slots | Test design / writer / executor | Prewrite | Focused review | Delivery planner / final reviewers | LLM instances |
| --- | --- | --- | --- | --- | --- | --- |
| low Compact | 1 combined analyst | 1 / 1 / 1 | 1 source planner | 2 | 1 / 3 | 11 |
| medium Standard | 1 researcher + 1 analyst | 1 / 1 / 1 | 1 source planner | 2 | 1 / 3 | 12 |
| high Extended | 3 research lanes + B + S | 1 / 1 / 1 | planner + security | 3 | 1 / 3 | 17 |

Це приклади під названими obligations, не загальні ліміти чи вимірювання.
Root, deterministic adapter invocations та reverse actions не рахуються як
нові LLM actors. Optional specialists додаються лише з declared input/output/join;
compiler показує точний instance count та resource estimate до issue. Resource
budget може серіалізувати або відмовити до dispatch, але не зливає independence.
Немає автоматичного переходу Compact→Extended. Correction instances додаються
явно в bounded attempt; shared files зберігають одного writer.

### Obligation registry та effect authority

Package registry закритий: actor_class = analyst / source_writer /
independent_validator / test_executor / delivery_planner / delivery_operator;
effect_class = read / source_write / test_execute / delivery_prepare /
delivery_execute. Це множини permitted effects, не автоматична шкала прав.
Artifact contracts, predicates, capabilities і adapter keys також registered.
Custom definition може комбінувати supported contracts або звужувати rights;
unknown contract/class/tool/predicate/adapter відмовляє. `enabled: false` не
приховує malformed schema. Немає eval/script/import із YAML.

`task.required_effects ⊆ role.allowed_effects ⊆ profile.tool_policy ∩ Cedar`
додатково перетинається з current issued Host authorization, paths і lease.
Actor class виводить trusted Host із validated assignment, не caller string.
Independent validator не переходить у writer за зміною profile. Рівно один
source_writer на develop stage. Existing Cedar schema/policy і writer guard
переходять разом від hardcoded role ID до authenticated actor class; Host
повторно перевіряє class/effect/current config/CAS безпосередньо перед ефектом.
До qualification обох boundaries custom effect-capable roles не активуються.

| Чинний ID/shape guard | Кінцевий obligation, positive та negative oracle |
| --- | --- |
| Чотири source-writing workflow IDs | effect_class source_write → requires_source_plan; renamed valid graph проходить, renamed missing gate відмовляє |
| exact source_prewrite stage/role IDs | requires_source_plan + high-risk requires_security_prewrite; role capabilities/contracts та domination до writer; disabled/late planner відмовляє |
| exact developer role/profile і один develop | Для цього slice exactly one develop stage і source_writer cardinality=1; correction повторно входить у той самий node; authenticated class/tool policy; два develop/writers або escalation відмовляють |
| exact validator/tester names | required_validation_lenses + requires_independent_test; typed output producer і actor independence; absent/self-review відмовляє |
| exact producer count/order | рівно один authoritative output на gate; parallel findings мають declared aggregate; duplicate/missing/non-dominating producer відмовляє |
| delivery-agent special path | delivery_prepare class + required actual adapter/verification для outcome; proposal-only або unregistered target відмовляє terminal |

Obligations походять з package policy + canonical Host risk/effects, не з
editable boolean, який consumer може вимкнути. Implementation map фіксує
кожний replaced guard у runtime-config/workflow-plan/session/Host/Cedar і
позитивний equivalence case + негативний missing-gate case. До цього mapping
не оголошується Code або assurance equivalence PASS.

### Graph, joins, delivery operations і completion

Generic graph: research → aggregate → business → system → draft_plan →
test_design → seal_packet → source_prewrite → develop → independent_test →
focused_validation → delivery_plan → applicable final_assurance. Відгалуження
з known findings веде через bounded correction назад до affected proof.
Host intake перед graph; registered execute_delivery → verify_delivery →
Host closeout після graph. Mastra завершив LLM stages ≠ Work завершений.
Delivery plan/current manifest обов'язково існує до final assurance. Для
source_only/artifact manifest явно задає completion target та дозволений N/A
для deployment execution/readback; assurance owner зберігає всі застосовні
Source/Code/test/reverse gates. Відсутність supported N/A contract відмовляє,
а не мовчки прибирає gate. Для deployment N/A execute/verify заборонений.

Fixed `vida-development`/`vida-fixed` використовує Extended assignments і
ті самі edges, додаючи explicit regression/security validators, required
final/reverse/CLEAR/documentation joins та VIDA native formation → publication
→ installation → artifact/version/hash/resources readback. Це один immutable
package graph, не окремий scheduler; custom copy має інший ID і ті самі guards.

Finite predicates: intent_is, risk_at_least, flag_present, decision_equals,
verified_artifact_available. Single-choice має рівно одну selected branch,
інакше refusal до effects; multiple selection можливий лише declared fan-out.
Required joins = all_success: failed → correction, missing/partial → blocked,
unknown → fenced. Skip/N/A дозволений лише явним policy для optional gate;
required reviewer або test не зникає через branch. Existing FailureArtifact/v1
і max_attempts обмежують correction; вичерпання → suspended/escalated, не PASS.

Нинішній operations.registry не має generic delivery execution/verification.
Додаються implementation-owned registered `executeDelivery` і `verifyDelivery`
у цей самий registry: перший вимагає delivery.execute/actual authorization,
другий — read-only runtime.read/target admission. Це нові handlers у чинному
owner, не декларація готовності. Adapter key `vida.native_release` посилається
на release/installer owners; інші keys потребують concrete implementation,
qualification і explicit target registration. Root викликає native agent/session
tools; CLI не запускає provider напряму. Операція має id/reservation/generation,
consent, exact candidate/target, persisted result і supported reconcile; після
possible effect timeout лишається unknown/no-reissue. DeliveryEvidence лише
проєктує records, не керує їхнім state transition.

completion_profile фіксується до dispatch: source_only закриває Source outcome,
artifact — verified formed artifact, deployment — actual verified target.
N/A delivery у перших двох видимий і не називається prod delivery; silent
downgrade deployment→source_only заборонений. Acceptance цього full-chain slice
має deployment-приклад для всіх трьох levels і fixed VIDA graph. Release
permission, target acceptance та attributable user Runtime acceptance окремі.

### Послідовність реалізації

0. Спочатку causal P0 bugs і P1 optimizations із current queue; каталог — P2.
1. Catalog/task/team contracts і deterministic compiler на pure fixtures;
   exact guard correspondence та authenticated actor-class/Cedar boundary.
2. Final-state codec, package seed та одноразовий repair/adoption tool,
   зі збереженням user overrides і operations; після міграції старий codec
   і repair tool видаляються.
3. Повний generic graph і три склади, typed verification/review joins.
4. Fixed VIDA preset і adapter-bound delivery execution/verification.
5. Public list/configure/inspect/help та effective plan без GUI/framework.
6. Required independent checks/reviews, normal hooks/main, qualified PATCH/
   install; disposable full-chain consumer перед дозволеною реальною задачею.

Перед effectful activation pure qualification має показати: усі три presets
дають повний reachable terminal graph; кожне low/high gate має належного
producer/cardinality; renamed custom IDs не обходять guards; disabled
dependency, self-review і unregistered delivery відмовляють; legacy fixtures
проходять лише через repair tool, після чого legacy dispatch відсутній.
Наступні integration/native checks доводять
Host/journal/Cedar, config adoption, interrupted/restart і actual delivery.
Це acceptance implementation, не вимога написати код для погодження дизайну.

Довільні nested children/loops, learned router, GUI, Jira/Azure та нові
business task kinds поза цим slice. Повний dynamic-engine epic лишається
відкритим; тут catalog/team/full-chain scope не видається за весь epic.

## Acceptance і перевірки дизайну

- Fresh init показує baseline catalog; repeat зберігає local/custom values.
- Кожен рівень має весь research-to-actual-delivery-verification шлях.
- Missing/disabled dependency, self-review, unauthorized effect, stale/foreign
  binding, unavailable capability та UNKNOWN відмовляють до ефекту.
- Незалежні tasks прогресують паралельно; shared paths і retry/restart мають
  один чинний owner без повтору можливих effects.
- Failed test/review коригує causal scope; proposal або local PASS не є deploy.
- Config/history/IDs/providers і bytes поза scope збережені; required quality
  budgets не змінені, missing proof залишається GAP.

Source/cfg/CLI читання та Vex — research evidence, не execution нового flow.
Formation methods застосовано окремо: V3 Delphi, V2 adversarial, V4 party-room.
Три preliminary Luna invocations використовували внутрішні perspectives;
вони не видаються за додаткових незалежних agents. Реальна Delphi R2 панель
із трьох fresh reviewers закрила actor/delivery ambiguity та залишила exact
config-activation/lost-ack зауваження, яке ця ревізія явно специфікує.

Cross-model Round 1: 4 SWE-2 Flash + 4 DeepSeek 4.1 Flash, усі
APPROVE_WITH_CHANGES; його frozen input — design-input-r1.md, не поточна
ревізія. 6 Critical/11 Important themes з агрегату disposition-овані у
[work record](../../../../../.agent/work/runtime-execution-catalog-design-20261109/WORK.md).
10 рішень погоджено користувачем із final-state-only умовою. Targeted V3/V2
перевірив frozen R3; 4 Important виправлено Root у current document, а не
приписано рецензентам як повторний PASS. Independent frozen implementation-plan
check завершено PASS для попереднього frozen layout, не для split/routing
revision 2026-11-10. Рівно дві requested split-reviews завершено з
APPROVE_WITH_CHANGES: SWE — 1 Important, DeepSeek — 2 Important, Critical — 0.
Root уточнив selection dimensions, usable seed і explicit full-fork rebind;
original verdicts/frozen inputs лишилися незмінними. Це Root corrections,
не новий independent PASS. User погодив revision; Source issue і qualification gates
зберігаються.
Source/native/delivery/Runtime proof нового каталогу відсутні.
