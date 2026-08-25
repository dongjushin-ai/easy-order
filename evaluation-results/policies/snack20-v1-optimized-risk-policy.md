# snack20-v1 Optimized Risk Policy

**PROVISIONAL · DATASET_SPECIFIC · NOT_PRODUCTION_VALIDATED**

No OpenAI API calls. Stored predictions only. This policy is not applied to production.

- Searched candidates/partial policies: 454140

## Model presets

### gpt-5.6-luna
- Global 0.8: Review 60 (37.5%), Auto accuracy 80.0%, miss M/S/C 5/0/0, efficiency 56.7%
- Current: Review 70 (43.8%), Auto accuracy 83.3%, miss M/S/C 4/0/0, efficiency 55.7%
- Safety First: Review 120 (75.0%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 45.0%
- Balanced: Review 120 (75.0%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 45.0%
- Automation First: Review 94 (58.8%), Auto accuracy 95.5%, miss M/S/C 0/0/0, efficiency 54.3%
- Stability-aware: Review 80 (50.0%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 67.5%
- Risk reduction/additional review: 0.08333333333333333

### gpt-5.6-terra
- Global 0.8: Review 70 (43.8%), Auto accuracy 88.9%, miss M/S/C 2/1/1, efficiency 68.6%
- Current: Review 72 (45.0%), Auto accuracy 86.4%, miss M/S/C 2/0/0, efficiency 63.9%
- Safety First: Review 116 (72.5%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 50.0%
- Balanced: Review 116 (72.5%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 50.0%
- Automation First: Review 116 (72.5%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 50.0%
- Stability-aware: Review 81 (50.6%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 71.6%
- Risk reduction/additional review: 0.043478260869565216

## Shared Balanced Policy
- Review 246 (76.9%), Auto accuracy 100.0%, miss M/S/C 0/0/0, efficiency 45.5%
- Worst case M/S/C: 0/0/0

- spiciness: ALWAYS_REVIEW
- fried: AUTO_ALLOWED
- broth: CONFIDENCE_REVIEW 0.9
- hearty: CONFIDENCE_REVIEW 0.95
- sweetness: CONFIDENCE_REVIEW 0.95
- cheesy: CONFIDENCE_REVIEW 0.95
- chewy: ALWAYS_REVIEW
- crispy: ALWAYS_REVIEW

## Pareto frontier
- gpt-5.6-luna: 380
- gpt-5.6-terra: 4000
- Shared: 260

## Leave-one-menu-out policy stability
- spiciness: stable-ish; evidence LOW; CONFIDENCE_REVIEW:0.4
- fried: stable-ish; evidence MEDIUM; AUTO_ALLOWED:-
- broth: stable-ish; evidence MEDIUM; AUTO_ALLOWED:-
- hearty: stable-ish; evidence LOW; CONFIDENCE_REVIEW:0.4
- sweetness: stable-ish; evidence LOW; CONFIDENCE_REVIEW:0.4
- cheesy: stable-ish; evidence MEDIUM; AUTO_ALLOWED:-
- chewy: stable-ish; evidence LOW; CONFIDENCE_REVIEW:0.4
- crispy: stable-ish; evidence MEDIUM; CONFIDENCE_REVIEW:0.4

## Overfitting warning
20 menus and n=20 per attribute; optimized rules may overfit snack20-v1. Simulation only.
