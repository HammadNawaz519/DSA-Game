import * as THREE from 'three';

/**
 * Lobby3DScene
 * High-performance, ambient 3D garden lobby background
 * Renders stylized 3D plants (Peashooter, Sunflower, Wall-nut)
 * on a manicured lawn with cinematic lighting and a gentle camera drift.
 */
export class Lobby3DScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.animFrameId = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Scene with dark atmospheric fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071106);
    this.scene.fog = new THREE.FogExp2(0x071106, 0.035);

    // Cinematic perspective camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 4.2, 9.5);
    this.camera.lookAt(0, 1.2, 0);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLighting();
    this.buildLobbyEnvironment();
    this.startLoop();
  }

  setupLighting() {
    // Ambient garden glow
    const ambient = new THREE.AmbientLight(0xfff3db, 0.55);
    this.scene.add(ambient);

    // Warm Sun Directional Light with soft shadows
    const sun = new THREE.DirectionalLight(0xfffae0, 1.4);
    sun.position.set(8, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Cool rim light for silhouette separation
    const rim = new THREE.DirectionalLight(0x4095b8, 0.6);
    rim.position.set(-10, 6, -8);
    this.scene.add(rim);

    // Subtle ground bounce light
    const groundBounce = new THREE.HemisphereLight(0x5a9e32, 0x1a2e0e, 0.4);
    this.scene.add(groundBounce);
  }

  buildLobbyEnvironment() {
    // Main manicured grass base
    const lawnGeo = new THREE.CylinderGeometry(14, 15, 0.8, 36);
    const lawnMat = new THREE.MeshLambertMaterial({ color: 0x366e1e });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.y = -0.4;
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // Checkered garden tiles on top
    const tileGroup = new THREE.Group();
    const matA = new THREE.MeshLambertMaterial({ color: 0x478b27 });
    const matB = new THREE.MeshLambertMaterial({ color: 0x3d7b21 });
    const tileGeo = new THREE.BoxGeometry(1.4, 0.1, 1.4);

    for (let r = -2; r <= 2; r++) {
      for (let c = -4; c <= 4; c++) {
        const tile = new THREE.Mesh(tileGeo, (r + c) % 2 === 0 ? matA : matB);
        tile.position.set(c * 1.46, 0.05, r * 1.46);
        tile.receiveShadow = true;
        tileGroup.add(tile);
      }
    }
    this.scene.add(tileGroup);

    // Stylized Wooden Fence in the background
    const fenceGroup = new THREE.Group();
    const postMat = new THREE.MeshLambertMaterial({ color: 0x543719 });
    const postGeo = new THREE.BoxGeometry(0.18, 1.6, 0.18);
    for (let x = -8; x <= 8; x += 0.9) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.8, -4.2);
      post.castShadow = true;
      fenceGroup.add(post);
    }
    const railGeo = new THREE.BoxGeometry(17, 0.12, 0.1);
    const railTop = new THREE.Mesh(railGeo, postMat);
    railTop.position.set(0, 1.2, -4.2);
    railTop.castShadow = true;
    fenceGroup.add(railTop);
    const railBottom = new THREE.Mesh(railGeo, postMat);
    railBottom.position.set(0, 0.5, -4.2);
    railBottom.castShadow = true;
    fenceGroup.add(railBottom);
    this.scene.add(fenceGroup);

    // Assemble 3D Plant Models on display
    this.plants = [];

    // 1. Center Left: Peashooter
    const peashooter = this.createPeashooter();
    peashooter.position.set(-2.0, 0.1, 0.2);
    this.scene.add(peashooter);
    this.plants.push({ mesh: peashooter, baseSpeed: 2.4, offset: 0 });

    // 2. Center: Sunflower
    const sunflower = this.createSunflower();
    sunflower.position.set(0, 0.1, 0.5);
    this.scene.add(sunflower);
    this.plants.push({ mesh: sunflower, baseSpeed: 1.8, offset: 1.2 });

    // 3. Center Right: Wall-nut
    const wallnut = this.createWallnut();
    wallnut.position.set(2.0, 0.1, 0.2);
    this.scene.add(wallnut);
    this.plants.push({ mesh: wallnut, baseSpeed: 1.4, offset: 2.5 });

    // 4. Far Left: Snow Pea
    const snowpea = this.createSnowPea();
    snowpea.position.set(-4.0, 0.1, -0.8);
    this.scene.add(snowpea);
    this.plants.push({ mesh: snowpea, baseSpeed: 2.0, offset: 3.1 });

    // 5. Far Right: Repeater Pea
    const repeater = this.createRepeater();
    repeater.position.set(4.0, 0.1, -0.8);
    this.scene.add(repeater);
    this.plants.push({ mesh: repeater, baseSpeed: 2.2, offset: 4.0 });
  }

  createPeashooter() {
    const group = new THREE.Group();
    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.9, 10),
      new THREE.MeshLambertMaterial({ color: 0x489f28 })
    );
    stem.position.y = 0.45;
    group.add(stem);

    // Leaves at base
    const leafGeo = new THREE.SphereGeometry(0.24, 8, 8);
    leafGeo.scale(1.4, 0.3, 0.8);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3d7b21 });
    const leaf1 = new THREE.Mesh(leafGeo, leafMat);
    leaf1.position.set(0.22, 0.1, 0);
    group.add(leaf1);
    const leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.position.set(-0.22, 0.1, 0);
    group.add(leaf2);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshLambertMaterial({ color: 0x5ccb32 })
    );
    head.position.set(0.1, 0.95, 0);
    head.castShadow = true;
    group.add(head);

    // Snout / nozzle
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.42, 12),
      new THREE.MeshLambertMaterial({ color: 0x489f28 })
    );
    nozzle.rotation.z = -Math.PI / 2;
    nozzle.position.set(0.45, 0.95, 0);
    group.add(nozzle);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.28, 1.05, 0.24);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.28, 1.05, -0.24);
    group.add(eyeR);

    return group;
  }

  createSunflower() {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.9, 10),
      new THREE.MeshLambertMaterial({ color: 0x489f28 })
    );
    stem.position.y = 0.45;
    group.add(stem);

    // Dark core
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16),
      new THREE.MeshLambertMaterial({ color: 0x6e3b12 })
    );
    core.rotation.x = Math.PI / 4;
    core.position.set(0, 0.95, 0.08);
    core.castShadow = true;
    group.add(core);

    // Golden petals ring
    const petalGeo = new THREE.RingGeometry(0.32, 0.65, 16);
    const petalMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
    const petals = new THREE.Mesh(petalGeo, petalMat);
    petals.rotation.x = Math.PI / 4;
    petals.position.set(0, 0.95, 0.07);
    group.add(petals);

    // Ambient golden light emitting from flower
    const flowerGlow = new THREE.PointLight(0xffd700, 0.8, 4);
    flowerGlow.position.set(0, 1.0, 0.5);
    group.add(flowerGlow);

    return group;
  }

  createWallnut() {
    const group = new THREE.Group();
    const nut = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 16),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    nut.scale.set(0.85, 1.35, 0.85);
    nut.position.y = 0.72;
    nut.castShadow = true;
    group.add(nut);

    // Nut eyes
    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a0f08 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.32, 0.9, 0.22);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.32, 0.9, -0.22);
    group.add(eyeR);

    return group;
  }

  createSnowPea() {
    const group = this.createPeashooter();
    // Tint frost cyan
    group.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        if (child.material.color.getHex() === 0x5ccb32) {
          child.material = new THREE.MeshLambertMaterial({ color: 0x66c8ff });
        } else if (child.material.color.getHex() === 0x489f28) {
          child.material = new THREE.MeshLambertMaterial({ color: 0x2a759e });
        }
      }
    });
    return group;
  }

  createRepeater() {
    const group = this.createPeashooter();
    // Add leaf crest to head
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.35, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x3d7b21 })
    );
    crest.rotation.x = Math.PI / 4;
    crest.position.set(-0.25, 1.25, 0);
    group.add(crest);
    return group;
  }

  startLoop() {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);

      const time = this.clock.getElapsedTime();

      // Subtle slow cinematic camera drift
      this.camera.position.x = Math.sin(time * 0.15) * 0.8;
      this.camera.position.y = 4.2 + Math.cos(time * 0.12) * 0.2;
      this.camera.lookAt(0, 1.2, 0);

      // Living plant idle breathing animations
      for (const p of this.plants) {
        const sway = Math.sin(time * p.baseSpeed + p.offset) * 0.08;
        p.mesh.rotation.y = sway;
        p.mesh.rotation.z = Math.cos(time * p.baseSpeed * 0.5 + p.offset) * 0.03;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  resize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.renderer && this.renderer.domElement) {
      this.container.innerHTML = '';
      this.renderer.dispose();
    }
  }
}
