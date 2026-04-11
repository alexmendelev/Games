from __future__ import annotations

import argparse
import json
import random
from collections import deque
from dataclasses import dataclass

try:
    import matplotlib.pyplot as plt
except ImportError:  # pragma: no cover - drawing is optional
    plt = None


DIRS = {
    "N": (0, -1),
    "E": (1, 0),
    "S": (0, 1),
    "W": (-1, 0),
}

DECISION = "decision"
CORRIDOR = "corridor"
LEAF = "leaf"
ENTRANCE = "entrance"
EXIT = "exit"


@dataclass(frozen=True)
class DecisionTree:
    uid: int
    left: "DecisionTree | None"
    right: "DecisionTree | None"


@dataclass
class Layout:
    cells: set[tuple[int, int]]
    links: set[tuple[tuple[int, int], tuple[int, int]]]
    roles: dict[tuple[int, int], str]


def normalize_link(a, b):
    return tuple(sorted((a, b)))


def step_between(start, end):
    x1, y1 = start
    x2, y2 = end

    if x1 != x2 and y1 != y2:
        raise ValueError(f"Path segment must be axis aligned: {start} -> {end}")

    if x1 == x2:
        step = 1 if y2 > y1 else -1
        for y in range(y1 + step, y2 + step, step):
            yield x1, y
    else:
        step = 1 if x2 > x1 else -1
        for x in range(x1 + step, x2 + step, step):
            yield x, y1


def add_polyline(layout, points, endpoint_role):
    path = [points[0]]
    for start, end in zip(points, points[1:]):
        if start == end:
            continue
        path.extend(step_between(start, end))

    for previous, current in zip(path, path[1:]):
        layout.links.add(normalize_link(previous, current))
        if current not in layout.cells:
            layout.cells.add(current)
            layout.roles[current] = CORRIDOR

    layout.roles[path[-1]] = endpoint_role


def add_connector_polyline(layout, points):
    path = [points[0]]
    for start, end in zip(points, points[1:]):
        if start == end:
            continue
        path.extend(step_between(start, end))

    for previous, current in zip(path, path[1:]):
        layout.links.add(normalize_link(previous, current))
        if current not in layout.cells:
            layout.cells.add(current)
            layout.roles[current] = CORRIDOR


def build_decision_tree(num_decisions, rng, next_uid=None):
    if num_decisions < 1:
        raise ValueError("num_decisions must be >= 1")

    if next_uid is None:
        next_uid = [0]

    uid = next_uid[0]
    next_uid[0] += 1

    if num_decisions == 1:
        return DecisionTree(uid=uid, left=None, right=None)

    split_weights = []
    for candidate_left_count in range(0, num_decisions):
        candidate_right_count = num_decisions - 1 - candidate_left_count
        branch_bonus = 3.5 if candidate_left_count and candidate_right_count else 1.0
        balance_bonus = (num_decisions + 1) - abs(candidate_left_count - candidate_right_count)
        if candidate_left_count == 0 or candidate_right_count == 0:
            balance_bonus *= 0.65 if num_decisions > 3 else 1.0
        split_weights.append(max(0.1, branch_bonus * balance_bonus))

    left_count = rng.choices(range(0, num_decisions), weights=split_weights, k=1)[0]
    right_count = num_decisions - 1 - left_count

    left = build_decision_tree(left_count, rng, next_uid) if left_count else None
    right = build_decision_tree(right_count, rng, next_uid) if right_count else None

    if rng.random() < 0.5:
        left, right = right, left

    return DecisionTree(uid=uid, left=left, right=right)


def leaf_count(tree):
    if tree is None:
        return 1
    return leaf_count(tree.left) + leaf_count(tree.right)


