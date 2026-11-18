# TodoRetail - Comparador de Precios Inteligente

## 1. Nombre del Proyecto
**TodoRetail**: Plataforma inteligente de comparación de precios de supermercados.

## 2. Descripción Breve
TodoRetail automatiza la búsqueda y comparación de precios en tiempo real entre múltiples supermercados (Jumbo, Santa Isabel y Unimarc, se busca ampliar el scraping), agrupando productos idénticos para permitirle a los usuarios tomar decisiones de compra informadas y optimizar su presupuesto.

## 3. Identificación de los Integrantes
* Francisco Alfaro Flores

## 4. Distribución de Responsabilidades
* Francisco Alfaro Flores: DevOps, Infraestructura (Terraform, Docker), Arquitectura Backend (NestJS, FastAPI) y algoritmos de agrupación NLP. Desarrollo Frontend (Angular, Ionic) y UI/UX. Integración de Datos (Web Scraping en Python), testing y QA.

## 5. Problema o Necesidad Abordada
Las personas gastan tiempo y dinero intentando encontrar los mejores precios para sus compras de supermercado, visitando múltiples sitios web o locales físicos. La inflación y la variación diaria de precios dificultan saber dónde conviene comprar.

## 6. Usuarios Objetivo
Familias, estudiantes, dueños de casa y cualquier persona interesada en optimizar su presupuesto de compras mensuales y ahorrar dinero.

## 7. Objetivos del Proyecto
* Construir una plataforma centralizada para buscar productos de supermercado.
* Extraer y procesar información en tiempo real desde sitios externos.
* Agrupar productos idénticos de manera inteligente mediante análisis de lenguaje natural.
* Proveer una experiencia móvil y web de alta calidad.

## 8. Alcance y Exclusiones
* **Incluye**: Búsqueda en tiempo real en Jumbo, Santa Isabel y Unimarc. Agrupación por nombre, marca, volumen y sabor. Identificación de ofertas.
* **Excluye**: Compra directa desde la plataforma (carrito de compras nativo), integración con pasarelas de pago, cálculo de costos de envío.

## 9. Principales Funcionalidades
* Barra de búsqueda unificada.
* Despliegue de resultados agrupados mediante interfaz de acordeón.
* Visualización del precio más bajo garantizado.
* Redirección directa al supermercado para concretar la compra.

## 10. Arquitectura General
El sistema utiliza una arquitectura orientada a microservicios:
* **Frontend**: Angular + Ionic Framework + Capacitor.
* **Backend API**: NestJS (TypeScript).
* **Persistencia**: PostgreSQL.
* **Procesamiento y Extracción**: FastAPI (Python) + Playwright.

## 11. Tecnologías y Herramientas Utilizadas
* **Lenguajes**: TypeScript, Python, HTML/SCSS.
* **Frameworks**: Angular, Ionic, NestJS, FastAPI.
* **DevOps**: Docker, Docker Compose, GitHub Actions, Terraform.
* **Base de Datos**: PostgreSQL, Prisma ORM.

## 12. Fuente o Fuentes de Información Web
Los datos se obtienen mediante *Web Scraping* en tiempo real desde las plataformas públicas de comercio electrónico de:
* **Jumbo** (Cencosud)
* **Santa Isabel** (Cencosud)
* **Unimarc** (SMU)

## 13. Descripción de la Capacidad Adaptativa o Inteligente
El módulo Python incluye un algoritmo NLP (Natural Language Processing) basado en reglas estrictas y similitud de Jaccard que "entiende" los nombres de los productos. Estandariza volúmenes (cc, ml, l), elimina palabras vacías ("desechable", "retornable") y previene la mezcla de variantes incompatibles (ej. "Light" vs "Normal", "Vainilla" vs "Chocolate"), logrando agrupar ofertas dispares en un solo ítem conceptual para el usuario.

## 14. Instrucciones de Instalación
1. Clonar el repositorio.
2. Crear el `.env` de Compose y generar un `JWT_SECRET` aleatorio:
   ```powershell
   Copy-Item .env.example .env
   $jwt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   Set-Content .env -Value "JWT_SECRET=$jwt" -NoNewline
   ```
3. Copiar los `.env.example` de backend y frontend a sus respectivos `.env` si se ejecutan fuera de Docker, y completar sus variables.
4. Asegurarse de tener Docker y Docker Compose instalados.

## 15. Configuración de Variables de Entorno
Revisar el archivo `.env.example` en el backend. Principales variables:
* `DATABASE_URL`: URI de conexión a PostgreSQL.
* `PYTHON_SERVICE_URL`: URL interna del servicio de scraping (`http://python-service:8000`).
* `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres; la API no inicia si falta o es demasiado corto. No reutilizar el valor de CI ni subir secretos al repositorio.

## 16. Instrucciones de Ejecución
Ejecutar el siguiente comando en la raíz del proyecto para construir y levantar todos los servicios en contenedores separados:
```bash
docker compose up --build -d
```

## 17. Instrucciones de Uso
* **Frontend**: Navegar a `http://localhost:8100`. Ingresar un término de búsqueda (ej. "leche") y explorar los resultados agrupados.
* **Backend API**: Disponible en `http://localhost:3000`.
* **Python API**: Disponible en `http://localhost:8000`.

