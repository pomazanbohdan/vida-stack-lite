---
instruction_id: prove-visual-parity-with-image-diff
title: Доведи візуальну відповідність порівнянням зображень
summary: Порівнюй знімки екрана до і після зміни та оновлюй еталон лише для навмисних відмінностей.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Зміна впливає на вигляд інтерфейсу й має зберегти або свідомо змінити візуальний стан.
conditions_does_not_apply_when: Зміна не торкається візуального подання.
artifact_contract_output_type: image-diff
artifact_contract_required_data:
  - еталон
  - новий знімок
  - карта різниць
  - пояснення відмінностей
artifact_contract_verified_by: pixel comparison at a fixed viewport and pixel density
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/visual-parity.md
status: active
revision: 1
---

# Доведи візуальну відповідність порівнянням зображень
Отримай еталонне зображення стану до зміни.
Зроби знімок того самого екрана в тому самому розмірі вікна.
Порівняй зображення попіксельно й отримай карту різниць.
Відрізняй справжню зміну від шуму рендерингу.
Перевір, що шрифти й розміри завантажилися до знімка.
Перевір усі стани: порожній, завантаження, помилка, довгий текст.
Повтори знімок на іншій щільності пікселів.
Прибери анімацію й випадкові дані перед знімком.
Зафіксуй розмір вікна й масштаб у самій перевірці.
Оціни карту різниць очима, а не лише числом.
Познач навмисні зміни й онови еталон лише для них.
Не оновлюй еталон, щоб «позбутися» невдачі.
Збережи зображення й карту різниць як доказ.
Віддай пару знімків і пояснення кожної відмінності.
