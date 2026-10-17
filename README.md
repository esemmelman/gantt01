# Gantt project planner

A shared, no-login Gantt planner with a four-level task tree, editable dates and progress, collapsible groups, search, timeline zoom, drag-to-reschedule, drag-to-resize, and CSV export.

Live: https://esemmelman.github.io/gantt01/

## Run locally

Serve this folder with any static HTTP server, for example `python -m http.server 8080`, then open http://localhost:8080. No build step or runtime packages are required.

## Backend

Uses the `bnaimitzvah` Supabase project and the isolated table `public.gantt01_20261016_tasks`. The frontend contains only its public publishable key. Anonymous users may read, create, edit, and delete these tasks. All visitors share the same data. Other project tables are untouched.

The database checks date ranges, progress values, hierarchy depth, and cycles. Deleting a task cascades to descendants. Sample tasks demonstrate all four levels and can be deleted in the interface.

The SQL schema is in `schema.sql` for reference and fresh installations; it has already been applied to the connected project. Do not run it again against the existing table.

## Publishing

The Dayflow node displays dated entries from DayFlow when expanded. It starts collapsed, loads entries in date/time order, and refreshes every minute while expanded and visible. Refresh also reloads the feed. Imported entries are read-only and remain owned by DayFlow; their bars represent their calendar dates. Names, dates, times, and colors are synchronized through a dedicated projection in the DayFlow project; notes and account details are excluded. `dayflow-feed.sql` documents the installed feed and synchronization trigger. Run `node verify-dayflow.cjs` to verify the integration without modifying entries.

GitHub Pages serves the root of the `main` branch. Push changes to `main` to publish them.

## Verification

Run `npm ci` and `npm test` with Microsoft Edge installed. The browser check exercises the connected database, creates a temporary task, verifies persistence and editing, drags its dates, and deletes it. It also checks collapse, search, CSV export, zoom, and mobile layout. For production verification, set `TEST_URL` to the live URL before running the test.
