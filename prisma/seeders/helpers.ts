// Utility functions for seeding
export const random = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomFloat = (min: number, max: number): number => 
  Math.random() * (max - min) + min;

// Datos de ejemplo para Nombres
export const names = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Lucía', 'Diego', 'Sofia', 'Miguel', 'Laura'];
export const lastNames = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez'];

// Datos Reales de Ingredientes
export const ingredientsData = [
  { name: 'Azúcar', unit: 'kg', pricePerUnit: 1.85, provider: 'Dulce Sol S.A.', currentQuantity: 150.0 },
  { name: 'Mantequilla sin sal', unit: 'kg', pricePerUnit: 7.50, provider: 'Lácteos El Campo', currentQuantity: 25.0 },
  { name: 'Huevos', unit: 'docena', pricePerUnit: 2.30, provider: 'Granja Avícola', currentQuantity: 60.0 },
  { name: 'Polvo de hornear', unit: 'kg', pricePerUnit: 5.90, provider: 'Repostería Superior', currentQuantity: 10.0 },
  { name: 'Sal', unit: 'kg', pricePerUnit: 0.80, provider: 'Salinera La Costa', currentQuantity: 200.0 },
  { name: 'Cacao en polvo', unit: 'kg', pricePerUnit: 9.20, provider: 'Chocolates Puros', currentQuantity: 15.0 },
  { name: 'Levadura fresca', unit: 'kg', pricePerUnit: 4.00, provider: 'Levaduras El Panadero', currentQuantity: 5.0 },
  { name: 'Grenetina hidrolizada', unit: 'kg', pricePerUnit: 12.50, provider: 'Gelatinas Premium', currentQuantity: 50.0 },
  { name: 'Jarabe de agave orgánico', unit: 'litro', pricePerUnit: 8.20, provider: 'Agaves Del Sol', currentQuantity: 30.0 },
  { name: 'Ácido cítrico en polvo', unit: 'kg', pricePerUnit: 6.75, provider: 'Químicos Naturales', currentQuantity: 15.0 },
  { name: 'Saborizante de fresa', unit: 'litro', pricePerUnit: 15.00, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de limón', unit: 'litro', pricePerUnit: 14.50, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de mango', unit: 'litro', pricePerUnit: 16.00, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de mora', unit: 'litro', pricePerUnit: 16.50, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de zanahoria', unit: 'litro', pricePerUnit: 13.00, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Pulpa de betabel', unit: 'kg', pricePerUnit: 4.50, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de tuna', unit: 'kg', pricePerUnit: 5.20, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de durazno', unit: 'kg', pricePerUnit: 5.80, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de maracuyá', unit: 'kg', pricePerUnit: 6.20, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de coco', unit: 'kg', pricePerUnit: 6.50, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de tamarindo', unit: 'kg', pricePerUnit: 5.40, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
];

export const movementTypes = ['entrada', 'salida', 'ajuste'];
export const reasons = ['Compra', 'Venta', 'Merma', 'Ajuste de inventario', 'Devolución', 'Producción'];
export const orderStatuses = ['pendiente', 'en_proceso', 'completado', 'cancelado'];

export const gomitas = [
  'gomita de tuna', 'gomita de manzana', 'gomita de manzanilla', 'gomita de zanahoria',
  'gomita de frutilla', 'gomita de beterraga', 'gomita de limon', 'gomita de mandarina',
];

export const pulpas = [
  'pulpa de tuna', 'pulpa de manzana', 'pulpa de manzanilla', 'pulpa de zanahoria',
  'pulpa de frutilla', 'pulpa de beterraga', 'pulpa de limon', 'pulpa de mandarina',
];
