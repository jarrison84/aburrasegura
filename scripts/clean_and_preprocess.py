"""
ETL de Incidentes Viales de Medellín.
Almacena resultados en:
1. Base de datos SQLite indexada: data/processed/medellin_incidents.db
2. Archivo CSV comprimido y plano: data/processed/medellin_incidents_clean.csv
3. Particiones de benchmark: data/benchmarks/bench_{1k,10k,50k,100k,500k,1m}.csv
"""

import os
import re
import sqlite3
import pandas as pd
import numpy as np

# Configuración de rutas y parámetros
RAW_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw", "incidentes_viales.csv")
# Directorio de salida para los datos procesados
PROCESSED_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "processed")
# Directorio de salida para los archivos de benchmark
BENCHMARKS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "benchmarks")

# Aca definimos el area de interes, este caso es medellin, para filtrar los datos que no correspondan a esta ciudad (Bounding Box)
MEDELLIN_BBOX = {
    "min_lat": 6.150000,
    "max_lat": 6.380000,
    "min_lon": -75.700000,
    "max_lon": -75.480000,
}

# Mapeo de gravedad a factor de riesgo
SEVERITY_MAP = {
    "SOLO DAÑOS": 1.0,
    "CON HERIDOS": 3.0,
    "CON MUERTOS": 10.0,
}

TEXT_COLUMNS = ["clase_accidente", "gravedad", "comuna_nombre", "barrio", "diseno"]

# Variantes de la misma clase de accidente que aparecen en el dataset de origen
CLASE_ALIASES = {
    "CAÍDA OCUPANTE": "CAIDA OCUPANTE",
    "CAÍDA DE OCUPANTE": "CAIDA OCUPANTE",
}


# Repara texto con codificación dañada: escapes literales (Bel\xE9n), UTF-8 leído como
# latin1 (DAÃ±OS) y bytes líderes UTF-8 perdidos (CA�\xadDA)
def fix_text(value):
    if not isinstance(value, str):
        return value
    s = re.sub(r"\\[xX]([0-9a-fA-F]{2})", lambda m: chr(int(m.group(1), 16)), value)
    if "Ã" in s or "Â" in s:
        try:
            s = s.encode("latin1").decode("utf-8")
        except UnicodeError:
            pass
    s = re.sub(r"�([\x80-\xbf])", lambda m: bytes([0xC3, ord(m.group(1))]).decode("utf-8"), s)
    return s


SIN_COMUNA = "Sin información"
# Valores de comuna del dataset de origen que no identifican ninguna comuna
COMUNA_INVALIDA = {"In", "SN", "0", "AU", "Sin Inf", "No Georef", "DESCONOCIDA", ""}


# Completa nombre desde código y código desde nombre usando el par más frecuente
def normalize_communes(df):
    validos = df[~df["comuna_nombre"].isin(COMUNA_INVALIDA) & (df["comuna_codigo"] > 0)]
    pares = validos.groupby(["comuna_nombre", "comuna_codigo"]).size().reset_index(name="n")
    pares = pares.sort_values("n", ascending=False)
    codigo_por_nombre = pares.drop_duplicates("comuna_nombre").set_index("comuna_nombre")["comuna_codigo"]
    nombre_por_codigo = pares.drop_duplicates("comuna_codigo").set_index("comuna_codigo")["comuna_nombre"]

    invalido = df["comuna_nombre"].isin(COMUNA_INVALIDA)
    df.loc[invalido, "comuna_nombre"] = df.loc[invalido, "comuna_codigo"].map(nombre_por_codigo)
    df["comuna_nombre"] = df["comuna_nombre"].fillna(SIN_COMUNA)

    sin_codigo = df["comuna_codigo"] == 0
    df.loc[sin_codigo, "comuna_codigo"] = df.loc[sin_codigo, "comuna_nombre"].map(codigo_por_nombre).fillna(0).astype(int)
    df.loc[df["comuna_nombre"] == SIN_COMUNA, "comuna_codigo"] = 0
    return df


