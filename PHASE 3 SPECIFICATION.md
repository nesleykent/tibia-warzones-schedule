PHASE 3 SPECIFICATION
Market Prices + Item Modal System

---

OBJECTIVE

Phase 3 introduces a market layer into the world page. It displays a snapshot of current item prices and enables detailed exploration through a modal using historical data.

The system operates on file-based datasets:

world_itemname.json

Each file contains time-series market data for one item in one world.

---

PAGE LAYOUT INTEGRATION

The page structure must be:

SUMMARY
MANUAL SCHEDULE
MARKET PRICES
HISTORY

All blocks must share identical layout rules:

- same width
- same horizontal alignment
- same padding
- same border radius
- same background style
- same vertical spacing

Spacing between blocks:

24px vertical gap

---

PAGE LAYOUT SKETCH

+==================================================================================+
| Rasteibra |
| Historical Warzone service records |
+==================================================================================+

+------------------------------ SUMMARY -------------------------------------------+
| [ Region ] [ PvP ] [ Transfer ] [ BattlEye ] [ Timezone ] |
| [ Services Completed ] [ Mark ] [ Deathstrike ] [ Gnomevil ] [ Abyssador ] |
+----------------------------------------------------------------------------------+

+--------------------------- MANUAL SCHEDULE --------------------------------------+
| 19:00 1-2-3 |
| 21:30 1-2-3 |
+----------------------------------------------------------------------------------+

+---------------------------- MARKET PRICES ---------------------------------------+
| Item Supply Price Demand Price Updated |
|------------------------------------------------------------------------------- |
| Tibia Coins N/A 30,000 2025-01-03 09:59:07 |
| Gold Token 47,876 43,897 2025-01-03 09:59:07 |
| Silver Token 39,515 36,222 2025-01-03 09:59:16 |
| Minor Crystalline Token N/A N/A N/A |
| Gill Necklace N/A N/A N/A |
| Prismatic Necklace N/A N/A N/A |
| Prismatic Ring N/A N/A N/A |
+----------------------------------------------------------------------------------+

+------------------------------- HISTORY ------------------------------------------+
| Date Deathstrike Gnomevil Abyssador Services Mark |
|------------------------------------------------------------------------------- |
| 2026-04-04 2 2 2 2 Healthy |
| 2026-04-03 2 2 2 2 Healthy |
+----------------------------------------------------------------------------------+

---

MARKET PRICES BLOCK

Purpose

Display the latest snapshot for each tracked item.

---

ITEM ORDER (FIXED)

1. Tibia Coins
2. Gold Token
3. Silver Token
4. Minor Crystalline Token
5. Gill Necklace
6. Prismatic Necklace
7. Prismatic Ring

---

TABLE STRUCTURE

Columns:

- Item (40%)
- Supply Price (20%)
- Demand Price (20%)
- Updated (20%)

Rules:

- Supply Price = latest.day_average_sell
- Demand Price = latest.day_average_buy
- Updated = latest.time converted to page timezone
- -1 → display as N/A
- Missing data → row still rendered

Timestamp format:

YYYY-MM-DD HH:MM:SS

---

ROW INTERACTION

Each row is fully clickable.

Behavior:

- Hover: subtle highlight
- Click: opens modal overlay
- No navigation
- Page remains visible in background

---

MODAL LAYOUT

The modal appears centered above the page.

Background is dimmed.

---

MODAL LAYOUT SKETCH

PAGE BACKGROUND (DIMMED)

                +--------------------------------------------------+
                | Gold Token                                    X  |
                | Updated: 2025-01-03 09:59:07                    |
                +--------------------------------------------------+
                | [ 7D ] [ 28D ] [ 90D ] [ 180D ] [ 360D ] [ ALL ] |
                +--------------------------------------------------+
                |                                                  |
                | Supply vs Demand Chart                           |
                |                                                  |
                |  50k |                                      /\   |
                |  48k |                            /\   /\   /  \  |
                |  46k |                     /\    /  \ /  \ /    \ |
                |  44k |              ____  /  \__/                |
                |  42k |      _______/                             |
                |      +--------------------------------------     |
                |        time axis                                |
                |                                                  |
                +--------------------------------------------------+
                |                                                  |
                | Equilibrium Price Chart                          |
                |                                                  |
                |  47k |                                  *        |
                |  46k |                           *   *            |
                |  45k |                    *   *                   |
                |  44k |              *   *                         |
                |      +--------------------------------------     |
                |        time axis                                |
                |                                                  |
                +--------------------------------------------------+
                | Metrics                                           |
                |--------------------------------------------------|
                | Avg Supply Price        47,320                    |
                | Avg Supply Volume       812                       |
                | Avg Demand Price        43,540                    |
                | Avg Demand Volume       244                       |
                | Avg Spread              3,780                     |
                | Avg Transactions        151                       |
                +--------------------------------------------------+

---

MODAL STRUCTURE

1. Header
2. Range selector
3. Supply vs Demand chart
4. Equilibrium chart
5. Metrics block

---

DATA SOURCE MODEL

Each file:

world_itemname.json

Structure:

entries = fileData[0]

Each entry:

- time
- day_average_sell
- day_average_buy
- day_sold
- day_bought

---

DATA EXTRACTION

For each item:

1. Load file
2. Extract entries
3. Sort if needed
4. latest = last entry

---

RANGE FILTERING

t_now = latest.time

filtered = entries where (t_now - entry.time) ≤ window

---

EQUILIBRIUM

equilibrium = (supply + demand) / 2

---

METRICS

Avg Supply Price

avg_supply = sum(valid supply) / count

Avg Supply Volume

total_supply_volume = sum(day_sold)

Avg Demand Price

avg_demand = sum(valid demand) / count

Avg Demand Volume

total_demand_volume = sum(day_bought)

Avg Spread

avg_spread = average(supply - demand)

Avg Transactions

transactions = (day_sold + day_bought) / 2

avg_transactions = average(transactions)

---

INVALID DATA RULES

- -1 must be ignored
- never treated as zero
- if no valid values → display N/A

---

TIMESTAMP HANDLING

Input:

Unix timestamp in seconds (float)

Process:

1. Convert to milliseconds
2. Interpret as UTC
3. Convert using page timezone
4. Format:

YYYY-MM-DD HH:MM:SS

---

TIMEZONE SOURCE

Must use existing page timezone from shared.js.

Do not:

- create new timezone logic
- duplicate timezone state
- show timezone again in this block

---

DATA FLOW

Page loads
→ knows world + timezone

For each item
→ load file
→ extract latest
→ render table

User clicks row
→ load file
→ filter data
→ compute metrics
→ render modal

---

KEY CONSTRAINTS

- No item id displayed
- Fixed item order
- Table uses latest snapshot only
- Modal performs calculations
- All timestamps use page timezone
- Format: YYYY-MM-DD HH:MM:SS

---

FINAL DEFINITION

Phase 3 introduces a market snapshot table and a modal-based analytical system. The table reflects the latest state per item, while the modal derives insights from historical data. The layout integrates seamlessly between existing blocks, and all time data respects the global page timezone.
