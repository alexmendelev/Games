import { getMazeConfig, mazeConfigs } from "./picture-maze-library.js";

const mazeConfig = resolveMazeConfig();
const maze = mazeConfig.maze;

const IMAGE_SETS = {
  threewaydecision: [
    "assets/maze-picture/3waydecision1.png",
    "assets/maze-picture/3waydecision2.png"
  ],
  decision: [
    "assets/maze-picture/decision1.png",
    "assets/maze-picture/decision2.png",
    "assets/maze-picture/decision3.png",
    "assets/maze-picture/decision4.png",
    "assets/maze-picture/decision5.png",
    "assets/maze-picture/decision6.png",
    "assets/maze-picture/decision7.png",
    "assets/maze-picture/decision8.png"
  ],
  deadend: [
    "assets/maze-picture/deadend1.png",
    "assets/maze-picture/deadend2.png",
    "assets/maze-picture/deadend3.png"
  ],
  exit: [
    "assets/maze-picture/exit1.png",
    "assets/maze-picture/exit2.png",
    "assets/maze-picture/exit3.png"
  ]
};

const DIR_ORDER = ["N", "E", "S", "W"];
const LEFT_OF = { N: "W", W: "S", S: "E", E: "N" };
const RIGHT_OF = { N: "E", E: "S", S: "W", W: "N" };
const OPPOSITE = { N: "S", S: "N", E: "W", W: "E" };
const DIRECTION_LABELS = {
  N: "North",
  E: "East",
  S: "South",
  W: "West"
};

function resolveMazeConfig() {
  const search = globalThis.location?.search ?? "";
  const params = new URLSearchParams(search);
  return getMazeConfig(params.get("maze"));
}

const elements = {
  image: document.getElementById("scene-image"),
  mazeSelect: document.getElementById("maze-select"),
  mazeTitle: document.getElementById("maze-title"),
  mazeDescription: document.getElementById("maze-description"),
  statusPill: document.getElementById("status-pill"),
  messageTitle: document.getElementById("message-title"),
  messageBody: document.getElementById("message-body"),
  nodeType: document.getElementById("node-type"),
  nodeId: document.getElementById("node-id"),
  facingLabel: document.getElementById("facing-label"),
  forwardState: document.getElementById("forward-state"),
  stepCount: document.getElementById("step-count"),
  pathLog: document.getElementById("path-log"),
  compass: document.getElementById("compass"),
  mapCanvas: document.getElementById("maze-map"),
  restartButton: document.getElementById("restart-button"),
  hintButton: document.getElementById("hint-button"),
  leftHint: document.getElementById("left-hint"),
  rightHint: document.getElementById("right-hint")
};

const IMAGE_FADE_MS = 420;
const sceneImageState = {
  displayedSrc: "",
  displayedAlt: "",
  displayedSceneKey: "",
  transitionToken: 0
};

function degreeOf(nodeId) {
  const node = maze.nodes[nodeId];
  return DIR_ORDER.reduce((count, direction) => count + (node[direction] ? 1 : 0), 0);
}

function classifyNode(nodeId) {
  if (maze.exits.includes(nodeId)) {
    return "exit";
  }
  return degreeOf(nodeId) === 1 ? "deadend" : "decision";
}

function visibleChoiceCount(nodeId, facing) {
  if (!facing) {
    return degreeOf(nodeId);
  }

  const backDirection = OPPOSITE[facing];
  return DIR_ORDER.filter((direction) => maze.nodes[nodeId][direction] && direction !== backDirection).length;
}

function imageSetForNode(nodeId, facing) {
  const type = classifyNode(nodeId);
  if (type !== "decision") {
    return type;
  }

  return visibleChoiceCount(nodeId, facing) >= 3 ? "threewaydecision" : "decision";
}

function stableVariant(nodeId, setName, facing) {
  const variants = IMAGE_SETS[setName];
  const numericId = Number.parseInt(nodeId.replace(/\D/g, ""), 10) || 0;
  const facingIndex = Math.max(0, DIR_ORDER.indexOf(facing));
  return variants[(numericId + facingIndex * 5) % variants.length];
}

