# Easy Order usability QA scenarios

## Automated reducer and engine coverage

- Scenario A — Cafe recommendation: answer a generated question, go back, change the answer, and verify the recommendation state is replayed from history. Then select a menu, add options, and complete payment.
- Scenario B — Direct cafe order: add the same menu as separate items with different options, increase quantity to three, decrease to two, confirm one item deletion, and verify total quantity and price.
- Scenario C — Snack store recovery: add a snack menu, force `card-read-failed`, verify the cart remains, retry, and complete successfully.
- Scenario D — Help overlay: open and close help during a question; verify question history, cart, and current screen remain unchanged.
- Scenario E — Reset recovery: select a menu, reset, and verify selection, history, cart, payment, and order number are cleared.
- Scenario F — Store switch: create a cafe cart, switch to the snack store, and verify the old cart and recommendation history are cleared.
- Scenario G — Large Text Mode: toggle large text, navigate through question, result, option, and cart screens, and verify the preference survives reset/store changes.

Run automated coverage with `npm test`. The reducer test covers cart add/remove, quantity bounds, duplicate-action guards, payment failure/retry, reset, help-state preservation, and store switching.

## Manual kiosk checks

Test at 9:16 portrait and a narrow mobile viewport:

1. Confirm every primary button is at least 56px high and quantity/delete controls are at least 48px.
2. Confirm selected options show a border, background, and `✓ 선택됨`, not color alone.
3. Confirm each scrollable menu/cart/options region includes a visible scrolling hint.
4. Open both help and delete-confirmation dialogs and verify the large close/cancel control receives focus.
5. Test all four explicit demo payment outcomes. No failure may clear the cart.
6. Confirm payment controls cannot be activated while processing.
7. In Large Text Mode, verify menu names, prices, question choices, cart options, and dialogs remain readable without horizontal overflow.
8. On completion, confirm the order number is prominent and the reset notice appears before the 10-second automatic reset.
