---
instruction_id: keep-a-decision-trail
title: Веди слід ухвалених рішень
summary: "Записуй кожне рішення з варіантами, підставою й умовою перегляду, поки контекст ще свіжий."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: Ухвалене рішення вплине на майбутню роботу або його доведеться пояснювати.
conditions_does_not_apply_when: Рішення локальне й очевидне з коду.
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - рішення
  - варіанти
  - підстава
  - умова перегляду
  - власник
artifact_contract_verified_by: a later reader reconstructs the choice from the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/rationale-template.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/09-make-it-yours.md
status: active
revision: 1
---

# Веди слід ухвалених рішень
Записуй рішення в момент, коли воно ухвалене.
Для кожного рішення назви варіанти, які розглядали.
Запиши підставу вибору й умову перегляду.
Познач, хто ухвалив рішення і які має повноваження.
Пов'яжи рішення з місцем у коді або документі.
Додай дату й версію, до якої рішення застосовне.
Познач рішення, які залежать від зовнішньої умови.
Збережи посилання на обговорення, а не переказ.
Перевір, що новий учасник розуміє рішення без усного пояснення.
Не переписуй історію рішень заднім числом.
Оновлюй запис, коли рішення замінене новим.
Відділяй рішення від припущень і відкритих питань.
Тримай один запис на одне рішення.
Віддай короткий перелік рішень із підставами й статусом.
