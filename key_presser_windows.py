#!/usr/bin/env python3
"""
Window-targeted key presser for Windows.

- Lists open windows and lets you pick a target.
- Press F8 to toggle: sends Numpad 4 every 0.5s to the target window.
- Key presses go directly to the target window (no focus stealing).
- Press Ctrl+C in the terminal to exit.

Install dependencies:
    pip install keyboard pywin32
"""

import sys
import time
import threading

try:
    import win32gui
    import win32api
    import win32con
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install pywin32")
    sys.exit(1)

# --- Config ---
PRESS_VK  = 0x64   # Virtual-key code for Numpad 4
INTERVAL  = 0.5    # Seconds between presses

# --- State ---
is_running = False
target_hwnd = None
state_lock  = threading.Lock()


def make_lparam(scan_code: int, key_up: bool) -> int:
    """Build the lParam value for WM_KEYDOWN / WM_KEYUP."""
    lp = (scan_code & 0xFF) << 16 | 1
    if key_up:
        lp |= (1 << 31) | (1 << 30)
    return lp


def send_key_to_hwnd(hwnd: int, vk_code: int):
    """Send a key-down + key-up WM_KEY* message to a window by handle."""
    scan = win32api.MapVirtualKey(vk_code, 0)
    win32api.PostMessage(hwnd, win32con.WM_KEYDOWN, vk_code, make_lparam(scan, False))
    win32api.PostMessage(hwnd, win32con.WM_KEYUP,   vk_code, make_lparam(scan, True))


def get_windows():
    """Return sorted list of (title, hwnd) for all visible top-level windows."""
    results = []

    def callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            title = win32gui.GetWindowText(hwnd).strip()
            if title:
                results.append((title, hwnd))

    win32gui.EnumWindows(callback, None)
    return sorted(results, key=lambda x: x[0].lower())


def pressing_loop():
    """Background thread: fires Numpad 4 every INTERVAL seconds while active."""
    while True:
        with state_lock:
            active = is_running
            hwnd   = target_hwnd

        if active and hwnd:
            try:
                send_key_to_hwnd(hwnd, PRESS_VK)
            except Exception as e:
                print(f"\n[ERROR] Could not send key: {e}")
            time.sleep(INTERVAL)
        else:
            time.sleep(0.05)


def toggle():
    global is_running
    with state_lock:
        is_running = not is_running
    print(f"[{'ON ' if is_running else 'OFF'}] Key pressing {'started' if is_running else 'stopped'}.")


def hotkey_loop():
    """Poll GetAsyncKeyState for F8 — works at kernel level, cannot be blocked by games."""
    VK_F8 = 0x77
    was_pressed = False
    while True:
        pressed = bool(win32api.GetAsyncKeyState(VK_F8) & 0x8000)
        if pressed and not was_pressed:
            toggle()
        was_pressed = pressed
        time.sleep(0.05)


def select_target():
    """Interactive numbered list to pick a target window. Type 'r' to refresh."""
    while True:
        windows = get_windows()
        print("\nOpen windows:")
        for i, (title, hwnd) in enumerate(windows, 1):
            print(f"  {i:3}. {title:<55} HWND: {hwnd}")
        print("\n  [r] Refresh list")

        try:
            raw = input("\nEnter the number of the target window: ").strip().lower()
            if raw == 'r':
                print("\nRefreshing...")
                continue
            idx = int(raw) - 1
            if 0 <= idx < len(windows):
                return windows[idx]
            print(f"  Please enter a number between 1 and {len(windows)}.")
        except ValueError:
            print("  Please enter a valid number or 'r' to refresh.")
        except KeyboardInterrupt:
            print("\nCancelled.")
            sys.exit(0)


def main():
    global target_hwnd

    print("╔══════════════════════════════════════╗")
    print("║     Window-Targeted Key Presser      ║")
    print("╚══════════════════════════════════════╝")
    print(f"  Target key : Numpad 4  (every {INTERVAL}s)")
    print(f"  Toggle key : F8  (start / stop)")
    print(f"  Exit       : Ctrl+C\n")

    title, hwnd = select_target()
    target_hwnd = hwnd
    print(f"\nTarget locked: {title}  (HWND {hwnd})")
    print(f"Press F8 to start. Press F8 again to stop.\n")

    # Background pressing thread
    t = threading.Thread(target=pressing_loop, daemon=True)
    t.start()

    # Hotkey polling thread — uses GetAsyncKeyState, cannot be blocked by games
    h = threading.Thread(target=hotkey_loop, daemon=True)
    h.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nExiting.")


if __name__ == "__main__":
    main()
