const chromium = require('@sparticuz/chromium')

const puppeteer =
  process.env.NODE_ENV === 'production'
    ? require('puppeteer-core')
    : require('puppeteer')

const getOptions = async () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    }
  } else {
    return {
      args: [
        '--no-sandbox',
        // '--start-maximized', // <--- 1. Inicia la ventana maximizada
      ],
      headless: false,
      userDataDir: './wweb_session',
      defaultViewport: null, // <--- 2. CRÍTICO: Evita que Puppeteer fuerce el tamaño 800x600
    }
  }
}

let browser

/**
 * Función interna para enviar un solo mensaje
 * (Ahora integrada para que el bucle for...of la reconozca)
 */
async function enviarUno(item) {
  const numLimpio = item.telefono.replace(/\D/g, '')
  const tlf = numLimpio.startsWith('52') ? numLimpio : `52${numLimpio}`
  const url = `https://web.whatsapp.com/send?phone=${tlf}&text=${encodeURIComponent(item.mensaje)}`

  const newPage = await browser.newPage()
  try {
    await newPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    await newPage.waitForSelector('div[contenteditable="true"]', {
      timeout: 30000,
    })

    // Delay aleatorio y envío
    const delay = Math.floor(Math.random() * 3000) + 3000
    await new Promise((r) => setTimeout(r, delay))
    await newPage.keyboard.press('Enter')

    // Esperar a que el "check" salga antes de cerrar
    await new Promise((r) => setTimeout(r, 5000))

    await newPage.close() // <--- CIERRA LA PESTAÑA AQUÍ
    console.log(`✅ Enviado: ${item.nombre}`)
    return { success: true, nombre: item.nombre }
  } catch (e) {
    console.error(`❌ Error en ${item.nombre}: ${e.message}`)
    await newPage.close() // <--- CIERRA LA PESTAÑA TAMBIÉN EN ERROR
    return { success: false, nombre: item.nombre, error: e.message }
  }
}

async function initWhatsApp() {
  const options = await getOptions()
  browser = await puppeteer.launch(options)
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  )
  await page.goto('https://web.whatsapp.com')
  return page
}

async function sendWhatsAppBulk(lista) {
  try {
    if (!browser || !browser.connected) {
      const options = await getOptions()
      browser = await puppeteer.launch(options)
    }

    // --- TRUCO AQUÍ ---
    // Puppeteer abre una pestaña en blanco por defecto ("about:blank").
    // Vamos a obtener todas las pestañas abiertas y cerrar las que no sirvan.
    const pages = await browser.pages()
    if (pages.length > 1) {
      // Si hay más de una, cerramos las extras para empezar limpios
      for (let i = 1; i < pages.length; i++) await pages[i].close()
    }
    // ------------------

    const resultados = []

    for (const item of lista) {
      const res = await enviarUno(item)
      resultados.push(res)
      await new Promise((r) => setTimeout(r, 2000))
    }

    await browser.close()
    browser = null
    return resultados
  } catch (globalError) {
    console.error('❌ Error crítico:', globalError.message)
    if (browser) {
      await browser.close()
      browser = null
    }
    return lista.map((item) => ({
      success: false,
      nombre: item.nombre,
      error: globalError.message,
    }))
  }
}

module.exports = { sendWhatsAppBulk, initWhatsApp }
