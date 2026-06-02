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

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=30)
    favorite_game: Optional[str] = Field(None, max_length=100)

class UserProfileSchema(BaseModel):
    bio: Optional[str] = None
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class UserGameSchema(BaseModel):
    id: int
    game_id: int
    game_name: str
    game_image_url: Optional[str] = None
    hours_played: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class User(UserBase):
    id: UUID
    favorite_game: Optional[str] = None
    date_joined: datetime
    updated_at: Optional[datetime] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    profile: Optional[UserProfileSchema] = None
    games: Optional[List[UserGameSchema]] = []
    model_config = ConfigDict(from_attributes=True)

class UserInDB(User):
    hashed_password: str

# Partner/User profile for listing (без last_name)
class PartnerUser(BaseModel):
    id: UUID
    username: str
    first_name: str
    bio: Optional[str] = None
    avatar: Optional[str] = None
    favorite_game: Optional[str] = None
    is_friend: Optional[bool] = False
    friendship_status: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Для детального просмотра профиля партнера
class PartnerProfile(BaseModel):
    user: PartnerUser
    friends_count: int = 0
    games_count: int = 0
    games: Optional[List[UserGameSchema]] = []
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
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[PartnerUser] = None
    friend: Optional[PartnerUser] = None
    model_config = ConfigDict(from_attributes=True)

# User Game schemas
class UserGameBase(BaseModel):
    game_id: int
    hours_played: float = 0

class UserGameCreate(UserGameBase):
    pass

class UserGameUpdate(BaseModel):
    hours_played: Optional[float] = None

class UserGameResponse(UserGameBase):
    id: int
    user_id: UUID
    game_name: str
    game_image_url: Optional[str] = None
    created_at: datetime
    game: Optional[Game] = None
    model_config = ConfigDict(from_attributes=True)

# ========== POST SCHEMAS ==========

# PostImage schemas
class PostImageBase(BaseModel):
    image_url: str

class PostImageCreate(PostImageBase):
    pass

class PostImage(PostImageBase):
    id: int
    post_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Comment schemas
class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)

class CommentAuthor(BaseModel):
    id: UUID
    username: str
    first_name: str
    avatar: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class Comment(CommentBase):
    id: int
    post_id: int
    author_id: UUID
    author: CommentAuthor
    parent_id: Optional[int] = None
    replies: List['Comment'] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Like schemas
class LikeBase(BaseModel):
    pass

class Like(LikeBase):
    id: int
    post_id: int
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Post schemas
class PostBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    privacy: str = "public"  # public, friends, donators

class PostCreate(PostBase):
    images: Optional[List[str]] = None

class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    privacy: Optional[str] = None  # public, friends, donators

class PostAuthor(BaseModel):
    id: UUID
    username: str
    first_name: str
    avatar: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class Post(PostBase):
    id: int
    author_id: UUID
    author: PostAuthor
    images: List[PostImage] = []
    comments: List[Comment] = []
    likes: List[Like] = []
    comments_count: int = 0
    likes_count: int = 0
    is_liked: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PostList(BaseModel):
    posts: List[Post]
    total: int
    page: int
    pages: int

# ========== DONATION SCHEMAS ==========

class SubscriptionTier(BaseModel):
    id: int
    name: str
    price: float
    duration_days: int
    icon: str
    color: str
    benefits: Optional[List[str]] = []


class DonationCreate(BaseModel):
    user_id: UUID
    amount: float
    tier_id: Optional[int] = None


class SubscriptionCreate(BaseModel):
    user_id: UUID
    tier_id: int


class OneTimeDonationCreate(BaseModel):
    user_id: UUID
    amount: float


class DonatorStatus(BaseModel):
    is_donator: bool
    tier: Optional[str] = None
    expires_at: Optional[datetime] = None


class DonationResponse(BaseModel):
    id: int
    user_id: UUID
    donator_id: UUID
    amount: float
    tier: Optional[str] = None
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class MySubscription(BaseModel):
    id: int
    creator_id: UUID
    creator_name: str
    creator_avatar: Optional[str] = None
    tier: Optional[str] = None
    amount: float
    expires_at: Optional[datetime] = None


class MyDonator(BaseModel):
    id: int
    donator_id: UUID
    donator_name: str
    donator_avatar: Optional[str] = None
    tier: Optional[str] = None
    amount: float
    created_at: datetime


# Gallery schemas
class GalleryImage(BaseModel):
    id: int
    post_id: int
    image_url: str
    created_at: datetime


# ========== USER TIER SCHEMAS ==========

class UserTierBase(BaseModel):
    tier_id: int
    name: str
    price: float
    duration_days: int
    icon: Optional[str] = "★"
    color: Optional[str] = "#ff6b6b"


class UserTierCreate(UserTierBase):
    pass


class UserTierUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None


class UserTier(UserTierBase):
    id: int
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Forward reference for recursive Comment model
Comment.model_rebuild()