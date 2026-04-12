# Expected Return Calculation Methodology

Related project documentation:

- [README.md](./README.md)

This document outlines the systematic process for calculating the **Expected Return** of the Warzone Service across various game worlds. The calculation standardizes the value of rewards into Tibia Coins (TC) to facilitate cross-world profitability analysis.

## 1. Market Data Acquisition and Normalization

The calculation begins by establishing a stable price for four essential items:
- **Tibia Coins**
- **Gill Necklaces**
- **Prismatic Necklaces**
- **Prismatic Rings**

### Rolling Average Logic
To mitigate the impact of market manipulation or daily volatility, the system utilizes a **7-day rolling window**. 
1.  **Daily Mean:** For each of the 7 days, the script identifies the average of the `day_average_sell` and `day_average_buy` values.
2.  **Window Mean:** It then calculates the mean of these daily averages.
3.  **Integrity Check:** If data for any of the four items is missing within the world's history, the world is flagged as `missing_inputs` and excluded from the final rankings.

## 2. Individual Warzone Expected Value (EV)

Each Warzone reward structure is calculated independently based on fixed gold rewards, constant shard values, and dynamic market prices for equipment.

### Warzone 1 (WZ1)
The value includes a fixed gold payment and a 50% probability of receiving a Green Crystal Shard.
- **Fixed Gold:** 30,000
- **Shard Factor:** 10,500 * 0.5 (Probability-weighted)
- **Variable:** Market Price of Gill Necklace
- **Equation:** `WZ1_EV = 30,000 + 5,250 + Price_GillNecklace`

### Warzone 2 (WZ2)
This calculation includes fixed gold and the guaranteed value of Blue Crystal Shards.
- **Fixed Gold:** 40,000
- **Shard Factor:** 15,000 (Constant)
- **Variable:** Market Price of Prismatic Necklace
- **Equation:** `WZ2_EV = 40,000 + 15,000 + Price_PrismaticNecklace`

### Warzone 3 (WZ3)
The final run includes fixed gold and the guaranteed value of Violet Crystal Shards.
- **Fixed Gold:** 50,000
- **Shard Factor:** 18,000 (Constant)
- **Variable:** Market Price of Prismatic Ring
- **Equation:** `WZ3_EV = 50,000 + 18,000 + Price_PrismaticRing`

## 3. Final Expected Return Calculation

The final metric is derived by aggregating the value of the full circuit and converting it into Tibia Coins.

### Step A: Service Expected Value
The total gold value of the service is the sum of the three individual Warzone values.
`Service_EV = WZ1_EV + WZ2_EV + WZ3_EV`

### Step B: The Return Metric
To determine the "real-world" value, the total gold is divided by the local market price of a Tibia Coin.
`Expected_Return = Service_EV / Price_Tibia_Coin`

## Summary of Constants
| Constant | Value |
| :--- | :--- |
| Rolling Window | 7 Days |
| Green Shard Probability | 0.5 |
| WZ1 Fixed Gold | 30,000 |
| WZ2 Fixed Gold | 40,000 |
| WZ3 Fixed Gold | 50,000 |
