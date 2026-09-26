# UTM Keeper

UTM Keeper helps your booking or checkout site know which campaign brought a visitor to you—even if they browse several pages first.

**Example:** Someone arrives from your newsletter at `/?utm_source=newsletter&utm_campaign=spring`. They browse your site, then click a link to your external booking site. UTM Keeper adds the saved campaign tags to that booking link, so the booking site can identify the campaign. It does **not** keep the tags visible in your site's page URLs or provide analytics itself.

This also works for visitors who arrive from an ad or social campaign before clicking an external checkout or registration link you choose.

## Set up

1. Install and activate **UTM Keeper** in WordPress (requires WordPress 6.5+ and PHP 7.4+).
2. Go to **Settings → UTM Keeper**, enable the plugin, and select which campaign parameters to save.
3. Enter the exact hostname of your external destination, **one per line**, and save. For a link to `https://bookings.example.com/book`, enter only `bookings.example.com`—not the URL or `/book`. Use your real destination hostname; none is configured by default.

Only selected external HTTPS links receive saved parameters. Campaign values are stored in the visitor's browser, not on your WordPress server. See [the full plugin readme](readme.txt) for targeting options, privacy considerations, and limitations.

## Quick test and troubleshooting

1. Visit your site with `?utm_source=newsletter&utm_campaign=spring` in the URL. In the browser console, run `JSON.parse(localStorage.getItem('utmkeeperflow_attribution'))` to check that the values were saved.
2. Browse to another page. The tags disappearing from the **page URL** is normal; the saved browser record should remain.
3. Click an external HTTPS link to the hostname you configured. The destination URL should include the saved tags unless that link already has those keys.

No saved record? Check that the plugin is enabled and your browser allows local storage. No tags on the outgoing link? Check that its hostname matches your setting exactly and that it uses HTTPS. The **Clear attribution in this browser** button under Settings resets only this browser's record for the admin page's origin; if your public site uses a different origin, its storage is separate.

For code checks, run from this directory:

```sh
npm test
php tests/php/bootstrap.php
php -l utmkeeperflow.php
```

The PHP checks use WordPress shims, so also test the plugin in a real WordPress installation. No npm or Composer packages are required to run the plugin.

## Build the plugin ZIP

After committing your changes, run `pnpm build:zip` (or `npm run build:zip`). It creates `dist/utmkeeperflow.zip` with the `utmkeeperflow/` folder inside, ready to upload in WordPress. The archive uses committed files from `HEAD`; `.gitattributes` excludes tests, development tools, docs, and the build script. Uncommitted changes are not included.
