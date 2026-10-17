const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script id="list-data">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(script, context);
const data = vm.runInContext('SpinSelectorData', context);
const plain = value => JSON.parse(JSON.stringify(value));
const record = (entries, excluded = []) => ({ entries, excluded });
const lists = input => data.normalizeLists(input).lists;
const memoryStorage = initial => {
    const values = new Map(initial === undefined ? [] : [['spinSelectorLists', initial]]);
    return {
        values,
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem() { throw new Error('Recovery must not delete the original data'); }
    };
};

test('legacy and v2 formats preserve exact text, duplicate entries and hidden settings', () => {
    assert.deepEqual(plain(lists({ Class: 'Bob\nBob \nBob' })), { Class: record('Bob\nBob \nBob') });
    const result = lists({ version: 2, lists: { Class: record('Bob\nBob \nBob', ['Bob', 'Bob', 'Absent']) } });
    assert.deepEqual(plain(result), { Class: record('Bob\nBob \nBob', ['Bob', 'Absent']) });
    assert.deepEqual(plain(lists(JSON.parse(data.serialize(result)))), plain(result));
});

test('special list names remain own properties through save, copy and export', () => {
    const input = JSON.parse('{"__proto__":{"entries":"Alice","excluded":["Bob"]},"constructor":"C","toString":"T"}');
    const result = data.copyLists(lists(input));
    assert.equal(Object.getPrototypeOf(result), null);
    assert.deepEqual(Object.keys(result), ['__proto__', 'constructor', 'toString']);
    assert.equal(data.hasOwn(result, '__proto__'), true);
    assert.deepEqual(plain(lists(JSON.parse(data.serialize(result)))), {
        ['__proto__']: record('Alice', ['Bob']), constructor: record('C'), toString: record('T')
    });
    assert.equal({}.entries, undefined);
});

test('strict import rejects any bad record or unsupported format', () => {
    for (const input of [null, [], 123, { Class: 123 }, { version: 3, lists: {} }, { version: 2, lists: [] },
        { Class: record('A', [123]) }, { ' ': 'A' }]) {
        assert.throws(() => data.normalizeLists(input));
    }
});

test('corrupt records are isolated without deleting or rewriting the source', () => {
    const original = '{"good":"a","bad":123}';
    const storage = memoryStorage(original);
    const store = data.createStore(() => storage);
    assert.equal(store.load().recovery, true);
    assert.deepEqual(plain(store.lists), { good: record('a') });
    assert.equal(store.recoveryRaw, original);
    assert.equal(storage.getItem('spinSelectorLists'), original);
    assert.equal(store.save(lists({ New: 'B' })).reason, 'recovery');
    assert.equal(storage.getItem('spinSelectorLists'), original);
});

test('broken JSON, wrong top-level types and future versions remain recoverable', () => {
    for (const original of ['{broken', 'null', '[]', '{"version":99,"lists":{"A":"B"}}']) {
        const storage = memoryStorage(original);
        const store = data.createStore(() => storage);
        assert.equal(store.load().recovery, true);
        assert.equal(store.recoveryRaw, original);
        assert.equal(storage.getItem('spinSelectorLists'), original);
        assert.deepEqual(Object.keys(store.lists), []);
    }
});

test('recovery only replaces the source after an explicit successful recovery save', () => {
    const storage = memoryStorage('{"good":"a","bad":123}');
    const store = data.createStore(() => storage);
    store.load();
    assert.equal(store.save(store.lists, { recover: true }).ok, true);
    assert.equal(store.recoveryRaw, null);
    assert.deepEqual(JSON.parse(storage.getItem('spinSelectorLists')), { version: 2, lists: { good: record('a') } });
});

test('blocked storage returns an error without throwing during initialization', () => {
    const store = data.createStore(() => { throw new Error('Denied'); });
    assert.equal(store.load().unavailable, true);
    assert.deepEqual(Object.keys(store.lists), []);
    assert.equal(store.save(lists({ A: 'B' })).reason, 'storage');
    assert.deepEqual(Object.keys(store.lists), []);
});

