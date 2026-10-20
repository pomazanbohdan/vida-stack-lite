---
instruction_id: review-adversarially
title: Оглядай з позиції супротивника
summary: "Шукай спосіб зламати зміну, а не підтвердити її якість, і формулюй кожну знахідку сценарієм."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Є готова зміна або дизайн, який треба перевірити незалежно від автора."
conditions_does_not_apply_when: Потрібна лише механічна перевірка формату чи збирання.
artifact_contract_output_type: adversarial-review
artifact_contract_required_data:
  - знахідки
  - сценарій
  - наслідок
  - рівень
  - вердикт
artifact_contract_verified_by: a reviewer reproduction of each claimed failure scenario
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=agents/comment-sicko.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/code-quality-review.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/rubric.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/divergent-reviewer.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/tooling-reviewer.md
status: active
revision: 1
---

# Оглядай з позиції супротивника
Шукай не підтвердження якості, а спосіб зламати зміну.
Прочитай вимогу й назви, що вона обіцяє користувачу.
Перевір кожне місце, де зміна торкається даних або межі довіри.
Спробуй побудувати вхід, який ламає припущення автора.
Перевір гілку помилки окремо від успішного шляху.
Знайди тест, який проходить із неправильним кодом, і назви його.
Перевір, що зміна не додає прихованого стану.
Порівняй поведінку з сусіднім кодом, який робить те саме.
Сформулюй кожну знахідку як конкретний сценарій із наслідком.
Познач рівень: блокує, варто виправити, зауваження.
Відкинь стилістичні претензії без впливу на поведінку.
Не хвали зміну загальними словами.
Не виправляй код під час огляду.
Віддай список знахідок із прикладами й вердиктом.
