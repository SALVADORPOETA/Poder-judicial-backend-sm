# Poder Judicial - Backend

**Poder Judicial - Backend** es el núcleo de procesamiento y automatización que alimenta la suite de herramientas para el **Poder Judicial de la Federación**. Construido con **Node.js** y **Express**, este motor se encarga de las tareas más críticas: desde la navegación automatizada en portales judiciales hasta la generación de reportes inteligentes y el procesamiento de lenguaje natural para la detección de género.

Este servidor está diseñado para manejar flujos de trabajo asíncronos complejos, garantizando que la extracción de datos sea precisa, estructurada y lista para su consumo inmediato en el frontend.

---

## ✨ Overview

El backend no es solo un puente de datos; es un **orquestador de automatización** que implementa:

* **Scraping Multi-nivel:** Navegación programática mediante **Puppeteer** para extraer información de directorios judiciales complejos.
* **Procesamiento de Archivos:** Generación dinámica de archivos Excel (.xlsx) y manipulación de streams JSON.
* **Motor de Normalización:** Limpieza de nombres y estandarización de datos judiciales crudos.
* **Arquitectura Escalable:** Endpoints optimizados para manejar peticiones de larga duración (scraping detallado).
* **Seguridad de Datos:** Validación de esquemas y manejo de errores robusto para evitar fallos en procesos masivos.

---

## 🚀 Features

* ⚙️ **API RESTful:** Estructura de endpoints clara y documentada para cada fase del proceso.
* 🕷️ **Headless Browser Integration:** Automatización de Chrome para acceder a datos que no están disponibles vía API pública.
* 📊 **Excel Engine:** Creación de reportes profesionales con formato unificado.
* 🧠 **Detección de Género:** Lógica integrada para clasificar perfiles basándose en diccionarios de nombres normalizados.
* 📂 **File Handling:** Gestión de subida y lectura de archivos JSON para procesamiento por lotes (batching).
* 🛡️ **CORS & Security:** Configuración lista para entornos de producción y consumo desde dominios específicos.
* ⚡ **Async Processing:** Manejo eficiente de promesas para no bloquear el hilo principal durante el scraping.

---

## 🛠️ Tech Stack

| Categoría | Tecnología |
| :--- | :--- |
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js |
| **Automation** | Puppeteer |
| **Excel Library** | ExcelJS / XLSX |
| **Parsing** | Body-parser / Multer |
| **Environment** | Dotenv |
| **Deployment** | Vercel |

---

## 💻 Getting Started

### Prerequisites

* Node.js 18+
* Google Chrome (para Puppeteer en entorno local)
* npm o yarn

### Installation

```bash
# Clonar el repositorio
git clone https://github.com/SALVADORPOETA/Poder-judicial-backend-sm.git

# Navegar al directorio
cd poder-judicial-backend-sm

# Instalar dependencias
npm install
```

### Environment Variables

Crea un archivo `.env` en la raíz del proyecto:
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
# Configuraciones adicionales de API si es necesario
```

### Server Execution

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

El servidor estará escuchando en `http://localhost:3000`.

---

## 🔌 API Endpoints (Principales)

### Scraping
* `POST /api/start-scraping`: Inicia la recolección de URLs de una lista específica del PJF.
* `POST /api/scrape-details`: Recibe una lista de enlaces y realiza la extracción profunda de cada perfil.

### Procesamiento
* `POST /api/generate-excel`: Toma un objeto JSON y devuelve un archivo `.xlsx` listo para descargar.



---

## 📂 Project Structure

```text
backend/
├─ session_whatsapp/    # Datos de sesión persistente de WhatsApp
├─ wweb_session/        # Perfil de navegador para automatización web
├─ Extra/               # Versiones alternativas de lógica (Server/Scraping)
├─ messagingFunctions.js # Lógica de envío y plantillas
├─ scrapingFunctions.js  # Scripts de extracción con Puppeteer
├─ server.js            # Entry point y definición de rutas API
├─ vercel.json          # Configuración para despliegue en Vercel
├─ .env                 # Variables de entorno (Privado)
├─ package.json         # Dependencias y scripts
└─ README.md
```

---

## ⚙️ Scraping Logic & Performance

El motor de scraping utiliza técnicas de **espera selectiva** y **selectores CSS dinámicos** para interactuar con la web del Poder Judicial. Se ha optimizado para:
1.  Evitar bloqueos mediante el uso de User-Agents aleatorios.
2.  Manejar tiempos de espera (timeouts) en caso de que el portal judicial esté lento.
3.  Estructurar el HTML desordenado en objetos JSON limpios y listos para el frontend.

---

## 📌 Originality Statement

Este backend es **original y desarrollado a medida**.
* No utiliza wrappers de terceros para el scraping judicial.
* La lógica de conversión de JSON a Excel fue personalizada para cumplir con los requisitos del reporte judicial.
* El sistema de detección de género fue implementado específicamente para los nombres y títulos comunes en México y el sector legal.

---

## 👨🏽‍💻 Author

**Salvador Martínez**
*Full-Stack Developer*

* **GitHub:** [SALVADORPOETA](https://github.com/SALVADORPOETA)
* **LinkedIn:** [Salvador Martínez](https://www.linkedin.com/in/salvador-martinez-sm/)

---

## ⚖️ License

Este es un proyecto de portafolio por **Salvador Martínez**.
Uso comercial no autorizado.
Todos los derechos reservados.
