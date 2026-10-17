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

GitHub Pages serves the root of the `main` branch. Push changes to `main` to publish them.
