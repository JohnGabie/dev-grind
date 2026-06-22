INSERT OR IGNORE INTO store_items (id, name, description, type, category, price_coins, rarity, item_data, is_active)
VALUES (
  'book-slot-extra',
  '+1 Book Slot',
  'Expande seu limite de PDFs em 1 slot. Pode ser comprado até 4 vezes.',
  'book_slot',
  'utility',
  300,
  'rare',
  '{"max_purchases":4}',
  1
);
