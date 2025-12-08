from pathlib import Path
import sys

ROOT = Path('.').resolve()
TARGET_EXT = {'.ts', '.tsx', '.py'}

HEADERS = {
    'client-ts': '// License: MIT. See .github/LICENSES/LICENSE_SDK.md\n',
    'react': '// License: MIT. See .github/LICENSES/LICENSE_SDK.md\n',
    'trustmath': '// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md\n',
    'next-auth': '// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md\n',
    'ai-verification': '// License: PolyForm Shield. AI Training Prohibited. See .github/LICENSES/LICENSE_DATA.md\n',
}

def get_package_name(path: Path):
    parts = path.resolve().parts
    for i, p in enumerate(parts):
        if p == 'packages' and i + 1 < len(parts):
            return parts[i+1]
    return None


def file_needs_header(content: str, header: str):
    return header.strip() not in content.split('\n', 5)


def prepend_header(path: Path, header: str):
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        return False
    if not file_needs_header(text, header):
        return False
    new_text = header + text
    path.write_text(new_text, encoding='utf-8')
    return True


def main():
    modified = []
    for f in ROOT.rglob('*'):
        if not f.is_file():
            continue
        if f.suffix.lower() not in TARGET_EXT:
            continue
        pkg = get_package_name(f)
        if not pkg:
            continue
        header = HEADERS.get(pkg)
        if not header:
            continue
        changed = prepend_header(f, header)
        if changed:
            modified.append(str(f))
    print(f"Headers applied to {len(modified)} files")
    for m in modified:
        print(m)
    return 0

if __name__ == '__main__':
    sys.exit(main())
