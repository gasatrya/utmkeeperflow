# UTM Keeper

Keep UTM attribution when visitors browse before booking or buying. See [the concept](docs/CONCEPT.md) and [approved MVP plan](docs/MVP-PLAN.md).

**Current status:** Browser-local capture, targeted link forwarding, and an administrator's current-browser reset button are implemented. The plugin starts disabled. Settings → UTM Keeper lets administrators enable it and configure supported keys, exact destination hostnames, and retention. See [the WordPress readme](readme.txt) for installation, targeting examples, privacy implications, and reset limitations.

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

For a local WordPress smoke test, place this directory under `wp-content/plugins/`, activate **UTM Keeper** in Plugins, and confirm there are no PHP notices. While disabled (the default), frontend pages must have no `utmkeeperflow` script. An administrator can open **Settings → UTM Keeper** to enable it. Five UTM parameters are selected by default; `gclid` and `fbclid` are opt-in. Enter one exact DNS hostname per line (such as `bookings.example.com`), without schemes, ports, paths, wildcards, or IP addresses; none are targeted by default. Retention defaults to 30 days and is limited to 1–90. After saving, reload a frontend page: `utm-keeper.js?ver=0.1.0` should load with `window.utmKeeperFlowConfig` defined **before** it, containing only validated parameters, domains, and retention. Visit `?utm_source=example&utm_campaign=launch` and inspect `localStorage["utmkeeperflow_attribution"]`: it should contain a version 1 record with `values` and `expiresAt` (milliseconds since Unix epoch). Visit a page without configured campaign keys: the same record and expiry should remain. Visit `?utm_campaign=next`: the record should now contain only `utm_campaign`, with a new fixed expiry. Pages are not rewritten on load; no capture or forwarding runs while disabled. With the plugin enabled and attribution stored, click an external HTTPS link to an exact configured hostname, or an external HTTPS link marked `class="utm-keeper"`: missing configured keys are appended at activation, including middle clicks and links inserted later. Existing destination values (including empty or duplicate keys), path, query, and fragment are preserved. Internal links, downloads, links with embedded credentials, and non-HTTPS or invalid URLs are not forwarded. No host is targeted by default; class marking is a separate explicit opt-in.

The public configuration contract is `window.utmKeeperFlowConfig`: `version: 1`, configured `parameters`, configured exact `domains`, and `retentionDays`. The version is a schema version, separate from the asset/plugin version. Only configured keys with nonempty values of at most 256 UTF-16 code units are captured. Invalid, obsolete, or expired records are removed; unavailable browser storage fails closed without cookies, server persistence, or network fallback. Forwarding only reads the valid unexpired browser-local record and never cancels native navigation; blocked or empty storage leaves links unchanged. Campaign values may contain personal data, and forwarded URLs may be logged by destinations. Site owners are responsible for applicable privacy and consent requirements; enabling is not a consent mechanism. The settings-page “Clear attribution in this browser” button removes only this plugin's record for the current browser profile at the admin page's origin, not other visitors' data or WordPress settings. If the frontend uses a different protocol, hostname, or port, its storage is separate: open the public site and run `localStorage.removeItem('utmkeeperflow_attribution')` in its browser console instead. No external service/account is required. The complete implementation is tracked in [the MVP GitHub issue](https://github.com/gasatrya/utmkeeperflow/issues/1).

### WordPress settings smoke-test matrix

The standalone PHP shims do not run WordPress `options.php`. In a local WordPress installation, verify:

- An account without `manage_options` cannot access the settings page or save through `options.php`; a missing/invalid form nonce cannot save. An administrator can save and the choices survive reload.
- Uncheck Enable and all parameter boxes, save, and confirm the script is absent and no parameters are selected after reload. Re-enable, select only `fbclid`, enter `BOOKINGS.EXAMPLE.COM.` and retention `90`; confirm the frontend config contains only `fbclid`, `bookings.example.com`, and `90`.
- Submit a hostname list with valid names mixed with invalid entries (`https://example.com`, `*.example.com`, `example.com:443`, `127.0.0.1`). Invalid entries should be ignored with a validation notice; unsupported parameters must never appear in the public config. Retention outside 1–90 is clamped on server submission; non-integers fall back to 30 with a notice.
- Confirm keyboard navigation and labels for the checkboxes, textarea, number input, and current-browser reset button; check translations and rendered escaping. With attribution in the admin browser's localStorage, click reset and verify only `utmkeeperflow_attribution` is removed, saved settings remain, and the status message is announced. Test while disabled and with storage blocked (a failure message should appear). If admin and frontend origins differ, verify the button does not claim to clear the frontend's storage.
