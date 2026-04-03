import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { maze } from "./maze.js";

const CELL_SIZE = 4;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.25;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.25;
const MOVE_SPEED = 3.3;
const TURN_SPEED = Math.PI * 0.9;
const EXIT_RADIUS = CELL_SIZE * 0.3;
const FOG_NEAR = 12;
const FOG_FAR = 42;

const DIRECTION_META = {
  N: { opposite: "S", dx: 0, dy: -1, yaw: 0 },
  E: { opposite: "W", dx: 1, dy: 0, yaw: -Math.PI / 2 },
  S: { opposite: "N", dx: 0, dy: 1, yaw: Math.PI },
  W: { opposite: "E", dx: -1, dy: 0, yaw: Math.PI / 2 }
};

const app = document.querySelector("#app");
const minimapCanvas = document.querySelector("#minimap");
const minimapContext = minimapCanvas.getContext("2d");
const nodeReadout = document.querySelector("#node-readout");
const overlay = document.querySelector("#escape-overlay");
const restartButton = document.querySelector("#restart-button");

const clock = new THREE.Clock();
const keyState = new Map();
const wallColliders = [];
const floorCenters = new Map();
const minimapWalls = [];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x93bdd8);
scene.fog = new THREE.Fog(0x93bdd8, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.classList.add("webgl");
app.prepend(renderer.domElement);

const player = createPlayer(maze);
const mazeMetrics = computeMazeMetrics(maze);

validateMaze(maze);
buildEnvironment(scene, mazeMetrics);
buildMazeMeshes(maze, scene, wallColliders, minimapWalls);
updateCurrentNode();
updateCameraFromPlayer();
drawMinimap(maze, player, minimapContext, mazeMetrics, minimapWalls);

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", handleResize);
restartButton.addEventListener("click", restartGame);

animate();

function validateMaze(mazeData) {
  const coordinateIndex = new Map();

  Object.entries(mazeData.nodes).forEach(([id, node]) => {
    const coordinateKey = `${node.x},${node.y}`;
    if (coordinateIndex.has(coordinateKey)) {
      console.warn(`Maze validation: ${id} shares coordinates with ${coordinateIndex.get(coordinateKey)} at (${node.x}, ${node.y}).`);
    } else {
      coordinateIndex.set(coordinateKey, id);
    }

    Object.entries(DIRECTION_META).forEach(([dir, meta]) => {
      const neighborId = node[dir];
      if (!neighborId) {
        return;
      }

      const neighbor = mazeData.nodes[neighborId];
      if (!neighbor) {
        console.warn(`Maze validation: ${id}.${dir} points to missing node "${neighborId}".`);
        return;
      }

      if (neighbor[meta.opposite] !== id) {
        console.warn(
          `Maze validation: ${id}.${dir} = ${neighborId} but ${neighborId}.${meta.opposite} = ${neighbor[meta.opposite]}.`
        );
      }

      if (neighbor.x !== node.x + meta.dx || neighbor.y !== node.y + meta.dy) {
        console.warn(
          `Maze validation: ${id}.${dir} expected coordinates (${node.x + meta.dx}, ${node.y + meta.dy}) but found (${neighbor.x}, ${neighbor.y}).`
        );
      }
    });
  });

  mazeData.exits.forEach((exitId) => {
    if (!mazeData.nodes[exitId]) {
      console.warn(`Maze validation: exit "${exitId}" does not exist in maze.nodes.`);
    }
  });
}

function computeMazeMetrics(mazeData) {
  const nodes = Object.values(mazeData.nodes);
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1
  };
}

function buildEnvironment(sceneRef, metrics) {
  const ambientLight = new THREE.AmbientLight(0xd8eed2, 1.3);
  sceneRef.add(ambientLight);

  const sun = new THREE.DirectionalLight(0xfff0cc, 1.6);
  sun.position.set(18, 24, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sceneRef.add(sun);

  const groundTexture = createGroundTexture();
  groundTexture.repeat.set(10, 10);

  const groundWidth = (metrics.width + 6) * CELL_SIZE;
  const groundDepth = (metrics.height + 6) * CELL_SIZE;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundWidth, groundDepth, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x6a8750,
      map: groundTexture,
      roughness: 0.98,
      metalness: 0.02
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  sceneRef.add(ground);

  const dirtPatch = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(groundWidth, groundDepth) * 0.13, 56),
    new THREE.MeshStandardMaterial({
      color: 0x7c674f,
      roughness: 1,
      metalness: 0
    })
  );
  dirtPatch.rotation.x = -Math.PI / 2;
  dirtPatch.position.set(0, 0.01, 0);
  sceneRef.add(dirtPatch);
}

