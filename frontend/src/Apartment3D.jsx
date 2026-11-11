import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// ============================================================================
// 1. DIGITAL TWIN ROOM CONFIGURATION & LOGICALLY CORRECT COORDINATES
// ============================================================================
// Footprint: 16x16 units (4 rooms, each 8x8 units)
// - Top-Left: Bedroom     (X: -8..0, Z: -8..0)
// - Top-Right: Balcony    (X:  0..8, Z: -8..0)
// - Bottom-Left: Living   (X: -8..0, Z:  0..8)
// - Bottom-Right: Kitchen (X:  0..8, Z:  0..8)
export const ROOM_CONFIG = {
  bedroom: {
    id: 'bedroom',
    name: 'PHÒNG NGỦ',
    center: new THREE.Vector3(-3.2, 1.72, -3.8),
    defaultYaw: -2.35,
    lightPos: new THREE.Vector3(-4, 3.85, -4),
    badgePos: new THREE.Vector3(-4, 2.9, -4),
    switchPos: new THREE.Vector3(-0.3, 1.45, -1.2),
    lightKey: 'light_bed',
    toggleMethod: 'setBed',
    portals: [
      { target: 'living', label: '➔ Bước sang Phòng Khách', pos: new THREE.Vector3(-2.1, 1.15, -0.3) },
      { target: 'balcony', label: '➔ Mở cửa ra Ban Công', pos: new THREE.Vector3(-0.3, 1.15, -4.0) }
    ]
  },
  balcony: {
    id: 'balcony',
    name: 'BAN CÔNG',
    center: new THREE.Vector3(4.5, 1.72, -3.8),
    defaultYaw: -1.5,
    lightPos: new THREE.Vector3(4.0, 3.1, -4),
    badgePos: new THREE.Vector3(4, 2.7, -4),
    switchPos: new THREE.Vector3(0.3, 1.45, -2.5),
    lightKey: 'light_balcony',
    toggleMethod: 'setBalcony',
    portals: [
      { target: 'bedroom', label: '➔ Vào Phòng Ngủ', pos: new THREE.Vector3(0.3, 1.15, -4.0) },
      { target: 'kitchen', label: '➔ Vào Phòng Bếp', pos: new THREE.Vector3(1.6, 1.15, -0.3) }
    ]
  },
  living: {
    id: 'living',
    name: 'PHÒNG KHÁCH',
    center: new THREE.Vector3(-2.6, 1.72, 4.0),
    defaultYaw: -1.57, // Facing West toward TV wall
    lightPos: new THREE.Vector3(-4, 3.85, 4),
    badgePos: new THREE.Vector3(-4, 2.9, 4),
    switchPos: new THREE.Vector3(-0.3, 1.45, 1.2),
    lightKey: 'light_living',
    toggleMethod: 'setLiving',
    portals: [
      { target: 'bedroom', label: '➔ Bước vào Phòng Ngủ', pos: new THREE.Vector3(-2.1, 1.15, 0.3) },
      { target: 'kitchen', label: '➔ Bước sang Phòng Bếp', pos: new THREE.Vector3(-0.3, 1.15, 4.0) }
    ]
  },
  kitchen: {
    id: 'kitchen',
    name: 'PHÒNG BẾP',
    center: new THREE.Vector3(2.6, 1.72, 3.8),
    defaultYaw: 0.85, // Looking toward kitchen counter & dining
    lightPos: new THREE.Vector3(4, 3.85, 4),
    badgePos: new THREE.Vector3(4, 2.9, 4),
    switchPos: new THREE.Vector3(0.3, 1.45, 2.5),
    lightKey: 'light_kitchen',
    toggleMethod: 'setKitchen',
    portals: [
      { target: 'living', label: '➔ Về Phòng Khách', pos: new THREE.Vector3(0.3, 1.15, 4.0) },
      { target: 'balcony', label: '➔ Ra Ban Công thoáng gió', pos: new THREE.Vector3(1.6, 1.15, 0.3) }
    ]
  }
};

