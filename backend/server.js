/**
 * @file server.js
 * @description Servidor Express principal del sistema Bodega & Administración.
 * Expone los endpoints REST para auth, productos, movimientos y dashboard.
 * Usa datos en memoria (sin base de datos) para desarrollo rápido.
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = 'bodega-secret-dev-2024';

// ── Middlewares ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Base de datos en memoria ──────────────────────────────────────────────────

/** Usuarios del sistema */
const usuarios = [
  { id: 1, usuario: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'ADMIN' },
  { id: 2, usuario: 'bodega', password: 'bodega123', nombre: 'Operador Bodega', rol: 'OPERADOR' },
];

/** Catálogo de productos */
let productos = [
  { id: 1, nombre: 'Aceite de Motor 10W-40',  sku: 'ACE-001', categoria: 'Lubricantes',   stock: 85,  stockMinimo: 20, precio: 12500, unidad: 'litro',  activo: true },
  { id: 2, nombre: 'Filtro de Aire Premium',   sku: 'FIL-002', categoria: 'Filtros',        stock: 12,  stockMinimo: 15, precio: 8900,  unidad: 'unidad', activo: true },
  { id: 3, nombre: 'Batería 12V 60Ah',         sku: 'BAT-003', categoria: 'Electricidad',  stock: 24,  stockMinimo: 5,  precio: 89000, unidad: 'unidad', activo: true },
  { id: 4, nombre: 'Liquido de Frenos DOT4',   sku: 'LIQ-004', categoria: 'Fluidos',        stock: 6,   stockMinimo: 10, precio: 4500,  unidad: 'litro',  activo: true },
  { id: 5, nombre: 'Bujías Iridium Set x4',    sku: 'BUJ-005', categoria: 'Encendido',     stock: 38,  stockMinimo: 10, precio: 22000, unidad: 'set',    activo: true },
  { id: 6, nombre: 'Correa de Distribución',   sku: 'COR-006', categoria: 'Motor',          stock: 9,   stockMinimo: 8,  precio: 35000, unidad: 'unidad', activo: true },
  { id: 7, nombre: 'Anticongelante Verde 1L',  sku: 'ANT-007', categoria: 'Fluidos',        stock: 55,  stockMinimo: 15, precio: 6800,  unidad: 'litro',  activo: true },
  { id: 8, nombre: 'Pastillas de Freno Del.',  sku: 'PAS-008', categoria: 'Frenos',         stock: 3,   stockMinimo: 8,  precio: 18500, unidad: 'par',    activo: true },
  { id: 9, nombre: 'Aceite de Caja 75W-90',   sku: 'ACE-009', categoria: 'Lubricantes',   stock: 30,  stockMinimo: 10, precio: 16000, unidad: 'litro',  activo: true },
  { id: 10,nombre: 'Filtro de Combustible',    sku: 'FIL-010', categoria: 'Filtros',        stock: 20,  stockMinimo: 12, precio: 7200,  unidad: 'unidad', activo: true },
];

/** Historial de movimientos */
let movimientos = [
  { id: 1, tipo: 'ENTRADA', productoId: 1, productoNombre: 'Aceite de Motor 10W-40', cantidad: 50, observacion: 'Reposición mensual',       fecha: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 2, tipo: 'SALIDA',  productoId: 2, productoNombre: 'Filtro de Aire Premium',  cantidad: 3,  observacion: 'Despacho a taller norte',  fecha: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: 3, tipo: 'SALIDA',  productoId: 4, productoNombre: 'Liquido de Frenos DOT4',  cantidad: 4,  observacion: 'Venta mostrador',          fecha: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 4, tipo: 'ENTRADA', productoId: 8, productoNombre: 'Pastillas de Freno Del.', cantidad: 10, observacion: 'Compra a proveedor',       fecha: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 5, tipo: 'SALIDA',  productoId: 5, productoNombre: 'Bujías Iridium Set x4',   cantidad: 2,  observacion: 'Despacho urgente',         fecha: new Date(Date.now() - 1800000).toISOString() },
];

let nextProductoId   = 11;
let nextMovimientoId = 6;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Genera un token JWT de 8 horas */
const generarToken = (user) =>
  jwt.sign({ id: user.id, usuario: user.usuario, rol: user.rol }, JWT_SECRET, { expiresIn: '8h' });

/** Middleware para verificar JWT en rutas protegidas */
const authMiddleware = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido.' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { usuario, password }
 * Retorna: { token, user }
 */
