import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OwnedItem } from '../game/loot';
import { ItemArt } from '../components/ItemArt';
import { createItemModel } from './models';

type Actions = { rotate: (x: number, y?: number) => void; zoom: (factor: number) => void; reset: () => void };

export default function ItemViewer3D({ item }: { item: OwnedItem }) {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current || failed) return;
    const element = host.current;
    let renderer: THREE.WebGLRenderer | undefined;
    const resources: (() => void)[] = [];
    const cleanup = () => { for (const dispose of resources.reverse()) dispose(); actions.current = null; };
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = .95;
      const canvas = renderer.domElement;
      canvas.dataset.testid = 'inspection-canvas';
      canvas.setAttribute('aria-label', `3D ${item.item.weapon} ${item.item.name}`);
      canvas.setAttribute('role', 'img');
      element.append(canvas);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(37, 1, .1, 50);
      camera.position.set(1.25, .65, 7.5);
      const controls = new OrbitControls(camera, canvas);
      resources.push(() => controls.dispose());
      controls.enablePan = false;
      controls.enableDamping = false;
      controls.minDistance = 3.7;
      controls.maxDistance = 12;
      controls.minPolarAngle = .08;
      controls.maxPolarAngle = Math.PI - .08;
      controls.rotateSpeed = .65;
      controls.zoomSpeed = .8;
      controls.update();
      controls.saveState();
      const asset = createItemModel(item);
      resources.push(() => asset.dispose());
      scene.add(asset.model);
      canvas.dataset.wearSignature = asset.wearSignature;
      const ambient = new THREE.HemisphereLight(0xc7e4ff, 0x20283d, 1.2);
      scene.add(ambient);
      const key = new THREE.DirectionalLight(0xe7f1ff, 2);
      key.position.set(2, 4, 5); scene.add(key);
      const rim = new THREE.DirectionalLight(new THREE.Color(item.item.colors.secondary), 1.5);
      rim.position.set(-3, 1, -3); scene.add(rim);
      const environment = new RoomEnvironment();
      const generator = new THREE.PMREMGenerator(renderer);
      let reflection: THREE.WebGLRenderTarget;
      try { reflection = generator.fromScene(environment, .04); }
      finally { environment.dispose(); generator.dispose(); }
      resources.push(() => reflection.dispose());
      scene.environment = reflection.texture;
      const render = () => {
        if (document.hidden) return;
        renderer!.render(scene, camera);
        canvas.dataset.viewAngle = controls.getAzimuthalAngle().toFixed(4);
        canvas.dataset.viewDistance = controls.getDistance().toFixed(4);
        canvas.dataset.ready = 'true';
      };
      const modelSize = new THREE.Box3().setFromObject(asset.model).getSize(new THREE.Vector3());
      let previousFit = 0;
      const resize = () => {
        const width = element.clientWidth, height = element.clientHeight;
        if (!width || !height) return;
        // Keep long models framed on portrait screens as well as wide monitors.
        camera.aspect = width / height;
        camera.fov = width < height ? 48 : 37;
        camera.updateProjectionMatrix();
        const fit = Math.max(modelSize.y, modelSize.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.35;
        const distance = previousFit ? controls.getDistance() * fit / previousFit : fit;
        camera.position.setLength(distance);
        controls.minDistance = fit * .55;
        controls.maxDistance = fit * 2.5;
        controls.position0.set(1.25, .65, 7.5).normalize().multiplyScalar(fit);
        previousFit = fit;
        controls.update();
        renderer!.setSize(width, height, false);
        render();
      };
      const rotate = (x: number, y = 0) => {
        const sphere = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        sphere.theta += x;
        sphere.phi = THREE.MathUtils.clamp(sphere.phi + y, .08, Math.PI - .08);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere));
        controls.update(); render();
      };
      actions.current = {
        rotate,
        zoom(factor) {
          const offset = camera.position.clone().sub(controls.target);
          offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
          camera.position.copy(controls.target).add(offset); controls.update(); render();
        },
        reset() { controls.reset(); render(); },
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      controls.addEventListener('change', render);
      const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
      canvas.addEventListener('webglcontextlost', lost);
      document.addEventListener('visibilitychange', render);
      resources.push(() => {
        observer.disconnect(); controls.removeEventListener('change', render);
        document.removeEventListener('visibilitychange', render);
        canvas.removeEventListener('webglcontextlost', lost);
      });
      resize();
    } catch {
      setFailed(true);
    }
    return () => { cleanup(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); };
  }, [item, failed]);

  if (failed) return <div className="inspection-fallback"><ItemArt item={item.item} float={item.float} seed={item.wearSeed}/><p role="status">3D is unavailable on this device. Your item is shown in 2D.</p></div>;
  return <div className="viewer-3d" data-testid="item-viewer-3d">
    <div className="viewer-stage" ref={host} tabIndex={0} role="group" aria-label="Interactive item model" aria-describedby="viewer-help"
      onKeyDown={event => {
        const commands: Record<string, () => void> = {
          ArrowLeft: () => actions.current?.rotate(-Math.PI / 12), ArrowRight: () => actions.current?.rotate(Math.PI / 12),
          ArrowUp: () => actions.current?.rotate(0, -.15), ArrowDown: () => actions.current?.rotate(0, .15),
          '+': () => actions.current?.zoom(.85), '=': () => actions.current?.zoom(.85), '-': () => actions.current?.zoom(1.15),
          r: () => actions.current?.reset(), R: () => actions.current?.reset(),
        };
        if (commands[event.key]) { event.preventDefault(); commands[event.key](); }
      }} />
    <div className="viewer-controls" aria-label="3D inspection controls">
      <button aria-label="Rotate left" title="Rotate left" onClick={() => actions.current?.rotate(-Math.PI / 6)}>↶</button>
      <button aria-label="Rotate right" title="Rotate right" onClick={() => actions.current?.rotate(Math.PI / 6)}>↷</button>
      <span />
      <button aria-label="Zoom out" title="Zoom out" onClick={() => actions.current?.zoom(1.15)}>−</button>
      <button aria-label="Zoom in" title="Zoom in" onClick={() => actions.current?.zoom(.85)}>+</button>
      <button className="viewer-reset" onClick={() => actions.current?.reset()}>Reset view</button>
    </div>
    <p id="viewer-help" className="viewer-help">Drag to rotate · Scroll or pinch to zoom · Arrow keys to orbit · R to reset</p>
  </div>;
}
