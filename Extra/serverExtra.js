const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer') // <-- NUEVO: Para manejar subida de archivos
const {
  runScrapeEnlaces,
  runScrapeDetalles,
  jsonToExcel,
} = require('../scrapingFunctions')
const { sendWhatsAppBulk, initWhatsApp } = require('../messagingFunctions')

const app = express()

// Configuración de Multer para la subida de archivos temporales
const UPLOADS_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR)
const upload = multer({ dest: 'uploads/' })

app.use(cors())
app.use(express.json())

// Servir archivos estáticos (enlaces, detalles y xlsx)
app.use(
  '/descargas',
  express.static(path.join(__dirname, 'output'), {
    setHeaders: (res, filePath) => {
      // Aplicamos el header de descarga a JSON y XLSX
      if (filePath.endsWith('.json') || filePath.endsWith('.xlsx')) {
        const fileName = path.basename(filePath)
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${fileName}"`,
        )
      }
    },
  }),
)

// RUTA MÓDULO 1: Extracción de Enlaces
app.post('/api/start-scraping', async (req, res) => {
  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'Falta el ID de la lista' })

  try {
    console.log(`>>> Iniciando extracción de ENLACES para ID: ${id}`)
    const resultado = await runScrapeEnlaces(id)

    res.json({
      success: true,
      message: 'Enlaces extraídos correctamente',
      total: resultado.total,
      downloadUrl: `http://localhost:3001/descargas/enlaces/enlaces_electos_${id}.json`,
    })
  } catch (error) {
    console.error('Error en scraping de enlaces:', error)
    res.status(500).json({ error: error.message })
  }
})

// RUTA MÓDULO 2: Extracción de Detalles (Recibe el JSON subido)
app.post(
  '/api/scrape-details',
  upload.single('enlacesJson'),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: 'No se recibió archivo' })

      // 1. Extraer SOLO el número después de "electos_"
      // originalname puede ser: "enlaces_electos_1 (1).json"
      const fileNameOriginal = req.file.originalname

      // Esta regex busca "enlaces_electos_" y captura los dígitos que sigan (\d+)
      const match = fileNameOriginal.match(/enlaces_electos_(\d+)/)

      // Si encuentra el número lo usa, si no, usa 'extraida'
      const listId = match ? match[1] : 'extraida'

      console.log(
        `>>> Detectado ID de lista: ${listId} desde el archivo: ${fileNameOriginal}`,
      )

      const rawData = fs.readFileSync(req.file.path)
      const enlaces = JSON.parse(rawData)

      // 2. Ejecutar scraping pasando el ID limpio
      const resultado = await runScrapeDetalles(enlaces, listId)

      fs.unlinkSync(req.file.path)

      res.json({
        success: true,
        total: resultado.total,
        file: resultado.path,
      })
    } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path)
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  },
)