export default function Apartment3D({
  twinData,
  onToggle,
  onToggleMismatch,
  viewMode = 'overview',
  setViewMode,
  autoRotate = false,
  weatherState = {}
}) {
  const containerRef = useRef(null);
  const hotspotsLayerRef = useRef(null);

  const threeRefs = useRef({
    scene: null,
    camera: null,
    renderer: null,
    animFrameId: null,
    ambientLight: null,
    hemiLight: null,
    dirLight: null,
    skyCanvas: null,
    skyCtx: null,
    skyTexture: null,
    skyDomeMesh: null,
    rainParticles: null,
    rainPositions: null,
    rainVelocities: null,
    rainCount: 2500,
    exteriorLights: [],
    exteriorMaterials: [],
    roadMat: null,
    courtyardMat: null,
    lastLightningTime: 0,
    lightningUntil: 0,
    roomPointLights: {},
    roomBulbMeshes: {},
    wallSwitchLeds: {},
    fanBladesMesh: null,
    buzzerBeaconMesh: null,
    buzzerPointLight: null,
    ceilingGroup: null,
    frontCutawayWallsGroup: null,
    poolWaterMesh: null,
    proceduralTextures: {},
    hotspotItems: [],
    // Camera parameters
    targetCameraFov: 46,
    orbitTarget: new THREE.Vector3(0, 1.1, 0),
    targetOrbitCenter: new THREE.Vector3(0, 1.1, 0),
    orbitSpherical: { radius: 24.5, phi: Math.PI / 3.05, theta: Math.PI / 4.2 },
    targetSpherical: { radius: 24.5, phi: Math.PI / 3.05, theta: Math.PI / 4.2 },
    fpPosition: new THREE.Vector3(-1.8, 1.72, 5.8),
    targetFpPosition: new THREE.Vector3(-1.8, 1.72, 5.8),
    fpYaw: -1.05,
    fpPitch: -0.04,
    targetFpYaw: -1.05,
    targetFpPitch: -0.04,
    isPointerDown: false,
    prevPointer: { x: 0, y: 0 },
    keysPressed: {},
    currentMode: 'overview'
  });

  const callbacksRef = useRef({
    onToggle,
    onToggleMismatch,
    setViewMode,
    twinData,
    viewMode,
    autoRotate,
    weatherState
  });

  useEffect(() => {
    callbacksRef.current = {
      onToggle,
      onToggleMismatch,
      setViewMode,
      twinData,
      viewMode,
      autoRotate,
      weatherState
    };
  }, [onToggle, onToggleMismatch, setViewMode, twinData, viewMode, autoRotate, weatherState]);

  // Procedural Canvas Textures
  const createProceduralTextures = useCallback((renderer) => {
    const maxAnisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
    const tuneTex = (tex, rx = 1, ry = 1) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rx, ry);
      tex.anisotropy = maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    };

    // 0. Fabric & Wall Plaster Bump Map
    const fabricCanvas = document.createElement('canvas');
    fabricCanvas.width = 256;
    fabricCanvas.height = 256;
    const fCtx = fabricCanvas.getContext('2d');
    fCtx.fillStyle = '#808080';
    fCtx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      for (let x = 0; x < 256; x += 2) {
        const v = 115 + Math.floor(Math.random() * 25) + ((x + y) % 4 === 0 ? 12 : -8);
        fCtx.fillStyle = `rgb(${v},${v},${v})`;
        fCtx.fillRect(x, y, 2, 2);
      }
    }
    const fabricBumpTex = tuneTex(new THREE.CanvasTexture(fabricCanvas), 10, 10);

    // 1. Warm Walnut Hardwood Planks
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 512;
    woodCanvas.height = 512;
    const wCtx = woodCanvas.getContext('2d');
    wCtx.fillStyle = '#7c4728';
    wCtx.fillRect(0, 0, 512, 512);
    const planks = 8;
    const pH = 512 / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * pH;
      const shades = ['#8a5230', '#784425', '#824b2a', '#6e3d20'];
      wCtx.fillStyle = shades[i % shades.length];
      wCtx.fillRect(0, y, 512, pH - 2);
      wCtx.strokeStyle = 'rgba(45, 20, 8, 0.22)';
      wCtx.lineWidth = 1.8;
      for (let g = 0; g < 16; g++) {
        wCtx.beginPath();
        const gy = y + Math.random() * (pH - 4);
        wCtx.moveTo(0, gy);
        wCtx.bezierCurveTo(170, gy + (Math.random() * 5 - 2.5), 340, gy + (Math.random() * 5 - 2.5), 512, gy);
        wCtx.stroke();
      }
      const jointX = ((i * 173) % 400) + 50;
      wCtx.fillStyle = '#3b1d0e';
      wCtx.fillRect(jointX, y, 2, pH);
      wCtx.fillRect(0, y + pH - 2, 512, 2);
    }
    const woodTex = tuneTex(new THREE.CanvasTexture(woodCanvas), 3.5, 3.5);

    // 2. Calacatta Marble Tiles (Kitchen)
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 512;
    tileCanvas.height = 512;
    const tCtx = tileCanvas.getContext('2d');
    tCtx.fillStyle = '#cbd5e1';
    tCtx.fillRect(0, 0, 512, 512);
    const tCount = 4;
    const tSize = 512 / tCount;
    for (let r = 0; r < tCount; r++) {
      for (let c = 0; c < tCount; c++) {
        const tx = c * tSize;
        const ty = r * tSize;
        const grad = tCtx.createLinearGradient(tx, ty, tx + tSize, ty + tSize);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.5, '#f1f5f9');
        grad.addColorStop(1, '#e2e8f0');
        tCtx.fillStyle = grad;
        tCtx.fillRect(tx + 2, ty + 2, tSize - 4, tSize - 4);
        tCtx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
        tCtx.lineWidth = 1.5;
        tCtx.beginPath();
        tCtx.moveTo(tx + 8, ty + tSize * 0.25);
        tCtx.quadraticCurveTo(tx + tSize * 0.5, ty + tSize * 0.55, tx + tSize - 8, ty + tSize * 0.85);
        tCtx.stroke();
      }
    }
    const tileTex = tuneTex(new THREE.CanvasTexture(tileCanvas), 2.5, 2.5);

    // 3. Outdoor Teak Decking Slats (Balcony & Pool)
    const deckCanvas = document.createElement('canvas');
    deckCanvas.width = 512;
    deckCanvas.height = 512;
    const dCtx = deckCanvas.getContext('2d');
    dCtx.fillStyle = '#241409';
    dCtx.fillRect(0, 0, 512, 512);
    const slats = 14;
    const sH = 512 / slats;
    for (let i = 0; i < slats; i++) {
      dCtx.fillStyle = i % 2 === 0 ? '#704020' : '#613619';
      dCtx.fillRect(0, i * sH, 512, sH - 3);
    }
    const deckTex = tuneTex(new THREE.CanvasTexture(deckCanvas), 3, 3);

    // 4. Smart TV UI Texture
    const tvCanvas = document.createElement('canvas');
    tvCanvas.width = 512;
    tvCanvas.height = 256;
    const tvCtx = tvCanvas.getContext('2d');
    const tvGrad = tvCtx.createLinearGradient(0, 0, 512, 256);
    tvGrad.addColorStop(0, '#0369a1');
    tvGrad.addColorStop(0.5, '#1e1b4b');
    tvGrad.addColorStop(1, '#c2410c');
    tvCtx.fillStyle = tvGrad;
    tvCtx.fillRect(0, 0, 512, 256);
    tvCtx.fillStyle = 'rgba(255,255,255,0.95)';
    tvCtx.font = 'bold 28px Inter, sans-serif';
    tvCtx.fillText('SMART HOME OS • 27.8°C', 40, 65);
    tvCtx.font = '18px Inter, sans-serif';
    tvCtx.fillStyle = 'rgba(125, 211, 252, 0.95)';
    tvCtx.fillText('Digital Twin Real-Time Synchronization', 40, 102);
    const tvTex = tuneTex(new THREE.CanvasTexture(tvCanvas), 1, 1);

    // 5. Courtyard Stone Pavers
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 512;
    stoneCanvas.height = 512;
    const stCtx = stoneCanvas.getContext('2d');
    stCtx.fillStyle = '#1e293b';
    stCtx.fillRect(0, 0, 512, 512);
    const pGrid = 4;
    const pSz = 512 / pGrid;
    for (let r = 0; r < pGrid; r++) {
      for (let c = 0; c < pGrid; c++) {
        stCtx.fillStyle = (r + c) % 2 === 0 ? '#334155' : '#2c3a4f';
        stCtx.fillRect(c * pSz + 3, r * pSz + 3, pSz - 6, pSz - 6);
      }
    }
    const stoneTex = tuneTex(new THREE.CanvasTexture(stoneCanvas), 8, 8);

    // 6. Lush Grass
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 512;
    grassCanvas.height = 512;
    const gCtx = grassCanvas.getContext('2d');
    gCtx.fillStyle = '#142e1b';
    gCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      gCtx.fillStyle = Math.random() > 0.5 ? '#1a3a23' : '#102616';
      gCtx.fillRect(gx, gy, 3, 3);
    }
    const grassTex = tuneTex(new THREE.CanvasTexture(grassCanvas), 14, 14);

    // 7. City Skyline Windows
    const bldgCanvas = document.createElement('canvas');
    bldgCanvas.width = 256;
    bldgCanvas.height = 512;
    const bCtx = bldgCanvas.getContext('2d');
    bCtx.fillStyle = '#0b1120';
    bCtx.fillRect(0, 0, 256, 512);
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 6; c++) {
        const lit = (r * 7 + c * 3) % 5 === 0;
        bCtx.fillStyle = lit ? 'rgba(253, 230, 138, 0.75)' : '#111827';
        bCtx.fillRect(14 + c * 38, 16 + r * 30, 24, 16);
      }
    }
    const bldgTex = tuneTex(new THREE.CanvasTexture(bldgCanvas), 1, 1);

    return { fabricBumpTex, woodTex, tileTex, deckTex, tvTex, stoneTex, grassTex, bldgTex };
  }, []);

  // Weather Environment Synchronization & Visual Adjustments
  const updateWeatherVisuals = useCallback((weather) => {
    const r = threeRefs.current;
    if (!r.scene || !r.skyCtx) return;

    const mode = weather?.mode || 'live';
    const isDay = weather?.isDay !== undefined ? weather.isDay : true;
    const isRaining = !!weather?.isRaining;

    // 1. Sky Dome Linear Gradient
    const ctx = r.skyCtx;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);

    let ambientColor = 0xffffff;
    let ambientIntensity = 0.72;
    let hemiSky = 0xe0f2fe;
    let hemiGround = 0x64748b;
    let hemiIntensity = 0.65;
    let dirColor = 0xfffbeb;
    let dirIntensity = 2.2;
    let dirPos = [18, 28, 14];
    let exteriorOn = false;
    let wetLook = isRaining;

    if (mode === 'sunset') {
      grad.addColorStop(0, '#311005');
      grad.addColorStop(0.35, '#7c2d12');
      grad.addColorStop(0.68, '#c2410c');
      grad.addColorStop(0.85, '#ea580c');
      grad.addColorStop(1, '#fed7aa');
      ambientColor = 0xfdba74;
      ambientIntensity = 0.55;
      hemiSky = 0xfb923c;
      hemiGround = 0x7c2d12;
      hemiIntensity = 0.5;
      dirColor = 0xf97316;
      dirIntensity = 1.6;
      dirPos = [26, 12, 18];
      exteriorOn = true;
    } else if (mode === 'rainy_storm' || isRaining) {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.4, '#1e293b');
      grad.addColorStop(0.75, '#334155');
      grad.addColorStop(1, '#475569');
      ambientColor = 0x94a3b8;
      ambientIntensity = 0.42;
      hemiSky = 0x64748b;
      hemiGround = 0x1e293b;
      hemiIntensity = 0.45;
      dirColor = 0x93c5fd;
      dirIntensity = 0.9;
      dirPos = [12, 22, 10];
      exteriorOn = !isDay;
      wetLook = true;
    } else if (mode === 'clear_night' || !isDay) {
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.45, '#090d16');
      grad.addColorStop(0.78, '#0f172a');
      grad.addColorStop(0.92, '#1e293b');
      grad.addColorStop(1, '#334155');
      ambientColor = 0x38bdf8;
      ambientIntensity = 0.28;
      hemiSky = 0x1e293b;
      hemiGround = 0x020617;
      hemiIntensity = 0.3;
      dirColor = 0x60a5fa;
      dirIntensity = 0.45;
      dirPos = [16, 22, 12];
      exteriorOn = true;
    } else {
      // Sunny Day
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.45, '#38bdf8');
      grad.addColorStop(0.78, '#7dd3fc');
      grad.addColorStop(0.92, '#bae6fd');
      grad.addColorStop(1, '#e0f2fe');
      ambientColor = 0xffffff;
      ambientIntensity = 0.72;
      hemiSky = 0xe0f2fe;
      hemiGround = 0x64748b;
      hemiIntensity = 0.65;
      dirColor = 0xfffbeb;
      dirIntensity = 2.2;
      dirPos = [18, 28, 14];
      exteriorOn = false;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    if (r.skyTexture) r.skyTexture.needsUpdate = true;

    // 2. Light adjustments
    if (r.ambientLight) {
      r.ambientLight.color.setHex(ambientColor);
      r.ambientLight.intensity = ambientIntensity;
    }
    if (r.hemiLight) {
      r.hemiLight.color.setHex(hemiSky);
      r.hemiLight.groundColor.setHex(hemiGround);
      r.hemiLight.intensity = hemiIntensity;
    }
    if (r.dirLight) {
      r.dirLight.color.setHex(dirColor);
      r.dirLight.intensity = dirIntensity;
      r.dirLight.position.set(...dirPos);
    }

    // 3. Fog adjustment
    if (r.scene) {
      if (mode === 'rainy_storm' || isRaining) {
        r.scene.fog = new THREE.FogExp2(0x1e293b, 0.016);
      } else if (mode === 'sunset') {
        r.scene.fog = new THREE.FogExp2(0x7c2d12, 0.009);
      } else if (!isDay) {
        r.scene.fog = new THREE.FogExp2(0x0f172a, 0.012);
      } else {
        r.scene.fog = new THREE.FogExp2(0x93c5fd, 0.006);
      }
    }

    // 4. Rain Particles Visibility
    if (r.rainParticles) {
      r.rainParticles.visible = isRaining;
    }

    // 5. Wet ground reflective materials
    if (r.roadMat) {
      r.roadMat.roughness = wetLook ? 0.15 : 0.88;
      r.roadMat.metalness = wetLook ? 0.35 : 0.0;
      r.roadMat.needsUpdate = true;
    }
    if (r.courtyardMat) {
      r.courtyardMat.roughness = wetLook ? 0.22 : 0.78;
      r.courtyardMat.metalness = wetLook ? 0.25 : 0.0;
      r.courtyardMat.needsUpdate = true;
    }

    // 6. Exterior Lights & Glowing Materials
    r.exteriorLights.forEach((light) => {
      light.intensity = exteriorOn ? (mode === 'sunset' ? 0.5 : 1.0) : 0;
    });
    r.exteriorMaterials.forEach((mat) => {
      mat.emissiveIntensity = exteriorOn ? (mode === 'sunset' ? 1.0 : 2.2) : 0;
      mat.needsUpdate = true;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const r = threeRefs.current;

    // Create Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b132b);
    scene.fog = new THREE.FogExp2(0x0b132b, 0.006);
    r.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.28, 190);
    r.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    r.renderer = renderer;

    const textures = createProceduralTextures(renderer);
    r.proceduralTextures = textures;

    // Environmental Lights
    const ambient = new THREE.AmbientLight(0xe2e8f0, 0.75);
    scene.add(ambient);
    r.ambientLight = ambient;

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x3b2314, 0.62);
    hemiLight.position.set(0, 35, 0);
    scene.add(hemiLight);
    r.hemiLight = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.95);
    dirLight.position.set(22, 34, 24);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 2.0;
    dirLight.shadow.camera.far = 85;
    const d = 22;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0012;
    dirLight.shadow.normalBias = 0.03;
    scene.add(dirLight);
    r.dirLight = dirLight;

    // Reset exterior elements
    r.exteriorLights = [];
    r.exteriorMaterials = [];

    // ============================================================================
    // SURROUNDING ENVIRONMENT (Villa Estate, Courtyard, Pool, Trees, Street)
    // ============================================================================
    // 1. Twilight Sky Dome
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const sCtx = skyCanvas.getContext('2d');
    const skyGrad = sCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#040814');
    skyGrad.addColorStop(0.45, '#0f172a');
    skyGrad.addColorStop(0.78, '#1e293b');
    skyGrad.addColorStop(0.92, '#334155');
    skyGrad.addColorStop(1, '#475569');
    sCtx.fillStyle = skyGrad;
    sCtx.fillRect(0, 0, 16, 256);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(145, 32, 24),
      new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false })
    );
    scene.add(skyDome);
    r.skyCanvas = skyCanvas;
    r.skyCtx = sCtx;
    r.skyTexture = skyTexture;
    r.skyDomeMesh = skyDome;

    // 2. Outer Grass Ground Plane
    const lawnMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(170, 170),
      new THREE.MeshStandardMaterial({ map: textures.grassTex, roughness: 0.95 })
    );
    lawnMesh.rotation.x = -Math.PI / 2;
    lawnMesh.position.y = -0.58;
    lawnMesh.receiveShadow = true;
    scene.add(lawnMesh);
    r.lawnMat = lawnMesh.material;

    // 3. Villa Courtyard Stone Slab
    const courtyardSlab = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.22, 32),
      new THREE.MeshStandardMaterial({ map: textures.stoneTex, roughness: 0.78 })
    );
    courtyardSlab.position.set(2.0, -0.45, 1.0);
    courtyardSlab.receiveShadow = true;
    scene.add(courtyardSlab);
    r.courtyardMat = courtyardSlab.material;

    // Garden Beds
    const addGardenBed = (gx, gz, gw, gd) => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(gw + 0.3, 0.22, gd + 0.3),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })
      );
      curb.position.set(gx, -0.26, gz);
      curb.receiveShadow = true;
      scene.add(curb);

      const turf = new THREE.Mesh(
        new THREE.BoxGeometry(gw, 0.26, gd),
        new THREE.MeshStandardMaterial({ map: textures.grassTex, roughness: 0.9 })
      );
      turf.position.set(gx, -0.22, gz);
      turf.receiveShadow = true;
      scene.add(turf);
    };
    addGardenBed(-12.2, -2.5, 4.2, 21.0);
    addGardenBed(1.5, -11.8, 22.0, 3.6);
    addGardenBed(11.5, 11.2, 11.0, 4.2);

    // 4. Veranda Podium & Entry Steps
    const verandaPodium = new THREE.Mesh(
      new THREE.BoxGeometry(20.6, 0.22, 20.6),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 })
    );
    verandaPodium.position.set(-0.2, -0.22, 0.4);
    verandaPodium.receiveShadow = true;
    scene.add(verandaPodium);

    for (let s = 0; s < 3; s++) {
      const stepW = 6.2 + s * 0.5;
      const stepD = 1.2 + s * 0.45;
      const stepY = -0.10 - s * 0.09;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, 0.08, stepD),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
      );
      stepMesh.position.set(-2.5, stepY, 8.8 + s * 0.55);
      stepMesh.receiveShadow = true;
      scene.add(stepMesh);

      const stepGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.8 });
      r.exteriorMaterials.push(stepGlowMat);
      const stepGlow = new THREE.Mesh(
        new THREE.BoxGeometry(stepW - 0.2, 0.025, 0.04),
        stepGlowMat
      );
      stepGlow.position.set(-2.5, stepY + 0.02, 8.8 + s * 0.55 + stepD / 2 + 0.02);
      scene.add(stepGlow);
    }

    const stepLight = new THREE.PointLight(0xf59e0b, 0.8, 6);
    stepLight.position.set(-2.5, 0.4, 9.8);
    scene.add(stepLight);
    r.exteriorLights.push(stepLight);

    // 5. Pool Deck & Infinity Pool
    const poolDeck = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.26, 17.6),
      new THREE.MeshStandardMaterial({ map: textures.deckTex, roughness: 0.65 })
    );
    poolDeck.position.set(12.6, -0.21, -0.2);
    poolDeck.receiveShadow = true;
    scene.add(poolDeck);

    const poolCoping = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.08, 13.6),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    poolCoping.position.set(13.0, -0.04, -0.2);
    scene.add(poolCoping);

    const poolBasin = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.06, 13.0),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, emissive: 0x0284c7, emissiveIntensity: 0.5 })
    );
    poolBasin.position.set(13.0, -0.05, -0.2);
    scene.add(poolBasin);

    const poolWaterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.9, 12.9),
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.86,
        roughness: 0.08,
        metalness: 0.1
      })
    );
    poolWaterMesh.rotation.x = -Math.PI / 2;
    poolWaterMesh.position.set(13.0, 0.015, -0.2);
    scene.add(poolWaterMesh);
    r.poolWaterMesh = poolWaterMesh;

    const poolUnderwaterLight = new THREE.PointLight(0x38bdf8, 1.2, 8);
    poolUnderwaterLight.position.set(13.0, 0.3, -0.2);
    scene.add(poolUnderwaterLight);
    r.exteriorLights.push(poolUnderwaterLight);

    [-4.2, 3.8].forEach((lz) => {
      const lounger = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.18, 0.85),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 })
      );
      lounger.position.set(9.4, 0.02, lz);
      lounger.castShadow = true;
      scene.add(lounger);
    });

    // 6. Perimeter Fence & Gate Pillars
    const fenceWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    const fenceSlatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.4 });
    const addFenceSegment = (fx, fz, fw, fd) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.55, fd), fenceWallMat);
      base.position.set(fx, -0.06, fz);
      base.castShadow = true;
      scene.add(base);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.9, fd * 0.5), fenceSlatMat);
      topRail.position.set(fx, 0.68, fz);
      scene.add(topRail);
    };
    addFenceSegment(2.0, -14.8, 35.6, 0.35);
    addFenceSegment(-15.8, 1.0, 0.35, 31.6);
    addFenceSegment(19.8, 1.0, 0.35, 31.6);
    addFenceSegment(-10.5, 16.8, 10.6, 0.35);
    addFenceSegment(10.5, 16.8, 18.6, 0.35);

    [-5.2, 1.2].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.65, 0.65), fenceWallMat);
      pillar.position.set(px, 0.48, 16.8);
      pillar.castShadow = true;
      scene.add(pillar);
      const pCapMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 2.2 });
      r.exteriorMaterials.push(pCapMat);
      const pCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.5),
        pCapMat
      );
      pCap.position.set(px, 1.38, 16.8);
      scene.add(pCap);

      const pLight = new THREE.PointLight(0xf59e0b, 0.7, 5);
      pLight.position.set(px, 1.6, 16.8);
      scene.add(pLight);
      r.exteriorLights.push(pLight);
    });

    // 7. Street & Dashed Line
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.88 });
    r.roadMat = roadMat;
    const roadMesh = new THREE.Mesh(
      new THREE.BoxGeometry(120, 0.14, 5.2),
      roadMat
    );
    roadMesh.position.set(0, -0.50, 20.0);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    for (let rx = -45; rx <= 45; rx += 6) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.02, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 })
      );
      stripe.position.set(rx, -0.42, 20.0);
      scene.add(stripe);
    }

    // 8. Trees
    const addGardenTree = (tx, tz, scale = 1.0) => {
      const tg = new THREE.Group();
      tg.position.set(tx, -0.1, tz);
      tg.scale.setScalar(scale);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 2.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
      );
      trunk.position.y = 1.1;
      trunk.castShadow = true;
      tg.add(trunk);

      const canopyMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        bumpMap: textures.fabricBumpTex,
        bumpScale: 0.04,
        roughness: 0.85
      });
      const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 1), canopyMat);
      c1.position.set(0, 2.7, 0);
      c1.castShadow = true;
      tg.add(c1);

      const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 1), canopyMat);
      c2.position.set(0.65, 2.3, 0.45);
      c2.castShadow = true;
      tg.add(c2);

      const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), canopyMat);
      c3.position.set(-0.6, 2.4, -0.4);
      c3.castShadow = true;
      tg.add(c3);

      const ringMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 2.0 });
      r.exteriorMaterials.push(ringMat);
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 0.06, 16),
        ringMat
      );
      ring.position.y = 0.04;
      tg.add(ring);

      scene.add(tg);
    };

    addGardenTree(-12.2, -9.2, 1.2);
    addGardenTree(-12.2, 2.5, 1.1);
    addGardenTree(-12.2, 10.2, 1.25);
    addGardenTree(11.5, 11.2, 1.15);
    addGardenTree(14.5, -11.5, 1.3);
    addGardenTree(2.0, -11.8, 1.1);

    // 9. Skyline
    const numBuildings = 40;
    for (let i = 0; i < numBuildings; i++) {
      const angle = (i / numBuildings) * Math.PI * 2;
      const dist = 68 + (i % 3) * 14;
      const bw = 5.0 + (i % 4) * 1.8;
      const bd = 5.0 + ((i + 2) % 4) * 1.6;
      const bh = 12 + ((i * 7) % 26);

      const bMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        map: textures.bldgTex,
        emissive: 0xfde68a,
        emissiveMap: textures.bldgTex,
        emissiveIntensity: 0.42,
        roughness: 0.5
      });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
      bMesh.position.set(Math.cos(angle) * dist, bh / 2 - 0.55, Math.sin(angle) * dist);
      bMesh.lookAt(0, bh / 2, 0);
      scene.add(bMesh);
    }

    // 10. Rain Particle System
    const rainCount = 2500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 6);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 65;
      const ry = Math.random() * 25 + 0.5;
      const rz = (Math.random() - 0.5) * 65;
      const len = 0.35 + Math.random() * 0.25;

      rainPositions[i * 6 + 0] = rx;
      rainPositions[i * 6 + 1] = ry;
      rainPositions[i * 6 + 2] = rz;

      rainPositions[i * 6 + 3] = rx;
      rainPositions[i * 6 + 4] = ry - len;
      rainPositions[i * 6 + 5] = rz;

      rainVelocities[i] = 18 + Math.random() * 12;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const rainParticles = new THREE.LineSegments(rainGeo, rainMat);
    rainParticles.visible = false;
    scene.add(rainParticles);

    r.rainParticles = rainParticles;
    r.rainPositions = rainPositions;
    r.rainVelocities = rainVelocities;
    r.rainCount = rainCount;

    // ============================================================================
    // VILLA ARCHITECTURE & LOGICALLY CORRECT PASSAGEWAYS
    // ============================================================================
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(17.2, 0.20, 17.2),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        bumpMap: textures.fabricBumpTex,
        bumpScale: 0.02,
        roughness: 0.75
      })
    );
    baseMesh.position.y = -0.11;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    const floorGeo = new THREE.BoxGeometry(7.94, 0.08, 7.94);

    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodTex,
      bumpMap: textures.woodTex,
      bumpScale: 0.015,
      roughness: 0.48,
      metalness: 0.04
    });
    const bedFloor = new THREE.Mesh(floorGeo, woodMat);
    bedFloor.position.set(-4, 0.04, -4);
    bedFloor.receiveShadow = true;
    scene.add(bedFloor);

    const livingFloor = new THREE.Mesh(floorGeo, woodMat);
    livingFloor.position.set(-4, 0.04, 4);
    livingFloor.receiveShadow = true;
    scene.add(livingFloor);

    const tileMat = new THREE.MeshStandardMaterial({
      map: textures.tileTex,
      roughness: 0.25,
      metalness: 0.08
    });
    const kitchenFloor = new THREE.Mesh(floorGeo, tileMat);
    kitchenFloor.position.set(4, 0.04, 4);
    kitchenFloor.receiveShadow = true;
    scene.add(kitchenFloor);

    const deckMat = new THREE.MeshStandardMaterial({
      map: textures.deckTex,
      bumpMap: textures.deckTex,
      bumpScale: 0.02,
      roughness: 0.65
    });
    const balconyFloor = new THREE.Mesh(floorGeo, deckMat);
    balconyFloor.position.set(4, 0.04, -4);
    balconyFloor.receiveShadow = true;
    scene.add(balconyFloor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      bumpMap: textures.fabricBumpTex,
      bumpScale: 0.008,
      roughness: 0.88,
      metalness: 0.0
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.15 });
    const woodDoorMat = new THREE.MeshStandardMaterial({
      color: 0x6b3410,
      bumpMap: textures.woodTex,
      bumpScale: 0.01,
      roughness: 0.55
    });
    const windowGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.24,
      roughness: 0.05,
      metalness: 0.1
    });
    const curtainMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      bumpMap: textures.fabricBumpTex,
      bumpScale: 0.03,
      roughness: 0.95,
      transparent: true,
      opacity: 0.85
    });

    const wallH = 4.0;

    const addWall = (w, h, d, x, y, z, mat = wallMat, parent = scene) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Columns & Fascia Beams
    const pillarPositions = [[-8.05, -8.05], [8.05, -8.05], [-8.05, 8.05], [8.05, 8.05], [0, -8.05], [-8.05, 0]];
    pillarPositions.forEach(([px, pz]) => {
      addWall(0.42, wallH + 0.24, 0.42, px, (wallH + 0.24) / 2, pz, trimMat);
    });
    addWall(16.5, 0.22, 0.36, 0, wallH + 0.15, -8.05, trimMat);
    addWall(16.5, 0.22, 0.36, 0, wallH + 0.15, 8.05, trimMat);
    addWall(0.36, 0.22, 16.1, -8.05, wallH + 0.15, 0, trimMat);
    addWall(0.36, 0.22, 16.1, 8.05, wallH + 0.15, 0, trimMat);

    // Balcony Pergola Slats
    for (let i = 0; i < 9; i++) {
      addWall(7.6, 0.12, 0.16, 4.1, wallH + 0.12, -7.4 + i * 0.85, woodDoorMat);
    }

    const addPanoramicWindow = (x, y, z, w, h, rotY, parent = scene) => {
      const wg = new THREE.Group();
      wg.position.set(x, y, z);
      wg.rotation.y = rotY;
      addWall(w, 0.1, 0.30, 0, h / 2, 0, trimMat, wg);
      addWall(w, 0.1, 0.30, 0, -h / 2, 0, trimMat, wg);
      addWall(0.1, h - 0.2, 0.30, -w / 2 + 0.05, 0, 0, trimMat, wg);
      addWall(0.1, h - 0.2, 0.30, w / 2 - 0.05, 0, 0, trimMat, wg);
      addWall(0.06, h - 0.2, 0.28, 0, 0, 0, trimMat, wg);
      addWall(w - 0.22, h - 0.22, 0.05, 0, 0, 0, windowGlassMat, wg);
      addWall(0.48, h - 0.22, 0.14, -w / 2 + 0.36, 0, 0.22, curtainMat, wg);
      addWall(0.48, h - 0.22, 0.14, w / 2 - 0.36, 0, 0.22, curtainMat, wg);
      parent.add(wg);
    };

    const addOpenDoorway = (x, z, rotY) => {
      const doorGroup = new THREE.Group();
      doorGroup.position.set(x, 0, z);
      doorGroup.rotation.y = rotY;
      addWall(0.12, 2.75, 0.3, -0.98, 1.375, 0, woodDoorMat, doorGroup);
      addWall(0.12, 2.75, 0.3, 0.98, 1.375, 0, woodDoorMat, doorGroup);
      addWall(2.1, 0.14, 0.32, 0, 2.78, 0, woodDoorMat, doorGroup);

      const leafPivot = new THREE.Group();
      leafPivot.position.set(-0.9, 1.38, 0.1);
      leafPivot.rotation.y = 1.22;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.48, 2.58, 0.07), woodDoorMat);
      leaf.position.set(0.74, 0, 0);
      leaf.castShadow = true;
      leafPivot.add(leaf);
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.04, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
      );
      handle.position.set(1.32, 0, 0);
      leafPivot.add(handle);
      doorGroup.add(leafPivot);
      scene.add(doorGroup);
    };

    // Back Outer Wall (North)
    addWall(5.4, wallH, 0.24, -5.1, wallH / 2, -8);
    addWall(0.5, wallH, 0.24, -0.35, wallH / 2, -8);
    addWall(1.8, 0.85, 0.24, -1.5, 0.425, -8);
    addWall(1.8, 0.75, 0.24, -1.5, wallH - 0.375, -8);
    addPanoramicWindow(-1.5, 2.05, -8, 1.8, 2.4, 0);

    // Left Outer Wall (West)
    addWall(0.24, wallH, 2.2, -8, wallH / 2, -6.7);
    addWall(0.24, wallH, 10.4, -8, wallH / 2, 2.6);
    addWall(0.24, 0.85, 3.0, -8, 0.425, -4.1);
    addWall(0.24, 0.75, 3.0, -8, wallH - 0.375, -4.1);
    addPanoramicWindow(-8, 2.05, -4.1, 3.0, 2.4, Math.PI / 2);

    // Balcony Glass Railing
    addWall(7.5, 1.18, 0.06, 4.0, 0.68, -8, windowGlassMat);
    addWall(0.06, 1.18, 7.5, 8, 0.68, -4.0, windowGlassMat);
    addWall(7.6, 0.08, 0.16, 4.0, 1.30, -8, trimMat);
    addWall(0.16, 0.08, 7.6, 8, 1.30, -4.0, trimMat);
    [2.5, 5.2].forEach((px) => addWall(0.1, 1.25, 0.1, px, 0.68, -8, trimMat));
    [-5.2, -2.5].forEach((pz) => addWall(0.1, 1.25, 0.1, 8, 0.68, pz, trimMat));

    // =========================================================================
    // CROSS WALLS & LOGICAL OPEN PASSAGEWAYS
    // =========================================================================
    // 1. Divider between Bedroom & Living (Z = 0, X < 0)
    addWall(4.7, wallH, 0.22, -5.5, wallH / 2, 0);
    addWall(0.95, wallH, 0.22, -0.6, wallH / 2, 0);
    addWall(2.05, 1.2, 0.22, -2.1, wallH - 0.6, 0);
    addWall(15.6, 0.12, 0.24, 0, wallH + 0.06, 0, trimMat);
    addOpenDoorway(-2.1, 0, 0);

    // 2. Divider between Balcony & Kitchen (Z = 0, X > 0)
    // FIX: Doorway moved cleanly to X = 1.6, Z = 0 so it connects to the natural walkway corridor!
    // Solid wall on right (X = 2.6..8.0) accommodates the luxury L-counter and cooktop without blocking!
    addWall(0.65, wallH, 0.22, 0.35, wallH / 2, 0); // X = 0.025 to 0.675
    addWall(5.4, wallH, 0.22, 5.3, wallH / 2, 0);   // X = 2.6 to 8.0 (Solid backing for kitchen counter)
    addWall(2.0, 1.2, 0.22, 1.6, wallH - 0.6, 0);   // Lintel
    addOpenDoorway(1.6, 0, 0);                       // Completely clear doorway at X = 1.6!

    // 3. Divider between Bedroom & Balcony (X = 0, Z < 0)
    addWall(0.22, wallH, 2.8, 0, wallH / 2, -6.45);
    addWall(0.22, wallH, 2.8, 0, wallH / 2, -1.55);
    addWall(0.22, 1.2, 2.1, 0, wallH - 0.6, -4.0);
    addWall(0.24, 0.12, 15.6, 0, wallH + 0.08, 0, trimMat);
    addOpenDoorway(0, -4.0, Math.PI / 2);

    // 4. Divider between Living & Kitchen (X = 0, Z > 0)
    addWall(0.22, wallH, 2.45, 0, wallH / 2, 1.35);
    addWall(0.22, wallH, 2.45, 0, wallH / 2, 6.65);
    addWall(0.22, 1.0, 2.8, 0, wallH - 0.5, 4.0);
    addWall(0.3, 3.0, 0.12, 0, 1.5, 2.6, woodDoorMat);
    addWall(0.3, 3.0, 0.12, 0, 1.5, 5.4, woodDoorMat);
    addWall(0.32, 0.14, 2.9, 0, 3.0, 4.0, woodDoorMat);

    // Front & Right Cutaway Walls (First-Person view)
    const frontCutawayWallsGroup = new THREE.Group();
    addWall(1.6, wallH, 0.24, -7.0, wallH / 2, 8, wallMat, frontCutawayWallsGroup);
    addWall(1.6, wallH, 0.24, -1.0, wallH / 2, 8, wallMat, frontCutawayWallsGroup);
    addWall(4.4, 0.75, 0.24, -4.0, 0.375, 8, wallMat, frontCutawayWallsGroup);
    addWall(4.4, 0.75, 0.24, -4.0, wallH - 0.375, 8, wallMat, frontCutawayWallsGroup);
    addPanoramicWindow(-4.0, 2.0, 8, 4.4, 2.5, Math.PI, frontCutawayWallsGroup);
    addWall(7.6, wallH, 0.24, 4.0, wallH / 2, 8, wallMat, frontCutawayWallsGroup);
    addWall(0.24, wallH, 1.6, 8, wallH / 2, 1.0, wallMat, frontCutawayWallsGroup);
    addWall(0.24, wallH, 1.6, 8, wallH / 2, 7.0, wallMat, frontCutawayWallsGroup);
    addWall(0.24, 0.75, 4.4, 8, 0.375, 4.0, wallMat, frontCutawayWallsGroup);
    addWall(0.24, 0.75, 4.4, 8, wallH - 0.375, 4.0, wallMat, frontCutawayWallsGroup);
    addPanoramicWindow(8, 2.0, 4.0, 4.4, 2.5, -Math.PI / 2, frontCutawayWallsGroup);
    frontCutawayWallsGroup.visible = false;
    scene.add(frontCutawayWallsGroup);
    r.frontCutawayWallsGroup = frontCutawayWallsGroup;

    // Overview low cutaway curbs
    addWall(15.6, 0.20, 0.22, 0, 0.18, 8, trimMat);
    addWall(0.22, 0.20, 7.6, 8, 0.18, 4, trimMat);

    // Coffered Tray Ceiling Group
    const ceilingGroup = new THREE.Group();
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      bumpMap: textures.fabricBumpTex,
      bumpScale: 0.006,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const coveGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5
    });
    [[-4, -4], [-4, 4], [4, 4]].forEach(([rx, rz]) => {
      const cSlab = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.10, 7.8), ceilingMat);
      cSlab.position.set(rx, wallH + 0.12, rz);
      ceilingGroup.add(cSlab);
      const coveRing = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.04, 6.6), coveGlowMat);
      coveRing.position.set(rx, wallH + 0.03, rz);
      ceilingGroup.add(coveRing);
      const innerPanel = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.04, 6.2), ceilingMat);
      innerPanel.position.set(rx, wallH - 0.03, rz);
      ceilingGroup.add(innerPanel);
    });
    ceilingGroup.visible = false;
    scene.add(ceilingGroup);
    r.ceilingGroup = ceilingGroup;

    // ============================================================================
    // LOGICALLY ARRANGED INTERIOR FURNITURE (NO BLOCKAGES, PROPER CLEARANCE)
    // ============================================================================
    const box = (w, h, d, color, x, y, z, roughness = 0.65, metalness = 0.05) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness, metalness })
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    const fabricBox = (w, h, d, color, x, y, z, useOffset = false) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          bumpMap: textures.fabricBumpTex,
          bumpScale: 0.025,
          roughness: 0.92,
          metalness: 0.0,
          polygonOffset: useOffset,
          polygonOffsetFactor: useOffset ? -1 : 0,
          polygonOffsetUnits: useOffset ? -1 : 0
        })
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    const glowStrip = (w, h, d, color, x, y, z, intensity = 1.4) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity })
      );
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };

    // --- 1. PHÒNG NGỦ (Top-Left: -4, -4) ---
    // Acoustic headboard wall slats
    for (let s = 0; s < 14; s++) {
      box(0.14, 3.6, 0.08, 0x92400e, -7.2 + s * 0.28, 1.88, -7.80, 0.55);
    }
    glowStrip(3.8, 0.06, 0.1, 0xfbbf24, -5.4, 3.72, -7.78, 1.8);
    fabricBox(4.2, 0.03, 4.4, 0x334155, -5.4, 0.10, -4.9, true);

    // Bed Layers (Proper non-overlapping Y clearance)
    fabricBox(3.5, 0.26, 4.1, 0x1e293b, -5.4, 0.26, -5.2);
    glowStrip(3.4, 0.04, 4.0, 0xf59e0b, -5.4, 0.11, -5.2, 1.4);
    fabricBox(3.6, 1.55, 0.24, 0x334155, -5.4, 0.88, -7.2);
    fabricBox(3.2, 0.26, 3.7, 0xf8fafc, -5.4, 0.52, -5.15);
    fabricBox(3.24, 0.08, 2.35, 0x1d4ed8, -5.4, 0.69, -4.45);
    fabricBox(3.25, 0.05, 0.50, 0x93c5fd, -5.4, 0.755, -5.45);
    fabricBox(1.15, 0.18, 0.58, 0xffffff, -6.15, 0.75, -6.5);
    fabricBox(1.15, 0.18, 0.58, 0xffffff, -4.65, 0.75, -6.5);
    fabricBox(0.95, 0.16, 0.42, 0xfde68a, -6.15, 0.76, -5.95);
    fabricBox(0.95, 0.16, 0.42, 0xfde68a, -4.65, 0.76, -5.95);

    // Nightstand (Clean surface, no bedside lamp)
    box(0.85, 0.55, 0.75, 0x451a03, -3.15, 0.36, -7.25, 0.5);
    box(0.24, 0.08, 0.15, 0x1e293b, -3.15, 0.68, -7.25, 0.3); // Bedside digital clock
    glowStrip(0.18, 0.03, 0.02, 0x38bdf8, -3.15, 0.68, -7.16, 1.6); // Cyan LED time display

    // Wardrobe positioned cleanly away from window (Z = -1.35, stops before window at Z = -2.6)
    box(1.05, 2.85, 2.2, 0x1e293b, -7.32, 1.52, -1.35, 0.45);
    box(0.04, 2.65, 1.02, 0xcbd5e1, -6.76, 1.52, -1.9, 0.25, 0.5);
    box(0.04, 2.65, 1.02, 0xcbd5e1, -6.76, 1.52, -0.8, 0.25, 0.5);

    // Framed Art
    box(0.04, 1.3, 1.9, 0x1e293b, -0.15, 2.25, -6.1);
    box(0.04, 1.15, 1.75, 0xf59e0b, -0.19, 2.25, -6.1, 0.35);

    // --- 2. PHÒNG KHÁCH (Bottom-Left: -4, 4) ---
    // Orient sofa to logically face the 75-inch TV wall (facing West)
    fabricBox(4.6, 0.03, 4.6, 0x44403c, -4.5, 0.10, 4.0, true);

    // Acoustic slats on TV wall (West wall)
    for (let s = 0; s < 16; s++) {
      box(0.08, 3.6, 0.14, 0x78350f, -7.80, 1.88, 1.8 + s * 0.28, 0.55);
    }
    // TV console & 75" Smart TV
    box(0.75, 0.46, 4.2, 0x1e293b, -7.38, 0.37, 4.0, 0.4);
    glowStrip(0.72, 0.04, 4.1, 0x38bdf8, -7.38, 0.11, 4.0, 1.4);
    box(0.08, 1.85, 3.3, 0x090d16, -7.68, 1.85, 4.0, 0.15, 0.6);
    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.74, 3.16),
      new THREE.MeshStandardMaterial({
        map: textures.tvTex,
        emissive: 0x38bdf8,
        emissiveMap: textures.tvTex,
        emissiveIntensity: 0.75,
        roughness: 0.15
      })
    );
    tvScreen.position.set(-7.61, 1.85, 4.0);
    scene.add(tvScreen);

    // L-Sofa facing West toward TV wall
    // Main back along X = -2.6 (Z = 2.4 to 5.6)
    fabricBox(1.15, 0.28, 3.8, 0x1e293b, -3.1, 0.26, 4.0);  // Sofa base
    fabricBox(0.24, 0.72, 3.8, 0x1e293b, -2.45, 0.76, 4.0); // Sofa backrest facing West
    fabricBox(1.05, 0.16, 1.15, 0x334155, -3.1, 0.48, 2.7); // Cushion 1
    fabricBox(1.05, 0.16, 1.15, 0x334155, -3.1, 0.48, 4.0); // Cushion 2
    fabricBox(1.05, 0.16, 1.15, 0x334155, -3.1, 0.48, 5.3); // Cushion 3
    // Chaise return along Z = 2.7 extending West
    fabricBox(1.5, 0.28, 1.15, 0x1e293b, -4.2, 0.26, 2.7);
    fabricBox(1.5, 0.16, 1.05, 0x334155, -4.2, 0.48, 2.7);
    // Accent pillows
    fabricBox(0.20, 0.42, 0.55, 0xd97706, -2.7, 0.77, 2.7);
    fabricBox(0.20, 0.42, 0.55, 0x0284c7, -2.7, 0.77, 4.0);
    fabricBox(0.20, 0.42, 0.55, 0x059669, -2.7, 0.77, 5.3);

    // Coffee table centered between Sofa and TV
    box(1.2, 0.08, 2.0, 0x78350f, -4.9, 0.44, 4.2, 0.3, 0.1);
    box(1.0, 0.32, 1.8, 0x1e293b, -4.9, 0.24, 4.2, 0.6);
    const orbLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.5 })
    );
    orbLamp.position.set(-4.9, 0.62, 4.2);
    scene.add(orbLamp);

    // --- 3. PHÒNG BẾP & PHÒNG ĂN (Bottom-Right: 4, 4) ---
    // ARCHITECTURAL FIX:
    // Doorway to balcony is at X = 1.6, Z = 0 (completely clear corridor!).
    // L-counter is placed along the solid North wall (X = 3.0 to 7.5, Z = 0.5)
    // and East wall (X = 7.4, Z = 0.5 to 3.5).
    // Zero collision with any door! 1.4m clearance from walkway!

    // North counter section (Cooktop & Range Hood)
    box(4.4, 0.84, 0.85, 0xf8fafc, 5.2, 0.50, 0.55, 0.3); // Base
    box(4.5, 0.08, 0.92, 0x1e293b, 5.2, 0.96, 0.55, 0.2, 0.3); // Quartz countertop
    // Upper wall cabinets with open alcove for range hood (split into Left & Right)
    // Left upper cabinet (X = 3.0 to 4.15)
    box(1.15, 0.95, 0.45, 0xe2e8f0, 3.57, 2.80, 0.35, 0.35);
    glowStrip(1.10, 0.03, 0.08, 0xfef08a, 3.57, 2.30, 0.42, 2.0);
    // Right upper cabinet (X = 5.45 to 7.15)
    box(1.70, 0.95, 0.45, 0xe2e8f0, 6.30, 2.80, 0.35, 0.35);
    glowStrip(1.65, 0.03, 0.08, 0xfef08a, 6.30, 2.30, 0.42, 2.0);

    // Induction cooktop at X = 4.8, Z = 0.55
    box(1.2, 0.04, 0.75, 0x090d16, 4.8, 1.02, 0.55, 0.15, 0.5);
    const burnerGlow1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 2.0 })
    );
    burnerGlow1.position.set(4.5, 1.055, 0.55);
    scene.add(burnerGlow1);
    const burnerGlow2 = burnerGlow1.clone();
    burnerGlow2.position.set(5.1, 1.055, 0.55);
    scene.add(burnerGlow2);

    // Range hood chimney & canopy in the open alcove (100% unblocked, zero cabinet overlap)
    box(0.50, 1.25, 0.32, 0x64748b, 4.8, 3.32, 0.22, 0.2, 0.8); // Stainless chimney
    box(1.28, 0.15, 0.72, 0x334155, 4.8, 2.62, 0.55, 0.3, 0.7); // Canopy body directly over cooktop
    box(1.28, 0.08, 0.03, 0x0f172a, 4.8, 2.62, 0.90, 0.1, 0.8); // Front display panel
    glowStrip(0.85, 0.015, 0.015, 0x38bdf8, 4.8, 2.62, 0.92, 2.0); // Touch LED strip

    // Horizontal 7-Blade Exhaust Turbine Fan (Blowing straight down toward the cooktop)
    const hoodFanGroup = new THREE.Group();
    hoodFanGroup.position.set(4.8, 2.48, 0.55); // Centered directly over induction cooktop

    // Outer Aerodynamic Cowl & Shroud (Horizontal intake opening)
    const cowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.38, 0.07, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide })
    );
    cowl.position.set(0, 0.03, 0);
    hoodFanGroup.add(cowl);

    // Cyan Neon Accent Halo Ring (Horizontal ring in X-Z plane)
    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.016, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 2.2 })
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(0, 0, 0);
    hoodFanGroup.add(haloRing);

    // Central Motor Hub Housing
    const motorCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
    );
    motorCore.position.set(0, 0.03, 0);
    hoodFanGroup.add(motorCore);

    // Horizontal Spinning Rotor Assembly (7 Aerodynamic Dual-Tone Blades in X-Z plane)
    const fanBladesMesh = new THREE.Group();
    fanBladesMesh.position.set(0, -0.01, 0);

    // Central Spinner Cone (Pointing straight down toward the cooktop)
    const spinner = new THREE.Mesh(
      new THREE.ConeGeometry(0.10, 0.10, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        metalness: 0.6,
        roughness: 0.2
      })
    );
    spinner.rotation.x = Math.PI; // Pointing down along -Y toward cooktop
    spinner.position.set(0, -0.04, 0);
    fanBladesMesh.add(spinner);

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      metalness: 0.4,
      roughness: 0.2
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x7dd3fc,
      emissiveIntensity: 2.2
    });

    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7;
      const bladeGroup = new THREE.Group();
      bladeGroup.rotation.y = angle; // Spread horizontally in X-Z plane

      // Main blade body
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.018, 0.075),
        bladeMat
      );
      blade.position.set(0.18, 0, 0);
      blade.rotation.x = 0.28; // Aerodynamic pitch blowing down
      bladeGroup.add(blade);

      // Bright contrasting tip for maximum spinning motion visibility
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.020, 0.078),
        tipMat
      );
      tip.position.set(0.29, 0, 0);
      tip.rotation.x = 0.28;
      bladeGroup.add(tip);

      fanBladesMesh.add(bladeGroup);
    }

    hoodFanGroup.add(fanBladesMesh);
    scene.add(hoodFanGroup);
    r.fanBladesMesh = fanBladesMesh;

    // East counter section (Sink & Refrigerator)
    box(0.85, 0.84, 2.2, 0xf8fafc, 7.35, 0.50, 2.1, 0.3);
    box(0.92, 0.08, 2.3, 0x1e293b, 7.35, 0.96, 2.1, 0.2, 0.3);
    // Undermount stainless sink
    box(0.65, 0.04, 0.95, 0x64748b, 7.35, 1.02, 1.9, 0.2, 0.85);

    // French Refrigerator at X = 7.35, Z = 3.4
    box(0.95, 2.35, 1.05, 0x334155, 7.35, 1.26, 3.4, 0.25, 0.75);
    box(0.04, 0.9, 0.04, 0x94a3b8, 6.82, 1.5, 3.15, 0.2, 0.9);
    box(0.04, 0.9, 0.04, 0x94a3b8, 6.82, 1.5, 3.65, 0.2, 0.9);

    // Dining area (Spacious, open, beautiful)
    box(2.2, 0.08, 1.3, 0x92400e, 4.0, 0.84, 5.2, 0.4);
    [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(([dx, dz]) => {
      box(0.09, 0.72, 0.09, 0x1e293b, 4.0 + dx, 0.44, 5.2 + dz, 0.5);
    });
    // 4 Dining Chairs
    [[3.3, 4.3, 0], [4.7, 4.3, 0], [3.3, 6.1, Math.PI], [4.7, 6.1, Math.PI]].forEach(([cx, cz, crot]) => {
      fabricBox(0.48, 0.08, 0.48, 0x334155, cx, 0.50, cz);
      box(0.40, 0.38, 0.40, 0x1e293b, cx, 0.27, cz, 0.6);
      const backZ = crot === 0 ? cz - 0.20 : cz + 0.20;
      fabricBox(0.48, 0.44, 0.08, 0x334155, cx, 0.76, backZ);
    });

    // --- 4. BAN CÔNG (Top-Right: 4, -4) ---
    // Comfortable outdoor setup
    fabricBox(1.4, 0.32, 1.4, 0x334155, 4.5, 0.26, -4.5);
    fabricBox(1.4, 0.65, 0.24, 0x1e293b, 4.5, 0.62, -5.25);
    fabricBox(0.75, 0.36, 0.2, 0x38bdf8, 4.5, 0.62, -4.98);
    const bTable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 })
    );
    bTable.position.set(6.2, 0.58, -4.5);
    scene.add(bTable);
    const bLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 0.48, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    bLeg.position.set(6.2, 0.32, -4.5);
    scene.add(bLeg);

    const addPlant = (x, z, scale = 1.0) => {
      const pg = new THREE.Group();
      pg.position.set(x, 0, z);
      pg.scale.setScalar(scale);
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.3, 0.62, 20),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 })
      );
      pot.position.y = 0.35;
      pot.castShadow = true;
      pg.add(pot);
      const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x292524 })
      );
      soil.position.y = 0.65;
      pg.add(soil);
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        bumpMap: textures.fabricBumpTex,
        bumpScale: 0.03,
        roughness: 0.65
      });
      for (let l = 0; l < 6; l++) {
        const angle = (l * Math.PI) / 3;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), leafMat);
        leaf.scale.set(1.25, 0.35, 0.7);
        leaf.position.set(Math.cos(angle) * 0.32, 0.92 + (l % 2) * 0.18, Math.sin(angle) * 0.32);
        leaf.rotation.y = -angle;
        leaf.rotation.z = 0.4;
        leaf.castShadow = true;
        pg.add(leaf);
      }
      const topLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 14), leafMat);
      topLeaf.position.set(0, 1.22, 0);
      pg.add(topLeaf);
      scene.add(pg);
    };
    addPlant(1.6, -6.7, 1.15);
    addPlant(6.7, -6.7, 1.2);
    addPlant(6.7, -1.6, 1.0);
    addPlant(-6.7, 6.7, 1.15);

    // ============================================================================
    // LIGHTING FIXTURES & SWITCHES
    // ============================================================================
    Object.keys(ROOM_CONFIG).forEach((key) => {
      const cfg = ROOM_CONFIG[key];
      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 0.14, 24),
        new THREE.MeshStandardMaterial({
          color: 0x475569,
          emissive: 0x000000,
          emissiveIntensity: 0
        })
      );
      fixture.position.copy(cfg.lightPos);
      scene.add(fixture);
      r.roomBulbMeshes[key] = fixture;

      const pLight = new THREE.PointLight(0xffedd5, 0, 14, 1.5);
      pLight.position.set(cfg.lightPos.x, cfg.lightPos.y - 0.25, cfg.lightPos.z);
      pLight.castShadow = false;
      scene.add(pLight);
      r.roomPointLights[key] = pLight;

      const swPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.28, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
      );
      swPlate.position.copy(cfg.switchPos);
      scene.add(swPlate);

      const swLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          emissive: 0x000000,
          emissiveIntensity: 0
        })
      );
      swLed.position.copy(cfg.switchPos);
      swLed.position.y += 0.05;
      scene.add(swLed);
      r.wallSwitchLeds[key] = swLed;
    });

    const buzzerBeaconMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.16, 20),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.2 })
    );
    buzzerBeaconMesh.position.set(0.3, 3.1, 0.3);
    scene.add(buzzerBeaconMesh);
    r.buzzerBeaconMesh = buzzerBeaconMesh;

    const buzzerPointLight = new THREE.PointLight(0xef4444, 0, 14);
    buzzerPointLight.position.set(0.5, 2.9, 0.5);
    scene.add(buzzerPointLight);
    r.buzzerPointLight = buzzerPointLight;

    // ============================================================================
    // 3D PROJECTED HOTSPOTS
    // ============================================================================
    const layer = hotspotsLayerRef.current;
    if (layer) {
      layer.innerHTML = '';
      r.hotspotItems = [];

      Object.keys(ROOM_CONFIG).forEach((key) => {
        const cfg = ROOM_CONFIG[key];

        // Overview Room Entry & Status Badge
        const badgeEl = document.createElement('div');
        badgeEl.className = 'hotspot-3d';
        badgeEl.innerHTML = `
          <div class="glass-panel px-3 py-1.5 rounded-2xl flex flex-col items-center gap-1 border border-slate-600/60 shadow-xl cursor-default">
            <div class="flex items-center gap-2">
              <span id="hs-dot-${key}" class="w-2 h-2 rounded-full bg-slate-500"></span>
              <span class="text-[11px] font-bold tracking-wider text-white">${cfg.name}</span>
              <button id="hs-state-${key}" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 hover:opacity-80 transition cursor-pointer pointer-events-auto">
                OFF
              </button>
            </div>
            <button id="hs-enter-${key}" class="w-full py-1 px-2.5 rounded-lg bg-sky-500/90 hover:bg-sky-400 text-white font-semibold text-[10px] flex items-center justify-center gap-1 transition shadow cursor-pointer pointer-events-auto">
              <span>🚶 Bước vào phòng (360°)</span>
            </button>
          </div>
        `;
        layer.appendChild(badgeEl);

        const enterBtn = badgeEl.querySelector(`#hs-enter-${key}`);
        if (enterBtn) {
          enterBtn.onclick = (e) => {
            e.stopPropagation();
            callbacksRef.current.setViewMode(key);
          };
        }
        const stateBtn = badgeEl.querySelector(`#hs-state-${key}`);
        if (stateBtn) {
          stateBtn.onclick = (e) => {
            e.stopPropagation();
            const reported = callbacksRef.current.twinData?.reported || {};
            const isCurrentlyOn = reported[cfg.lightKey] === 1;
            callbacksRef.current.onToggle(cfg.toggleMethod, !isCurrentlyOn);
          };
        }

        r.hotspotItems.push({ type: 'overview-badge', room: key, pos: cfg.badgePos, el: badgeEl });

        // Wall Switch Button
        const swEl = document.createElement('div');
        swEl.className = 'hotspot-3d';
        swEl.innerHTML = `
          <button id="wall-sw-${key}" class="glass-panel px-3 py-1.5 rounded-xl border border-amber-400/60 hover:scale-105 transition flex items-center gap-2 shadow-lg cursor-pointer pointer-events-auto">
            <span class="text-sm">🔘</span>
            <div class="text-left">
              <div class="text-[10px] font-bold text-white">Công tắc tường ${cfg.name}</div>
              <div id="wall-sw-sub-${key}" class="text-[9px] text-amber-300">Nhấn để Bật/Tắt đèn</div>
            </div>
          </button>
        `;
        layer.appendChild(swEl);

        const wallBtn = swEl.querySelector(`#wall-sw-${key}`);
        if (wallBtn) {
          wallBtn.onclick = (e) => {
            e.stopPropagation();
            const reported = callbacksRef.current.twinData?.reported || {};
            const isCurrentlyOn = reported[cfg.lightKey] === 1;
            callbacksRef.current.onToggle(cfg.toggleMethod, !isCurrentlyOn);
          };
        }

        r.hotspotItems.push({ type: 'room-switch', room: key, pos: cfg.switchPos, el: swEl });

        // Doorway Walking Portals
        cfg.portals.forEach((p) => {
          const portalEl = document.createElement('div');
          portalEl.className = 'hotspot-3d';
          portalEl.innerHTML = `
            <button class="px-3.5 py-2 rounded-full bg-sky-500/90 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.6)] border border-sky-200 flex items-center gap-1.5 transition cursor-pointer pointer-events-auto">
              <span>👣</span> <span>${p.label}</span>
            </button>
          `;
          layer.appendChild(portalEl);

          const portalBtn = portalEl.querySelector('button');
          if (portalBtn) {
            portalBtn.onclick = (e) => {
              e.stopPropagation();
              callbacksRef.current.setViewMode(p.target);
            };
          }

          r.hotspotItems.push({ type: 'room-portal', room: key, pos: p.pos, el: portalEl });
        });
      });

      // Kitchen Fan PWM Speed Control Hotspot
      const fanHotspotEl = document.createElement('div');
      fanHotspotEl.className = 'hotspot-3d';
      fanHotspotEl.innerHTML = `
        <div class="glass-panel px-3 py-2 rounded-xl border border-sky-400/50 flex flex-col gap-1 shadow-xl">
          <div class="text-[10px] font-bold text-sky-300 flex items-center gap-1">🌀 Quạt hút bếp (PWM)</div>
          <div class="flex gap-1">
            <button data-spd="0" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-white cursor-pointer pointer-events-auto">Tắt</button>
            <button data-spd="1" class="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-[10px] text-white cursor-pointer pointer-events-auto">1</button>
            <button data-spd="2" class="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-[10px] text-white cursor-pointer pointer-events-auto">2</button>
            <button data-spd="3" class="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-[10px] text-white cursor-pointer pointer-events-auto">Max</button>
          </div>
        </div>
      `;
      layer.appendChild(fanHotspotEl);

      fanHotspotEl.querySelectorAll('button').forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          const spd = parseInt(b.getAttribute('data-spd'), 10);
          callbacksRef.current.onToggle('setFan', spd);
        };
      });

      r.hotspotItems.push({
        type: 'room-switch',
        room: 'kitchen',
        pos: new THREE.Vector3(4.8, 2.0, 1.0),
        el: fanHotspotEl
      });
    }

    // ============================================================================
    // POINTER & KEYBOARD WALKTHROUGH CONTROLS
    // ============================================================================
    const dom = renderer.domElement;

    const onPointerDown = (e) => {
      r.isPointerDown = true;
      r.prevPointer.x = e.clientX;
      r.prevPointer.y = e.clientY;
    };

    const onPointerUp = () => {
      r.isPointerDown = false;
    };

    const onPointerMove = (e) => {
      if (!r.isPointerDown) return;
      const dx = e.clientX - r.prevPointer.x;
      const dy = e.clientY - r.prevPointer.y;
      r.prevPointer.x = e.clientX;
      r.prevPointer.y = e.clientY;

      if (r.currentMode === 'overview' || r.currentMode === 'top') {
        r.targetSpherical.theta -= dx * 0.007;
        r.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, r.targetSpherical.phi - dy * 0.006));
      } else {
        r.targetFpYaw -= dx * 0.0055;
        r.targetFpPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3.2, r.targetFpPitch - dy * 0.005));
      }
    };

    const onWheel = (e) => {
      if (r.currentMode === 'overview' || r.currentMode === 'top') {
        r.targetSpherical.radius = Math.max(11, Math.min(42, r.targetSpherical.radius + e.deltaY * 0.015));
      } else {
        r.targetCameraFov = Math.max(55, Math.min(88, r.targetCameraFov + e.deltaY * 0.02));
      }
    };

    const onKeyDown = (e) => {
      r.keysPressed[e.code] = true;
    };

    const onKeyUp = (e) => {
      r.keysPressed[e.code] = false;
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onWindowResize = () => {
      if (!container || !r.camera || !r.renderer) return;
      r.camera.aspect = container.clientWidth / container.clientHeight;
      r.camera.updateProjectionMatrix();
      r.renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // ============================================================================
    // MAIN RENDER LOOP
    // ============================================================================
    const animate = () => {
      r.animFrameId = requestAnimationFrame(animate);

      // Camera FOV transition
      if (Math.abs(r.camera.fov - r.targetCameraFov) > 0.05) {
        r.camera.fov += (r.targetCameraFov - r.camera.fov) * 0.1;
        r.camera.updateProjectionMatrix();
      }

      // Shimmering Pool Water
      if (r.poolWaterMesh) {
        r.poolWaterMesh.position.y = 0.02 + Math.sin(Date.now() * 0.002) * 0.004;
      }

      // Rotating Kitchen Exhaust Fan (Horizontal spin blowing down toward cooktop)
      const curFanSpeed = callbacksRef.current.twinData?.reported?.fan_speed || (callbacksRef.current.twinData?.reported?.fan_kitchen ? 3 : 0);
      if (r.fanBladesMesh && curFanSpeed > 0) {
        const speeds = [0, 0.12, 0.28, 0.56];
        r.fanBladesMesh.rotation.y += speeds[curFanSpeed] || 0.15;
      }

      // Buzzer Alarm Beacon Pulse
      const isAlarm =
        callbacksRef.current.twinData?.reported?.fire_alarm === 1 ||
        callbacksRef.current.twinData?.mismatch?.detected;
      if (r.buzzerPointLight && r.buzzerBeaconMesh) {
        if (isAlarm) {
          const pulse = (Math.sin(Date.now() * 0.012) + 1) * 1.4;
          r.buzzerPointLight.intensity = pulse;
          r.buzzerBeaconMesh.material.emissiveIntensity = pulse;
        } else {
          r.buzzerPointLight.intensity = 0;
          r.buzzerBeaconMesh.material.emissiveIntensity = 0.15;
        }
      }

      // Rain particles motion
      const currentWs = callbacksRef.current.weatherState;
      if (currentWs?.isRaining && r.rainParticles && r.rainPositions && r.rainVelocities) {
        const positions = r.rainPositions;
        const velocities = r.rainVelocities;
        const count = r.rainCount;
        const windTilt = (currentWs.windSpeed || 10) * 0.012;
        const dt = 0.016;

        for (let i = 0; i < count; i++) {
          const idx = i * 6;
          const dropSpeed = velocities[i] * dt;
          positions[idx + 1] -= dropSpeed;
          positions[idx + 4] -= dropSpeed;
          positions[idx + 0] += windTilt * dropSpeed;
          positions[idx + 3] += windTilt * dropSpeed;

          // Recycle raindrop if it hits ground (y <= -0.45)
          if (positions[idx + 4] < -0.45) {
            const rx = (Math.random() - 0.5) * 65;
            const ry = 22 + Math.random() * 8;
            const rz = (Math.random() - 0.5) * 65;
            const len = 0.35 + Math.random() * 0.25;

            positions[idx + 0] = rx;
            positions[idx + 1] = ry;
            positions[idx + 2] = rz;
            positions[idx + 3] = rx - windTilt * len;
            positions[idx + 4] = ry - len;
            positions[idx + 5] = rz;
          }
        }
        r.rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Lightning flash in rainy_storm mode
      if (currentWs?.mode === 'rainy_storm') {
        const now = performance.now();
        if (now > r.lightningUntil) {
          if (now - r.lastLightningTime > 9000 + Math.random() * 5000) {
            r.lastLightningTime = now;
            r.lightningUntil = now + 120; // 120ms flash
            if (r.dirLight) r.dirLight.intensity = 4.2;
            if (r.ambientLight) r.ambientLight.intensity = 1.8;
          } else {
            if (r.dirLight && r.dirLight.intensity > 1.2) r.dirLight.intensity = 0.9;
            if (r.ambientLight && r.ambientLight.intensity > 0.5) r.ambientLight.intensity = 0.42;
          }
        }
      }

      // Auto-rotation in overview mode if enabled
      if (callbacksRef.current.autoRotate && (r.currentMode === 'overview' || r.currentMode === 'top')) {
        r.targetSpherical.theta += 0.0025;
      }

      // Camera movement
      if (r.currentMode === 'overview' || r.currentMode === 'top') {
        r.orbitSpherical.radius += (r.targetSpherical.radius - r.orbitSpherical.radius) * 0.08;
        r.orbitSpherical.phi += (r.targetSpherical.phi - r.orbitSpherical.phi) * 0.08;
        r.orbitSpherical.theta += (r.targetSpherical.theta - r.orbitSpherical.theta) * 0.08;
        r.orbitTarget.lerp(r.targetOrbitCenter, 0.08);

        const x = r.orbitTarget.x + r.orbitSpherical.radius * Math.sin(r.orbitSpherical.phi) * Math.sin(r.orbitSpherical.theta);
        const y = r.orbitTarget.y + r.orbitSpherical.radius * Math.cos(r.orbitSpherical.phi);
        const z = r.orbitTarget.z + r.orbitSpherical.radius * Math.sin(r.orbitSpherical.phi) * Math.cos(r.orbitSpherical.theta);

        r.camera.position.set(x, y, z);
        r.camera.lookAt(r.orbitTarget);
      } else {
        const walkSpeed = 0.065;
        const forward = new THREE.Vector3(Math.sin(r.fpYaw), 0, Math.cos(r.fpYaw));
        const right = new THREE.Vector3(Math.cos(r.fpYaw), 0, -Math.sin(r.fpYaw));

        if (r.keysPressed['KeyW'] || r.keysPressed['ArrowUp']) r.targetFpPosition.addScaledVector(forward, walkSpeed);
        if (r.keysPressed['KeyS'] || r.keysPressed['ArrowDown']) r.targetFpPosition.addScaledVector(forward, -walkSpeed);
        if (r.keysPressed['KeyA'] || r.keysPressed['ArrowLeft']) r.targetFpPosition.addScaledVector(right, walkSpeed);
        if (r.keysPressed['KeyD'] || r.keysPressed['ArrowRight']) r.targetFpPosition.addScaledVector(right, -walkSpeed);

        r.targetFpPosition.x = Math.max(-7.2, Math.min(7.2, r.targetFpPosition.x));
        r.targetFpPosition.z = Math.max(-7.2, Math.min(7.2, r.targetFpPosition.z));

        r.fpPosition.lerp(r.targetFpPosition, 0.12);
        r.fpYaw += (r.targetFpYaw - r.fpYaw) * 0.14;
        r.fpPitch += (r.targetFpPitch - r.fpPitch) * 0.14;

        r.camera.position.copy(r.fpPosition);
        const lookDir = new THREE.Vector3(
          Math.sin(r.fpYaw) * Math.cos(r.fpPitch),
          Math.sin(r.fpPitch),
          Math.cos(r.fpYaw) * Math.cos(r.fpPitch)
        );
        r.camera.lookAt(r.fpPosition.clone().add(lookDir));
      }

      // Project 3D Hotspots
      if (container) {
        const widthHalf = container.clientWidth / 2;
        const heightHalf = container.clientHeight / 2;
        const isOverview = r.currentMode === 'overview' || r.currentMode === 'top';

        r.hotspotItems.forEach((item) => {
          let shouldShow = false;
          if (isOverview && item.type === 'overview-badge') {
            shouldShow = true;
          } else if (!isOverview && item.room === r.currentMode && (item.type === 'room-switch' || item.type === 'room-portal')) {
            shouldShow = true;
          }

          if (!shouldShow) {
            item.el.style.display = 'none';
            return;
          }

          const projected = item.pos.clone().project(r.camera);
          if (projected.z > 1) {
            item.el.style.display = 'none';
            return;
          }

          const x = projected.x * widthHalf + widthHalf;
          const y = -(projected.y * heightHalf) + heightHalf;
          item.el.style.display = 'block';
          item.el.style.left = `${x}px`;
          item.el.style.top = `${y}px`;
        });
      }

      renderer.render(scene, camera);
    };

    updateWeatherVisuals(callbacksRef.current.weatherState);
    animate();

    return () => {
      if (r.animFrameId) cancelAnimationFrame(r.animFrameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [createProceduralTextures, updateWeatherVisuals]);

  // Reactive viewMode updater
  useEffect(() => {
    const r = threeRefs.current;
    if (!r.scene || !r.camera) return;

    r.currentMode = viewMode;

    if (viewMode === 'overview') {
      if (r.ceilingGroup) r.ceilingGroup.visible = false;
      if (r.frontCutawayWallsGroup) r.frontCutawayWallsGroup.visible = false;
      r.targetCameraFov = 46;
      r.targetOrbitCenter.set(0, 1.0, 0);
      r.targetSpherical = { radius: 24.5, phi: Math.PI / 3.05, theta: Math.PI / 4.2 };
    } else if (viewMode === 'top') {
      if (r.ceilingGroup) r.ceilingGroup.visible = false;
      if (r.frontCutawayWallsGroup) r.frontCutawayWallsGroup.visible = false;
      r.targetCameraFov = 46;
      r.targetOrbitCenter.set(0, 0, 0);
      r.targetSpherical = { radius: 26, phi: 0.06, theta: 0 };
    } else if (ROOM_CONFIG[viewMode]) {
      const cfg = ROOM_CONFIG[viewMode];
      if (r.ceilingGroup) r.ceilingGroup.visible = true;
      if (r.frontCutawayWallsGroup) r.frontCutawayWallsGroup.visible = true;
      r.targetCameraFov = 76;
      r.targetFpPosition.copy(cfg.center);
      r.targetFpYaw = cfg.defaultYaw;
      r.targetFpPitch = -0.03;
    }
  }, [viewMode]);

  // Reactive telemetry state update
  useEffect(() => {
    const r = threeRefs.current;
    if (!r.scene) return;

    const reported = twinData?.reported || {};

    Object.keys(ROOM_CONFIG).forEach((key) => {
      const cfg = ROOM_CONFIG[key];
      const isOn = reported[cfg.lightKey] === 1;

      if (r.roomPointLights[key]) {
        r.roomPointLights[key].intensity = isOn ? 1.85 : 0;
      }
      if (r.roomBulbMeshes[key]) {
        r.roomBulbMeshes[key].material.color.setHex(isOn ? 0xfef08a : 0x475569);
        r.roomBulbMeshes[key].material.emissive.setHex(isOn ? 0xf59e0b : 0x000000);
        r.roomBulbMeshes[key].material.emissiveIntensity = isOn ? 2.6 : 0;
      }
      if (r.wallSwitchLeds[key]) {
        const isMismatch = twinData?.mismatch?.detected && twinData?.mismatch?.zone === cfg.lightKey;
        if (isMismatch) {
          r.wallSwitchLeds[key].material.color.setHex(0xef4444);
          r.wallSwitchLeds[key].material.emissive.setHex(0xdc2626);
          r.wallSwitchLeds[key].material.emissiveIntensity = 2.5;
        } else {
          r.wallSwitchLeds[key].material.color.setHex(isOn ? 0x34d399 : 0x64748b);
          r.wallSwitchLeds[key].material.emissive.setHex(isOn ? 0x10b981 : 0x000000);
          r.wallSwitchLeds[key].material.emissiveIntensity = isOn ? 2 : 0;
        }
      }

      const hsDot = document.getElementById(`hs-dot-${key}`);
      const hsState = document.getElementById(`hs-state-${key}`);
      const wallSub = document.getElementById(`wall-sw-sub-${key}`);

      if (hsDot) {
        hsDot.className = isOn
          ? 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]'
          : 'w-2 h-2 rounded-full bg-slate-500';
      }
      if (hsState) {
        hsState.textContent = isOn ? 'ON' : 'OFF';
        hsState.className = isOn
          ? 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 transition'
          : 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 transition';
      }
      if (wallSub) {
        wallSub.textContent = isOn ? 'Trạng thái: ĐANG SÁNG (Nhấn để tắt)' : 'Trạng thái: ĐANG TẮT (Nhấn để bật)';
      }
    });
  }, [twinData]);

  // Reactive weather updater
  useEffect(() => {
    updateWeatherVisuals(weatherState);
  }, [weatherState, updateWeatherVisuals]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <div
        ref={hotspotsLayerRef}
        className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
      />
    </div>
  );
}
