# Evaluation dataset authoring

## Base menu attributes and order modifiers

Recommendation attributes describe the base menu only. Checkout modifiers such as added cheese, an extra patty, or a meal upgrade affect the configured order and price, but do not rerun recommendation scoring. `OrderOptionGroup.visibleWhen` supports one explainable dependency, such as showing side and drink groups only after selecting a set meal. A future version may add explicit modifier attribute deltas, but those effects must remain separate from base-menu ground truth.

An attribute schema is a measurement contract, not just a list of technical keys. Every new domain attribute must define:

- the exact concept being measured;
- observable anchors for 0, 0.25, 0.5, 0.75, and 1;
- valid evidence and information that must not be treated as evidence;
- ambiguity class and Ground Truth reliability;
- whether AI estimation is suitable for automatic approval, confidence review, or owner confirmation.

Do not change a published Ground Truth dataset in place. Human-adjudicated changes to `snack20-v1` must be released as `snack20-v2`, preserving the prior baseline.

Model agreement is evidence for review, not proof that Ground Truth is wrong. Highly subjective attributes should be checked by multiple independent raters using numeric ranges or anchored low/medium/high choices.
