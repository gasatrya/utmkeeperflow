=== UTM Keeper ===
Contributors: gasatrya
Donate link: https://paypal.me/satrya
Tags: utm, attribution, campaigns, links, marketing
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Remember where visitors came from and pass campaign tags to booking or checkout links you choose.

== Description ==

Someone clicks your newsletter link, browses a few pages on your site, then clicks through to an external booking site. The campaign tags are no longer in the page URL. How will the booking site know the visitor came from your newsletter?

UTM Keeper saves selected campaign tags in the visitor's browser. When they click an external link you choose, it adds those tags to the destination URL. This helps the destination attribute bookings or purchases to your campaigns. It does not keep the tags visible in your site's page URLs or provide analytics itself.

= Example: newsletter to booking =

A visitor lands on your site with `?utm_source=newsletter&utm_campaign=spring`. After browsing pages without those tags in their URLs, they click your configured link to `https://bookings.example.com/book`. UTM Keeper adds `utm_source=newsletter&utm_campaign=spring` to the booking URL, so the booking site can identify the campaign.

= Other use cases =

* An ad brings someone to your site; they later follow your selected link to an external checkout.
* A social campaign brings someone to your site; they later follow your selected link to an external registration page.

= How it works =

UTM Keeper is disabled by default. Once an administrator enables it, the plugin stores selected campaign parameters in one expiring localStorage record for this site's browser origin. No plugin account, external service, cookies, or runtime packages are required. The plugin does not create server-side visitor records or send attribution to a plugin service; clicking a targeted link sends the resulting URL to that destination through normal browser navigation.

The five standard UTM keys (utm_source, utm_medium, utm_campaign, utm_term, utm_content) are selected by default. gclid and fbclid are optional. Unknown keys, empty/whitespace-only values, and values longer than 256 UTF-16 code units are ignored. A visit with at least one valid selected key replaces the *whole* previous set (last touch); a visit without valid selected keys leaves it unchanged without extending expiry. Retention is 30 days by default, configurable from 1 to 90 days from capture. Invalid or expired records are removed when checked. Unavailable browser storage means attribution cannot be captured or forwarded; there is no cookie or server fallback.

Only external HTTPS links to an exact configured DNS hostname or links marked with the CSS class `utm-keeper` qualify. Both require no embedded credentials and no download attribute. Forwarding happens on ordinary or middle click, including for links inserted after page load, not by rewriting all links on page load. Existing destination query keys (even empty ones) take precedence; the destination path, existing query and fragment remain intact. Internal links, HTTP links, invalid URLs, and other unmarked/unconfigured links are left unchanged. No hostname is configured by default; marking a link is a separate opt-in.

= Privacy and limitations =

Campaign parameters can contain personal data. Forwarded URLs may be logged by destination servers and other intermediaries. Site owners are responsible for their own privacy notices, consent requirements, and destination practices. Enabling this plugin is not a consent mechanism and does not guarantee compliance. The plugin does not provide analytics, form-field population, consent management, or automatic forwarding to all outbound links.

For testing or to start fresh, use the "Clear attribution in this browser" button under Settings > UTM Keeper. It removes only this plugin's localStorage record for the current browser profile and the admin page's origin; it does not change saved settings, unrelated site data, or other visitors' browsers. The button works even when the plugin is disabled, and reports if browser storage is unavailable. If the public site uses a different protocol, hostname, or port from the admin page, its storage is separate and this button cannot clear it. On that public site's origin, you can instead run `localStorage.removeItem('utmkeeperflow_attribution')` in the browser console. Visiting a campaign URL again after reset can capture fresh attribution.

Automated JavaScript and PHP shim checks cover the described behavior and settings contract. Local integration was exercised on WordPress 7.1.2 with PHP 8.2.29; the "Tested up to" header reflects only the locally verified WordPress 7.1 line. See the release-verification notes in the repository for the matrix and Plugin Check scope. Compatibility with other WordPress/PHP versions is not established by this single environment.

== Installation ==

1. Install the plugin in `wp-content/plugins/utmkeeperflow/` and activate UTM Keeper in WordPress Plugins. Requires WordPress 6.5 or later and PHP 7.4 or later.
2. Open Settings > UTM Keeper as an administrator. The plugin remains disabled until you select Enable UTM Keeper and save.
3. Select which supported campaign keys to capture. By default, five UTM keys are checked; gclid and fbclid are unchecked.
4. Enter one exact DNS destination hostname per line, for example `bookings.example.com`. Do not include `https://`, a port, path, wildcard, or IP address. `bookings.example.com` does not match `other.bookings.example.com` or `bookings.example.com.evil.test`.
5. Alternatively, explicitly mark a link in your site content, for example `<a href="https://checkout.example.com/book" class="utm-keeper">Book now</a>`. The HTTPS, external, no-credentials, and no-download restrictions still apply even to marked links.
6. Set retention (1-90 days), save, and test by visiting `/?utm_source=newsletter&utm_campaign=spring`, then another page without campaign parameters before clicking an eligible conversion link. The destination receives only missing selected values. For example, `https://bookings.example.com/book?utm_source=existing#step` keeps `utm_source=existing` and adds `utm_campaign=spring` before `#step`.

== Frequently Asked Questions ==

= Does it track visitors through a third-party service? =

No. Capture uses this site's browser localStorage; the plugin makes no external attribution requests. Normal navigation to an eligible destination can expose forwarded query values to that destination.

= Can I reset attribution for all visitors from the settings page? =

No. The reset button affects only this plugin's record in the current browser profile at the admin page's origin; it cannot clear data in other visitors' browsers or at a different site origin.

= Why did a link remain unchanged? =

The plugin must be enabled, storage must be available with an unexpired record, and the link must be an eligible external HTTPS link to an exact configured hostname or have the `utm-keeper` class. Existing destination keys are never overwritten. Download links, links with credentials, and non-HTTPS or internal links are not forwarded.

== Changelog ==

= 0.1.0 =

* Initial browser-local campaign capture, administrator settings, and targeted external link forwarding.
