import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import text

from .routes import games, users, partners
from .database import engine, Base

# Ждем готовности базы данных
print("Waiting for database to be ready...")
max_attempts = 10
attempt = 0
while attempt < max_attempts:
    try:
        # Пробуем подключиться к базе данных
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database is ready!")
        break
    except Exception as e:
        attempt += 1
        print(f"Attempt {attempt}/{max_attempts}: Database not ready yet... ({e})")
        time.sleep(3)
else:
    print("Could not connect to database after multiple attempts. Exiting.")
    exit(1)

# Create tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")

app = FastAPI(title="Game Platform API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for avatars
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routes
app.include_router(games.router)
app.include_router(users.router)
app.include_router(partners.router)

@app.get("/")
async def root():
    return {"message": "Game Platform API", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    print("\n" + "="*50)
    print("ЗАРЕГИСТРИРОВАННЫЕ МАРШРУТЫ:")
    print("="*50)
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"{route.methods} {route.path}")
    print("="*50 + "\n")