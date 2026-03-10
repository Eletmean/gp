from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(prefix="/api/user-games", tags=["user games"])

@router.get("/", response_model=List[schemas.UserGameResponse])
def get_user_games(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить все игры текущего пользователя"""
    return current_user.user_games

@router.post("/", response_model=schemas.UserGameResponse, status_code=status.HTTP_201_CREATED)
def add_user_game(
    game_data: schemas.UserGameCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавить игру пользователю"""
    # Проверяем, существует ли игра
    game = db.query(models.Game).filter(models.Game.id == game_data.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Проверяем, не добавлена ли уже эта игра
    existing = db.query(models.UserGame).filter(
        models.UserGame.user_id == current_user.id,
        models.UserGame.game_id == game_data.game_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Game already added")
    
    # Создаем запись
    user_game = models.UserGame(
        user_id=current_user.id,
        game_id=game_data.game_id,
        hours_played=game_data.hours_played or 0
    )
    db.add(user_game)
    db.commit()
    db.refresh(user_game)
    return user_game

@router.put("/{user_game_id}", response_model=schemas.UserGameResponse)
def update_user_game(
    user_game_id: int,
    game_update: schemas.UserGameUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить информацию об игре пользователя (часы и т.д.)"""
    user_game = db.query(models.UserGame).filter(
        models.UserGame.id == user_game_id,
        models.UserGame.user_id == current_user.id
    ).first()
    
    if not user_game:
        raise HTTPException(status_code=404, detail="Game not found in user's list")
    
    if game_update.hours_played is not None:
        user_game.hours_played = game_update.hours_played
    
    db.commit()
    db.refresh(user_game)
    return user_game

@router.delete("/{user_game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_game(
    user_game_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить игру из списка пользователя"""
    user_game = db.query(models.UserGame).filter(
        models.UserGame.id == user_game_id,
        models.UserGame.user_id == current_user.id
    ).first()
    
    if not user_game:
        raise HTTPException(status_code=404, detail="Game not found in user's list")
    
    db.delete(user_game)
    db.commit()
    return None

@router.get("/users/{user_id}", response_model=List[schemas.UserGameResponse])
def get_user_games_by_id(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """Получить игры конкретного пользователя по ID"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user.user_games