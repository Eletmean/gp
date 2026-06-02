from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
import bcrypt
from dotenv import load_dotenv

from . import models, schemas
from .database import get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login", auto_error=False)

def get_password_hash(password: str) -> str:
    """
    Хеширование пароля с помощью bcrypt
    """
    try:
        password_bytes = password.encode('utf-8')
        
        # bcrypt имеет ограничение в 72 байта
        if len(password_bytes) > 72:
            while len(password_bytes) > 72:
                password_bytes = password_bytes[:-1]
        
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        return hashed.decode('utf-8')
        
    except Exception as e:
        print(f"Error hashing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing password"
        )

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверка пароля с помощью bcrypt
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        
        if len(password_bytes) > 72:
            while len(password_bytes) > 72:
                password_bytes = password_bytes[:-1]
        
        return bcrypt.checkpw(password_bytes, hashed_bytes)
        
    except Exception as e:
        print(f"Error verifying password: {e}")
        return False

def authenticate_user(db: Session, email: str, password: str):
    """
    Аутентификация пользователя
    """
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Создание JWT токена
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """
    Получение текущего пользователя по токену (обязательная авторизация)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """
    Получение текущего пользователя по токену (опционально)
    Возвращает None если токен отсутствует или невалидный
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    
    user = db.query(models.User).filter(models.User.email == email).first()
    return user

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
):
    """
    Проверка, активен ли пользователь
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user