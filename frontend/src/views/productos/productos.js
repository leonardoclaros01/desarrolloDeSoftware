/**
 * @module productosView
 * @description Vista de gestión de productos e inventario.
 * Incluye tabla dinámica, buscador en tiempo real, y modal para
 * agregar / editar productos mediante peticiones al backend.
 */

import './productos.css';
import { renderView } from '../../router.js';
import { buildSidebar, attachSidebarLogout } from '../../components/sidebar.js';
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from '../../services/productosService.js';
import { showToast } from '../../utils/toast.js';

/** @type {Array<object>} Cache local de productos para filtrado sin re-fetch */
let productosCache = [];

// ── Helpers de visualización ────────────────────────────────────────────────

/**
 * Devuelve la clase CSS de color para el stock según su nivel.
 * @param {number} stock - Cantidad en stock.
 * @returns {string} Clase CSS correspondiente.
 */
const stockClass = (stock) => {
  if (stock <= 5)  return 'stock-low';
  if (stock <= 20) return 'stock-medium';
  return 'stock-ok';
};

/**
 * Genera el HTML de una fila de la tabla de productos.
 * @param {object} prod - Objeto de producto.
 * @returns {string} HTML del elemento <tr>.
 */
const buildProductRow = (prod) => `
  <tr data-id="${prod.id}">
    <td><span class="product-sku">${prod.sku ?? '—'}</span></td>
    <td style="font-weight:500;color:var(--clr-text-primary);">${prod.nombre}</td>
    <td>${prod.categoria ?? '—'}</td>
    <td><span class="${stockClass(prod.stock ?? 0)}">${prod.stock ?? 0}</span></td>
    <td>
      <span class="badge ${(prod.stock ?? 0) <= 5 ? 'badge-danger' : (prod.stock ?? 0) <= 20 ? 'badge-warning' : 'badge-success'}">
        ${(prod.stock ?? 0) <= 5 ? 'Crítico' : (prod.stock ?? 0) <= 20 ? 'Bajo' : 'Normal'}
      </span>
    </td>
    <td class="action-buttons">
      <button class="btn btn-sm btn-secondary btn-edit" data-id="${prod.id}" data-prod='${JSON.stringify(prod)}'>
        ✏️ Editar
      </button>
      <button class="btn btn-sm btn-danger btn-delete" data-id="${prod.id}" data-nombre="${prod.nombre}">
        🗑️
      </button>
    </td>
  </tr>
`;

/**
 * Renderiza o actualiza el cuerpo de la tabla de productos.
 * @param {Array<object>} productos - Lista de productos a mostrar.
 * @returns {void}
 */
