# TodoRetail - Comparador de Precios Inteligente

## 1. Nombre del Proyecto
**TodoRetail**: Plataforma inteligente de comparación de precios de supermercados.

## 2. Descripción Breve
TodoRetail automatiza la búsqueda y comparación de precios en tiempo real entre múltiples supermercados (Jumbo, Santa Isabel y Unimarc, se busca ampliar el scraping), intentando agrupar productos equivalentes para permitirle a los usuarios tomar decisiones de compra informadas y optimizar su presupuesto.

## 3. Identificación de los Integrantes
* Francisco Alfaro Flores

## 4. Distribución de Responsabilidades
* Francisco Alfaro Flores: DevOps, Infraestructura (Terraform, Docker), Arquitectura Backend (NestJS, FastAPI) y algoritmos de agrupación por similitud de texto. Desarrollo Frontend (Angular, Ionic) y UI/UX. Integración de Datos (Web Scraping en Python), testing y QA.

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
* **Incluye**: Búsqueda en tiempo real en Jumbo, Santa Isabel y Unimarc. Agrupación aproximada por similitud de nombres y variantes detectadas. Identificación de ofertas.
* **Excluye**: Compra directa desde la plataforma (carrito de compras nativo), integración con pasarelas de pago, cálculo de costos de envío.

## 9. Principales Funcionalidades
* Barra de búsqueda unificada.
* Despliegue de resultados agrupados mediante interfaz de acordeón.
* Visualización del menor precio encontrado entre los resultados recibidos de los supermercados consultados.
* Redirección directa al supermercado para concretar la compra.
* Pantalla de inicio con productos de las secciones oficiales de más vendidos de Jumbo, Santa Isabel y Unimarc. Un worker los consulta en segundo plano y los mantiene en una caché PostgreSQL compartida, refrescada cada 12 horas; la página inicial lee esa caché y no ejecuta scraping al abrirse. Si una tienda falla, se conservan sus últimos productos válidos.

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
El agrupamiento se ejecuta en el frontend Angular, en `HomePage.groupProducts`, sobre los nombres y precios recuperados desde los supermercados. Normaliza texto y unidades (cc/ml, gr/g, l/lt), elimina palabras vacías y compara tokens con similitud de Jaccard: agrupa cuando la similitud es mayor a 0,45 y las variantes detectadas (por ejemplo, entera/descremada, light/zero o frutilla/vainilla) coinciden. El grupo muestra los precios por tienda y destaca el menor; no utiliza el perfil ni datos personales del usuario.

### Evaluación reproducible del agrupamiento
La prueba `measures grouping precision and recall on labeled product cases` en `frontend/src/app/home/home.page.spec.ts` compara los grupos producidos con etiquetas de equivalencia definidas para 12 nombres de productos de prueba (casos correctos y variantes/productos no equivalentes). Se ejecuta junto con las pruebas frontend:
```powershell
cd frontend
npm test -- --watch=false
```
Resultado del conjunto de prueba: **4 verdaderos positivos, 2 falsos positivos y 0 falsos negativos**; precisión por pares = **4/6 = 66,7 %**, exhaustividad (recall) = **4/4 = 100 %** y F1 = **80 %**. Los 12 resultados sin agrupamiento se muestran individualmente; el agrupamiento los reduce a 7 tarjetas (41,7 % menos) y permite comparar cuatro pares equivalentes etiquetados. El caso incorrecto observado es que `Leche Entera Colun 1 L` y `Leche Entera Soprole 1 L` terminan en el mismo grupo por compartir tokens. El test también cubre que `125 g` y `125gr` se normalicen igual; la conversión de `gr` junto a la cantidad se corrigió a partir de esa evaluación.

Estos números son una evaluación controlada sobre un conjunto pequeño y construido manualmente; no estiman la precisión sobre todo el catálogo real. Actualmente no se explica al usuario por qué se creó cada grupo ni se ofrece aceptar, modificar o rechazar agrupaciones. Mejorar la detección de marca, ampliar y validar el conjunto con resultados reales y añadir control del usuario son pendientes; la similitud puede producir agrupaciones incorrectas entre marcas o productos con nombres parecidos.

