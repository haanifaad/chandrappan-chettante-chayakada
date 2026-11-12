import * as THREE from 'three';
import { PALETTE } from './palette';
import { skyTexture } from './textures';
import { daylight } from './time';

/** Renderer, scene, camera, lights and resize handling. */

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  setTime(minute: number): void;
}

export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(PALETTE.mist, 22, 110);

  const camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 400);

  // soft overcast monsoon light
  const hemi = new THREE.HemisphereLight('#E6F1EA', '#56684A', 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF1DC', 1.5);
  sun.position.set(7, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -11;
  sc.right = 11;
  sc.top = 11;
  sc.bottom = -11;
  sc.near = 1;
  sc.far = 45;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const sky = new THREE.Color();

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);

  const setTime = (minute: number) => {
    const light = daylight(minute);
    // Night remains readable, but only lamps—not daylight—carry the scene.
    sky.setHSL(0.56 - light * 0.03, 0.26 + light * 0.12, 0.09 + light * 0.58);
    scene.background = sky;
    hemi.intensity = 0.16 + light * 1.34;
    hemi.color.setHSL(0.58 - light * 0.03, 0.2, 0.28 + light * 0.62);
    hemi.groundColor.setHSL(0.29, 0.18, 0.06 + light * 0.21);
    sun.intensity = light * 1.5;
    const angle = ((minute / (24 * 60)) * Math.PI * 2) - Math.PI / 2;
    sun.position.set(Math.cos(angle) * 18, Math.max(1.2, light * 18), Math.sin(angle) * 12 + 6);
  };
  setTime(7 * 60 + 30);
  return { renderer, scene, camera, hemi, sun, setTime };
}
