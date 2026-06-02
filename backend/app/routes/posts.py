from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID
import os
import shutil
from datetime import datetime, timezone

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/api/posts", tags=["posts"])


# Функция для сохранения изображений
async def save_post_image(image: UploadFile, post_id: int) -> str:
    """Сохранить изображение поста"""
    os.makedirs(f"static/posts/{post_id}", exist_ok=True)
    file_extension = os.path.splitext(image.filename)[1]
    file_name = f"image_{datetime.utcnow().timestamp()}{file_extension}"
    file_path = f"static/posts/{post_id}/{file_name}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    return f"/static/posts/{post_id}/{file_name}"


# ========== ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ДОНАТЕРА ==========
def is_donator(db: Session, donator_id: UUID, user_id: UUID) -> bool:
    """Проверить, является ли donator_id донатером для user_id"""
    print("=" * 60)
    print(f"DONATOR CHECK:")
    print(f"  donator_id (current user): {donator_id}")
    print(f"  user_id (profile owner): {user_id}")
    
    donation = db.query(models.Donation).filter(
        models.Donation.user_id == user_id,
        models.Donation.donator_id == donator_id,
        models.Donation.status == "active"
    ).first()
    
    if donation:
        print(f"  Found donation: id={donation.id}, tier={donation.tier}, expires_at={donation.expires_at}")
        now = datetime.now(timezone.utc)
        if donation.expires_at and donation.expires_at < now:
            print(f"  Donation EXPIRED at {donation.expires_at}")
            donation.status = "expired"
            db.commit()
            return False
        print(f"  Donation ACTIVE! Returning True")
        return True
    else:
        print(f"  No active donation found")
        return False


# ========== ФУНКЦИЯ ДЛЯ ПОСТРОЕНИЯ ДЕРЕВА КОММЕНТАРИЕВ ==========
def build_comment_tree(comments_list, db):
    """Рекурсивно строит дерево комментариев"""
    if not comments_list:
        return []
    
    comment_dict = {}
    roots = []
    
    for comment in comments_list:
        comment_dict[comment.id] = comment
    
    replies_dict = {}
    for comment in comments_list:
        replies_dict[comment.id] = []
    
    for comment in comments_list:
        if comment.parent_id is None:
            roots.append(comment)
        else:
            parent = comment_dict.get(comment.parent_id)
            if parent is not None:
                replies_dict[parent.id].append(comment)
    
    def format_comment(comment):
        comment_author = db.query(models.User).filter(models.User.id == comment.author_id).first()
        comment_author_profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == comment.author_id
        ).first()
        
        replies = []
        for reply in replies_dict.get(comment.id, []):
            replies.append(format_comment(reply))
        
        return schemas.Comment(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            author=schemas.CommentAuthor(
                id=comment_author.id,
                username=comment_author.username,
                first_name=comment_author.first_name,
                avatar=comment_author_profile.avatar if comment_author_profile else None
            ),
            parent_id=comment.parent_id,
            content=comment.content,
            replies=replies,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        )
    
    return [format_comment(root) for root in roots]


# ========== ЭНДПОИНТЫ ==========

