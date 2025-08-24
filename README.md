# Barba Negra - Sistema de Gestión de Barbería

Sistema completo de gestión para barbería con funcionalidades de:
- Gestión de clientes, empleados y productos
- Sistema de citas
- Control de gastos e inventarios 
- Facturación
- Sistema de tarjetas de fidelidad
- Reportes y análisis

## 🚀 Deployment en Render

### Pasos para subir la aplicación:

#### 1. **Preparar repositorio Git**
```bash
# Inicializar repositorio (si no existe)
git init

# Agregar todos los archivos
git add .

# Crear commit inicial
git commit -m "Initial commit: Barba Negra app migrada a PostgreSQL"

# Conectar con repositorio remoto (GitHub/GitLab)
git remote add origin <tu-repositorio-url>
git push -u origin main
```

#### 2. **Crear base de datos en Render**
1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Clic en "New" → "PostgreSQL"
3. Configura:
   - **Name**: `barbanegra-db`
   - **Database Name**: `barbanegra_prod`
   - **User**: `barba`
   - **Region**: Ohio (US East)
   - **Plan**: Free

#### 3. **Crear Web Service**
1. En Render Dashboard: "New" → "Web Service"
2. Conectar tu repositorio Git
3. Configurar:
   - **Name**: `barbanegra-app`
   - **Environment**: Node
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

#### 4. **Configurar variables de entorno**
En la configuración del Web Service, agregar:

| Variable | Valor |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (Se auto-configura al conectar la DB) |
| `SESSION_SECRET` | (Generar valor aleatorio seguro) |

#### 5. **Migrar datos**
Una vez desplegada la app:

1. En terminal de Render (o local con DB_URL de producción):
```bash
npm run migrate
```

#### 6. **Usuario inicial**
Se creará automáticamente:
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Rol**: Admin

**¡IMPORTANTE!** Cambiar esta contraseña inmediatamente después del primer login.

## 🗄️ Base de datos

### Estructura:
- **usuarios**: Sistema de autenticación
- **clientes**: Base de datos de clientes
- **empleados**: Información de empleados
- **productos**: Catálogo de productos/servicios
- **ventas** + **detalle_ventas**: Sistema de facturación
- **citas**: Agenda de citas
- **gastos**: Control de gastos
- **tarjetas_fidelidad** + **historial_sellos**: Sistema de fidelización

### Datos migrados:
- ✅ 6 usuarios
- ✅ 305 clientes
- ✅ 10 empleados  
- ✅ 72 productos
- ✅ 5 citas
- ✅ 6 gastos

## 🔒 Seguridad

### Implementado:
- ✅ Autenticación con bcrypt
- ✅ Sesiones seguras
- ✅ Variables de entorno para credenciales
- ✅ Conexión SSL a base de datos
- ✅ Sanitización de entradas

### Para producción:
- [ ] Rate limiting
- [ ] HTTPS enforcement  
- [ ] Backup automático de BD
- [ ] Monitoreo de logs

## 📱 Acceso

### URLs:
- **Desarrollo**: http://localhost:3002
- **Producción**: https://tu-app.onrender.com

### Roles:
- **Admin**: Acceso completo al sistema
- **Usuario**: Acceso limitado (configurar según necesidades)

## 🛠️ Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (.env)
cp .env.example .env

# Migrar datos localmente
npm run migrate

# Iniciar servidor
npm run dev
```

## 📞 Soporte

Para soporte o modificaciones contactar al desarrollador.