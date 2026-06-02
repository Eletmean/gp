from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(prefix="/api/donations", tags=["donations"])


# ========== БАЗОВЫЕ ТАРИФЫ ПО УМОЛЧАНИЮ ==========
DEFAULT_TIERS = [
    {
        "id": 1,
        "name": "Поддержка",
        "price": 100,
        "duration_days": 30,
        "icon": "★",
        "color": "#ff6b6b",
        "benefits": ["Доступ к постам для донатеров", "Специальный значок"]
    },
    {
        "id": 2,
        "name": "VIP",
        "price": 500,
        "duration_days": 90,
        "icon": "◆",
        "color": "#ffd700",
        "benefits": ["Доступ к постам для донатеров", "Специальный значок", "Эксклюзивный контент", "Роль VIP"]
    },
    {
        "id": 3,
        "name": "Премиум",
        "price": 1000,
        "duration_days": 365,
        "icon": "●",
        "color": "#9b59b6",
        "benefits": ["Доступ к постам для донатеров", "Специальный значок", "Эксклюзивный контент", "Роль VIP", "Приоритетная поддержка"]
    },
]


def get_user_tiers(db: Session, user_id: UUID) -> List[dict]:
    """Получить кастомные тарифы пользователя или дефолтные"""
    # Проверяем, есть ли у пользователя сохраненные тарифы
    user_tiers = db.query(models.UserTier).filter(
        models.UserTier.user_id == user_id
    ).all()
    
    if user_tiers:
        return [
            {
                "id": tier.tier_id,
                "name": tier.name,
                "price": tier.price,
                "duration_days": tier.duration_days,
                "icon": tier.icon,
                "color": tier.color,
                "benefits": DEFAULT_TIERS[tier.tier_id - 1]["benefits"] if tier.tier_id <= len(DEFAULT_TIERS) else []
            }
            for tier in user_tiers
        ]
    
    return DEFAULT_TIERS


def save_user_tier(db: Session, user_id: UUID, tier_id: int, name: str, price: float, duration_days: int):
    """Сохранить или обновить тариф пользователя"""
    existing = db.query(models.UserTier).filter(
        models.UserTier.user_id == user_id,
        models.UserTier.tier_id == tier_id
    ).first()
    
    icon = DEFAULT_TIERS[tier_id - 1]["icon"] if tier_id <= len(DEFAULT_TIERS) else "★"
    color = DEFAULT_TIERS[tier_id - 1]["color"] if tier_id <= len(DEFAULT_TIERS) else "#ff6b6b"
    
    if existing:
        existing.name = name
        existing.price = price
        existing.duration_days = duration_days
        existing.updated_at = datetime.utcnow()
    else:
        new_tier = models.UserTier(
            user_id=user_id,
            tier_id=tier_id,
            name=name,
            price=price,
            duration_days=duration_days,
            icon=icon,
            color=color
        )
        db.add(new_tier)
    
    db.commit()


# ========== ЭНДПОИНТЫ ==========

@router.get("/tiers")
def get_subscription_tiers(
    current_user: Optional[models.User] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available subscription tiers (customizable per user)"""
    if current_user:
        return get_user_tiers(db, current_user.id)
    return DEFAULT_TIERS


@router.get("/tiers/public")
def get_public_tiers():
    """Get default public tiers (for non-authenticated users)"""
    return DEFAULT_TIERS


@router.put("/tiers/{tier_id}")
def update_tier(
    tier_id: int,
    tier_data: dict,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update subscription tier for current user"""
    if tier_id < 1 or tier_id > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tier id"
        )
    
    name = tier_data.get("name")
    price = tier_data.get("price")
    duration_days = tier_data.get("duration_days")
    
    if not name or not price or not duration_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: name, price, duration_days"
        )
    
    if price < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price must be at least 10"
        )
    
    if duration_days < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be at least 1 day"
        )
    
    save_user_tier(db, current_user.id, tier_id, name, price, duration_days)
    
    return {"message": "Tier updated successfully", "tier": tier_data}


