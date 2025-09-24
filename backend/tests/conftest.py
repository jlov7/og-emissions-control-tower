from __future__ import annotations

import shutil
from pathlib import Path
from typing import Iterator

import pytest

from app.store import DataStore


@pytest.fixture()
def temp_store(tmp_path_factory: pytest.TempPathFactory) -> Iterator[DataStore]:
    """Provide an isolated DataStore backed by copied CSV fixtures."""
    base_data_dir = Path(__file__).resolve().parents[1] / "data"
    working_dir = tmp_path_factory.mktemp("data-store")
    shutil.copytree(base_data_dir, working_dir, dirs_exist_ok=True)
    store = DataStore(working_dir)
    yield store
