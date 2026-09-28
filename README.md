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

After committing your changes, run `pnpm build` (or `npm run build`). It creates `dist/utmkeeperflow.zip` with the `utmkeeperflow/` folder inside, ready to upload in WordPress. The archive uses committed files from `HEAD`; `.gitattributes` excludes tests, development tools, docs, release artwork, and the build script. Uncommitted changes are not included.

## Publish to WordPress.org

The GitHub workflow in `.github/workflows/ci.yml` runs JavaScript and PHP checks on pull requests, `main`, and release tags. It deploys to the `utmkeeperflow` WordPress.org SVN repository **only** when a numeric version tag (for example `0.1.0`) is pushed and all checks pass. The tag, plugin header `Version`, and `readme.txt` `Stable tag` must match. Do not reuse a version already published to WordPress.org.

1. In the GitHub repository's Actions secrets, set `SVN_USERNAME` and `SVN_PASSWORD` for a WordPress.org account authorized to commit to this plugin's SVN repository. Never commit credentials. Use a WordPress.org SVN-specific password from your account settings where available.
2. Commit and push the release contents, including `.wordpress-org/icon-128x128.png`, `.wordpress-org/icon-256x256.png`, and any screenshots. The `.wordpress-org` files go to the SVN root `assets/`, **not** plugin `trunk/` or the installable ZIP. `docs/blueprints/blueprint.json` is a development-only Playground blueprint, not artwork.
3. Verify the tests pass on `main`, then create and push the version tag from that exact commit: `git tag 0.1.0 && git push origin 0.1.0`. This starts the deployment; inspect the Actions run and the WordPress.org listing afterward. Do not push the tag before setting the secrets and confirming the slug/version with WordPress.org.

The icon source is `scripts/generate-icon.py`. To regenerate the two PNG sizes for a later release, install Pillow in your development Python environment and run `python scripts/generate-icon.py`.
