import * as THREE from 'three';

export class Garden3DEngine {
  constructor(canvasContainer, onTileClick) {
    this.container = canvasContainer;
    this.onTileClick = onTileClick;
    this.hoveredTile = null;

    // Unit and projectile pools
    this.plantMeshes = new Map(); // id -> THREE.Group
    this.invaderMeshes = new Map(); // id -> THREE.Group
    this.projectileMeshes = [];
    this.particleSystems = [];
    this.lawnmowerMeshes = [];

    this.initScene();
    this.buildGardenGrid();
    this.setupLighting();
    this.setupRaycaster();
    this.startLoop();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1b0c);
    this.scene.fog = new THREE.FogExp2(0x0e1b0c, 0.025);

    const width = this.container.clientWidth || 920;
    const height = this.container.clientHeight || 560;

    // Isometric elevated perspective camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 16.5, 14.5);
    this.camera.lookAt(0, -0.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
  }

  setupLighting() {
    // Ambient fill
    const ambient = new THREE.AmbientLight(0xfff6d6, 0.65);
    this.scene.add(ambient);

    // Warm Sun Directional Light with soft shadows
    const sunLight = new THREE.DirectionalLight(0xfffae0, 1.2);
    sunLight.position.set(12, 22, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 12;
    sunLight.shadow.camera.bottom = -12;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Soft ground rim light
    const rimLight = new THREE.DirectionalLight(0x73a842, 0.4);
    rimLight.position.set(-15, 8, -10);
    this.scene.add(rimLight);
  }

  buildGardenGrid() {
    this.tiles = [];
    this.tileGroup = new THREE.Group();
    this.scene.add(this.tileGroup);

    // 5 Rows x 9 Columns
    // Lawn dimensions in 3D world: X spans -8 to +8, Z spans -4 to +4
    const tileW = 1.7;
    const tileH = 1.5;
    const startX = -6.8;
    const startZ = -3.0;

    const tileGeo = new THREE.BoxGeometry(tileW * 0.94, 0.25, tileH * 0.92);

    const grassMatA = new THREE.MeshLambertMaterial({ color: 0x478b27 });
    const grassMatB = new THREE.MeshLambertMaterial({ color: 0x3d7b21 });

    for (let r = 0; r < 5; ++r) {
      this.tiles[r] = [];
      for (let c = 0; c < 9; ++c) {
        const mat = (r + c) % 2 === 0 ? grassMatA : grassMatB;
        const tileMesh = new THREE.Mesh(tileGeo, mat);
        tileMesh.position.set(startX + c * tileW, 0, startZ + r * tileH);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { row: r, col: c };

        this.tileGroup.add(tileMesh);
        this.tiles[r][c] = tileMesh;
      }
    }

    // Hover Highlight Mesh
    const highlightGeo = new THREE.PlaneGeometry(tileW * 0.94, tileH * 0.92);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xfff066,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    this.highlightMesh.rotation.x = -Math.PI / 2;
    this.highlightMesh.position.y = 0.14;
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    // Patio / House Boundary on Left
    const houseGeo = new THREE.BoxGeometry(1.6, 0.4, 8.5);
    const houseMat = new THREE.MeshLambertMaterial({ color: 0x5a3c22 });
    const houseMesh = new THREE.Mesh(houseGeo, houseMat);
    houseMesh.position.set(startX - 1.6, 0.1, 0);
    houseMesh.receiveShadow = true;
    this.scene.add(houseMesh);

    // 5 Lawnmower Carts on Row edge
    for (let r = 0; r < 5; ++r) {
      const mowerGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.35, 0.65),
        new THREE.MeshLambertMaterial({ color: 0xc82b1d })
      );
      body.castShadow = true;
      mowerGroup.add(body);

      // Blades / Engine cylinder
      const eng = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12),
        new THREE.MeshLambertMaterial({ color: 0x222222 })
      );
      eng.rotation.z = Math.PI / 2;
      eng.position.y = 0.25;
      mowerGroup.add(eng);

      mowerGroup.position.set(startX - 0.9, 0.25, startZ + r * tileH);
      this.scene.add(mowerGroup);
      this.lawnmowerMeshes[r] = mowerGroup;
    }

    // Dirt Trench / Zombie Portal on Right
    const spawnTrench = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.2, 8.5),
      new THREE.MeshLambertMaterial({ color: 0x2b1e15 })
    );
    spawnTrench.position.set(startX + 9 * tileW + 0.2, 0.05, 0);
    this.scene.add(spawnTrench);
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const onPointerMove = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.tileGroup.children);

      if (intersects.length > 0) {
        const tile = intersects[0].object;
        this.hoveredTile = tile.userData;
        this.highlightMesh.position.x = tile.position.x;
        this.highlightMesh.position.z = tile.position.z;
        this.highlightMesh.visible = true;
      } else {
        this.hoveredTile = null;
        this.highlightMesh.visible = false;
      }
    };

    const onClick = () => {
      if (this.hoveredTile && this.onTileClick) {
        this.onTileClick(this.hoveredTile.row, this.hoveredTile.col);
      }
    };

    this.renderer.domElement.addEventListener('pointermove', onPointerMove);
    this.renderer.domElement.addEventListener('click', onClick);
  }

  // --- 3D PLANT CREATION ---

  createPlantMesh(type) {
    const group = new THREE.Group();

    if (type === 1) { // Peashooter
      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8),
        new THREE.MeshLambertMaterial({ color: 0x489f28 })
      );
      stem.position.y = 0.35;
      group.add(stem);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0x5ccb32 })
      );
      head.position.set(0.08, 0.75, 0);
      head.castShadow = true;
      group.add(head);

      // Spout nozzle
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.35, 10),
        new THREE.MeshLambertMaterial({ color: 0x489f28 })
      );
      nozzle.rotation.z = -Math.PI / 2;
      nozzle.position.set(0.35, 0.75, 0);
      group.add(nozzle);
    } else if (type === 2) { // Sunflower
      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.65, 8),
        new THREE.MeshLambertMaterial({ color: 0x489f28 })
      );
      stem.position.y = 0.32;
      group.add(stem);

      // Face center
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12),
        new THREE.MeshLambertMaterial({ color: 0x6e3b12 })
      );
      core.rotation.x = Math.PI / 4;
      core.position.set(0, 0.72, 0.05);
      group.add(core);

      // Golden petals
      const petalGeo = new THREE.RingGeometry(0.24, 0.44, 12);
      const petalMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
      const petals = new THREE.Mesh(petalGeo, petalMat);
      petals.rotation.x = Math.PI / 4;
      petals.position.set(0, 0.72, 0.04);
      group.add(petals);
    } else if (type === 3) { // Wall-nut
      const nut = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 14),
        new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
      );
      nut.scale.set(0.85, 1.25, 0.85);
      nut.position.y = 0.52;
      nut.castShadow = true;
      group.add(nut);
    } else if (type === 4) { // Cherry Bomb
      const cherry1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0xd61f1f })
      );
      cherry1.position.set(-0.2, 0.35, 0);
      group.add(cherry1);

      const cherry2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0xb51212 })
      );
      cherry2.position.set(0.2, 0.35, 0);
      group.add(cherry2);
    } else { // Snow Pea
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8),
        new THREE.MeshLambertMaterial({ color: 0x3d82a8 })
      );
      stem.position.y = 0.35;
      group.add(stem);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0x66c8ff })
      );
      head.position.set(0.08, 0.75, 0);
      group.add(head);
    }

    return group;
  }

  // --- 3D INVADER / ZOMBIE CREATION ---

  createInvaderMesh(type) {
    const group = new THREE.Group();

    // Body / Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.65, 0.28),
      new THREE.MeshLambertMaterial({ color: 0x55604e })
    );
    torso.position.y = 0.75;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.38, 0.34),
      new THREE.MeshLambertMaterial({ color: 0x6e8460 })
    );
    head.position.set(0, 1.2, 0.05);
    head.castShadow = true;
    group.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2f3c48 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.12, 0.25, 0);
    group.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.12, 0.25, 0);
    group.add(legR);

    // Armor Addons
    if (type === 2) { // Conehead (Orange traffic cone)
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.45, 10),
        new THREE.MeshLambertMaterial({ color: 0xf56b18 })
      );
      cone.position.set(0, 1.55, 0.05);
      group.add(cone);
    } else if (type === 3) { // Buckethead (Metallic iron bucket)
      const bucket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.22, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3 })
      );
      bucket.position.set(0, 1.48, 0.05);
      group.add(bucket);
    }

    return group;
  }

  // --- STATE SYNC & UPDATE ---

  updateState(gameState, placedPlants) {
    const tileW = 1.7;
    const tileH = 1.5;
    const startX = -6.8;
    const startZ = -3.0;

    // 1. Sync Plants
    const currentPlantIds = new Set();
    for (let r = 0; r < 5; ++r) {
      for (let c = 0; c < 9; ++c) {
        const p = placedPlants[r][c];
        if (p) {
          const key = `${r}_${c}`;
          currentPlantIds.add(key);
          if (!this.plantMeshes.has(key)) {
            const mesh = this.createPlantMesh(p.type);
            mesh.position.set(startX + c * tileW, 0.12, startZ + r * tileH);
            this.scene.add(mesh);
            this.plantMeshes.set(key, mesh);
          }
        }
      }
    }

    // Remove deleted plants
    for (const [key, mesh] of this.plantMeshes.entries()) {
      if (!currentPlantIds.has(key)) {
        this.scene.remove(mesh);
        this.plantMeshes.delete(key);
      }
    }

    // 2. Sync Invaders (Zombies)
    const currentInvaderIds = new Set();
    if (gameState.invaders) {
      for (const inv of gameState.invaders) {
        currentInvaderIds.add(inv.id);
        // Map 2D server X (850 to 0) to 3D World X (8.0 to -7.0)
        const targetWorldX = startX + ((inv.x - 40) / 82) * tileW;
        const targetWorldZ = startZ + inv.lane * tileH;

        let mesh = this.invaderMeshes.get(inv.id);
        if (!mesh) {
          mesh = this.createInvaderMesh(inv.type);
          mesh.position.set(targetWorldX, 0, targetWorldZ);
          this.scene.add(mesh);
          this.invaderMeshes.set(inv.id, mesh);
        } else {
          // Smooth interpolation
          mesh.position.x += (targetWorldX - mesh.position.x) * 0.25;
          mesh.position.z = targetWorldZ;

          // Walking wobble animation
          const t = this.clock.getElapsedTime() * 6;
          mesh.rotation.y = -Math.PI / 2;
          mesh.rotation.z = Math.sin(t) * 0.08;
        }
      }
    }

    // Remove dead invaders
    for (const [id, mesh] of this.invaderMeshes.entries()) {
      if (!currentInvaderIds.has(id)) {
        this.scene.remove(mesh);
        this.invaderMeshes.delete(id);
      }
    }

    // 3. Sync Projectiles (Peas)
    // Clear old projectile meshes and rebuild
    for (const pMesh of this.projectileMeshes) {
      this.scene.remove(pMesh);
    }
    this.projectileMeshes = [];

    if (gameState.projectiles) {
      const peaGeo = new THREE.SphereGeometry(0.14, 8, 8);
      const peaMatNormal = new THREE.MeshBasicMaterial({ color: 0x76ea24 });
      const peaMatIce = new THREE.MeshBasicMaterial({ color: 0x66ddff });

      for (const p of gameState.projectiles) {
        const pWorldX = startX + ((p.x - 40) / 82) * tileW;
        const pWorldZ = startZ + p.lane * tileH;

        const pMesh = new THREE.Mesh(peaGeo, p.ice ? peaMatIce : peaMatNormal);
        pMesh.position.set(pWorldX, 0.72, pWorldZ);
        this.scene.add(pMesh);
        this.projectileMeshes.push(pMesh);
      }
    }
  }

  startLoop() {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);

      // Idle plant breathing oscillation
      const time = this.clock.getElapsedTime();
      for (const mesh of this.plantMeshes.values()) {
        mesh.rotation.y = Math.sin(time * 2.5 + mesh.position.x) * 0.06;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  resize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
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
