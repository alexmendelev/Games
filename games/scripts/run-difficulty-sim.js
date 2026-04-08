const path = require("path");

const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));

function parseArgs(argv) {
  const args = {
    levels: 24,
    seed: 7,
    minDifficulty: "easy",
    maxDifficulty: "super",
    difficultyOrder: ["easy", "medium", "hard", "super"],
    outputJson: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const nextToken = argv[index + 1];

    if (token === "--profile" && nextToken) {
      args.profile = nextToken;
      index += 1;
      continue;
    }
    if (token === "--levels" && nextToken) {
      args.levels = Number(nextToken);
      index += 1;
      continue;
    }
    if (token === "--seed" && nextToken) {
      args.seed = Number(nextToken);
      index += 1;
      continue;
    }
    if (token === "--min" && nextToken) {
      args.minDifficulty = nextToken;
      index += 1;
      continue;
    }
    if (token === "--max" && nextToken) {
      args.maxDifficulty = nextToken;
      index += 1;
      continue;
    }
    if (token === "--initial" && nextToken) {
      args.initialDifficulty = nextToken;
      index += 1;
      continue;
    }
    if (token === "--json") {
      args.outputJson = true;
    }
  }

  return args;
}

function printSummary(simulation) {
  const finalState = simulation.finalState || {};
  console.log(`Profile: ${simulation.profileName}`);
  console.log(`Seed: ${simulation.seed}`);
  console.log(`Levels: ${simulation.levels}`);
  console.log(`Bounds: ${simulation.bounds.minDifficulty} -> ${simulation.bounds.maxDifficulty}`);
  console.log(
    `Counts: comfortable=${simulation.classificationCounts.comfortable}, balanced=${simulation.classificationCounts.balanced}, struggling=${simulation.classificationCounts.struggling}`
  );
  console.log(
    `Final state: current=${finalState.currentDifficulty}, comfortableStreak=${finalState.comfortableStreak}, strugglingStreak=${finalState.strugglingStreak}, pendingRecovery=${finalState.pendingRecoveryLevel || "-"}`
  );
  console.log("Level trace:");
  simulation.entries.forEach((entry) => {
    console.log(
      `  L${String(entry.levelNumber).padStart(2, "0")} played=${entry.playedDifficulty} class=${entry.classification} next=${entry.nextDifficulty}`
    );
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const profiles = args.profile ? [args.profile] : ["strong", "average", "struggling"];
  const simulations = profiles.map((profileName, index) => difficultyApi.runSimulation({
    profileName,
    levels: args.levels,
    seed: args.seed + index,
    minDifficulty: args.minDifficulty,
    maxDifficulty: args.maxDifficulty,
    initialDifficulty: args.initialDifficulty || args.minDifficulty,
    difficultyOrder: args.difficultyOrder
  }));

  if (args.outputJson) {
    console.log(JSON.stringify(simulations, null, 2));
    return;
  }

  simulations.forEach((simulation, index) => {
    if (index > 0) {
      console.log("");
    }
    printSummary(simulation);
  });
}

main();
