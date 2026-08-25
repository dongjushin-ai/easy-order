# snack20-v1 Provisional Attribute Risk Policy

**Stress-test based provisional policy. Not applied to production Owner Review or enrichment flows.**

## Attribute policies

| Attribute | Suitability | Review mode | Minimum confidence |
|---|---|---|---:|
| fried | AUTOMATION_READY | AUTO_ALLOWED | n/a |
| broth | AUTOMATION_READY | AUTO_ALLOWED | n/a |
| cheesy | AUTOMATION_READY | AUTO_ALLOWED | n/a |
| spiciness | HUMAN_REVIEW_RECOMMENDED | CONFIDENCE_REVIEW | 0.8 |
| crispy | HUMAN_REVIEW_RECOMMENDED | CONFIDENCE_REVIEW | 0.8 |
| hearty | NOT_READY | ALWAYS_REVIEW | n/a |
| sweetness | NOT_READY | ALWAYS_REVIEW | n/a |
| chewy | NOT_READY | ALWAYS_REVIEW | n/a |

## Global 0.8 vs attribute policy

| Model | Policy | Review count | Auto approval | Auto accuracy | Dangerous miss | Tier A/B/C review |
|---|---|---:|---:|---:|---:|---|
| gpt-5.6-luna | Global 0.8 | 60 | 62.5% | 80.0% | 5 | 4/10/46 |
| gpt-5.6-luna | Attribute policy | 70 | 56.3% | 83.3% | 4 | 0/10/60 |
| gpt-5.6-terra | Global 0.8 | 70 | 56.3% | 88.9% | 2 | 7/12/51 |
| gpt-5.6-terra | Attribute policy | 72 | 55.0% | 86.4% | 2 | 0/12/60 |

Provisionally stable items remain pending human validation. This report is simulation-only.
