import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.store import StoreItem
from app.models.inventory import UserInventory

router = APIRouter(prefix="/store", tags=["store"])

VALID_SLOTS = {"bg_dashboard", "bg_profile", "bg_kata"}


def _item_dict(item: StoreItem, owned: bool, equipped_slots: list[str]) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "type": item.type,
        "category": item.category,
        "price_coins": item.price_coins,
        "rarity": item.rarity,
        "item_data": json.loads(item.item_data),
        "owned": owned,
        "equipped_slots": equipped_slots,
    }


@router.get("/items")
def get_items(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(StoreItem).filter(StoreItem.is_active == True).all()
    inv = db.query(UserInventory).filter(UserInventory.user_id == user.id).all()

    owned_ids = {e.item_id for e in inv}
    slot_map: dict[str, str] = {e.equipped_slot: e.item_id for e in inv if e.equipped_slot}

    result = []
    for item in items:
        equipped_slots = [slot for slot, iid in slot_map.items() if iid == item.id]
        result.append(_item_dict(item, item.id in owned_ids, equipped_slots))
    return result


@router.post("/buy/{item_id}")
def buy_item(item_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(StoreItem).filter(StoreItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")

    already_owned = db.query(UserInventory).filter(
        UserInventory.user_id == user.id,
        UserInventory.item_id == item_id,
    ).first()
    if already_owned:
        raise HTTPException(400, "Item já adquirido")

    if user.coins < item.price_coins:
        raise HTTPException(400, "Coins insuficientes")

    user.coins -= item.price_coins
    db.add(UserInventory(user_id=user.id, item_id=item_id))
    db.commit()
    return {"ok": True, "coins": user.coins}


@router.post("/equip/{item_id}")
def equip_item(
    item_id: str,
    slot: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if slot not in VALID_SLOTS:
        raise HTTPException(400, f"Slot inválido. Use: {', '.join(VALID_SLOTS)}")

    entry = db.query(UserInventory).filter(
        UserInventory.user_id == user.id,
        UserInventory.item_id == item_id,
    ).first()
    if not entry:
        raise HTTPException(403, "Item não está no inventário")

    # Unequip any item currently in this slot
    db.query(UserInventory).filter(
        UserInventory.user_id == user.id,
        UserInventory.equipped_slot == slot,
    ).update({"equipped_slot": None})

    entry.equipped_slot = slot
    db.commit()
    return {"ok": True}


@router.post("/unequip")
def unequip_slot(slot: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if slot not in VALID_SLOTS:
        raise HTTPException(400, f"Slot inválido. Use: {', '.join(VALID_SLOTS)}")
    db.query(UserInventory).filter(
        UserInventory.user_id == user.id,
        UserInventory.equipped_slot == slot,
    ).update({"equipped_slot": None})
    db.commit()
    return {"ok": True}


@router.get("/equipped")
def get_equipped(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(UserInventory).filter(
        UserInventory.user_id == user.id,
        UserInventory.equipped_slot.isnot(None),
    ).all()

    result: dict[str, dict] = {}
    for entry in inv:
        item = db.query(StoreItem).filter(StoreItem.id == entry.item_id).first()
        if item:
            result[entry.equipped_slot] = json.loads(item.item_data)
    return result


@router.get("/inventory")
def get_inventory(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(UserInventory).filter(UserInventory.user_id == user.id).all()
    result = []
    for entry in inv:
        item = db.query(StoreItem).filter(StoreItem.id == entry.item_id).first()
        if item:
            result.append({
                "item_id": entry.item_id,
                "name": item.name,
                "type": item.type,
                "item_data": json.loads(item.item_data),
                "equipped_slot": entry.equipped_slot,
                "purchased_at": entry.purchased_at.isoformat(),
            })
    return result
