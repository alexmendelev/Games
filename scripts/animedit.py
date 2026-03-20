import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageTk, ImageChops
import os
import math

# ----------------------------
# Helpers
# ----------------------------
def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def bbox_of_alpha(img_rgba):
    """Return bbox of non-transparent pixels based on alpha channel, or None."""
    alpha = img_rgba.split()[-1]
    return alpha.getbbox()

def trim_to_alpha(img_rgba):
    """Trim transparent borders; returns (trimmed_img, bbox) or (original, None) if empty."""
    bbox = bbox_of_alpha(img_rgba)
    if bbox is None:
        return img_rgba.copy(), None
    return img_rgba.crop(bbox), bbox

def paste_with_offset(cell_w, cell_h, src_rgba, dx, dy):
    """
    Place src_rgba into an empty cell_w x cell_h at offset (dx, dy).
    dx,dy can be negative/positive; content may clip.
    """
    out = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
    out.alpha_composite(src_rgba, (dx, dy))
    return out

# ----------------------------
# App
# ----------------------------
class SpriteSheetEditor(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Sprite Sheet Editor (drag frames, export fixed sheet)")
        self.geometry("1150x750")

        # Image state
        self.sheet = None               # PIL RGBA
        self.sheet_path = None
        self.rows = tk.IntVar(value=4)
        self.cols = tk.IntVar(value=4)
        self.frame_idx = tk.IntVar(value=0)

        self.cell_w = 0
        self.cell_h = 0

        # Per-frame offsets
        self.offsets = []  # list of (dx, dy)
        self.copied_cell = None  # tuple of (PIL RGBA frame image, (dx, dy))

        # Options
        self.show_grid = tk.BooleanVar(value=True)
        self.auto_trim = tk.BooleanVar(value=False)
        self.auto_baseline = tk.BooleanVar(value=False)
        self.subgrid_divisions = 8
        self.playback_fps = tk.IntVar(value=8)
        self.is_playing = False
        self.playback_job = None

        # Drag state
        self.dragging = False
        self.drag_start = (0, 0)
        self.offset_start = (0, 0)

        # UI
        self._build_ui()

    def _adapt_window_to_image(self, img_w, img_h):
        """Resize the app window to better match the loaded sheet size."""
        target_w = int(clamp(img_w + 430, 960, 1800))
        target_h = int(clamp(max(img_h + 170, 720), 700, 1200))
        self.geometry(f"{target_w}x{target_h}")

    def _build_ui(self):
        top = tk.Frame(self)
        top.pack(side=tk.TOP, fill=tk.X, padx=8, pady=8)

        tk.Button(top, text="Open PNG…", command=self.open_png).pack(side=tk.LEFT)

        tk.Label(top, text="Rows").pack(side=tk.LEFT, padx=(12, 4))
        tk.Entry(top, textvariable=self.rows, width=4).pack(side=tk.LEFT)
        tk.Label(top, text="Cols").pack(side=tk.LEFT, padx=(8, 4))
        tk.Entry(top, textvariable=self.cols, width=4).pack(side=tk.LEFT)

        tk.Button(top, text="Apply Grid", command=self.apply_grid).pack(side=tk.LEFT, padx=10)

        tk.Checkbutton(top, text="Show grid", variable=self.show_grid, command=self.redraw).pack(side=tk.LEFT)
        tk.Checkbutton(top, text="Auto-trim alpha (per frame)", variable=self.auto_trim).pack(side=tk.LEFT, padx=(10,0))
        tk.Checkbutton(top, text="Auto-baseline align (bottom)", variable=self.auto_baseline).pack(side=tk.LEFT)

        tk.Button(top, text="Export Fixed PNG…", command=self.export_png).pack(side=tk.RIGHT)

        mid = tk.Frame(self)
        mid.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Left: main canvas (preview of full sheet + grid + current frame highlight)
        left = tk.Frame(mid)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(left, bg="#111")
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)

        # Right: frame controls + zoomed cell view
        right = tk.Frame(mid, width=360)
        right.pack(side=tk.RIGHT, fill=tk.Y)

        tk.Label(right, text="Frame").pack(anchor="w")
        self.frame_scale = tk.Scale(
            right, from_=0, to=0, orient=tk.HORIZONTAL,
            variable=self.frame_idx, command=lambda _=None: self.redraw()
        )
        self.frame_scale.pack(fill=tk.X)

        playback = tk.LabelFrame(right, text="Playback")
        playback.pack(fill=tk.X, pady=(10, 0))

        playback_row = tk.Frame(playback)
        playback_row.pack(fill=tk.X, padx=6, pady=6)
        self.play_button = tk.Button(playback_row, text="Play", command=self.toggle_playback)
        self.play_button.pack(side=tk.LEFT)
        tk.Button(playback_row, text="Stop", command=self.stop_playback).pack(side=tk.LEFT, padx=(6, 0))
        tk.Label(playback_row, text="FPS").pack(side=tk.LEFT, padx=(12, 4))
        tk.Entry(playback_row, textvariable=self.playback_fps, width=4).pack(side=tk.LEFT)

        off_box = tk.LabelFrame(right, text="Offset (current frame)")
        off_box.pack(fill=tk.X, pady=(10, 0))

        self.dx_var = tk.IntVar(value=0)
        self.dy_var = tk.IntVar(value=0)

        row1 = tk.Frame(off_box)
        row1.pack(fill=tk.X, padx=6, pady=6)
        tk.Label(row1, text="dx").pack(side=tk.LEFT)
        tk.Entry(row1, textvariable=self.dx_var, width=6).pack(side=tk.LEFT, padx=(6, 12))
        tk.Label(row1, text="dy").pack(side=tk.LEFT)
        tk.Entry(row1, textvariable=self.dy_var, width=6).pack(side=tk.LEFT, padx=(6, 12))
        tk.Button(row1, text="Set", command=self.set_offset_from_entries).pack(side=tk.RIGHT)

        row2 = tk.Frame(off_box)
        row2.pack(fill=tk.X, padx=6, pady=(0, 6))
        tk.Button(row2, text="dx-1", command=lambda: self.nudge(-1, 0)).pack(side=tk.LEFT)
        tk.Button(row2, text="dx+1", command=lambda: self.nudge(1, 0)).pack(side=tk.LEFT, padx=4)
        tk.Button(row2, text="dy-1", command=lambda: self.nudge(0, -1)).pack(side=tk.LEFT, padx=4)
        tk.Button(row2, text="dy+1", command=lambda: self.nudge(0, 1)).pack(side=tk.LEFT, padx=4)
        tk.Button(row2, text="Reset", command=self.reset_offset).pack(side=tk.RIGHT)

        tools = tk.LabelFrame(right, text="Tools")
        tools.pack(fill=tk.X, pady=(10, 0))

        copy_row = tk.Frame(tools)
        copy_row.pack(fill=tk.X, padx=6, pady=4)
        tk.Button(copy_row, text="Copy frame", command=self.copy_current_cell).pack(side=tk.LEFT, fill=tk.X, expand=True)
        tk.Button(copy_row, text="Paste frame", command=self.paste_into_current_cell).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 0))

        tk.Button(tools, text="Auto-baseline (all frames)", command=self.do_auto_baseline_all).pack(fill=tk.X, padx=6, pady=4)
        tk.Button(tools, text="Reset all offsets", command=self.reset_all_offsets).pack(fill=tk.X, padx=6, pady=4)

        # Zoom view of current cell
        z = tk.LabelFrame(right, text="Current frame (cell preview)")
        z.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        self.zoom_canvas = tk.Canvas(z, bg="#222", width=320, height=320)
        self.zoom_canvas.pack(fill=tk.BOTH, expand=True)

        tip = tk.Label(
            right,
            text=(
                "Usage:\n"
                "- Click a cell to select frame\n"
                "- Drag inside canvas to move frame content\n"
                "- Ctrl+C copies the selected frame\n"
                "- Ctrl+V pastes into the selected frame\n"
                "- Arrow keys nudge 1 px, Ctrl = 5, Ctrl+Shift = 10\n"
                "- Play cycles through frames at the chosen FPS\n"
                "- Export when done\n"
                "\nTip: enable Auto-baseline align if frames\n"
                "have vertical drift (bottom line mismatch)."
            ),
            justify="left"
        )
        tip.pack(anchor="w", pady=(10, 0))

        # Internal cache for Tk images to prevent GC
        self._tk_sheet_img = None
        self._tk_zoom_img = None

        self.bind_all("<Control-c>", self.copy_current_cell)
        self.bind_all("<Control-v>", self.paste_into_current_cell)
        self.bind_all("<space>", self.toggle_playback)
        self.bind_all("<Left>", lambda event: self.nudge_from_shortcut(-1, 0, event))
        self.bind_all("<Right>", lambda event: self.nudge_from_shortcut(1, 0, event))
        self.bind_all("<Up>", lambda event: self.nudge_from_shortcut(0, -1, event))
        self.bind_all("<Down>", lambda event: self.nudge_from_shortcut(0, 1, event))
        self.bind_all("<Control-Left>", lambda event: self.nudge_from_shortcut(-5, 0, event))
        self.bind_all("<Control-Right>", lambda event: self.nudge_from_shortcut(5, 0, event))
        self.bind_all("<Control-Up>", lambda event: self.nudge_from_shortcut(0, -5, event))
        self.bind_all("<Control-Down>", lambda event: self.nudge_from_shortcut(0, 5, event))
        self.bind_all("<Control-Shift-Left>", lambda event: self.nudge_from_shortcut(-10, 0, event))
        self.bind_all("<Control-Shift-Right>", lambda event: self.nudge_from_shortcut(10, 0, event))
        self.bind_all("<Control-Shift-Up>", lambda event: self.nudge_from_shortcut(0, -10, event))
        self.bind_all("<Control-Shift-Down>", lambda event: self.nudge_from_shortcut(0, 10, event))

    def _draw_sheet_grid(self, scale, disp_w, disp_h):
        r = int(self.rows.get())
        c = int(self.cols.get())

        if self.subgrid_divisions > 1:
            for col in range(c):
                for sub in range(1, self.subgrid_divisions):
                    x = int(round((col * self.cell_w + (self.cell_w * sub / self.subgrid_divisions)) * scale))
                    self.canvas.create_line(x, 0, x, disp_h, fill="#2f2f2f")
            for row in range(r):
                for sub in range(1, self.subgrid_divisions):
                    y = int(round((row * self.cell_h + (self.cell_h * sub / self.subgrid_divisions)) * scale))
                    self.canvas.create_line(0, y, disp_w, y, fill="#2f2f2f")

        for i in range(1, c):
            x = int(round(i * self.cell_w * scale))
            self.canvas.create_line(x, 0, x, disp_h, fill="#555")
        for j in range(1, r):
            y = int(round(j * self.cell_h * scale))
            self.canvas.create_line(0, y, disp_w, y, fill="#555")

    def _draw_zoom_grid(self, zimg_w, zimg_h):
        if self.subgrid_divisions > 1:
            for sub in range(1, self.subgrid_divisions):
                x = int(round(zimg_w * sub / self.subgrid_divisions))
                y = int(round(zimg_h * sub / self.subgrid_divisions))
                self.zoom_canvas.create_line(x, 0, x, zimg_h, fill="#3a3a3a")
                self.zoom_canvas.create_line(0, y, zimg_w, y, fill="#3a3a3a")

        self.zoom_canvas.create_rectangle(0, 0, zimg_w - 1, zimg_h - 1, outline="#666")

    # ----------------------------
    # File ops
    # ----------------------------
    def open_png(self):
        self.stop_playback()
        path = filedialog.askopenfilename(
            title="Open sprite sheet PNG",
            filetypes=[("PNG images", "*.png")]
        )
        if not path:
            return

        try:
            img = Image.open(path).convert("RGBA")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open image:\n{e}")
            return

        self.sheet = img
        self.sheet_path = path
        self._adapt_window_to_image(*img.size)
        self.apply_grid()

    def apply_grid(self):
        self.stop_playback()
        if self.sheet is None:
            return

        r = int(self.rows.get())
        c = int(self.cols.get())
        if r <= 0 or c <= 0:
            messagebox.showerror("Error", "Rows/Cols must be positive.")
            return

        w, h = self.sheet.size
        if w % c != 0 or h % r != 0:
            # Pad transparently so each grid cell remains equal-sized.
            self.cell_w = math.ceil(w / c)
            self.cell_h = math.ceil(h / r)
            padded_w = self.cell_w * c
            padded_h = self.cell_h * r
            padded = Image.new("RGBA", (padded_w, padded_h), (0, 0, 0, 0))
            padded.alpha_composite(self.sheet, (0, 0))
            self.sheet = padded
            messagebox.showinfo(
                "Grid auto-adjust",
                f"Image {w}x{h} was padded to {padded_w}x{padded_h}\n"
                f"to fit {c}x{r} equal cells."
            )
            w, h = self.sheet.size
        else:
            self.cell_w = w // c
            self.cell_h = h // r

        n = r * c
        self.offsets = [(0, 0) for _ in range(n)]
        self.frame_idx.set(0)
        self.frame_scale.configure(to=max(0, n - 1))
        self.dx_var.set(0)
        self.dy_var.set(0)

        # Keep the zoom pane proportional to frame size for very small/large sheets.
        zsize = int(clamp(max(self.cell_w, self.cell_h) * 2.0, 240, 640))
        self.zoom_canvas.configure(width=zsize, height=zsize)
        self.redraw()

    # ----------------------------
    # Frame indexing and extraction
    # ----------------------------
    def frame_rect(self, idx):
        r = int(self.rows.get())
        c = int(self.cols.get())
        col = idx % c
        row = idx // c
        x0 = col * self.cell_w
        y0 = row * self.cell_h
        return (x0, y0, x0 + self.cell_w, y0 + self.cell_h)

    def extract_frame(self, idx):
        x0, y0, x1, y1 = self.frame_rect(idx)
        return self.sheet.crop((x0, y0, x1, y1))

    def compose_preview_sheet(self):
        """Return a new PIL image of the sheet after applying offsets (and options)."""
        if self.sheet is None:
            return None

        r = int(self.rows.get())
        c = int(self.cols.get())
        out = Image.new("RGBA", self.sheet.size, (0, 0, 0, 0))

        for idx in range(r * c):
            cell = self.extract_frame(idx)

            # Optionally trim and paste back (keeps within cell)
            if self.auto_trim.get():
                trimmed, _bbox = trim_to_alpha(cell)
                src = trimmed
            else:
                src = cell

            dx, dy = self.offsets[idx]
            # When trimmed, we start at (0,0) of cell. If not trimmed, shifting moves full cell.
            # To always shift the visible content, we keep it simple: alpha-composite with offset.
            # For non-trim, shifting full cell still works because transparent area moves too.
            cell_out = paste_with_offset(self.cell_w, self.cell_h, src, dx, dy)

            x0, y0, _, _ = self.frame_rect(idx)
            out.alpha_composite(cell_out, (x0, y0))

        return out

    # ----------------------------
    # Drawing
    # ----------------------------
    def redraw(self):
        self.canvas.delete("all")
        self.zoom_canvas.delete("all")

        if self.sheet is None:
            return

        # Preview: apply offsets for display (non-destructive)
        preview = self.compose_preview_sheet()
        if preview is None:
            return

        # Fit preview to canvas
        cw = max(1, self.canvas.winfo_width())
        ch = max(1, self.canvas.winfo_height())
        pw, ph = preview.size

        scale = min(cw / pw, ch / ph)
        disp_w = max(1, int(pw * scale))
        disp_h = max(1, int(ph * scale))
        disp = preview.resize((disp_w, disp_h), Image.NEAREST)

        self._tk_sheet_img = ImageTk.PhotoImage(disp)
        self.canvas.create_image(0, 0, anchor="nw", image=self._tk_sheet_img)

        # Grid and highlight
        if self.show_grid.get():
            self._draw_sheet_grid(scale, disp_w, disp_h)

        idx = int(self.frame_idx.get())
        x0, y0, x1, y1 = self.frame_rect(idx)
        hx0 = int(x0 * scale)
        hy0 = int(y0 * scale)
        hx1 = int(x1 * scale)
        hy1 = int(y1 * scale)
        self.canvas.create_rectangle(hx0, hy0, hx1, hy1, outline="#00ff9a", width=2)

        # Update offset entries
        dx, dy = self.offsets[idx]
        self.dx_var.set(dx)
        self.dy_var.set(dy)

        # Zoom cell view
        cell = self.extract_frame(idx)
        if self.auto_trim.get():
            cell, _ = trim_to_alpha(cell)

        # Apply offset to cell for zoom view as well
        dx, dy = self.offsets[idx]
        cell_disp = paste_with_offset(self.cell_w, self.cell_h, cell, dx, dy)

        zw = max(1, self.zoom_canvas.winfo_width())
        zh = max(1, self.zoom_canvas.winfo_height())
        scale_z = min(zw / self.cell_w, zh / self.cell_h)
        zimg = cell_disp.resize((max(1, int(self.cell_w * scale_z)), max(1, int(self.cell_h * scale_z))), Image.NEAREST)
        self._tk_zoom_img = ImageTk.PhotoImage(zimg)
        self.zoom_canvas.create_image(0, 0, anchor="nw", image=self._tk_zoom_img)

        if self.show_grid.get():
            self._draw_zoom_grid(*zimg.size)

        # Baseline marker (bottom line of cell)
        self.zoom_canvas.create_line(0, zimg.size[1]-1, zimg.size[0], zimg.size[1]-1, fill="#888")

    # ----------------------------
    # Mouse interactions
    # ----------------------------
    def _canvas_to_sheet_xy(self, x, y):
        # Map canvas coordinates to sheet coordinates based on current fit scaling.
        if self.sheet is None:
            return None

        cw = max(1, self.canvas.winfo_width())
        ch = max(1, self.canvas.winfo_height())
        pw, ph = self.sheet.size
        scale = min(cw / pw, ch / ph)
        # We draw at (0,0) with no centering; so direct scale
        sx = int(x / scale)
        sy = int(y / scale)
        return sx, sy, scale

    def on_click(self, event):
        if self.sheet is None:
            return
        self.stop_playback()
        mapped = self._canvas_to_sheet_xy(event.x, event.y)
        if not mapped:
            return
        sx, sy, _scale = mapped

        r = int(self.rows.get())
        c = int(self.cols.get())
        col = clamp(sx // self.cell_w, 0, c - 1)
        row = clamp(sy // self.cell_h, 0, r - 1)
        idx = row * c + col
        self.frame_idx.set(idx)

        # Prepare drag
        self.dragging = True
        self.drag_start = (event.x, event.y)
        self.offset_start = self.offsets[idx]
        self.redraw()

    def on_drag(self, event):
        if not self.dragging or self.sheet is None:
            return
        idx = int(self.frame_idx.get())

        mapped0 = self._canvas_to_sheet_xy(self.drag_start[0], self.drag_start[1])
        mapped1 = self._canvas_to_sheet_xy(event.x, event.y)
        if not mapped0 or not mapped1:
            return
        _sx0, _sy0, scale = mapped0
        # Convert pixel drag in canvas to sheet pixels
        dx_canvas = event.x - self.drag_start[0]
        dy_canvas = event.y - self.drag_start[1]
        dx_sheet = int(round(dx_canvas / scale))
        dy_sheet = int(round(dy_canvas / scale))

        ox0, oy0 = self.offset_start
        self.offsets[idx] = (ox0 + dx_sheet, oy0 + dy_sheet)
        self.redraw()

    def on_release(self, _event):
        self.dragging = False

    # ----------------------------
    # Offset controls
    # ----------------------------
    def set_offset_from_entries(self):
        if self.sheet is None:
            return
        idx = int(self.frame_idx.get())
        try:
            dx = int(self.dx_var.get())
            dy = int(self.dy_var.get())
        except Exception:
            messagebox.showerror("Error", "dx/dy must be integers.")
            return
        self.offsets[idx] = (dx, dy)
        self.redraw()

    def nudge(self, dx, dy):
        if self.sheet is None:
            return
        self.stop_playback()
        idx = int(self.frame_idx.get())
        ox, oy = self.offsets[idx]
        self.offsets[idx] = (ox + dx, oy + dy)
        self.redraw()

    def reset_offset(self):
        if self.sheet is None:
            return
        idx = int(self.frame_idx.get())
        self.offsets[idx] = (0, 0)
        self.redraw()

    def reset_all_offsets(self):
        if self.sheet is None:
            return
        r = int(self.rows.get())
        c = int(self.cols.get())
        self.offsets = [(0, 0) for _ in range(r * c)]
        self.redraw()

    def _focus_is_entry(self):
        widget = self.focus_get()
        return isinstance(widget, tk.Entry)

    def nudge_from_shortcut(self, dx, dy, event):
        if self._focus_is_entry():
            return None
        self.nudge(dx, dy)
        return "break"

    def _playback_delay_ms(self):
        try:
            fps = int(self.playback_fps.get())
        except Exception:
            fps = 0
        fps = clamp(fps, 1, 60)
        self.playback_fps.set(fps)
        return max(1, int(round(1000 / fps)))

    def toggle_playback(self, _event=None):
        if _event is not None and self._focus_is_entry():
            return None
        if self.sheet is None or not self.offsets:
            return "break"
        if self.is_playing:
            self.stop_playback()
        else:
            self.start_playback()
        return "break"

    def start_playback(self):
        if self.sheet is None or not self.offsets:
            return
        self.stop_playback()
        self.is_playing = True
        self.play_button.configure(text="Pause")
        self._schedule_next_frame()

    def stop_playback(self):
        if self.playback_job is not None:
            self.after_cancel(self.playback_job)
            self.playback_job = None
        self.is_playing = False
        if hasattr(self, "play_button"):
            self.play_button.configure(text="Play")

    def _schedule_next_frame(self):
        if not self.is_playing:
            return
        self.playback_job = self.after(self._playback_delay_ms(), self._advance_playback_frame)

    def _advance_playback_frame(self):
        if not self.is_playing or not self.offsets:
            return
        frame_count = len(self.offsets)
        next_idx = (int(self.frame_idx.get()) + 1) % frame_count
        self.frame_idx.set(next_idx)
        self.redraw()
        self._schedule_next_frame()

    def copy_current_cell(self, _event=None):
        if _event is not None and self._focus_is_entry():
            return None
        if self.sheet is None:
            return "break"

        idx = int(self.frame_idx.get())
        self.copied_cell = (self.extract_frame(idx).copy(), self.offsets[idx])
        return "break"

    def paste_into_current_cell(self, _event=None):
        if _event is not None and self._focus_is_entry():
            return None
        if self.sheet is None or self.copied_cell is None:
            return "break"

        cell_img, offset = self.copied_cell
        if cell_img.size != (self.cell_w, self.cell_h):
            messagebox.showerror("Paste frame", "Copied frame size does not match the current grid cell size.")
            return "break"

        idx = int(self.frame_idx.get())
        x0, y0, _, _ = self.frame_rect(idx)
        self.sheet.paste(cell_img, (x0, y0))
        self.offsets[idx] = offset
        self.redraw()
        return "break"

    # ----------------------------
    # Auto-baseline alignment
    # ----------------------------
    def do_auto_baseline_all(self):
        """
        Align all frames so the bottom-most non-transparent pixel lands on the same Y inside the cell.
        This fixes "vertical jitter" across frames if the splash rises/falls relative to baseline.
        """
        if self.sheet is None:
            return

        r = int(self.rows.get())
        c = int(self.cols.get())
        n = r * c

        bottoms = []
        for idx in range(n):
            cell = self.extract_frame(idx)
            bbox = bbox_of_alpha(cell)
            if bbox is None:
                bottoms.append(None)
            else:
                # bbox = (left, top, right, bottom_exclusive)
                bottoms.append(bbox[3])  # bottom_exclusive in cell coords

        valid = [b for b in bottoms if b is not None]
        if not valid:
            messagebox.showwarning("Auto-baseline", "No non-transparent pixels found in any frame.")
            return

        target_bottom = max(valid)  # place everyone to the lowest bottom among frames
        for idx in range(n):
            b = bottoms[idx]
            if b is None:
                continue
            ox, oy = self.offsets[idx]
            dy = target_bottom - b
            self.offsets[idx] = (ox, oy + dy)

        self.redraw()

    # ----------------------------
    # Export
    # ----------------------------
    def export_png(self):
        self.stop_playback()
        if self.sheet is None:
            return

        out_img = self.compose_preview_sheet()
        if out_img is None:
            return

        # If user wants baseline alignment as a mode: apply it before export (non-destructive approach)
        # Here, if auto_baseline checkbox is on, we run baseline all once for export.
        if self.auto_baseline.get():
            # Temporarily compute and apply baseline shifts to a copy of offsets
            saved_offsets = list(self.offsets)
            self.do_auto_baseline_all()
            out_img = self.compose_preview_sheet()
            self.offsets = saved_offsets
            self.redraw()

        initial = "fixed.png"
        if self.sheet_path:
            root, _ = os.path.splitext(self.sheet_path)
            initial = root + "_fixed.png"

        path = filedialog.asksaveasfilename(
            title="Save fixed sprite sheet",
            defaultextension=".png",
            initialfile=os.path.basename(initial),
            filetypes=[("PNG images", "*.png")]
        )
        if not path:
            return

        try:
            out_img.save(path, "PNG")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save:\n{e}")
            return

        messagebox.showinfo("Saved", f"Saved:\n{path}")

if __name__ == "__main__":
    app = SpriteSheetEditor()
    app.mainloop()
