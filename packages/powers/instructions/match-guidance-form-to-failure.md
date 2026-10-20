---
instruction_id: match-guidance-form-to-failure
title: Обирай форму настанови під тип збою
summary: "Для свідомого порушення пиши заборону, для неправильної форми результату — точний опис потрібного складу."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Ти визначаєш, у якій формі сформулювати правило."
conditions_does_not_apply_when: Тип збою ще не встановлений.
artifact_contract_output_type: guidance-form-choice
artifact_contract_required_data:
  - тип збою
  - обрана форма
  - перевірка
artifact_contract_verified_by: form matches the observed failure type
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 1
---

# Обирай форму настанови під тип збою
Визнач тип базового збою.
Для свідомого порушення правила використовуй заборону й контрприклад.
Для неправильної форми результату опиши точний склад результату.
Для пропущеного обов'язкового елемента додай поле або слот у формі.
Для умовної поведінки сформулюй умову за спостережуваною ознакою.
Не використовуй заборону для проблеми форми.
Не використовуй м'яке побажання для свідомого порушення.
Не додавай застережень коли це важливо.
Не змішуй кілька типів збоїв в одному правилі.
Перевір, що форма відповідає спостереженню.
Порівняй результат до і після зміни форми.
Запиши, який тип збою закриває кожне правило.
Не вигадуй виняток, якого не спостерігав.
Не розширюй форму без нового збою.
Перевір, що правило не створює нового обходу.
