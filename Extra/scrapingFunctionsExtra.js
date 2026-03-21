const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const OUTPUT_DIR = path.join(__dirname, 'output')
const ENLACES_DIR = path.join(OUTPUT_DIR, 'enlaces')
const DETALLES_DIR = path.join(OUTPUT_DIR, 'detalles')

if (!fs.existsSync(ENLACES_DIR)) fs.mkdirSync(ENLACES_DIR, { recursive: true })
if (!fs.existsSync(DETALLES_DIR))
  fs.mkdirSync(DETALLES_DIR, { recursive: true })

async function runScrapeEnlaces(listId) {
  const OUTPUT_FILE = path.join(ENLACES_DIR, `enlaces_electos_${listId}.json`)
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  const BASE_URL = `https://candidaturaspoderjudicial.ine.mx/conoceTuNuevoPoderJudicial/${listId}`

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    let totalLinks = []
    let pageNumber = 1

    while (true) {
      console.log(`Procesando página ${pageNumber}...`)

      // Esperar a que carguen los enlaces
      await page.waitForSelector('.linkDetalleCandidato', { timeout: 30000 })

      const enlaces = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.linkDetalleCandidato')).map(
          (a) => a.href,
        ),
      )

      totalLinks = Array.from(new Set([...totalLinks, ...enlaces]))

      // Guardar progreso inmediato
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(totalLinks, null, 2))

      // Intentar ir a la siguiente página
      pageNumber++
      const nextButton = await page.$(`li.ant-pagination-item-${pageNumber}`)

      if (nextButton) {
        await nextButton.click()
        await new Promise((r) => setTimeout(r, 2000)) // Esperar carga
      } else {
        break // No hay más páginas
      }
    }

    await browser.close()
    return { total: totalLinks.length, file: OUTPUT_FILE }
  } catch (error) {
    if (browser) await browser.close()
    throw error
  }
}

async function runScrapeDetalles(enlaces, listId) {
  const browser = await puppeteer.launch({
    headless: false, // Lo mantenemos visible para monitorear
    protocolTimeout: 120000,
    args: [
      '--window-size=900,800',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 850, height: 700 })

  // Anti-detección básica
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })

  const resultados = []
  console.log(
    `>>> Procesando ${enlaces.length} perfiles con selectores reales...`,
  )

  for (let i = 0; i < enlaces.length; i++) {
    const url = enlaces[i]
    try {
      console.log(`[${i + 1}/${enlaces.length}] Extrayendo: ${url}`)

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 90000,
      })

      // Simular interacción humana: scroll y espera
      await page.evaluate(() => window.scrollBy(0, 300))
      await new Promise((r) => setTimeout(r, 3000))

      // Esperar a que el selector crítico aparezca
      await page.waitForSelector('[data-det="nombreCandidato"]', {
        visible: true,
        timeout: 40000,
      })

      const datos = await page.evaluate(() => {
        const getText = (s) =>
          document.querySelector(s)?.textContent.trim() || 'No disponible'

        const correos = Array.from(
          document.querySelectorAll('[data-det="correoElecPublico"]'),
        )
          .map((el) => el.textContent.trim())
          .filter((t) => t.includes('@'))

        return {
          nombre: getText('[data-det="nombreCandidato"]'),
          telefono: getText('[data-det="telefonoPublico"]'),
          correo: correos[0] || 'No disponible',
          sexo: getText('[data-det="sexo"]'),
        }
      })

      resultados.push({ url, ...datos })
      console.log(`   ✅ Capturado: ${datos.nombre}`)
    } catch (err) {
      console.error(`   ⚠️ Error en ${url}:`, err.message.substring(0, 50))
      resultados.push({ url, error: 'Dato no disponible / Timeout' })
    }

    // Guardado incremental para no perder datos si algo falla
    const tempFileName = `detalles_lista_${listId}.json`
    fs.writeFileSync(
      path.join(DETALLES_DIR, tempFileName),
      JSON.stringify(resultados, null, 2),
    )
  }

  await browser.close()

  const finalPath = path.join(DETALLES_DIR, `detalles_lista_${listId}.json`)
  return { total: resultados.length, path: finalPath }
}

async function jsonToExcel(listId) {
  try {
    // Definimos las rutas basadas en tu estructura actual
    const INPUT_FILE = path.join(DETALLES_DIR, `detalles_lista_${listId}.json`)
    const XLSX_FOLDER = path.join(OUTPUT_DIR, 'xlsx')
    const OUTPUT_FILE = path.join(XLSX_FOLDER, `reporte_lista_${listId}.xlsx`)

    // Crear carpeta xlsx si no existe
    if (!fs.existsSync(XLSX_FOLDER))
      fs.mkdirSync(XLSX_FOLDER, { recursive: true })

    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`No existe el JSON de detalles para la lista: ${listId}`)
    }

    // Leer el JSON de la carpeta 'detalles'
    const datos = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))

    // Crear la hoja y el libro
    const hoja = XLSX.utils.json_to_sheet(datos)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, `Lista_${listId}`)

    // Escribir el archivo
    XLSX.writeFile(libro, OUTPUT_FILE)

    console.log(`📊 Excel generado: ${OUTPUT_FILE}`)
    return {
      success: true,
      path: OUTPUT_FILE,
      fileName: `reporte_lista_${listId}.xlsx`,
    }
  } catch (error) {
    console.error('Error al generar Excel:', error)
    throw error
  }
}

// Actualiza tus exports
module.exports = { runScrapeEnlaces, runScrapeDetalles, jsonToExcel }

// async function runScrapeEnlaces(listId) {
//   const browser = await puppeteer.launch({
//     args: chromium.args,
//     defaultViewport: chromium.defaultViewport,
//     executablePath: await chromium.executablePath(),
//     headless: chromium.headless,
//   })

//   const page = await browser.newPage()
//   const BASE_URL = `https://candidaturaspoderjudicial.ine.mx/conoceTuNuevoPoderJudicial/${listId}`

//   try {
//     await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
//     let totalLinks = []
//     let pageNumber = 1

//     while (true) {
//       await page.waitForSelector('.linkDetalleCandidato', { timeout: 20000 })
//       const enlaces = await page.evaluate(() =>
//         Array.from(document.querySelectorAll('.linkDetalleCandidato')).map(
//           (a) => a.href,
//         ),
//       )
//       totalLinks = Array.from(new Set([...totalLinks, ...enlaces]))

//       pageNumber++
//       const nextButton = await page.$(`li.ant-pagination-item-${pageNumber}`)
//       if (nextButton && totalLinks.length < 50) {
//         // Limitamos para no morir por timeout en Vercel
//         await nextButton.click()
//         await new Promise((r) => setTimeout(r, 2000))
//       } else {
//         break
//       }
//     }

//     await browser.close()
//     return totalLinks // DEVOLVEMOS EL ARRAY DIRECTO
//   } catch (error) {
//     if (browser) await browser.close()
//     throw error
//   }
// }
