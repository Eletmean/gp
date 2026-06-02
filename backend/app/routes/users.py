from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID
import os
import shutil
from typing import Optional

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(models.User).filter(
            (models.User.email == user.email) | (models.User.username == user.username)
        ).first()
        
        if db_user:
            if db_user.email == user.email:
                raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
            else:
                raise HTTPException(status_code=400, detail="Пользователь с таким никнеймом уже существует")
        
        print(f"Registering user: {user.email}")
        hashed_password = auth.get_password_hash(user.password)
        print(f"Password hashed successfully")
        
        db_user = models.User(
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            hashed_password=hashed_password,
            is_active=True
        )
        
        db.add(db_user)
        db.flush()
        
        db_profile = models.UserProfile(
            user_id=db_user.id,
            bio="",
            avatar="/static/default-avatar.png"
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_user)
        
        print(f"User registered successfully: {user.email}")
        return db_user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in register: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    print(f"Login attempt for email: {user_data.email}")
    
    user = auth.authenticate_user(db, user_data.email, user_data.password)
    if not user:
        print(f"Login failed for email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"Login successful for email: {user_data.email}")
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.User)
def read_users_me(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        profile = models.UserProfile(
            user_id=current_user.id,
            bio="",
            avatar="/static/default-avatar.png"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        db.refresh(current_user)
    
    return current_user

@router.get("/profile", response_model=schemas.User)
def get_profile(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    return read_users_me(current_user, db)

@router.put("/me", response_model=schemas.User)
def update_user(
    first_name: Optional[str] = Form(None),
    favorite_game: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if first_name is not None:
        current_user.first_name = first_name
    if favorite_game is not None:
        current_user.favorite_game = favorite_game
    
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        profile = models.UserProfile(
            user_id=current_user.id,
            bio="",
            avatar="/static/default-avatar.png"
        )
        db.add(profile)
    
    if bio is not None:
        profile.bio = bio
    
    if avatar:
        os.makedirs("static/avatars", exist_ok=True)
        
        file_extension = os.path.splitext(avatar.filename)[1]
        file_name = f"avatar_{current_user.id}{file_extension}"
        file_path = f"static/avatars/{file_name}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
        
        profile.avatar = f"/static/avatars/{file_name}"
    
    current_user.updated_at = datetime.utcnow()
    profile.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    db.refresh(profile)
    
    return current_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    print(f"🔴 Удаление пользователя {current_user.id} ({current_user.email})")
    
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    db.delete(user)
    db.commit()
    
    print(f"✅ Пользователь {current_user.email} успешно удален")
    return None

@router.post("/logout")
def logout():
    return {"message": "Выход выполнен успешно"}

@router.get("/{user_id}", response_model=schemas.User)
def get_user(user_id: str, db: Session = Depends(get_db)):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user.id).first()
    user.profile = profile
    
    return user