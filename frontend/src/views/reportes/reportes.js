/**
 * @module reportesView
 * @description Vista de reportes y estadísticas de bodega.
 * Placeholder funcional listo para integrar gráficas (Chart.js, etc.).
 */

import { renderView } from '../../router.js';
import { buildSidebar, attachSidebarLogout } from '../../components/sidebar.js';
import { getMovimientos } from '../../services/movimientosService.js';
import { getProductos } from '../../services/productosService.js';
import { showToast } from '../../utils/toast.js';

/**
 * Genera una fila de reporte de producto.
 * @param {object} prod - Objeto producto.
 * @returns {string} HTML de la fila.
 */
const buildReporteRow = (prod) => {
  const estado = (prod.stock ?? 0) <= 5
    ? '<span class="badge badge-danger">Crítico</span>'
    : (prod.stock ?? 0) <= 20
      ? '<span class="badge badge-warning">Bajo</span>'
      : '<span class="badge badge-success">Normal</span>';

  return `
    <tr>
      <td style="font-weight:500;color:var(--clr-text-primary);">${prod.nombre}</td>
      <td>${prod.sku ?? '—'}</td>
      <td>${prod.categoria ?? '—'}</td>
      <td style="font-weight:700;">${prod.stock ?? 0}</td>
      <td>${estado}</td>
    </tr>
  `;
};

/**
 * Inicializa la vista de reportes: muestra un resumen tabular de inventario.
 * @returns {Promise<void>}
 */
export const initReportes = async () => {
  renderView(`
    <div class="app-shell">
      ${buildSidebar('reportes')}
      <main class="main-content">
        <div class="page-wrapper">
          <header class="page-header">
            <div>
              <h1 class="page-title">Reportes</h1>
              <p class="page-subtitle">Análisis y estado del inventario.</p>
            </div>
          </header>
          <div class="loader-container"><div class="spinner"></div> Generando reporte…</div>
        </div>
      </main>
    </div>
  `);

  try {
    const [productos, movimientos] = await Promise.all([getProductos(), getMovimientos()]);

    const totalStock    = productos.reduce((acc, p) => acc + (p.stock ?? 0), 0);
    const criticos      = productos.filter(p => (p.stock ?? 0) <= 5).length;
    const totalEntradas = movimientos.filter(m => m.tipo?.toUpperCase() === 'ENTRADA').length;
    const totalSalidas  = movimientos.filter(m => m.tipo?.toUpperCase() === 'SALIDA').length;

    renderView(`
      <div class="app-shell">
        ${buildSidebar('reportes')}
        <main class="main-content">
          <div class="page-wrapper">
            <header class="page-header">
              <div>
                <h1 class="page-title">Reportes</h1>
                <p class="page-subtitle">Análisis y estado del inventario.</p>
              </div>
            </header>

            <!-- Resumen ejecutivo -->
            <div class="metrics-grid" style="margin-bottom:28px;">
              <div class="card metric-card indigo">
                <div class="metric-header">
                  <span class="metric-label">Total Unidades</span>
                  <div class="metric-icon indigo">📦</div>
                </div>
                <div class="metric-value">${totalStock.toLocaleString('es-CL')}</div>
              </div>
              <div class="card metric-card amber">
                <div class="metric-header">
                  <span class="metric-label">Productos Críticos</span>
                  <div class="metric-icon amber">⚠️</div>
                </div>
                <div class="metric-value">${criticos}</div>
              </div>
              <div class="card metric-card green">
                <div class="metric-header">
                  <span class="metric-label">Total Entradas</span>
                  <div class="metric-icon green">📥</div>
                </div>
                <div class="metric-value">${totalEntradas}</div>
              </div>
              <div class="card metric-card sky">
                <div class="metric-header">
                  <span class="metric-label">Total Salidas</span>
                  <div class="metric-icon sky">📤</div>
                </div>
                <div class="metric-value">${totalSalidas}</div>
              </div>
            </div>

            <!-- Tabla de inventario completo -->
            <div class="card" style="overflow:hidden;">
              <div style="padding:20px 24px;border-bottom:1px solid var(--clr-border);">
                <h2 style="font-size:1rem;font-weight:700;">Estado del Inventario</h2>
              </div>
              <div style="overflow-x:auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th><th>SKU</th><th>Categoría</th><th>Stock Actual</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productos.length
                      ? productos.map(buildReporteRow).join('')
                      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--clr-text-muted);">Sin datos</td></tr>'
                    }
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>
    `);

  } catch (err) {
    showToast('Error al generar el reporte.', 'error');
  }

  attachSidebarLogout();
};
