import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Canvas HTML template generator
const generateCanvasHTML = (canvasData, width, height) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/6.0.2/fabric.min.js"></script>
  <style>
    body { margin: 0; background: transparent; }
    #canvas-container { display: inline-block; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="fabricCanvas" width="${width}" height="${height}"></canvas>
  </div>
  <script>
    (async () => {
      try {
        const canvas = new fabric.Canvas('fabricCanvas', {
          width: ${width},
          height: ${height},
          selection: false,
          interactive: false
        });
        const canvasData = ${JSON.stringify(canvasData)};
        await canvas.loadFromJSON(canvasData, () => {
          canvas.renderAll();
          window.canvasReady = true;
        });
      } catch (e) {
        console.error('Canvas error:', e);
        window.canvasError = e.toString();
      }
    })();
  </script>
</body>
</html>`;
};

// Ana handler fonksiyonu
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  let browser = null;
  
  try {
    const {
      canvas_data,
      width = 800,
      height = 600,
      format = 'png',
      quality = 1,
      scale = 1
    } = req.body;

    if (!canvas_data) {
      return res.status(400).json({ error: 'canvas_data is required' });
    }

    console.log('Starting browser...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    console.log('Creating page...');
    const page = await browser.newPage();
    await page.setViewport({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      deviceScaleFactor: scale
    });

    console.log('Setting content...');
    const htmlContent = generateCanvasHTML(canvas_data, width, height);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 10000 });

    console.log('Waiting for canvas...');
    await page.waitForFunction(
      () => window.canvasReady === true || window.canvasError,
      { timeout: 15000 }
    );

    const canvasError = await page.evaluate(() => window.canvasError);
    if (canvasError) {
      throw new Error(`Canvas rendering error: ${canvasError}`);
    }

    console.log('Taking screenshot...');
    const canvasElement = await page.$('#canvas-container');
    if (!canvasElement) {
      throw new Error('Canvas element not found');
    }

    const screenshotOptions = { type: format, encoding: 'base64' };
    if (format === 'jpeg') {
      screenshotOptions.quality = Math.round(quality * 100);
    }

    const screenshot = await canvasElement.screenshot(screenshotOptions);
    const processingTime = Date.now() - startTime;

    const imageUrl = `data:image/${format};base64,${screenshot}`;
    
    console.log('Rendering completed successfully');
    return res.status(200).json({
      success: true,
      image_url: imageUrl,
      processing_time: processingTime,
    });

  } catch (error) {
    console.error('Rendering error:', error);
    const processingTime = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: 'Rendering failed',
      details: error.message,
      processing_time: processingTime,
    });

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}