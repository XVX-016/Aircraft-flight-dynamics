from __future__ import annotations

import ast
from pathlib import Path


def _module_name(repo_root: Path, file_path: Path) -> str:
    rel = file_path.relative_to(repo_root).with_suffix("")
    parts = list(rel.parts)
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def _resolve_from_import(module_name: str, is_package: bool, node: ast.ImportFrom) -> str | None:
    if node.level == 0:
        return node.module
    pkg_parts = module_name.split(".") if is_package else module_name.split(".")[:-1]
    keep = len(pkg_parts) - node.level + 1
    if keep <= 0:
        return None
    base = ".".join(pkg_parts[:keep])
    if not node.module:
        return base
    return f"{base}.{node.module}"


def _iter_imports(module_name: str, file_path: Path) -> list[str]:
    source = file_path.read_text(encoding="utf-8-sig")
    tree = ast.parse(source, filename=str(file_path))
    is_package = file_path.name == "__init__.py"
    imports: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            resolved = _resolve_from_import(module_name, is_package, node)
            if resolved:
                imports.append(resolved)
    return imports


def test_external_layers_import_only_adcs_core_api() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    scan_roots = [repo_root / "backend_api", repo_root / "aircraft_simulator" / "api"]
    violations: list[str] = []

    for root in scan_roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.py")):
            module = _module_name(repo_root, path)
            for imp in _iter_imports(module, path):
                if imp == "adcs_core" or imp == "adcs_core.api" or imp.startswith("adcs_core.api."):
                    continue
                if imp.startswith("adcs_core."):
                    rel = path.relative_to(repo_root)
                    violations.append(f"{module} ({rel}) imports internal core module {imp}")

    assert not violations, "External import boundary violations:\n" + "\n".join(sorted(set(violations)))
