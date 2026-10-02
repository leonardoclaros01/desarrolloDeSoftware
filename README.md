# Bodega & Administración 📦

Sistema integral de control de inventario, stock y movimientos de bodega.

## Estructura del proyecto

```
proyecto/
├── frontend/   # SPA con Vite + Vanilla JS
└── backend/    # API REST con Express + JWT
```

## Tecnologías

- **Frontend:** HTML, CSS, JavaScript (Vite, Navigo router)
- **Backend:** Node.js, Express, JWT

## Instalación y uso

### Backend (puerto 8080)
```bash
cd backend
npm install
node server.js
```

### Frontend (puerto 5173)
```bash
cd frontend
npm install
npm run dev
```

## Credenciales de acceso

| Usuario  | Contraseña  | Rol          |
|----------|-------------|--------------|
| admin    | admin123    | Administrador|
| bodega   | bodega123   | Operador     |

## Endpoints API

| Método | Ruta                     | Descripción                   |
|--------|--------------------------|-------------------------------|
| POST   | /api/auth/login          | Autenticación con JWT         |
| GET    | /api/productos           | Listar productos              |
| POST   | /api/productos           | Crear producto                |
| PUT    | /api/productos/:id       | Actualizar producto           |
| DELETE | /api/productos/:id       | Eliminar producto             |
| GET    | /api/movimientos         | Historial de movimientos      |
| POST   | /api/movimientos         | Registrar movimiento          |
| GET    | /api/dashboard/metrics   | Métricas del dashboard        |
