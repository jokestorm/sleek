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

## Implementation and validation

`src/components/ItemInspection.tsx` switches views and loads `src/inspection/ItemViewer3D.tsx` on demand. The viewer uses Three.js OrbitControls, physically based materials, and a studio environment. The renderer caps pixel ratio at 2 and draws on demand to limit work. The separate 3D chunk is approximately 151 kB gzipped; it is excluded from the initial game bundle.

With Vite running and Playwright/Chromium installed:

```sh
BASE_URL=http://localhost:5174 node scripts/inspection-check.mjs /absolute/path/to/@playwright/test/index.mjs
```

The checks render all four weapon types, exercise full orbits, drag and keyboard controls, zoom/reset, switching views and closing inspection, mobile layouts, stable saved wear, and graphics fallbacks. Headless Chromium uses software graphics for these checks. Physical mobile devices, Safari, and Firefox still need manual coverage.

Implementation references: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer), [OrbitControls](https://threejs.org/docs/pages/OrbitControls), [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html), and [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html).
