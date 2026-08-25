# Cross-domain AI Enrichment Baseline

- Mega dataset: mega20-v1 (legacy metrics)
- Snack dataset: snack20-v1
- Comparison experiment: description + batch
- Review threshold shown below: 0.6

| Metric | Mega Luna | Snack Luna | Mega Terra | Snack Terra |
|---|---:|---:|---:|---:|
| Range Accuracy | 93.6% | 66.3% | 90.7% | 63.7% |
| Strict Profile Accuracy | 55.0% | 10.0% | 75.0% | 0.0% |
| Auto Approval Accuracy @0.6 | n/a | 76.2% | n/a | 76.1% |
| Dangerous Miss @0.6 | 1 | 6 | 0 | 5 |
| ECE | 0.132 | 0.116 | 0.294 | 0.091 |

## Domain gaps

| Model | Range accuracy gap | Strict profile gap | ECE gap |
|---|---:|---:|---:|
| gpt-5.6-luna | 27.3% | 45.0% | 0.016 |
| gpt-5.6-terra | 27.0% | 75.0% | 0.203 |

## Owner review burden

| Model / dataset | Threshold | Review attributes | Auto approval | Auto approval accuracy | Dangerous misses |
|---|---:|---:|---:|---:|---:|
| gpt-5.6-luna / Mega | 0.4 | 7 | 95.0% | n/a | 1 |
| gpt-5.6-luna / Snack | 0.4 | 12 | 92.5% | 68.2% | 8 |
| gpt-5.6-luna / Mega | 0.5 | 7 | 95.0% | n/a | 1 |
| gpt-5.6-luna / Snack | 0.5 | 16 | 90.0% | 70.1% | 7 |
| gpt-5.6-luna / Mega | 0.6 | 11 | 92.1% | n/a | 1 |
| gpt-5.6-luna / Snack | 0.6 | 38 | 76.3% | 76.2% | 6 |
| gpt-5.6-luna / Mega | 0.7 | 31 | 77.9% | n/a | 1 |
| gpt-5.6-luna / Snack | 0.7 | 53 | 66.9% | 79.4% | 5 |
| gpt-5.6-luna / Mega | 0.8 | 45 | 67.9% | n/a | 1 |
| gpt-5.6-luna / Snack | 0.8 | 60 | 62.5% | 80.0% | 5 |
| gpt-5.6-terra / Mega | 0.4 | 28 | 80.0% | n/a | 0 |
| gpt-5.6-terra / Snack | 0.4 | 27 | 83.1% | 72.2% | 5 |
| gpt-5.6-terra / Mega | 0.5 | 45 | 67.9% | n/a | 0 |
| gpt-5.6-terra / Snack | 0.5 | 42 | 73.8% | 76.3% | 5 |
| gpt-5.6-terra / Mega | 0.6 | 57 | 59.3% | n/a | 0 |
| gpt-5.6-terra / Snack | 0.6 | 47 | 70.6% | 76.1% | 5 |
| gpt-5.6-terra / Mega | 0.7 | 77 | 45.0% | n/a | 0 |
| gpt-5.6-terra / Snack | 0.7 | 58 | 63.7% | 84.3% | 2 |
| gpt-5.6-terra / Mega | 0.8 | 96 | 31.4% | n/a | 0 |
| gpt-5.6-terra / Snack | 0.8 | 70 | 56.3% | 88.9% | 2 |

## Snack attribute results

| Model | Attribute | Accuracy | n | Mean error | Confidence |
|---|---|---:|---:|---:|---:|
| gpt-5.6-luna | spiciness | 80.0% | 20 | 0.013 | 0.732 |
| gpt-5.6-luna | fried | 100.0% | 20 | 0.000 | 0.898 |
| gpt-5.6-luna | broth | 75.0% | 20 | 0.060 | 0.893 |
| gpt-5.6-luna | hearty | 30.0% | 20 | 0.086 | 0.680 |
| gpt-5.6-luna | sweetness | 35.0% | 20 | 0.050 | 0.485 |
| gpt-5.6-luna | cheesy | 90.0% | 20 | 0.003 | 0.892 |
| gpt-5.6-luna | chewy | 45.0% | 20 | 0.024 | 0.657 |
| gpt-5.6-luna | crispy | 75.0% | 20 | 0.007 | 0.910 |
| gpt-5.6-terra | spiciness | 80.0% | 20 | 0.018 | 0.708 |
| gpt-5.6-terra | fried | 100.0% | 20 | 0.000 | 0.917 |
| gpt-5.6-terra | broth | 85.0% | 20 | 0.004 | 0.790 |
| gpt-5.6-terra | hearty | 30.0% | 20 | 0.121 | 0.652 |
| gpt-5.6-terra | sweetness | 20.0% | 20 | 0.134 | 0.367 |
| gpt-5.6-terra | cheesy | 90.0% | 20 | 0.025 | 0.757 |
| gpt-5.6-terra | chewy | 30.0% | 20 | 0.041 | 0.585 |
| gpt-5.6-terra | crispy | 75.0% | 20 | 0.007 | 0.877 |

## Hybrid estimate (Snack, description + batch)

Luna predictions below threshold are evaluated with the already-collected Terra prediction; Terra below threshold goes to owner review. This estimates routing only and does not claim independent second-call behavior.

| Threshold | Luna auto | Terra escalation | Owner review | Accepted accuracy | Dangerous accepted |
|---:|---:|---:|---:|---:|---:|
| 0.6 | 122 | 38 | 31 | 74.4% | 7 |
| 0.7 | 107 | 53 | 47 | 80.5% | 5 |
| 0.8 | 100 | 60 | 57 | 80.6% | 5 |

## Interpretation

- Luna was stronger on Snack overall range accuracy (66.3% vs 63.7%), but both were much weaker than their Mega baselines.
- Ingredient/style attributes fried, broth, and cheesy were relatively stable. Continuous/subjective attributes hearty and sweetness, plus texture attribute chewy, were weakest.
- A single global threshold is not supported by these two datasets alone: Snack requires substantially more review to control dangerous misses, and the weak attributes are domain-specific.
- Mega auto-approval accuracy is unavailable because the preserved legacy baseline lacks all predictions; it is intentionally not reconstructed.
- Production configuration remains unconfirmed pending Ground Truth review and a repeat run for stability.
