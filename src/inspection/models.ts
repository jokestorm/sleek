import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { OwnedItem } from '../game/loot';

// Original solid models. Coordinates describe appearance only, not functional mechanisms.
export function createItemModel(item: OwnedItem) {
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [];
  let seed = item.wearSeed >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ink = canvas.getContext('2d')!;
  ink.fillStyle = item.item.colors.primary;
  ink.fillRect(0, 0, 512, 512);
  // Paint geometry is stable per finish; wear placement is stable per instance.
  ink.strokeStyle = item.item.colors.secondary;
  ink.lineWidth = 6;
  for (let i = -512; i < 1024; i += 94) {
    ink.beginPath(); ink.moveTo(i, 0); ink.lineTo(i + 390, 512); ink.stroke();
  }
  for (let i = 0; i < Math.floor(item.float * 320); i++) {
    const x = random() * 512, y = random() * 512;
    ink.fillStyle = i % 3 ? '#4b5057' : '#bbc1c4';
    ink.save(); ink.translate(x, y); ink.rotate(random() * Math.PI);
    ink.fillRect(0, 0, 1 + random() * item.float * 32, .8 + random() * item.float * 7);
    ink.restore();
  }
  const paintTexture = new THREE.CanvasTexture(canvas);
  paintTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(paintTexture);
  const paint = new THREE.MeshStandardMaterial({ map: paintTexture, metalness: .35, roughness: .3 + item.float * .48, color: new THREE.Color().setScalar(1 - item.float * .18) });
  const metal = new THREE.MeshStandardMaterial({ color: '#83909c', metalness: .9, roughness: .25 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1e2633', metalness: .7, roughness: .38 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#141a22', metalness: .15, roughness: .85 });
  const accent = new THREE.MeshStandardMaterial({ color: item.item.colors.secondary, metalness: .65, roughness: .25 });
  const lens = new THREE.MeshStandardMaterial({ color: '#2e7189', metalness: .8, roughness: .08 });
  const materials = [paint, metal, dark, rubber, accent, lens];

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z); group.add(part); return part;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material = dark, angle = 0) {
    const part = mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * .17), material, x, y, z);
    part.rotation.z = angle; return part;
  }
  function cylinder(x: number, y: number, z: number, radius: number, length: number, material = metal) {
    const part = mesh(new THREE.CylinderGeometry(radius, radius, length, 24), material, x, y, z);
    part.rotation.z = Math.PI / 2; return part;
  }
  function planarUvs(geometry: THREE.BufferGeometry) {
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let index = 0; index < positions.count; index++) {
      uv.setXY(index, (positions.getX(index) - bounds.min.x) / (bounds.max.x - bounds.min.x), (positions.getY(index) - bounds.min.y) / (bounds.max.y - bounds.min.y));
    }
    return geometry;
  }
  function outline(points: [number, number][], depth: number, material: THREE.Material, z = 0) {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .035, bevelThickness: .025 });
    return mesh(planarUvs(geometry), material, 0, 0, z - depth / 2);
  }
  function screw(x: number, y: number, z: number) {
    const part = mesh(new THREE.CylinderGeometry(.045, .045, .025, 12), metal, x, y, z);
    part.rotation.x = Math.PI / 2;
    box(x, y, z + Math.sign(z) * .02, .045, .009, .006, dark);
  }
  function guard(x: number, y: number) {
    const shape = new THREE.Shape();
    shape.moveTo(-.35, .15); shape.lineTo(.3, .15); shape.quadraticCurveTo(.5, -.4, .15, -.45); shape.lineTo(-.35, -.45); shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-.24, .04); hole.lineTo(-.24, -.32); hole.lineTo(.13, -.32); hole.quadraticCurveTo(.34, -.27, .21, .04); hole.closePath();
    shape.holes.push(hole);
    const part = mesh(new THREE.ExtrudeGeometry(shape, {depth:.16,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.02}), metal, x, y, -.08);
    return part;
  }
  function rails(start: number, end: number, y: number) {
    box((start + end) / 2, y, 0, end - start, .08, .26, metal);
    for (let x = start; x < end; x += .18) box(x, y + .055, 0, .085, .07, .3, dark);
  }
  const art = item.item.art;
  if (art === 'pistol') {
    outline([[-1.4,.5],[1.22,.5],[1.42,.23],[1.25,-.12],[-.22,-.12],[-.58,-1.22],[-1.2,-1.18],[-.96,-.1],[-1.4,.04]], .42, metal);
    box(-.06, .48, 0, 2.76, .59, .58, dark);
    box(-.09, .56, 0, 2.42, .4, .61, paint);
    outline([[-.94,-.08],[-.42,-.12],[-.69,-1.1],[-1.1,-1.05]], .47, rubber);
    for (let y=-.88;y<-.12;y+=.14) box(-.8-(y+.5)*.22,y,.246,.35,.045,.015,dark,.22);
    guard(-.18,-.1);
    cylinder(1.34,.43,0,.18,.21,dark); cylinder(1.45,.43,0,.125,.015,rubber);
    box(-1.03,.84,0,.17,.13,.23,metal); box(1.03,.84,0,.11,.12,.13,accent);
    for(const side of [-1,1]) {
      for(let x=-1.1;x<-.5;x+=.16)box(x,.58,.315*side,.065,.22,.018,metal,-.35);
      box(.28,.58,.315*side,.63,.09,.025,accent,-.2);
      screw(-.67,-.2,.25*side); screw(-.92,-.92,.25*side);
    }
  } else if (art === 'rifle' || art === 'sniper') {
    const sniper = art === 'sniper';
    outline([[-1.15,.35],[.85,.35],[1.12,.12],[.95,-.35],[-.52,-.35],[-.78,-.58],[-1.25,-.35]], .44, metal);
    box(-.05,.06,0,1.9,.55,.49,paint);
    box(1.14,.04,0,.89,.42,.44,paint);
    cylinder(sniper?2.2:1.99,.12,0,sniper?.075:.095,sniper?1.45:.97,dark);
    cylinder(sniper?2.97:2.52,.12,0,.12,.17,metal);
    cylinder(sniper?3.06:2.61,.12,0,.075,.02,rubber);
    box(-1.55,-.05,0,.85,.22,.22,dark);
    outline([[-1.4,.15],[-2.28,.32],[-2.42,-.44],[-2.14,-.48],[-1.64,-.25],[-1.4,-.25]], .34, sniper?paint:dark);
    box(-2.38,-.13,0,.13,.77,.4,rubber,-.12);
    box(-.84,-.76,0,.34,.95,.36,rubber,-.25);
    box(-.72,-1.18,0,.38,.12,.39,metal,-.25);
    box(.25,-.72,0,.45,.84,.38,dark,.13);
    box(.21,-1.12,0,.5,.12,.43,metal,.13);
    for(let i=0;i<3;i++)box(.08+i*.12,-.73,.21,.045,.54,.025,rubber,.13);
    guard(-.5,-.34);
    rails(-.98,1.48,.4);
    for(const side of [-1,1]) {
      for(let x=.84;x<1.48;x+=.16)box(x,.07,.235*side,.08,.18,.024,dark,-.2);
      box(-.12,.06,.26*side,.7,.055,.025,accent);
      screw(-.75,.18,.26*side);screw(.58,-.16,.26*side);
    }
    if(sniper) {
      box(-.52,.66,0,.16,.42,.18,dark);box(.37,.66,0,.16,.42,.18,dark);
      cylinder(-.08,.91,0,.16,1.28,dark);
      cylinder(.64,.91,0,.25,.39,metal);cylinder(.85,.91,0,.209,.022,lens);
      cylinder(-.84,.91,0,.205,.25,dark);cylinder(-.98,.91,0,.16,.02,lens);
      box(-.08,1.12,0,.18,.22,.17,dark);
      cylinder(-.09,.92,.22,.09,.16,metal).rotation.set(Math.PI/2,0,0);
    } else {
      box(-.45,.59,0,.55,.22,.28,dark); box(-.45,.7,0,.15,.07,.13,accent);
    }
  } else {
    // A curved blade with a real beveled edge, solid grip, and open finger ring.
    const blade = new THREE.Shape();
    blade.moveTo(-.18,.1);blade.bezierCurveTo(.4,.55,1.55,.7,1.95,-.64);
    blade.bezierCurveTo(1.25,.15,.56,-.21,.1,-.35);blade.lineTo(-.18,.1);
    const geometry=new THREE.ExtrudeGeometry(blade,{depth:.11,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.045,bevelThickness:.025,curveSegments:36});
    planarUvs(geometry);
    mesh(geometry,metal,0,0,-.055);
    const painted=mesh(geometry.clone(),paint,0,.015,-.055);painted.scale.set(.94,.85,1.12);
    outline([[-.25,.13],[-1.16,.39],[-1.38,.12],[-.72,-.42],[-.12,-.3]],.3,dark);
    for(const side of [-1,1]) {
      outline([[-.35,.05],[-1.1,.26],[-1.19,.11],[-.68,-.28],[-.24,-.23]],.025,rubber,side*.18);
      screw(-.48,-.11,side*.21);screw(-1.02,.11,side*.21);
    }
    const ring=mesh(new THREE.TorusGeometry(.32,.075,12,40),metal,-1.43,.17,0);ring.rotation.z=-.4;
    box(-.1,-.13,0,.12,.66,.36,accent,-.55);
  }
  const bounds=new THREE.Box3().setFromObject(group);
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  group.position.sub(center);
  const root=new THREE.Group();root.add(group);root.scale.setScalar(4.4/Math.max(size.x,size.y,size.z));
  return { model: root, wearSignature: `${item.item.id}:${item.float}:${item.wearSeed}`, dispose() {
    group.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});
    materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
  }};
}
