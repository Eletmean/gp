from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/games", tags=["games"])

# Публичные эндпоинты для игр
@router.get("/", response_model=List[schemas.Game])
def get_games(skip: int = 0, limit: int = 100, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Получить список всех игр"""
    query = db.query(models.Game)
    if search:
        query = query.filter(models.Game.name.ilike(f"%{search}%"))
    games = query.offset(skip).limit(limit).all()
    return games

@router.get("/{game_id}", response_model=schemas.Game)
def get_game(game_id: int, db: Session = Depends(get_db)):
    """Получить игру по ID"""
    game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

# Админские эндпоинты (можно добавить проверку на админа позже)
@router.post("/", response_model=schemas.Game, status_code=status.HTTP_201_CREATED)
def create_game(game: schemas.GameCreate, db: Session = Depends(get_db)):
    """Создать новую игру (только для админов)"""
    db_game = models.Game(**game.model_dump())
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db_game

@router.put("/{game_id}", response_model=schemas.Game)
def update_game(game_id: int, game_update: schemas.GameUpdate, db: Session = Depends(get_db)):
    """Обновить игру (только для админов)"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    for key, value in game_update.model_dump(exclude_unset=True).items():
        setattr(db_game, key, value)
    
    db.commit()
    db.refresh(db_game)
    return db_game

@router.delete("/{game_id}")
def delete_game(game_id: int, db: Session = Depends(get_db)):
    """Удалить игру (только для админов)"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    db.delete(db_game)
    db.commit()
    return {"message": "Game deleted successfully"}

# Эндпоинты для игр пользователя
@router.get("/my-games/", response_model=List[schemas.UserGameResponse])
def get_my_games(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить игры текущего пользователя"""
    user_games = db.query(models.UserGame).filter(
        models.UserGame.user_id == current_user.id
    ).all()
    return user_games

@router.post("/my-games/", response_model=schemas.UserGameResponse)
def add_game_to_user(
    user_game: schemas.UserGameCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавить игру пользователю"""
    # Проверяем существование игры
    game = db.query(models.Game).filter(models.Game.id == user_game.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Проверяем, не добавлена ли уже игра
    existing = db.query(models.UserGame).filter(
        models.UserGame.user_id == current_user.id,
        models.UserGame.game_id == user_game.game_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Game already added to user")
    
    db_user_game = models.UserGame(
        user_id=current_user.id,
        **user_game.model_dump()
    )
    
    db.add(db_user_game)
    db.commit()
    db.refresh(db_user_game)
    
    # Загружаем связанную игру
    db_user_game.game = game
    
    return db_user_game

@router.put("/my-games/{user_game_id}", response_model=schemas.UserGameResponse)
def update_user_game(
    user_game_id: int,
    user_game_update: schemas.UserGameUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить информацию об игре пользователя"""
    db_user_game = db.query(models.UserGame).filter(
        models.UserGame.id == user_game_id,
        models.UserGame.user_id == current_user.id
    ).first()
    
    if not db_user_game:
        raise HTTPException(status_code=404, detail="User game not found")
    
    for key, value in user_game_update.model_dump(exclude_unset=True).items():
        setattr(db_user_game, key, value)
    
    db.commit()
    db.refresh(db_user_game)
    
    # Загружаем связанную игру
    db_user_game.game = db.query(models.Game).filter(
        models.Game.id == db_user_game.game_id
    ).first()
    
    return db_user_game

@router.delete("/my-games/{user_game_id}")
def remove_user_game(
    user_game_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить игру у пользователя"""
    db_user_game = db.query(models.UserGame).filter(
        models.UserGame.id == user_game_id,
        models.UserGame.user_id == current_user.id
    ).first()
    
    if not db_user_game:
        raise HTTPException(status_code=404, detail="User game not found")
    
    db.delete(db_user_game)
    db.commit()
    
    return {"message": "Game removed from user successfully"}