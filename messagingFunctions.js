const puppeteer = require('puppeteer')

let browser
let page

/**
 * Inicializa el navegador para WhatsApp.
 * Se mantiene abierto para no tener que escanear el QR cada vez.
 */
async function initWhatsApp() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: './session_whatsapp', // Tu carpeta de sesión
      // 1. Agregamos el flag de la ventana maximizada
      args: ['--no-sandbox', '--start-maximized', '--disable-setuid-sandbox'],
      // 2. IMPORTANTE: Esto quita el límite de 800x600 píxeles
      defaultViewport: null,
    })
    page = await browser.newPage()
    await page.goto('https://web.whatsapp.com')
  }
  return page
}

/**
 * Procesa la lista de envíos uno por uno
 */
async function sendWhatsAppBulk(lista) {
  const page = await initWhatsApp()

  let enviados = 0
  let errores = 0

  for (const item of lista) {
    try {
      const tlf = item.telefono.replace(/\D/g, '')
      if (!tlf) continue

      const numeroConPrefijo = `52${tlf}` // Prefijo México
      // Usamos el mensaje personalizado si existe, si no el genérico
      const mensaje = item.mensaje

      const url = `https://web.whatsapp.com/send?phone=${numeroConPrefijo}&text=${encodeURIComponent(mensaje)}`

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

      // Esperar a que el selector de mensaje sea visible (indicador de que cargó el chat)
      await page.waitForSelector('div[contenteditable="true"]', {
        timeout: 20000,
      })

      await new Promise((r) => setTimeout(r, 1500)) // Respiro humano

      await page.keyboard.press('Enter')

      console.log(
        `✅ Enviado a: ${item.nombreEditado || item.nombre} (${numeroConPrefijo})`,
      )
      enviados++

      // Delay de 4 seg para evitar que WhatsApp sospeche
      await new Promise((r) => setTimeout(r, 4000))
    } catch (err) {
      console.error(
        `❌ Error con ${item.nombre}:`,
        err.message.substring(0, 50),
      )
      errores++
    }
  }

  return { enviados, errores }
}

module.exports = { sendWhatsAppBulk, initWhatsApp }
