from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID
import os
import shutil
from datetime import datetime

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/api/posts", tags=["posts"])

# Функция для сохранения изображений
async def save_post_image(image: UploadFile, post_id: int) -> str:
    """Сохранить изображение поста"""
    # Создаем директорию если её нет
    os.makedirs(f"static/posts/{post_id}", exist_ok=True)
    
    # Генерируем имя файла
    file_extension = os.path.splitext(image.filename)[1]
    file_name = f"image_{datetime.utcnow().timestamp()}{file_extension}"
    file_path = f"static/posts/{post_id}/{file_name}"
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    return f"/static/posts/{post_id}/{file_name}"

@router.post("/", response_model=schemas.Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    content: str = Form(..., min_length=1, max_length=5000),
    privacy: str = Form("public"),
    images: List[UploadFile] = File(None),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Создать новый пост
    """
    # Создаем пост
    db_post = models.Post(
        author_id=current_user.id,
        content=content,
        privacy=privacy
    )
    db.add(db_post)
    db.flush()  # Получаем id поста без коммита
    
    # Сохраняем изображения если есть
    if images:
        for image in images:
            if image and image.filename:
                image_url = await save_post_image(image, db_post.id)
                db_image = models.PostImage(
                    post_id=db_post.id,
                    image_url=image_url
                )
                db.add(db_image)
    
    db.commit()
    db.refresh(db_post)
    
    # Загружаем связанные данные
    author_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    # Формируем ответ
    post_data = schemas.Post(
        id=db_post.id,
        author_id=current_user.id,
        author=schemas.PostAuthor(
            id=current_user.id,
            username=current_user.username,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            avatar=author_profile.avatar if author_profile else None
        ),
        content=db_post.content,
        privacy=db_post.privacy,
        images=[schemas.PostImage.model_validate(img) for img in db_post.images],
        comments=[],
        likes=[],
        comments_count=0,
        likes_count=0,
        is_liked=False,
        created_at=db_post.created_at,
        updated_at=db_post.updated_at
    )
    
    return post_data

@router.get("/", response_model=schemas.PostList)
def get_posts(
    page: int = 1,
    per_page: int = 10,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Получить список постов (лента)
    """
    # Базовый запрос
    query = db.query(models.Post)
    
    # Фильтрация по приватности
    if current_user:
        # Авторизованный пользователь видит:
        # - свои посты
        # - публичные посты
        # - посты друзей (privacy='friends')
        friend_ids = [f.friend_id for f in current_user.sent_friends if f.status == 'accepted'] + \
                     [f.user_id for f in current_user.received_friends if f.status == 'accepted']
        
        query = query.filter(
            (models.Post.author_id == current_user.id) |
            (models.Post.privacy == 'public') |
            ((models.Post.privacy == 'friends') & (models.Post.author_id.in_(friend_ids)))
        )
    else:
        # Неавторизованный видит только публичные посты
        query = query.filter(models.Post.privacy == 'public')
    
    # Пагинация
    total = query.count()
    pages = (total + per_page - 1) // per_page
    posts = query.order_by(desc(models.Post.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    
    # Формируем ответ
    result = []
    for post in posts:
        # Получаем автора
        author_profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == post.author_id
        ).first()
        
        # Получаем комментарии
        comments = []
        for comment in post.comments[:3]:  # Показываем только последние 3 комментария
            comment_author = db.query(models.User).filter(models.User.id == comment.author_id).first()
            comment_author_profile = db.query(models.UserProfile).filter(
                models.UserProfile.user_id == comment.author_id
            ).first()
            
            comments.append(schemas.Comment(
                id=comment.id,
                post_id=comment.post_id,
                author_id=comment.author_id,
                author=schemas.CommentAuthor(
                    id=comment_author.id,
                    username=comment_author.username,
                    first_name=comment_author.first_name,
                    last_name=comment_author.last_name,
                    avatar=comment_author_profile.avatar if comment_author_profile else None
                ),
                content=comment.content,
                created_at=comment.created_at,
                updated_at=comment.updated_at
            ))
        
        # Проверяем, лайкнул ли текущий пользователь этот пост
        is_liked = False
        if current_user:
            is_liked = db.query(models.Like).filter(
                models.Like.post_id == post.id,
                models.Like.user_id == current_user.id
            ).first() is not None
        
        result.append(schemas.Post(
            id=post.id,
            author_id=post.author_id,
            author=schemas.PostAuthor(
                id=post.author.id,
                username=post.author.username,
                first_name=post.author.first_name,
                last_name=post.author.last_name,
                avatar=author_profile.avatar if author_profile else None
            ),
            content=post.content,
            privacy=post.privacy,
            images=[schemas.PostImage.model_validate(img) for img in post.images],
            comments=comments,
            likes=[schemas.Like.model_validate(like) for like in post.likes],
            comments_count=len(post.comments),
            likes_count=len(post.likes),
            is_liked=is_liked,
            created_at=post.created_at,
            updated_at=post.updated_at
        ))
    
    return schemas.PostList(
        posts=result,
        total=total,
        page=page,
        pages=pages
    )

@router.get("/user/{user_id}", response_model=schemas.PostList)
def get_user_posts(
    user_id: UUID,
    page: int = 1,
    per_page: int = 10,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Получить посты конкретного пользователя
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Базовый запрос
    query = db.query(models.Post).filter(models.Post.author_id == user_id)
    
    # Фильтрация по приватности
    if current_user and current_user.id == user_id:
        # Свои посты видит все
        pass
    elif current_user:
        # Проверяем, являются ли пользователи друзьями
        are_friends = db.query(models.Friend).filter(
            ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user_id)) |
            ((models.Friend.user_id == user_id) & (models.Friend.friend_id == current_user.id)),
            models.Friend.status == "accepted"
        ).first() is not None
        
        if are_friends:
            # Друзья видят public и friends
            query = query.filter(models.Post.privacy.in_(['public', 'friends']))
        else:
            # Не друзья видят только public
            query = query.filter(models.Post.privacy == 'public')
    else:
        # Неавторизованные видят только public
        query = query.filter(models.Post.privacy == 'public')
    
    # Пагинация
    total = query.count()
    pages = (total + per_page - 1) // per_page
    posts = query.order_by(desc(models.Post.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    
    # Формируем ответ (аналогично get_posts)
    result = []
    for post in posts:
        author_profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == post.author_id
        ).first()
        
        # Проверяем, лайкнул ли текущий пользователь этот пост
        is_liked = False
        if current_user:
            is_liked = db.query(models.Like).filter(
                models.Like.post_id == post.id,
                models.Like.user_id == current_user.id
            ).first() is not None
        
        result.append(schemas.Post(
            id=post.id,
            author_id=post.author_id,
            author=schemas.PostAuthor(
                id=post.author.id,
                username=post.author.username,
                first_name=post.author.first_name,
                last_name=post.author.last_name,
                avatar=author_profile.avatar if author_profile else None
            ),
            content=post.content,
            privacy=post.privacy,
            images=[schemas.PostImage.model_validate(img) for img in post.images],
            comments=[],
            likes=[],
            comments_count=len(post.comments),
            likes_count=len(post.likes),
            is_liked=is_liked,
            created_at=post.created_at,
            updated_at=post.updated_at
        ))
    
    return schemas.PostList(
        posts=result,
        total=total,
        page=page,
        pages=pages
    )

@router.get("/{post_id}", response_model=schemas.Post)
def get_post(
    post_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Получить конкретный пост
    """
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Проверяем доступ к посту
    if post.privacy != 'public':
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if post.privacy == 'private' and post.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="You don't have access to this post")
        
        if post.privacy == 'friends':
            # Проверяем, являются ли пользователи друзьями
            are_friends = db.query(models.Friend).filter(
                ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == post.author_id)) |
                ((models.Friend.user_id == post.author_id) & (models.Friend.friend_id == current_user.id)),
                models.Friend.status == "accepted"
            ).first() is not None
            
            if not are_friends and post.author_id != current_user.id:
                raise HTTPException(status_code=403, detail="You don't have access to this post")
    
    # Получаем все комментарии
    comments = []
    for comment in post.comments:
        comment_author = db.query(models.User).filter(models.User.id == comment.author_id).first()
        comment_author_profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == comment.author_id
        ).first()
        
        comments.append(schemas.Comment(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            author=schemas.CommentAuthor(
                id=comment_author.id,
                username=comment_author.username,
                first_name=comment_author.first_name,
                last_name=comment_author.last_name,
                avatar=comment_author_profile.avatar if comment_author_profile else None
            ),
            content=comment.content,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        ))
    
    # Проверяем, лайкнул ли текущий пользователь этот пост
    is_liked = False
    if current_user:
        is_liked = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
        ).first() is not None
    
    author_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == post.author_id
    ).first()
    
    return schemas.Post(
        id=post.id,
        author_id=post.author_id,
        author=schemas.PostAuthor(
            id=post.author.id,
            username=post.author.username,
            first_name=post.author.first_name,
            last_name=post.author.last_name,
            avatar=author_profile.avatar if author_profile else None
        ),
        content=post.content,
        privacy=post.privacy,
        images=[schemas.PostImage.model_validate(img) for img in post.images],
        comments=comments,
        likes=[schemas.Like.model_validate(like) for like in post.likes],
        comments_count=len(post.comments),
        likes_count=len(post.likes),
        is_liked=is_liked,
        created_at=post.created_at,
        updated_at=post.updated_at
    )

@router.put("/{post_id}", response_model=schemas.Post)
def update_post(
    post_id: int,
    post_update: schemas.PostUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Обновить пост (только автор)
    """
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own posts")
    
    if post_update.content is not None:
        post.content = post_update.content
    if post_update.privacy is not None:
        post.privacy = post_update.privacy
    
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    
    return get_post(post_id, current_user, db)

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Удалить пост (только автор)
    """
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}

@router.post("/{post_id}/like")
def like_post(
    post_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Поставить лайк на пост
    """
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Проверяем, не лайкнул ли уже
    existing_like = db.query(models.Like).filter(
        models.Like.post_id == post_id,
        models.Like.user_id == current_user.id
    ).first()
    
    if existing_like:
        raise HTTPException(status_code=400, detail="You already liked this post")
    
    like = models.Like(
        post_id=post_id,
        user_id=current_user.id
    )
    db.add(like)
    db.commit()
    
    return {"message": "Post liked successfully"}

@router.delete("/{post_id}/like")
def unlike_post(
    post_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Убрать лайк с поста
    """
    like = db.query(models.Like).filter(
        models.Like.post_id == post_id,
        models.Like.user_id == current_user.id
    ).first()
    
    if not like:
        raise HTTPException(status_code=404, detail="Like not found")
    
    db.delete(like)
    db.commit()
    
    return {"message": "Like removed successfully"}

@router.post("/{post_id}/comments", response_model=schemas.Comment)
def create_comment(
    post_id: int,
    comment_data: schemas.CommentCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Добавить комментарий к посту
    """
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = models.Comment(
        post_id=post_id,
        author_id=current_user.id,
        content=comment_data.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Получаем данные автора
    author_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    return schemas.Comment(
        id=comment.id,
        post_id=comment.post_id,
        author_id=comment.author_id,
        author=schemas.CommentAuthor(
            id=current_user.id,
            username=current_user.username,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            avatar=author_profile.avatar if author_profile else None
        ),
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Удалить комментарий (только автор или владелец поста)
    """
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    post = db.query(models.Post).filter(models.Post.id == comment.post_id).first()
    
    if comment.author_id != current_user.id and post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this comment")
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}