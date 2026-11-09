"""Verify the complete project backup without touching the working tree or user data."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile


def verify(directory: Path):
    manifest = json.loads((directory / "manifest.json").read_text())
    for name, expected in manifest["sha256"].items():
        with (directory / name).open("rb") as source:
            actual = hashlib.file_digest(source, "sha256").hexdigest()
        if actual != expected:
            raise ValueError(f"Prüfsumme stimmt nicht: {name}")

    bundle = directory / "mystyle-0.17.0-history.bundle"
    archive = directory / "mystyle-0.17.0-source.tar.gz"
    with tempfile.TemporaryDirectory(prefix="mystyle-backup-check-") as temporary:
        restored = Path(temporary) / "restored"
        subprocess.run(
            ["git", "clone", "--quiet", "--no-checkout", str(bundle), str(restored)],
            check=True,
        )

        def git(*args):
            return subprocess.check_output(["git", "-C", str(restored), *args])

        baseline = manifest["baseline"]
        if git("rev-parse", "HEAD").decode().strip() != baseline:
            raise ValueError("Das Git-Bundle hat einen anderen Ausgangsstand.")
        git("bundle", "verify", str(bundle))
        git("fsck", "--full", "--no-progress")
        files = git("ls-tree", "-r", "--name-only", baseline).decode().splitlines()
        if len(files) != manifest["files_verified"]:
            raise ValueError("Die Anzahl der Projektdateien stimmt nicht.")
        with tarfile.open(archive) as source:
            members = [member for member in source.getmembers() if member.isfile()]
            expected_names = {f"mystyle/{name}" for name in files}
            if len(members) != len(files) or {m.name for m in members} != expected_names:
                raise ValueError("Das Quellarchiv enthält andere Projektdateien.")
            for name in files:
                with source.extractfile(f"mystyle/{name}") as archived:
                    if archived.read() != git("show", f"{baseline}:{name}"):
                        raise ValueError(f"Archivdatei weicht von Git ab: {name}")
    print(f"Sicherung geprüft: {len(files)} Dateien bytegleich, Git-Historie intakt.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "directory",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "design/backups/full-0.17.0",
    )
    verify(parser.parse_args().directory.resolve())