app.post('/api/auth/login', (req, res) => {
  const { usuario, password } = req.body ?? {};

  if (!usuario || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  const user = usuarios.find(
    (u) => (u.usuario === usuario || u.usuario === usuario) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Credenciales incorrectas.' });
  }

  const token = generarToken(user);
  const { password: _, ...userSafe } = user;

  res.json({ token, user: userSafe });
});

// ── Productos ─────────────────────────────────────────────────────────────────

/** GET /api/productos - Lista todos los productos */
app.get('/api/productos', authMiddleware, (req, res) => {
  res.json(productos.filter((p) => p.activo));
});

/** GET /api/productos/:id - Obtiene un producto por ID */
app.get('/api/productos/:id', authMiddleware, (req, res) => {
  const producto = productos.find((p) => p.id === Number(req.params.id));
  if (!producto) return res.status(404).json({ message: 'Producto no encontrado.' });
  res.json(producto);
});

/** POST /api/productos - Crea un nuevo producto */
app.post('/api/productos', authMiddleware, (req, res) => {
  const { nombre, sku, categoria, stock, stockMinimo, precio, unidad } = req.body;
  if (!nombre || !sku) {
    return res.status(400).json({ message: 'Nombre y SKU son requeridos.' });
  }
  const nuevo = {
    id: nextProductoId++,
    nombre, sku, categoria: categoria || 'General',
    stock: Number(stock) || 0,
    stockMinimo: Number(stockMinimo) || 0,
    precio: Number(precio) || 0,
    unidad: unidad || 'unidad',
    activo: true,
  };
  productos.push(nuevo);
  res.status(201).json(nuevo);
});

/** PUT /api/productos/:id - Actualiza un producto */
app.put('/api/productos/:id', authMiddleware, (req, res) => {
  const idx = productos.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Producto no encontrado.' });
  productos[idx] = { ...productos[idx], ...req.body, id: productos[idx].id };
  res.json(productos[idx]);
});

/** DELETE /api/productos/:id - Elimina (desactiva) un producto */
app.delete('/api/productos/:id', authMiddleware, (req, res) => {
  const idx = productos.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Producto no encontrado.' });
  productos[idx].activo = false;
  res.status(204).send();
});

// ── Movimientos ───────────────────────────────────────────────────────────────

/** GET /api/movimientos - Historial de movimientos (más recientes primero) */
app.get('/api/movimientos', authMiddleware, (req, res) => {
  const sorted = [...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  res.json(sorted);
});

/** POST /api/movimientos - Registra un nuevo movimiento */
app.post('/api/movimientos', authMiddleware, (req, res) => {
  const { tipo, productoId, cantidad, observacion } = req.body;

  if (!tipo || !productoId || !cantidad) {
    return res.status(400).json({ message: 'tipo, productoId y cantidad son requeridos.' });
  }

  const producto = productos.find((p) => p.id === Number(productoId) && p.activo);
  if (!producto) return res.status(404).json({ message: 'Producto no encontrado.' });

  const cant = Number(cantidad);

  if (tipo === 'SALIDA' && producto.stock < cant) {
    return res.status(409).json({ message: `Stock insuficiente. Stock actual: ${producto.stock}` });
  }

  // Actualizar stock
  producto.stock += tipo === 'ENTRADA' ? cant : -cant;

  const movimiento = {
    id: nextMovimientoId++,
    tipo,
    productoId: producto.id,
    productoNombre: producto.nombre,
    cantidad: cant,
    observacion: observacion || '',
    fecha: new Date().toISOString(),
  };
  movimientos.push(movimiento);
  res.status(201).json(movimiento);
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

/** GET /api/dashboard/metrics - Métricas para el dashboard */
app.get('/api/dashboard/metrics', authMiddleware, (req, res) => {
  const activos       = productos.filter((p) => p.activo);
  const totalProductos = activos.length;
  const bajosStock    = activos.filter((p) => p.stock <= p.stockMinimo).length;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const movimientosHoy = movimientos.filter((m) => new Date(m.fecha) >= hoy).length;

  const valorInventario = activos.reduce((sum, p) => sum + p.stock * p.precio, 0);

  res.json({ totalProductos, bajosStock, movimientosHoy, valorInventario });
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Backend Bodega & Admin corriendo en http://localhost:${PORT}`);
  console.log(`\n📋 Usuarios de acceso:`);
  console.log(`   👤 admin   / admin123   (Administrador)`);
  console.log(`   👤 bodega  / bodega123  (Operador Bodega)`);
  console.log(`\n📦 ${productos.length} productos cargados en inventario`);
  console.log(`📝 ${movimientos.length} movimientos de ejemplo cargados\n`);
});
