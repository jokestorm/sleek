# Item inspection

Built-in Sidearm, Carbine, Longshot, and Talon items have a 360-degree inspection view. Open a collection item or use Inspect finish on a result. Three.js and the solid models load only when inspection opens.

## Controls

- Drag with a mouse or swipe with one finger to orbit the item. Horizontal rotation is unrestricted.
- Scroll or pinch to zoom. Zoom in and Zoom out buttons provide the same control.
- Focus the model and use arrow keys to orbit, `+` / `-` to zoom, or `R` to reset.
- Reset view restores the initial angle and framing. Framing adapts to the viewport and model size.
- Switch to 2D artwork to see the original illustration. Escape closes inspection.

There is no automatic rotation or idle render loop. The scene redraws when controls or viewport size change. Closing inspection releases the controls, geometry, materials, textures, environment map, and graphics context.

## Models and finishes

Original procedural models live in `src/inspection/models.ts`. They contain solid beveled geometry, metal and painted surfaces, barrels, grips, and archetype-specific details. The knife has a curved blade and an open finger ring. These are original 3D interpretations of the four built-in weapon types, rather than exact reconstructions of the generated 2D artwork.

The selected owned item's catalog snapshot supplies its colors. Its stored float controls paint roughness, fading, and scratch density; its wear seed fixes scratch placement. Reopening the same instance recreates the same texture, without rolling or saving a new float. Wear is mapped onto 3D surfaces and has a different projection from the scratches overlaid on 2D artwork. Future authored models and texture maps can align these presentations more closely.

Items using a custom `image` path retain 2D inspection because no matching custom model has been supplied. This implementation does not load external GLB files or invent the hidden surfaces of custom artwork. If WebGL is unavailable, initialization fails, or the graphics context is lost, inspection shows the original 2D artwork with an explanatory message.

## Planned model and preview workflow

Use the authored 3D model and its finish materials as the source for both inspection and generated 2D previews. The owner should manage the model and finish assets; preview generation should remove the need to maintain a matching PNG manually. Keep an optional PNG override for special artwork.

Proposed asset locations, not yet supported by the loader:

```text
public/models/sidearm.glb       # Authored model with embedded textures
public/art/generated/          # Automatically rendered catalog previews
public/art/overrides/          # Optional manually supplied previews
```

Generate catalog previews during asset preparation with consistent camera framing, lighting, and transparent backgrounds. Continue serving static images in the opening reel so viewing the catalog does not require loading every model. For owned items, render and cache previews from their actual saved float and wear seed. Cache identity must include the model/finish revision, full float, wear seed, and preview-rendering settings.

### Float-driven 3D wear

Float must visibly affect the model's surfaces, alongside its condition label. Higher floats should expose more underlying metal and paint chips, scratches, and grime, with suitable changes to roughness and finish saturation. Preserve the weapon's geometry and finish identity. Metal, painted panels, grips, and glass may need different responses.

Use the saved float as the wear amount and the saved wear seed to fix the pattern. Wear should increase consistently for a given seed: increasing float should reveal or deepen damage rather than randomly reshuffle every scratch. Reopening, rotating, generating a thumbnail, and reloading must reproduce the same instance's appearance. Materials or wear masks should describe where a finish wears, including protected regions and exposed edges.

The implementation mechanism remains open: authored UV wear masks, shader blending between paint and underlying materials, and procedural scratches are candidates. Establish the asset/material contract before implementing external model loading. Current procedural models already use float for roughness, fading, and scratch density, but do not implement this full authored-material pipeline or guarantee nested scratch patterns as float changes.

Generate an owned item's thumbnail using the same model and wear materials as inspection, so its wear agrees in both views. Verify low, middle, and high floats on the same finish and seed, stability across reloads, and separate patterns for distinct instance seeds. Existing stored floats and seeds remain immutable; this work changes their rendering, not item rolls or drop odds.

## Implementation and validation

`src/components/ItemInspection.tsx` switches views and loads `src/inspection/ItemViewer3D.tsx` on demand. The viewer uses Three.js OrbitControls, physically based materials, and a studio environment. The renderer caps pixel ratio at 2 and draws on demand to limit work. The separate 3D chunk is approximately 151 kB gzipped; it is excluded from the initial game bundle.

With Vite running and Playwright/Chromium installed:

```sh
BASE_URL=http://localhost:5174 node scripts/inspection-check.mjs /absolute/path/to/@playwright/test/index.mjs
```

The checks render all four weapon types, exercise full orbits, drag and keyboard controls, zoom/reset, switching views and closing inspection, mobile layouts, stable saved wear, and graphics fallbacks. Headless Chromium uses software graphics for these checks. Physical mobile devices, Safari, and Firefox still need manual coverage.

Implementation references: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer), [OrbitControls](https://threejs.org/docs/pages/OrbitControls), [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html), and [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html).