## 14. Instrucciones de Instalación
1. Clonar el repositorio.
2. Crear el `.env` de Compose y generar un `JWT_SECRET` aleatorio:
   ```powershell
   Copy-Item .env.example .env
   $jwt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   $db = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   Set-Content .env -Value @("JWT_SECRET=$jwt", "POSTGRES_PASSWORD=$db", "COOKIE_SECURE=false")
   ```
3. Para el Compose de desarrollo no copies archivos `.env` de `backend/` o `frontend/`: Compose sólo lee el `.env` de la raíz y el frontend no tiene un `.env.example`. La configuración para ejecutar el backend fuera de Docker está descrita en `backend/README.md`.
4. Asegurarse de tener Docker Desktop con Docker Compose instalado.

## 15. Configuración de Variables de Entorno
Para Docker Compose, revisar el archivo `.env.example` de la raíz. Principales variables:
* `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres; la API no inicia si falta o es demasiado corto. No reutilizar el valor de CI ni subir secretos al repositorio.
* `POSTGRES_PASSWORD`: contraseña aleatoria exclusiva para PostgreSQL local; Compose no tiene una contraseña predeterminada y los puertos de desarrollo sólo se publican en `127.0.0.1`.
* `COOKIE_SECURE`: debe ser `true` cuando el sitio se publica con HTTPS. En staging local HTTP se deja en `false`; la cookie de autenticación sigue siendo `HttpOnly` y `SameSite=Lax`.

Compose construye `DATABASE_URL`, `PYTHON_SERVICE_URL` y `CORS_ORIGIN` para los contenedores; no es necesario agregarlos al `.env` de la raíz. En un despliegue público se debe configurar el origen frontend con el dominio HTTPS real.

## 16. Instrucciones de Ejecución
Ejecutar el siguiente comando en la raíz del proyecto para construir y levantar todos los servicios en contenedores separados:
```powershell
docker compose up --build -d
```

## 17. Instrucciones de Uso
* **Frontend**: Navegar a `http://localhost:8100`. Ingresar un término de búsqueda (ej. "leche") y explorar los resultados agrupados.
* **Backend API**: Disponible en `http://localhost:3000`.
* **Python API**: Disponible en `http://localhost:8000`.

## 18. Ejecución de Pruebas
Para reproducir localmente las versiones usadas por CI, se requiere Node.js 22 y Python 3.11. Ejecuta los comandos desde la raíz en PowerShell:

```powershell
Push-Location frontend
npm ci
npm test -- --watch=false
Pop-Location

Push-Location backend
npm ci
npx prisma generate
npm run test
Pop-Location

Push-Location python-service
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt pytest
.\.venv\Scripts\python.exe -m pytest tests
Pop-Location
```

GitHub Actions corre las validaciones al hacer push a `main`, al abrir o actualizar un pull request hacia `main`, o manualmente desde Actions. El job de backend también ejecuta pruebas E2E con PostgreSQL.