test('failed writes roll back Save, Import and Delete candidates', () => {
    const original = data.serialize(lists({ A: record('Bob\nAlice', ['Bob']) }));
    const storage = memoryStorage(original);
    const store = data.createStore(() => storage);
    store.load();
    storage.setItem = () => { throw new Error('Quota exceeded'); };
    const save = data.copyLists(store.lists);
    save.A = record('Changed');
    const imported = data.mergeLists(store.lists, lists({ A: 'Replaced', B: 'New' }), true);
    const deleted = data.copyLists(store.lists);
    delete deleted.A;
    for (const candidate of [save, imported, deleted]) {
        assert.equal(store.save(candidate).ok, false);
        assert.equal(data.serialize(store.lists), original);
        assert.equal(storage.getItem('spinSelectorLists'), original);
    }
});

test('restored storage access cannot overwrite data that failed to load initially', () => {
    const original = data.serialize(lists({ Existing: 'Keep me' }));
    const storage = memoryStorage(original);
    let blocked = true;
    const store = data.createStore(() => { if (blocked) throw new Error('Denied'); return storage; });
    assert.equal(store.load().unavailable, true);
    blocked = false;
    assert.equal(store.save(lists({ New: 'New' })).reason, 'reload');
    assert.equal(storage.getItem('spinSelectorLists'), original);
    assert.deepEqual(Object.keys(store.lists), []);
});

test('restored storage access can save when no previous data exists', () => {
    const storage = memoryStorage();
    let blocked = true;
    const store = data.createStore(() => { if (blocked) throw new Error('Denied'); return storage; });
    store.load();
    blocked = false;
    assert.equal(store.save(lists({ New: 'New' })).ok, true);
    assert.deepEqual(plain(store.lists), { New: record('New') });
});

test('failed recovery writes retain the original and keep recovery protection', () => {
    const original = '{"good":"a","bad":123}';
    const storage = memoryStorage(original);
    const store = data.createStore(() => storage);
    store.load();
    storage.setItem = () => { throw new Error('Full'); };
    assert.equal(store.save(store.lists, { recover: true }).ok, false);
    assert.equal(store.recoveryRaw, original);
    assert.equal(storage.getItem('spinSelectorLists'), original);
});

test('import keep and replace policies preserve untouched records and support undo', () => {
    const current = lists({ A: record('Old', ['Old']), B: 'Unchanged' });
    const imported = lists({ A: record('New', ['New']), C: 'Added' });
    const kept = data.mergeLists(current, imported, false);
    const replaced = data.mergeLists(current, imported, true);
    assert.deepEqual(plain(kept), { A: record('Old', ['Old']), B: record('Unchanged'), C: record('Added') });
    assert.deepEqual(plain(replaced), { A: record('New', ['New']), B: record('Unchanged'), C: record('Added') });
    assert.deepEqual(plain(current), { A: record('Old', ['Old']), B: record('Unchanged') });
    const storage = memoryStorage();
    const store = data.createStore(() => storage);
    assert.equal(store.save(replaced).ok, true);
    assert.equal(store.save(current).ok, true);
    assert.deepEqual(plain(store.lists), plain(current));
});

test('committed and imported records do not alias editable candidates', () => {
    const storage = memoryStorage();
    const store = data.createStore(() => storage);
    const candidate = lists({ A: record('Alice', ['Bob']) });
    store.save(candidate);
    candidate.A.entries = 'Changed';
    candidate.A.excluded.push('Alice');
    assert.deepEqual(plain(store.lists), { A: record('Alice', ['Bob']) });
});

test('selection skips exact excluded names including all duplicates', () => {
    const names = ['Bob', 'Alice', 'Bob', 'Charlie'];
    const excluded = new Set(['Bob']);
    assert.equal(data.selectIndex(names, excluded, () => 0), 1);
    assert.equal(data.selectIndex(names, excluded, () => .9999), 3);
});

test('selection preserves exact whitespace matching', () => {
    assert.equal(data.selectIndex(['Bob', 'Bob '], new Set(['Bob']), () => 0), 1);
});

test('selection falls back to remaining entries only when all are excluded', () => {
    const names = ['Bob', 'Bob', 'Charlie'];
    const excluded = new Set(names);
    assert.equal(data.selectIndex(names, excluded, () => 0), 0);
    assert.equal(data.selectIndex(names, excluded, () => .5), 1);
    assert.equal(data.selectIndex(names, excluded, () => .9999), 2);
    assert.equal(data.selectIndex([], excluded), -1);
});

test('every ordinary entry has an equal interval of the random input', () => {
    const names = ['A', 'B', 'C', 'D'];
    for (let index = 0; index < names.length; index++) {
        assert.equal(data.selectIndex(names, new Set(), () => (index + .5) / names.length), index);
    }
});