function sceneImageFor(nodeId, setName, facing) {
  const variants = IMAGE_SETS[setName];
  const sceneKey = `${nodeId}:${facing}:${setName}`;
  let src = stableVariant(nodeId, setName, facing);

  if (
    variants.length > 1 &&
    sceneImageState.displayedSceneKey &&
    sceneImageState.displayedSceneKey !== sceneKey &&
    src === sceneImageState.displayedSrc
  ) {
    const currentIndex = variants.indexOf(src);
    src = variants[(currentIndex + 1) % variants.length];
  }

  return { src, sceneKey };
}

function buildAdjacency() {
  const adjacency = {};
  for (const [nodeId, node] of Object.entries(maze.nodes)) {
    adjacency[nodeId] = DIR_ORDER.filter((direction) => node[direction]).map((direction) => node[direction]);
  }
  return adjacency;
}

const adjacency = buildAdjacency();
const coordinateToNodeId = new Map(
  Object.entries(maze.nodes).map(([nodeId, node]) => [`${node.x},${node.y}`, nodeId])
);

const mapBounds = (() => {
  const coords = Object.values(maze.nodes);
  return {
    minX: Math.min(...coords.map((node) => node.x)),
    maxX: Math.max(...coords.map((node) => node.x)),
    minY: Math.min(...coords.map((node) => node.y)),
    maxY: Math.max(...coords.map((node) => node.y))
  };
})();

function isCorridor(nodeId) {
  return !maze.exits.includes(nodeId) && degreeOf(nodeId) === 2;
}

function graphDistances(startId) {
  const distances = { [startId]: 0 };
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of adjacency[current]) {
      if (neighbor in distances) {
        continue;
      }
      distances[neighbor] = distances[current] + 1;
      queue.push(neighbor);
    }
  }

  return distances;
}

function pickStartNode() {
  const leaves = Object.keys(maze.nodes).filter((nodeId) => degreeOf(nodeId) === 1 && !maze.exits.includes(nodeId));
  const exitDistances = maze.exits.map((exitId) => graphDistances(exitId));

  return leaves
    .map((nodeId) => ({
      nodeId,
      distance: Math.min(...exitDistances.map((distances) => distances[nodeId] ?? Infinity))
    }))
    .sort((a, b) => b.distance - a.distance || a.nodeId.localeCompare(b.nodeId))[0].nodeId;
}

function inwardFacing(nodeId) {
  const node = maze.nodes[nodeId];
  return DIR_ORDER.find((direction) => node[direction]) ?? "N";
}

function outwardFacing(nodeId) {
  const openDirection = inwardFacing(nodeId);
  return OPPOSITE[openDirection];
}

function exitFacing(nodeId) {
  const node = maze.nodes[nodeId];
  for (const direction of DIR_ORDER) {
    if (node[direction]) {
      continue;
    }

    const delta = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[direction];
    const neighborId = coordinateToNodeId.get(`${node.x + delta[0]},${node.y + delta[1]}`);
    if (!neighborId) {
      return direction;
    }
  }

  return DIR_ORDER.find((direction) => !node[direction]) ?? outwardFacing(nodeId);
}

function decisionFacing(nodeId) {
  const node = maze.nodes[nodeId];
  return DIR_ORDER.find((direction) => !node[direction]) ?? "N";
}

function preferredFacingForNode(nodeId) {
  const type = classifyNode(nodeId);
  if (type === "exit") {
    return exitFacing(nodeId);
  }
  if (type === "deadend") {
    return outwardFacing(nodeId);
  }
  return decisionFacing(nodeId);
}

function nextFacing(currentFacing, turn) {
  if (turn === "left") {
    return LEFT_OF[currentFacing];
  }
  if (turn === "right") {
    return RIGHT_OF[currentFacing];
  }
  return OPPOSITE[currentFacing];
}