## 18.1 Autenticación y administración de roles
* El registro público siempre crea cuentas `USER`; enviar `role: "ADMIN"` en el registro no otorga privilegios.
* El inicio de sesión usa una cookie `HttpOnly`, `SameSite=Lax`; el JWT no se guarda en `localStorage` ni se devuelve al JavaScript del navegador. Las operaciones que cambian estado con cookie validan el encabezado `Origin`; la API sólo acepta los orígenes frontend explícitamente configurados.
* Un administrador autenticado puede asignar o quitar el rol de otra cuenta mediante `PATCH /api/auth/users/{userId}/role` con el cuerpo `{"role":"ADMIN"}` o `{"role":"USER"}`. La ruta requiere JWT y rol `ADMIN`.
* No se permite cambiar el propio rol ni quitar el rol al último administrador. El backend consulta el rol vigente en PostgreSQL en cada petición.
* Para crear el primer administrador, registra primero la cuenta y ejecuta el comando sólo cuando aún no exista ningún administrador. En el Compose de desarrollo: `docker compose exec backend node scripts/promote-admin.mjs usuario@ejemplo.com`. En el staging local: `docker compose --env-file .env.staging -f docker-compose.staging.yml exec backend node scripts/promote-admin.mjs usuario@ejemplo.com`. El bootstrap requiere acceso autorizado al entorno y a su base de datos; una vez creado el primer admin, la promoción se hace únicamente por la ruta protegida.
* En la sección **Privacidad de la cuenta** se puede descargar una exportación JSON del perfil y de los productos guardados (sin hash de contraseña) o eliminar la cuenta. La eliminación borra inmediatamente el perfil y su lista personal; no se permite borrar al último administrador. Los resultados extraídos son datos públicos compartidos, mientras que la lista guardada sí está asociada a la cuenta. No hay respaldos automáticos configurados; si un operador crea respaldos, debe aplicarles su propia retención y eliminación.
* Los usuarios autenticados pueden guardar grupos de productos desde los resultados y volver a consultarlos en **Mis productos guardados**. La lista se almacena por cuenta, se incluye en la exportación de datos y se elimina junto con la cuenta. Al reabrir un guardado se ejecuta una búsqueda nueva; esta función no conserva historial de precios ni envía alertas automáticas. Los visitantes pueden buscar y comparar sin iniciar sesión, pero no guardar productos.
* API de productos guardados: `GET /api/saved-products`, `POST /api/saved-products` con `{"name":"..."}` y `DELETE /api/saved-products/{id}`. Todas las rutas requieren la cookie de sesión autenticada y cada usuario sólo puede consultar o eliminar sus propios registros.

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
* **Cabeceras web**: Nginx aplica una CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy`. HSTS se debe habilitar en el proxy que termine TLS al preparar un despliegue HTTPS público; el staging local opera por HTTP.

## 20. Enlaces y Documentación Adicional
* **Staging local**: `http://localhost:8180` (disponible sólo mientras Docker Desktop lo ejecuta en el equipo local).
* **Staging público**: pendiente de seleccionar/provisionar un proveedor cloud y configurar credenciales fuera del repositorio.
* **PWA**: en staging se puede instalar TodoRetail desde la opción de instalación del navegador. Una vez instalado el Service Worker y completada la primera carga, la app shell y los recursos estáticos se guardan para abrir la aplicación sin conexión; búsqueda, autenticación y datos requieren conexión con las APIs.
* **Android/Capacitor (prueba local)**: la plataforma Android real se encuentra en `frontend/android/`, con identificador `cl.todoretail.app` y nombre `TodoRetail`. Se requiere Android Studio con SDK y Platform-Tools (`adb` disponible en `PATH`), un emulador o dispositivo conectado y JDK 21. El proyecto fija Java 21; un build con JDK 17 falla con `invalid source release: 21`. El APK local usa el esquema HTTP para coincidir con el backend local. Desde la raíz, inicia `docker compose up -d`, abre un emulador y ejecuta:
  ```powershell
  Push-Location frontend
  npm run android:sync
  Push-Location android
  .\gradlew.bat assembleDebug
  Pop-Location
  adb devices
  adb reverse tcp:3000 tcp:3000
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  Pop-Location
  ```
  El reverse conecta el `localhost:3000` del emulador con NestJS, manteniendo el origen local requerido por CORS y las cookies. Para una versión distribuible, se debe usar un backend HTTPS y configurar CORS/cookies seguros; este esquema HTTP es sólo para desarrollo local.
* **Limitaciones**: La búsqueda por término depende de la latencia y disponibilidad de los sitios web externos, ya que opera en tiempo real. La selección de inicio proviene de secciones públicas que pueden cambiar o quedar temporalmente indisponibles; cuando eso ocurre, se muestran los últimos datos válidos disponibles.
* **Trabajo Futuro**: Agregar más supermercados, mejorar filtros específicos por producto, continuar mejoras de UI/UX, desarrollar recomendaciones y evaluar caché para las búsquedas en tiempo real.
