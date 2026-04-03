# Tibia Warzones Schedule

Tibia Warzones Schedule is a static website that aggregates Warzone activity across Tibia game worlds.

It combines automated data from the TibiaData API with manually curated schedules to provide a reliable and practical overview of when Warzones happen on each world.

## Overview

Warzones in Tibia are player-organized events. There is no official schedule exposed by the game. However, Warzone activity can be inferred by tracking boss kills.

This project tracks the 3 Warzone bosses:

- Deathstrike
- Gnomevil
- Abyssador

A completed Warzone service is counted when all 3 appear in the daily kill statistics.

The system computes:

- `services_completed = min(Deathstrike, Gnomevil, Abyssador)`
- Automatic server marks: `healthy`, `trolls`, `inconclusive`
- Persistent daily history per world

Since the API does not provide exact execution times, schedules are manually curated and stored in the project.

## Data Sources

- Worlds list: https://api.tibiadata.com/v4/worlds
- Kill statistics: https://api.tibiadata.com/v4/killstatistics/{world}

## Data Model

Each world is stored in `data/worlds.json`:

```json
{
  "name": "Gentebra",
  "location": "South America",
  "pvp_type": "Optional PvP",
  "transfer_type": "regular",
  "battleye_protected": true,
  "battleye_date": "2017-12-12",
  "tracks_warzone_service": true,
  "warzone_services_per_day": 2,
  "timezone": "America/Sao_Paulo",
  "last_detected_kills": {
    "Deathstrike": 2,
    "Gnomevil": 2,
    "Abyssador": 2
  },
  "last_detected_services": 2,
  "mark": "healthy",
  "warzone_executions": [
    {
      "execution_id": 1,
      "schedule_time": "17:00",
      "warzone_sequence": "1-3-2"
    }
  ]
}
```

## Key Fields

- `tracks_warzone_service`: Indicates detected Warzone activity
- `warzone_services_per_day`: Completed Warzone services detected in the last day
- `last_detected_kills`: Per-boss kill counts for the last day
- `last_detected_services`: Minimum of the 3 tracked boss counts
- `mark`: Automatic world classification based on kill symmetry
- `warzone_executions`: Manually curated schedule entries
- `timezone`: Reference timezone for the Warzone schedule

## How It Works

1. Fetch all worlds from TibiaData
2. For each world:

   - Fetch kill statistics
   - Extract Deathstrike, Gnomevil, and Abyssador kills
   - Compute completed services and automatic mark

3. Persist or replace the daily history entry in `data/history/{world}.json`
4. Merge with manual schedules
5. Generate `data/worlds.json`
6. Render the static frontend and world history page

## Manual Schedules

Schedules are defined in:

`data/manual-schedules.json`

This file contains:

- Execution times
- Warzone sequence order
- Reference timezone for each schedule

These entries are merged into the generated dataset.

## Historical Records

Each world has a dedicated history file:

`data/history/{world}.json`

The updater:

- Reads existing history
- Replaces the record for the current date if it already exists
- Appends a new record for a new day
- Sorts history newest first

## Frontend Features

- Compact and readable services layout
- 3 boss kill breakdown per world
- Automatic server mark display
- Dedicated world history page
- Timezone conversion for all schedule times
- Multiple languages:

  - English
  - Portuguese (Brazil)
  - Spanish (LATAM)
  - Polish

- BattlEye classification:

  - GBE, Green BattlEye
  - YBE, Yellow BattlEye

- Search by world name

## Timezone Handling

- Each schedule uses a reference timezone
- Users can select their own display timezone
- All times are converted dynamically in the browser

## Project Structure

```
assets/
  app.js
  styles.css
  world.js

data/
  history/
  worlds.json
  manual-schedules.json

scripts/
  update_data.py

index.html
world.html
```

## Local Development

Create environment:

Run data update:

```bash
python scripts/update_data.py
```

Run local server:

```bash
python -m http.server 8000
```

Open:

[http://localhost:8000](http://localhost:8000)

## Deployment

The project runs entirely on GitHub Pages.

Steps:

1. Push to `main`
2. Open repository Settings
3. Go to Pages
4. Select:

   - Branch: `main`
   - Folder: `/ (root)`

## Future Improvements

- Global timeline view across all worlds
- Improved schedule editing workflow
- Filtering by region, PvP type and time
- Better validation of manual schedule data

## Purpose

This project reduces uncertainty in Warzone participation by aggregating collective behavior patterns into a clear and accessible schedule.

It acts as a coordination tool for players across different worlds and timezones.