function localVector(direction, facing) {
  if (direction === facing) {
    return { x: 0, y: 1 };
  }
  if (direction === OPPOSITE[facing]) {
    return { x: 0, y: -1 };
  }
  if (direction === RIGHT_OF[facing]) {
    return { x: 1, y: 0 };
  }
  return { x: -1, y: 0 };
}

function directionalChoices(nodeId, facing) {
  const backDirection = OPPOSITE[facing];
  const node = maze.nodes[nodeId];
  const options = DIR_ORDER.filter((direction) => node[direction] && direction !== backDirection);

  return {
    left:
      options.find((direction) => localVector(direction, facing).x < 0) ?? null,
    forward:
      options.find((direction) => localVector(direction, facing).y > 0) ?? null,
    right:
      options.find((direction) => localVector(direction, facing).x > 0) ?? null
  };
}

function branchChoices(nodeId, facing) {
  const choices = directionalChoices(nodeId, facing);
  return {
    left: choices.left,
    right: choices.right
  };
}

function travel(direction, actionLabel) {
  const firstStep = maze.nodes[state.currentNode][direction];
  if (!firstStep) {
    state.message = "That way is blocked from here.";
    return;
  }

  const result = stopAtVisibleNode(state.currentNode, direction);
  state.currentNode = result.nodeId;
  state.facing = result.facing;
  state.steps += result.steps;
  state.history.push(
    makeHistoryEntry(
      state.currentNode,
      state.facing,
      `${actionLabel} (${result.steps} step${result.steps === 1 ? "" : "s"})`
    )
  );
  state.message = messageForNode(state.currentNode, state.facing);
}

function stopAtVisibleNode(startNodeId, direction) {
  let previousNodeId = startNodeId;
  let currentNodeId = maze.nodes[startNodeId][direction];
  let currentFacing = direction;
  let steps = 1;

  while (isCorridor(currentNodeId)) {
    const nextNodeId = adjacency[currentNodeId].find((neighborId) => neighborId !== previousNodeId);
    if (!nextNodeId) {
      break;
    }

    currentFacing = DIR_ORDER.find((candidate) => maze.nodes[currentNodeId][candidate] === nextNodeId);
    previousNodeId = currentNodeId;
    currentNodeId = nextNodeId;
    steps += 1;
  }

  return { nodeId: currentNodeId, facing: currentFacing, steps };
}

function makeHistoryEntry(nodeId, facing, action) {
  return {
    nodeId,
    facing,
    action,
    type: classifyNode(nodeId)
  };
}

function messageForNode(nodeId, facing) {
  const type = classifyNode(nodeId);

  if (type === "exit") {
    return "Exit found. Press Up to leave the maze, or Down to head back inside.";
  }

  if (type === "deadend") {
    return "Dead end. Press Down to go back the way you came.";
  }

  const choices = directionalChoices(nodeId, facing);
  if (choices.left && choices.forward && choices.right) {
    return "Decision point. Press Left, Up, or Right to choose a branch, or Down to go back.";
  }
  if (choices.left && choices.right) {
    return "Decision point. Press Left or Right to take a branch, or Down to go back.";
  }
  if (choices.forward && choices.left) {
    return "Decision point. Press Left or Up to continue, or Down to go back.";
  }
  if (choices.forward && choices.right) {
    return "Decision point. Press Up or Right to continue, or Down to go back.";
  }
  if (choices.forward) {
    return "Decision point. Press Up to go forward, or Down to go back.";
  }

  return "Choose a branch or press Down to go back.";
}

function nodeLabel(type) {
  if (type === "deadend") {
    return "Dead End";
  }
  if (type === "exit") {
    return "Exit";
  }
  return "Decision";
}

const initialState = {
  currentNode: pickStartNode(),
  facing: "N",
  steps: 0,
  escaped: false,
  message: "",
  history: []
};

