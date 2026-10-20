---
instruction_id: open-a-reviewable-change
title: "Відкривай зміну, яку можна оглянути"
summary: "Тримай зміну в межах однієї задачі й додай опис, перевірку та явні межі, щоб рецензент працював без здогадів."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Ти публікуєш зміну для огляду іншою людиною або агентом.
conditions_does_not_apply_when: Зміна не покидає локальну робочу копію.
artifact_contract_output_type: reviewable-change
artifact_contract_required_data:
  - мета
  - опис
  - спосіб перевірки
  - ризики
  - межі зміни
artifact_contract_verified_by: the described change checks reproduced from the description
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/opening-a-pr.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/shipping.md
status: active
revision: 1
---

# Відкривай зміну, яку можна оглянути
Опиши зміну так, щоб рецензент зрозумів мету без розмови.
Додай короткий опис і посилання на вимогу.
Тримай зміну в межах однієї задачі.
Відділи механічні зміни від змістовних.
Прибери з дифу шум: форматування, випадкові файли.
Додай інструкцію, як перевірити зміну.
Вкажи середовище й версії, у яких перевірка проходила.
Додай один приклад вхідних даних для ручної перевірки.
Познач, які файли змінені механічно.
Познач ризики й те, що варто переглянути уважніше.
Вкажи, що свідомо залишено поза зміною.
Перевір, що опис збігається з фактичним дифом.
Не додавай у зміну незавершені експерименти.
Віддай зміну з описом, перевіркою й межами.
