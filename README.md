# SpinSelector

SpinSelector is a portable standalone web application for picking entries from a spinning wheel. It can be used for classroom activities, team decisions, and other list-based selections.

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
    - Select a saved list to load it, or use **Load** to restore the selected saved version.
- **Full Portability:**
    - Export all your saved lists to a single file.
    - Import lists on any other computer, making the app and your data truly portable.

## How to Use

1.  Open the `index.html` file in any modern web browser.
2.  Type your items into the "Entries" text box, with each item on a new line.
3.  Click the wheel to spin. You can also focus the wheel with Tab and press Enter or Space.
4.  In the result dialog, close it to keep the entry or choose **Remove Winner** to remove the selected entry from the current wheel.

Wheel labels always show the complete entry, aligned near the outer rim. Each label scales to fit its segment, so longer names use smaller text instead of ellipses or truncation. Labels use black text across all themes; darker segment colors are lightened to maintain readable contrast. The pointer sits at the rim to keep the names clear.

To save a list, enter a name under **Manage Lists** and click **Save**. Changes to entries, shuffling, and removing winners are not saved automatically. Saving under an existing name replaces that saved list; using a new name creates another saved list. Selecting a saved list loads it immediately; **Load** reloads its saved version and discards unsaved edits to the current wheel.

**Export Lists to File** exports all saved lists to `spinselector_lists.json`. Save current edits first if you want them included. Browser-saved lists are local to the browser; use exported JSON files to back them up or move them to another browser or computer.

After importing, select a saved list to load it onto the wheel. If imported list names already exist, choose **Keep Existing**, **Replace Existing**, or **Cancel**. **Undo Last Import** restores the previous saved lists until the next saved-list change or page reload.

If saved data is damaged, the app preserves the original data and loads any valid lists it can recover. **Recover Saved Lists** lets you download the untouched source before explicitly replacing it with the recovered lists. Storage errors leave the previous saved lists unchanged and do not prevent ordinary wheel use.

### Hidden Exclusions

Lists can contain hidden exclusions. Their entries remain visible on the wheel and are skipped while any non-excluded entry remains. Add them to an import file using the version 2 format:

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

## Tests

The app runs directly from `index.html` without installing dependencies. Development tests are kept in `tests/`:

- `data.test.cjs`: Unit-style tests for list data, selection rules, and storage failure handling. Run with `node --test tests/data.test.cjs`; no extra packages are required.
- `browser-checks.js`: Browser regression checks for user interactions and rendering. Open the app's local HTTP URL in a disposable Playwright CLI session, then use `run-code --filename=<absolute path to tests/browser-checks.js>`.
- `offline-smoke.cjs`: Checks direct `file://` use without network access and a real ten-second spin. Requires Playwright; run with `node tests/offline-smoke.cjs`. `PLAYWRIGHT_MODULE_PATH` can point to an existing Playwright installation, and `PLAYWRIGHT_CHANNEL=chrome` selects installed Chrome.

Generated screenshots and browser artifacts are ignored by Git, as are local audit and remediation documents.

## Changelog
### 1.1.5 (October 17, 2026)
- **Consistent Results:** Lock list changes during spins, queue dialogs, and keep the wheel on the announced winner.
- **Data Protection:** Preserve damaged source data, handle storage failures without partial changes, and support special list names safely.
- **List Management:** Confirm import conflicts, allow undoing an import, and add an explicit Load button.
- **Accessibility and Display:** Add keyboard-friendly controls and dialog labels, improve text contrast and long labels, and keep wheel and confetti canvases aligned at all sizes.
- **Wheel Labels:** Show complete names near the outer rim, scale longer names to fit, and use consistent black text with adjusted segment colors across all eight themes.
- **Spin Control:** Use the wheel itself for mouse and keyboard activation, without a separate Spin button below it.
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
