export const maze = {
  nodes: {
    N0: { x: -1, y: -3, N: null, E: "N1", S: null, W: null },
    N1: { x: 0, y: -3, N: null, E: "N2", S: "N5", W: "N0" },
    N2: { x: 1, y: -3, N: null, E: null, S: "N6", W: "N1" },
    N3: { x: -2, y: -2, N: null, E: "N4", S: "N8", W: null },
    N4: { x: -1, y: -2, N: null, E: null, S: null, W: "N3" },
    N5: { x: 0, y: -2, N: "N1", E: null, S: null, W: null },
    N6: { x: 1, y: -2, N: "N2", E: null, S: "N9", W: null },
    N7: { x: 0, y: -1, N: null, E: "N9", S: null, W: "N8" },
    N8: { x: -1, y: -1, N: "N3", E: "N7", S: "N11", W: null },
    N9: { x: 1, y: -1, N: "N6", E: null, S: null, W: "N7" },
    N10: { x: 2, y: -1, N: null, E: null, S: null, W: null },
    N11: { x: -1, y: 0, N: "N8", E: null, S: "N12", W: null },
    N12: { x: -1, y: 1, N: "N11", E: "N13", S: "N15", W: null },
    N13: { x: 0, y: 1, N: null, E: "N14", S: null, W: "N12" },
    N14: { x: 1, y: 1, N: null, E: null, S: null, W: "N13" },
    N15: { x: -1, y: 2, N: "N12", E: "N16", S: null, W: null },
    N16: { x: 0, y: 2, N: null, E: "N17", S: null, W: "N15" },
    N17: { x: 1, y: 2, N: null, E: null, S: null, W: "N16" }
  },
  exits: ["N0", "N17"]
};
