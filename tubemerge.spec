# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller multi-platform build specification for TubeMerge.

Supports:
- Windows: Standalone .exe / installer bundle with assets/logo.ico
- macOS: Standalone Mach-O .app bundle with com.tubemerge.desktop identifier
- Linux: Standalone ELF executable / AppImage target
"""

import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_all

block_cipher = None

ROOT_DIR = SPECPATH

# Platform-specific icon selection
if sys.platform.startswith("win"):
    app_icon = os.path.join(ROOT_DIR, "assets", "logo.ico")
elif sys.platform == "darwin":
    icns_path = os.path.join(ROOT_DIR, "assets", "logo.icns")
    app_icon = icns_path if os.path.exists(icns_path) else os.path.join(ROOT_DIR, "assets", "logo.png")
else:
    app_icon = os.path.join(ROOT_DIR, "assets", "logo.png")

datas = [
    (os.path.join(ROOT_DIR, "frontend", "dist"), os.path.join("frontend", "dist")),
    (os.path.join(ROOT_DIR, "assets"), "assets"),
]

hidden_imports = [
    # Uvicorn ASGI internals
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    # TubeMerge modular packages
    "tubemerge",
    "tubemerge.app",
    "tubemerge.core",
    "tubemerge.core.settings",
    "tubemerge.core.config",
    "tubemerge.server",
    "tubemerge.server.app",
    "tubemerge.db",
    "tubemerge.db.connection",
    "tubemerge.apps",
    "tubemerge.apps.binaries",
    "tubemerge.apps.binaries.routes",
    "tubemerge.apps.binaries.services",
    "tubemerge.apps.playlists",
    "tubemerge.apps.playlists.routes",
    "tubemerge.apps.playlists.services",
    "tubemerge.apps.merger",
    "tubemerge.apps.merger.routes",
    "tubemerge.apps.merger.services",
    "tubemerge.apps.merger.services.engine",
    "tubemerge.apps.merger.services.normalizer",
    "tubemerge.apps.merger.services.stitcher",
    "tubemerge.apps.merger.controllers",
    "tubemerge.apps.merger.controllers.merge_controller",
    "tubemerge.apps.system",
    "tubemerge.apps.system.routes",
    "tubemerge.apps.system.services",
    "tubemerge.apps.history",
    "tubemerge.apps.history.routes",
    "tubemerge.apps.history.services",
    "tubemerge.apps.queues",
    "tubemerge.apps.queues.routes",
    "tubemerge.apps.queues.services",
    "tubemerge.apps.telemetry",
    "tubemerge.apps.telemetry.service",
    "tubemerge.utils",
    "tubemerge.utils.file_system",
    "tubemerge.utils.process",
    # Third party engines
    "httpx",
    "pywebview",
]

binaries = []

# Collect Uvicorn full modules
try:
    uv_datas, uv_binaries, uv_hidden = collect_all("uvicorn")
    datas += uv_datas
    binaries += uv_binaries
    hidden_imports += uv_hidden
except Exception:
    pass

# Collect PyWebView full platform modules, assets, and backends
try:
    wv_datas, wv_binaries, wv_hidden = collect_all("webview")
    datas += wv_datas
    binaries += wv_binaries
    hidden_imports += wv_hidden
except Exception:
    pass

# Windows-specific native WinForms / WebView2 bindings
if sys.platform.startswith("win"):
    try:
        clr_datas, clr_binaries, clr_hidden = collect_all("clr")
        datas += clr_datas
        binaries += clr_binaries
        hidden_imports += clr_hidden
    except Exception:
        pass

    windows_gui_hidden = [
        "clr",
        "pythonnet",
        "webview.platforms.winforms",
        "webview.platforms.edgechromium",
        "webview.platforms.win32",
        "asyncio.windows_events",
    ]
    hidden_imports.extend(windows_gui_hidden)

# macOS-specific native Cocoa / WebKit PyObjC bindings
if sys.platform == "darwin":
    try:
        objc_datas, objc_binaries, objc_hidden = collect_all("objc")
        datas += objc_datas
        binaries += objc_binaries
        hidden_imports += objc_hidden
    except Exception:
        pass

    try:
        webkit_datas, webkit_binaries, webkit_hidden = collect_all("WebKit")
        datas += webkit_datas
        binaries += webkit_binaries
        hidden_imports += webkit_hidden
    except Exception:
        pass

    macos_gui_hidden = [
        "objc",
        "Foundation",
        "AppKit",
        "WebKit",
        "Quartz",
        "webview.platforms.cocoa",
    ]
    hidden_imports.extend(macos_gui_hidden)

# Linux-specific native GTK3 / WebKit2 GObject Introspection bindings
if sys.platform.startswith("linux"):
    try:
        gi_datas, gi_binaries, gi_hidden = collect_all("gi")
        datas += gi_datas
        binaries += gi_binaries
        hidden_imports += gi_hidden
    except Exception:
        pass

    linux_gui_hidden = [
        "gi",
        "gi.repository",
        "gi.repository.Gtk",
        "gi.repository.Gdk",
        "gi.repository.GLib",
        "gi.repository.GObject",
        "gi.repository.Gio",
        "gi.repository.WebKit2",
        "webview.platforms.gtk",
        "webview.platforms.qt",
    ]
    hidden_imports.extend(linux_gui_hidden)

a = Analysis(
    ["main.py"],
    pathex=[ROOT_DIR, os.path.join(ROOT_DIR, "src")],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "scipy",
        "numpy",
        "IPython",
        "notebook",
        "test",
        "unittest",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="TubeMerge",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=app_icon,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="TubeMerge",
)

# macOS Application Bundle (.app)
if sys.platform == "darwin":
    app = BUNDLE(
        coll,
        name="TubeMerge.app",
        icon=app_icon,
        bundle_identifier="com.tubemerger.desktop",
        info_plist={
            "NSHighResolutionCapable": True,
            "LSBackgroundOnly": False,
            "CFBundleName": "TubeMerge",
            "CFBundleDisplayName": "TubeMerge",
            "CFBundleIdentifier": "com.tubemerger.desktop",
            "CFBundleVersion": "1.1.0",
            "CFBundleShortVersionString": "1.1.0",

            "NSDownloadsFolderUsageDescription": "TubeMerger needs access to save downloaded videos to your Downloads folder.",
            "NSDesktopFolderUsageDescription": "TubeMerger needs access to save downloaded videos to your Desktop.",
            "NSMoviesFolderUsageDescription": "TubeMerger needs access to save downloaded videos to your Movies folder.",
            "NSAppTransportSecurity": {
                "NSAllowsLocalNetworking": True,
                "NSAllowsArbitraryLoads": True,
            },
            "NSRequiresAquaSystemAppearance": False,
        },
    )

