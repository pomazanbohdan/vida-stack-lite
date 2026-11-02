---
type: Research
title: Шляхи runtime — значення полів і consumers
---
# Шляхи runtime: значення полів і consumers

Статус: поточний результат bounded source research. Дослідник: Luna; оформлення: Root. Repository: `vida-agent`; branch: `main`; HEAD: `34ca35d5089b1d67b7acc0c2d0f24f3dffbdf40b`. Перевірка: 2026-11-02. На момент читання дослідником working tree був чистим.

## Значення чинних полів

| Поле | Що означає і де використовується | Напрям цільової структури |
| --- | --- | --- |
| `wiki_root` | Каталог документів продукту; resolution також заповнює з нього `documentation_root`: `project-context.ts:536-554` | Класи всередині `projects[].documents` |
| `wiki_path` | Шлях до context/sidecar-файлу, не patch і не каталог wiki. Поточні значення вказують на продуктовий `AGENT.sidecar.md`: `project-context.ts:403-418` | Wiki navigation — `index.md` за чинним стандартом; integration hooks мігруються окремо |
| `wiki_output_root` | Шлях згенерованих outputs; присутній у resolution, layout validation, init і relocation. Writer у bounded `src`/`bin` пошуку не виявлений: `project-layout.ts:88-110` | У цільовій моделі окремого document-output корпусу немає; потрібна перевірка й міграція consumers |
| `internal_root` | Каталог внутрішніх документів, перенесений у resolved path profile: `project-context.ts:536-560` | Єдина wiki з тематичними класами й напрямками вимог |
| `internal_requirements_root` | Default у repository path profile. Окреме project-поле/direct consumer у bounded огляді не знайдені: `runtime-config.ts:165-187` | Вимоги як класи; не зберігати дубль без доведеного окремого owner |
| `ledger_root` | Каталог path profile для work/storage; filesystem перевіряє його як optional path: `project-context.ts:536-560,683-692` | Work-item storage, окремо від source map |
| `task_prefix` | Обов’язкове поле продукту, передається в context і workflow reservation: `runtime-config.ts:330-342`, `workflow-session-reservation-contract.ts:225-229` | Фіксовані runtime type codes і перелік enabled types у продукті; потрібна міграція schema/consumers |
| `project_root`, `code_selectors` | Root визначає membership, selectors переносяться в context: `project-mapping-contract.ts:5-23`, `project-context.ts:206-231` | Код і документи мають незалежні явні прив’язки |
| `path_overrides` | Override відомих path keys, крім `repository_root`: `project-context.ts:498-518` | Механізм compatibility, не taxonomy документів |

Джерела: [project context](../../../src/config/project-context.ts), [runtime config](../../../src/config/runtime-config.ts), [project layout](../../../src/config/project-layout.ts), [reservation contract](../../../src/orchestration/workflow-session-reservation-contract.ts), [mapping contract](../../../bin/project-mapping-contract.ts), [cfg](../../../../../agent-runtime.config.v1.yaml).

## Ідентифікація і типи робіт

`repository_id` і `project_id` — стабільні identity fields. Runtime scope використовує їх як `repository:<id>/project:<id>`: `project-context.ts:591-600`. Окремі repo/product prefixes для ключів work items у досліджених cfg/schema ділянках не знайдені.

`WorkItemKind` уже перелічує види глобально; enabled kinds налаштовані на team-рівні: `runtime-config.ts:192`. Продуктовий перелік enabled types — нова вимога, яку потрібно узгодити з team-рівнем. `work_item_id` збережений як рядок у [research schema](../../../schemas/research-result.v1.schema.json) і [decision schema](../../../schemas/decision-record.v1.schema.json), тому зміна ключів може зламати references.

## Конфлікти та межі

- [Powers D2](../../../../powers/docs/decisions/D2-ownership-and-work-space.md) визначає окремі продуктові prefixes та work під `docs/work`; root cfg задає для Powers `ledger_root: packages/powers/backlogs`. Це конфлікт source-of-truth/storage, який не можна вирішити лише перейменуванням поля або автоматичним перенесенням.
- Optional відсутні paths отримують null identity; потрібними при зазначених перевірках є documentation policy/map/index paths: `project-context.ts:443-462,683-692`. Не кожна відсутня папка є помилкою.
- Split `.vida` є погодженим target; current initializer outputs залишаються root integration files: [специфікація](../../system-specification.md), розділ initialized layout.
- Шлях до ID constructor у bounded пошуку не встановлено. Це не доводить відсутність constructor в усьому runtime.
- `CODE-TOOLING.md` відсутній; Vex/ast-grep route досліднику недоступний. Висновки спираються на bounded direct-source inspection.
- Не виконувалися тести, зміна cfg/schema, міграція, install чи Runtime acceptance.

Дослідник застосував `bootstrap-agent` + research delta та profile-aware bundle: `pin-the-codebase-research-to-a-repository-and-commit`, `re-check-a-research-claim-against-the-current-code`, `demand-citations-contrary-evidence-and-admitted-gaps-in-the-brief`, `never-conclude-from-training-data`.

Рішення: [модель документів](../../decisions/configuration/product-documents.md), [ідентифікація і типи робіт](../../decisions/work-items/identity-and-types.md).

Цільова структура має одну wiki з `index.md` та кінцевими документами, окремі BR/SR каталоги для напрямків і work-item storage. [Приклад у рішенні](../../decisions/configuration/product-documents.md) не стверджує виконаної міграції й не вирішує Powers storage conflict. Raw custody evidence не видаляється і не стає другою wiki.