function buildMazeMeshes(mazeData, sceneRef, colliders, mapWalls) {
  const mazeGroup = new THREE.Group();
  const floorTexture = createGroundTexture();
  floorTexture.repeat.set(1.2, 1.2);

  const hedgeTexture = createHedgeTexture();
  hedgeTexture.repeat.set(1, 1.6);

  const floorGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.96, 0.06, CELL_SIZE * 0.96);
  const horizontalWallGeometry = new THREE.BoxGeometry(CELL_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS);
  const verticalWallGeometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE + WALL_THICKNESS);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x86a85a,
    map: floorTexture,
    roughness: 0.96,
    metalness: 0.01
  });
  const exitMaterial = new THREE.MeshStandardMaterial({
    color: 0xc5ab5d,
    emissive: 0x5e4718,
    map: floorTexture,
    roughness: 0.9,
    metalness: 0.02
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f7338,
    map: hedgeTexture,
    roughness: 0.95,
    metalness: 0.01
  });

  const seenWalls = new Set();

  Object.entries(mazeData.nodes).forEach(([nodeId, node]) => {
    const center = nodeToWorld(node);
    floorCenters.set(nodeId, center.clone());

    const isExit = mazeData.exits.includes(nodeId);
    const tile = buildFloorTile(center, isExit ? exitMaterial : floorMaterial, floorGeometry);
    mazeGroup.add(tile);

    if (isExit) {
      mazeGroup.add(buildExitMarker(center));
    }

    ["N", "E", "S", "W"].forEach((direction) => {
      if (node[direction]) {
        return;
      }

      const wallSpec = createWallSpec(node, direction);
      if (seenWalls.has(wallSpec.key)) {
        return;
      }

      seenWalls.add(wallSpec.key);
      const segment = buildWallSegment(
        wallSpec,
        wallSpec.orientation === "horizontal" ? horizontalWallGeometry : verticalWallGeometry,
        wallMaterial
      );
      mazeGroup.add(segment.mesh);
      colliders.push(segment.collider);
      mapWalls.push(wallSpec.mapLine);
    });
  });

  sceneRef.add(mazeGroup);
}

function buildFloorTile(center, material, geometry) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center.x, 0.03, center.z);
  mesh.receiveShadow = true;
  return mesh;
}

function buildExitMarker(center) {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 0.35, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffd987,
      emissive: 0x6b5320,
      roughness: 0.55,
      metalness: 0.08
    })
  );
  marker.position.set(center.x, 0.22, center.z);
  marker.castShadow = true;
  return marker;
}

function createWallSpec(node, direction) {
  if (direction === "N") {
    return {
      key: `H:${node.x}:${node.y - 0.5}`,
      orientation: "horizontal",
      worldX: node.x * CELL_SIZE,
      worldZ: (node.y - 0.5) * CELL_SIZE,
      mapLine: { x1: node.x - 0.5, y1: node.y - 0.5, x2: node.x + 0.5, y2: node.y - 0.5 }
    };
  }

  if (direction === "S") {
    return {
      key: `H:${node.x}:${node.y + 0.5}`,
      orientation: "horizontal",
      worldX: node.x * CELL_SIZE,
      worldZ: (node.y + 0.5) * CELL_SIZE,
      mapLine: { x1: node.x - 0.5, y1: node.y + 0.5, x2: node.x + 0.5, y2: node.y + 0.5 }
    };
  }

  if (direction === "E") {
    return {
      key: `V:${node.x + 0.5}:${node.y}`,
      orientation: "vertical",
      worldX: (node.x + 0.5) * CELL_SIZE,
      worldZ: node.y * CELL_SIZE,
      mapLine: { x1: node.x + 0.5, y1: node.y - 0.5, x2: node.x + 0.5, y2: node.y + 0.5 }
    };
  }

  return {
    key: `V:${node.x - 0.5}:${node.y}`,
    orientation: "vertical",
    worldX: (node.x - 0.5) * CELL_SIZE,
    worldZ: node.y * CELL_SIZE,
    mapLine: { x1: node.x - 0.5, y1: node.y - 0.5, x2: node.x - 0.5, y2: node.y + 0.5 }
  };
}

