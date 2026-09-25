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
	const listeners = {};
	const timers = [];
	const document = {
		addEventListener(type, handler) { listeners[type] = handler; },
		dispatch(type, target, button = 0, detail = 1) {
			const event = { type, target, button, detail, defaultPrevented: false,
				preventDefault() { this.defaultPrevented = true; } };
			listeners[type](event);
			event.navigatedHref = target.link.href;
			for (const callback of timers.splice(0)) callback();
			return event;
		},
	};
	const window = {
		utmKeeperFlowConfig: settings,
		location: { search, href: `https://shop.example.test/page${search}`, hostname: 'shop.example.test' },
		localStorage: storage,
	};
	const forbidden = new Proxy({}, {
		get() { throw new Error('Unrelated browser API was inspected'); },
		set() { throw new Error('Unrelated browser API was changed'); },
	});
	assert.doesNotThrow(() => vm.runInNewContext(script, {
		window,
		URL,
		URLSearchParams,
		Date: { now: () => now },
		setTimeout(callback, delay) { assert.equal(delay, 0); timers.push(callback); },
		document,
		fetch: forbidden,
		XMLHttpRequest: forbidden,
	}));
	return document;
}

function anchor(href, marked = false, download = false) {
	const link = {
		href,
		closest(selector) { return selector === 'a[href]' ? this : null; },
		getAttribute(name) { return name === 'href' ? this.href : null; },
		setAttribute(name, value) { assert.equal(name, 'href'); this.href = value; },
		hasAttribute(name) { return name === 'download' && download; },
		classList: { contains(name) { return name === 'utm-keeper' && marked; } },
	};
	return link;
}

function activate(document, link, type = 'click', button = 0, detail = 1) {
	const original = link.href;
	const child = { link, closest(selector) { return link.closest(selector); } };
	const event = document.dispatch(type, child, button, detail);
	assert.equal(event.defaultPrevented, false);
	assert.equal(link.href, original, 'Activated link must be restored after navigation');
	return event.navigatedHref;
}

function record(storage) {
	const raw = storage.items.get(key);
	return raw === undefined ? undefined : JSON.parse(raw);
}