def assign_decision_positions(tree, depth, leftmost_leaf_index, leaf_spacing, row_spacing, positions):
    left_leaves = leaf_count(tree.left)
    total_leaves = left_leaves + leaf_count(tree.right)

    left_x = leftmost_leaf_index * leaf_spacing
    right_x = (leftmost_leaf_index + total_leaves - 1) * leaf_spacing
    positions[tree.uid] = ((left_x + right_x) // 2, -depth * row_spacing)

    if tree.left is not None:
        assign_decision_positions(
            tree.left,
            depth + 1,
            leftmost_leaf_index,
            leaf_spacing,
            row_spacing,
            positions,
        )

    if tree.right is not None:
        assign_decision_positions(
            tree.right,
            depth + 1,
            leftmost_leaf_index + left_leaves,
            leaf_spacing,
            row_spacing,
            positions,
        )


def direction_between(a, b):
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    for direction, delta in DIRS.items():
        if delta == (dx, dy):
            return direction
    raise ValueError(f"{a} and {b} are not orthogonally adjacent")


def build_layout(tree, positions, leaf_spacing, row_spacing):
    layout = Layout(cells=set(), links=set(), roles={})

    def visit(node, depth, leftmost_leaf_index):
        node_coord = positions[node.uid]
        layout.cells.add(node_coord)
        layout.roles[node_coord] = DECISION

        left_leaves = leaf_count(node.left)
        right_leaf_index = leftmost_leaf_index + left_leaves
        child_y = -(depth + 1) * row_spacing

        if node.left is None:
            left_endpoint = (leftmost_leaf_index * leaf_spacing, child_y)
            add_polyline(layout, [node_coord, (left_endpoint[0], node_coord[1]), left_endpoint], LEAF)
        else:
            left_endpoint = positions[node.left.uid]
            add_polyline(layout, [node_coord, (left_endpoint[0], node_coord[1]), left_endpoint], DECISION)
            visit(node.left, depth + 1, leftmost_leaf_index)

        if node.right is None:
            right_endpoint = (right_leaf_index * leaf_spacing, child_y)
            add_polyline(layout, [node_coord, (right_endpoint[0], node_coord[1]), right_endpoint], LEAF)
        else:
            right_endpoint = positions[node.right.uid]
            add_polyline(layout, [node_coord, (right_endpoint[0], node_coord[1]), right_endpoint], DECISION)
            visit(node.right, depth + 1, right_leaf_index)

    visit(tree, depth=0, leftmost_leaf_index=0)
    return layout


def attach_entrance(layout, root_coord, row_spacing):
    entrance_coord = (root_coord[0], root_coord[1] + row_spacing)
    add_polyline(layout, [root_coord, entrance_coord], ENTRANCE)
    return entrance_coord


def build_graph(layout):
    adjacency = {coord: set() for coord in layout.cells}
    for a, b in layout.links:
        adjacency[a].add(b)
        adjacency[b].add(a)
    return adjacency


def degree_map(adjacency):
    return {coord: len(neighbors) for coord, neighbors in adjacency.items()}


def count_degree(adjacency, target_degree):
    return sum(1 for neighbors in adjacency.values() if len(neighbors) == target_degree)


def graph_distances(adjacency, start):
    distances = {start: 0}
    queue = deque([start])

    while queue:
        current = queue.popleft()
        for neighbor in adjacency[current]:
            if neighbor in distances:
                continue
            distances[neighbor] = distances[current] + 1
            queue.append(neighbor)

    return distances


def manhattan_distance(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def shortest_path_distance(adjacency, start, goal):
    if start == goal:
        return 0

    distances = {start: 0}
    queue = deque([start])

    while queue:
        current = queue.popleft()
        for neighbor in adjacency[current]:
            if neighbor in distances:
                continue
            distances[neighbor] = distances[current] + 1
            if neighbor == goal:
                return distances[neighbor]
            queue.append(neighbor)

    return None


def pairwise_distances(coords):
    distances = []
    for index, coord in enumerate(coords):
        for other in coords[index + 1:]:
            distances.append(manhattan_distance(coord, other))
    return distances


def count_available_leafs(adjacency, excluded=None):
    excluded = excluded or set()
    return sum(
        1
        for coord, neighbors in adjacency.items()
        if len(neighbors) == 1 and coord not in excluded
    )


def polyline_cells(points):
    cells = []
    for start, end in zip(points, points[1:]):
        if start == end:
            continue
        cells.extend(step_between(start, end))
    return cells


def connector_points(a, b):
    if a[0] == b[0] or a[1] == b[1]:
        return [[a, b]]
    return [
        [a, (a[0], b[1]), b],
        [a, (b[0], a[1]), b],
    ]


def connector_path_is_clear(layout, points):
    occupied = set(layout.cells)
    traversed = polyline_cells(points)
    if not traversed:
        return False

    for coord in traversed[:-1]:
        if coord in occupied:
            return False
    return True


def candidate_loop_edges(layout, entrance_coord, required_leaf_count, max_degree=4):
    adjacency = build_graph(layout)
    degrees = degree_map(adjacency)
    excluded_from_leaf_budget = {entrance_coord}
    current_leafs = count_available_leafs(adjacency, excluded=excluded_from_leaf_budget)
    all_coords = sorted(layout.cells)

    candidates = []
    for index, coord in enumerate(all_coords):
        if layout.roles.get(coord) == CORRIDOR:
            continue
        if coord == entrance_coord or degrees[coord] >= max_degree:
            continue

        for neighbor in all_coords[index + 1:]:
            if layout.roles.get(neighbor) == CORRIDOR:
                continue
            if neighbor == entrance_coord or degrees[neighbor] >= max_degree:
                continue
            if normalize_link(coord, neighbor) in layout.links:
                continue

            leaf_loss = 0
            for endpoint in (coord, neighbor):
                if degrees[endpoint] == 1 and endpoint != entrance_coord:
                    leaf_loss += 1

            distance = shortest_path_distance(adjacency, coord, neighbor)
            if distance is None or distance < 3:
                continue

            if current_leafs - leaf_loss < required_leaf_count:
                continue

            for points in connector_points(coord, neighbor):
                if not connector_path_is_clear(layout, points):
                    continue
                corridor_gain = max(0, len(polyline_cells(points)) - 1)
                four_way_gain = sum(
                    1 for endpoint in (coord, neighbor) if degrees[endpoint] + 1 == 4
                )
                candidates.append(
                    (coord, neighbor, distance, corridor_gain, four_way_gain, points)
                )

    return candidates


def add_loops(layout, entrance_coord, num_exits, num_loops, rng, required_four_way_junctions=0):
    if num_loops < 0:
        raise ValueError("num_loops must be >= 0")
    if required_four_way_junctions < 0:
        raise ValueError("required_four_way_junctions must be >= 0")
    if num_loops == 0:
        return 0

    adjacency = build_graph(layout)
    current_four_ways = count_degree(adjacency, 4)
    loop_centers = []

    added = 0
    while added < num_loops:
        candidates = candidate_loop_edges(
            layout,
            entrance_coord=entrance_coord,
            required_leaf_count=num_exits,
            max_degree=4,
        )
        if not candidates:
            break

        remaining_four_ways = max(0, required_four_way_junctions - current_four_ways)
        if remaining_four_ways:
            four_way_capable = [
                candidate
                for candidate in candidates
                if 0 < candidate[4] <= remaining_four_ways
            ]
            if four_way_capable:
                candidates = four_way_capable
            else:
                break

        scored_candidates = []
        for coord_a, coord_b, distance, corridor_gain, four_way_gain, points in candidates:
            distance_score = max(0, 9 - abs(distance - 8))
            anchor_span = abs(coord_a[0] - coord_b[0]) + abs(coord_a[1] - coord_b[1])
            loop_center = (
                (coord_a[0] + coord_b[0]) / 2,
                (coord_a[1] + coord_b[1]) / 2,
            )
            existing_loop_spacing = min(
                (
                    abs(loop_center[0] - existing[0]) + abs(loop_center[1] - existing[1])
                    for existing in loop_centers
                ),
                default=6,
            )

            score = (
                distance_score * 1.8
                - corridor_gain * 2.7
                + four_way_gain * 9.0
                + anchor_span * 0.55
                + existing_loop_spacing * 1.35
            )
            if remaining_four_ways and four_way_gain == 0:
                score -= 100
            score += rng.random() * 0.05
            scored_candidates.append((score, coord_a, coord_b, points))

        best_score = max(score for score, _, _, _ in scored_candidates)
        best = [
            (coord_a, coord_b, points)
            for score, coord_a, coord_b, points in scored_candidates
            if abs(score - best_score) < 1e-9
        ]
        coord_a, coord_b, points = rng.choice(best)
        add_connector_polyline(layout, points)
        loop_centers.append(((coord_a[0] + coord_b[0]) / 2, (coord_a[1] + coord_b[1]) / 2))
        added += 1
        adjacency = build_graph(layout)
        current_four_ways = count_degree(adjacency, 4)

    return added


def choose_exit_coords(layout, entrance_coord, num_exits, rng):
    adjacency = build_graph(layout)
    leaf_candidates = [
        coord
        for coord, neighbors in adjacency.items()
        if len(neighbors) == 1 and coord != entrance_coord
    ]

    if num_exits < 1:
        raise ValueError("num_exits must be >= 1")
    if num_exits > len(leaf_candidates):
        raise ValueError(
            f"Cannot create {num_exits} exits with only {len(leaf_candidates)} leaf endpoints"
        )

    distances = graph_distances(adjacency, entrance_coord)
    ranked = sorted(
        leaf_candidates,
        key=lambda coord: (distances[coord], rng.random()),
        reverse=True,
    )

    chosen = []
    while len(chosen) < num_exits:
        best_coord = None
        best_score = None
        for coord in ranked:
            if coord in chosen:
                continue

            separation = min(
                (shortest_path_distance(adjacency, coord, existing) or 0) for existing in chosen
            ) if chosen else distances[coord]
            score = distances[coord] * 2.2 + separation * 2.8 + rng.random() * 0.05
            if best_score is None or score > best_score:
                best_score = score
                best_coord = coord

        chosen.append(best_coord)

    for coord in chosen:
        layout.roles[coord] = EXIT
    return chosen


def validate_layout(
    layout,
    entrance_coord,
    exit_coords,
    expected_loops=0,
    expected_four_way_junctions=0,
):
    adjacency = build_graph(layout)
    distances = graph_distances(adjacency, entrance_coord)

    if len(distances) != len(layout.cells):
        raise ValueError("Maze layout is not connected")
    actual_loops = len(layout.links) - len(layout.cells) + 1
    if actual_loops != expected_loops:
        raise ValueError(f"Expected {expected_loops} loops, found {actual_loops}")
    actual_four_way_junctions = count_degree(adjacency, 4)
    if actual_four_way_junctions != expected_four_way_junctions:
        raise ValueError(
            f"Expected {expected_four_way_junctions} four-way junctions, found {actual_four_way_junctions}"
        )

    exit_set = set(exit_coords)
    stats = {
        "decisions": 0,
        "three_way_decisions": 0,
        "four_way_decisions": actual_four_way_junctions,
        "corridors": 0,
        "dead_ends": 0,
        "exits": len(exit_set),
        "loops": actual_loops,
    }

    for coord, neighbors in adjacency.items():
        degree = len(neighbors)
        role = layout.roles[coord]

        if degree not in (1, 2, 3, 4):
            raise ValueError(f"Unsupported degree {degree} at {coord}")

        if coord == entrance_coord:
            if degree != 1 or role != ENTRANCE:
                raise ValueError("Entrance must be a degree-1 entrance node")
            continue

        if coord in exit_set:
            if degree != 1 or role != EXIT:
                raise ValueError(f"Exit at {coord} must be a degree-1 exit node")
            continue

        if degree == 1:
            stats["dead_ends"] += 1
            continue

        if degree == 2:
            stats["corridors"] += 1
            continue

        stats["decisions"] += 1
        if degree == 3:
            stats["three_way_decisions"] += 1

    return stats


def coord_to_name(index):
    return f"N{index}"


def build_maze_structure(layout, exit_coords):
    adjacency = build_graph(layout)
    ordered_coords = sorted(layout.cells, key=lambda coord: (coord[1], coord[0]))
    coord_to_node = {
        coord: coord_to_name(index) for index, coord in enumerate(ordered_coords)
    }

    nodes = {}
    for coord in ordered_coords:
        node = {"x": coord[0], "y": coord[1], "N": None, "E": None, "S": None, "W": None}
        for neighbor in adjacency[coord]:
            node[direction_between(coord, neighbor)] = coord_to_node[neighbor]
        nodes[coord_to_node[coord]] = node

    exits = [coord_to_node[coord] for coord in sorted(exit_coords, key=lambda coord: (coord[1], coord[0]))]
    return {"nodes": nodes, "exits": exits}


def classify_nodes(maze):
    exits = set(maze["exits"])
    counts = {
        "decisions": 0,
        "three_way_decisions": 0,
        "four_way_decisions": 0,
        "corridors": 0,
        "dead_ends": 0,
        "exits": len(exits),
        "loops": 0,
    }

    for node_id, node in maze["nodes"].items():
        degree = sum(1 for direction in "NESW" if node[direction] is not None)
        if node_id in exits:
            continue
        if degree == 4:
            counts["decisions"] += 1
            counts["four_way_decisions"] += 1
        elif degree == 3:
            counts["decisions"] += 1
            counts["three_way_decisions"] += 1
        elif degree == 2:
            counts["corridors"] += 1
        elif degree == 1:
            counts["dead_ends"] += 1

    edge_count = 0
    for node in maze["nodes"].values():
        edge_count += sum(1 for direction in "NESW" if node[direction] is not None)
    counts["loops"] = edge_count // 2 - len(maze["nodes"]) + 1

    return counts


def corridor_segment_lengths(adjacency):
    visible_nodes = {
        coord for coord, neighbors in adjacency.items() if len(neighbors) != 2
    }
    traversed_edges = set()
    lengths = []

    for coord in visible_nodes:
        for neighbor in adjacency[coord]:
            edge_key = normalize_link(coord, neighbor)
            if edge_key in traversed_edges:
                continue

            traversed_edges.add(edge_key)
            length = 1
            previous = coord
            current = neighbor

            while current not in visible_nodes:
                next_coord = next(
                    candidate for candidate in adjacency[current] if candidate != previous
                )
                traversed_edges.add(normalize_link(current, next_coord))
                previous = current
                current = next_coord
                length += 1

            lengths.append(length)

    return lengths


def visible_nodes(adjacency):
    return [coord for coord, neighbors in adjacency.items() if len(neighbors) != 2]


def layout_quality_score(layout, entrance_coord, exit_coords):
    adjacency = build_graph(layout)
    counts = classify_nodes(build_maze_structure(layout, exit_coords))
    corridor_lengths = corridor_segment_lengths(adjacency)
    visible = visible_nodes(adjacency)

    xs = [coord[0] for coord in layout.cells]
    ys = [coord[1] for coord in layout.cells]
    width = max(xs) - min(xs) + 1
    height = max(ys) - min(ys) + 1
    density = len(layout.cells) / max(1, width * height)

    long_corridor_penalty = sum(max(0, length - 4) ** 2 for length in corridor_lengths)
    medium_corridor_bonus = sum(1 for length in corridor_lengths if 2 <= length <= 5)
    max_corridor_length = max(corridor_lengths, default=0)
    aspect_penalty = abs(width - height)

    exit_distances = graph_distances(adjacency, entrance_coord)
    exit_depth_bonus = sum(exit_distances[coord] for coord in exit_coords)
    exit_spread_bonus = min(pairwise_distances(exit_coords), default=0)

    entrance_x = entrance_coord[0]
    left_visible = sum(1 for coord in visible if coord[0] < entrance_x)
    right_visible = sum(1 for coord in visible if coord[0] > entrance_x)
    side_balance_penalty = abs(left_visible - right_visible)

    visible_xs = [coord[0] for coord in visible]
    x_min = min(xs)
    x_span = max(1, width - 1)
    thirds = [0, 0, 0]
    for coord_x in visible_xs:
      bucket = min(2, int(((coord_x - x_min) / x_span) * 3))
      thirds[bucket] += 1
    visible_coverage_bonus = sum(1 for count in thirds if count > 0) * 7
    visible_clump_penalty = max(thirds) - min(thirds)

    four_way_coords = [
        coord for coord, neighbors in adjacency.items() if len(neighbors) == 4
    ]
    four_way_spread_bonus = min(pairwise_distances(four_way_coords), default=0)

    return (
        counts["four_way_decisions"] * 24
        + counts["three_way_decisions"] * 5
        + medium_corridor_bonus * 1.5
        + exit_depth_bonus * 0.45
        + exit_spread_bonus * 1.2
        + four_way_spread_bonus * 1.4
        + visible_coverage_bonus
        + density * 60
        - long_corridor_penalty * 3.5
        - max_corridor_length * 1.5
        - side_balance_penalty * 1.6
        - visible_clump_penalty * 2.2
        - aspect_penalty * 0.8
        - (width + height) * 0.18
    )


def normalize_maze_for_export(maze):
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
    body = json.dumps(normalize_maze_for_export(maze), indent=2)
    return f"const {var_name} = {body};"


def print_maze_data(maze, var_name="maze"):
    print(maze_to_js_source(maze, var_name=var_name))


def draw_maze(maze, show_labels=True):
    if plt is None:
        raise RuntimeError("matplotlib is not installed, so drawing is unavailable")

    nodes = maze["nodes"]
    exits = set(maze["exits"])

    colors = {
        DECISION: "#ff9f1c",
        CORRIDOR: "#4f772d",
        LEAF: "#8d99ae",
        EXIT: "#e63946",
    }

    sizes = {
        DECISION: 260,
        CORRIDOR: 110,
        LEAF: 170,
        EXIT: 280,
    }

    def node_kind(node_id, node):
        if node_id in exits:
            return EXIT
        degree = sum(1 for direction in "NESW" if node[direction] is not None)
        if degree >= 3:
            return DECISION
        if degree == 2:
            return CORRIDOR
        return LEAF

    fig, ax = plt.subplots(figsize=(10, 10))
    drawn_edges = set()

    for node_id, node in nodes.items():
        x1, y1 = node["x"], node["y"]
        for direction in "NESW":
            other_id = node[direction]
            if other_id is None:
                continue
            edge_key = tuple(sorted((node_id, other_id)))
            if edge_key in drawn_edges:
                continue
            drawn_edges.add(edge_key)

            x2, y2 = nodes[other_id]["x"], nodes[other_id]["y"]
            ax.plot([x1, x2], [-y1, -y2], linewidth=3, color="#2b2d42")

    for node_id, node in nodes.items():
        kind = node_kind(node_id, node)
        ax.scatter(
            node["x"],
            -node["y"],
            s=sizes[kind],
            c=colors[kind],
            edgecolors="#1f1f1f",
            linewidths=1.2,
            zorder=3,
        )
        if show_labels:
            ax.text(node["x"], -node["y"] + 0.2, node_id, ha="center", va="bottom", fontsize=9)

    counts = classify_nodes(maze)
    ax.set_title(
        "Decision Maze\n"
        f"decisions={counts['decisions']} (4-way={counts['four_way_decisions']}), "
        f"dead_ends={counts['dead_ends']}, exits={counts['exits']}"
    )
    ax.set_aspect("equal")
    ax.axis("off")
    plt.tight_layout()
    plt.show()


def generate_maze(
    num_decisions,
    num_exits,
    seed=None,
    leaf_spacing=2,
    row_spacing=2,
    num_loops=0,
    num_four_way_junctions=0,
):
    """
    Generate a maze whose only junction types are:
    1. decision nodes that branch left or right
    2. dead ends
    3. exits

    Straight corridor cells may appear between those junctions, and optional
    loop connectors may upgrade some decision nodes into 4-way junctions.
    """
    if leaf_spacing < 2:
        raise ValueError("leaf_spacing must be >= 2")
    if row_spacing < 2:
        raise ValueError("row_spacing must be >= 2")
    if num_four_way_junctions < 0:
        raise ValueError("num_four_way_junctions must be >= 0")
    if num_four_way_junctions and num_loops == 0:
        raise ValueError("four-way junctions require at least one loop")
    if num_four_way_junctions > num_loops * 2:
        raise ValueError(
            "Each loop can create at most two 4-way junctions; increase --loops or lower --four-way-junctions"
        )

    attempts = 4 if num_loops == 0 and num_four_way_junctions == 0 else 6
    best_maze = None
    best_score = None

    for attempt in range(attempts):
        attempt_seed = None if seed is None else seed + attempt * 9973
        attempt_rng = random.Random(attempt_seed)
        spacing_growth = num_loops or num_four_way_junctions
        attempt_leaf_spacing = leaf_spacing + attempt if spacing_growth else leaf_spacing
        attempt_row_spacing = row_spacing + (attempt // 2) if spacing_growth else row_spacing

        tree = build_decision_tree(num_decisions, attempt_rng)

        positions = {}
        assign_decision_positions(
            tree,
            depth=0,
            leftmost_leaf_index=0,
            leaf_spacing=attempt_leaf_spacing,
            row_spacing=attempt_row_spacing,
            positions=positions,
        )

        layout = build_layout(
            tree,
            positions,
            leaf_spacing=attempt_leaf_spacing,
            row_spacing=attempt_row_spacing,
        )
        entrance_coord = attach_entrance(layout, positions[tree.uid], row_spacing=attempt_row_spacing)
        added_loops = add_loops(
            layout,
            entrance_coord,
            num_exits=num_exits,
            num_loops=num_loops,
            rng=attempt_rng,
            required_four_way_junctions=num_four_way_junctions,
        )
        if added_loops != num_loops:
            continue

        exit_coords = choose_exit_coords(layout, entrance_coord, num_exits, attempt_rng)
        validate_layout(
            layout,
            entrance_coord,
            exit_coords,
            expected_loops=added_loops,
            expected_four_way_junctions=num_four_way_junctions,
        )
        maze = build_maze_structure(layout, exit_coords)
        score = layout_quality_score(layout, entrance_coord, exit_coords)
        if best_score is None or score > best_score:
            best_score = score
            best_maze = maze

    if best_maze is not None:
        return best_maze

    raise ValueError(
        f"Could not create a maze with {num_loops} loops and "
        f"{num_four_way_junctions} four-way junctions. Try fewer constraints or larger spacing."
    )


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate maze variants with decision junctions, dead ends, exits, and optional 4-way choice points."
    )
    parser.add_argument("--decisions", type=int, default=8, help="Number of decision nodes")
    parser.add_argument("--exits", type=int, default=2, help="Number of exit leaves")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--leaf-spacing", type=int, default=2, help="Horizontal spacing between leaf lanes")
    parser.add_argument("--row-spacing", type=int, default=2, help="Vertical spacing between decision rows")
    parser.add_argument("--loops", type=int, default=0, help="Number of extra links to add to create cycles")
    parser.add_argument(
        "--four-way-junctions",
        type=int,
        default=0,
        help="Number of degree-4 junctions to create for left/straight/right choice points",
    )
    parser.add_argument("--var-name", default="maze", help="JavaScript variable name for the exported maze")
    parser.add_argument("--draw", action="store_true", help="Preview the maze with matplotlib")
    parser.add_argument("--summary", action="store_true", help="Print a short node summary after the maze")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    maze = generate_maze(
        num_decisions=args.decisions,
        num_exits=args.exits,
        seed=args.seed,
        leaf_spacing=args.leaf_spacing,
        row_spacing=args.row_spacing,
        num_loops=args.loops,
        num_four_way_junctions=args.four_way_junctions,
    )
    print_maze_data(maze, var_name=args.var_name)

    if args.summary:
        counts = classify_nodes(maze)
        print(
            f"\n// decisions={counts['decisions']}, corridors={counts['corridors']}, "
            f"three_way_decisions={counts['three_way_decisions']}, "
            f"four_way_decisions={counts['four_way_decisions']}, "
            f"dead_ends={counts['dead_ends']}, exits={counts['exits']}, loops={counts['loops']}, nodes={len(maze['nodes'])}"
        )

    if args.draw:
        draw_maze(maze)
