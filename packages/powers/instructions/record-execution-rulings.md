---
instruction_id: record-execution-rulings
title: Записуй кожне рішення під час виконання
summary: "Фіксуй відхилення, конфлікти й власні рішення в журналі виконання разом із причиною та ціною помилки."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "Під час виконання плану виникає вибір, конфлікт або відхилення."
conditions_does_not_apply_when: План виконується без жодного відхилення чи невизначеності.
artifact_contract_output_type: execution-ruling
artifact_contract_required_data:
  - рішення
  - причина
  - ціна помилки
  - місце в плані
artifact_contract_verified_by: every deviation has a matching journal entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
status: active
revision: 1
---

# Записуй кожне рішення під час виконання
Заведи журнал виконання з ідентичністю плану.
Записуй рішення в момент ухвалення.
Записуй рішення перед дією, а не після неї.
Формулюй запис: що вирішено, чому, що буде, якщо це неправильно.
Записуй кожне відхилення від плану.
Записуй кожен конфлікт між задачами або з обмеженнями.
Записуй рішення щодо помилки в плані.
Не роби відхилень без запису.
Не покладайся на пам'ять після втрати контексту.
Позначай рішення, ухвалені без специфікації, як тимчасові.
Не приховуй дрібні відхилення.
Не переписуй минулі записи, додавай нові.
Зберігай журнал разом із задачею, до якої він належить.
Передай усі записи власнику в підсумку.
Не використовуй журнал для виправдання довільного розширення обсягу.