test('absent, obsolete or invalid configuration never accesses location or storage', () => {
	const throwingParameters = { version: 1, get parameters() { throw new Error('bad config'); } };
	for (const settings of [undefined, { ...config, version: 2 }, { ...config, parameters: ['custom'] }, { ...config, domains: ['*.example.test'] }, { ...config, domains: 'example.test' }, { ...config, retentionDays: 91 }, throwingParameters]) {
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

test('only exact configured external HTTPS hosts or marked links receive stored configured keys', () => {
	const storage = browserStorage();
	const document = visit(storage, '?utm_source=mail&utm_campaign=launch', start, { ...config, domains: ['bookings.example.test'] });
	const eligible = [
		'https://bookings.example.test/path',
		'https://BOOKINGS.EXAMPLE.TEST/path',
		'https://bookings.example.test:8443/path',
	];
	for (const href of eligible) {
		const link = anchor(href);
		assert.equal(activate(document, link), `${href}?utm_source=mail&utm_campaign=launch`);
	}
	const marked = anchor('https://other.example.test/convert', true);
	assert.equal(activate(document, marked), 'https://other.example.test/convert?utm_source=mail&utm_campaign=launch');
	for (const href of [
		'https://bookings.example.test.evil.test/', 'https://fakebookings.example.test/',
		'https://shop.example.test/inside', 'https://shop.example.test:8443/inside',
		'https://other.example.test/not-marked',
	]) {
		const link = anchor(href);
		assert.equal(activate(document, link), href, `Unexpected forwarding to ${href}`);
	}
});

test('no destination is targeted by default; class marking is an explicit opt-in', () => {
	const document = visit(browserStorage(), '?utm_source=mail');
	const plain = anchor('https://bookings.example.test/');
	assert.equal(activate(document, plain), 'https://bookings.example.test/');
	const marked = anchor('https://bookings.example.test/', true);
	assert.equal(activate(document, marked), 'https://bookings.example.test/?utm_source=mail');
});

test('destination query wins, including empty and duplicate keys; original URL bytes and fragment remain', () => {
	const document = visit(browserStorage(), '?utm_source=stored&utm_campaign=launch', start, { ...config, domains: ['bookings.example.test'] });
	const link = anchor('https://bookings.example.test/A%2fb?utm_source=&utm_source=other&x=%2f+%20#part?x=1');
	assert.equal(activate(document, link), 'https://bookings.example.test/A%2fb?utm_source=&utm_source=other&x=%2f+%20&utm_campaign=launch#part?x=1');
	assert.equal(activate(document, link), 'https://bookings.example.test/A%2fb?utm_source=&utm_source=other&x=%2f+%20&utm_campaign=launch#part?x=1', 'Second activation should not duplicate forwarded values');
	const encoded = anchor('https://bookings.example.test/?utm%5Fcampaign=existing#end');
	assert.equal(activate(document, encoded), 'https://bookings.example.test/?utm%5Fcampaign=existing&utm_source=stored#end');
	const bare = anchor('https://bookings.example.test/path?#frag');
	assert.equal(activate(document, bare), 'https://bookings.example.test/path?utm_source=stored&utm_campaign=launch#frag');
});

test('delegated ordinary and middle clicks handle links created after initialization', () => {
	const document = visit(browserStorage(), '?utm_source=mail', start, { ...config, domains: ['bookings.example.test'] });
	const later = anchor('https://bookings.example.test/checkout');
	assert.equal(activate(document, later, 'auxclick', 1), 'https://bookings.example.test/checkout?utm_source=mail');
	const ignored = anchor('https://bookings.example.test/checkout');
	assert.equal(activate(document, ignored, 'auxclick', 2), ignored.href);
	assert.equal(activate(document, ignored, 'click', 1), ignored.href);
	assert.equal(activate(document, ignored), 'https://bookings.example.test/checkout?utm_source=mail');
});

test('keyboard-generated click forwards without canceling native activation', () => {
	const document = visit(browserStorage(), '?utm_source=mail', start, { ...config, domains: ['bookings.example.test'] });
	const link = anchor('https://bookings.example.test/pay#step');
	assert.equal(activate(document, link, 'click', 0, 0), 'https://bookings.example.test/pay?utm_source=mail#step');
});

test('restored links use only current, unexpired attribution on repeated activations', () => {
	const storage = browserStorage();
	const document = visit(storage, '?utm_source=first', start, { ...config, domains: ['bookings.example.test'] });
	const link = anchor('https://bookings.example.test/checkout#done');
	assert.equal(activate(document, link), 'https://bookings.example.test/checkout?utm_source=first#done');
	storage.items.set(key, JSON.stringify({ version: 1, values: { utm_campaign: 'second' }, expiresAt: start + day }));
	assert.equal(activate(document, link, 'auxclick', 1), 'https://bookings.example.test/checkout?utm_campaign=second#done');
	storage.items.set(key, JSON.stringify({ version: 1, values: { utm_source: 'expired' }, expiresAt: start }));
	assert.equal(activate(document, link), 'https://bookings.example.test/checkout#done');
	assert.equal(storage.items.has(key), false);
});

test('class or configured host cannot bypass HTTPS, external, credential, URL or download restrictions', () => {
	const document = visit(browserStorage(), '?utm_source=mail', start, { ...config, domains: ['bookings.example.test'] });
	for (const href of [
		'http://bookings.example.test/', 'javascript:alert(1)', 'mailto:test@example.test',
		'/internal', 'https://shop.example.test/internal', 'https://user:pass@bookings.example.test/',
		'https://user@bookings.example.test/', 'https://[invalid',
	]) {
		const link = anchor(href, true);
		assert.equal(activate(document, link), href, `Unsafe marked URL changed: ${href}`);
	}
	for (const marked of [false, true]) {
		const link = anchor('https://bookings.example.test/file', marked, true);
		assert.equal(activate(document, link), 'https://bookings.example.test/file');
	}
});

test('missing, invalid, expired or unavailable storage leaves links and native navigation alone', () => {
	const href = 'https://bookings.example.test/#buy';
	const settings = { ...config, domains: ['bookings.example.test'] };
	for (const raw of [undefined, '{', JSON.stringify({ version: 1, values: { utm_source: 'old' }, expiresAt: start })]) {
		const storage = browserStorage();
		const document = visit(storage, '', start, settings);
		if (raw !== undefined) storage.items.set(key, raw);
		assert.equal(activate(document, anchor(href)), href);
		assert.equal(storage.items.has(key), false);
	}
	const blocked = browserStorage();
	blocked.getItem = () => { throw new Error('SecurityError'); };
	const document = visit(blocked, '?utm_source=mail', start, settings);
	assert.equal(activate(document, anchor(href)), href);
	const laterBlocked = browserStorage();
	const beforeClick = visit(laterBlocked, '?utm_source=mail', start, settings);
	laterBlocked.getItem = () => { throw new Error('SecurityError'); };
	assert.equal(activate(beforeClick, anchor(href)), href, 'Storage blocked after capture must not disrupt navigation');
	const stale = browserStorage(JSON.stringify({ version: 1, values: { utm_source: 'old' }, expiresAt: start + day }));
	stale.removeItem = () => { throw new Error('SecurityError'); };
	const failed = visit(stale, '?utm_source=new', start, settings);
	assert.equal(activate(failed, anchor(href)), href, 'Failed capture cannot forward stale storage');
	const removeBlocked = browserStorage();
	const onClick = visit(removeBlocked, '', start, settings);
	removeBlocked.items.set(key, '{');
	removeBlocked.removeItem = () => { throw new Error('SecurityError'); };
	assert.equal(activate(onClick, anchor(href)), href, 'Failed removal during activation must not forward');
});
