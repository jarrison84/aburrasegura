"""
Importa el dataset histórico de incidentes viales de Medellín 2008–2025 (702.540 registros)
publicado en Mendeley Data (Correa Álvarez et al., 2026, CC BY 4.0, doi:10.17632/r6g5dfnpgh.1)
a la tabla `incidents_historico` de data/processed/medellin_incidents.db.

La tabla `incidents` (MEData 2014–2020) no se modifica: la usan el mapa, los benchmarks y los informes.
"""

import io
import os
import sqlite3
import sys
import urllib.request
import zipfile
import hashlib

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from clean_and_preprocess import CLASE_ALIASES, PROCESSED_DIR, SEVERITY_MAP, SIN_COMUNA

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_PATH = os.path.join(BASE_DIR, "data", "raw", "mendeley_2008_2025", "dataset.zip")
ZIP_URL = (
    "https://data.mendeley.com/public-files/datasets/r6g5dfnpgh/files/"
    "e992c888-5819-40c6-9538-41980ea1d429/file_downloaded"
)
ZIP_SHA256 = "7c5dbdc6aa81942d605dfc5235d8c03b412c5b97a31f646cb6d4352976eae706"
XLSX_NAME = "Medellin_Road_Traffic_Fatalities_Dataset_2008_2025/Fatal_Road_Traffic.xlsx"
TABLE = "incidents_historico"

GRAVEDAD_MAP = {
    "SOLO DAÑOS": "SOLO DAÑOS",
    "HERIDO": "CON HERIDOS",
    "MUERTO": "CON MUERTOS",
}


def ensure_zip():
    if not os.path.exists(ZIP_PATH):
        os.makedirs(os.path.dirname(ZIP_PATH), exist_ok=True)
        print(f"Descargando dataset histórico desde Mendeley Data: {ZIP_URL}")
        urllib.request.urlretrieve(ZIP_URL, ZIP_PATH)

    sha = hashlib.sha256()
    with open(ZIP_PATH, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(chunk)
    if sha.hexdigest() != ZIP_SHA256:
        raise RuntimeError(f"Checksum inesperado para {ZIP_PATH}: {sha.hexdigest()}")


def load_raw():
    with zipfile.ZipFile(ZIP_PATH) as z:
        data = z.read(XLSX_NAME)
    print("Leyendo Excel (≈90 s)...")
    df = pd.read_excel(io.BytesIO(data))
    df.columns = [
        "llave", "anio", "fecha", "hora", "clase", "gravedad", "direccion",
        "latitud", "longitud", "comuna_codigo", "comuna_nombre", "barrio_codigo", "barrio",
    ]
    return df


def transform(df):
    out = pd.DataFrame()
    out["radicado"] = df["llave"].astype(str)
    out["fecha"] = pd.to_datetime(df["fecha"]).dt.strftime("%Y-%m-%d")
    out["anio"] = df["anio"].astype(int)
    out["mes"] = pd.to_datetime(df["fecha"]).dt.month.astype(int)
    out["hora"] = df["hora"].astype(str).str.slice(0, 8)
    out["clase_accidente"] = df["clase"].astype(str).str.strip().str.upper().replace(CLASE_ALIASES)
    out["gravedad"] = df["gravedad"].astype(str).str.strip().str.upper().map(GRAVEDAD_MAP).fillna("SOLO DAÑOS")
    out["factor_riesgo"] = out["gravedad"].map(lambda g: SEVERITY_MAP.get(g, 1.0))

    codigo = pd.to_numeric(df["comuna_codigo"], errors="coerce")
    out["comuna_codigo"] = codigo.fillna(0).astype(int)
    out["comuna_nombre"] = df["comuna_nombre"].where(codigo.notna(), SIN_COMUNA).astype(str).str.strip()

    barrio = df["barrio"].astype("string").str.strip()
    out["barrio"] = barrio.where(~barrio.isin(["Sin inf", "N/D", "0"]) & barrio.notna(), "DESCONOCIDO")
    out["direccion"] = df["direccion"].fillna("").astype(str).str.strip()
    out["latitud"] = df["latitud"]
    out["longitud"] = df["longitud"]
    return out


def save(df):
    db_path = os.path.join(PROCESSED_DIR, "medellin_incidents.db")
    print(f"Guardando {len(df):,} registros en {db_path} (tabla {TABLE})")
    conn = sqlite3.connect(db_path)
    df.to_sql(TABLE, conn, if_exists="replace", index=False)
    cur = conn.cursor()
    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_hist_anio ON {TABLE} (anio);")
    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_hist_comuna ON {TABLE} (comuna_codigo);")
    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_hist_gravedad ON {TABLE} (gravedad);")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    ensure_zip()
    data = transform(load_raw())
    save(data)
    print("\nRegistros por año:")
    print(data["anio"].value_counts().sort_index().to_string())
    print("\nRegistros por gravedad:")
    print(data["gravedad"].value_counts().to_string())
