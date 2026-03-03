from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Game schemas
class GameBase(BaseModel):
    name: str
    image_url: Optional[str] = None

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None

class Game(GameBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    first_name: str = Field(..., min_length=1, max_length=30)
    last_name: str = Field(..., min_length=1, max_length=30)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=30)
    last_name: Optional[str] = Field(None, min_length=1, max_length=30)
    bio: Optional[str] = Field(None, max_length=1000)
    avatar: Optional[str] = None
    favorite_game: Optional[str] = Field(None, max_length=100)

class UserProfileSchema(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class User(UserBase):
    id: UUID
    bio: Optional[str] = None
    avatar: Optional[str] = None
    favorite_game: Optional[str] = None
    date_joined: datetime
    updated_at: Optional[datetime] = None
    profile: Optional[UserProfileSchema] = None
    model_config = ConfigDict(from_attributes=True)

class UserInDB(User):
    hashed_password: str

# Partner/User profile for listing
class PartnerUser(UserBase):
    id: UUID
    bio: Optional[str] = None
    avatar: Optional[str] = None
    favorite_game: Optional[str] = None
    is_friend: Optional[bool] = False
    friendship_status: Optional[str] = None  # 'pending', 'accepted', 'rejected', None
    
    model_config = ConfigDict(from_attributes=True)

# Для детального просмотра профиля партнера
class PartnerProfile(BaseModel):
    user: PartnerUser
    friends_count: int = 0
    games_count: int = 0
    is_friend: bool = False
    friendship_status: Optional[str] = None

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Friend schemas
class FriendRequest(BaseModel):
    user_id: UUID

class FriendResponse(BaseModel):
    id: int
    user_id: UUID
    friend_id: UUID
    status: str  # 'pending', 'accepted', 'rejected'
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# User Game schemas
class UserGameBase(BaseModel):
    game_id: int
    hours_played: float = 0

class UserGameCreate(UserGameBase):
    pass

class UserGameUpdate(BaseModel):
    hours_played: Optional[float] = None

class UserGame(UserGameBase):
    id: int
    user_id: UUID
    created_at: datetime
    game: Optional[Game] = None
    model_config = ConfigDict(from_attributes=True)