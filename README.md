# EmpleoFacil
Plataforma de empleo para conectar talento y empresas en Ecuador.

## Tecnologias principales
- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Base de datos:** MySQL
- **Orquestacion:** Docker y Docker Compose
- **Administracion BD:** phpMyAdmin (profile `tools`)

## Estructura del proyecto
```text
empleofacil/
  backend/                 # API Node.js (Express)
  frontend/                # App React (Vite)
  docs/                    # Documentacion
  docker-compose.yml       # Orquestador de servicios
  .env.example             # Variables de entorno de ejemplo
```

## Requisitos previos
- Docker Desktop
- Git
- Editor de codigo (recomendado: VS Code)
- Node.js LTS (solo si trabajas fuera de Docker)

## Configuracion rapida
1. Crear el archivo `.env` desde el ejemplo:
```bash
cp .env.example .env
```
2. Levantar el entorno:
```bash
docker compose up -d --build
```

## Accesos por defecto
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- MySQL: localhost:3306
- phpMyAdmin: http://localhost:8080

## Documentacion
- Arquitectura: `docs/05_arquitectura.md`
- Frontend: `docs/01_frontend.md`

## Notas
- No commitear `.env`.
- Para levantar con phpMyAdmin: `docker compose --profile tools up -d --build`.
