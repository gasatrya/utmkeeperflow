const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = readFileSync(path.join(__dirname, '../../assets/js/utm-keeper.js'), 'utf8');
const key = 'utmkeeperflow_attribution';
const day = 24 * 60 * 60 * 1000;
const start = Date.UTC(2025, 0, 1);
const config = { version: 1, parameters: ['utm_source', 'utm_campaign'], domains: [], retentionDays: 30 };

function browserStorage(initial) {
	const items = new Map(initial === undefined ? [] : [[key, initial]]);
	const calls = [];
	return {
		items,
		calls,
		getItem(name) {
			calls.push(['get', name]);
			return items.has(name) ? items.get(name) : null;
		},
		setItem(name, value) {
			calls.push(['set', name]);
			items.set(name, value);
		},
		removeItem(name) {
			calls.push(['remove', name]);
			items.delete(name);
		},
	};
}

function visit(storage, search = '', now = start, settings = config) {
	const window = { utmKeeperFlowConfig: settings, location: { search }, localStorage: storage };
	const forbidden = new Proxy({}, {
		get() { throw new Error('Unrelated browser API was inspected'); },
		set() { throw new Error('Unrelated browser API was changed'); },
	});
	assert.doesNotThrow(() => vm.runInNewContext(script, {
		window,
		URLSearchParams,
		Date: { now: () => now },
		document: forbidden,
		fetch: forbidden,
		XMLHttpRequest: forbidden,
	}));
}

function record(storage) {
	const raw = storage.items.get(key);
	return raw === undefined ? undefined : JSON.parse(raw);
}

test('absent, obsolete or invalid configuration never accesses location or storage', () => {
	const throwingParameters = { version: 1, get parameters() { throw new Error('bad config'); } };
	for (const settings of [undefined, { ...config, version: 2 }, { ...config, parameters: ['custom'] }, { ...config, retentionDays: 91 }, throwingParameters]) {
		const window = { utmKeeperFlowConfig: settings };
		Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage read'); } });
		Object.defineProperty(window, 'location', { get() { throw new Error('location read'); } });
		assert.doesNotThrow(() => vm.runInNewContext(script, { window }));
	}
});

test('only selected keys and valid values are captured; one valid key is a partial campaign', () => {
	const storage = browserStorage();
	visit(storage, '?utm_source=Mailer&utm_campaign=&utm_medium=ignored&gclid=ignored&unknown=x');
	assert.deepEqual(record(storage), {
		version: 1,
		values: { utm_source: 'Mailer' },
		expiresAt: start + 30 * day,
	});
	assert.deepEqual(storage.calls, [['get', key], ['set', key]]);
});

test('empty, whitespace-only and over-256-character values are ignored; 256 is accepted', () => {
	const storage = browserStorage();
	visit(storage, `?utm_source=%20%20&utm_campaign=${'x'.repeat(257)}`);
	assert.equal(record(storage), undefined);
	visit(storage, `?utm_source=&utm_source=${'z'.repeat(256)}`);
	assert.deepEqual(record(storage).values, { utm_source: 'z'.repeat(256) });
	visit(storage, `?utm_source=${'x'.repeat(257)}&utm_source=valid`);
	assert.deepEqual(record(storage).values, { utm_source: 'valid' });
});

test('new partial arrival replaces the whole set; campaign-less visits retain it without extending expiry', () => {
	const storage = browserStorage();
	visit(storage, '?utm_source=first&utm_campaign=launch');
	visit(storage, '?utm_campaign=second', start + day);
	assert.deepEqual(record(storage), {
		version: 1,
		values: { utm_campaign: 'second' },
		expiresAt: start + 31 * day,
	});
	const saved = storage.items.get(key);
	storage.calls.length = 0;
	visit(storage, '?utm_medium=not-selected&utm_source=&utm_campaign=%20', start + 2 * day);
	assert.equal(storage.items.get(key), saved);
	assert.deepEqual(storage.calls, [['get', key]]);
});

test('expiry is fixed from capture and cleared exactly at the boundary', () => {
	const storage = browserStorage();
	visit(storage, '?utm_source=first', start, { ...config, retentionDays: 1 });
	visit(storage, '', start + day - 1);
	assert.ok(record(storage));
	visit(storage, '', start + day);
	assert.equal(record(storage), undefined);
	assert.deepEqual(storage.calls.at(-2), ['get', key]);
	assert.deepEqual(storage.calls.at(-1), ['remove', key]);
});

test('obsolete, expired and malformed records are removed, not reused', () => {
	const invalid = [
		'{', 'null', '[]',
		JSON.stringify({ version: 2, values: { utm_source: 'old' }, expiresAt: start + day }),
		JSON.stringify({ version: 1, values: { utm_source: 'old' }, expiresAt: start }),
		JSON.stringify({ version: 1, values: {}, expiresAt: start + day }),
		JSON.stringify({ version: 1, values: 'invalid', expiresAt: start + day }),
		JSON.stringify({ version: 1, values: { utm_source: 42 }, expiresAt: start + day }),
		JSON.stringify({ version: 1, values: { utm_source: 'old', custom: 'injected' }, expiresAt: start + day }),
		JSON.stringify({ version: 1, values: { utm_source: 'x'.repeat(257) }, expiresAt: start + day }),
		JSON.stringify({ version: 1, values: { utm_source: 'old' }, expiresAt: 'later' }),
		JSON.stringify({ version: 1, values: { utm_source: 'old' }, expiresAt: start + 91 * day }),
		JSON.stringify({ version: 1, values: { utm_source: 'old' }, expiresAt: start + day, extra: true }),
	];
	for (const raw of invalid) {
		const storage = browserStorage(raw);
		visit(storage);
		assert.equal(record(storage), undefined, raw);
		assert.deepEqual(storage.calls, [['get', key], ['remove', key]]);
	}
});

test('deselected parameters are not retained on a later visit', () => {
	const storage = browserStorage();
	visit(storage, '?utm_source=old');
	visit(storage, '', start + day, { ...config, parameters: ['utm_campaign'] });
	assert.equal(record(storage), undefined);
});

test('storage getter, read, removal and write failures do not throw or leave stale values for forwarding', () => {
	const badWindow = { utmKeeperFlowConfig: config, location: { search: '?utm_source=new' } };
	Object.defineProperty(badWindow, 'localStorage', { get() { throw new Error('SecurityError'); } });
	assert.doesNotThrow(() => vm.runInNewContext(script, { window: badWindow, URLSearchParams, Date }));

	for (const method of ['getItem', 'removeItem', 'setItem']) {
		const storage = browserStorage(JSON.stringify({ version: 1, values: { utm_source: 'stale' }, expiresAt: start + day }));
		storage[method] = () => { throw new Error('SecurityError'); };
		visit(storage, '?utm_source=new');
		assert.equal(storage.calls.some(([action]) => action === 'set'), false);
		if (method === 'setItem') {
			assert.equal(record(storage), undefined, 'old value must be removed before a failed write');
		} else {
			// A blocked read/removal can leave bytes behind; capture stops and
			// neither exposes those bytes nor falls back to another channel.
			assert.equal(record(storage).values.utm_source, 'stale');
		}
	}
});
