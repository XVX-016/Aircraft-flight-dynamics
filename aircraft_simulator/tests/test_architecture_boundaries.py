from __future__ import annotations

import ast
from pathlib import Path


FORBIDDEN_IMPORTS: dict[str, tuple[str, ...]] = {
    "adcs_core.analysis": ("adcs_core.control",),
    "adcs_core.control": ("adcs_core.analysis",),
    "adcs_core.dynamics": ("adcs_core.analysis", "adcs_core.control"),
}


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


def _belongs_to(module_name: str, package_prefix: str) -> bool:
    return module_name == package_prefix or module_name.startswith(f"{package_prefix}.")


def test_adcs_core_layer_boundaries() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    core_root = repo_root / "adcs_core"
    violations: list[str] = []

    for path in sorted(core_root.rglob("*.py")):
        module = _module_name(repo_root, path)
        imports = _iter_imports(module, path)
        for src_prefix, blocked_prefixes in FORBIDDEN_IMPORTS.items():
            if not _belongs_to(module, src_prefix):
                continue
            for imp in imports:
                for blocked in blocked_prefixes:
                    if _belongs_to(imp, blocked):
                        rel = path.relative_to(repo_root)
                        violations.append(f"{module} ({rel}) imports forbidden {imp} for layer {src_prefix}")

    assert not violations, "Architecture boundary violations:\n" + "\n".join(sorted(set(violations)))
