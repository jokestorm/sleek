# Original collectible art prompts

Generated for Sleek on 17 October 2026 with the built-in `image_gen.imagegen` tool in transparent-background mode. Four separate calls created four distinct assets. No CLI fallback, third-party reference images, Valve artwork, or logos were used. Pristine art supports finish colour variants and deterministic wear in the app. The original generated PNGs were copied without image editing, preserving their alpha channels.

## Files and provenance

| Asset | Runtime path | Generated source filename |
| --- | --- | --- |
| pistol | `public/art/pistol.png` | `exec-5bfdb4d1-b2f1-4c26-8759-474e7d60d91c.png` |
| rifle | `public/art/rifle.png` | `exec-e6bf0a66-17e6-4c6c-ab5e-bb2a519328de.png` |
| sniper | `public/art/sniper.png` | `exec-517344aa-33f3-4c64-9b20-cf4f267f0543.png` |
| knife | `public/art/knife.png` | `exec-34488ee5-8dcc-4f34-8424-4a1ec09278ee.png` |

All source files were generated under `/home/garth/.codex/generated_images/01a14ac4-46a1-73c2-b444-6b50b5027561/`. Runtime references use only repository assets, not these machine-specific source paths.

Each render was visually inspected for a complete original silhouette, right-facing side view, no text or branding, consistent cyan/gunmetal/silver materials, and clear thumbnail readability. PNG inspection confirms actual transparent alpha. Canvas dimensions vary; use object-fit containment without distorting aspect ratio. The rifle and sniper fill most of the source width, so UI containers should supply their own comfortable padding.

## Exact prompts

### Pistol

```text
Use case: stylized-concept. Asset type: pristine game inventory collectible product render. Generate exactly ONE original fictional collectible weapon as a premium stylized 3D hard-surface game asset, no real brand, no Valve/Counter-Strike assets or logos. Landscape composition, pure genuinely transparent alpha background, NO floor, NO backdrop, NO text, NO lettering, NO border, NO watermark, NO hands, NO person, NO ammunition, NO muzzle flash. Complete object fully visible, centered with generous clear margins, fills approximately 80% canvas width, horizontal side profile facing RIGHT. Slight perspective to show metal bevels while retaining readable silhouette. High-end studio lighting with crisp silver edge highlights, clean dark gunmetal structure and broad polished CYAN/teal painted panels, small violet accents, pristine unscratched new condition. Saturated finish, detailed but easy to read at thumbnail size. Clean cutout without drop shadow. Subject: one compact futuristic semi-automatic pistol, handsome chunky stepped slide, cyan upper receiver panels, angular textured dark ergonomic grip, exposed silver bevel accents, no accessories; muzzle to right, grip downward, trigger guard fully visible. Invent original nonfunctional sci-fi design rather than copying any real model.
```

### Rifle

```text
Use case: stylized-concept. Asset type: pristine game inventory collectible product render. Generate exactly ONE original fictional collectible weapon as a premium stylized 3D hard-surface game asset, no real brand, no Valve/Counter-Strike assets or logos. Landscape composition, pure genuinely transparent alpha background, NO floor, NO backdrop, NO text, NO lettering, NO border, NO watermark, NO hands, NO person, NO ammunition, NO muzzle flash. Complete object fully visible, centered with generous clear margins, fills approximately 80% canvas width, horizontal side profile facing RIGHT. Slight perspective to show metal bevels while retaining readable silhouette. High-end studio lighting with crisp silver edge highlights, clean dark gunmetal structure and broad polished CYAN/teal painted panels, small violet accents, pristine unscratched new condition. Saturated finish, detailed but easy to read at thumbnail size. Clean cutout without drop shadow. Subject: one original futuristic assault-rifle collectible, cyan broad receiver and handguard panels, strong dark stock to left, long barrel to right, boxy dark magazine, dark grip, silver rails and tasteful violet detail. Full stock and muzzle visible. Original sci-fi design, no real model markings.
```

### Sniper

```text
Use case: stylized-concept. Asset type: pristine game inventory collectible product render. Generate exactly ONE original fictional collectible weapon as a premium stylized 3D hard-surface game asset, no real brand, no Valve/Counter-Strike assets or logos. Landscape composition, pure genuinely transparent alpha background, NO floor, NO backdrop, NO text, NO lettering, NO border, NO watermark, NO hands, NO person, NO ammunition, NO muzzle flash. Complete object fully visible, centered with generous clear margins, fills approximately 80% canvas width, horizontal side profile facing RIGHT. Slight perspective to show metal bevels while retaining readable silhouette. High-end studio lighting with crisp silver edge highlights, clean dark gunmetal structure and broad polished CYAN/teal painted panels, small violet accents, pristine unscratched new condition. Saturated finish, detailed but easy to read at thumbnail size. Clean cutout without drop shadow. Subject: one original elegant futuristic precision rifle collectible, long complete barrel pointing right, integrated dark scope over a broad cyan-painted chassis, refined silver structural surfaces, dark ergonomic stock to left, no bipod; long strong horizontal silhouette. Original sci-fi design, no real model markings.
```

### Knife

```text
Use case: stylized-concept. Asset type: pristine game inventory collectible product render. Generate exactly ONE original fictional collectible weapon as a premium stylized 3D hard-surface game asset, no real brand, no Valve/Counter-Strike assets or logos. Landscape composition, pure genuinely transparent alpha background, NO floor, NO backdrop, NO text, NO lettering, NO border, NO watermark, NO hands, NO person, NO ammunition, NO muzzle flash. Complete object fully visible, centered with generous clear margins, fills approximately 80% canvas width, horizontal side profile facing RIGHT. Slight perspective to show metal bevels while retaining readable silhouette. High-end studio lighting with crisp silver edge highlights, clean dark gunmetal structure and broad polished CYAN/teal painted panels, small violet accents, pristine unscratched new condition. Saturated finish, detailed but easy to read at thumbnail size. Clean cutout without drop shadow. Subject: one spectacular original curved talon collector knife, crescent karambit-inspired cyan polished metallic blade with violet iridescent edges pointing to RIGHT, charcoal sculpted ergonomic grip on left with large circular silver finger ring, premium bevels, clean complete silhouette. Ornamental fictional collector object, no exact real branded design.
```

## Interface fonts

Barlow Condensed and DM Sans are bundled under `public/fonts/` so the interface makes no external font requests. Font binaries came from Google Fonts (`fonts.gstatic.com`); matching SIL Open Font License files are included from the Google Fonts repository's `ofl/barlowcondensed` and `ofl/dmsans` directories.
