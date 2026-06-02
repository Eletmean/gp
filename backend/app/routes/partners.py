from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/api/partners", tags=["partners"])

# ========== СПЕЦИФИЧНЫЕ МАРШРУТЫ (ДОЛЖНЫ ИДТИ ПЕРВЫМИ) ==========

@router.get("/friend-requests")
def get_friend_requests(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить входящие запросы в друзья"""
    print(f"Получение запросов для пользователя {current_user.id}")
    
    requests = db.query(models.Friend).filter(
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).all()
    
    print(f"Найдено запросов: {len(requests)}")
    
    result = []
    for req in requests:
        sender = db.query(models.User).filter(models.User.id == req.user_id).first()
        
        if not sender:
            continue
        
        avatar_url = "/static/default-avatar.png"
        if sender.profile and sender.profile.avatar:
            avatar_url = sender.profile.avatar
        
        bio = ""
        if sender.profile and sender.profile.bio:
            bio = sender.profile.bio
        
        result.append({
            "id": req.id,
            "user_id": str(req.user_id),
            "friend_id": str(req.friend_id),
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "updated_at": req.updated_at.isoformat() if req.updated_at else None,
            "user": {
                "id": str(sender.id),
                "username": sender.username,
                "first_name": sender.first_name,
                "bio": bio,
                "avatar": avatar_url,
                "favorite_game": sender.favorite_game,
                "is_friend": False,
                "friendship_status": None
            }
        })
    
    print(f"Возвращаем {len(result)} запросов")
    return result


@router.post("/friend-requests/{request_id}/accept")
def accept_friend_request(
    request_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Принять запрос в друзья"""
    try:
        print(f"Принятие запроса {request_id} для пользователя {current_user.id}")
        
        friend_request = db.query(models.Friend).filter(
            models.Friend.id == request_id,
            models.Friend.friend_id == current_user.id,
            models.Friend.status == "pending"
        ).first()
        
        if not friend_request:
            raise HTTPException(status_code=404, detail="Запрос в друзья не найден")
        
        friend_request.status = "accepted"
        db.commit()
        
        return {"message": "Запрос в друзья принят"}
    except Exception as e:
        print(f"Ошибка при принятии запроса: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/friend-requests/{request_id}/reject")
def reject_friend_request(
    request_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Отклонить запрос в друзья"""
    friend_request = db.query(models.Friend).filter(
        models.Friend.id == request_id,
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Запрос в друзья не найден")
    
    db.delete(friend_request)
    db.commit()
    
    return {"message": "Запрос в друзья отклонен"}


# ========== ОБЩИЕ МАРШРУТЫ (ИДУТ ПОТОМ) ==========

@router.get("/", response_model=List[schemas.PartnerUser])
def get_partners(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Получить список всех пользователей (партнеров)"""
    print(f"GET /api/partners/ - current_user: {current_user.email if current_user else 'None'}")
    
    query = db.query(models.User).filter(models.User.is_active == True)
    
    if current_user:
        query = query.filter(models.User.id != current_user.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.User.first_name.ilike(search_term),
                models.User.username.ilike(search_term)
            )
        )
    
    users = query.offset(skip).limit(limit).all()
    print(f"Найдено пользователей: {len(users)}")
    
    result = []
    for user in users:
        avatar_url = "/static/default-avatar.png"
        if user.profile and user.profile.avatar:
            avatar_url = user.profile.avatar
        
        bio = ""
        if user.profile and user.profile.bio:
            bio = user.profile.bio
        
        is_friend = False
        friendship_status = None
        
        if current_user:
            friendship = db.query(models.Friend).filter(
                ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user.id)) |
                ((models.Friend.user_id == user.id) & (models.Friend.friend_id == current_user.id))
            ).first()
            
            if friendship:
                friendship_status = friendship.status
                if friendship.status == 'accepted':
                    is_friend = True
        
        partner_data = schemas.PartnerUser(
            id=str(user.id),
            username=user.username,
            first_name=user.first_name,
            bio=bio,
            avatar=avatar_url,
            favorite_game=user.favorite_game,
            is_friend=is_friend,
            friendship_status=friendship_status
        )
        result.append(partner_data)
    
    return result


