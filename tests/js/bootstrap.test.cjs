const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('frontend scaffold runs without reading visitor storage or changing the page', () => {
	const script = readFileSync(path.join(__dirname, '../../assets/js/utm-keeper.js'), 'utf8');
	const browser = {
		window: { utmKeeperFlowConfig: { parameters: [], domains: [], retentionDays: 30 } },
		localStorage: new Proxy({}, {
			get() {
				throw new Error('The scaffold must not access browser storage');
			},
		}),
	};

	assert.doesNotThrow(() => vm.runInNewContext(script, browser));
	assert.deepEqual(Object.keys(browser), ['window', 'localStorage']);
});
