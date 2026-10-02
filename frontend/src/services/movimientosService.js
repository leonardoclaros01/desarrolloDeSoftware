/**
 * @module movimientosService
 * @description Servicio para registro y consulta de movimientos de bodega (entradas/salidas).
 */

import * as api from './api.js';

/**
 * Obtiene el historial de movimientos de bodega.
 * @returns {Promise<Array<object>>} Lista de movimientos ordenados por fecha desc.
 */
export const getMovimientos = () => api.get('/movimientos');

/**
 * Registra un nuevo movimiento de entrada o salida de bodega.
 * @param {object} movimiento - Datos del movimiento.
 * @param {'ENTRADA'|'SALIDA'} movimiento.tipo - Tipo de movimiento.
 * @param {number} movimiento.productoId - ID del producto afectado.
 * @param {number} movimiento.cantidad - Unidades registradas.
 * @param {string} [movimiento.observacion] - Observación o nota del movimiento.
 * @returns {Promise<object>} Movimiento registrado con ID y timestamp del backend.
 */
export const registrarMovimiento = (movimiento) => api.post('/movimientos', movimiento);

/**
 * Obtiene el resumen de métricas para el dashboard.
 * @returns {Promise<{totalProductos: number, bajosStock: number, movimientosHoy: number}>}
 */
export const getDashboardMetrics = () => api.get('/dashboard/metrics');
