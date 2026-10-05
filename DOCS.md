# Garden Diary

Open it from the **Garden** entry in the sidebar.

- **Today**: the four growing spots with the last 7 days, then "This week": what to sow, plant out, rate or spray, with the reason.
- **Veggies**: every vegetable on the Auckland list across the season (July to June). Bands are the guide windows, dots are what you actually did. Tap a plant to log.
- **Trees**: the same grid for the fruit trees: copper, oil and other jobs, with the reason for each.
- **Diary**: everything logged, newest first.

Every entry gets the current readings from all four sensors attached, so you can see what the temperatures were when you sowed.

## Options

Entity ids for the four sensors, and the comma-separated list of garden areas offered in the "Where" picker.

## Data

Everything is stored in `/data/garden.db` (SQLite) and `/data/photos`, inside the add-on. Back up with the normal Home Assistant backup. `api/export` returns everything as JSON.
