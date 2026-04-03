import random
import json
from collections import defaultdict
import matplotlib.pyplot as plt


DIRS = {
    "N": (0, -1),
    "E": (1, 0),
    "S": (0, 1),
    "W": (-1, 0),
}

OPPOSITE = {
    "N": "S",
    "S": "N",
    "E": "W",
    "W": "E",
}


def neighbors_of_coord(x, y):
    for d, (dx, dy) in DIRS.items():
        yield d, (x + dx, y + dy)


def make_node_name(index):
    return f"N{index}"


def generate_connected_shape(num_nodes, rng):
    """
    Create a connected set of num_nodes grid cells.
    This does NOT define maze corridors yet; it only defines positions.
    """
    if num_nodes < 1:
        raise ValueError("num_nodes must be >= 1")

    cells = {(0, 0)}
    frontier = set()

    for _, coord in neighbors_of_coord(0, 0):
        frontier.add(coord)

    while len(cells) < num_nodes:
        if not frontier:
            raise RuntimeError("Failed to grow connected shape")

        new_cell = rng.choice(list(frontier))
        frontier.remove(new_cell)
        cells.add(new_cell)

        x, y = new_cell
        for _, ncoord in neighbors_of_coord(x, y):
            if ncoord not in cells:
                frontier.add(ncoord)

    return cells


def build_candidate_adjacency(cells):
    """
    For each cell, find which N/E/S/W neighbors exist in the shape.
    """
    adjacency = {}
    for x, y in cells:
        adjacency[(x, y)] = {}
        for d, (nx, ny) in neighbors_of_coord(x, y):
            if (nx, ny) in cells:
                adjacency[(x, y)][d] = (nx, ny)
    return adjacency


def random_spanning_tree(cells, candidate_adj, rng):
    """
    Turn the connected shape into a maze by selecting a spanning tree.
    """
    start = rng.choice(list(cells))
    visited = {start}
    stack = [start]

    tree_edges = set()

    while stack:
        current = stack[-1]
        unvisited_neighbors = []

        for d, ncoord in candidate_adj[current].items():
            if ncoord not in visited:
                unvisited_neighbors.append((d, ncoord))

        if not unvisited_neighbors:
            stack.pop()
            continue

        d, nxt = rng.choice(unvisited_neighbors)
        visited.add(nxt)
        stack.append(nxt)

        edge = tuple(sorted([current, nxt]))
        tree_edges.add(edge)

    return tree_edges


def boundary_sides(cell, cells):
    """
    Returns which directions from this cell lead outside the maze shape.
    Useful to identify boundary nodes and possible exits.
    """
    x, y = cell
    outside = []
    for d, (nx, ny) in neighbors_of_coord(x, y):
        if (nx, ny) not in cells:
            outside.append(d)
    return outside


def build_maze_structure(cells, tree_edges, num_exits, rng):
    """
    Produce the target data structure:
    {
        "nodes": {
            "N0": {"x": ..., "y": ..., "N": ..., "E": ..., "S": ..., "W": ...},
            ...
        },
        "exits": ["N3", "N9", ...]
    }
    """
    if num_exits < 1:
        raise ValueError("num_exits must be >= 1")

    coord_to_name = {}
    name_to_coord = {}

    sorted_cells = sorted(cells, key=lambda c: (c[1], c[0]))
    for i, coord in enumerate(sorted_cells):
        name = make_node_name(i)
        coord_to_name[coord] = name
        name_to_coord[name] = coord

    tree_adj = defaultdict(dict)
    for a, b in tree_edges:
        ax, ay = a
        bx, by = b
        dx = bx - ax
        dy = by - ay

        for d, (mx, my) in DIRS.items():
            if (dx, dy) == (mx, my):
                tree_adj[a][d] = b
                tree_adj[b][OPPOSITE[d]] = a
                break

    nodes = {}
    for coord, name in coord_to_name.items():
        x, y = coord
        nodes[name] = {
            "x": x,
            "y": y,
            "N": None,
            "E": None,
            "S": None,
            "W": None,
        }
        for d in "NESW":
            if d in tree_adj[coord]:
                nodes[name][d] = coord_to_name[tree_adj[coord][d]]

    # Prefer boundary leaves as exits
    boundary_candidates = []
    fallback_boundary_candidates = []

    for coord, name in coord_to_name.items():
        outside = boundary_sides(coord, cells)
        degree = sum(1 for d in "NESW" if nodes[name][d] is not None)

        if outside:
            fallback_boundary_candidates.append(name)
            if degree == 1:
                boundary_candidates.append(name)

    preferred = boundary_candidates if len(boundary_candidates) >= num_exits else fallback_boundary_candidates

    if len(preferred) < num_exits:
        raise ValueError(
            f"Cannot create {num_exits} exits with only {len(preferred)} boundary nodes. "
            f"Use more nodes or fewer exits."
        )

    exits = rng.sample(preferred, num_exits)

    return {
        "nodes": nodes,
        "exits": exits,
    }


