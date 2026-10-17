# SpinSelector

SpinSelector is a simple, powerful, and portable standalone web application for making random selections. It's perfect for teachers choosing students, teams making decisions, or anyone needing a fun and fair way to pick from a list.

The entire application runs in a single HTML file with no backend or installation required, making it incredibly portable and easy to use.

## Motivation and Inspiration

This project is inspired by the excellent online tool, Wheel of Names. 

The primary motivation for creating SpinSelector was the need for a faster, offline-capable alternative. In a classroom setting, waiting for a website to load can disrupt the flow of a lesson. SpinSelector was built to be a simple, portable, and incredibly fast tool that "just works" without an internet connection, allowing teachers and other users to get things done efficiently.

## Features

- **Dynamic Wheel:** The wheel is generated instantly from your list of entries.
- **Exciting Spin:** A smooth animation accelerates and decelerates the wheel for a satisfying spin.
- **Winner Announcement:** A clear, celebratory pop-up announces the winner with confetti.
- **Remove After Picking:** Option to remove the winner from the list for elimination-style draws.
- **Customizable Themes:** Choose from multiple color themes to personalize your experience.
- **List Management:**
    - Save multiple lists directly in your browser.
    - Load any saved list with a single click.
- **Full Portability:**
    - Export all your saved lists to a single file.
    - Import lists on any other computer, making the app and your data truly portable.

## How to Use

1.  Open the `index.html` file in any modern web browser.
2.  Type your items into the "Entries" text box, with each item on a new line.
3.  Click the wheel or the **Spin** button to spin. The button also works with Enter or Space.

Use **Load** to reload the selected saved list after editing it. Importing lists asks how to handle existing names; **Undo Last Import** restores the previous saved lists until the next saved-list change or page reload.

If saved data is damaged, the app preserves the original data and loads any valid lists it can recover. **Recover Saved Lists** lets you download the untouched source before explicitly replacing it with the recovered lists. Storage errors leave the previous saved lists unchanged and do not prevent ordinary wheel use.

### Hidden Exclusions

Lists can contain hidden exclusions that remain visible on the wheel but can never be selected. Add them to an import file using the version 2 format:

```json
{
    "version": 2,
    "lists": {
        "Class A": {
            "entries": "Alice\nBob\nCharlie\nDiana",
            "excluded": ["Bob", "Diana"]
        }
    }
}
```

The `excluded` values must exactly match the entry text. They are skipped while any non-excluded entry remains. After all non-excluded entries have been removed, the remaining entries become selectable so the wheel continues to behave normally. Older files using `"List name": "entry\nentry"` remain supported and have no exclusions.

These settings are configured only by manually editing the imported JSON file. Entries remain visible normally; the interface does not display the settings, their count, or any identifying markers. Saving, copying, loading, and exporting a list preserve its settings, including names temporarily absent from the entries.

## Development checks

The app still runs directly from `index.html` with no installation or runtime network dependencies.

Run the data and storage regression tests with Node.js:

```sh
node --test tests/data.test.cjs
```

For browser checks, start a local static server and open it in a disposable Playwright CLI session. Run `tests/browser-checks.js` with the CLI's `run-code --filename` command. It uses test data and verifies the audit fixes, storage failures, keyboard flows, and unchanged hidden-selection behavior.

`tests/offline-smoke.cjs` additionally checks direct `file://` use with networking disabled, a real ten-second spin, and 2× pixel density. It requires Playwright available to Node.js; `PLAYWRIGHT_MODULE_PATH` may point to an existing installation, and `PLAYWRIGHT_CHANNEL=chrome` selects an installed Chrome browser. Screenshots go to ignored `output/playwright/`.

See the [baseline audit](AUDIT_REPORT_2026-10-17.md) and [remediation results](REMEDIATION_RESULTS_2026-10-17.md) for the findings and validation scope.

## Changelog
### 1.1.5 (October 17, 2026)
- **Consistent Results:** Lock list changes during spins, queue dialogs, and keep the wheel on the announced winner.
- **Data Protection:** Preserve damaged source data, handle storage failures without partial changes, and support special list names safely.
- **List Management:** Confirm import conflicts, allow undoing an import, and add an explicit Load button.
- **Accessibility and Display:** Add keyboard-friendly controls and dialog labels, improve text contrast and long labels, and keep wheel and confetti canvases aligned at all sizes.
- **Hidden Exclusions:** Preserve the JSON-only configuration, exact matching, fallback behavior, and absence of interface indicators.

### 1.1.4 (September 22, 2026)
- **Hidden Exclusions:** Added version 2 JSON list data with hidden exclusions that remain visible on the wheel but are skipped during selection.
- **Fallback Selection:** Once all non-excluded entries have been removed, the remaining excluded entries become selectable so the wheel remains usable without revealing the exclusions.
- **Legacy Compatibility:** Existing list files using the original plain-text format remain supported.

### 1.1.3 (June 26, 2026)
- **Sharper Wheel Text:** Rendered the wheel on a HiDPI-aware canvas to reduce blurry names on high-density and zoomed displays.

### 1.1.2 (June 26, 2026)
- **Offline Support:** Removed CDN runtime dependencies so the standalone HTML file can initialize without internet access.
- **Storage Resilience:** Added safeguards for corrupted saved-list data and invalid import files.
- **Canvas Stability:** Fixed stale wheel rendering when entries are cleared and avoided resizing canvases on every animation frame.
- **License Update:** Switched the project license to MIT and added the full license text.

### 1.1.1 (December 31, 2025)
- **Canvas Disappearance Bug:** Fixed a critical issue where the wheel content would vanish when zooming in/out or resizing the browser window. Added logic to re-render the offscreen canvas during resize events.

### 1.1.0 (September 25, 2025)
- **Performance Improvements:** Enhanced spinning animation for large lists (30+ entries) by pre-rendering the wheel segments on an offscreen canvas, significantly reducing frame drops.
- **Text Rendering Fixes:** Addressed text deformation during rotation with pixel-aligned coordinates, reduced shadow blur, and crisper positioning to minimize blurring and aliasing.
- **Optimization Tweaks:** Added debounced canvas resizing for smoother handling of window changes; preserved idle rotation but optimized animation loop.

## License

This software is open-source, created by **Hang Wong**, and licensed under the **MIT License**.
