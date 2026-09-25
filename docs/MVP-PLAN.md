# UTM Keeper MVP plan

## Goal

Preserve configured campaign parameters in the visitor's browser and forward them only to explicitly targeted conversion links. `docs/CONCEPT.md` defines the product scope; this plan defines the MVP behavior and delivery order.

## Agreed behavior

- Disabled after activation until an administrator enables it. Enabling is not a visitor-consent mechanism.
- Preserve `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content` by default; `gclid` and `fbclid` are opt-in. Ignore unknown, empty, or oversized values (limit: 256 characters per value).
- **Last-touch, whole-set replacement:** an incoming URL containing at least one valid configured parameter replaces the entire stored set. A visit without valid configured parameters leaves it unchanged. Never merge data from different arrivals.
- Use one versioned browser `localStorage` record with a fixed expiration measured from capture; default 30 days, configurable from 1 to 90 days. Remove expired or malformed data. No visitor data is stored in WordPress or sent to a plugin service. If storage is unavailable, fail without forwarding stale data.
- Target only an exact configured destination hostname or a link explicitly marked with class `utm-keeper`. No destination domains by default. Eligible destinations must be external HTTPS URLs with no embedded credentials, including class-marked links. Reject hostname lookalikes, invalid URLs, other schemes, and download links.
- Decorate qualifying links on activation (ordinary and middle clicks), not every link on page load; delegated handling should accommodate dynamically inserted links. Preserve existing query and fragment, and never overwrite a destination query parameter already present.
- Settings belong under **Settings → UTM Keeper** and require `manage_options`; sanitize a fixed parameter allowlist, hostname list, and retention value using WordPress Settings API. A reset control clears attribution **only in the current administrator's browser**.
- No analytics, cookies, external tracking service, custom parameters, or consent-management feature. Documentation must note that campaign values can contain personal data and forwarded URLs may be logged by destinations; site owners are responsible for applicable privacy obligations.

## Architecture and delivery

Keep the runtime lightweight: guarded WordPress PHP bootstrap + Settings API class + dependency-free vanilla JS. Send only sanitized public configuration to the frontend and load the script only when enabled. Keep capture/storage and URL-decorating logic separable for tests. Avoid frontend requests to the server. Use Node's built-in test runner for JS; add PHP lint and WordPress settings/integration checks where a WordPress test environment is available.

1. **Plugin bootstrap and test foundation** — plugin header, guarded loading, conditional frontend asset registration/enqueue, configuration contract, minimum JS test harness and documented checks. No dependencies.
2. **Administrator settings** — enable switch, parameter checkboxes, exact hostnames, retention, validation, and browser-local reset. Depends on 1.
3. **Capture/storage** — selected-key parsing, last-touch replacement, versioned record, expiration and storage failures. Depends on 1 and the configuration contract from 2.
4. **Targeted link forwarding** — exact-host/class matching, delegated ordinary/middle clicks, safe URL construction and destination-key precedence. Depends on 2 and 3.
5. **Privacy and user documentation** — WordPress readme and settings guidance reflecting tested behavior; can proceed in parallel once behavior is settled.
6. **Integration and release verification** — local WordPress smoke tests, permissions, settings, multi-page capture/forwarding, edge cases, and documented results. Depends on 1–5.

## Completion criteria

- Plugin activates without warnings and does nothing on the frontend while disabled.
- Once enabled, configured campaign data persists only until its expiry and reaches only qualifying destinations without overwriting their existing parameters.
- Invalid/unsupported URLs, disabled storage, malformed records, and unconfigured links do not leak stale data or break navigation.
- Automated checks and manual WordPress verification pass; user-facing documentation matches the shipped behavior.

## Preparation scaffold boundary

The initial scaffold creates only the plugin entry point, minimal directory/test structure, placeholder frontend asset and documentation, and basic lint/smoke checks. Full settings, capture, and link-forwarding behavior belong to their respective issues.
