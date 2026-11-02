---
type: Decision Record
title: Документи всередині продукту
---
# Документи всередині продукту

Статус: затверджено до реалізації з анотаціями користувача. Єдина wiki, напрямки вимог та цільова identity `codex` є вимогами. Source, init/config/help і міграції ще потребують реалізації та доказів.

## Рішення

- Кожен продукт має свою вкладену карту документів поруч із прив’язкою коду.
- Код і документи можуть розташовуватися незалежно або перетинатися. Один файл може бути пов’язаний із кількома продуктами та класами.
- Карта містить явні classes/paths. Runtime не виводить канонічні документи з розташування коду.
- BR, SR, AC, research, decisions, plans, work records та verification evidence розрізняються за призначенням.
- Окремі `test_cases` описують сценарії й очікування; вони не тотожні виконуваним тестам або звітам про їх запуск.
- Source membership не видає write authority; дослідницький звіт не підміняє вимогу.
- Продукт має єдину wiki для всіх підтримуваних документів; окремі wiki/internal corpora не створюються. Wiki придатна для майбутнього GUI.
- Бізнесові та системні вимоги зберігаються в окремих каталогах. Напрямки всередині продукту/проекту можуть мати власні BR/SR, AC і test-case документи.
- Навігаційний документ має назву `index.md`. Застосовується досліджений Open Knowledge Format v0.2: індекси групують посилання під заголовками, concept-файли містять YAML `type`.
- Кожен підтримуваний документ публікується як актуальний кінцевий документ у своїй wiki-категорії; окремого `wiki_output_root` / `outputs.generated_documents` у цільовій моделі немає.
- Work-item storage є місцем створення задач та інших робіт. Coordination, custody receipts і raw runtime evidence зберігають свої операційні owners; вони не утворюють другу wiki.
- Цільові product IDs — `agent`, `codex`, `powers`. Codex identity замінюється наскрізно явною adoption operation; current Source/state не оголошуються вже перетвореними.

## Підстави

- [Розміщення та класи документів](../../research/configuration/product-documents.md): поточні source maps, schema gap, фактичні продуктові документи.
- [Шляхи runtime](../../research/configuration/runtime-paths.md): значення legacy names, consumers, storage conflict і migration risks.
- [Єдина wiki, напрямки вимог і стандарт індексів](../../research/configuration/wiki-and-requirements.md): upstream OKF та продуктовий scope наявного checker.
- Пряма вказівка користувача: документи вкладені у продукти; код і документи незалежні та можуть перетинатися; AC та майбутні окремі test cases враховуються.

## Відкриті деталі

- [Затверджений пакет з анотаціями](runtime-project-model.md) визначає намір; schema та operational interfaces уточнюються implementation plan.
- [Поточна YAML-пропозиція](project-config.proposed.yaml) показує структуру від продуктів; це не active cfg і не затвердження прикладових prefix values.
- Exact value shape єдиної wiki та mapping напрямків/каталогів; поведінка literal file / directory / glob selectors.
- Required/optional класів і реакція на відсутні прив’язки.
- Повна перевірка Agent wiki проти OKF, належний scope checker, фізичні місця нових документів та ownership conflict resolution.
- Міграція legacy wiki/internal fields і узгодження Powers work storage із його продуктовим D2.

Деталі не обираються автоматично з цього рішення; наступне уточнення користувача оновлює цей документ і пов’язане дослідження одразу.

## Приклад для погодження форми cfg

```yaml
projects:
  - project_id: agent
    code_selectors: [packages/agent/src/**]
    documents:
      root: packages/agent/docs
      index: packages/agent/docs/index.md
      requirements:
        root: packages/agent/docs/requirements
        areas:
          runtime:
            business: packages/agent/docs/requirements/runtime/business
            system: packages/agent/docs/requirements/runtime/system
          delivery:
            business: packages/agent/docs/requirements/delivery/business
            system: packages/agent/docs/requirements/delivery/system
      research: packages/agent/docs/research
      decisions: packages/agent/docs/decisions
    work_items:
      storage_root: packages/agent/backlogs
```

Agent [wiki index](../../index.md) створений і веде до існуючих канонічних документів. Requirements paths у прикладі є запропонованими destinations; каталоги та перенесення поточної специфікації не виконані. Форму mapping та точні місця треба погодити. Root AGENTS/sidecar лишаються чинними integration hooks до окремо підтриманого переходу.

SR задає поведінку; AC — перевірний результат; test-case документ — inputs/кроки/очікування; виконуваний тест автоматизує перевірку; кінцевий verification report фіксує фактичний запуск. Наявність AC чи test case не означає, що тест виконано.

Для Powers фізичне місце work-item storage лишається відкритим через D2/cfg conflict; копіювання Agent storage без узгодження owner не допускається.
