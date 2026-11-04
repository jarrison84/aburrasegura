"""
Regenera data/processed/medellin_incidents.db a partir de data/processed/medellin_incidents_clean.csv.
Útil cuando el CSV crudo o la base de datos llegan como punteros de Git LFS sin descargar.
También repara la codificación del texto y reescribe el CSV limpio.
"""

import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from clean_and_preprocess import PROCESSED_DIR, normalize_text_columns, save_sqlite


def rebuild():
    csv_path = os.path.join(PROCESSED_DIR, "medellin_incidents_clean.csv")
    print(f"Leyendo dataset limpio desde: {csv_path}")
    df = pd.read_csv(csv_path, dtype={"radicado": str}, encoding="utf-8")
    df = normalize_text_columns(df)

    save_sqlite(df, os.path.join(PROCESSED_DIR, "medellin_incidents.db"))
    df.to_csv(csv_path, index=False, encoding="utf-8")
    print(f"CSV limpio reescrito: {csv_path}")

    print("\nRegistros por gravedad:")
    print(df["gravedad"].value_counts().to_string())


if __name__ == "__main__":
    rebuild()