def normalize_text_columns(df):
    for col in TEXT_COLUMNS:
        df[col] = df[col].map(fix_text)
    df["gravedad"] = df["gravedad"].str.upper()
    df["clase_accidente"] = df["clase_accidente"].str.upper().replace(CLASE_ALIASES)
    df["factor_riesgo"] = df["gravedad"].map(lambda g: SEVERITY_MAP.get(g, 1.0))
    return normalize_communes(df)


# Guarda el dataset en SQLite con los índices que usa la API
def save_sqlite(df_final, sqlite_path):
    print(f"Guardando {len(df_final):,} registros en base de datos SQLite: {sqlite_path}")
    if os.path.exists(sqlite_path):
        os.remove(sqlite_path)
    conn = sqlite3.connect(sqlite_path)
    df_final.to_sql("incidents", conn, if_exists="replace", index=False)
    cur = conn.cursor()
    cur.execute("CREATE INDEX IF NOT EXISTS idx_incidents_anio ON incidents (anio);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_incidents_comuna ON incidents (comuna_codigo);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_incidents_gravedad ON incidents (gravedad);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_incidents_coords ON incidents (latitud, longitud);")
    conn.commit()
    conn.close()
    print("Índices de SQLite creados exitosamente.")


# Función para parsear la ubicación, es decir, extraer latitud y longitud de la columna LOCATION
def parse_location(loc_str):
    if pd.isna(loc_str):
        return None, None
    try:
        nums = re.findall(r"[-+]?\d*\.\d+|\d+", str(loc_str))
        if len(nums) >= 2:
            lon = float(nums[0])
            lat = float(nums[1])
            if lat < 0 and lon > 0:
                lat, lon = lon, lat
            return lat, lon
    except Exception:
        pass
    return None, None

