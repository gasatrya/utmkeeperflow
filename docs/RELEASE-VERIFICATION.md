# MVP integration and release review — issue #7

Verified 2026-09-25 on a **local** WordPress 7.1.2 / PHP 8.2.29 site (`http://plugins.local`) with Plugin Check 2.1.0. This is a verification record, not a claim of compatibility with every version from the stated minimums. `readme.txt` says `Tested up to: 7.1` because the 7.1.2 line was exercised here. No production destination was contacted; link activation was observed before navigation, with navigation canceled by the test harness after the plugin's listener ran.

## Automated checks

From the plugin directory (Composer development dependencies installed):

```sh
npm test
node --check assets/js/utm-keeper.js
node --check assets/js/admin-reset.js
php -l utmkeeperflow.php
php -l tests/php/bootstrap.php
php tests/php/bootstrap.php
composer run lint
composer run phpcs
git diff --check
```

**Result:** 18/18 Node tests pass (including keyboard-generated click), both assets parse, both PHP files lint, PHP bootstrap passes, Composer lint/PHPCS (WPCS 3) pass, and the diff has no whitespace errors. The PHP shim test also checks authorization hooks, validated public configuration, translation domain and escaping, reset control accessibility attributes, and disabled asset loading; it does not exercise WordPress itself.

Plugin Check via Local's PHP and bundled WP-CLI (set `PHPRC`, `MYSQL_HOME`, and `WP_CLI_CONFIG_PATH` for the running Local site before invoking):

```sh
php wp-cli.phar --path=/path/to/wp --url=http://plugins.local \
  --skip-plugins=buttonflow,expiryflow,hoursflow,admin-only,utmkeeperflow --skip-themes \
  plugin check utmkeeperflow --format=table \
  --exclude-directories=tests,docs \
  --exclude-files=.gitignore,phpcs.xml.dist,composer.json,composer.lock,package.json,README.md
```

**Result:** Plugin Check 2.1.0 static/default checks: `Success: Checks complete. No errors found.` (exit 0) against the release-facing source (`utmkeeperflow.php`, `assets/`, `readme.txt`). The unfiltered working-tree scan reports dev-only PHP shim findings in `tests/php/bootstrap.php` and flags `.gitignore` and `phpcs.xml.dist`; these are not distributable plugin files and are excluded *only* from the release-facing scan, not suppressed by error codes. Before the verified 7.1.2 smoke test and corresponding `Tested up to: 7.1` header, the checker also reported `missing_readme_header_tested`; it is now resolved. Do not package `tests/`, `docs/`, `vendor/`, Composer/npm tooling, `.gitignore`, or `README.md` for WordPress.org distribution. Plugin Check runtime checks and WordPress.org submission have **not** been run; this is ready for release review, not a claim of directory approval or multi-version compatibility. Local PHP emits a missing `php_imagick.dll` startup warning on WP-CLI; unrelated to this dependency-free plugin and does not change check exit status.

WordPress `wp i18n make-pot . /tmp/uk-issue7.pot --domain=utmkeeperflow --exclude=tests,vendor,docs` succeeds; its generated catalog includes settings labels, privacy/help text, and both reset status messages. English UI was checked in the browser; no separate translated locale or full localization QA was exercised. PHPCS and the PHP shim verify translation-domain and escaping paths.

## WordPress/browser matrix

Used independent browser profiles for administrator, subscriber, and logged-out visitor. Temporary administrator/subscriber test accounts, saved settings, test storage, and browser sessions were removed/reset afterward. Browser tests used actual Settings API saves and frontend page loads; synthetic external anchors were appended to the DOM to avoid a remote navigation. All rows below passed.

| Check | Observation |
| --- | --- |
| Activation/deactivation | WP-CLI deactivated and reactivated UTM Keeper without plugin errors; previously saved settings remained. Default absent option is disabled (confirmed before first save). |
| Permission/nonce | Subscriber denied the Settings page; administrator can save and reload. Administrator POST to `options.php` with invalid nonce returned HTTP 403 (`link you followed has expired`); saved settings remained unchanged. |
| Defaults and disabled state | Initially no frontend script, config, or attribution record. After unchecking Enable and all keys and saving, boxes stayed unchecked; script/config were absent even at a campaign URL, and no new storage was created. Existing localStorage remains untouched while disabled. Reset script loaded only on settings page. |
| Settings and validation | Saving only `fbclid`, `BOOKINGS.EXAMPLE.COM.`, retention 90 yielded only `fbclid`, `bookings.example.com`, `retentionDays: 90` in public config. Mixing a valid domain with a URL, wildcard, port, and IP ignored invalid entries with a notice. An injected unsupported parameter was ignored with a notice; noninteger retention fell back to 30 with a notice. Bounds 1/90 and clamping are also tested in the PHP shim. |
| Multi-page capture | With two selected UTM keys, a campaign landing URL created one version-1 browser-local record; navigating to a second frontend page retained the exact expiry; another selected-key visit replaced the entire previous set and fixed expiry. Nonselected keys did not appear. |
| Activation and isolation | Exact configured external HTTPS and explicitly class-marked external HTTPS links received only missing values; existing empty `utm_source=`, original escaped path/query bytes and `#fragment` survived. Hostname lookalikes, unrelated links, same-site links, HTTP, credentials, javascript URLs, and downloads were unchanged. A dynamically inserted link worked on delegated `auxclick` (middle button). A real keyboard Enter on a focused anchor produced a `click` with `detail: 0` and correct URL; the plugin itself never prevented default. Restored DOM href was observed after the event. |
| Storage failures and expiry | At activation, expired and malformed records left links unchanged and were deleted; storage access throwing `SecurityError` left links unchanged. JS tests additionally cover expiration at the exact boundary and failed read/write/removal. |
| Browser-local reset | Enter on the focused reset button removed only `utmkeeperflow_attribution`; an unrelated localStorage key and saved settings survived. Status has `role=status`/`aria-live=polite`. Simulated blocked storage displayed the localized failure text. Button works while disabled. Admin and public URL used the same HTTP origin here; other origins remain out of scope of reset. |
| Requests and persistence | Logged-out frontend network log showed the local `utm-keeper.js` request only, no plugin fetch/XHR/beacon or destination request before navigation. A logged-in page also produced WordPress core `/wp-json/wp/v2/users/me` requests, unrelated to this plugin. `wp option list --search='utmkeeperflow*'` found only `utmkeeperflow_settings`; plugin code contains no visitor-side server write or network API. This is not a claim about other plugins or a full server-wide traffic/database audit. |
| Accessibility/translation | Chrome accessibility snapshot exposed labels on all controls; reset was keyboard-operable with visible live status. `agent-browser a11y --selector '.wrap' --tags wcag2a,wcag2aa` found 0 violations and 0 incomplete checks, 15 passes, both enabled and disabled. POT extraction succeeded; PHP shim verifies text domain and HTML/attribute escaping even for hostile translated strings. |

**Release decision:** MVP is suitable for release *review* on the verified local stack. Distribute only a runtime-only package and re-run Plugin Check on that final package. Validate additional WordPress/PHP versions and a real translation before making broader compatibility or localization claims. No later-issue functionality, analytics, or external integration was added.
