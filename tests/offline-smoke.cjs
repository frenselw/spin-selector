// Requires a Playwright installation; the application itself has no dependencies.
// PLAYWRIGHT_MODULE_PATH can point to an existing bundled Playwright package.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
    const browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {})
    });
    try {
        const context = await browser.newContext({ offline: true, deviceScaleFactor: 2, viewport: { width: 1024, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        const externalRequests = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
        await page.addInitScript(() => {
            const original = CanvasRenderingContext2D.prototype.rotate;
            CanvasRenderingContext2D.prototype.rotate = function (angle) {
                if (this.canvas.id === 'wheel') window.testWheelAngle = angle;
                return original.call(this, angle);
            };
        });
        await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
        assert.equal(await page.title(), 'SpinSelector');
        await page.evaluate(() => localStorage.setItem('spinSelectorLists', JSON.stringify({
            version: 2, lists: { Offline: { entries: 'Alice\nBob\nCharlie', excluded: ['Alice', 'Charlie'] } }
        })));
        await page.reload();
        await page.locator('#saved-lists-dropdown').selectOption('Offline');
        assert.equal(await page.locator('#names').inputValue(), 'Alice\nBob\nCharlie');
        await page.locator('#wheel').focus();
        const started = Date.now();
        await page.keyboard.press('Enter');
        await page.locator('#winnerModal').waitFor({ state: 'visible', timeout: 15000 });
        const elapsedMs = Date.now() - started;
        assert.ok(elapsedMs >= 9500 && elapsedMs < 15000, `Unexpected real animation duration: ${elapsedMs}`);
        assert.equal(await page.locator('#winner-name').textContent(), 'Bob');
        assert.ok(await page.evaluate(() => {
            const angle = ((1.5 * Math.PI - window.testWheelAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
            return Math.floor(angle / (2 * Math.PI / 3)) === 1;
        }));
        await page.keyboard.press('Escape');
        const output = path.join(__dirname, '..', 'output', 'playwright');
        fs.mkdirSync(output, { recursive: true });
        for (const [width, height] of [[1024, 900], [390, 844], [1600, 900]]) {
            await page.setViewportSize({ width, height });
            await page.waitForTimeout(200);
            assert.ok(await page.evaluate(() => {
                const wheel = document.querySelector('#wheel');
                const rect = wheel.getBoundingClientRect();
                const confetti = document.querySelector('#confetti-canvas').getBoundingClientRect();
                return Math.abs(rect.width - rect.height) < .1 && Math.abs(wheel.width - rect.width * devicePixelRatio) < 1
                    && rect.x === confetti.x && rect.y === confetti.y && document.documentElement.scrollWidth <= innerWidth;
            }), `Canvas geometry failed at ${width}x${height}`);
            await page.screenshot({ path: path.join(output, `offline-${width}.png`), fullPage: true });
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(externalRequests, []);
        console.log(JSON.stringify({ passed: true, url: 'file://', offline: true, deviceScaleFactor: 2, elapsedMs,
            viewports: ['1024x900', '390x844', '1600x900'], winner: 'Bob', externalRequests: 0, uncaughtErrors: 0 }));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
