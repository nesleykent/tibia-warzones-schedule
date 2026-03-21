# Tibia Warzones Schedule

Tibia Warzones Schedule is a static website that aggregates Warzone activity across Tibia game worlds.

It combines automated data from the TibiaData API with manually curated schedules to provide a reliable and practical overview of when Warzones happen on each world.

## Overview

Warzones in Tibia are player-organized events. There is no official schedule exposed by the game. However, Warzone activity can be inferred by tracking boss kills.

This project uses the boss Gnomevil as a proxy signal:

- Each kill of Gnomevil indicates one Warzone execution
- Kill statistics are fetched per world
- The system estimates how many Warzones occur per day

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
  "performs_warzone": true,
  "warzonesperday": 2,
  "timezone": "America/Sao_Paulo",
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

- `performs_warzone`: Indicates detected Warzone activity
- `warzonesperday`: Estimated number of Warzones per day
- `warzone_executions`: Manually curated schedule entries
- `timezone`: Reference timezone for the Warzone schedule

## How It Works

1. Fetch all worlds from TibiaData
2. For each world:

   - Fetch kill statistics
   - Count Gnomevil kills

3. Infer Warzone activity level
4. Merge with manual schedules
5. Generate `data/worlds.json`
6. Render the static frontend

## Manual Schedules

Schedules are defined in:

`data/manual-schedules.json`

This file contains:

- Execution times
- Warzone sequence order
- Reference timezone for each schedule

These entries are merged into the generated dataset.

## Frontend Features

- Compact and readable services layout
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

data/
  worlds.json
  manual-schedules.json

scripts/
  update_data.py

index.html
```

## Local Development

Create environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install requests
```

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
