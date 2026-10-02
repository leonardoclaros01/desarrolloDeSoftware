/**
 * @module dashboardView
 * @description Vista principal del tablero de administración.
 * Muestra métricas clave, alertas de bajo stock y movimientos recientes.
 * Todos los datos son obtenidos desde el backend a través del servicio correspondiente.
 */

import './dashboard.css';
import { renderView } from '../../router.js';
import { buildSidebar, attachSidebarLogout } from '../../components/sidebar.js';
import { getDashboardMetrics, getMovimientos } from '../../services/movimientosService.js';
import { getProductos } from '../../services/productosService.js';
import { showToast } from '../../utils/toast.js';

export { buildSidebar };

// ── Helpers de formato ──────────────────────────────────────────────────────

/**
 * Genera las tarjetas de métricas con datos reales o placeholders de carga.
 * @param {object} metrics - Métricas del backend.
 * @returns {string} Markup HTML de la grid de métricas.
 */
const buildMetricCards = (metrics) => `
  <div class="metrics-grid">
    <div class="card metric-card indigo">
      <div class="metric-header">
        <span class="metric-label">Total Productos</span>
        <div class="metric-icon indigo">📦</div>
      </div>
      <div class="metric-value">${metrics?.totalProductos ?? '—'}</div>
      <div class="metric-trend">
        <span>SKUs activos en bodega</span>
      </div>
    </div>

    <div class="card metric-card amber">
      <div class="metric-header">
        <span class="metric-label">Bajo Stock</span>
        <div class="metric-icon amber">⚠️</div>
      </div>
      <div class="metric-value">${metrics?.bajosStock ?? '—'}</div>
      <div class="metric-trend">
        <span class="trend-down">Requieren reposición</span>
      </div>
    </div>

    <div class="card metric-card green">
      <div class="metric-header">
        <span class="metric-label">Entradas Hoy</span>
        <div class="metric-icon green">📥</div>
      </div>
      <div class="metric-value">${metrics?.entradasHoy ?? '—'}</div>
      <div class="metric-trend">
        <span class="trend-up">Movimientos de entrada</span>
      </div>
    </div>

    <div class="card metric-card sky">
      <div class="metric-header">
        <span class="metric-label">Salidas Hoy</span>
        <div class="metric-icon sky">📤</div>
      </div>
      <div class="metric-value">${metrics?.salidasHoy ?? '—'}</div>
      <div class="metric-trend">
        <span>Movimientos de salida</span>
      </div>
    </div>
  </div>
`;

/**
 * Genera el HTML de un item de movimiento reciente.
 * @param {object} mov - Objeto de movimiento del backend.
 * @returns {string} HTML del item.
 */
const buildMovimientoItem = (mov) => {
  const tipo = mov.tipo?.toLowerCase() ?? 'entrada';
  const iconMap = { entrada: '📥', salida: '📤' };
  const fecha = mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : 'Sin fecha';

  return `
    <div class="movimiento-item">
      <div class="movimiento-icon ${tipo}">${iconMap[tipo] ?? '📦'}</div>
      <div class="movimiento-info">
        <div class="movimiento-nombre">${mov.productoNombre ?? mov.producto ?? 'Producto'}</div>
        <div class="movimiento-fecha">${fecha}</div>
      </div>
      <span class="movimiento-cantidad ${tipo}">
        ${tipo === 'entrada' ? '+' : '-'}${mov.cantidad}
      </span>
    </div>
  `;
};

/**
 * Genera el HTML de un producto con bajo stock.
 * @param {object} prod - Objeto de producto.
 * @returns {string} HTML del alert item.
 */
const buildAlertItem = (prod) => `
  <div class="alert-item">
    <div style="display:flex;align-items:center;">
      <div class="alert-dot"></div>
      <span class="alert-nombre">${prod.nombre ?? 'Producto'}</span>
    </div>
    <span class="alert-stock">${prod.stock ?? 0} uds.</span>
  </div>
`;

// ── Plantilla HTML base del Dashboard ──────────────────────────────────────

