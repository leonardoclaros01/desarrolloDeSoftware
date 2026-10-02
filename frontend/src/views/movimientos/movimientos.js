/**
 * @module movimientosView
 * @description Vista para el registro de entradas/salidas de bodega.
 * Incluye formulario de registro con selector de tipo (ENTRADA/SALIDA),
 * y tabla del historial con filtros por tipo.
 */

import './movimientos.css';
import { renderView } from '../../router.js';
import { buildSidebar, attachSidebarLogout } from '../../components/sidebar.js';
import { registrarMovimiento, getMovimientos } from '../../services/movimientosService.js';
import { getProductos } from '../../services/productosService.js';
import { showToast } from '../../utils/toast.js';

/** @type {'ENTRADA'|'SALIDA'} Tipo de movimiento seleccionado actualmente. */
let tipoSeleccionado = 'ENTRADA';

/** @type {Array<object>} Cache del historial de movimientos. */
let historialCache = [];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Genera el HTML de un item del historial de movimientos.
 * @param {object} mov - Movimiento a renderizar.
 * @returns {string} HTML del item.
 */
const buildHistorialItem = (mov) => {
  const tipo = (mov.tipo ?? 'entrada').toLowerCase();
  const fecha = mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';

  return `
    <div class="mov-list-item">
      <div class="mov-tipo-pill ${tipo}">${tipo === 'entrada' ? '📥' : '📤'}</div>
      <div>
        <div class="mov-detail-nombre">${mov.productoNombre ?? mov.producto ?? 'Producto'}</div>
        <div class="mov-detail-obs">${mov.observacion ?? fecha}</div>
      </div>
      <span class="mov-qty ${tipo}">${tipo === 'entrada' ? '+' : '-'}${mov.cantidad}</span>
    </div>
  `;
};

/**
 * Renderiza el historial filtrado en el contenedor correspondiente.
 * @param {Array<object>} movimientos - Lista a renderizar.
 * @returns {void}
 */
const renderHistorial = (movimientos) => {
  const container = document.getElementById('historial-container');
  if (!container) return;

  if (!movimientos.length) {
    container.innerHTML = `<div class="empty-state" style="padding:32px;">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">Sin movimientos</div>
    </div>`;
    return;
  }
  container.innerHTML = movimientos.map(buildHistorialItem).join('');
};

/**
 * Carga el historial desde el backend y actualiza el cache.
 * @returns {Promise<void>}
 */
const loadHistorial = async () => {
  const container = document.getElementById('historial-container');
  if (container) {
    container.innerHTML = `<div class="loader-container"><div class="spinner"></div> Cargando…</div>`;
  }
  try {
    historialCache = await getMovimientos();
    renderHistorial(historialCache);
  } catch {
    renderHistorial([]);
  }
};

// ── Interacciones del formulario ────────────────────────────────────────────

/**
 * Actualiza el estado visual de los botones ENTRADA/SALIDA.
 * @param {'ENTRADA'|'SALIDA'} tipo - Tipo seleccionado.
 * @returns {void}
 */
const selectTipo = (tipo) => {
  tipoSeleccionado = tipo;
  const btnEntrada = document.getElementById('tipo-entrada');
  const btnSalida  = document.getElementById('tipo-salida');
  btnEntrada?.classList.toggle('selected-entrada', tipo === 'ENTRADA');
  btnEntrada?.classList.remove('selected-salida');
  btnSalida?.classList.toggle('selected-salida', tipo === 'SALIDA');
  btnSalida?.classList.remove('selected-entrada');
};

/**
 * Conecta todos los listeners de la sección de registro de movimientos.
 * @returns {void}
 */
