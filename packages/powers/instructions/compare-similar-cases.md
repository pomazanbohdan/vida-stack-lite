---
instruction_id: compare-similar-cases
title: Порівнюй схожі випадки за ознаками
summary: Перетвори знайдені ознаки на маркери й перевір кожен кандидат окремо.
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Треба з'ясувати, чи повторюється та сама поведінка в іншому випадку."
conditions_does_not_apply_when: Є лише один артефакт без кандидатів для порівняння.
artifact_contract_output_type: case-matching
artifact_contract_required_data:
  - маркери
  - кандидати
  - результати
  - висновок
artifact_contract_verified_by: "each marker marked hit, miss or unknown"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/similar-session.md
status: active
revision: 1
---

# Порівнюй схожі випадки за ознаками
Визнач ознаки, які повторюються в дослідженому випадку.
Сформулюй маркери: послідовність, помилка, повтор, файл, подія.
Для кожного кандидата підтвердь тотожність.
Шукай кожен маркер окремо.
Позначай маркер як знайдений, відсутній або неперевірний.
Для відсутнього вкажи, що перевірено.
Для неперевірного назви відсутнє поле.
Не вважай збіг одного маркера повним збігом.
Не вигадуй маркер заднім числом.
Не порівнюй кандидатів без підтвердженої тотожності.
Поверни підсумок: повний, частковий або відсутній.
Познач часткові збіги окремо.
Не змінюй досліджуваний артефакт.
Не використовуй лише свіжість як ознаку.
Заверши, коли кожен маркер має результат для кожного кандидата.
