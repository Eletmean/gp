from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

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

# Эндпоинты для игр пользователя (требуют авторизацию)
@router.get("/my-games/", response_model=List[schemas.UserGameResponse])
def get_my_games(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить игры текущего пользователя"""
    user_games = db.query(models.UserGame).filter(
        models.UserGame.user_id == current_user.id
    ).all()
    
    result = []
    for ug in user_games:
        game = db.query(models.Game).filter(models.Game.id == ug.game_id).first()
        result.append(schemas.UserGameResponse(
            id=ug.id,
            game_id=ug.game_id,
            user_id=ug.user_id,
            hours_played=ug.hours_played,
            created_at=ug.created_at,
            game=game,
            game_name=game.name if game else "",
            game_image_url=game.image_url if game else None
        ))
    
    return result

@router.post("/my-games/", response_model=schemas.UserGameResponse, status_code=status.HTTP_201_CREATED)
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
        game_id=user_game.game_id,
        hours_played=user_game.hours_played if user_game.hours_played else 0
    )
    
    db.add(db_user_game)
    db.commit()
    db.refresh(db_user_game)
    
    # Загружаем связанную игру
    db_user_game.game = game
    
    return schemas.UserGameResponse(
        id=db_user_game.id,
        game_id=db_user_game.game_id,
        user_id=db_user_game.user_id,
        hours_played=db_user_game.hours_played,
        created_at=db_user_game.created_at,
        game=game,
        game_name=game.name,
        game_image_url=game.image_url
    )

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
    
    if user_game_update.hours_played is not None:
        db_user_game.hours_played = user_game_update.hours_played
    
    db.commit()
    db.refresh(db_user_game)
    
    game = db.query(models.Game).filter(models.Game.id == db_user_game.game_id).first()
    
    return schemas.UserGameResponse(
        id=db_user_game.id,
        game_id=db_user_game.game_id,
        user_id=db_user_game.user_id,
        hours_played=db_user_game.hours_played,
        created_at=db_user_game.created_at,
        game=game,
        game_name=game.name if game else "",
        game_image_url=game.image_url if game else None
    )

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

# Публичный эндпоинт для получения игр пользователя по ID (для страницы партнера)
@router.get("/user/{user_id}/games", response_model=List[schemas.UserGameResponse])
def get_user_games_by_id(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    """
    Получить игры конкретного пользователя по ID (публичный эндпоинт)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_games = db.query(models.UserGame).filter(
        models.UserGame.user_id == user_id
    ).all()
    
    result = []
    for ug in user_games:
        game = db.query(models.Game).filter(models.Game.id == ug.game_id).first()
        result.append(schemas.UserGameResponse(
            id=ug.id,
            game_id=ug.game_id,
            user_id=ug.user_id,
            hours_played=ug.hours_played,
            created_at=ug.created_at,
            game=game,
            game_name=game.name if game else "",
            game_image_url=game.image_url if game else None
        ))
    
    return result