/**
 * Genera el markup HTML completo del dashboard con el shell de la app.
 * @param {object} metrics - Métricas del backend.
 * @param {Array} movimientos - Lista de movimientos recientes.
 * @param {Array} bajosStock - Lista de productos con bajo stock.
 * @returns {string} HTML completo de la página.
 */
const buildDashboardHTML = (metrics, movimientos, bajosStock) => `
<div class="app-shell">
  ${buildSidebar('dashboard')}
  <main class="main-content">
    <div class="page-wrapper">

      <header class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Resumen general del estado de la bodega.</p>
        </div>
        <a href="#/movimientos" class="btn btn-primary">
          + Registrar Movimiento
        </a>
      </header>

      <!-- Métricas -->
      ${buildMetricCards(metrics)}

      <!-- Grid principal -->
      <div class="dashboard-grid">

        <!-- Movimientos recientes -->
        <div class="card" style="padding:24px;">
          <h2 class="section-title">Últimos Movimientos</h2>
          <div id="movimientos-list">
            ${movimientos.length
              ? movimientos.slice(0, 8).map(buildMovimientoItem).join('')
              : '<p style="color:var(--clr-text-muted);font-size:0.875rem;padding:16px 0;">Sin movimientos registrados.</p>'
            }
          </div>
          <a href="#/movimientos" style="display:block;text-align:center;margin-top:16px;font-size:0.8rem;color:var(--clr-accent);">
            Ver todos →
          </a>
        </div>

        <!-- Panel derecho -->
        <div style="display:flex;flex-direction:column;gap:24px;">

          <!-- Alertas bajo stock -->
          <div class="card" style="padding:24px;">
            <h2 class="section-title">⚠️ Bajo Stock</h2>
            <div id="bajos-stock-list">
              ${bajosStock.length
                ? bajosStock.slice(0, 6).map(buildAlertItem).join('')
                : '<p style="color:var(--clr-text-muted);font-size:0.82rem;">Sin alertas activas.</p>'
              }
            </div>
          </div>

          <!-- Acciones rápidas -->
          <div class="card" style="padding:24px;">
            <h2 class="section-title">Acciones Rápidas</h2>
            <div class="quick-actions">
              <a href="#/productos" class="quick-action-btn">
                <span>📦</span> Ver Productos
              </a>
              <a href="#/movimientos" class="quick-action-btn">
                <span>📥</span> Entrada Bodega
              </a>
              <a href="#/movimientos" class="quick-action-btn">
                <span>📤</span> Salida Bodega
              </a>
              <a href="#/reportes" class="quick-action-btn">
                <span>📊</span> Reportes
              </a>
            </div>
          </div>

        </div>
      </div>

    </div>
  </main>
</div>
`;

// ── Controlador de la vista ─────────────────────────────────────────────────

/**
 * Inicializa la vista del dashboard.
 * Renderiza un shell inmediato con loader y luego carga los datos del backend en paralelo.
 * @returns {Promise<void>}
 */
export const initDashboard = async () => {
  // Render rápido con estado de carga
  renderView(`
    <div class="app-shell">
      ${buildSidebar('dashboard')}
      <main class="main-content">
        <div class="page-wrapper">
          <div class="loader-container">
            <div class="spinner"></div> Cargando dashboard…
          </div>
        </div>
      </main>
    </div>
  `);

  try {
    // Peticiones paralelas al backend
    const [metrics, movimientos, productos] = await Promise.allSettled([
      getDashboardMetrics(),
      getMovimientos(),
      getProductos(),
    ]);

    const metricsData    = metrics.status    === 'fulfilled' ? metrics.value    : {};
    const movimientosData = movimientos.status === 'fulfilled' ? movimientos.value : [];
    const productosData  = productos.status  === 'fulfilled' ? productos.value  : [];

    // Filtra productos con bajo stock (threshold: stock <= 5)
    const bajosStock = productosData.filter(p => (p.stock ?? 0) <= 5);

    renderView(buildDashboardHTML(metricsData, movimientosData, bajosStock));

  } catch (err) {
    showToast('Error al cargar el dashboard.', 'error');
    renderView(buildDashboardHTML({}, [], []));
  }

  // Conectar botón de logout después de renderizar
  attachSidebarLogout();
};
