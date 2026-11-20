# Publishing to itch.io from GitHub Actions

`.github/workflows/itch.yml` builds and uploads the portable HTML5 game using
itch.io's Butler CLI. Once configured, pushes to `main` publish automatically.
You can also run **Actions → Publish itch.io → Run workflow** from the default
branch. Pull requests and manual runs from other branches cannot publish.
Without `ITCH_IO_TARGET`, the workflow skips publishing.

## One-time setup

1. Create or open the Citadel project on itch.io. Set **Kind of project** to
   **HTML**. The account used for Butler must have permission to upload builds.
   The game page can remain a draft while you test the first upload.
2. [Install Butler](https://itch.io/docs/butler/installing.html) locally and run
   `butler login`. Sign in to the itch.io account that owns or administers the game.
3. Open itch.io's [API keys settings](https://itch.io/user/settings/api-keys).
   Copy the key whose source is **wharf**, created by the Butler login.
   On macOS it is also stored at
   `~/Library/Application Support/itch/butler_creds`. See
   [Butler's CI authentication instructions](https://itch.io/docs/butler/login.html).
   Put the key directly into GitHub's secret field; do not paste it into chat or
   commit it to the repository.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions**.
   Add these repository settings:

   | Tab       | Name              | Value                               |
   | --------- | ----------------- | ----------------------------------- |
   | Secrets   | `BUTLER_API_KEY`  | The Butler/wharf key from step 3    |
   | Variables | `ITCH_IO_TARGET`  | `username/game-slug`, all lowercase |
   | Variables | `ITCH_IO_CHANNEL` | Optional; defaults to `html5`       |

   For a page at `https://your-name.itch.io/citadel`, use
   `your-name/citadel` for the target. Do not include the URL or `:html5`.
   If Butler already uploads this game, set the channel to the existing HTML5
   channel name so updates replace that upload rather than create another one.

   Alternatively, from your local repository checkout, use the
   [GitHub CLI](https://cli.github.com/manual/gh_secret_set). The first command
   prompts for the key; replace `your-name` in the second command:

   ```sh
   gh secret set BUTLER_API_KEY
   gh variable set ITCH_IO_TARGET --body 'your-name/citadel'
   ```

5. Ensure the repository's Actions policy allows the existing checkout/Vite+
   actions plus `actions/upload-artifact` and `actions/download-artifact`.
6. After this workflow is committed and pushed with owner authorisation, let the
   default-branch push publish, or intentionally run **Publish itch.io** manually.
   The build must pass format/lint/type checks, unit tests and Chromium checks
   for startup, refresh, release Settings and assets under `/uploads/citadel/`.
7. After the first successful upload, open itch.io's **Edit game** page and mark
   the channel's upload **This file will be played in the browser**, then save.
   Butler cannot set this flag automatically. Configure Click to Play, a
   resizable/fullscreen embed and mobile support as described in
   [the artwork and HTML5 build guide](APP_ARTWORK.md#itchio-html5-build).
   See [Butler's HTML game instructions](https://itch.io/docs/butler/pushing.html#html--playable-in-browser-games).
8. Play and refresh the game on its itch.io page. Check desktop and mobile embed
   sizing and audio after Start. Set the page's visibility to Public when ready;
   uploading a build does not choose your page's visibility or configure its artwork.

## What gets uploaded

The build job runs `vp build --mode itch` with `NODE_ENV=production`. Relative
asset paths allow nested itch.io hosting, and local diagnostic actions remain
disabled. Only `dist-itch/` is stored as the `itch-html5` Actions artifact, retained
for seven days. The deploy job downloads that exact tested artifact and calls:

```sh
butler push dist-itch username/game-slug:html5 --userversion COMMIT_SHA
```

The secret is supplied only to the upload step through `BUTLER_API_KEY`.
No interactive login runs in CI. Butler is installed from itch.io's documented
[stable Linux download](https://itch.io/docs/butler/installing.html#automation-friendly-way),
and its version is printed in the job log. Upload runs are serialised so Butler
does not publish two builds concurrently. GitHub Pages continues to use its
separate workflow and `dist/` output.

## Troubleshooting

- **Skipped:** set the repository variable `ITCH_IO_TARGET` and run from the
  default branch. Removing the target disables future uploads.
- **Missing BUTLER_API_KEY:** add the repository Actions secret with that exact
  name, then rerun. A configured target with a missing key fails explicitly.
- **Authentication or permission error:** check the wharf key and the account's
  access to the target project. Revoke a compromised key in itch.io settings,
  log in again locally and replace the GitHub secret.
- **Download appears but there is no playable game:** select HTML as the project
  type and mark the uploaded channel playable in the browser, then save.
- **Build/check/browser failure:** deployment does not run; fix the failure before
  rerunning. A successful local test does not verify the GitHub runner or live page.
