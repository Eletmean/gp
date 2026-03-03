from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/partners", tags=["partners"])

# ========== ПУБЛИЧНЫЕ ЭНДПОИНТЫ (не требуют авторизации) ==========

@router.get("/", response_model=List[schemas.PartnerUser])
def get_partners(
    skip: int = 0, 
    limit: int = 20,
    game: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Получение списка всех зарегистрированных пользователей
    """
    # Берем ВСЕХ пользователей
    query = db.query(models.User)
    
    # Фильтр по любимой игре если указан
    if game:
        query = query.filter(models.User.favorite_game.ilike(f"%{game}%"))
    
    # Сортировка по дате регистрации (новые сначала)
    query = query.order_by(models.User.date_joined.desc())
    
    partners = query.offset(skip).limit(limit).all()
    
    result = []
    for partner in partners:
        partner_dict = {
            "id": partner.id,
            "email": partner.email,
            "username": partner.username,
            "first_name": partner.first_name,
            "last_name": partner.last_name,
            "bio": partner.bio,
            "avatar": partner.avatar,
            "favorite_game": partner.favorite_game,
            "is_friend": False,
            "friendship_status": None
        }
        result.append(partner_dict)
    
    return result


@router.get("/search", response_model=List[schemas.PartnerUser])
def search_partners(
    query: str,
    db: Session = Depends(get_db)
):
    """
    Поиск по зарегистрированным пользователям
    """
    users = db.query(models.User).filter(
        or_(
            models.User.username.ilike(f"%{query}%"),
            models.User.first_name.ilike(f"%{query}%"),
            models.User.last_name.ilike(f"%{query}%"),
            models.User.email.ilike(f"%{query}%")
        )
    ).limit(20).all()
    
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "bio": user.bio,
            "avatar": user.avatar,
            "favorite_game": user.favorite_game,
            "is_friend": False,
            "friendship_status": None
        }
        result.append(user_dict)
    
    return result


@router.get("/{user_id}", response_model=schemas.PartnerProfile)
def get_partner_profile(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Получение профиля любого пользователя по ID
    """
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Считаем количество друзей
    friends_count = db.query(models.Friend).filter(
        or_(
            models.Friend.user_id == user.id,
            models.Friend.friend_id == user.id
        ),
        models.Friend.status == "accepted"
    ).count()
    
    # Считаем количество игр пользователя
    games_count = db.query(models.UserGame).filter(models.UserGame.user_id == user.id).count()
    
    user_data = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "bio": user.bio,
        "avatar": user.avatar,
        "favorite_game": user.favorite_game,
        "is_friend": False,
        "friendship_status": None
    }
    
    return {
        "user": user_data,
        "friends_count": friends_count,
        "games_count": games_count,
        "is_friend": False,
        "friendship_status": None
    }


# ========== ЭНДПОИНТЫ ДЛЯ ДРУЗЕЙ (ТРЕБУЮТ АВТОРИЗАЦИЮ) ==========

@router.post("/{user_id}/friend-request")
def send_friend_request(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Отправить запрос в друзья (только для авторизованных)
    """
    try:
        partner_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Нельзя добавить в друзья самого себя
    if current_user.id == partner_uuid:
        raise HTTPException(status_code=400, detail="Cannot add yourself as friend")
    
    # Проверяем, существует ли пользователь
    partner = db.query(models.User).filter(models.User.id == partner_uuid).first()
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверяем существующую дружбу
    existing = db.query(models.Friend).filter(
        or_(
            and_(models.Friend.user_id == current_user.id, models.Friend.friend_id == partner.id),
            and_(models.Friend.user_id == partner.id, models.Friend.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="Already friends")
        elif existing.status == "pending":
            # Проверяем, кто отправил запрос
            if existing.user_id == current_user.id:
                raise HTTPException(status_code=400, detail="Friend request already sent")
            else:
                raise HTTPException(status_code=400, detail="This user already sent you a friend request")
        elif existing.status == "rejected":
            # Можно отправить повторно если было отклонено
            existing.status = "pending"
            existing.updated_at = datetime.utcnow()
            db.commit()
            return {"message": "Friend request sent again"}
    
    # Создаем новый запрос
    friend_request = models.Friend(
        user_id=current_user.id,
        friend_id=partner.id,
        status="pending"
    )
    
    db.add(friend_request)
    db.commit()
    
    return {"message": "Friend request sent successfully"}


@router.get("/requests/received", response_model=List[schemas.FriendRequest])
def get_received_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить входящие запросы в друзья
    """
    requests = db.query(models.Friend).filter(
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).all()
    
    result = []
    for req in requests:
        from_user = db.query(models.User).filter(models.User.id == req.user_id).first()
        result.append({
            "id": req.id,
            "from_user": from_user,
            "to_user": current_user,
            "status": req.status,
            "created_at": req.created_at
        })
    
    return result


@router.get("/requests/sent", response_model=List[schemas.FriendRequest])
def get_sent_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить исходящие запросы в друзья
    """
    requests = db.query(models.Friend).filter(
        models.Friend.user_id == current_user.id,
        models.Friend.status == "pending"
    ).all()
    
    result = []
    for req in requests:
        to_user = db.query(models.User).filter(models.User.id == req.friend_id).first()
        result.append({
            "id": req.id,
            "from_user": current_user,
            "to_user": to_user,
            "status": req.status,
            "created_at": req.created_at
        })
    
    return result


@router.put("/{user_id}/friend-request/accept")
def accept_friend_request(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Принять запрос в друзья
    """
    try:
        requester_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    friend_request = db.query(models.Friend).filter(
        models.Friend.user_id == requester_uuid,
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    friend_request.status = "accepted"
    friend_request.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Friend request accepted"}


@router.put("/{user_id}/friend-request/reject")
def reject_friend_request(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Отклонить запрос в друзья
    """
    try:
        requester_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    friend_request = db.query(models.Friend).filter(
        models.Friend.user_id == requester_uuid,
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    friend_request.status = "rejected"
    friend_request.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Friend request rejected"}


@router.delete("/{user_id}/friend")
def remove_friend(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Удалить пользователя из друзей
    """
    try:
        friend_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    friendship = db.query(models.Friend).filter(
        or_(
            and_(models.Friend.user_id == current_user.id, models.Friend.friend_id == friend_uuid),
            and_(models.Friend.user_id == friend_uuid, models.Friend.friend_id == current_user.id)
        ),
        models.Friend.status == "accepted"
    ).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    db.delete(friendship)
    db.commit()
    
    return {"message": "Friend removed successfully"}


@router.get("/{user_id}/friends", response_model=List[schemas.PartnerUser])
def get_user_friends(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Получить список друзей пользователя (публичный эндпоинт)
    """
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Находим все принятые дружеские связи
    friendships = db.query(models.Friend).filter(
        or_(
            models.Friend.user_id == user.id,
            models.Friend.friend_id == user.id
        ),
        models.Friend.status == "accepted"
    ).all()
    
    friends = []
    for friendship in friendships:
        if friendship.user_id == user.id:
            friend = db.query(models.User).filter(models.User.id == friendship.friend_id).first()
        else:
            friend = db.query(models.User).filter(models.User.id == friendship.user_id).first()
        
        if friend:
            friend_dict = {
                "id": friend.id,
                "email": friend.email,
                "username": friend.username,
                "first_name": friend.first_name,
                "last_name": friend.last_name,
                "bio": friend.bio,
                "avatar": friend.avatar,
                "favorite_game": friend.favorite_game,
                "is_friend": True,
                "friendship_status": "accepted"
            }
            friends.append(friend_dict)
    
    return friends