const renderTable = (productos) => {
  const tbody = document.getElementById('productos-tbody');
  if (!tbody) return;

  if (!productos.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-title">Sin productos</div>
          <div class="empty-state-desc">No se encontraron productos con ese criterio.</div>
        </div>
      </td></tr>
    `;
    return;
  }
  tbody.innerHTML = productos.map(buildProductRow).join('');
  attachTableListeners();
};

// ── Modal ───────────────────────────────────────────────────────────────────

/**
 * Abre el modal para agregar o editar un producto.
 * @param {object|null} [prod=null] - Producto a editar. null para creación.
 * @returns {void}
 */
const openModal = (prod = null) => {
  const isEditing = !!prod;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'producto-modal';

  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">${isEditing ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h3>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>

      <form id="producto-form" class="modal-form" novalidate>
        <div class="modal-form-row">
          <div class="form-group">
            <label class="form-label" for="prod-nombre">Nombre *</label>
            <input type="text" id="prod-nombre" class="form-input" placeholder="Nombre del producto" value="${prod?.nombre ?? ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="prod-sku">SKU</label>
            <input type="text" id="prod-sku" class="form-input" placeholder="SKU-001" value="${prod?.sku ?? ''}" />
          </div>
        </div>

        <div class="modal-form-row">
          <div class="form-group">
            <label class="form-label" for="prod-categoria">Categoría</label>
            <input type="text" id="prod-categoria" class="form-input" placeholder="Ej: Calzado" value="${prod?.categoria ?? ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="prod-stock">Stock Inicial *</label>
            <input type="number" id="prod-stock" class="form-input" min="0" placeholder="0" value="${prod?.stock ?? 0}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="prod-descripcion">Descripción</label>
          <input type="text" id="prod-descripcion" class="form-input" placeholder="Descripción breve (opcional)" value="${prod?.descripcion ?? ''}" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="modal-save-btn">
            ${isEditing ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Cerrar modal
  const closeModal = () => overlay.remove();
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Submit del formulario
  document.getElementById('producto-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('modal-save-btn');

    const payload = {
      nombre:      document.getElementById('prod-nombre').value.trim(),
      sku:         document.getElementById('prod-sku').value.trim(),
      categoria:   document.getElementById('prod-categoria').value.trim(),
      stock:       parseInt(document.getElementById('prod-stock').value, 10) || 0,
      descripcion: document.getElementById('prod-descripcion').value.trim(),
    };

    if (!payload.nombre) {
      showToast('El nombre del producto es obligatorio.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';

    try {
      if (isEditing) {
        await updateProducto(prod.id, payload);
        showToast('Producto actualizado correctamente.', 'success');
      } else {
        await createProducto(payload);
        showToast('Producto creado correctamente.', 'success');
      }
      closeModal();
      await loadProductos(); // Refresca la tabla
    } catch (err) {
      showToast(err.message ?? 'Error al guardar el producto.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEditing ? 'Guardar Cambios' : 'Crear Producto';
    }
  });
};

// ── Listeners de la tabla ───────────────────────────────────────────────────

/**
 * Agrega los event listeners a los botones de acción de la tabla (editar/eliminar).
 * @returns {void}
 */
const attachTableListeners = () => {
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const prod = JSON.parse(btn.dataset.prod);
      openModal(prod);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { id, nombre } = btn.dataset;
      if (!confirm(`¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`)) return;

      btn.disabled = true;
      try {
        await deleteProducto(id);
        showToast(`"${nombre}" eliminado correctamente.`, 'success');
        await loadProductos();
      } catch (err) {
        showToast(err.message ?? 'Error al eliminar el producto.', 'error');
        btn.disabled = false;
      }
    });
  });
};

// ── Carga de datos ──────────────────────────────────────────────────────────

/**
 * Obtiene los productos del backend, actualiza el cache local y renderiza la tabla.
 * @returns {Promise<void>}
 */
const loadProductos = async () => {
  const tbody = document.getElementById('productos-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="loader-container"><div class="spinner"></div> Cargando…</div></td></tr>`;
  }

  try {
    productosCache = await getProductos();
    renderTable(productosCache);
  } catch (err) {
    showToast('Error al cargar productos.', 'error');
    renderTable([]);
  }
};

// ── Inicializador ───────────────────────────────────────────────────────────

/**
 * Inicializa la vista de gestión de productos.
 * Renderiza el shell, carga datos y conecta interacciones.
 * @returns {Promise<void>}
 */
export const initProductos = async () => {
  renderView(`
    <div class="app-shell">
      ${buildSidebar('productos')}
      <main class="main-content">
        <div class="page-wrapper">

          <header class="page-header">
            <div>
              <h1 class="page-title">Gestión de Productos</h1>
              <p class="page-subtitle">Inventario completo de la bodega.</p>
            </div>
            <button id="btn-nuevo-producto" class="btn btn-primary">+ Nuevo Producto</button>
          </header>

          <!-- Barra de búsqueda -->
          <div class="toolbar">
            <div class="search-bar" style="max-width:420px;flex:1;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="search-input" placeholder="Buscar por nombre, SKU o categoría…" />
            </div>
          </div>

          <!-- Tabla de productos -->
          <div class="table-container card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="productos-tbody">
                <tr><td colspan="6"><div class="loader-container"><div class="spinner"></div> Cargando…</div></td></tr>
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  `);

  // Cargar datos
  await loadProductos();

  // Botón nuevo producto
  document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => openModal());

  // Buscador en tiempo real
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) { renderTable(productosCache); return; }
    const filtered = productosCache.filter(p =>
      (p.nombre ?? '').toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.categoria ?? '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  });

  // Logout
  attachSidebarLogout();
};
