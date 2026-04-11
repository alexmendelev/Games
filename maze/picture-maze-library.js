import { maze as classicMaze } from "./maze.js";
import loopedTwoExits from "./picture-mazes/looped-two-exits.js";
import mz from "./picture-mazes/mz.js";
import mz2 from "./picture-mazes/mz2.js";

const mazeConfigs = [
  loopedTwoExits,
  mz,
  mz2,
  {
    id: "classic",
    title: "Classic",
    description: "Compact maze from the original project files.",
    maze: classicMaze
  }
];

const mazeConfigById = new Map(mazeConfigs.map((config) => [config.id, config]));

function getMazeConfig(mazeId) {
  return mazeConfigById.get(mazeId) ?? mazeConfigs[0];
}

export { mazeConfigs, getMazeConfig };
