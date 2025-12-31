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
3.  Click the wheel to spin!

## Changelog
### 1.1.1 (December 31, 2025)
- **Canvas Disappearance Bug:** Fixed a critical issue where the wheel content would vanish when zooming in/out or resizing the browser window. Added logic to re-render the offscreen canvas during resize events.

### 1.1.0 (September 25, 2025)
- **Performance Improvements:** Enhanced spinning animation for large lists (30+ entries) by pre-rendering the wheel segments on an offscreen canvas, significantly reducing frame drops.
- **Text Rendering Fixes:** Addressed text deformation during rotation with pixel-aligned coordinates, reduced shadow blur, and crisper positioning to minimize blurring and aliasing.
- **Optimization Tweaks:** Added debounced canvas resizing for smoother handling of window changes; preserved idle rotation but optimized animation loop.

## License

This software is open-source, created by **Hang Wong**, and licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.
