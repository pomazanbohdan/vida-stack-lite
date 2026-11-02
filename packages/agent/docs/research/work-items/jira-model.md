---
type: Research
title: Типи робіт і ключі — Jira-модель
---
# Типи робіт і ключі: Jira-модель

Статус: поточний результат primary-source research. Дослідник: Luna; повторна перевірка основних публічних джерел: Root. Дата доступу до джерел: 2026-11-02. Видавці: Atlassian, Microsoft; дати публікації Atlassian-сторінок у перевіреному представленні не встановлені.

Local code pin дослідника: repository `vida-agent`, branch `main`, HEAD `1da684aad64b8c6272f15cb04dc33797ddf1449f`; незавершені зміни документації збережені. Root не виявив відмінностей у двох наведених нижче runtime/schema джерелах порівняно з цим commit.

## Факти з першоджерел

- Jira work-item key складається з project/space key та послідовного номера. Тип роботи не є компонентом цього формату: [Atlassian: work-item keys](https://support.atlassian.com/jira-software-cloud/docs/what-is-a-work-item/).
- Work-type schemes визначають доступні типи, default та порядок і можуть бути спільними для кількох projects/spaces: [Atlassian: schemes](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-type-schemes/).
- Software defaults включають Epic, Story, Task, Bug і Subtask. Subtask є дочірнім елементом; решта зв’язків залежать від hierarchy: [Atlassian: work types](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/).
- Product Backlog Item є backlog-типом Azure Scrum; він не входить у названий Jira software default list. VIDA може визначити власний PBI, не називаючи його стандартним Jira-типом: [Microsoft: work-item types](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/about-work-items?view=azure-devops), [Atlassian: work types](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/).
- Jira default hierarchy має Epic, standard Story/Task/Bug і Subtask рівні. Standard BUG та TASK на одному рівні, тому `BUG → TASK` не є default containment. Конфігурація рівнів має окремі правила й plan limitations: [Atlassian: hierarchy](https://support.atlassian.com/jira-cloud-administration/docs/configure-the-issue-type-hierarchy). Вимогу користувача VIDA не можна звузити до цих defaults.
- Microsoft описує work-item ID як унікальний і незмінюваний після створення: [Azure ID field](https://learn.microsoft.com/en-us/azure/devops/boards/queries/titles-ids-descriptions?view=azure-devops). Jira Cloud публічно показує окремий ID через export/API, але наведена сторінка не обіцяє його immutability для всіх операцій: [Atlassian: Cloud ID lookup](https://support.atlassian.com/jira/kb/how-to-identify-the-jira-issue-id-in-cloud/) (updated 2025-09-25). Незмінна identity VIDA є власною рекомендованою гарантією.

## Поточна реалізація VIDA

- [workflow-session-reservation-contract.ts](../../../src/orchestration/workflow-session-reservation-contract.ts), `workflowWorkItemSchema:7`: strict структура містить `id`, `provider`, `provider_type`, `canonical_kind`, intent і project; typed display key, parent/dependency полів у ній немає.
- [Runtime cfg schema](../../../schemas/agent-runtime-config.v1.schema.json), `:321,629`: є `task_prefix`, kind/provider mappings; потрібна typed-key/hierarchy модель цими полями не встановлена.
- Ці висновки обмежені конкретними schema/contract owners. Вони не доводять відсутності всіх можливих relations в інших підсистемах або підтримки нового контракту installed runtime.

## Вимоги VIDA

- Репозиторій має свій prefix; продукт має окремий prefix.
- Коди типів робіт фіксовані у runtime, не перевизначаються продуктом.
- Продукт вказує перелік enabled types. Потрібно підтримати вибрані типи на кшталт Task, Bug, PBI.
- Ключ VIDA явно містить тип: `REPO-PRODUCT-TYPE-NUMBER`.
- Вкладеність generic; продукт задає довільні дозволені parent/child type combinations із підтримуваного runtime catalog.
- Початковий режим для Agent/Codex/Powers — окремі `custom` maps з однаковими значеннями `PBI → TASK, BUG; BUG → []; TASK → []`. Користувач визначив PBI як верхньорівневий опис функціоналу з дочірніми TASK/BUG, дозволив standalone TASK і явно визначив BUG як кінцевий елемент для всіх трьох.

Це вимоги користувача до VIDA, а не властивості, доведені документацією Jira.

## Поточний висновок

Використати type-visible key згідно з вимогою користувача, наприклад `VIDA-AGENT-BUG-43`. Комбінації визначає product configuration; runtime не hardcode-ить PBI/BUG/TASK matrix або TASK leaf. Number зберігається при зміні типу, змінюється type prefix; relation checks використовують product policy.

Для цілісності затверджено незмінну внутрішню UUID identity і old-key aliases при зміні типу; номер спільний для типів у продукті й зберігається при reclassification. Продукт не перевизначає fixed type codes; він обирає enabled types. Джерело рішення — [затверджена модель](../../decisions/configuration/runtime-project-model.md), а не Jira defaults.

## Невирішене

- Конкретні prefix values для фактичної ініціалізації.
- Деталі підтриманої migration/repair operation при зміні prefixes чи ownership зі збереженням старих references.
- Сумісність із поточними team-level kinds та existing `task_prefix`: [runtime paths](../configuration/runtime-paths.md).

Немає тестів інтеграції з Jira або виконаної міграції VIDA IDs. Джерела не встановлюють гарантію immutable ID саме для всіх Jira Cloud операцій; така гарантія для VIDA має бути окремим власним контрактом.

Рішення: [ідентифікація і типи](../../decisions/work-items/identity-and-types.md).

Поточні приклади typed keys і погодженого containment наведені в рішенні. Затверджено product counter, stable identity/aliases, single parent без циклів, окремі cross-product links та початкові enabled lists/maps. Prefix values і фактична реалізація/adoption залишаються окремими питаннями; дизайн не є доказом підтримки installed runtime або Jira defaults.

## Застосовані research-інструкції

Дослідник прочитав чотири інструкції через profile-aware retrieval з явними catalog/profile. `pin-the-codebase-research-to-a-repository-and-commit` і `never-conclude-from-training-data` застосовані. `demand-citations-contrary-evidence-and-admitted-gaps-in-the-brief` не застосована до output: зовнішній brief не створювався; `re-check-a-research-claim-against-the-current-code` не вимагала додаткового обходу, бо дослідник читав current code безпосередньо. Права запису, тести, міграція та Runtime acceptance цьому дослідженню не видавалися.