initialState.facing = preferredFacingForNode(initialState.currentNode);
initialState.message = messageForNode(initialState.currentNode, initialState.facing);
initialState.history.push(makeHistoryEntry(initialState.currentNode, initialState.facing, "Started"));

const state = structuredClone(initialState);

function populateMazePicker() {
  if (!elements.mazeSelect) {
    return;
  }

  elements.mazeSelect.innerHTML = mazeConfigs
    .map((config) => `<option value="${config.id}">${config.title}</option>`)
    .join("");
  elements.mazeSelect.value = mazeConfig.id;
}

function updateMazeMeta() {
  if (elements.mazeTitle) {
    elements.mazeTitle.textContent = mazeConfig.title;
  }
  if (elements.mazeDescription) {
    elements.mazeDescription.textContent = mazeConfig.description;
  }
}

function handleMazeSelection(event) {
  const selectedId = event.target.value;
  if (!selectedId || selectedId === mazeConfig.id) {
    return;
  }

  const params = new URLSearchParams(globalThis.location?.search ?? "");
  params.set("maze", selectedId);
  const nextQuery = params.toString();
  const nextHref = `${globalThis.location?.pathname ?? ""}?${nextQuery}`;
  globalThis.location.href = nextHref;
}

function restartGame() {
  Object.assign(state, structuredClone(initialState));
  render();
}

function showHint() {
  const path = findPathToNearestExit(state.currentNode);
  if (!path || path.length < 2) {
    state.message = maze.exits.includes(state.currentNode)
      ? "You are at the exit. Press Up to leave the maze."
      : "No hint is available from here.";
    render();
    return;
  }

  const nextNodeId = path[1];
  const nextDirection = DIR_ORDER.find((direction) => maze.nodes[state.currentNode][direction] === nextNodeId);
  const turnText = hintTurnText(state.currentNode, state.facing, nextDirection);
  state.message = `Hint: ${turnText}`;
  render();
}

function hintTurnText(nodeId, currentFacing, nextDirection) {
  if (currentFacing === nextDirection) {
    return maze.exits.includes(nodeId) && !maze.nodes[nodeId][currentFacing]
      ? "press Up to exit"
      : "press Up";
  }

  if (OPPOSITE[currentFacing] === nextDirection) {
    return "press Down";
  }

  const choices = directionalChoices(nodeId, currentFacing);
  if (choices.left === nextDirection) {
    return "press Left";
  }
  if (choices.right === nextDirection) {
    return "press Right";
  }
  if (choices.forward === nextDirection) {
    return "press Up";
  }

  return "press Up";
}