function buildWallSegment(wallSpec, geometry, baseMaterial) {
  const mesh = new THREE.Mesh(geometry, baseMaterial.clone());
  mesh.material.color.multiplyScalar(0.92 + Math.random() * 0.16);
  mesh.position.set(wallSpec.worldX, WALL_HEIGHT / 2, wallSpec.worldZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const dimensions =
    wallSpec.orientation === "horizontal"
      ? { width: CELL_SIZE + WALL_THICKNESS, depth: WALL_THICKNESS }
      : { width: WALL_THICKNESS, depth: CELL_SIZE + WALL_THICKNESS };

  const collider = {
    minX: mesh.position.x - dimensions.width / 2,
    maxX: mesh.position.x + dimensions.width / 2,
    minZ: mesh.position.z - dimensions.depth / 2,
    maxZ: mesh.position.z + dimensions.depth / 2
  };

  return { mesh, collider };
}

function createGroundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  context.fillStyle = "#69864d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1300; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 1 + Math.random() * 3;
    const tone = i % 5 === 0 ? "rgba(109, 84, 55, 0.35)" : "rgba(157, 189, 101, 0.32)";
    context.fillStyle = tone;
    context.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createHedgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  context.fillStyle = "#3f612d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 1 + Math.random() * 3.8;
    const green = 78 + Math.floor(Math.random() * 70);
    context.fillStyle = `rgba(${28 + Math.floor(Math.random() * 30)}, ${green}, ${23 + Math.floor(Math.random() * 25)}, 0.34)`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createPlayer(mazeData) {
  const startId = pickStartNode(mazeData);
  const startCenter = nodeToWorld(mazeData.nodes[startId]);

  return {
    position: new THREE.Vector3(startCenter.x, PLAYER_HEIGHT, startCenter.z),
    yaw: chooseInitialYaw(mazeData.nodes[startId]),
    radius: PLAYER_RADIUS,
    currentNodeId: startId,
    escaped: false
  };
}

function pickStartNode(mazeData) {
  const candidates = Object.entries(mazeData.nodes)
    .filter(([id]) => !mazeData.exits.includes(id))
    .map(([id, node]) => ({ id, degree: countOpenSides(node) }))
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id));

  return candidates[0]?.id ?? Object.keys(mazeData.nodes)[0];
}

function chooseInitialYaw(node) {
  for (const direction of ["S", "E", "N", "W"]) {
    if (node[direction]) {
      return DIRECTION_META[direction].yaw;
    }
  }
  return 0;
}

function countOpenSides(node) {
  return ["N", "E", "S", "W"].filter((dir) => Boolean(node[dir])).length;
}

function nodeToWorld(node) {
  return new THREE.Vector3(node.x * CELL_SIZE, 0, node.y * CELL_SIZE);
}

function handleKeyDown(event) {
  keyState.set(event.code, true);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (player.escaped && event.code === "KeyR") {
    restartGame();
  }
}

function handleKeyUp(event) {
  keyState.set(event.code, false);
}

function updatePlayer(dt) {
  if (player.escaped) {
    return;
  }

  const turnDirection = (isPressed("ArrowLeft") || isPressed("KeyA") ? 1 : 0) - (isPressed("ArrowRight") || isPressed("KeyD") ? 1 : 0);
  player.yaw += turnDirection * TURN_SPEED * dt;

  const moveDirection = (isPressed("ArrowUp") || isPressed("KeyW") ? 1 : 0) - (isPressed("ArrowDown") || isPressed("KeyS") ? 1 : 0);
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const delta = forward.multiplyScalar(moveDirection * MOVE_SPEED * dt);

  // Resolve movement one axis at a time so the player slides along walls instead of sticking on corners.
  attemptMove(delta.x, 0);
  attemptMove(0, delta.z);
  updateCurrentNode();
}

function attemptMove(dx, dz) {
  if (dx !== 0) {
    const nextX = player.position.x + dx;
    if (!collides(nextX, player.position.z, player.radius)) {
      player.position.x = nextX;
    }
  }

  if (dz !== 0) {
    const nextZ = player.position.z + dz;
    if (!collides(player.position.x, nextZ, player.radius)) {
      player.position.z = nextZ;
    }
  }
}

