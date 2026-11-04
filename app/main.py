"""
Servidor Principal FastAPI — Proyecto Análisis de Algoritmos (PPI Tecnológico de Antioquia).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_router import api_v1_router

app = FastAPI(
    title="Movilidad Segura Medellín — API de Análisis de Algoritmos",
    description="""
    Motor computacional para benchmarking de algoritmos de ordenamiento, indexación espacial con KD-Tree, 
    agrupamiento geodésico con DBSCAN y enrutamiento multiobjetivo en grafos (Dijkstra y A*).
    Proyecto Pedagógico Integrador (PPI) - Tecnológico de Antioquia.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración CORS para consumo desde Vite / React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)


@app.get("/", tags=["General"])
def root():
    return {
        "project": "Movilidad Segura Medellín — Análisis de Algoritmos PPI",
        "institution": "Tecnológico de Antioquia",
        "docs": "/docs",
        "status": "online"
    }


@app.get("/health", tags=["General"])
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