def generate_maze(num_nodes, num_exits, seed=None):
    """
    Main API.
    """
    rng = random.Random(seed)

    cells = generate_connected_shape(num_nodes, rng)
    candidate_adj = build_candidate_adjacency(cells)
    tree_edges = random_spanning_tree(cells, candidate_adj, rng)
    maze = build_maze_structure(cells, tree_edges, num_exits, rng)

    return maze


def draw_maze(maze, show_labels=True, show_exits=True):
    """
    Draws the maze using node coordinates and N/E/S/W links.
    """
    nodes = maze["nodes"]
    exits = set(maze.get("exits", []))

    fig, ax = plt.subplots(figsize=(8, 8))
    drawn_edges = set()

    # Draw corridors
    for node_name, node in nodes.items():
        x1, y1 = node["x"], node["y"]

        for d in "NESW":
            other = node[d]
            if other is None:
                continue

            edge_key = tuple(sorted([node_name, other]))
            if edge_key in drawn_edges:
                continue
            drawn_edges.add(edge_key)

            x2, y2 = nodes[other]["x"], nodes[other]["y"]
            ax.plot([x1, x2], [-y1, -y2], linewidth=3)

    # Draw nodes
    for node_name, node in nodes.items():
        x, y = node["x"], node["y"]

        if node_name in exits and show_exits:
            ax.scatter(x, -y, s=300, marker="s")
        else:
            ax.scatter(x, -y, s=180)

        if show_labels:
            ax.text(x, -y + 0.18, node_name, ha="center", va="bottom", fontsize=9)

    ax.set_aspect("equal")
    ax.set_title("Generated Maze")
    ax.axis("off")
    plt.tight_layout()
    plt.show()


def print_maze_data(maze):
    print(maze_to_js_source(maze))


def normalize_maze_for_export(maze):
    """
    Return the maze in the exact object shape expected by index.html:
    {
      "nodes": {
        "N0": {"x": 0, "y": 0, "N": null, "E": "N1", "S": null, "W": null},
        ...
      },
      "exits": ["N3", "N9"]
    }

    The output is normalized to stable node ordering and explicit N/E/S/W keys.
    """
    ordered_nodes = {}
    node_names = sorted(maze["nodes"].keys(), key=lambda name: int(name[1:]))

    for name in node_names:
        node = maze["nodes"][name]
        ordered_nodes[name] = {
            "x": node["x"],
            "y": node["y"],
            "N": node.get("N"),
            "E": node.get("E"),
            "S": node.get("S"),
            "W": node.get("W"),
        }

    return {
        "nodes": ordered_nodes,
        "exits": list(maze["exits"]),
    }


def maze_to_js_source(maze, var_name="maze"):
    """
    Emit a drop-in JavaScript snippet for index.html:
    const maze = { ... };
    """
    normalized = normalize_maze_for_export(maze)
    body = json.dumps(normalized, indent=2)
    return f"const {var_name} = {body};"


if __name__ == "__main__":
    num_nodes = 30
    num_exits = 2
    seed = 42

    maze = generate_maze(num_nodes=num_nodes, num_exits=num_exits, seed=seed)
    print_maze_data(maze)
    draw_maze(maze)
