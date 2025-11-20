-- Limpia todas las tablas en el orden correcto para evitar errores de clave foránea.
DELETE FROM "Ingredients_EOQ_model";
DELETE FROM "Sale_products";
DELETE FROM "Sale_orders";
DELETE FROM "Order_clients";
DELETE FROM "Inventory_movements";
DELETE FROM "Product_movements";
DELETE FROM "Products";
DELETE FROM "Ingredients";
/* DELETE FROM "Users";
DELETE FROM "Accounts";
DELETE FROM "VerificationTokens";
DELETE FROM "Sessions"; */


-- Reinicia los contadores de autoincremento de las tablas
DELETE FROM sqlite_sequence WHERE name = 'Ingredients';
DELETE FROM sqlite_sequence WHERE name = 'Products';
DELETE FROM sqlite_sequence WHERE name = 'Order_clients';
DELETE FROM sqlite_sequence WHERE name = 'Sale_orders';
DELETE FROM sqlite_sequence WHERE name = 'Sale_products';
DELETE FROM sqlite_sequence WHERE name = 'Product_movements';
DELETE FROM sqlite_sequence WHERE name = 'Inventory_movements';
DELETE FROM sqlite_sequence WHERE name = 'Ingredients_EOQ_model';
---
-- Inserta datos iniciales para cada tabla.
-- Se usa DATETIME('now') para los campos de fecha y hora.


