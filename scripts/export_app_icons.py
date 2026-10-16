"""Export the approved artwork. Requires Python 3 and Pillow (design tooling only)."""

import base64
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/app-icon/platinum-master.png"
PUBLIC = ROOT / "public"


def main():
    with Image.open(SOURCE) as image:
        master = image.convert("RGB")
    exports = []
    for name, legacy, size, inset in [
        ("apple-touch-icon-platinum.png", "apple-touch-icon.png", 180, 0),
        ("icon-platinum-192.png", "icon-192.png", 192, 0),
        ("icon-platinum-512.png", "icon-512.png", 512, 0),
        ("icon-platinum-maskable.png", "icon-maskable.png", 512, 0.1),
    ]:
        artwork_size = round(size * (1 - inset * 2))
        artwork = master.resize((artwork_size, artwork_size), Image.Resampling.LANCZOS)
        output = Image.new("RGB", (size, size), master.getpixel((0, 0)))
        offset = (size - artwork_size) // 2
        output.paste(artwork, (offset, offset))
        output.save(PUBLIC / name, optimize=True)
        # Keep earlier manifest/icon addresses working for existing installations.
        (PUBLIC / legacy).write_bytes((PUBLIC / name).read_bytes())
        exports.append({
            "file": f"public/{name}",
            "legacyAlias": f"public/{legacy}",
            "size": f"{size}x{size}",
            "opaque": True,
            "artworkInset": inset,
            "sha256": hashlib.sha256((PUBLIC / name).read_bytes()).hexdigest(),
        })

    # Retain the old SVG URL using the actual approved artwork, not the old mark.
    png = base64.b64encode((PUBLIC / "icon-platinum-192.png").read_bytes()).decode()
    (PUBLIC / "icon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">'
        f'<image width="192" height="192" href="data:image/png;base64,{png}"/>'
        '</svg>\n'
    )
    (ROOT / "design/app-icon/exports.json").write_text(
        json.dumps({"source": "platinum-master.png", "exports": exports}, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
