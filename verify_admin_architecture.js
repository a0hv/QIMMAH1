const http = require('http');
const fs = require('fs');

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testAll() {
  console.log('====================================================');
  console.log('🧪 PLATFORM VERIFICATION: AUTHENTICATION & ARCHITECTURE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // 1. Check HTML structure for removal of separate admin login
  console.log('--- CHECK 1: Public Interface Sanitization ---');
  const indexHtml = fs.readFileSync('public/index.html', 'utf8');

  assert(!indexHtml.includes('modalAdminLogin'), 'No modalAdminLogin exists in HTML');
  assert(!indexHtml.includes('تسجيل دخول الأدمن'), 'No "تسجيل دخول الأدمن" text in HTML');
  assert(!indexHtml.includes('Admin Login'), 'No "Admin Login" text in HTML');
  assert(!indexHtml.includes('دخول إدارة المنصة والمشرفين'), 'No discreet admin portal link in modalAuth');
  assert(!indexHtml.includes('id="navAdminLink"'), 'No navAdminLink in public navbar');
  assert(indexHtml.includes('id="modalAuth"'), 'Unified modalAuth exists');
  assert(indexHtml.includes('id="loginAccessCode"'), 'Single code input loginAccessCode exists');
  assert(indexHtml.includes('App.submitCodeLogin()'), 'Submit button calls unified App.submitCodeLogin()');

  // 2. Check 3 distinct layouts in HTML
  console.log('\n--- CHECK 2: Distinct Layout Architecture ---');
  assert(indexHtml.includes('id="publicLayout"'), 'publicLayout exists');
  assert(indexHtml.includes('id="studentLayout"'), 'studentLayout exists');
  assert(indexHtml.includes('id="adminLayout"'), 'adminLayout exists');
  assert(indexHtml.includes('id="adminTabBtn_overview"'), 'Admin Tab: Overview exists');
  assert(indexHtml.includes('id="adminTabBtn_students"'), 'Admin Tab: Students exists');
  assert(indexHtml.includes('id="adminTabBtn_skills"'), 'Admin Tab: Skills exists');
  assert(indexHtml.includes('id="adminTabBtn_exams"'), 'Admin Tab: Aggregated Exams exists');
  assert(indexHtml.includes('id="adminTabBtn_book"'), 'Admin Tab: Foundation Book exists');
  assert(indexHtml.includes('id="adminTabBtn_settings"'), 'Admin Tab: Settings exists');
  assert(indexHtml.includes('App.logout()'), 'Prominent logout button exists');

  // 3. Test Student Code Login
  console.log('\n--- CHECK 3: Student Code Authentication ---');
  const studentRes = await request('http://localhost:3000/api/auth/code-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { accessCode: 'QIMMAH-105' });

  assert(studentRes.status === 200, 'Student code returns HTTP 200');
  assert(studentRes.body.role === 'student', 'Student code role is "student"');
  assert(!!studentRes.body.token, 'Student receives valid JWT token');
  const studentToken = studentRes.body.token;

  // 4. Test Secret Admin Code 1 (QIMMAH-ADMIN-2026)
  console.log('\n--- CHECK 4: Secret Admin Code Authentication ---');
  const adminRes1 = await request('http://localhost:3000/api/auth/code-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { accessCode: 'QIMMAH-ADMIN-2026' });

  assert(adminRes1.status === 200, 'Admin code 1 returns HTTP 200');
  assert(adminRes1.body.role === 'admin', 'Admin code 1 role is "admin"');
  assert(adminRes1.body.user.name === 'الأستاذ جابر القاضي', 'Admin user is الأستاذ جابر القاضي');
  assert(!!adminRes1.body.token, 'Admin receives valid JWT token');
  const adminToken = adminRes1.body.token;

  // Test Secret Admin Code 2 (ADMIN777)
  const adminRes2 = await request('http://localhost:3000/api/auth/code-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { accessCode: 'ADMIN777' });
  assert(adminRes2.status === 200 && adminRes2.body.role === 'admin', 'Admin code 2 (ADMIN777) also accepted as admin');

  // 5. Test Invalid Code Neutral Response
  console.log('\n--- CHECK 5: Invalid Code Neutral Response ---');
  const wrongRes = await request('http://localhost:3000/api/auth/code-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { accessCode: 'UNAUTHORIZED-CODE-999' });

  assert(wrongRes.status === 401, 'Invalid code returns HTTP 401');
  assert(wrongRes.body.message.includes('كود الدخول غير صحيح'), 'Neutral error message without revealing admin existence');
  assert(!JSON.stringify(wrongRes.body).includes('admin'), 'No "admin" word in error response body');

  // 6. Test Route & API Protection (RBAC)
  console.log('\n--- CHECK 6: Role-Based Access Control (RBAC) ---');
  // Unauthenticated metrics request
  const noTokenRes = await request('http://localhost:3000/api/admin/metrics');
  assert(noTokenRes.status === 401, 'Unauthenticated access to /api/admin/metrics rejected (401)');

  // Student accessing admin metrics
  const studentAdminRes = await request('http://localhost:3000/api/admin/metrics', {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(studentAdminRes.status === 403, 'Student access to /api/admin/metrics forbidden (403)');

  // Admin accessing admin metrics
  const adminMetricsRes = await request('http://localhost:3000/api/admin/metrics', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminMetricsRes.status === 200, 'Admin access to /api/admin/metrics allowed (200)');
  assert(adminMetricsRes.body.success === true, 'Admin metrics loaded successfully');

  // Admin accessing student management
  const adminStudentsRes = await request('http://localhost:3000/api/admin/students', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminStudentsRes.status === 200, 'Admin access to /api/admin/students allowed (200)');
  assert(Array.isArray(adminStudentsRes.body.students), 'Students list returned as array');

  // 7. Check Router and Layout JS logic
  console.log('\n--- CHECK 7: Client Router Logic & Separation ---');
  const appJs = fs.readFileSync('public/assets/js/app.js', 'utf8');
  assert(appJs.includes("this.switchLayout('admin')"), 'App.js switches to admin layout');
  assert(appJs.includes("this.switchLayout('student')"), 'App.js switches to student layout');
  assert(appJs.includes("this.switchLayout('public')"), 'App.js switches to public layout');
  assert(appJs.includes("if (res.user.role === 'admin')"), 'App.js routes admin code to #admin');
  assert(appJs.includes("if (this.currentUser.role === 'admin')"), 'App.js protects student routes against admin view and vice-versa');
  assert(!appJs.includes('openAdminLoginModal'), 'No openAdminLoginModal in app.js');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} / ${total} Checks Passed (${Math.round(passed/total*100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 ALL ARCHITECTURAL AND AUTHENTICATION TESTS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