function collides(x, z, radius) {
  for (const wall of wallColliders) {
    if (
      x + radius > wall.minX &&
      x - radius < wall.maxX &&
      z + radius > wall.minZ &&
      z - radius < wall.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function updateCurrentNode() {
  let nearestId = player.currentNodeId;
  let nearestDistance = Number.POSITIVE_INFINITY;

  floorCenters.forEach((center, nodeId) => {
    const dx = player.position.x - center.x;
    const dz = player.position.z - center.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < nearestDistance) {
      nearestDistance = distanceSq;
      nearestId = nodeId;
    }
  });

  player.currentNodeId = nearestId;
}

function checkExitReached(mazeData) {
  if (player.escaped) {
    return;
  }

  for (const exitId of mazeData.exits) {
    const center = floorCenters.get(exitId);
    if (!center) {
      continue;
    }

    const dx = player.position.x - center.x;
    const dz = player.position.z - center.z;
    if (Math.hypot(dx, dz) <= EXIT_RADIUS) {
      player.escaped = true;
      overlay.classList.add("visible");
      overlay.setAttribute("aria-hidden", "false");
      return;
    }
  }
}

function updateCameraFromPlayer() {
  camera.position.copy(player.position);
  camera.rotation.set(0, player.yaw, 0, "YXZ");
  nodeReadout.textContent = player.currentNodeId ?? "Unknown";
}

function drawMinimap(mazeData, playerState, context, metrics, mapWalls) {
  const { canvas } = context;
  const layout = getMinimapLayout(canvas, metrics);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#122016";
  context.fillRect(0, 0, canvas.width, canvas.height);

  Object.entries(mazeData.nodes).forEach(([nodeId, node]) => {
    const topLeft = gridToMinimap(node.x - 0.5, node.y - 0.5, layout, metrics);
    context.fillStyle = nodeId === playerState.currentNodeId ? "#41643a" : "#2c442b";
    context.fillRect(topLeft.x, topLeft.y, layout.cellSize, layout.cellSize);
  });

  context.strokeStyle = "#dcead4";
  context.lineWidth = 3;
  context.lineCap = "round";
  mapWalls.forEach((wall) => {
    const start = gridToMinimap(wall.x1, wall.y1, layout, metrics);
    const end = gridToMinimap(wall.x2, wall.y2, layout, metrics);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  });

  mazeData.exits.forEach((exitId) => {
    const exitNode = mazeData.nodes[exitId];
    if (!exitNode) {
      return;
    }

    const point = gridToMinimap(exitNode.x, exitNode.y, layout, metrics);
    context.fillStyle = "#f1d16b";
    context.beginPath();
    context.arc(point.x, point.y, layout.cellSize * 0.17, 0, Math.PI * 2);
    context.fill();
  });

  const playerPoint = gridToMinimap(playerState.position.x / CELL_SIZE, playerState.position.z / CELL_SIZE, layout, metrics);
  context.save();
  context.translate(playerPoint.x, playerPoint.y);
  context.rotate(-playerState.yaw);
  context.fillStyle = playerState.escaped ? "#ffd4b8" : "#ff9067";
  context.beginPath();
  context.moveTo(0, -layout.cellSize * 0.25);
  context.lineTo(layout.cellSize * 0.16, layout.cellSize * 0.19);
  context.lineTo(-layout.cellSize * 0.16, layout.cellSize * 0.19);
  context.closePath();
  context.fill();
  context.restore();
}

function getMinimapLayout(canvas, metrics) {
  const padding = 18;
  const cellSize = Math.min(
    (canvas.width - padding * 2) / metrics.width,
    (canvas.height - padding * 2) / metrics.height
  );

  return {
    cellSize,
    originX: (canvas.width - metrics.width * cellSize) / 2,
    originY: (canvas.height - metrics.height * cellSize) / 2
  };
}

function gridToMinimap(gridX, gridY, layout, metrics) {
  return {
    x: layout.originX + (gridX - metrics.minX + 0.5) * layout.cellSize,
    y: layout.originY + (gridY - metrics.minY + 0.5) * layout.cellSize
  };
}

function isPressed(code) {
  return keyState.get(code) === true;
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function restartGame() {
  const freshPlayer = createPlayer(maze);
  player.position.copy(freshPlayer.position);
  player.yaw = freshPlayer.yaw;
  player.currentNodeId = freshPlayer.currentNodeId;
  player.escaped = false;
  overlay.classList.remove("visible");
  overlay.setAttribute("aria-hidden", "true");
  updateCameraFromPlayer();
  drawMinimap(maze, player, minimapContext, mazeMetrics, minimapWalls);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  checkExitReached(maze);
  updateCameraFromPlayer();
  drawMinimap(maze, player, minimapContext, mazeMetrics, minimapWalls);
  renderer.render(scene, camera);
}
