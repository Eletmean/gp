import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import text

from .routes import games, users, partners, user_games, posts
from .routes import donations  # ДОБАВИТЬ импорт donations
from .database import engine, Base

# Ждем готовности базы данных
print("Waiting for database to be ready...")
max_attempts = 10
attempt = 0
while attempt < max_attempts:
    try:
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

# ВРЕМЕННО: Разрешаем все источники CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
os.makedirs("static/avatars", exist_ok=True)
os.makedirs("static/posts", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routes
app.include_router(games.router)
app.include_router(users.router)
app.include_router(partners.router)
app.include_router(user_games.router)
app.include_router(posts.router)
app.include_router(donations.router)  # ДОБАВИТЬ регистрацию роутера donations

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