# Guía de Deployment - Barba Negra App

## 📋 Resumen
La aplicación Barba Negra ha sido completamente migrada de SQLite a PostgreSQL y está lista para deploy en Render.

## 🔧 Configuración Local
1. Asegúrate de tener PostgreSQL instalado localmente
2. Crea una base de datos llamada `barbanegralocal`
3. Ejecuta: `npm install`
4. Ejecuta: `npm run seed` (para datos de prueba)
5. Ejecuta: `npm start`

**Credenciales de prueba:**
- Usuario: `admin`
- Contraseña: `admin123`

## 🚀 Deployment en Render

### Opción 1: Usando el Dashboard de Render

1. **Crear cuenta en Render**
   - Ve a [render.com](https://render.com)
   - Crea una cuenta nueva o inicia sesión

2. **Conectar repositorio**
   - Sube tu código a GitHub/GitLab
   - En Render, clic en "New +" → "Web Service"
   - Conecta tu repositorio

3. **Configuración del Web Service**
   ```
   Name: barba-negra-app
   Environment: Node
   Branch: main (o tu rama principal)
   Build Command: npm install
   Start Command: npm start
   ```

4. **Variables de entorno**
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://barba:iuEQQkgQHOjbZOw28vN9wFxa0OwntCUG@dpg-d2kt4mbuibrs73ekfh00-a/barbanegra_0nil
   SESSION_SECRET=barba_negra_secret_key_2024_super_secure_random_string
   JWT_SECRET=barba_negra_jwt_secret_2024
   ```

### Opción 2: Usando render.yaml (Recomendada)

1. El archivo `render.yaml` ya está configurado
2. Sube tu código a GitHub/GitLab  
3. En Render Dashboard:
   - Clic en "New +" → "Blueprint"
   - Conecta tu repositorio
   - Render detectará automáticamente el archivo `render.yaml`

## 🎯 Base de Datos en Producción

La aplicación ya está configurada para usar la base de datos PostgreSQL existente en Render:
- **Host:** dpg-d2kt4mbuibrs73ekfh00-a
- **Database:** barbanegra_0nil
- **User:** barba

## 🔐 Seguridad

✅ **Implementado:**
- Passwords hasheados con bcrypt
- Sessions seguras con express-session
- Variables de entorno para secrets
- Configuración SSL para PostgreSQL en producción
- Validación de entrada en todas las rutas
- Conexiones de base de datos con pooling

## 📊 Funcionalidades Migradas

✅ **Completamente funcional:**
- Sistema de login con autenticación segura
- Gestión de clientes con búsqueda avanzada
- Gestión de empleados
- Inventario y productos
- Sistema de gastos e inventarios
- Facturación completa
- Reportes básicos
- Todas las rutas API

## 🛠 Comandos NPM

```bash
npm start      # Iniciar en producción
npm run dev    # Iniciar en desarrollo
npm run seed   # Crear datos de prueba
```

## 🔍 Verificación Post-Deployment

1. La aplicación debe estar accesible en la URL de Render
2. Login debe funcionar: admin/admin123
3. Todas las secciones deben cargar correctamente
4. Base de datos debe responder sin errores

## 📞 Soporte

Si encuentras algún problema durante el deployment, verifica:
1. Logs de la aplicación en Render Dashboard
2. Variables de entorno correctamente configuradas
3. Base de datos PostgreSQL accesible

**¡La migración está completa y la aplicación está lista para producción!** 🎉