// Run with playwright-cli run-code --filename=<absolute path to this file>.
// Use a disposable browser session pointed at the app's local HTTP URL.
async (page) => {
    page.setDefaultTimeout(5000);
    const base = page.url().split('?')[0].split('#')[0];
    const results = [];
    const errors = [];
    const onError = error => errors.push(error.message);
    page.on('pageerror', onError);
    const check = (name, passed, detail) => {
        if (!passed) throw new Error(`${name}: ${JSON.stringify(detail)}`);
        results.push(name);
    };
    await page.addInitScript(() => {
        if (window.spinRegressionInstalled) return;
        window.spinRegressionInstalled = true;
        window.testNow = performance.now();
        Object.defineProperty(performance, 'now', { value: () => window.testNow });
        Math.random = () => .1;
        window.wheelAngle = 0;
        window.wheelLabels = [];
        window.wheelFillColors = [];
        const fill = CanvasRenderingContext2D.prototype.fill;
        CanvasRenderingContext2D.prototype.fill = function () {
            if (!this.canvas.id) window.wheelFillColors.push(this.fillStyle);
            return fill.apply(this, arguments);
        };
        const rotate = CanvasRenderingContext2D.prototype.rotate;
        CanvasRenderingContext2D.prototype.rotate = function (angle) {
            if (this.canvas.id === 'wheel') window.wheelAngle = angle;
            return rotate.call(this, angle);
        };
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (text, x, y) {
            if (!this.canvas.id) window.wheelLabels.push({ text, x, width: this.measureText(text).width, color: this.fillStyle });
            return fillText.apply(this, arguments);
        };
        if (location.search.includes('test-storage=blocked')) {
            Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
        }
        if (location.search.includes('test-storage=restored')) {
            const storage = window.localStorage;
            storage.setItem('spinSelectorLists', JSON.stringify({ Existing: 'Keep me' }));
            window.storageBlocked = true;
            Object.defineProperty(window, 'localStorage', { get() {
                if (window.storageBlocked) throw new DOMException('Blocked', 'SecurityError');
                return storage;
            } });
        }
    });
    const close = () => page.keyboard.press('Escape');
    const seed = async lists => {
        await page.goto(base);
        await page.evaluate(lists => {
            localStorage.clear();
            localStorage.setItem('spinSelectorLists', JSON.stringify({ version: 2, lists }));
        }, lists);
        await page.reload();
    };
    const upload = async value => {
        await page.evaluate(text => {
            const transfer = new DataTransfer();
            transfer.items.add(new File([text], 'lists.json', { type: 'application/json' }));
            const input = document.querySelector('#import-file-input');
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }, typeof value === 'string' ? value : JSON.stringify(value));
        await page.waitForFunction(() => document.querySelector('#infoModal').classList.contains('show'));
    };
    const finishSpin = async () => {
        await page.evaluate(() => window.testNow += 10010);
        await page.waitForFunction(() => document.querySelector('#winnerModal').classList.contains('show'));
    };
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('spinSelectorLists')).lists);
    const classRecord = { entries: 'Alice\nBob\nCharlie', excluded: ['Alice', 'Charlie'] };

    await seed({ Class: classRecord, Other: { entries: 'Other', excluded: [] } });
    check('Undo is hidden before any import', await page.locator('#undo-import-btn').isHidden());
    await page.locator('#saved-lists-dropdown').selectOption('Class');
    await page.locator('#spin-btn').focus();
    await page.keyboard.press('Enter');
    check('F01: mutation controls lock during a keyboard-started spin', await page.evaluate(() =>
        ['names', 'shuffle', 'saved-lists-dropdown', 'load-list-btn', 'save-list-btn', 'delete-list-btn', 'import-lists-btn']
            .every(id => document.getElementById(id).disabled)));
    await page.evaluate(() => {
        const input = document.querySelector('#names');
        input.value = 'Changed';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await finishSpin();
    check('F01: an input event cannot replace the spin snapshot', await page.locator('#names').inputValue() === classRecord.entries);
    check('hidden settings: eligible winner and visible wheel agree', await page.evaluate(() => {
        const index = Math.floor((((1.5 * Math.PI - window.wheelAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI / 3));
        return document.querySelector('#winner-name').textContent === 'Bob' && index === 1;
    }));
    const resultAngle = await page.evaluate(() => window.wheelAngle);
    await page.waitForTimeout(1500);
    check('F09: result stays fixed while the dialog is open', await page.evaluate(() => window.wheelAngle) === resultAngle);
    await page.locator('#remove-winner-btn').click();
    check('Remove Winner removes exactly the selected entry', await page.locator('#names').inputValue() === 'Alice\nCharlie');
    await page.locator('#spin-btn').focus();
    await page.keyboard.press('Space');
    await finishSpin();
    check('hidden settings: fallback remains usable', await page.locator('#winner-name').textContent() === 'Alice');
    await close();
    const fallbackAngle = await page.evaluate(() => window.wheelAngle);
    await page.waitForTimeout(200);
    check('F09: result stays fixed after closing the dialog', await page.evaluate(() => window.wheelAngle) === fallbackAngle);

    await page.locator('#list-name-input').fill('Copy');
    await page.locator('#save-list-btn').click();
    await close();
    check('hidden settings survive Save As', JSON.stringify((await stored()).Copy.excluded) === JSON.stringify(classRecord.excluded));
    await page.locator('#list-name-input').fill('__proto__');
    await page.locator('#save-list-btn').click();
    await close();
    check('F04: special names save as real lists without inherited options', await page.evaluate(() => {
        const lists = JSON.parse(localStorage.getItem('spinSelectorLists')).lists;
        const options = [...document.querySelector('#saved-lists-dropdown').options].map(option => option.value);
        return Object.prototype.hasOwnProperty.call(lists, '__proto__') && !options.includes('entries') && !options.includes('excluded');
    }));
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#export-lists-btn').click();
    check('Export remains a downloadable JSON file', (await downloadEvent).suggestedFilename() === 'spinselector_lists.json');
    check('hidden settings have no visible or accessible UI indicators', await page.evaluate(() => {
        const text = document.body.innerText + [...document.querySelectorAll('[aria-label]')].map(element => element.getAttribute('aria-label')).join(' ');
        return !/excluded|exclusion|排除/i.test(text);
    }));

    await seed({ Single: { entries: 'Alice\nBob', excluded: [] } });
    await page.locator('#saved-lists-dropdown').selectOption('Single');
    await page.locator('#names').fill('Unsaved');
    await page.locator('#load-list-btn').click();
    check('F08: Load restores the same selected list', await page.locator('#names').inputValue() === 'Alice\nBob');
    await page.locator('#delete-list-btn').click();
    check('F08: Delete still targets the selected list', (await page.locator('#infoModalBody').textContent()).includes('Single'));
    await close();

    await page.locator('#import-lists-btn').focus();
    check('F05: Import is a focusable named button', await page.evaluate(() =>
        document.activeElement.id === 'import-lists-btn' && document.activeElement.tagName === 'BUTTON'));
    const replacement = { version: 2, lists: { Single: { entries: 'Replacement', excluded: ['Absent'] }, New: { entries: 'New', excluded: [] } } };
    await upload(replacement);
    check('F06: conflict preview precedes any write', await page.locator('#infoModalTitle').textContent() === 'Import Conflicts' && (await stored()).Single.entries === 'Alice\nBob');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    check('F06: cancelling an import preserves all lists', Object.keys(await stored()).length === 1);
    await upload(replacement);
    await page.getByRole('button', { name: 'Keep Existing', exact: true }).click();
    await close();
    check('F06: Keep Existing imports only new names', (await stored()).Single.entries === 'Alice\nBob' && (await stored()).New.entries === 'New');
    await page.locator('#undo-import-btn').click();
    await close();
    check('F06: Undo restores the exact pre-import lists', Object.keys(await stored()).length === 1);
    await upload(replacement);
    await page.getByRole('button', { name: 'Replace Existing', exact: true }).click();
    await close();
    check('F06: explicit replacement retains imported hidden settings', JSON.stringify((await stored()).Single) === JSON.stringify(replacement.lists.Single));
    await page.locator('#undo-import-btn').click();
    await close();
    await upload('{not JSON');
    check('Invalid imports leave storage unchanged', await page.locator('#infoModalTitle').textContent() === 'Import Error' && Object.keys(await stored()).length === 1);
    await close();
    await page.evaluate(() => {
        window.realFileReader = window.FileReader;
        window.FileReader = class {
            readAsText() { queueMicrotask(() => this.onerror(new Event('error'))); }
        };
    });
    await upload({ Unreadable: 'New' });
    check('File read errors restore controls and preserve stored data', (await page.locator('#infoModalBody').textContent()).includes('could not be read') && Object.keys(await stored()).length === 1);
    await close();
    await page.evaluate(() => window.FileReader = class {
        readAsText() { throw new DOMException('Unreadable', 'NotReadableError'); }
    });
    await upload({ Unreadable: 'New' });
    check('Synchronous file read failures do not leave Import locked', (await page.locator('#infoModalBody').textContent()).includes('could not be read') && !await page.locator('#import-lists-btn').isDisabled());
    await close();
    await page.evaluate(() => window.FileReader = window.realFileReader);

    await page.locator('#spin-btn').click();
    await page.locator('#about-btn').click();
    await page.evaluate(() => window.testNow += 10010);
    await page.waitForTimeout(100);
    check('F07: result queues behind About instead of overlapping', await page.evaluate(() =>
        document.querySelectorAll('.modal.show').length === 1 && document.querySelector('.modal.show').id === 'aboutModal' && document.activeElement.closest('.modal').id === 'aboutModal'));
    await close();
    check('F07: closing About presents the queued result', await page.evaluate(() =>
        document.querySelectorAll('.modal.show').length === 1 && document.querySelector('.modal.show').id === 'winnerModal' && document.activeElement.closest('.modal').id === 'winnerModal'));
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    check('F05/F07: focus remains in the active named dialog', await page.evaluate(() => document.activeElement.closest('.modal')?.id === 'winnerModal'));
    await close();
    check('F07: background interaction resumes after dialogs', await page.evaluate(() => !document.querySelector('#app-main').inert));

    for (const [width, height] of [[390, 844], [1024, 900], [1600, 900]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(150);
        const geometry = await page.evaluate(() => {
            const wheel = document.querySelector('#wheel').getBoundingClientRect();
            const confetti = document.querySelector('#confetti-canvas').getBoundingClientRect();
            return { square: Math.abs(wheel.width - wheel.height) < .1, aligned: Math.abs(wheel.x - confetti.x) < .1 && Math.abs(wheel.y - confetti.y) < .1, noOverflow: document.documentElement.scrollWidth <= innerWidth };
        });
        check(`F11/F12: square aligned canvases at ${width}x${height}`, geometry.square && geometry.aligned && geometry.noOverflow, geometry);
    }
    await page.locator('#names').fill('A\nB\nC\nD\nE\nF\nG\nH');
    const luminance = hex => {
        const rgb = hex.match(/[a-f\d]{2}/gi).map(part => parseInt(part, 16) / 255)
            .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    for (const theme of ['dark', 'neon', 'oceanic', 'pastel', 'forest', 'sunset', 'grayscale', 'light']) {
        await page.evaluate(() => { window.wheelLabels = []; window.wheelFillColors = []; });
        await page.locator('[data-bs-toggle="dropdown"]').click();
        await page.locator(`[data-theme="${theme}"]`).click();
        const rendered = await page.evaluate(() => ({ labels: window.wheelLabels.slice(-8), backgrounds: window.wheelFillColors.slice(-8) }));
        check(`F10: every ${theme} segment has readable fill contrast`, rendered.labels.length === 8 && rendered.labels.every((label, index) => {
            const a = luminance(label.color);
            const b = luminance(rendered.backgrounds[index]);
            return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5;
        }), rendered);
    }
    await page.locator('#names').fill('ABCDEFGHIJKLMNOPQRSTUVWXYZ ABCDEFGHIJKLMNOPQRSTUVWXYZ\nBob');
    await page.evaluate(() => window.wheelLabels = []);
    await page.locator('[data-bs-toggle="dropdown"]').click();
    await page.locator('[data-theme="pastel"]').click();
    const labels = await page.evaluate(() => window.wheelLabels);
    check('F10: pale segments use dark text', labels.length > 0 && labels.every(label => label.color === '#000000'), labels);
    check('F13: long labels shorten visually and retain pointer clearance', labels.some(label => label.text.endsWith('…')) && labels.every(label => label.width <= label.x && label.x <= 765 / 2 - 45), labels);
    check('F13: full source names remain intact', (await page.locator('#names').inputValue()).startsWith('ABCDEFGHIJKLMNOPQRSTUVWXYZ ABCDEFGHIJKLMNOPQRSTUVWXYZ'));

    await page.evaluate(() => localStorage.setItem('spinSelectorLists', '{"good":"a","bad":123}'));
    await page.reload();
    check('F02: partial recovery preserves original storage', await page.evaluate(() => localStorage.getItem('spinSelectorLists') === '{"good":"a","bad":123}'));
    await page.locator('#saved-lists-dropdown').selectOption('good');
    check('F02: valid records remain available', await page.locator('#names').inputValue() === 'a');
    await page.locator('#list-name-input').fill('New');
    await page.locator('#save-list-btn').click();
    check('F02: ordinary Save cannot overwrite protected source', await page.locator('#infoModalTitle').textContent() === 'Recovery Needed' && await page.evaluate(() => localStorage.getItem('spinSelectorLists') === '{"good":"a","bad":123}'));
    await close();
    await page.locator('#storage-recovery-btn').click();
    const recoveryDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Original', exact: true }).click();
    check('F02: original recovery file can be downloaded', (await recoveryDownload).suggestedFilename() === 'spinselector_recovery.json');
    await page.locator('#storage-recovery-btn').click();
    await page.getByRole('button', { name: 'Use Recovered Lists', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    check('F02: cancelling recovery retains the source', await page.evaluate(() => localStorage.getItem('spinSelectorLists') === '{"good":"a","bad":123}'));
    await page.locator('#storage-recovery-btn').click();
    await page.getByRole('button', { name: 'Use Recovered Lists', exact: true }).click();
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await close();
    check('F02: only explicit recovery confirmation replaces the source', (await stored()).good.entries === 'a' && !('bad' in await stored()) && await page.locator('#storage-notice').isHidden());

    await seed({ Single: { entries: 'Alice', excluded: [] } });
    await page.evaluate(() => Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); });
    await page.locator('#list-name-input').fill('Failed');
    await page.locator('#save-list-btn').click();
    check('F03: Save failure is visible and rolls back data', await page.locator('#infoModalTitle').textContent() === 'Storage Error' && !('Failed' in await stored()));
    await close();
    await upload({ Added: 'New' });
    check('F03: import write failure reports storage instead of JSON', await page.locator('#infoModalTitle').textContent() === 'Storage Error' && !('Added' in await stored()));
    await close();
    await page.locator('#saved-lists-dropdown').selectOption('Single');
    await page.locator('#delete-list-btn').click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    check('F03: Delete failure retains the original list', await page.locator('#infoModalTitle').textContent() === 'Storage Error' && (await stored()).Single.entries === 'Alice');
    await close();
    await page.goto(base + '?test-storage=blocked');
    check('F03: blocked storage does not prevent wheel initialization', await page.evaluate(() => document.querySelector('#wheel').width > 300 && !document.querySelector('#spin-btn').disabled));
    await page.locator('#spin-btn').click();
    await finishSpin();
    check('F03: ordinary selection still works with blocked storage', (await page.locator('#winner-name').textContent()).length > 0);
    await close();
    await page.goto(base + '?test-storage=restored');
    await page.evaluate(() => window.storageBlocked = false);
    await page.locator('#list-name-input').fill('New');
    await page.locator('#save-list-btn').click();
    check('F03: restored access cannot overwrite previously unread saved data', await page.locator('#infoModalTitle').textContent() === 'Reload Needed'
        && await page.evaluate(() => localStorage.getItem('spinSelectorLists') === '{"Existing":"Keep me"}'));
    await close();
    check('No uncaught application errors across the regression flows', errors.length === 0, errors);
    page.off('pageerror', onError);
    return { passed: results.length, checks: results };
}
