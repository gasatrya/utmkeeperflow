# UTM Keeper

A WordPress plugin in preparation. See [the concept](docs/CONCEPT.md) and [approved MVP plan](docs/MVP-PLAN.md).

**Current status:** scaffold only. The plugin starts disabled. There is no settings screen, campaign capture, browser storage, or link forwarding yet. Do not deploy it expecting attribution to work.

## Development checks

From this directory:

```sh
npm test
node --check assets/js/utm-keeper.js
php -l utmkeeperflow.php
php -l tests/php/bootstrap.php
php tests/php/bootstrap.php
git diff --check
```

The PHP bootstrap check uses small WordPress shims; it does not replace an activation smoke test. To check against WordPress Coding Standards (development tooling only, not loaded by the plugin), run `composer install` then `composer run phpcs`. This uses `phpcs.xml.dist` to check plugin PHP source with WPCS; `vendor/` and the standalone `tests/` shim harness are excluded. `composer run lint` is an alternative PHP syntax command. No Composer or npm packages are needed at runtime.

For a local WordPress smoke test, place this directory under `wp-content/plugins/`, activate **UTM Keeper** in Plugins, and confirm there are no PHP notices. View a frontend page: with the `utmkeeperflow_settings` option unset (the default), there must be no `utmkeeperflow` script. Until the Settings API screen exists, an administrator may temporarily set `utmkeeperflow_settings` to `array( 'enabled' => '1' )` in a local test installation using a WordPress-aware tool (for example WP-CLI `wp option update utmkeeperflow_settings '{"enabled":"1"}' --format=json`). Reload the page and check that `utm-keeper.js?ver=0.1.0` loads with `window.utmKeeperFlowConfig` defined **before** it. It must still leave the page and browser storage untouched. Remove the test option afterward (`wp option delete utmkeeperflow_settings`). Do not set options by editing the database directly on a live site.

The public configuration contract is `window.utmKeeperFlowConfig`: `version: 1`, default five UTM `parameters`, empty `domains`, and `retentionDays: 30`. It currently contains fixed defaults only; the future Settings API will provide validated public values. The version is a schema version, separate from the asset/plugin version. The complete implementation is tracked in [the MVP GitHub issue](https://github.com/gasatrya/utmkeeperflow/issues/1).