@router.get("/{user_id}", response_model=schemas.PartnerProfile)
def get_partner_profile(
    user_id: UUID,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Получить детальную информацию о партнере"""
    user = db.query(models.User).filter(
        models.User.id == user_id, 
        models.User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    avatar_url = "/static/default-avatar.png"
    if user.profile and user.profile.avatar:
        avatar_url = user.profile.avatar
    
    bio = ""
    if user.profile and user.profile.bio:
        bio = user.profile.bio
    
    is_friend = False
    friendship_status = None
    
    if current_user:
        friendship = db.query(models.Friend).filter(
            ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user.id)) |
            ((models.Friend.user_id == user.id) & (models.Friend.friend_id == current_user.id))
        ).first()
        
        if friendship:
            friendship_status = friendship.status
            if friendship.status == 'accepted':
                is_friend = True
    
    partner_user = schemas.PartnerUser(
        id=str(user.id),
        username=user.username,
        first_name=user.first_name,
        bio=bio,
        avatar=avatar_url,
        favorite_game=user.favorite_game,
        is_friend=is_friend,
        friendship_status=friendship_status
    )
    
    friends_count = db.query(models.Friend).filter(
        ((models.Friend.user_id == user.id) | (models.Friend.friend_id == user.id)) &
        (models.Friend.status == "accepted")
    ).count()
    
    # Используем UserGameSchema для игр
    user_games = []
    for ug in user.user_games:
        user_games.append(schemas.UserGameSchema(
            id=ug.id,
            game_id=ug.game_id,
            game_name=ug.game.name,
            game_image_url=ug.game.image_url,
            hours_played=ug.hours_played,
            created_at=ug.created_at
        ))
    
    return schemas.PartnerProfile(
        user=partner_user,
        friends_count=friends_count,
        games_count=len(user.user_games),
        games=user_games,
        is_friend=is_friend,
        friendship_status=friendship_status
    )


@router.post("/{user_id}/friend-request", status_code=status.HTTP_201_CREATED)
def send_friend_request(
    user_id: UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Отправить запрос в друзья"""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя отправить запрос самому себе")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    existing = db.query(models.Friend).filter(
        ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user_id)) |
        ((models.Friend.user_id == user_id) & (models.Friend.friend_id == current_user.id))
    ).first()
    
    if existing:
        if existing.status == 'rejected':
            existing.status = 'pending'
            db.commit()
            return {"message": "Запрос в друзья отправлен", "request_id": existing.id}
        elif existing.status == 'pending':
            raise HTTPException(status_code=400, detail="Запрос в друзья уже отправлен")
        else:
            raise HTTPException(status_code=400, detail="Вы уже друзья")
    
    friend_request = models.Friend(
        user_id=current_user.id,
        friend_id=user_id,
        status="pending"
    )
    db.add(friend_request)
    db.commit()
    db.refresh(friend_request)
    
    return {"message": "Запрос в друзья отправлен", "request_id": friend_request.id}


@router.delete("/{user_id}/friend")
def remove_friend(
    user_id: UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить из друзей"""
    friendship = db.query(models.Friend).filter(
        ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user_id)) |
        ((models.Friend.user_id == user_id) & (models.Friend.friend_id == current_user.id)),
        models.Friend.status == "accepted"
    ).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Дружба не найдена")
    
    db.delete(friendship)
    db.commit()
    
    return {"message": "Пользователь удален из друзей"}


@router.get("/{user_id}/friends", response_model=List[schemas.PartnerUser])
def get_user_friends(
    user_id: UUID,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Получить список друзей пользователя"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    friendships = db.query(models.Friend).filter(
        ((models.Friend.user_id == user_id) | (models.Friend.friend_id == user_id)) &
        (models.Friend.status == "accepted")
    ).all()
    
    friends = []
    for friendship in friendships:
        if friendship.user_id == user_id:
            friend = db.query(models.User).filter(models.User.id == friendship.friend_id).first()
        else:
            friend = db.query(models.User).filter(models.User.id == friendship.user_id).first()
        
        if friend:
            avatar_url = "/static/default-avatar.png"
            if friend.profile and friend.profile.avatar:
                avatar_url = friend.profile.avatar
            
            bio = ""
            if friend.profile and friend.profile.bio:
                bio = friend.profile.bio
            
            friend_data = schemas.PartnerUser(
                id=str(friend.id),
                username=friend.username,
                first_name=friend.first_name,
                bio=bio,
                avatar=avatar_url,
                favorite_game=friend.favorite_game,
                is_friend=True,
                friendship_status="accepted"
            )
            friends.append(friend_data)
    
    return friends