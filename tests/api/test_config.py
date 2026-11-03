"""Settings URL normalization (deploy): accept bare postgres:// URLs."""

from app import config as config_module


def test_bare_postgres_scheme_is_normalized_to_psycopg(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@host:5432/db")
    s = config_module.Settings()
    assert s.database_url == "postgresql+psycopg://u:p@host:5432/db"


def test_driverless_postgresql_scheme_is_normalized(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@host:5432/db")
    s = config_module.Settings()
    assert s.database_url == "postgresql+psycopg://u:p@host:5432/db"


def test_explicit_driver_and_sqlite_are_untouched(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@host:5432/db")
    assert config_module.Settings().database_url == "postgresql+psycopg://u:p@host:5432/db"
    monkeypatch.setenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    assert config_module.Settings().database_url == "sqlite+pysqlite:///:memory:"


def test_migration_url_prefers_direct_and_normalizes(monkeypatch):
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        monkeypatch.setenv("DATABASE_URL", "postgres://u:p@host:5432/db")
        monkeypatch.setenv("DATABASE_URL_UNPOOLED", "postgresql://u:p@direct:5432/db")
        s = config_module.Settings()
        # Direct (unpooled) wins, and the bare scheme is normalized.
        assert s.migration_database_url == "postgresql+psycopg://u:p@direct:5432/db"
    finally:
        get_settings.cache_clear()
