# App icons and game artwork

The authored source is [`icon_512.png`](../apps/web/public/icon_512.png), 512 × 512.
The favicon, Apple Home Screen icon and manifest icons use this original image,
including its CITADEL lettering and START button. Square exports above 512 pixels
are upscaled versions; they do not recover additional detail.

The landscape artwork extends the neon arena to fit wider placements. All exports
retain the complete title and START button. Review the
[contact sheet](artwork/contact-sheet.png): itch cover, itch splash, Devvit splash
and Facebook share image, in reading order.

## Browser and iPhone

`index.html` links to a 16/32/48-pixel ICO, 32-pixel PNG favicon, the original
512-pixel icon and a 180-pixel `apple-touch-icon.png`.
The web manifest provides relative 192- and 512-pixel PNG icons. Links resolve
under the site root, the Pages project path, and the portable itch build.
Icons use `purpose: any`: this artwork has important content near its edges and
must not advertise itself as safe for a maskable icon crop.

On iPhone, open the site in Safari and choose Share → Add to Home Screen. Existing
Home Screen shortcuts may retain the old icon; remove and add the shortcut again
after deploying the new assets. Physical iPhone installation remains a manual
check. Apple's [Web Clip icon documentation](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
describes `apple-touch-icon` and the 180-pixel iPhone icon.

## Upload images

Files below are in [`apps/web/public/artwork/`](../apps/web/public/artwork/).

| Platform / placement           | File                            | Pixels      | Requirement status                                          |
| ------------------------------ | ------------------------------- | ----------- | ----------------------------------------------------------- |
| itch.io listing cover          | `itch-cover-630x500.png`        | 630 × 500   | Official recommended size                                   |
| itch.io small cover            | `itch-cover-315x250.png`        | 315 × 250   | Official minimum size                                       |
| itch.io launch splash          | `itch-splash-960x540.png`       | 960 × 540   | Chosen 16:9 embed size; no fixed splash image size required |
| Reddit/Devvit app icon         | `devvit-icon-1024x1024.png`     | 1024 × 1024 | Official required icon size                                 |
| Reddit/Devvit wide splash      | `devvit-splash-880x512.png`     | 880 × 512   | Chosen wide preview; responsive layout required             |
| Facebook link preview          | `facebook-share-1200x630.png`   | 1200 × 630  | Official recommended sharing size                           |
| Facebook game cover candidate  | `facebook-cover-800x450.png`    | 800 × 450   | 16:9 candidate; game dashboard requirements unverified      |
| Facebook game icon candidate   | `facebook-icon-1024x1024.png`   | 1024 × 1024 | Square candidate; game dashboard requirements unverified    |
| Facebook game splash candidate | `facebook-splash-2048x2048.png` | 2048 × 2048 | Square candidate; game dashboard requirements unverified    |