---
-- Inserta un ingrediente de ejemploINSERT INTO "Ingredients" (
INSERT INTO "Ingredients" (
  "name",
  "unit",
  "pricePerUnit",
  "provider",
  "currentQuantity",
  "createdAt",
  "updatedAt"
) VALUES
('Azúcar', 'kg', 1.85, 'Dulce Sol S.A.', 150.0, DATETIME('now'), DATETIME('now')),
('Mantequilla sin sal', 'kg', 7.50, 'Lácteos El Campo', 25.0, DATETIME('now'), DATETIME('now')),
('Huevos', 'docena', 2.30, 'Granja Avícola', 60.0, DATETIME('now'), DATETIME('now')),
('Polvo de hornear', 'kg', 5.90, 'Repostería Superior', 10.0, DATETIME('now'), DATETIME('now')),
('Sal', 'kg', 0.80, 'Salinera La Costa', 200.0, DATETIME('now'), DATETIME('now')),
('Cacao en polvo', 'kg', 9.20, 'Chocolates Puros', 15.0, DATETIME('now'), DATETIME('now')),
('Levadura fresca', 'kg', 4.00, 'Levaduras El Panadero', 5.0, DATETIME('now'), DATETIME('now')),
('Grenetina hidrolizada', 'kg', 12.50, 'Gelatinas Premium', 50.0, DATETIME('now'), DATETIME('now')),
('Jarabe de agave orgánico', 'litro', 8.20, 'Agaves Del Sol', 30.0, DATETIME('now'), DATETIME('now')),
('Ácido cítrico en polvo', 'kg', 6.75, 'Químicos Naturales', 15.0, DATETIME('now'), DATETIME('now')),
('Saborizante de fresa', 'litro', 15.00, 'Extractos Frutales S.A.', 5.0, DATETIME('now'), DATETIME('now')),
('Saborizante de limón', 'litro', 14.50, 'Extractos Frutales S.A.', 5.0, DATETIME('now'), DATETIME('now')),
('Saborizante de mango', 'litro', 16.00, 'Extractos Frutales S.A.', 5.0, DATETIME('now'), DATETIME('now')),
('Saborizante de mora', 'litro', 16.50, 'Extractos Frutales S.A.', 5.0, DATETIME('now'), DATETIME('now')),
('Saborizante de zanahoria', 'litro', 13.00, 'Extractos Frutales S.A.', 5.0, DATETIME('now'), DATETIME('now')),
('Pulpa de betabel', 'kg', 4.50, 'Cosechas Frescas', 25.0, DATETIME('now'), DATETIME('now')),
('Pulpa de tuna', 'kg', 5.20, 'Cosechas Frescas', 25.0, DATETIME('now'), DATETIME('now')),
('Pulpa de durazno', 'kg', 5.80, 'Cosechas Frescas', 25.0, DATETIME('now'), DATETIME('now')),
('Pulpa de maracuyá', 'kg', 6.20, 'Cosechas Frescas', 25.0, DATETIME('now'), DATETIME('now')),
('Pulpa de coco', 'kg', 6.50, 'Cosechas Frescas', 25.0, DATETIME('now'), DATETIME('now')),
('Pulpa de tamarindo', 'kg', 5.40, 'Cosechas Frescas', 25.0, DATETIME('now'), DATETIME('now'));
---
-- Inserta un producto de ejemplo
INSERT INTO "Products" (
  "name",
  "flavor",
  "type",
  "imageUrl",
  "pricePerUnit",
  "currentQuantity",
  "createdAt",
  "updatedAt"
) VALUES 
('Gomita de Beterraga', 'Beterraga', 'Gomita', '/uploads/beterraga.jpeg', 2.00, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Frutilla', 'Frutilla', 'Gomita', '/uploads/frutilla.jpeg', 2.50, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Limón', 'Limon', 'Gomita', '/uploads/limon.jpeg', 1.80, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Mandarina', 'Mandarina', 'Gomita', '/uploads/mandarina.jpeg', 2.20, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Manzana', 'Manzana', 'Gomita', '/uploads/manzana.jpeg', 2.10, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Manzanilla', 'Manzanilla', 'Gomita', '/uploads/manzanilla.jpeg', 1.90, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Tuna', 'Tuna', 'Gomita', '/uploads/tuna.jpeg', 2.30, 100.0, DATETIME('now'), DATETIME('now')),
('Gomita de Zanahoria', 'Zanahoria', 'Gomita', '/uploads/zanahoria.jpeg', 1.70, 100.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Mango Tropical', 'Mango', 'Pulpa', '/uploads/pulpa1.jpeg', 5.50, 50.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Mora Silvestre', 'Mora', 'Pulpa', '/uploads/pulpa2.jpeg', 6.00, 50.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Durazno', 'Durazno', 'Pulpa', '/uploads/pulpa3.jpeg', 5.20, 50.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Maracuyá', 'Maracuya', 'Pulpa', '/uploads/pulpa4.jpeg', 6.50, 50.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Frambuesa', 'Frambuesa', 'Pulpa', '/uploads/pulpa5.jpeg', 7.00, 50.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Coco Cremoso', 'Coco', 'Pulpa', '/uploads/pulpa6.jpeg', 5.80, 50.0, DATETIME('now'), DATETIME('now')),
('Pulpa de Tamarindo', 'Tamarindo', 'Pulpa', '/uploads/pulpa7.jpeg', 5.40, 50.0, DATETIME('now'), DATETIME('now'));
---
INSERT INTO "Inventory_movements" (
  "user_id",
  "ingredient_id",
  "movementType",
  "reason",
  "quantity",
  "createdAt"
) VALUES
-- Azúcar (id: 1)
(1, 1, 'entrada', 'Compra inicial para el año', 300.0, DATETIME('now', '-360 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-350 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-320 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-290 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-260 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-230 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-200 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-170 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-140 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-110 days')),
(1, 1, 'salida', 'Producción semanal', 25.0, DATETIME('now', '-80 days')),
(1, 1, 'entrada', 'Reposición de stock', 150.0, DATETIME('now', '-70 days')),

-- Mantequilla sin sal (id: 2)
(1, 2, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-350 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-320 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-290 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-260 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-230 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-200 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-170 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-140 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-110 days')),
(1, 2, 'salida', 'Producción semanal', 5.0, DATETIME('now', '-80 days')),
(1, 2, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days')),

-- Huevos (id: 3)
(1, 3, 'entrada', 'Compra inicial para el año', 120.0, DATETIME('now', '-360 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-350 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-320 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-290 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-260 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-230 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-200 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-170 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-140 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-110 days')),
(1, 3, 'salida', 'Producción semanal', 10.0, DATETIME('now', '-80 days')),
(1, 3, 'entrada', 'Reposición de stock', 60.0, DATETIME('now', '-70 days')),

-- Polvo de hornear (id: 4)
(1, 4, 'entrada', 'Compra inicial para el año', 20.0, DATETIME('now', '-360 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-350 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-320 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-290 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-260 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-230 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-200 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-170 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-140 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-110 days')),
(1, 4, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-80 days')),
(1, 4, 'entrada', 'Reposición de stock', 10.0, DATETIME('now', '-70 days')),

-- Sal (id: 5)
(1, 5, 'entrada', 'Compra inicial para el año', 400.0, DATETIME('now', '-360 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-350 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-320 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-290 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-260 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-230 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-200 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-170 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-140 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-110 days')),
(1, 5, 'salida', 'Producción semanal', 20.0, DATETIME('now', '-80 days')),
(1, 5, 'entrada', 'Reposición de stock', 200.0, DATETIME('now', '-70 days')),

-- Cacao en polvo (id: 6)
(1, 6, 'entrada', 'Compra inicial para el año', 30.0, DATETIME('now', '-360 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-350 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-320 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-290 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-260 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-230 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-200 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-170 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-140 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-110 days')),
(1, 6, 'salida', 'Producción semanal', 3.0, DATETIME('now', '-80 days')),
(1, 6, 'entrada', 'Reposición de stock', 15.0, DATETIME('now', '-70 days')),

-- Levadura fresca (id: 7)
(1, 7, 'entrada', 'Compra inicial para el año', 10.0, DATETIME('now', '-360 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-350 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-320 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-290 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-260 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-230 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-200 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-170 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-140 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-110 days')),
(1, 7, 'salida', 'Producción semanal', 1.0, DATETIME('now', '-80 days')),
(1, 7, 'entrada', 'Reposición de stock', 5.0, DATETIME('now', '-70 days')),

-- Grenetina hidrolizada (id: 8)
(1, 8, 'entrada', 'Compra inicial para el año', 100.0, DATETIME('now', '-360 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-350 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-320 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-290 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-260 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-230 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-200 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-170 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-140 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-110 days')),
(1, 8, 'salida', 'Producción de gomitas', 10.0, DATETIME('now', '-80 days')),
(1, 8, 'entrada', 'Reposición de stock', 50.0, DATETIME('now', '-70 days')),

-- Jarabe de agave orgánico (id: 9)
(1, 9, 'entrada', 'Compra inicial para el año', 60.0, DATETIME('now', '-360 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-350 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-320 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-290 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-260 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-230 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-200 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-170 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-140 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-110 days')),
(1, 9, 'salida', 'Producción de gomitas', 5.0, DATETIME('now', '-80 days')),
(1, 9, 'entrada', 'Reposición de stock', 30.0, DATETIME('now', '-70 days')),

-- Ácido cítrico en polvo (id: 10)
(1, 10, 'entrada', 'Compra inicial para el año', 30.0, DATETIME('now', '-360 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-350 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-320 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-290 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-260 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-230 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-200 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-170 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-140 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-110 days')),
(1, 10, 'salida', 'Producción de gomitas', 2.0, DATETIME('now', '-80 days')),
(1, 10, 'entrada', 'Reposición de stock', 15.0, DATETIME('now', '-70 days')),

-- Saborizante de fresa (id: 11)
(1, 11, 'entrada', 'Compra inicial para el año', 10.0, DATETIME('now', '-360 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-350 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-320 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-290 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-260 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-230 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-200 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-170 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-140 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-110 days')),
(1, 11, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-80 days')),
(1, 11, 'entrada', 'Reposición de stock', 5.0, DATETIME('now', '-70 days')),

-- Saborizante de limón (id: 12)
(1, 12, 'entrada', 'Compra inicial para el año', 10.0, DATETIME('now', '-360 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-350 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-320 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-290 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-260 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-230 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-200 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-170 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-140 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-110 days')),
(1, 12, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-80 days')),
(1, 12, 'entrada', 'Reposición de stock', 5.0, DATETIME('now', '-70 days')),

-- Saborizante de mango (id: 13)
(1, 13, 'entrada', 'Compra inicial para el año', 10.0, DATETIME('now', '-360 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-350 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-320 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-290 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-260 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-230 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-200 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-170 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-140 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-110 days')),
(1, 13, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-80 days')),
(1, 13, 'entrada', 'Reposición de stock', 5.0, DATETIME('now', '-70 days')),

-- Saborizante de mora (id: 14)
(1, 14, 'entrada', 'Compra inicial para el año', 10.0, DATETIME('now', '-360 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-350 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-320 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-290 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-260 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-230 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-200 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-170 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-140 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-110 days')),
(1, 14, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-80 days')),
(1, 14, 'entrada', 'Reposición de stock', 5.0, DATETIME('now', '-70 days')),

-- Saborizante de zanahoria (id: 15)
(1, 15, 'entrada', 'Compra inicial para el año', 10.0, DATETIME('now', '-360 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-350 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-320 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-290 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-260 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-230 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-200 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-170 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-140 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-110 days')),
(1, 15, 'salida', 'Producción de gomitas', 1.0, DATETIME('now', '-80 days')),
(1, 15, 'entrada', 'Reposición de stock', 5.0, DATETIME('now', '-70 days')),

-- Pulpa de betabel (id: 16)
(1, 16, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-350 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-320 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-290 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-260 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-230 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-200 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-170 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-140 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-110 days')),
(1, 16, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-80 days')),
(1, 16, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days')),

-- Pulpa de tuna (id: 17)
(1, 17, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-350 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-320 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-290 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-260 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-230 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-200 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-170 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-140 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-110 days')),
(1, 17, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-80 days')),
(1, 17, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days')),

-- Pulpa de durazno (id: 18)
(1, 18, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-350 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-320 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-290 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-260 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-230 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-200 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-170 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-140 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-110 days')),
(1, 18, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-80 days')),
(1, 18, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days')),

-- Pulpa de maracuyá (id: 19)
(1, 19, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-350 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-320 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-290 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-260 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-230 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-200 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-170 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-140 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-110 days')),
(1, 19, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-80 days')),
(1, 19, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days')),

-- Pulpa de coco (id: 20)
(1, 20, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-350 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-320 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-290 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-260 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-230 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-200 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-170 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-140 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-110 days')),
(1, 20, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-80 days')),
(1, 20, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days')),

-- Pulpa de tamarindo (id: 21)
(1, 21, 'entrada', 'Compra inicial para el año', 50.0, DATETIME('now', '-360 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-350 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-320 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-290 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-260 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-230 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-200 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-170 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-140 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-110 days')),
(1, 21, 'salida', 'Producción de pulpas', 5.0, DATETIME('now', '-80 days')),
(1, 21, 'entrada', 'Reposición de stock', 25.0, DATETIME('now', '-70 days'));
---
-- Inserta un movimiento de producto.
INSERT INTO "Product_movements" (
  "user_id",
  "product_id",
  "movement_type",
  "quantity",
  "createdAt"
) VALUES 
-- Movimientos de venta para diferentes productos
(1, 1, 'salida', 5.0, DATETIME('now', '-25 days')),  -- Gomita de Beterraga
(1, 2, 'salida', 8.0, DATETIME('now', '-22 days')),  -- Gomita de Frutilla
(1, 3, 'salida', 12.0, DATETIME('now', '-20 days')), -- Gomita de Limón
(1, 4, 'salida', 6.0, DATETIME('now', '-18 days')),  -- Gomita de Mandarina
(1, 9, 'salida', 3.0, DATETIME('now', '-15 days')),  -- Pulpa de Mango Tropical
(1, 10, 'salida', 2.0, DATETIME('now', '-12 days')), -- Pulpa de Mora Silvestre
(1, 5, 'salida', 9.0, DATETIME('now', '-10 days')),  -- Gomita de Manzana
(1, 12, 'salida', 4.0, DATETIME('now', '-7 days')),  -- Pulpa de Maracuyá
(1, 7, 'salida', 7.0, DATETIME('now', '-5 days')),  -- Gomita de Tuna
(1, 15, 'salida', 3.0, DATETIME('now', '-2 days'));  -- Pulpa de Tamarindo

---
-- Inserta el modelo EOQ (Cantidad Económica de Pedido) para un ingrediente.
INSERT INTO "Ingredients_EOQ_model" (
  "id_Ingredient",
  "orderingCost",
  "annualMaintenanceCost",
  "leadTimeDays",
  "dailyDemand",
  "annualDemand",
  "reorderPoint",
  "updatedAt"
) VALUES (
  1,
  10.0,
  0.5,
  7.0,
  2.0,
  500.0,
  14.0,
  DATETIME('now')
);
---
-- 1. LIMPIEZA Y REINICIO DE CONTADORES
---
DELETE FROM "Sale_products";
DELETE FROM "Sale_orders";
DELETE FROM "Order_clients"; -- Limpiamos esta también por si acaso
DELETE FROM sqlite_sequence WHERE name = 'Order_clients';
DELETE FROM sqlite_sequence WHERE name = 'Sale_orders';
DELETE FROM sqlite_sequence WHERE name = 'Sale_products';

---
-- 2. INSERCIÓN DE DEMANDA HISTÓRICA (12 MESES, ~72 Sale_products, Formato ISO Z)
---
-- Creamos 2 órdenes por mes (una por usuario), cada una con varios productos.

-- Mes 12 (Hace ~360 / ~345 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 1, 55.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-360 days')), -- SO ID 1 (User 1)
(2, 2, 40.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-345 days')); -- SO ID 2 (User 2)
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 1, 10.0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-360 days')),
(1, 3, 5.0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-360 days')),
(1, 5, 8.0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-360 days')),
(2, 9, 3.0, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-345 days')),
(2, 11, 4.0, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-345 days'));

-- Mes 11 (Hace ~330 / ~315 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 3, 65.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-330 days')), -- SO ID 3
(2, 4, 50.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-315 days')); -- SO ID 4
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 2, 12.0, 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-330 days')),
(1, 4, 15.0, 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-330 days')),
(2, 10, 5.0, 4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-315 days')),
(2, 12, 6.0, 4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-315 days')),
(2, 13, 2.0, 4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-315 days'));

-- Mes 10 (Hace ~300 / ~285 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 5, 45.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-300 days')), -- SO ID 5
(2, 6, 70.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-285 days')); -- SO ID 6
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 1, 8.0, 5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-300 days')),
(1, 5, 10.0, 5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-300 days')),
(2, 9, 7.0, 6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-285 days')),
(2, 10, 4.0, 6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-285 days')),
(2, 11, 9.0, 6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-285 days'));

-- Mes 9 (Hace ~270 / ~255 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 7, 80.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-270 days')), -- SO ID 7
(2, 8, 30.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-255 days')); -- SO ID 8
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 2, 18.0, 7, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-270 days')),
(1, 3, 12.0, 7, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-270 days')),
(1, 4, 5.0, 7, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-270 days')),
(2, 12, 2.0, 8, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-255 days')),
(2, 13, 3.0, 8, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-255 days'));

-- Mes 8 (Hace ~240 / ~225 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 9, 50.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-240 days')), -- SO ID 9
(2, 10, 60.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-225 days')); -- SO ID 10
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 1, 7.0, 9, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-240 days')),
(1, 5, 15.0, 9, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-240 days')),
(2, 9, 6.0, 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-225 days')),
(2, 10, 8.0, 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-225 days'));

-- Mes 7 (Hace ~210 / ~195 days)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 11, 75.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-210 days')), -- SO ID 11
(2, 12, 48.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-195 days')); -- SO ID 12
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 2, 14.0, 11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-210 days')),
(1, 3, 9.0, 11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-210 days')),
(1, 4, 11.0, 11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-210 days')),
(2, 11, 5.0, 12, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-195 days')),
(2, 12, 4.0, 12, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-195 days'));

-- Mes 6 (Hace ~180 / ~165 days)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 13, 90.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')), -- SO ID 13
(2, 14, 55.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-165 days')); -- SO ID 14
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 1, 20.0, 13, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
(1, 5, 18.0, 13, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')),
(2, 9, 4.0, 14, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-165 days')),
(2, 13, 6.0, 14, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-165 days'));

-- Mes 5 (Hace ~150 / ~135 days)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 15, 62.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-150 days')), -- SO ID 15
(2, 16, 72.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-135 days')); -- SO ID 16
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 2, 11.0, 15, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-150 days')),
(1, 3, 14.0, 15, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-150 days')),
(2, 10, 7.0, 16, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-135 days')),
(2, 11, 5.0, 16, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-135 days')),
(2, 12, 3.0, 16, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-135 days'));

-- Mes 4 (Hace ~120 / ~105 days)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 17, 88.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')), -- SO ID 17
(2, 18, 41.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-105 days')); -- SO ID 18
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 4, 20.0, 17, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')),
(1, 5, 22.0, 17, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-120 days')),
(2, 9, 2.0, 18, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-105 days')),
(2, 13, 5.0, 18, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-105 days'));

-- Mes 3 (Hace ~90 / ~75 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 19, 70.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')), -- SO ID 19
(2, 20, 95.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-75 days')); -- SO ID 20
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 1, 12.0, 19, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')),
(1, 2, 16.0, 19, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')),
(2, 10, 9.0, 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-75 days')),
(2, 11, 6.0, 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-75 days')),
(2, 12, 7.0, 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-75 days'));

-- Mes 2 (Hace ~60 / ~45 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 21, 58.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days')), -- SO ID 21
(2, 22, 82.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days')); -- SO ID 22
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 3, 13.0, 21, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days')),
(1, 4, 17.0, 21, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days')),
(2, 9, 8.0, 22, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days')),
(2, 13, 10.0, 22, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'));

-- Mes 1 (Hace ~30 / ~15 días)
INSERT INTO "Sale_orders" ("user_id", "order_client_id", "totalCostOrder", "createdAt") VALUES 
(1, 23, 105.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')), -- SO ID 23
(2, 24, 66.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days')); -- SO ID 24
INSERT INTO "Sale_products" ("user_id", "product_id", "quantity", "sale_order_id", "createdAt") VALUES 
(1, 5, 25.0, 23, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')),
(1, 1, 15.0, 23, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')),
(1, 2, 10.0, 23, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')),
(2, 10, 6.0, 24, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days')),
(2, 11, 7.0, 24, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days')),
(2, 12, 5.0, 24, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'));

-- Nota: Los order_client_id en Sale_orders se asumen correlativos (1 a 24), ajusta si tu lógica es diferente.
-- Los totalCostOrder son aproximados.

---
---
-- CORRECCIÓN DEL ERROR P2023: Asegurar el formato de fecha ISO 8601 sin el 'Z' final
---
INSERT INTO "Order_clients" (
    "client_id",
    "product_id",
    "quantity",
    "status",
    "createdAt"
) VALUES
-- NOTA: Se reemplaza strftime('%Y-%m-%dT%H:%M:%fZ', ...) por strftime('%Y-%m-%d %H:%M:%S', ...)
-- ÓRDENES MÁS ANTIGUAS (Meses 7 a 12) -> completado
(1, 1, 10.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-360 days')), -- ID 1 (Fecha segura)
(2, 2, 5.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-345 days')),  -- ID 2
(1, 3, 12.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-330 days')), -- ID 3
(2, 4, 15.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-315 days')), -- ID 4
(1, 5, 8.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-300 days')),  -- ID 5
(2, 6, 10.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-285 days')), -- ID 6
(1, 7, 18.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-270 days')), -- ID 7
(2, 8, 12.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-255 days')), -- ID 8
(1, 9, 7.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-240 days')),  -- ID 9
(2, 10, 6.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-225 days')), -- ID 10
(1, 11, 14.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-210 days')), -- ID 11
(2, 12, 9.0, 'completado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-195 days')), -- ID 12

-- ÓRDENES INTERMEDIAS (Meses 2 a 6) -> reservado
(1, 13, 20.0, 'reservado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-180 days')), -- ID 13
(2, 14, 18.0, 'reservado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-165 days')), -- ID 14
(1, 15, 11.0, 'reservado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-150 days')), -- ID 15
(2, 1, 14.0, 'reservado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-135 days')), -- ID 16
(1, 2, 20.0, 'reservado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-120 days')), -- ID 17
(2, 3, 22.0, 'reservado', strftime('%Y-%m-%d %H:%M:%S', 'now', '-105 days')), -- ID 18
(1, 4, 12.0, 'pendiente_verificacion', strftime('%Y-%m-%d %H:%M:%S', 'now', '-90 days')), -- ID 19
(2, 5, 16.0, 'pendiente_verificacion', strftime('%Y-%m-%d %H:%M:%S', 'now', '-75 days')), -- ID 20
(1, 6, 13.0, 'pendiente_verificacion', strftime('%Y-%m-%d %H:%M:%S', 'now', '-60 days')), -- ID 21
(2, 7, 17.0, 'pendiente_verificacion', strftime('%Y-%m-%d %H:%M:%S', 'now', '-45 days')), -- ID 22

-- ÓRDENES MÁS RECIENTES (Mes 1) -> revisar pago
(1, 8, 25.0, 'pendiente_verificacion', strftime('%Y-%m-%d %H:%M:%S', 'now', '-30 days')), -- ID 23
(2, 9, 15.0, 'pendiente_verificacion', strftime('%Y-%m-%d %H:%M:%S', 'now', '-15 days')); -- ID 24