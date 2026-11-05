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

## Approved Donk integration (14th vehicle)

`donk` sits after Delivery Truck and before Muscle in `TYPES`. Its price is
R365,000; base rental R2,300; reputation unlock 4; horsepower 320; tank 68 L.
Its customers are `show-promoter-zane` and `music-video-crew`, unlocked
at reputation 4 with no extra matching rules. `canServeCategory` already serves
exact category matches across ordinary and offline rentals. All existing classes
retain their balance and identity. The Donk appears in the All, Muscle and Luxury
dealership views. Side and roof images preserve supplied artwork with transparent
backgrounds. The roof sprite points right, so map rotation matches Coupe/Classic.
Version-3 saves, return-time payment, customer matching and auctions are unchanged.

## Adding a new vehicle

1. Add its `TYPES` definition in the intended progression position.
2. Add both properly cropped transparent art files, and reference them in both image maps.
3. Add a realistic horsepower entry.
4. Add at least one customer with a unique stable ID and a matching category.
5. Adjust `CATEGORY_EQUIVALENTS` only if it can substitute for other booking categories.
6. Check dealer filter visibility, price/unlock progression, Garage details, Live Map sprite orientation and auction presentation.
7. Run the fleet and standalone tests, then build a debug Android APK on a feature branch.
8. Request explicit approval before merging into main.

## Approved Tow Truck integration (15th vehicle)

`tow` sits between Classic and Delivery Truck in `TYPES`. It costs R275,000,
has a base rental of R1,650, unlocks at reputation 3, has 300 HP and a 90 L tank.
The customer IDs `roadside-rescue-nina` (Tow, R5,200, airport) and
`insurance-recovery-team` (Tow, R5,800, stellenbosch) are stable and unlock
at reputation 3. Exact-category `canServeCategory` matching applies to both
normal and offline rentals; no new towing or recovery mechanic has been added.

Transparent tow-truck WebP side and overhead sprites are referenced in
`CAR_IMAGES` and `MAP_CAR_IMAGES`; the overhead sprite points upward, like
Delivery Truck, and uses its 90° map rotation offset. The Tow Truck appears in
All and Commercial dealership views; existing roster-driven logic handles
rentals, offline returns, garage servicing, transfers, auctions and resale.
Keep save version 3 and `cape-town-rentals-coastline-v3` unchanged.
