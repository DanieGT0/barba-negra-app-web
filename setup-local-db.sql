-- setup-local-db.sql
-- Ejecutar esto en PostgreSQL local como usuario postgres

-- Crear la base de datos local
CREATE DATABASE barbanegralocal;

-- Conectar a la base de datos
\c barbanegralocal;

-- Crear usuario específico si lo deseas (opcional)
-- CREATE USER barba_user WITH PASSWORD '123321';
-- GRANT ALL PRIVILEGES ON DATABASE barbanegralocal TO barba_user;