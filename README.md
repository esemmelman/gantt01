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

On startup, all first-level nodes are shown collapsed. The Task date range dropdown filters tasks overlapping today through 3, 5, 10, or 30 days ahead, with their ancestors retained. This also applies to dated DayFlow entries, which are fetched while Dayflow remains initially collapsed. Show all reveals expired, undated, and later tasks; Selecting a day range restores the filter. A node's focused Gantt view shows its complete subtree. Run `node verify-window.cjs` to verify date boundaries and ancestor visibility.

Click any editable node name to open its adjacent action menu, including Edit, Add sibling, and Add child (through level four). First-level nodes also offer Doc, Gantt, and Check. Doc stores sanitized rich text with headings, emphasis, and lists. Check stores editable checkbox items. Each screen has a Save button and warns before discarding unsaved changes. Gantt expands and focuses the selected node, and Edit opens the node editor. Documents and checklists use `gantt01_20261017_node_content` in bnaimitzvah and are deleted with their node. Run `node verify-node-tools.cjs` to verify menu behavior, formatting, persistence, checklist editing, and mobile layout using a temporary node that is removed afterward.

The Dayflow node displays dated entries from today onward from DayFlow when expanded. It starts collapsed, loads entries in date/time order, and refreshes every minute while expanded and visible. Refresh also reloads the feed. Imported entries remain owned by DayFlow; names and dates are read-only. Completion checkboxes are saved in the Gantt app, using native task progress or the isolated completion override table for imported entries. Completed bars have light red shading; their bars represent their calendar dates. Names, dates, times, and colors are synchronized through a dedicated DayFlow projection in the bnaimitzvah project; notes and account details are excluded. `dayflow-feed.sql` documents the installed feed and synchronization trigger. Run `node verify-dayflow.cjs` to verify the integration without modifying entries.

GitHub Pages serves the root of the `main` branch. Push changes to `main` to publish them.

## Verification

Run `npm ci` and `npm test` with Microsoft Edge installed. The browser check exercises the connected database, creates a temporary task, verifies persistence and editing, drags its dates, and deletes it. It also checks collapse, search, CSV export, zoom, and mobile layout. For production verification, set `TEST_URL` to the live URL before running the test.

On Android, the timeline is rendered as a document-style list of nodes with dates beside them. Hierarchy controls, completion, node menus, and DayFlow times remain available. Other platforms retain the Gantt chart. Run `node verify-android.cjs` for Android emulation and desktop comparison.

Drag a node name to move it and its subtree. Drop near the top or bottom of a node to reorder siblings, in the middle to nest it, or on ← All nodes to move it to the top level. Moves persist, respect the four-level limit, and prevent cycles. DayFlow entries cannot be moved. Siblings now follow saved order.

Link in the node menu opens a saved URL in a new tab, or asks for a URL when none is saved. Links are shared and persist with each node. Use Edit → Link URL to change or remove a link. Only HTTP and HTTPS URLs are accepted.

The node-level dropdown shows every branch through the selected level (1st through 4th). Selecting a level exits a focused branch and clears search; the task date filter remains in effect. Individual branches can still be expanded or collapsed.
