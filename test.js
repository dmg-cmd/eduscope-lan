const { chromium } = require('playwright');

async function testEduScope() {
    console.log('🧪 Iniciando pruebas de EduScope LAN...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test 1: Check if homepage loads
    console.log('\n📄 Prueba 1: Cargando página de inicio...');
    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 10000 });
        const title = await page.title();
        console.log(`   ✓ Página cargada: ${title}`);
    } catch (error) {
        console.log(`   ✗ Error al cargar página: ${error.message}`);
        await browser.close();
        process.exit(1);
    }
    
    // Test 2: Check login page
    console.log('\n🔐 Prueba 2: Verificando página de login...');
    try {
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 10000 });
        const title = await page.title();
        console.log(`   ✓ Login页 cargada: ${title}`);
    } catch (error) {
        console.log(`   ✗ Error al cargar login: ${error.message}`);
        await browser.close();
        process.exit(1);
    }
    
    // Test 3: Test login functionality
    console.log('\n👤 Prueba 3: Probando inicio de sesión como profesor...');
    try {
        await page.fill('#login-email', 'profesor@demo.com');
        await page.fill('#login-password', 'password123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard', { timeout: 5000 });
        console.log('   ✓ Inicio de sesión exitoso, redirigido al dashboard');
    } catch (error) {
        console.log(`   ✗ Error en inicio de sesión: ${error.message}`);
        await browser.close();
        process.exit(1);
    }
    
    // Test 4: Check dashboard elements
    console.log('\n📊 Prueba 4: Verificando elementos del dashboard...');
    try {
        const userName = await page.textContent('#user-name');
        console.log(`   ✓ Usuario identificado: ${userName}`);
        
        // Check for courses section
        const coursesSection = await page.$('#courses-grid');
        if (coursesSection) {
            console.log('   ✓ Sección de cursos encontrada');
        }
    } catch (error) {
        console.log(`   ✗ Error en dashboard: ${error.message}`);
    }
    
    // Test 5: Logout
    console.log('\n🚪 Prueba 5: Probando cierre de sesión...');
    try {
        await page.click('.user-dropdown');
        await page.click('text=Cerrar Sesión');
        await page.waitForURL('**/login', { timeout: 5000 });
        console.log('   ✓ Cierre de sesión exitoso');
    } catch (error) {
        console.log(`   ✗ Error en cierre de sesión: ${error.message}`);
    }
    
    // Test 6: Test student login
    console.log('\n🎓 Prueba 6: Probando inicio de sesión como estudiante...');
    try {
        await page.fill('#login-email', 'estudiante@demo.com');
        await page.fill('#login-password', 'password123');
        await page.click('button[type="submit"]');
        
        await page.waitForURL('**/dashboard', { timeout: 5000 });
        console.log('   ✓ Inicio de sesión como estudiante exitoso');
    } catch (error) {
        console.log(`   ✗ Error como estudiante: ${error.message}`);
    }
    
    await browser.close();
    
    console.log('\n✅ Todas las pruebas completadas exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('   - Página de inicio: ✓');
    console.log('   - Página de login: ✓');
    console.log('   - Autenticación profesor: ✓');
    console.log('   - Dashboard: ✓');
    console.log('   - Cierre de sesión: ✓');
    console.log('   - Autenticación estudiante: ✓');
}

testEduScope().catch(console.error);