# Función principal del pipeline de limpieza y preprocesamiento
def clean_pipeline():
    # Crear directorios de salida si no existen
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(BENCHMARKS_DIR, exist_ok=True)

    print(f"Leyendo dataset crudo desde: {RAW_PATH}")
    df = pd.read_csv(RAW_PATH, encoding="latin1", low_memory=False)
    initial_count = len(df)
    print(f"Total registros crudos leídos: {initial_count:,}")

    # Normalizar nombres de columnas
    clean_cols = []
    for c in df.columns:
        c_clean = str(c).strip()
        if c_clean.startswith("A") and c_clean.endswith("O") and len(c_clean) <= 6:
            c_clean = "ANO"
        elif "DISE" in c_clean:
            c_clean = "DISENO"
        clean_cols.append(c_clean)
    df.columns = clean_cols

    # 1. Parsear coordenadas
    coords = [parse_location(x) for x in df["LOCATION"]]
    df["latitud"] = [c[0] for c in coords]
    df["longitud"] = [c[1] for c in coords]

    # 2. Filtrado por Bounding Box de Medellín
    valid_mask = (
        df["latitud"].notna() &
        df["longitud"].notna() &
        (df["latitud"] >= MEDELLIN_BBOX["min_lat"]) &
        (df["latitud"] <= MEDELLIN_BBOX["max_lat"]) &
        (df["longitud"] >= MEDELLIN_BBOX["min_lon"]) &
        (df["longitud"] <= MEDELLIN_BBOX["max_lon"])
    )
    df_clean = df[valid_mask].copy()
    valid_count = len(df_clean)
    print(f"Registros tras filtrado geoespacial en Bounding Box de Medellín: {valid_count:,} ({valid_count/initial_count*100:.1f}%)")

    # 3. Normalizar columnas
    df_clean["radicado"] = df_clean["NRO_RADICADO"].astype(str)
    df_clean["fecha_parsed"] = pd.to_datetime(df_clean["FECHA_ACCIDENTE"], errors="coerce", dayfirst=True)

    anio_fallback = pd.to_numeric(df_clean["ANO"], errors="coerce").fillna(2020).astype(int)
    df_clean["anio"] = df_clean["fecha_parsed"].dt.year.fillna(anio_fallback).astype(int)
    mes_fallback = pd.to_numeric(df_clean["MES"], errors="coerce").fillna(1).astype(int)
    df_clean["mes"] = df_clean["fecha_parsed"].dt.month.fillna(mes_fallback).astype(int)
    df_clean["hora"] = df_clean["fecha_parsed"].dt.strftime("%H:%M:%S").fillna("12:00:00")
    df_clean["fecha"] = df_clean["fecha_parsed"].dt.strftime("%Y-%m-%d").fillna("2020-01-01")

    df_clean["clase_accidente"] = df_clean["CLASE_ACCIDENTE"].fillna("OTRO").astype(str).str.strip().str.upper()
    df_clean["gravedad"] = df_clean["GRAVEDAD_ACCIDENTE"].fillna("SOLO DAÑOS").astype(str).str.strip().str.upper()
    df_clean["factor_riesgo"] = df_clean["gravedad"].map(lambda g: SEVERITY_MAP.get(g, 1.0))

    df_clean["comuna_codigo"] = pd.to_numeric(df_clean["NUMCOMUNA"], errors="coerce").fillna(0).astype(int)
    df_clean["comuna_nombre"] = df_clean["COMUNA"].fillna("DESCONOCIDA").astype(str).str.strip()
    df_clean["barrio"] = df_clean["BARRIO"].fillna("DESCONOCIDO").astype(str).str.strip()
    df_clean["diseno"] = df_clean["DISENO"].fillna("Tramo de via").astype(str).str.strip()

    cols_export = [
        "radicado", "fecha", "anio", "mes", "hora",
        "clase_accidente", "gravedad", "factor_riesgo",
        "comuna_codigo", "comuna_nombre", "barrio", "diseno",
        "latitud", "longitud"
    ]
    df_final = normalize_text_columns(df_clean[cols_export].copy())

    # Guardar en SQLite nativo de alto rendimiento
    save_sqlite(df_final, os.path.join(PROCESSED_DIR, "medellin_incidents.db"))

    # Guardar CSV maestro
    out_csv = os.path.join(PROCESSED_DIR, "medellin_incidents_clean.csv")
    df_final.to_csv(out_csv, index=False)
    print(f"Dataset maestro guardado en CSV: {out_csv} ({os.path.getsize(out_csv)/(1024*1024):.2f} MB)")

    # 4. Generación de particiones para benchmarks (1K, 10K, 50K, 100K, 500K, 1M)
    print("\n--- Generando particiones de benchmark ---")
    sizes = [1000, 10000, 50000, 100000, 500000, 1000000]

    for n in sizes:
        label = f"{n//1000}k" if n < 1000000 else "1m"
        bench_file = os.path.join(BENCHMARKS_DIR, f"bench_{label}.csv")
        if n <= len(df_final):
            sub = df_final.sample(n, random_state=42).copy()
        else:
            repeats = int(np.ceil(n / len(df_final)))
            oversampled = pd.concat([df_final] * repeats, ignore_index=True).iloc[:n].copy()
            np.random.seed(42)
            noise_lat = np.random.normal(0, 0.00015, n)
            noise_lon = np.random.normal(0, 0.00015, n)
            oversampled["latitud"] = (oversampled["latitud"] + noise_lat).clip(MEDELLIN_BBOX["min_lat"], MEDELLIN_BBOX["max_lat"])
            oversampled["longitud"] = (oversampled["longitud"] + noise_lon).clip(MEDELLIN_BBOX["min_lon"], MEDELLIN_BBOX["max_lon"])
            sub = oversampled

        sub.to_csv(bench_file, index=False)
        print(f"Partición {n:,} registros guardada: {bench_file} ({os.path.getsize(bench_file) / (1024*1024):.2f} MB)")

    print("\nPipeline de limpieza, base de datos SQLite y benchmarks completado")


if __name__ == "__main__":
    clean_pipeline()