const attachMovimientosListeners = () => {
  // Selector de tipo
  document.getElementById('tipo-entrada')?.addEventListener('click', () => selectTipo('ENTRADA'));
  document.getElementById('tipo-salida')?.addEventListener('click',  () => selectTipo('SALIDA'));

  // Filtros del historial
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      const filtro = btn.dataset.filter;
      const filtered = filtro === 'todos'
        ? historialCache
        : historialCache.filter(m => (m.tipo ?? '').toUpperCase() === filtro.toUpperCase());
      renderHistorial(filtered);
    });
  });

  // Submit del formulario de registro
  document.getElementById('movimiento-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('mov-save-btn');

    const productoId  = document.getElementById('mov-producto').value;
    const cantidad    = parseInt(document.getElementById('mov-cantidad').value, 10);
    const observacion = document.getElementById('mov-obs').value.trim();

    if (!productoId) { showToast('Selecciona un producto.', 'error'); return; }
    if (!cantidad || cantidad <= 0) { showToast('La cantidad debe ser mayor a 0.', 'error'); return; }

    const payload = { tipo: tipoSeleccionado, productoId, cantidad, observacion };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Registrando…';

    try {
      await registrarMovimiento(payload);
      showToast(`${tipoSeleccionado === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada correctamente.`, 'success');
      e.target.reset();
      selectTipo('ENTRADA');
      await loadHistorial();
    } catch (err) {
      showToast(err.message ?? 'Error al registrar el movimiento.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Registrar Movimiento';
    }
  });

  // Logout
  attachSidebarLogout();
};

// ── Inicializador ───────────────────────────────────────────────────────────

/**
 * Inicializa la vista de movimientos: renderiza el shell, carga productos y historial.
 * @returns {Promise<void>}
 */
export const initMovimientos = async () => {
  // Cargar productos para el select del formulario
  let productos = [];
  try { productos = await getProductos(); } catch { /* se muestra vacío */ }

  const productosOptions = productos.length
    ? productos.map(p => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock ?? 0})</option>`).join('')
    : '<option disabled>Sin productos disponibles</option>';

  renderView(`
    <div class="app-shell">
      ${buildSidebar('movimientos')}
      <main class="main-content">
        <div class="page-wrapper">

          <header class="page-header">
            <div>
              <h1 class="page-title">Movimientos de Bodega</h1>
              <p class="page-subtitle">Registra entradas y salidas de stock.</p>
            </div>
          </header>

          <div class="movimientos-layout">

            <!-- Formulario de registro -->
            <div class="card movimiento-form-card">
              <h2 class="section-title">Registrar Movimiento</h2>

              <!-- Selector tipo -->
              <div class="tipo-selector">
                <button type="button" id="tipo-entrada" class="tipo-btn selected-entrada">
                  📥 ENTRADA
                </button>
                <button type="button" id="tipo-salida" class="tipo-btn">
                  📤 SALIDA
                </button>
              </div>

              <form id="movimiento-form" class="movimiento-form" novalidate>
                <div class="form-group">
                  <label class="form-label" for="mov-producto">Producto *</label>
                  <select id="mov-producto" class="form-select" required>
                    <option value="">— Selecciona un producto —</option>
                    ${productosOptions}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="mov-cantidad">Cantidad *</label>
                  <input type="number" id="mov-cantidad" class="form-input" min="1" placeholder="0" required />
                </div>

                <div class="form-group">
                  <label class="form-label" for="mov-obs">Observación</label>
                  <input type="text" id="mov-obs" class="form-input" placeholder="Nota opcional (proveedor, motivo, etc.)" />
                </div>

                <button type="submit" id="mov-save-btn" class="btn btn-primary" style="width:100%;justify-content:center;padding:14px;">
                  Registrar Movimiento
                </button>
              </form>
            </div>

            <!-- Historial de movimientos -->
            <div class="card historial-card">
              <h2 class="section-title">Historial</h2>

              <div class="filter-bar">
                <button class="btn btn-sm btn-primary filter-btn" data-filter="todos">Todos</button>
                <button class="btn btn-sm btn-secondary filter-btn" data-filter="ENTRADA">📥 Entradas</button>
                <button class="btn btn-sm btn-secondary filter-btn" data-filter="SALIDA">📤 Salidas</button>
              </div>

              <div id="historial-container">
                <div class="loader-container"><div class="spinner"></div> Cargando…</div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  `);

  attachMovimientosListeners();
  await loadHistorial();
};
