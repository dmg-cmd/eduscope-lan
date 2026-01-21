const { chromium } = require('playwright');

async function testQrCode() {
    console.log('🧪 Probando funcionalidad de Codigo QR...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test 1: Check if QR code page loads
    console.log('\n📱 Prueba 1: Cargando pagina del codigo QR...');
    try {
        await page.goto('http://localhost:3000/qrcode', { waitUntil: 'networkidle', timeout: 10000 });
        const title = await page.title();
        console.log(`   ✓ Pagina QR cargada: ${title}`);
        
        // Check if QR image is present
        const qrImage = await page.$('#qr-code');
        if (qrImage) {
            console.log('   ✓ Imagen QR presente');
        } else {
            console.log('   ✗ Imagen QR no encontrada');
        }
        
        // Check URL text
        const urlText = await page.textContent('#url-text');
        if (urlText && urlText.includes('3000')) {
            console.log(`   ✓ URL mostrada: ${urlText}`);
        }
        
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    
    // Test 2: Check QR code API
    console.log('\n🔗 Prueba 2: Verificando API de codigo QR...');
    try {
        const response = await page.evaluate(async () => {
            const res = await fetch('/api/qrcode');
            return await res.json();
        });
        
        if (response.url && response.qrcode) {
            console.log(`   ✓ API funcionando`);
            console.log(`   ✓ URL: ${response.url}`);
            console.log(`   ✓ QR Base64: ${response.qrcode.substring(0, 50)}...`);
        } else {
            console.log('   ✗ Respuesta API incompleta');
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    
    // Test 3: Check QR code image directly
    console.log('\n🖼️  Prueba 3: Verificando imagen QR directa...');
    try {
        const response = await page.goto('http://localhost:3000/qrcode.png');
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('image/png')) {
            console.log(`   ✓ Imagen PNG generada correctamente`);
            console.log(`   ✓ Content-Type: ${contentType}`);
        } else {
            console.log(`   ⚠ Content-Type: ${contentType || 'No detectado'}`);
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    
    await browser.close();
    
    console.log('\n✅ Pruebas de QR completadas!');
}

testQrCode().catch(console.error);
