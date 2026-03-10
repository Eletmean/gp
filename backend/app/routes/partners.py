from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(prefix="/api/partners", tags=["partners"])

@router.get("/", response_model=List[schemas.PartnerUser])
def get_partners(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Получить список всех пользователей (партнеров) - ПОЛНОСТЬЮ ПУБЛИЧНЫЙ ЭНДПОИНТ
    """
    print(f"🔵 GET /api/partners/ - публичный запрос")
    
    # Базовый запрос - только активные пользователи
    query = db.query(models.User).filter(models.User.is_active == True)
    
    # Поиск по имени, фамилии или username
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.User.first_name.ilike(search_term),
                models.User.last_name.ilike(search_term),
                models.User.username.ilike(search_term)
            )
        )
    
    # Пагинация
    users = query.offset(skip).limit(limit).all()
    print(f"📊 Найдено пользователей: {len(users)}")
    
    result = []
    for user in users:
        # Получаем аватар из профиля если есть
        avatar_url = "/static/default-avatar.png"
        if user.profile and user.profile.avatar:
            avatar_url = user.profile.avatar
        elif hasattr(user, 'avatar') and user.avatar:
            avatar_url = user.avatar
            
        # Получаем bio из профиля если есть
        bio = ""
        if user.profile and user.profile.bio:
            bio = user.profile.bio
        elif hasattr(user, 'bio') and user.bio:
            bio = user.bio
        
        # Создаем PartnerUser из модели User
        partner_data = schemas.PartnerUser(
            id=str(user.id),
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            bio=bio,
            avatar=avatar_url,
            favorite_game=user.favorite_game,
            is_friend=False,  # Для неавторизованных всегда False
            friendship_status=None
        )
        result.append(partner_data)
    
    return result

@router.get("/{user_id}", response_model=schemas.PartnerProfile)
def get_partner_profile(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Получить детальную информацию о партнере - ПУБЛИЧНЫЙ ЭНДПОИНТ
    """
    user = db.query(models.User).filter(
        models.User.id == user_id, 
        models.User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Получаем аватар из профиля если есть
    avatar_url = "/static/default-avatar.png"
    if user.profile and user.profile.avatar:
        avatar_url = user.profile.avatar
    elif hasattr(user, 'avatar') and user.avatar:
        avatar_url = user.avatar
        
    # Получаем bio из профиля если есть
    bio = ""
    if user.profile and user.profile.bio:
        bio = user.profile.bio
    elif hasattr(user, 'bio') and user.bio:
        bio = user.bio
    
    # Создаем объект партнера
    partner_user = schemas.PartnerUser(
        id=str(user.id),
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        bio=bio,
        avatar=avatar_url,
        favorite_game=user.favorite_game,
        is_friend=False,
        friendship_status=None
    )
    
    # Получаем количество друзей
    friends_count = db.query(models.Friend).filter(
        ((models.Friend.user_id == user.id) | (models.Friend.friend_id == user.id)) &
        (models.Friend.status == "accepted")
    ).count()
    
    # Получаем игры пользователя
    user_games = []
    for ug in user.user_games:
        user_games.append(schemas.UserGameResponse(
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
        is_friend=False,
        friendship_status=None
    )

@router.post("/{user_id}/friend-request", status_code=status.HTTP_201_CREATED)
def send_friend_request(
    user_id: UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Отправить запрос в друзья (ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ)
    """
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя отправить запрос самому себе")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Проверяем, есть ли уже существующая связь
    existing = db.query(models.Friend).filter(
        ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user_id)) |
        ((models.Friend.user_id == user_id) & (models.Friend.friend_id == current_user.id))
    ).first()
    
    if existing:
        # Если связь существует и её статус 'rejected', обновляем на 'pending'
        if existing.status == 'rejected':
            existing.status = 'pending'
            existing.updated_at = db.func.now()
            db.commit()
            return {"message": "Запрос в друзья отправлен", "request_id": existing.id}
        else:
            # Если статус 'pending' или 'accepted' - возвращаем ошибку
            raise HTTPException(status_code=400, detail="Запрос в друзья уже существует")
    
    # Если связи нет, создаем новую
    friend_request = models.Friend(
        user_id=current_user.id,
        friend_id=user_id,
        status="pending"
    )
    db.add(friend_request)
    db.commit()
    
    return {"message": "Запрос в друзья отправлен", "request_id": friend_request.id}

@router.get("/friend-requests", response_model=List[schemas.FriendResponse])
def get_friend_requests(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить входящие запросы в друзья (ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ)
    """
    print(f"🔵 Получение запросов для пользователя {current_user.id}")
    print(f"🔵 Email пользователя: {current_user.email}")
    
    # Ищем запросы, где текущий пользователь - получатель (friend_id)
    requests = db.query(models.Friend).filter(
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).all()
    
    print(f"📊 Найдено запросов в БД: {len(requests)}")
    
    for req in requests:
        print(f"  - Запрос ID: {req.id}, отправитель: {req.user_id}")
    
    result = []
    for req in requests:
        sender = db.query(models.User).filter(models.User.id == req.user_id).first()
        
        if not sender:
            print(f"❌ Отправитель не найден для user_id: {req.user_id}")
            continue
            
        print(f"✅ Найден отправитель: {sender.username}")
        
        # Получаем аватар отправителя
        avatar_url = "/static/default-avatar.png"
        if sender.profile and sender.profile.avatar:
            avatar_url = sender.profile.avatar
        elif hasattr(sender, 'avatar') and sender.avatar:
            avatar_url = sender.avatar
        
        # Получаем bio отправителя
        bio = ""
        if sender.profile and sender.profile.bio:
            bio = sender.profile.bio
        elif hasattr(sender, 'bio') and sender.bio:
            bio = sender.bio
        
        # Создаем объект PartnerUser для отправителя
        sender_partner = schemas.PartnerUser(
            id=str(sender.id),
            username=sender.username,
            first_name=sender.first_name,
            last_name=sender.last_name,
            bio=bio,
            avatar=avatar_url,
            favorite_game=sender.favorite_game,
            is_friend=False,
            friendship_status="pending"
        )
        
        # Создаем FriendResponse
        req_data = schemas.FriendResponse(
            id=req.id,
            user_id=req.user_id,
            friend_id=req.friend_id,
            status=req.status,
            created_at=req.created_at,
            updated_at=req.updated_at,
            user=sender_partner,
            friend=None
        )
        result.append(req_data)
    
    print(f"📦 Возвращаем {len(result)} запросов")
    return result

@router.post("/friend-requests/{request_id}/accept")
def accept_friend_request(
    request_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Принять запрос в друзья (ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ)
    """
    friend_request = db.query(models.Friend).filter(
        models.Friend.id == request_id,
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Запрос в друзья не найден")
    
    friend_request.status = "accepted"
    friend_request.updated_at = db.func.now()
    db.commit()
    
    return {"message": "Запрос в друзья принят"}

@router.post("/friend-requests/{request_id}/reject")
def reject_friend_request(
    request_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Отклонить запрос в друзья (ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ)
    """
    friend_request = db.query(models.Friend).filter(
        models.Friend.id == request_id,
        models.Friend.friend_id == current_user.id,
        models.Friend.status == "pending"
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Запрос в друзья не найден")
    
    friend_request.status = "rejected"
    friend_request.updated_at = db.func.now()
    db.commit()
    
    return {"message": "Запрос в друзья отклонен"}

@router.delete("/{user_id}/friend")
def remove_friend(
    user_id: UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Удалить из друзей (ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ)
    """
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
    db: Session = Depends(get_db)
):
    """
    Получить список друзей пользователя (публичный)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Получаем все принятые дружеские связи
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
            # Получаем аватар из профиля
            avatar_url = "/static/default-avatar.png"
            if friend.profile and friend.profile.avatar:
                avatar_url = friend.profile.avatar
            elif hasattr(friend, 'avatar') and friend.avatar:
                avatar_url = friend.avatar
            
            # Получаем bio из профиля
            bio = ""
            if friend.profile and friend.profile.bio:
                bio = friend.profile.bio
            elif hasattr(friend, 'bio') and friend.bio:
                bio = friend.bio
            
            friend_data = schemas.PartnerUser(
                id=str(friend.id),
                username=friend.username,
                first_name=friend.first_name,
                last_name=friend.last_name,
                bio=bio,
                avatar=avatar_url,
                favorite_game=friend.favorite_game,
                is_friend=True,
                friendship_status="accepted"
            )
            friends.append(friend_data)
    
    return friends