function findPathToNearestExit(startId) {
  const queue = [startId];
  const visited = new Set([startId]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    if (maze.exits.includes(current)) {
      const path = [current];
      let cursor = current;
      while (parent.has(cursor)) {
        cursor = parent.get(cursor);
        path.push(cursor);
      }
      return path.reverse();
    }

    for (const neighbor of adjacency[current]) {
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      parent.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  return null;
}

function chooseLeft() {
  const direction = branchChoices(state.currentNode, state.facing).left;
  if (!direction) {
    state.message = "There is no left branch here.";
    render();
    return;
  }

  travel(direction, "Went left");
  render();
}

function chooseRight() {
  const direction = branchChoices(state.currentNode, state.facing).right;
  if (!direction) {
    state.message = "There is no right branch here.";
    render();
    return;
  }

  travel(direction, "Went right");
  render();
}

function chooseBack() {
  const backDirection = OPPOSITE[state.facing];
  if (maze.nodes[state.currentNode][backDirection]) {
    travel(backDirection, "Went back");
  } else {
    state.facing = backDirection;
    state.history.push(makeHistoryEntry(state.currentNode, state.facing, "Turned around"));
    state.message = messageForNode(state.currentNode, state.facing);
  }
  render();
}

function forwardFromExit() {
  state.escaped = true;
  state.history.push(makeHistoryEntry(state.currentNode, state.facing, "Escaped"));
  state.message = "You stepped out of the maze. Press Restart to play again.";
}

function handleForward() {
  if (state.escaped) {
    return;
  }

  if (maze.exits.includes(state.currentNode) && !maze.nodes[state.currentNode][state.facing]) {
    forwardFromExit();
    render();
    return;
  }

  const forwardDirection = directionalChoices(state.currentNode, state.facing).forward;
  if (forwardDirection) {
    travel(forwardDirection, "Went forward");
    render();
    return;
  }

  state.message = "There is no straight path from here.";
  render();
}

function updateCompass(facing) {
  for (const cell of elements.compass.querySelectorAll(".compass-cell")) {
    cell.classList.toggle("active", cell.dataset.dir === facing);
  }
}

function visitedNodeIds() {
  return new Set(state.history.map((entry) => entry.nodeId));
}

function mapPointForNode(node) {
  const canvas = elements.mapCanvas;
  const padding = 24;
  const width = canvas.width;
  const height = canvas.height;
  const spanX = Math.max(1, mapBounds.maxX - mapBounds.minX);
  const spanY = Math.max(1, mapBounds.maxY - mapBounds.minY);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const scale = Math.min(usableWidth / spanX, usableHeight / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  return {
    x: offsetX + (node.x - mapBounds.minX) * scale,
    y: offsetY + (node.y - mapBounds.minY) * scale
  };
}

function facingVector(direction, length) {
  if (direction === "N") {
    return { x: 0, y: -length };
  }
  if (direction === "S") {
    return { x: 0, y: length };
  }
  if (direction === "E") {
    return { x: length, y: 0 };
  }
  return { x: -length, y: 0 };
}

function drawMazeMap() {
  const canvas = elements.mapCanvas;
  const context = canvas.getContext("2d");
  const visited = visitedNodeIds();

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#181310";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(244, 239, 230, 0.22)";
  context.lineWidth = 3;
  context.lineCap = "round";

  const drawnEdges = new Set();
  for (const [nodeId, node] of Object.entries(maze.nodes)) {
    const from = mapPointForNode(node);
    for (const direction of DIR_ORDER) {
      const neighborId = node[direction];
      if (!neighborId) {
        continue;
      }

      const edgeKey = [nodeId, neighborId].sort().join(":");
      if (drawnEdges.has(edgeKey)) {
        continue;
      }
      drawnEdges.add(edgeKey);

      const to = mapPointForNode(maze.nodes[neighborId]);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  }

  for (const [nodeId, node] of Object.entries(maze.nodes)) {
    const point = mapPointForNode(node);
    const type = classifyNode(nodeId);
    let radius = 4.5;
    let fill = "rgba(197, 185, 168, 0.8)";

    if (visited.has(nodeId)) {
      fill = "#d08dff";
    }
    if (type === "exit") {
      fill = "#8fd18a";
      radius = 6;
    }

    context.beginPath();
    context.fillStyle = fill;
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const currentPoint = mapPointForNode(maze.nodes[state.currentNode]);
  context.beginPath();
  context.fillStyle = "#f0be6d";
  context.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
  context.fill();

  const arrow = facingVector(state.facing, 18);
  context.beginPath();
  context.strokeStyle = "#f0be6d";
  context.lineWidth = 3.5;
  context.moveTo(currentPoint.x, currentPoint.y);
  context.lineTo(currentPoint.x + arrow.x, currentPoint.y + arrow.y);
  context.stroke();

  const headBaseX = currentPoint.x + arrow.x;
  const headBaseY = currentPoint.y + arrow.y;
  const leftWing = facingVector(LEFT_OF[state.facing], 6);
  const rightWing = facingVector(RIGHT_OF[state.facing], 6);

  context.beginPath();
  context.fillStyle = "#f0be6d";
  context.moveTo(headBaseX, headBaseY);
  context.lineTo(headBaseX - arrow.x * 0.25 + leftWing.x, headBaseY - arrow.y * 0.25 + leftWing.y);
  context.lineTo(headBaseX - arrow.x * 0.25 + rightWing.x, headBaseY - arrow.y * 0.25 + rightWing.y);
  context.closePath();
  context.fill();
}

function updateSceneImage(src, alt, sceneKey) {
  const image = elements.image;

  if (!sceneImageState.displayedSrc) {
    image.src = src;
    image.alt = alt;
    sceneImageState.displayedSrc = src;
    sceneImageState.displayedAlt = alt;
    sceneImageState.displayedSceneKey = sceneKey;
    image.classList.remove("is-fading");
    return;
  }

  if (sceneImageState.displayedSrc === src) {
    image.alt = alt;
    sceneImageState.displayedAlt = alt;
    sceneImageState.displayedSceneKey = sceneKey;
    return;
  }

  const token = ++sceneImageState.transitionToken;
  image.classList.add("is-fading");

  setTimeout(() => {
    if (token !== sceneImageState.transitionToken) {
      return;
    }

    image.src = src;
    image.alt = alt;
    sceneImageState.displayedSrc = src;
    sceneImageState.displayedAlt = alt;
    sceneImageState.displayedSceneKey = sceneKey;

    requestAnimationFrame(() => {
      if (token !== sceneImageState.transitionToken) {
        return;
      }
      image.classList.remove("is-fading");
    });
  }, IMAGE_FADE_MS);
}

function renderHistory() {
  const recentEntries = state.history.slice(-10).reverse();
  elements.pathLog.innerHTML = recentEntries
    .map((entry) => {
      const label = nodeLabel(entry.type);
      return `<div class="path-entry"><strong>${entry.action}</strong><br>${entry.nodeId} • ${label} • facing ${DIRECTION_LABELS[entry.facing]}</div>`;
    })
    .join("");
}

function render() {
  const nodeType = classifyNode(state.currentNode);
  const imageSet = imageSetForNode(state.currentNode, state.facing);
  const sceneImage = sceneImageFor(state.currentNode, imageSet, state.facing);
  const forwardNeighbor = maze.nodes[state.currentNode][state.facing];
  const choices = directionalChoices(state.currentNode, state.facing);
  const forwardState = state.escaped
    ? "Escaped"
    : maze.exits.includes(state.currentNode) && !forwardNeighbor
      ? "Press Up to exit"
      : choices.forward
        ? "Go forward"
        : "Blocked";

  updateSceneImage(sceneImage.src, `${nodeLabel(nodeType)} scene for ${state.currentNode}`, sceneImage.sceneKey);
  elements.statusPill.textContent = state.escaped ? "Escaped" : nodeLabel(nodeType);
  elements.messageTitle.textContent = state.escaped ? "Maze Complete" : `${nodeLabel(nodeType)} • ${state.currentNode}`;
  elements.messageBody.textContent = state.message;
  elements.nodeType.textContent = nodeLabel(nodeType);
  elements.nodeType.className = `node-type ${nodeType}`;
  elements.nodeId.textContent = state.currentNode;
  elements.facingLabel.textContent = DIRECTION_LABELS[state.facing];
  elements.forwardState.textContent = forwardState;
  elements.stepCount.textContent = String(state.steps);

  const leftOpen = Boolean(choices.left);
  const rightOpen = Boolean(choices.right);
  elements.leftHint.style.opacity = leftOpen && !state.escaped ? "1" : "0.3";
  elements.rightHint.style.opacity = rightOpen && !state.escaped ? "1" : "0.3";

  updateCompass(state.facing);
  drawMazeMap();
  renderHistory();
}

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    chooseLeft();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    chooseRight();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    chooseBack();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    handleForward();
  }
});

populateMazePicker();
updateMazeMeta();

if (elements.mazeSelect) {
  elements.mazeSelect.addEventListener("change", handleMazeSelection);
}
elements.restartButton.addEventListener("click", restartGame);
elements.hintButton.addEventListener("click", showHint);

render();
