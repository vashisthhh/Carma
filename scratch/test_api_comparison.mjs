import fs from 'fs';

async function testExtraction(filePath, mimeType, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileBase64 = fileBuffer.toString('base64');

  console.log(`\n========================================`);
  console.log(`TESTING: ${fileName} (${mimeType}) - Size: ${fileBuffer.length} bytes`);
  console.log(`========================================`);

  try {
    const res = await fetch('http://localhost:3000/api/extract-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
        fileBase64,
        componentName: 'Taillight',
        componentId: 'tail-light'
      })
    });

    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

async function run() {
  const pdfPath = 'C:/Users/pande/OneDrive/Desktop/vashisth/misc/devengers/hyundai_eon_taillight_invoice.pdf';
  const pngPath = 'scratch/hyundai_eon_taillight_invoice-1.png';

  console.log('--- 1. Testing PDF ---');
  await testExtraction(pdfPath, 'application/pdf', 'hyundai_eon_taillight_invoice.pdf');

  console.log('\n--- 2. Testing Image (PNG) ---');
  await testExtraction(pngPath, 'image/png', 'hyundai_eon_taillight_invoice-1.png');
}

run();
