/**
 * @module productosService
 * @description Servicio para gestión de productos e inventario.
 * Encapsula todas las llamadas HTTP relacionadas con el catálogo de productos.
 */

import * as api from './api.js';

/**
 * Obtiene la lista completa de productos del inventario.
 * @returns {Promise<Array<object>>} Arreglo de productos.
 */
export const getProductos = () => api.get('/productos');

/**
 * Obtiene un producto por su ID.
 * @param {number|string} id - Identificador único del producto.
 * @returns {Promise<object>} Datos del producto.
 */
export const getProductoById = (id) => api.get(`/productos/${id}`);

/**
 * Crea un nuevo producto en el catálogo.
 * @param {object} producto - Datos del nuevo producto (nombre, sku, stock, etc.).
 * @returns {Promise<object>} Producto creado con ID asignado por el backend.
 */
export const createProducto = (producto) => api.post('/productos', producto);

/**
 * Actualiza completamente un producto existente.
 * @param {number|string} id - ID del producto a actualizar.
 * @param {object} producto - Datos actualizados.
 * @returns {Promise<object>} Producto actualizado.
 */
export const updateProducto = (id, producto) => api.put(`/productos/${id}`, producto);

/**
 * Elimina (da de baja) un producto del catálogo.
 * @param {number|string} id - ID del producto a eliminar.
 * @returns {Promise<null>}
 */
export const deleteProducto = (id) => api.del(`/productos/${id}`);