@router.post("/", response_model=schemas.Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    content: str = Form(..., min_length=1, max_length=5000),
    privacy: str = Form("public"),
    images: List[UploadFile] = File(None),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать новый пост"""
    db_post = models.Post(
        author_id=current_user.id,
        content=content,
        privacy=privacy
    )
    db.add(db_post)
    db.flush()
    
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
    
    author_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    post_data = schemas.Post(
        id=db_post.id,
        author_id=current_user.id,
        author=schemas.PostAuthor(
            id=current_user.id,
            username=current_user.username,
            first_name=current_user.first_name,
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
    """Получить список постов (лента)"""
    query = db.query(models.Post)
    
    if current_user:
        friend_ids = [f.friend_id for f in current_user.sent_friends if f.status == 'accepted'] + \
                     [f.user_id for f in current_user.received_friends if f.status == 'accepted']
        
        donator_ids = []
        donations = db.query(models.Donation).filter(
            models.Donation.donator_id == current_user.id,
            models.Donation.status == "active"
        ).all()
        now = datetime.now(timezone.utc)
        for donation in donations:
            if donation.expires_at and donation.expires_at > now:
                donator_ids.append(donation.user_id)
            elif donation.expires_at is None:
                donator_ids.append(donation.user_id)
        
        query = query.filter(
            (models.Post.author_id == current_user.id) |
            (models.Post.privacy == 'public') |
            ((models.Post.privacy == 'friends') & (models.Post.author_id.in_(friend_ids))) |
            ((models.Post.privacy == 'donators') & (models.Post.author_id.in_(donator_ids)))
        )
    else:
        query = query.filter(models.Post.privacy == 'public')
    
    total = query.count()
    pages = (total + per_page - 1) // per_page
    posts = query.order_by(desc(models.Post.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for post in posts:
        author_profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == post.author_id
        ).first()
        
        comments = []
        for comment in post.comments[:3]:
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
                    avatar=comment_author_profile.avatar if comment_author_profile else None
                ),
                parent_id=comment.parent_id,
                content=comment.content,
                created_at=comment.created_at,
                updated_at=comment.updated_at
            ))
        
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
    """Получить посты конкретного пользователя"""
    print("=" * 60)
    print(f"GET_USER_POSTS called")
    print(f"  Target user_id: {user_id}")
    print(f"  Current user: {current_user.id if current_user else 'None'}")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = db.query(models.Post).filter(models.Post.author_id == user_id)
    
    if current_user and current_user.id == user_id:
        print("  Case: User viewing their own posts - showing ALL posts")
        pass
    elif current_user:
        are_friends = db.query(models.Friend).filter(
            ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user_id)) |
            ((models.Friend.user_id == user_id) & (models.Friend.friend_id == current_user.id)),
            models.Friend.status == "accepted"
        ).first() is not None
        
        is_donator_status = is_donator(db, current_user.id, user_id)
        
        print(f"  are_friends: {are_friends}")
        print(f"  is_donator_status: {is_donator_status}")
        
        if are_friends:
            print("  Filtering: public and friends posts")
            query = query.filter(models.Post.privacy.in_(['public', 'friends']))
        elif is_donator_status:
            print("  Filtering: public and donators posts")
            query = query.filter(models.Post.privacy.in_(['public', 'donators']))
        else:
            print("  Filtering: only public posts")
            query = query.filter(models.Post.privacy == 'public')
    else:
        print("  Case: Unauthorized user - showing only public posts")
        query = query.filter(models.Post.privacy == 'public')
    
    # Выводим все найденные посты с их privacy
    posts_preview = query.all()
    print(f"  Found {len(posts_preview)} posts with privacy values:")
    for p in posts_preview:
        print(f"    Post {p.id}: privacy={p.privacy}")
    
    total = query.count()
    pages = (total + per_page - 1) // per_page
    posts = query.order_by(desc(models.Post.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for post in posts:
        author_profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == post.author_id
        ).first()
        
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
    
    print(f"  Returning {len(result)} posts to frontend")
    print("=" * 60)
    
    return schemas.PostList(
        posts=result,
        total=total,
        page=page,
        pages=pages
    )


@router.get("/user/{user_id}/gallery")
def get_user_gallery(
    user_id: UUID,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Получить все фото пользователя с учетом приватности"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user and current_user.id == user_id:
        allowed_privacy = ['public', 'friends', 'donators']
    elif current_user:
        are_friends = db.query(models.Friend).filter(
            ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == user_id)) |
            ((models.Friend.user_id == user_id) & (models.Friend.friend_id == current_user.id)),
            models.Friend.status == "accepted"
        ).first() is not None
        
        is_donator_status = is_donator(db, current_user.id, user_id)
        
        if are_friends:
            allowed_privacy = ['public', 'friends']
        elif is_donator_status:
            allowed_privacy = ['public', 'donators']
        else:
            allowed_privacy = ['public']
    else:
        allowed_privacy = ['public']
    
    posts = db.query(models.Post).filter(
        models.Post.author_id == user_id,
        models.Post.privacy.in_(allowed_privacy)
    ).all()
    
    all_images = []
    for post in posts:
        for img in post.images:
            all_images.append({
                "id": img.id,
                "post_id": post.id,
                "image_url": img.image_url,
                "created_at": img.created_at
            })
    
    return all_images


@router.get("/{post_id}", response_model=schemas.Post)
def get_post(
    post_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Получить конкретный пост с древовидными комментариями"""
    try:
        post = db.query(models.Post).filter(models.Post.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        if post.privacy != 'public':
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if post.privacy == 'friends':
                are_friends = db.query(models.Friend).filter(
                    ((models.Friend.user_id == current_user.id) & (models.Friend.friend_id == post.author_id)) |
                    ((models.Friend.user_id == post.author_id) & (models.Friend.friend_id == current_user.id)),
                    models.Friend.status == "accepted"
                ).first() is not None
                
                if not are_friends and post.author_id != current_user.id:
                    raise HTTPException(status_code=403, detail="You don't have access to this post")
            
            if post.privacy == 'donators':
                is_donator_status = is_donator(db, current_user.id, post.author_id)
                if not is_donator_status and post.author_id != current_user.id:
                    raise HTTPException(status_code=403, detail="This post is only for donators")
        
        all_comments = db.query(models.Comment).filter(
            models.Comment.post_id == post_id
        ).order_by(models.Comment.created_at).all()
        
        comment_tree = build_comment_tree(all_comments, db)
        
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
                avatar=author_profile.avatar if author_profile else None
            ),
            content=post.content,
            privacy=post.privacy,
            images=[schemas.PostImage.model_validate(img) for img in post.images],
            comments=comment_tree,
            likes=[schemas.Like.model_validate(like) for like in post.likes],
            comments_count=len(all_comments),
            likes_count=len(post.likes),
            is_liked=is_liked,
            created_at=post.created_at,
            updated_at=post.updated_at
        )
    except Exception as e:
        print(f"Error in get_post: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{post_id}", response_model=schemas.Post)
def update_post(
    post_id: int,
    post_update: schemas.PostUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить пост (только автор)"""
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
    """Удалить пост (только автор)"""
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
    """Поставить лайк на пост"""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
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
    """Убрать лайк с поста"""
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
    parent_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавить комментарий к посту (поддерживает ответы)"""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if parent_id:
        parent_comment = db.query(models.Comment).filter(models.Comment.id == parent_id).first()
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if parent_comment.post_id != post_id:
            raise HTTPException(status_code=400, detail="Parent comment does not belong to this post")
    
    comment = models.Comment(
        post_id=post_id,
        author_id=current_user.id,
        content=comment_data.content,
        parent_id=parent_id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
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
            avatar=author_profile.avatar if author_profile else None
        ),
        parent_id=comment.parent_id,
        content=comment.content,
        replies=[],
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить комментарий (только автор или владелец поста)"""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    post = db.query(models.Post).filter(models.Post.id == comment.post_id).first()
    
    if comment.author_id != current_user.id and post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this comment")
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}