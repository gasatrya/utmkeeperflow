const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = readFileSync(path.join(__dirname, '../../assets/js/utm-keeper.js'), 'utf8');

for (const config of [undefined, { version: 1, parameters: [], domains: [], retentionDays: 30 }]) {
	test(`frontend scaffold is inert with ${config ? 'versioned' : 'missing'} configuration`, () => {
		const forbidden = new Proxy({}, {
			get() {
				throw new Error('The scaffold must not inspect visitor data or the page');
			},
			set() {
				throw new Error('The scaffold must not change visitor data or the page');
			},
		});
		const window = config ? { utmKeeperFlowConfig: config } : {};
		const browser = { window, localStorage: forbidden, document: forbidden, location: forbidden };

		assert.doesNotThrow(() => vm.runInNewContext(script, browser));
		assert.deepEqual(Object.keys(browser), ['window', 'localStorage', 'document', 'location']);
		assert.deepEqual(window, config ? { utmKeeperFlowConfig: config } : {});
	});
}
