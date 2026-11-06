# Cape Town Rentals — Section 20 final QA

## Scope

Section 19 was approved. Final QA is applied to the existing game and game rules on \`main\` only. Do not sync \`pre-release\` or publish a signed production release without explicit approval.

## Corrective changes

- Validate the minimum shape of a version-3 manual save or imported JSON checkpoint before activating it. Older valid version-3 fields can remain absent and are filled by the original \`readSave()\` defaults.
- If checkpoint or JSON restore fails to decode, roll back the previous autosave and retain the in-memory company instead of erasing it.
- Keep all original storage key names, slot keys, export wrapper, game version, economics and vehicle IDs unchanged.
- Require correct modal state for confirmations of saved-game restore, dealership purchases, staff hiring, vehicle selling and new-company reset. Escape from a JSON-import dialog clears the pending import.
- Add regression tests using actual rental-return and owned-auction settlement functions to verify exact-once credits, successful report updates, and separation of rental revenue from auction proceeds.

## Automated checks

\`\`\`bash
node tests/fleet-audit.test.mjs
node tests/progress-section18.test.mjs
node tests/vehicle-art-section19.test.mjs
node tests/final-qa-section20.test.mjs
python3 rebuild.py
python3 tests/standalone-build.test.py
\`\`\`

GitHub Actions also checks all source image references and builds Android debug APKs.

## Manual device acceptance checklist

- Inspect Dashboard, Fleet, Live Map, Business, Events and Progress on Android portrait, including scroll, tabs, touch targets, modals and bottom navigation.
- Inspect the real 17 side profile vehicles and their top-down map icons, particularly utility and commercial classes and Section 19 transparency.
- Dispatch a hire and observe that cash is unchanged until the car returns, then confirm exactly one payout and updated business figures.
- Check garage care, purchases, auctions, 12-second branch transfers, contracts, staff salaries, upgrades, daily missions, incidents and weather.
- Export real player JSON, test all three manual slots, test importing and rejecting incompatible JSON, verify save persistence after force closing.
- Test offline standalone HTML and Android offline progression within the existing simulation cap.
- Confirm app signing/update path before any production rollout.

## Release policy

Automated tests and compilation are **not** physical Android device testing. The latest debug APK is for user visual and functional review only. Production publishing requires separate approval.
