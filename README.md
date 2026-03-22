# PJF Backend Data Engine

**PJF Backend Data Engine** is the processing and automation core that powers my project **PJF Data & Messaging Suite**. Built with **Node.js** and **Express**, this engine handles the most critical tasks: from automated navigation in judicial portals to intelligent report generation and natural language processing for gender detection.

This server is designed to handle complex asynchronous workflows, ensuring that data extraction is precise, structured, and ready for immediate consumption by the frontend.

<img width="787" height="631" alt="pj-acceso" src="https://github.com/user-attachments/assets/c11ec25b-7311-4011-96b1-73da6aef7ca0" />

---

## ✨ Overview

The backend is not just a data bridge; it is an **automation orchestrator** that implements:

* **Multi-level Scraping:** Programmatic navigation using **Puppeteer** to extract information from complex judicial directories.
* **File Processing:** Dynamic generation of Excel files (.xlsx) and manipulation of JSON streams.
* **Normalization Engine:** Cleaning of names and standardization of raw judicial data.
* **Scalable Architecture:** Endpoints optimized to handle long-running requests (detailed scraping).
* **Data Security:** Schema validation and robust error handling to prevent failures in bulk processes.



---

## 🚀 Features

* ⚙️ **RESTful API:** Clear and documented endpoint structure for each phase of the process.
* 🕷️ **Headless Browser Integration:** Chrome automation to access data not available via public APIs.
* 📊 **Excel Engine:** Creation of professional reports with a unified format.
* 🧠 **Gender Detection:** Integrated logic to classify profiles based on normalized name dictionaries.
* 📂 **File Handling:** Management of JSON file uploads and reading for batch processing.
* 🛡️ **CORS & Security:** Production-ready configuration for consumption from specific domains.
* ⚡ **Async Processing:** Efficient promise management to avoid blocking the main thread during scraping.

---

## 🛠️ Tech Stack

| Category | Technology |
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
* Google Chrome (for Puppeteer in local environments)
* npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/SALVADORPOETA/Poder-judicial-backend-sm.git

# Navigate into the project directory
cd poder-judicial-backend-sm

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:
```env
PORT=3001
NODE_ENV=development
MODO_HIBRIDO=false

FRONTEND_URL_DEV=http://localhost:5173
FRONTEND_URL_PROD=https://your-link.vercel.app

SMTP_USER=your@email.com
SMTP_PASS=your-email-password

COMANDO_NGROK='ngrok http --url=your-link.ngrok-free.dev 3001'
```

### Server Execution

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will be listening at: `http://localhost:3001`.

---

## 🔌 API Endpoints (Main)

### Scraping
* `POST /api/start-scraping`: Starts URL collection from a specific PJF list.
* `POST /api/scrape-details`: Receives a list of links and performs deep extraction for each profile.

### Processing
* `POST /api/generate-excel`: Takes a JSON object and returns a `.xlsx` file ready for download.

---

## 📂 Project Structure

```text
backend/
├─ session_whatsapp/    # Persistent WhatsApp session data
├─ wweb_session/        # Browser profile for web automation
├─ Extra/               # Alternative logic versions (Server/Scraping)
├─ messagingFunctions.js # Messaging logic and templates
├─ scrapingFunctions.js  # Extraction scripts with Puppeteer
├─ server.js            # Entry point and API route definitions
├─ vercel.json          # Configuration for Vercel deployment
├─ .env                 # Environment variables (Private)
├─ package.json         # Dependencies and scripts
└─ README.md
```

---

## ⚙️ Scraping Logic & Performance

The scraping engine uses **selective waiting** techniques and **dynamic CSS selectors** to interact with the Federal Judiciary website. It has been optimized to:
1.  Avoid blocks by using randomized User-Agents.
2.  Handle timeouts in case the judicial portal is slow.
3.  Structure messy HTML into clean JSON objects ready for the frontend.



---

## 📌 Originality Statement

This backend is **original and custom-built**.
* It does not use third-party wrappers for judicial scraping.
* The JSON-to-Excel conversion logic was customized to meet judicial report requirements.
* The gender detection system was specifically implemented for common names and titles in Mexico and the legal sector.

---

## 👨🏽‍💻 Author

**Salvador Martínez**
*Full-Stack Developer*

* **GitHub:** [SALVADORPOETA](https://github.com/SALVADORPOETA)
* **LinkedIn:** [Salvador Martínez](https://www.linkedin.com/in/salvador-martinez-sm/)

---

## ⚖️ License

This is a portfolio project by **Salvador Martínez**.
No commercial use intended.
All rights reserved to the author.
