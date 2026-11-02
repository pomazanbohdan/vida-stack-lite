---
type: Decision Record
title: Ідентифікація робіт і фіксований каталог типів
---
# Ідентифікація робіт і фіксований каталог типів

Статус: затверджено до реалізації з анотаціями. Number наскрізний для типів у продукті; reclassification змінює type prefix. Вкладеність налаштовує продукт generic policy. Source/runtime ще потребують реалізації та доказів.

## Рішення

- Repository prefix і product/project prefix — окремі значення.
- Префікси/коди типів робіт визначає фіксований каталог runtime; продукт не перевизначає їх.
- Кожен продукт задає тільки enabled types із цього каталогу.
- Початковий enabled list для Agent, Codex і Powers: `PBI`, `BUG`, `TASK`, як визначено користувачем для цієї ініціалізації.
- `repository_id` та `project_id` відокремлені від display prefixes. Цільові product IDs — `agent`, `codex`, `powers`; Codex identity перетворюється явно, без видавання історичних references за вже змінені.
- Ключ роботи відображає тип. Приклад цільової форми: `REPO-PRODUCT-TYPE-NUMBER`.
- Комбінації вкладеності задає продукт із runtime-owned type catalog. PBI/BUG/TASK edges є прикладом policy; runtime не hardcode-ить матрицю або безумовний TASK leaf.

## Підстави

- [Jira-модель](../../research/work-items/jira-model.md): відокремлення типу від ключа і аналог type schemes; PBI distinction.
- [Чинні поля та consumers](../../research/configuration/runtime-paths.md): team-level enabled kinds, per-project `task_prefix`, string references і storage conflict.
- [Перевірені schema gaps та hierarchy constraints](../../research/work-items/jira-model.md): strict work-item contract ще не містить typed key/parent полів; налаштовувані combinations є власною policy VIDA, незалежною від default Jira levels.
- Пряма вказівка користувача: окремі repo/product prefixes; type prefixes фіксовані, у продукті лише перелік використовуваних типів.

## Відкриті деталі

- [Затверджений пакет з анотаціями](../configuration/runtime-project-model.md) визначає prefixes, counter, identity та aliases; схема generic product hierarchy уточнюється планом.
- [Поточна cfg-пропозиція](../configuration/project-config.proposed.yaml) містить обрані початкові enabled lists і hierarchy maps; конкретні prefixes ще потребують підтвердження користувача.
- Початкова hierarchy policy для Agent, Codex і Powers — `custom`: `PBI → TASK, BUG; BUG → []; TASK → []`. PBI описує верхньорівневий функціонал, standalone TASK дозволені. BUG є кінцевим елементом за явним уточненням користувача. Кожен продукт зберігає власний map, навіть коли початкові значення однакові.
- Конкретні prefix values; подальші зміни enabled types та hierarchy є явним налаштуванням продукту.
- Узгодження product enabled types з чинними team-level kinds.
- Migration existing `task_prefix`, IDs і references без втрати зв’язків.

Topology зберігає нуль/один parent і заборону циклів. Комбінації parent/child типів перевіряються за product configuration, не виводяться з topology.

Containment діє в межах продукту, міжпродуктові links є окремими зв’язками. Зміна чинних strict schemas потребує належного migration/repair owner до adoption; цей документ не виконує такої зміни.

## Приклади для погодження

```yaml
repository:
  repository_id: vida-agent
  prefix: VIDA
projects:
  - project_id: agent
    prefix: AGENT
    work_items:
      enabled_types: [TASK, BUG, PBI]
      hierarchy:
        mode: custom
        allowed_children:
          PBI: [TASK, BUG]
          BUG: []
          TASK: []
```

Prefix values тут ілюстративні; початкові enabled selection та hierarchy погоджені. Product cfg не містить перевизначення type prefix; `allowed_children` задає тільки вкладеність. Код типу надходить із фіксованого runtime catalog.

| Приклад | Тип | Зміст |
| --- | --- | --- |
| `VIDA-AGENT-PBI-42` | `PBI` | Продуктовий результат: налаштовувана карта документів |
| `VIDA-AGENT-BUG-43` | `BUG` | Дочірня робота PBI: loader читає SR іншого продукту |
| `VIDA-AGENT-TASK-44` | `TASK` | Дочірня робота PBI: реалізувати resolution |
| `VIDA-AGENT-TASK-45` | `TASK` | Дочірня робота PBI: додати AC/test cases |
| `VIDA-POWERS-TASK-42` | `TASK` | Робота Powers; номер не конфліктує за різних product prefixes |

Counter є спільним для типів усередині продукту. Number не змінюється при reclassification. PBI описує результат, TASK — дію, BUG — відхилення; supported catalog належить runtime.

Приклад containment:

```text
VIDA-AGENT-PBI-42
├── VIDA-AGENT-BUG-43
├── VIDA-AGENT-TASK-44
└── VIDA-AGENT-TASK-45

VIDA-AGENT-TASK-46 (окрема робота)
```

При зміні `TASK → BUG` змінюється type prefix ключа; internal ID, number і stable file зберігаються, old key resolving через alias. Усі зв’язки перевіряються за product policy. Existing IDs не переписуються мовчки.

Enabled list обмежує створення/reclassification; existing records лишаються читабельними. Runtime підтримує явні unrestricted/custom policies; для цієї ініціалізації обрано custom map вище. Матеріальні зміни запитуються в користувача. Зміна policy не видаляє наявні записи/зв’язки автоматично.
