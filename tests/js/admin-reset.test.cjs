const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = readFileSync(path.join(__dirname, '../../assets/js/admin-reset.js'), 'utf8');
const key = 'utmkeeperflow_attribution';

function resetPage(browserWindow, hasButton = true) {
	const listeners = {};
	const status = { textContent: '' };
	const button = {
		addEventListener(type, listener) { listeners[type] = listener; },
		getAttribute(name) {
			return { 'data-success': 'Cleared.', 'data-error': 'Storage unavailable.' }[name];
		},
	};
	vm.runInNewContext(script, {
		window: browserWindow,
		document: {
			getElementById(id) {
				return { utmkeeperflow_reset: hasButton ? button : null,
					utmkeeperflow_reset_status: status }[id];
			},
		},
	});
	return { status, click: listeners.click };
}

test('reset acts only on click and removes only this plugin record', () => {
	const entries = new Map([[key, 'campaign'], ['other-site-data', 'preserved']]);
	const calls = [];
	const page = resetPage({ localStorage: {
		removeItem(name) { calls.push(name); entries.delete(name); },
	} });
	assert.deepEqual(calls, []);
	assert.equal(page.status.textContent, '');
	page.click();
	assert.deepEqual(calls, [key]);
	assert.deepEqual([...entries], [['other-site-data', 'preserved']]);
	assert.equal(page.status.textContent, 'Cleared.');
});

test('missing control or blocked storage leaves other data untouched and reports failures', () => {
	const missing = resetPage({}, false);
	assert.equal(missing.click, undefined, 'missing settings control must not install handler');
	const blocked = {};
	Object.defineProperty(blocked, 'localStorage', { get() { throw new Error('SecurityError'); } });
	const page = resetPage(blocked);
	assert.doesNotThrow(() => page.click());
	assert.equal(page.status.textContent, 'Storage unavailable.');
	const failed = resetPage({ localStorage: { removeItem() { throw new Error('SecurityError'); } } });
	assert.doesNotThrow(() => failed.click());
	assert.equal(failed.status.textContent, 'Storage unavailable.');
});
