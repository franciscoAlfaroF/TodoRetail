# TodoRetail - Comparador de Precios Inteligente

## 1. Problema Abordado
Las personas gastan tiempo y dinero intentando encontrar los mejores precios para sus compras de supermercado. TodoRetail automatiza esta búsqueda comparando precios en tiempo real entre múltiples supermercados (inicialmente Jumbo y Lider).

## 2. Usuarios Objetivo
Familias, estudiantes y cualquier persona interesada en optimizar su presupuesto de compras mensuales.

## 3. Arquitectura General
* **Frontend**: Angular + Ionic + Capacitor (PWA y Android)
* **Backend**: NestJS + PostgreSQL
* **Servicio de Extracción**: Python + FastAPI
* **Infraestructura**: AWS (Terraform) + Docker

## 4. Integrantes y Responsabilidades
* **[Tu Nombre]**: DevOps, Backend y Arquitectura

## 5. Instrucciones de Ejecución (Docker)
1. Copiar `.env.example` a `.env` y configurar variables.
2. Ejecutar `docker compose up --build -d`.
3. Frontend: `http://localhost:8100` | Backend: `http://localhost:3000` | Python: `http://localhost:8000`
