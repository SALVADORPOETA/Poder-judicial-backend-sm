const express = require('express')
const cors = require('cors')
const nodemailer = require('nodemailer')
const path = require('path')
const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
require('dotenv').config({ path: path.join(__dirname, envFile) })
// require('dotenv').config()
console.log(`Configuración cargada desde: ${envFile}`)
console.log(`MODO_HIBRIDO es: ${process.env.MODO_HIBRIDO}`)

// Importamos tus funciones optimizadas (las que devuelven arrays, no archivos)
const {
  runScrapeEnlaces,
  runScrapeDetalles,
  jsonToExcelBuffer, // Cambiamos a la versión que genera Buffer
} = require('./scrapingFunctions')
const { sendWhatsAppBulk, initWhatsApp } = require('./messagingFunctions')

const app = express()

// --- CONFIGURACIÓN DE CORS OPTIMIZADA ---
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV, // http://localhost:5173
  process.env.FRONTEND_URL_PROD, // https://poder-judicial-frontend-sm.vercel.app
]

app.use(
  cors({
    origin: function (origin, callback) {
      // 1. Permitir peticiones sin origen (como Postman o llamadas internas)
      // 2. Permitir si el origen está en nuestra lista blanca
      // 3. Permitir SIEMPRE si estamos en MODO_HIBRIDO para evitar bloqueos en la demo
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.MODO_HIBRIDO === 'true'
      ) {
        callback(null, true)
      } else {
        callback(new Error('Bloqueado por políticas de CORS'))
      }
    },
    credentials: true,
    // AÑADE ESTO PARA NGROK:
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning',
    ],
  }),
)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// --- RUTAS DE SCRAPING (MEMORIA PURA) ---

// MÓDULO 1: Extracción de Enlaces
app.post('/api/start-scraping', async (req, res) => {
  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'Falta el ID de la lista' })

  try {
    console.log(`>>> Iniciando extracción de ENLACES para ID: ${id}`)
    const enlaces = await runScrapeEnlaces(id)

    // Enviamos los datos directamente. El frontend los convertirá en JSON para descargar.
    res.json({
      success: true,
      message: 'Enlaces extraídos correctamente',
      total: enlaces.length,
      data: enlaces,
    })
  } catch (error) {
    console.error('Error en scraping de enlaces:', error)
    res.status(500).json({ error: error.message })
  }
})

// MÓDULO 2: Extracción de Detalles
app.post('/api/scrape-details', async (req, res) => {
  try {
    const { enlaces } = req.body
    if (!enlaces || !Array.isArray(enlaces)) {
      return res
        .status(400)
        .json({ error: 'No se recibió un array de enlaces' })
    }

    console.log(`>>> Scrapeando ${enlaces.length} perfiles en paralelo...`)
    const datosFinales = await runScrapeDetalles(enlaces)

    res.json({
      success: true,
      total: datosFinales.length,
      data: datosFinales,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// --- RUTA EXCEL (AL VUELO) ---

app.post('/api/generate-excel', async (req, res) => {
  const { datos, id } = req.body // Recibimos los datos que el Front ya tiene
  try {
    const buffer = await jsonToExcelBuffer(datos)

    // Configuramos headers para que el navegador lo entienda como descarga de Excel
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_${id}.xlsx`,
    )

    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// --- RUTA EMAIL (HOSTINGER) ---

app.post('/api/send-email-bulk', async (req, res) => {
  const { lista } = req.body
  if (!lista || !Array.isArray(lista)) {
    return res
      .status(400)
      .json({ success: false, message: 'La lista de correos es inválida.' })
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    pool: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  let enviados = 0
  const total = lista.length

  for (let i = 0; i < lista.length; i++) {
    try {
      await transporter.sendMail({
        from: `"BellumPolitics" <${process.env.SMTP_USER}>`,
        to: lista[i].email,
        subject: lista[i].asunto,
        html: lista[i].cuerpo,
      })
      enviados++
      console.log(`✅ Correo enviado a: ${lista[i].email}`)
      // Delay para evitar ser marcado como SPAM
      if (i < total - 1) await new Promise((r) => setTimeout(r, 2000))
    } catch (err) {
      console.error(`Error en ${lista[i].email}:`, err.message)
    }
  }
  transporter.close()
  res.json({
    success: true,
    enviados,
    message: `Proceso completado. Enviados: ${enviados} de ${total}`,
  })
})

// --- RUTAS WHATSAPP ---

app.get('/api/wa-init', async (req, res) => {
  try {
    await initWhatsApp()
    res.json({ success: true, message: 'Navegador listo' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/send-whatsapp-bulk', async (req, res) => {
  try {
    const resultados = await sendWhatsAppBulk(req.body.lista)

    const enviados = resultados.filter((r) => r.success).length

    // IMPORTANTE: Envía la propiedad 'message' que espera tu alert del Front
    res.json({
      success: true,
      enviados: enviados,
      message: `Proceso completado. Enviados: ${enviados} de ${resultados.length}`,
      data: resultados,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: err.message,
    })
  }
})

// --- RUTA GENERADOR VCF ---
app.post('/api/generate-vcf', (req, res) => {
  const { lista, pj } = req.body

  if (!lista || !Array.isArray(lista)) {
    return res.status(400).json({ error: 'Lista inválida' })
  }

  try {
    const vcfContent = lista
      .map((item) => {
        // VALIDACIÓN DEFENSIVA: Si el item es nulo o no es objeto, lo saltamos
        if (!item || typeof item !== 'object') return null

        // Extraemos campos con valores por defecto para evitar el error de 'undefined'
        const contacto = item.contacto || item.nombre || 'Sin Nombre'
        const telefono = item.telefono || item.tel || ''
        const correo = item.correo || item.email || ''

        // Ahora el .replace() nunca fallará porque 'contacto' siempre es un string
        const nombreLimpio = contacto.replace(/\s*-\s*pj\d+$/i, '').trim()

        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${nombreLimpio}`,
          `TEL;TYPE=CELL:${telefono}`,
          `EMAIL;TYPE=INTERNET:${correo}`,
          `NOTE:pj${pj || 'extraida'}`,
          'END:VCARD',
        ].join('\n')
      })
      .filter((vcard) => vcard !== null) // Eliminamos los nulos si hubo errores en el map
      .join('\n\n')

    res.setHeader('Content-Type', 'text/vcard')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=contactos_lista_${pj || 'extraida'}.vcf`,
    )

    res.send(vcfContent)
  } catch (error) {
    console.error('❌ Error crítico generando VCF:', error)
    res
      .status(500)
      .json({ error: 'Error al procesar el formato de los contactos' })
  }
})

// --- INICIO DEL SERVIDOR ---

// Si NO estamos en producción (Vercel), o si estamos en MODO HÍBRIDO,
// el servidor debe encenderse y escuchar el puerto.
if (
  process.env.NODE_ENV !== 'production' ||
  process.env.MODO_HIBRIDO === 'true'
) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`🚀 Server corriendo en puerto ${PORT}`)
    if (process.env.MODO_HIBRIDO === 'true') {
      console.log(`⚠️  MODO HÍBRIDO ACTIVO: Aceptando conexiones de Vercel.`)
    }
  })
}

module.exports = app