// Ruta para convertir el JSON ya existente en Excel
app.post('/api/generate-excel', async (req, res) => {
  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'Falta el ID de la lista' })

  try {
    const resultado = await jsonToExcel(id)

    res.json({
      success: true,
      message: 'Excel generado correctamente',
      // La URL para descargar el archivo
      downloadUrl: `http://localhost:3001/descargas/xlsx/${resultado.fileName}`,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

const nodemailer = require('nodemailer')
require('dotenv').config()

// Looking to send emails in production? Check out our Email API/SMTP product!
// 1. Configuración SIN POOL para pruebas (Mailtrap a veces se confunde con el pool en planes gratuitos)
// const transporter = nodemailer.createTransport({
//   host: 'sandbox.smtp.mailtrap.io',
//   port: 2525,
//   auth: {
//     user: '1212d4077559d4',
//     pass: '09bc65e422a85f',
//   },
// })

// 2. Ruta con Pausa Forzada ANTES de cada envío
// app.post('/api/send-email-bulk', async (req, res) => {
//   const { lista } = req.body
//   console.log(`>>> Solicitud recibida: ${lista.length} correos.`)

//   let enviados = 0
//   let errores = 0

//   // Usamos un bucle for tradicional (i = 0...) que es el más estricto con el await
//   for (let i = 0; i < lista.length; i++) {
//     const item = lista[i]

//     try {
//       // 1. Log de tiempo para debuguear la espera
//       console.log(
//         `[${new Date().toLocaleTimeString()}] Preparando envío ${i + 1}/${lista.length} para: ${item.email}`,
//       )

//       const localTransporter = nodemailer.createTransport({
//         host: 'sandbox.smtp.mailtrap.io',
//         port: 587, // CAMBIAMOS DE 2525 A 587
//         secure: false, // 587 usa STARTTLS, no SSL directo
//         auth: {
//           user: '1212d4077559d4',
//           pass: '09bc65e422a85f',
//         },
//         tls: {
//           // Esto fuerza a que no se reutilicen sesiones TLS previas
//           rejectUnauthorized: false,
//         },
//       })

//       await localTransporter.sendMail({
//         from: `"Romeo Ahuja" <pruebas@bellumpolitics.com>`,
//         to: item.email,
//         subject: item.asunto,
//         html: item.cuerpo,
//       })

//       console.log(`[${new Date().toLocaleTimeString()}] ✅ Éxito.`)
//       enviados++
//       localTransporter.close()

//       // 2. LA ESPERA CRUCIAL (Solo si no es el último correo)
//       if (i < lista.length - 1) {
//         console.log('Esperando 10 segundos para el siguiente...')
//         await new Promise((r) => setTimeout(r, 10000))
//       }
//     } catch (err) {
//       console.error(
//         `[${new Date().toLocaleTimeString()}] ❌ Falló:`,
//         err.message,
//       )
//       errores++
//       // Incluso si falla, esperamos para que el siguiente no sea bloqueado por "ráfaga"
//       await new Promise((r) => setTimeout(r, 10000))
//     }
//   }

//   res.json({ success: true, message: `Terminado. Enviados: ${enviados}` })
// })

app.post('/api/send-email-bulk', async (req, res) => {
  const { lista } = req.body
  console.log(`>>> Iniciando envío optimizado: ${lista.length} correos.`)

  // 1. CREAMOS EL TRANSPORTE UNA SOLA VEZ (FUERA DEL BUCLE)
  // Usamos 'pool: true' para que Nodemailer mantenga la conexión abierta
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    pool: true, // <--- REUTILIZA LA CONEXIÓN (Mucho más rápido)
    maxConnections: 1, // Hostinger prefiere una sola conexión persistente
    maxMessages: 100, // Envía hasta 100 antes de refrescar la conexión
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  let enviados = 0
  let errores = 0

  for (let i = 0; i < lista.length; i++) {
    const item = lista[i]

    try {
      await transporter.sendMail({
        from: `"Romeo Ahuja - BellumPolitics" <${process.env.SMTP_USER}>`,
        to: item.email,
        subject: item.asunto,
        html: item.cuerpo,
      })

      enviados++
      console.log(`[${i + 1}/${lista.length}] ✅ Enviado a: ${item.email}`)

      // 2. REDUCCIÓN DEL TIEMPO (De 10s a 2s o 3s)
      if (i < lista.length - 1) {
        // 2000ms (2 segundos) es el "sweet spot" para Hostinger
        await new Promise((r) => setTimeout(r, 2000))
      }
    } catch (err) {
      console.error(`❌ Error en ${item.email}:`, err.message)
      errores++
      // Si hay error, esperamos un poco más para "enfriar" la conexión
      await new Promise((r) => setTimeout(r, 5000))
    }
  }

  // Cerramos el pool al final de todo el proceso
  transporter.close()

  res.json({
    success: true,
    message: `Enviados: ${enviados}, Errores: ${errores}`,
  })
})

// Nueva ruta para inicializar el navegador (para que el usuario escanee el QR antes de enviar)
app.get('/api/wa-init', async (req, res) => {
  try {
    await initWhatsApp()
    res.json({ success: true, message: 'Navegador listo.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Nueva ruta para el envío masivo
app.post('/api/send-whatsapp-bulk', async (req, res) => {
  const { lista } = req.body
  try {
    const resultado = await sendWhatsAppBulk(lista)
    res.json({
      success: true,
      message: `Enviados: ${resultado.enviados}, Errores: ${resultado.errores}`,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, () =>
  console.log(
    `🚀 Servidor PJ Scraper (Enlaces + Detalles) en http://localhost:${PORT}`,
  ),
)
