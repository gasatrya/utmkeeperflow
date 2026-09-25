# UTM Keeper MVP issue drafts

These are the source drafts for the GitHub issue tree. See `MVP-PLAN.md` for agreed product behavior.

<!-- ISSUE:parent -->
## Objective
Ship a small WordPress plugin that preserves selected attribution parameters during navigation and forwards them only to explicitly targeted conversion links.

## Context
Campaign parameters disappear as visitors browse before booking, buying, or signing up. See `docs/CONCEPT.md` and `docs/MVP-PLAN.md` for product scope and agreed defaults.

## Scope
A guarded plugin bootstrap, opt-in administrator settings, browser-only last-touch capture with expiration, safe external HTTPS link forwarding, documentation, and verification.

## Out of scope
Analytics, forms and ecommerce integrations, arbitrary query keys, server-side visitor records, external tracking, first-touch attribution, and consent management.

## Child issues
Tracked via GitHub native sub-issues.

## Completion criteria
- [ ] Plugin is inert on the frontend until enabled and does not append to unconfigured links.
- [ ] Configured parameters persist across page visits until expiry and reach only qualifying conversion links; destination values win conflicts.
- [ ] Malformed data, storage failure, unsafe URLs, and unsupported links fail safely.
- [ ] All child issues are complete; automated tests, WordPress integration checks, and user-facing privacy documentation agree with shipped behavior.

## Dependencies and risks
Implement bootstrap and configuration before capture/forwarding; integration is the final gate. URL parameters can contain personal information; enabling this plugin is not a consent solution. Do not add a network or server-side analytics component.
<!-- END ISSUE -->

<!-- ISSUE:bootstrap -->
## Outcome
A valid, lightweight WordPress plugin foundation and repeatable baseline checks.

## Context
The repository begins with product documents only. The plugin must remain inert until explicitly enabled by an administrator.

## Scope
- Add guarded WordPress plugin header/entry point and a stable version/configuration contract.
- Establish an asset structure for dependency-free browser JS and conditional frontend enqueue when enabled.
- Establish minimal JS test runner, PHP lint commands, and a local WordPress smoke-test procedure.

## Out of scope
Full settings UI, campaign persistence, link decoration.

## Acceptance criteria
- [ ] WordPress recognizes and activates the plugin without PHP notices, and direct PHP file access is guarded.
- [ ] No frontend script runs while disabled; when enabled, public configuration is passed to a versioned asset safely.
- [ ] `php -l` checks pass; `node --test` runs a baseline test without third-party dependencies.
- [ ] The bootstrap remains compatible with the Settings API implementation without visitor data stored in WordPress.

## Dependencies
None.
<!-- END ISSUE -->

<!-- ISSUE:settings -->
## Outcome
Administrators can safely configure capture, targeting, retention, and browser-local reset.

## Scope
- Add Settings → UTM Keeper using WordPress Settings API, `manage_options`, and form nonce protection.
- Provide default-off enable switch, fixed-key checkboxes (five UTMs on, gclid/fbclid off), exact destination hostname list, and retention from 1–90 days (30 default).
- Sanitize and validate values; supply only public configuration to the browser. Offer reset limited to the administrator's current browser.

## Out of scope
Campaign parsing, capture, or link mutation.

## Acceptance criteria
- [ ] Unauthorized users cannot change settings; output is escaped and invalid parameter names/hostnames are rejected.
- [ ] Empty destination list and default-off state leave all frontend links untouched.
- [ ] Saved values survive reload; reset clears only local browser attribution, not other visitors' data.
- [ ] Validation/defaults are covered by tests or a documented WordPress test matrix.

## Dependencies
Blocked by plugin bootstrap and test foundation.
<!-- END ISSUE -->

<!-- ISSUE:capture -->
## Outcome
The visitor's browser retains a small, expiring, configured last-touch attribution record.

## Scope
- Parse only enabled keys from the arrival URL; discard empty and values longer than 256 characters.
- On an arrival with at least one valid configured key, replace the entire previous set; without one, retain the previous set.
- Keep one versioned `localStorage` record with fixed expiry from capture, default 30 days (configured 1–90); remove invalid, obsolete, and expired records.
- Fail closed on unavailable storage, without cookies, server persistence, or outbound requests.

## Out of scope
Link targeting/forwarding and first-touch or merged attribution.

## Acceptance criteria
- [ ] Tests demonstrate selected-key filtering, partial campaigns, replacement, noncampaign navigation, expiry boundary, and malformed records.
- [ ] A disabled plugin does not read/write attribution storage.
- [ ] Storage errors do not disrupt navigation or forward stale values.

## Dependencies
Blocked by bootstrap and administrator configuration contract.
<!-- END ISSUE -->

<!-- ISSUE:forwarding -->
## Outcome
Stored attribution reaches only explicitly targeted safe conversion links when activated.

## Scope
- Qualify links with exact configured external hostname or `utm-keeper` CSS class; both routes require external HTTPS, no credentials, and no `download` attribute.
- Use delegated handling for ordinary and middle clicks, including dynamically inserted links.
- Preserve destination path, query, and fragment; append only missing configured keys without overwriting existing destination values.

## Out of scope
Rewriting all outbound links, internal links, non-HTTPS schemes, forms, and automatic page-load rewriting.

## Acceptance criteria
- [ ] Tests cover exact hosts vs lookalikes, class-marked links, fragments, existing/duplicate keys, dynamic links, middle clicks, unsupported schemes, credentials, invalid URLs, and downloads.
- [ ] Untargeted links are never changed; no destination is targeted by default.
- [ ] Browser navigation remains functional if storage is empty or unavailable.

## Dependencies
Blocked by administrator settings and capture/storage.
<!-- END ISSUE -->

<!-- ISSUE:docs -->
## Outcome
Users can configure and understand the shipped plugin and its privacy implications.

## Scope
- Write WordPress `readme.txt` with setup, destination hostname and CSS-class examples, defaults, last-touch rule, expiry, and local reset.
- Add concise settings-page help text consistent with implemented behavior.
- Describe that campaign parameters may contain personal data, forwarded URLs may be logged, and site owners are responsible for their own privacy/consent requirements.

## Out of scope
Privacy-policy automation, consent banner, analytics documentation, and speculative integrations.

## Acceptance criteria
- [ ] User-facing text matches verified behavior and contains no guarantee that attribution values are nonpersonal or compliant by default.
- [ ] No external service/account is required; limitations and browser-local reset scope are explicit.

## Dependencies
Behavior must be settled with settings, capture, and forwarding; writing may overlap their implementation.
<!-- END ISSUE -->

<!-- ISSUE:integration -->
## Outcome
The MVP is verified in a local WordPress site and ready for release review.

## Scope
- Check activation/deactivation, permissions, saved settings, disabled-state asset loading, and multi-page capture/forwarding.
- Exercise fragments, existing destination parameters, unsafe destinations, blocked storage, expiration, dynamically inserted links, keyboard activation, and middle clicks.
- Run JS tests and PHP lint; record the manual WordPress matrix and failures/fixes on the issue.

## Out of scope
New feature development, analytics, and third-party service integration.

## Acceptance criteria
- [ ] Automated checks pass and test commands/results are recorded.
- [ ] Manual checks in a local WordPress environment pass or any remaining limitations are documented before release.
- [ ] No unexpected frontend requests, server-side visitor records, or changes to unrelated links occur.

## Dependencies
Blocked by bootstrap, settings, capture, forwarding, and documentation.
<!-- END ISSUE -->
