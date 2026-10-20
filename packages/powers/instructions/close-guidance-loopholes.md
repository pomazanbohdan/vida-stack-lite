---
instruction_id: close-guidance-loopholes
title: Закривай обходи правил явно
summary: "Для кожного знайденого виправдання додай конкретну заборону, контрприклад і повторну перевірку."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Виконавець обійшов правило або знайшов нове виправдання.
conditions_does_not_apply_when: Правило виконується стабільно без нових обходів.
artifact_contract_output_type: closed-loophole
artifact_contract_required_data:
  - виправдання
  - заборона
  - контрприклад
  - повторна перевірка
artifact_contract_verified_by: same scenario re-run after each counter
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/persuasion-principles.md
status: active
revision: 1
---

# Закривай обходи правил явно
Збери виправдання, якими виконавець обходив правило.
Запиши їх дослівно.
Для кожного виправдання додай явну заборону.
Назви конкретну дію, яка заборонена.
Додай контрприклад із правильною дією.
Додай ознаку, за якою виконавець розпізнає обхід.
Поясни ціну обходу.
Не замінюй заборону загальним нагадуванням.
Не додавай застереження, які відкривають торг.
Формулюй виняток окремою умовою за спостережуваною ознакою.
Не вважай категоричність заміною ясності.
Перевір настанову тим самим сценарієм.
Повторюй, доки нові обходи не перестануть з'являтися.
Запиши залишкові обходи як відоме обмеження.
Не приховуй виняток у дрібному шрифті.
