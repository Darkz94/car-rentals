# Vehicle integration and auction compatibility

Every vehicle must have one entry in `TYPES` (unique `id`, `category`, `price`, `rate`, `tank`, `unlock`, `desc`, `icon`) and matching side and top-down art in `CAR_IMAGES` and `MAP_CAR_IMAGES`. Declare the horsepower in `carHorsepower`.

## One source of rental matching

`canServeCategory(requested, availableCategory)` owns all class substitutions. It is called by `carMatch` for ordinary bookings and by the offline earnings simulation. Update this one function/table when adding a new category; do not create a second set of offline exceptions.

Each `CUSTOMER_TYPES` entry needs a stable `id`, customer `name`, `need` category, `budget` and `dest`. The unlock level is derived from the matching vehicle class in `TYPES`. Business contracts use `CONTRACT_CUSTOMER_IDS` rather than numerical positions.

## Auctions

Dealer auction lots randomly select from all vehicle classes unlocked at the current reputation. Buying outright is capped at the dealership purchase price. Won lots enter the Garage with used-car condition, fuel and cleanliness via the existing `addCar` path.

Owner listings use a separate `playerAuctions` save field, leaving dealer auction `state.auction` unchanged. Listing is available only for parked vehicles; at least one other unlisted car must remain. Listed vehicles carry `status:'auction'` and may not be rented, maintained, transferred or sold directly. A listing runs for 75 seconds. Simulated bids are advanced in five-second steps, with the cursor saved to prevent double simulation on reload. At close, a winning bid removes the car and pays out once; an unsold listing restores its parked status.

Save `version:3` and the `cape-town-rentals-coastline-v3` key are intentionally unchanged. Loading older saves without `playerAuctions` supplies an empty list.

## Jeep 4x4 added

New category `Jeep` is listed immediately after Bakkie and before Van:
R149,000 purchase, R1,000 base rental income, Reputation 2, 210 HP and a 72 L tank.
It uses transparent side-view and top-down WebP art with the same
`CAR_IMAGES`/`MAP_CAR_IMAGES` rendering as the existing fleet. The top-down
sprite uses the correct 90° orientation offset when following rental routes.

The stable customer IDs `adventure-couple` and `trail-explorer` unlock at
the Jeep's reputation level. They match via the existing exact-category fallback
in `canServeCategory` for both normal and offline rentals. There is no
additional matching implementation or cross-category substitution.
The Commercial dealership filter includes Jeep, and the generic garage,
auctions, servicing, refuelling, tuning, resale, transfers and return-payment
paths apply unchanged. Existing prices and save key/version 3 are unchanged.

## Adding a new vehicle

1. Add its `TYPES` definition in the intended progression position.
2. Add both properly cropped transparent art files, and reference them in both image maps.
3. Add a realistic horsepower entry.
4. Add at least one customer with a unique stable ID and a matching category.
5. Adjust `CATEGORY_EQUIVALENTS` only if it can substitute for other booking categories.
6. Check dealer filter visibility, price/unlock progression, Garage details, Live Map sprite orientation and auction presentation.
7. Run the fleet and standalone tests, then build a debug Android APK on a feature branch.
8. Request explicit approval before merging into main.