## 18. Ejecución de Pruebas
* **Backend**: `cd backend && npm run test`
* **Python**: `cd python-service && pytest`
* El CI/CD en GitHub Actions ejecuta estas pruebas automáticamente.

## 18.1 Autenticación y administración de roles
* El registro público siempre crea cuentas `USER`; enviar `role: "ADMIN"` en el registro no otorga privilegios.
* Un administrador autenticado puede asignar o quitar el rol de otra cuenta mediante `PATCH /api/auth/users/{userId}/role` con el cuerpo `{"role":"ADMIN"}` o `{"role":"USER"}`. La ruta requiere JWT y rol `ADMIN`.
* No se permite cambiar el propio rol ni quitar el rol al último administrador. El backend consulta el rol vigente en PostgreSQL en cada petición.
* Para crear el primer administrador, registra primero la cuenta y ejecuta el comando sólo cuando aún no exista ningún administrador. En el Compose de desarrollo: `docker compose exec backend npm run admin:promote -- usuario@ejemplo.com`. En el staging local: `docker compose --env-file .env.staging -f docker-compose.staging.yml exec backend npm run admin:promote -- usuario@ejemplo.com`. El bootstrap requiere acceso autorizado al entorno y a su base de datos; una vez creado el primer admin, la promoción se hace únicamente por la ruta protegida.

## 19. Proceso de Construcción con Docker y Despliegue
* Cada componente posee su propio `Dockerfile` (el frontend y backend utilizan construcciones *multi-stage* para optimizar el peso).
* GitHub Actions valida linting, pruebas unitarias y E2E, builds de producción, auditoría de dependencias, detección de secretos, configuración de Docker Compose y formato/validación de Terraform. También construye las imágenes y bloquea esa etapa si Trivy detecta vulnerabilidades críticas o altas.
* El workflow de CI no despliega a un proveedor público: no hay cuenta cloud ni credenciales configuradas. No se considera exitoso un despliegue simulado.
* Para preparar un staging local aislado en Docker Desktop, genera un `.env.staging` local con secretos aleatorios y ejecuta:
  ```powershell
  Copy-Item .env.staging.example .env.staging
  $db = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $jwt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $envFile = (Get-Content .env.staging -Raw).Replace('replace-with-a-random-hex-secret', $db).Replace('replace-with-a-different-random-hex-secret', $jwt)
  Set-Content .env.staging -Value $envFile -NoNewline
  docker compose --env-file .env.staging -f docker-compose.staging.yml up --build -d
  ```
* La interfaz estará en `http://localhost:8180` y la comprobación de API en `http://localhost:8180/api/health`. PostgreSQL, NestJS y FastAPI no publican puertos al host; el frontend proxifica `/api` al backend.
* Este staging es local y no es accesible desde Internet. Los contenedores y el volumen de base de datos están separados del Compose de desarrollo. Para detenerlo sin borrar los datos: `docker compose --env-file .env.staging -f docker-compose.staging.yml down`.
* **Observabilidad local**: NestJS y FastAPI escriben logs JSON a stdout con identificador de solicitud, ruta, código HTTP y duración. NestJS propaga `x-request-id` a FastAPI; `/api/health` comprueba PostgreSQL y FastAPI y responde `503` si alguna dependencia falla. Docker limita cada log a tres archivos de 10 MB.
  ```powershell
  docker compose --env-file .env.staging -f docker-compose.staging.yml logs -f backend python-service
  ```
  Busca el mismo `requestId` en ambos servicios para seguir una búsqueda. Los logs omiten el término consultado, tokens y contraseñas.

## 20. Enlaces y Documentación Adicional
* **Staging local**: `http://localhost:8180` (disponible sólo mientras Docker Desktop lo ejecuta en el equipo local).
* **Staging público**: pendiente de seleccionar/provisionar un proveedor cloud y configurar credenciales fuera del repositorio.
* **PWA**: en staging se puede instalar TodoRetail desde la opción de instalación del navegador. La app shell y recursos estáticos se guardan para abrir la aplicación sin conexión después de la primera carga; búsqueda, autenticación y datos requieren conexión con las APIs.
* **Enlace al prototipo Figma**: [EN CONSTRUCCIÓN]
* **Documentación de la API**: [EN CONSTRUCCIÓN]
* **Limitaciones**: La búsqueda depende de la latencia y disponibilidad de los sitios web externos, ya que opera en tiempo real.
* **Trabajo Futuro**: Agregar más supermercados, mejorar filtros especificos por prodcuto, mejoras UI y UX, capacidad de crear cuentas para guardas productos y generar recomendaciones, implementar almacenamiento en caché (Redis) e indexación periódica para respuestas instantáneas.
