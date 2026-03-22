const chromium = require('@sparticuz/chromium')
const XLSX = require('xlsx')

// 1. Decidimos qué Puppeteer usar
// Si es Híbrido, necesitamos el 'puppeteer' normal porque corre en tu Windows
const isHybrid = process.env.MODO_HIBRIDO === 'true'

const puppeteer =
  process.env.NODE_ENV === 'production' && !isHybrid
    ? require('puppeteer-core')
    : require('puppeteer')

// 2. Centralizamos las opciones
const getOptions = async () => {
  // Si estamos en tu PC (Ya sea desarrollo o Modo Híbrido)
  if (process.env.NODE_ENV !== 'production' || isHybrid) {
    console.log('🖥️  Ejecutando Puppeteer en modo LOCAL/HÍBRIDO')
    return {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: false, // "new" es la recomendada en versiones recientes, o true/false
    }
  }

  // Si el BACKEND está realmente subido a la nube (Vercel/Railway)
  console.log('☁️  Ejecutando Puppeteer en modo NUBE')
  return {
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  }
}

async function runScrapeEnlaces(listId) {
  const options = await getOptions()
  const browser = await puppeteer.launch(options)

  const extraerPagina = async (numeroPagina) => {
    const page = await browser.newPage()
    try {
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'font', 'stylesheet'].includes(req.resourceType()))
          req.abort()
        else req.continue()
      })

      const url = `https://candidaturaspoderjudicial.ine.mx/conoceTuNuevoPoderJudicial/${listId}?page=${numeroPagina}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForSelector('.linkDetalleCandidato', { timeout: 10000 })

      const enlaces = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.linkDetalleCandidato')).map(
          (a) => a.href,
        ),
      )

      await page.close()
      return enlaces
    } catch (e) {
      await page.close()
      return []
    }
  }

  const paginas = [1, 2, 3, 4, 5]
  const resultadosArray = await Promise.all(
    paginas.map((p) => extraerPagina(p)),
  )
  const totalLinks = Array.from(new Set(resultadosArray.flat()))

  await browser.close()
  return totalLinks
}

async function runScrapeDetalles(enlaces) {
  const options = await getOptions()
  const browser = await puppeteer.launch(options)

  const extraerUnPerfil = async (url) => {
    const page = await browser.newPage()
    try {
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType()))
          req.abort()
        else req.continue()
      })

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('[data-det="nombreCandidato"]', {
        timeout: 15000,
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

      await page.close()
      return { url, ...datos, success: true }
    } catch (err) {
      await page.close()
      return { url, error: 'Error de carga', success: false }
    }
  }

  // En Vercel no proceses más de 5-10 de golpe para no saturar la RAM
  const resultados = await Promise.all(
    enlaces.map((url) => extraerUnPerfil(url)),
  )

  await browser.close()
  return resultados
}

async function jsonToExcelBuffer(datos) {
  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Candidatos')
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { runScrapeEnlaces, runScrapeDetalles, jsonToExcelBuffer }
