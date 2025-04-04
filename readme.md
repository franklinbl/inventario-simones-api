# Inventario Backend (Node.js + TypeScript)

Backend para gestionar el inventario de una agencia de festejos.

## Características
- Registro e inicio de sesión de usuarios.
- Gestión de inventario.
- Alquiler de productos con fechas de salida y entrada.
- Generación de notas de entrega/facturas.

## Requisitos
- Node.js
- PostgreSQL

## Configuración
1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/inventario-backend-ts.git
```

## Configuración Inicial

### Configurar Variables de Entorno

1. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

2. Edita el archivo `.env` y configura:
   - Las credenciales de la base de datos
   - El secreto JWT
   - Las credenciales del administrador:
     - `ADMIN_USERNAME`: Nombre de usuario del administrador
     - `ADMIN_PASSWORD`: Contraseña del administrador
     - `ADMIN_NAME`: Nombre completo del administrador

3. El script de inicialización usará estas variables para crear el usuario administrador.

**Nota:** El archivo `.env` está en `.gitignore` por seguridad. No lo subas al repositorio.