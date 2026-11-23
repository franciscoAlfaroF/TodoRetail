# Backend de TodoRetail

API de NestJS que autentica usuarios, consulta PostgreSQL mediante Prisma y coordina las búsquedas con el servicio FastAPI de scraping.

## Ejecución con Docker Compose

La forma recomendada de ejecutar el sistema completo, incluida la base de datos y el servicio Python, está documentada en el [README principal](../README.md). Desde la raíz:

```powershell
docker compose up --build -d
```

La API queda disponible en `http://localhost:3000`; el endpoint de salud es `http://localhost:3000/api/health`.

## Configuración

En Compose, las variables se inyectan desde el `.env` de la raíz y la configuración de `docker-compose.yml`. Para ejecutar NestJS directamente fuera de Docker, configura en `backend/.env`:

- `DATABASE_URL`: conexión a PostgreSQL accesible desde el host; si usas la base de datos de Compose, el host es `localhost` y el puerto `5432`.
- `JWT_SECRET`: secreto de al menos 32 caracteres.
- `PYTHON_SERVICE_URL`: URL del servicio FastAPI accesible desde el host (por ejemplo, `http://localhost:8000`).
- `CORS_ORIGIN` y `COOKIE_SECURE`: origen permitido del frontend y uso de cookies seguras según el entorno.

No uses en una ejecución local la URL interna `db` o `python-service`; esos nombres sólo resuelven dentro de la red de Compose. No publiques secretos.

## Desarrollo y pruebas

Requiere Node.js 22. Desde esta carpeta, instala dependencias, genera el cliente Prisma y ejecuta las pruebas unitarias:

```powershell
npm ci
npx prisma generate
npm run test
```

`npm run test:e2e` ejecuta las pruebas E2E y requiere una base PostgreSQL disponible, las variables `DATABASE_URL` y `JWT_SECRET`, y el esquema aplicado con `npx prisma db push`. `npm run lint` ejecuta el linter del backend y `npm run build` compila la aplicación.