@router.get("/tiers/custom")
def get_custom_tiers(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get custom tiers for current user"""
    return get_user_tiers(db, current_user.id)


@router.post("/subscribe")
def create_subscription(
    data: schemas.SubscriptionCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a subscription (demo mode)"""
    if current_user.id == data.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot subscribe to yourself"
        )
    
    # Получаем актуальные тарифы пользователя
    user_tiers = get_user_tiers(db, data.user_id)
    tier_map = {tier["id"]: tier for tier in user_tiers}
    
    tier = tier_map.get(data.tier_id)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tier"
        )
    
    existing = db.query(models.Donation).filter(
        models.Donation.user_id == data.user_id,
        models.Donation.donator_id == current_user.id,
        models.Donation.status == "active"
    ).first()
    
    if existing:
        existing.amount = tier["price"]
        existing.tier = tier["name"]
        existing.expires_at = datetime.utcnow() + timedelta(days=tier["duration_days"])
        existing.created_at = datetime.utcnow()
        db.commit()
        return {"message": "Subscription renewed successfully"}
    
    donation = models.Donation(
        user_id=data.user_id,
        donator_id=current_user.id,
        amount=tier["price"],
        status="active",
        tier=tier["name"],
        expires_at=datetime.utcnow() + timedelta(days=tier["duration_days"])
    )
    db.add(donation)
    db.commit()
    
    return {"message": "Subscription created successfully"}


@router.post("/one-time")
def one_time_donation(
    data: schemas.OneTimeDonationCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a one-time donation (demo mode)"""
    if current_user.id == data.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot donate to yourself"
        )
    
    if data.amount < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum donation amount is 10"
        )
    
    donation = models.Donation(
        user_id=data.user_id,
        donator_id=current_user.id,
        amount=data.amount,
        status="active",
        tier="one_time",
        expires_at=None
    )
    db.add(donation)
    db.commit()
    
    return {"message": f"Donation of {data.amount} created successfully"}


@router.get("/check/{user_id}", response_model=schemas.DonatorStatus)
def check_donator_status(
    user_id: UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check if current user is a donator for the specified user"""
    if current_user.id == user_id:
        return {"is_donator": False, "tier": None, "expires_at": None}
    
    donation = db.query(models.Donation).filter(
        models.Donation.user_id == user_id,
        models.Donation.donator_id == current_user.id,
        models.Donation.status == "active"
    ).first()
    
    if donation and donation.expires_at and donation.expires_at < datetime.utcnow():
        donation.status = "expired"
        db.commit()
        return {"is_donator": False, "tier": None, "expires_at": None}
    
    return {
        "is_donator": donation is not None,
        "tier": donation.tier if donation else None,
        "expires_at": donation.expires_at if donation else None
    }


@router.get("/my-subscriptions", response_model=List[schemas.MySubscription])
def get_my_subscriptions(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all active subscriptions made by current user"""
    donations = db.query(models.Donation).filter(
        models.Donation.donator_id == current_user.id,
        models.Donation.status == "active"
    ).all()
    
    result = []
    for donation in donations:
        user = db.query(models.User).filter(models.User.id == donation.user_id).first()
        if user:
            result.append({
                "id": donation.id,
                "creator_id": donation.user_id,
                "creator_name": user.first_name,
                "creator_avatar": user.avatar,
                "tier": donation.tier,
                "amount": donation.amount,
                "expires_at": donation.expires_at
            })
    
    return result


@router.get("/my-donators", response_model=List[schemas.MyDonator])
def get_my_donators(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all users who donated to current user"""
    donations = db.query(models.Donation).filter(
        models.Donation.user_id == current_user.id,
        models.Donation.status == "active"
    ).all()
    
    result = []
    for donation in donations:
        donator = db.query(models.User).filter(models.User.id == donation.donator_id).first()
        if donator:
            result.append({
                "id": donation.id,
                "donator_id": donation.donator_id,
                "donator_name": donator.first_name,
                "donator_avatar": donator.avatar,
                "tier": donation.tier,
                "amount": donation.amount,
                "created_at": donation.created_at
            })
    
    return result


@router.delete("/subscription/{user_id}")
def cancel_subscription(
    user_id: UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a subscription (demo mode)"""
    donation = db.query(models.Donation).filter(
        models.Donation.user_id == user_id,
        models.Donation.donator_id == current_user.id,
        models.Donation.status == "active"
    ).first()
    
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active subscription not found"
        )
    
    donation.status = "cancelled"
    db.commit()
    
    return {"message": "Subscription cancelled successfully"}