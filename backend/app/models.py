from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .database import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=True, 
                       default="https://via.placeholder.com/300x200/667eea/ffffff?text=Game")
    
    user_games = relationship("UserGame", back_populates="game")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(100), unique=True, nullable=False, index=True)
    username = Column(String(30), unique=True, nullable=False, index=True)
    first_name = Column(String(30), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    date_joined = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    favorite_game = Column(String(100), nullable=True)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sent_friends = relationship("Friend", foreign_keys="Friend.user_id", back_populates="user", cascade="all, delete-orphan")
    received_friends = relationship("Friend", foreign_keys="Friend.friend_id", back_populates="friend", cascade="all, delete-orphan")
    user_games = relationship("UserGame", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    # Связи для донатов
    received_donations = relationship("Donation", foreign_keys="Donation.user_id", back_populates="user", cascade="all, delete-orphan")
    made_donations = relationship("Donation", foreign_keys="Donation.donator_id", back_populates="donator", cascade="all, delete-orphan")
    # Связи для кастомных тарифов
    custom_tiers = relationship("UserTier", back_populates="user", cascade="all, delete-orphan")

    @property
    def bio(self):
        return self.profile.bio if self.profile else ""
    
    @property
    def avatar(self):
        return self.profile.avatar if self.profile else "/static/default-avatar.png"

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "first_name": self.first_name,
            "favorite_game": self.favorite_game,
            "date_joined": self.date_joined,
            "updated_at": self.updated_at,
            "bio": self.bio,
            "avatar": self.avatar,
            "is_active": self.is_active
        }

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio = Column(Text, default="")
    avatar = Column(String(500), default="/static/default-avatar.png")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="profile")

class Friend(Base):
    __tablename__ = "friends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    friend_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", foreign_keys=[user_id], back_populates="sent_friends")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="received_friends")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'friend_id', name='unique_friendship'),
    )

class UserGame(Base):
    __tablename__ = "user_games"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    hours_played = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="user_games")
    game = relationship("Game", back_populates="user_games")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', name='unique_user_game'),
    )

# ========== POST TABLES ==========

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    privacy = Column(String(20), default="public")  # public, friends, donators
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    author = relationship("User", back_populates="posts")
    images = relationship("PostImage", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

class PostImage(Base):
    __tablename__ = "post_images"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="images")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id], cascade="all")

class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="likes")
    
    __table_args__ = (
        UniqueConstraint('post_id', 'user_id', name='unique_like'),
    )


# ========== DONATION TABLES ==========

class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Кому донатят
    donator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Кто донатит
    amount = Column(Float, nullable=False)
    tier = Column(String(50), nullable=True)  # 'Поддержка', 'VIP', 'Премиум', 'one_time'
    status = Column(String(20), default="active")  # active, expired, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Связи
    user = relationship("User", foreign_keys=[user_id], back_populates="received_donations")
    donator = relationship("User", foreign_keys=[donator_id], back_populates="made_donations")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'donator_id', name='unique_donation'),
    )


# ========== USER TIER TABLES ==========

class UserTier(Base):
    __tablename__ = "user_tiers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tier_id = Column(Integer, nullable=False)  # 1, 2, 3
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    duration_days = Column(Integer, nullable=False)
    icon = Column(String(10), default="★")
    color = Column(String(20), default="#ff6b6b")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    user = relationship("User", back_populates="custom_tiers")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'tier_id', name='unique_user_tier'),
    )