itch.io requires a 315:250 cover ratio and recommends 630 × 500; see
[Your first itch.io page](https://itch.io/docs/creators/getting-started).
Use the cover in the project editor's cover field and the splash in its launch
image field when available. The launch viewport is configured separately.

The owner confirmed that “revvit” means Reddit/Devvit.
Devvit's [configuration documentation](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration#marketing-assets)
specifies a 1024 × 1024 PNG for `marketingAssets.icon`. Its
[responsive post dimensions](https://developers.reddit.com/docs/guides/faq)
vary by viewport; 880 × 512 is an export choice, not a mandatory image size.
For narrow placements use the original square image and contain the whole image
rather than applying a cover crop. In a Devvit app, put these assets in its media
directory, set the icon path, and use a responsive launch entry point with a real
Start control. This repository does not yet contain a Devvit app wrapper.

Facebook's [Images in Link Shares](https://developers.facebook.com/documentation/sharing/webmasters/images)
recommends 1200 × 630. The game HTML includes Open Graph image, dimensions and alt
text targeting the existing planned Pages address:
`https://idrise.github.io/citadel/artwork/facebook-share-1200x630.png`.
That image becomes available there after publication; it has not been checked
live. Change this absolute URL if production hosting changes. Meta's current
Instant Games asset requirements could not be retrieved, so validate the three
game upload candidates against the dashboard before submission. Preparing assets
does not integrate Facebook's game SDK or submit the game for review.

## itch.io HTML5 build

```sh
pnpm build:itch
cd dist-itch
zip -r ../dist-itch.zip . -x '*.DS_Store' '__MACOSX/*'
```

The archive must have `index.html` at its root. Upload it as an HTML game and mark
it playable in the browser. Use Click to Play, a resizable/fullscreen embed and
enable mobile support. Start still runs through the game's existing real control;
the START in the image remains visible artwork. The build uses relative paths
so itch's nested upload URLs can find JavaScript, icons and the manifest. See
[itch.io's HTML5 upload documentation](https://itch.io/docs/creators/html5).
This does not publish the game or change its Pages build.

For automated Butler uploads, follow [the CI publishing setup](ITCH_PUBLISHING.md).
It uses the same portable build and requires a repository secret, target variable
and one-time playable-in-browser setting on itch.io.

## Artwork provenance and regeneration

The built-in imagegen tool produced [`landscape-master.png`](artwork/landscape-master.png)
from the supplied square image. Prompt:

> Use case: compositing. Asset type: landscape game cover master. Edit target:
> attached 512x512 Citadel artwork. Create a 16:9 landscape version by extending
> ONLY the dark neon arena/grid background to the left and right. Keep the entire
> original square composition centered, full height with a small margin around it
> so no content is clipped. Preserve the original CITADEL title, its reflection,
> all paddles and the complete rectangular START button at the bottom, with exact
> text "CITADEL" and "START". Do not crop any letters or button border. Preserve
> the original art, colors, perspective and geometry within that central square,
> and match its grid and glowing arena on both sides. Do not invent additional
> text or buttons. Output a single wide landscape image.

The model extended/reconstructed the arena; the authored square remains the icon
source. Smaller exports are generated directly from their source using ImageMagick's
`LanczosSharp` filter, `filter:blur=0.85`, and a final unsharp mask. Each favicon
frame is resized separately from the 512-pixel source before assembling the ICO;
never resize a smaller export again. Compare the
[original and sharper downscales](artwork/downscale-comparison.png) at native size.
For example, regenerate the itch cover with:

```sh
magick docs/artwork/landscape-master.png -filter LanczosSharp -define filter:blur=0.85 -resize '630x500^' -gravity center -extent 630x500 -unsharp 0x0.6+0.8+0.015 -strip apps/web/public/artwork/itch-cover-630x500.png
```

Square icons use a direct resize of `icon_512.png`; never crop their text. Use
the same sharp filter and unsharp settings for the 180/192-pixel icons. The
16/32/48-pixel favicon frames use `-unsharp 0x0.5+1+0.02` after resizing.
Keep marketing artwork out of the procedural game world. Unit checks validate file
dimensions, manifest sizes and favicon frames; browser checks verify deployed
asset paths at root and under a Pages subpath.

## Validation — 20 November 2026

- `pnpm check`: formatting, lint and TypeScript pass without warnings.
- `pnpm test`: 733 tests pass across 126 files, including asset dimensions,
  manifest declarations, ICO frames and itch release-profile coverage.
- `PAGES_BASE_PATH=/citadel/ pnpm build`, `PAGES_BASE_PATH=/ pnpm build` and
  `pnpm build:itch`: pass. The existing JavaScript chunk-size advisory remains.
- Browser checks: three pass under `/citadel/` (icons, share image, Home Screen
  metadata); three pass for the itch build under `/uploads/citadel/` (icons,
  share image, production startup and refresh); two pass at `/` (icons and
  share image). These use `tests/fixtures.ts` and document-local virtual input.
  The initial sandbox server bind was denied; rerunning with local-server
  permission passed.
- `git diff --check` and ZIP integrity check pass. `dist-itch.zip` has
  `index.html` at its root and excludes Finder metadata.
- Inspected the original graphic, landscape master and final contact sheet.
  All cover crops retain the full title and START button.

Local review: `http://127.0.0.1:5186/`, served from `dist-itch/` using
`pnpm exec vp preview --mode itch --host 127.0.0.1 --port 5186 --strictPort`.
The owner authorised a local commit on 20 November. No platform upload, public deployment, live Facebook
crawler check, SDK integration or physical iPhone installation was performed.

Sharpness follow-up: regenerated every smaller export and the contact sheet,
checked the native-size before/after comparison and zoomed favicon pixels, and
rebuilt both production and itch outputs plus `dist-itch.zip`. The 15 asset unit
tests, `pnpm check`, `git diff --check` and ZIP integrity check pass. The existing
build chunk-size advisory remains. Browser checks were not repeated for this
pixel-only revision.
