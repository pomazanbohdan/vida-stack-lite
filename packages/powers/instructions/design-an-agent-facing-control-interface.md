---
instruction_id: design-an-agent-facing-control-interface
title: Проєктуй керуючий інтерфейс для агента
summary: "Дай агенту команду з режимом перевірки, машинним виводом і достатньою довідкою, щоб не читати код."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Ти створюєш команду, скрипт або адаптер, яким керуватиме агент."
conditions_does_not_apply_when: Інтерфейс призначений лише для інтерактивної роботи людини.
artifact_contract_output_type: control-interface
artifact_contract_required_data:
  - команди
  - режим перевірки
  - форма виводу
  - довідка
  - приклад
artifact_contract_verified_by: an agent completing the task from the help text alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/06-verify-and-ship.md
status: active
revision: 1
---

# Проєктуй керуючий інтерфейс для агента
Опиши дію, яку агент має виконати, як окрему команду.
Дай команді режим перевірки без змін.
Зроби довідку достатньою, щоб не читати код.
Повертай машинно читаний результат разом із кодом виходу.
Відділи діагностику від даних.
Зроби небезпечні дії явними й окремими.
Передбач повторний запуск без побічних ефектів.
Не змушуй агента розбирати людський текст, щоб зрозуміти стан.
Дай приклад виклику для кожної команди.
Дозволь агенту отримати стан без побічних дій.
Повідом про часткову невдачу окремим статусом.
Тримай назви команд дієслівними й передбачуваними.
Перевір інтерфейс на агенті, який не бачив опису.
Віддай команду, довідку й приклад виводу.
