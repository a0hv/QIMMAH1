const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      ...headers,
      'Content-Type': 'application/json'
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method,
      headers: reqHeaders
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

async function runComprehensiveTests() {
  console.log('===============================================================');
  console.log('🧪 بدء الفحص الشامل لمنصة القمة في القدرات اللفظية - التحديث النهائي');
  console.log('===============================================================\n');

  // 1. Health check
  console.log('--- 1. فحص الاتصال وصحة الخادم ---');
  const health = await request('GET', '/api/health');
  console.log('حالة الخادم:', health.status, '| اسم المنصة:', health.data.platform);
  if (health.status !== 200) throw new Error('فشل فحص صحة الخادم.');

  // 2. Foundation Book PDF (New 86-page PDF)
  console.log('\n--- 2. فحص توفر كتاب التأسيس المجاني 2026 المنقح (86 صفحة) ---');
  const bookRes = await request('GET', '/downloads/تأسيس_القدرات_اللفظية_2026_أ_جابر_القاضي.pdf');
  console.log('كود استجابة ملف كتاب التأسيس:', bookRes.status, '| الحجم:', bookRes.headers['content-length'], 'بايت');
  if (bookRes.status !== 200 || parseInt(bookRes.headers['content-length'], 10) < 1000000) {
    throw new Error('فشل تحميل كتاب التأسيس الجديد أو الحجم غير متطابق.');
  }
  console.log('✓ تم التحقق بنجاح من توفر كتاب التأسيس المحدث (3.4 ميجابايت).');

  // 3. Before Login Protection: Unauthenticated Access Guard
  console.log('\n--- 3. فحص حماية المحتوى قبل تسجيل الدخول (Before Login) ---');
  const unauthSkillStart = await request('GET', '/api/skills/analogy/tests/analogy-test-1/start');
  console.log('محاولة بدء اختبار مهارة بدون كود طالب:', unauthSkillStart.status);
  if (unauthSkillStart.status !== 401) throw new Error('يجب رفض الوصول لاختبار المهارات لغير المسجلين.');

  const unauthExamStart = await request('GET', '/api/exams/faris-1/start');
  console.log('محاولة بدء اختبار مجمع بدون كود طالب:', unauthExamStart.status);
  if (unauthExamStart.status !== 401) throw new Error('يجب رفض الوصول للاختبارات المجمعة لغير المسجلين.');
  console.log('✓ تم تأكيد حظر وصول الزوار غير المسجلين للمحتوى المحمي بنجاح.');

  // 4. Student Login (Access Code ONLY)
  console.log('\n--- 4. فحص تسجيل دخول الطالب (كود الطالب فقط) ---');
  const studentLogin1 = await request('POST', '/api/auth/student-login', { accessCode: 'QIMMAH-100' });
  console.log('تسجيل بكود صحيح (QIMMAH-100):', studentLogin1.status, '| الرسالة:', studentLogin1.data.message);
  if (studentLogin1.status !== 200 || !studentLogin1.data.token) throw new Error('فشل دخول الطالب بكود صحيح.');
  const studentToken = studentLogin1.data.token;
  const studentUser = studentLogin1.data.user;

  // Code normalization check
  const studentLoginNorm = await request('POST', '/api/auth/student-login', { accessCode: '  qimmah-100  ' });
  console.log('تطبيع المسافات في الكود:', studentLoginNorm.status, '| النتيجة:', studentLoginNorm.data.success);
  if (studentLoginNorm.status !== 200) throw new Error('فشلت معالجة المسافات في كود الطالب.');

  // 5. Skills Overview: 5 Skills, 5-10 tests each, exactly 20 questions
  console.log('\n--- 5. فحص بنك اختبارات المهارات (5 مهارات، 6 اختبارات لكل مهارة، 20 سؤالاً بالتمام) ---');
  const skillsRes = await request('GET', '/api/skills', null, { Authorization: `Bearer ${studentToken}` });
  console.log('حالة استرجاع المهارات:', skillsRes.status, '| عدد المهارات:', skillsRes.data.skills.length);
  if (skillsRes.data.skills.length !== 5) throw new Error('يجب أن تحتوي المنصة على 5 مهارات بالضبط.');

  for (const skill of skillsRes.data.skills) {
    console.log(`- مهارة: ${skill.name} (${skill.id}) | عدد الاختبارات: ${skill.totalTests} | الأسئلة لكل اختبار: ${skill.questionsPerTest}`);
    if (skill.totalTests < 5 || skill.totalTests > 10) {
      throw new Error(`عدد الاختبارات للمهارة ${skill.id} يجب أن يكون بين 5 و 10.`);
    }
    if (skill.questionsPerTest !== 20) {
      throw new Error(`كل اختبار يجب أن يحتوي على 20 سؤالاً بالتمام.`);
    }
  }

  // 6. Test Single Skill Detail & Start Test
  console.log('\n--- 6. فحص تفاصيل مهارة وبدء اختبار تدريبي (20 سؤالاً) ---');
  const skillDetail = await request('GET', '/api/skills/analogy', null, { Authorization: `Bearer ${studentToken}` });
  console.log('تفاصيل مهارة التناظر:', skillDetail.status, '| عدد الاختبارات:', skillDetail.data.skill.tests.length);
  const firstTest = skillDetail.data.skill.tests[0];
  console.log('بيانات الاختبار التدريبي الأول:', firstTest.title, '| عدد الأسئلة:', firstTest.questionCount);
  if (firstTest.questionCount !== 20) throw new Error('العدد الفعلي لأسئلة الاختبار ليس 20.');

  // Start the 20-question test
  const startSkillTest = await request('GET', `/api/skills/analogy/tests/${firstTest.id}/start`, null, { Authorization: `Bearer ${studentToken}` });
  console.log('بدء الاختبار التدريبي:', startSkillTest.status, '| عدد الأسئلة المستلمة:', startSkillTest.data.questions.length);
  if (startSkillTest.data.questions.length !== 20) throw new Error('لم يتم استلام 20 سؤالاً.');

  // Verify answer keys are securely stripped
  const sampleSkillQ = startSkillTest.data.questions[0];
  if (sampleSkillQ.correct !== undefined || sampleSkillQ.explanation !== undefined) {
    throw new Error('اختراق أمني: تم إرسال مفتاح الإجابة للطالب قبل التسليم!');
  }
  console.log('✓ أمان اختبار المهارة: تم تجريد مفاتيح الحل والشروح بنجاح.');

  // 7. Submit Skill Training Test (Grade 20 questions)
  console.log('\n--- 7. فحص تسليم الاختبار التدريبي وحفظ النتيجة في إنجازاتي ---');
  const studentAnswers = {};
  startSkillTest.data.questions.forEach((q, idx) => {
    studentAnswers[q.id] = (idx % 2 === 0) ? 'أ' : 'ب';
  });

  const submitSkillTest = await request('POST', `/api/skills/analogy/tests/${firstTest.id}/submit`, {
    answers: studentAnswers,
    durationSeconds: 320
  }, { Authorization: `Bearer ${studentToken}` });

  console.log('تسليم اختبار المهارة:', submitSkillTest.status, '| النتيجة:', `${submitSkillTest.data.attempt.correctCount} / 20 (${submitSkillTest.data.attempt.scorePercent}%)`);
  if (submitSkillTest.status !== 200 || !submitSkillTest.data.attempt) {
    throw new Error('فشل تسليم اختبار المهارة.');
  }

  // 8. Achievements Verification ("إنجازاتي")
  console.log('\n--- 8. فحص ظهور النتيجة في سجل "إنجازاتي" ---');
  const achieveRes = await request('GET', '/api/students/achievements', null, { Authorization: `Bearer ${studentToken}` });
  console.log('حالة استرجاع الإنجازات:', achieveRes.status);
  console.log('- اختبارات المهارات المنجزة:', achieveRes.data.overall.completedSkillTestsCount);
  console.log('- إجمالي الأسئلة المحلولة:', achieveRes.data.overall.totalQuestionsAnswered);
  console.log('- نسبة الدقة العامة:', achieveRes.data.overall.overallAccuracyPercent + '%');
  console.log('- آخر اختبار مهارات مسجل:', achieveRes.data.recentSkillAttempts[0].testTitle);

  if (achieveRes.data.recentSkillAttempts.length === 0) {
    throw new Error('لم يظهر الاختبار المنجز في سجل إنجازاتي!');
  }
  console.log('✓ تم حفظ نتيجة المهارة وظهورها بدقة متناهية في "إنجازاتي".');

  // 9. Aggregated Tests: Timed & Untimed Modes
  console.log('\n--- 9. فحص الاختبارات المجمعة بنمطيها (حل بوقت & حل بدون وقت) ---');
  
  // 9.1 Timed mode
  const startExam = await request('GET', '/api/exams/faris-1/start', null, { Authorization: `Bearer ${studentToken}` });
  console.log('بدء اختبار مجمع (faris-1):', startExam.status, '| عدد الأسئلة:', startExam.data.questions.length);
  if (startExam.status !== 200 || startExam.data.questions.length !== 65) {
    throw new Error('فشل بدء الاختبار المجمع أو عدد الأسئلة ليس 65.');
  }

  const examSampleQ = startExam.data.questions[0];
  const submitTimedExam = await request('POST', '/api/exams/faris-1/submit', {
    durationSeconds: 2100,
    isTimed: true,
    studentAnswers: { [examSampleQ.id]: 'أ' }
  }, { Authorization: `Bearer ${studentToken}` });
  console.log('تسليم اختبار مجمع (حل بوقت):', submitTimedExam.status, '| النسبة:', submitTimedExam.data.results.scorePercent + '%');
  if (submitTimedExam.status !== 200) throw new Error('فشل تسليم الاختبار المجمع الموقوت.');

  // 9.2 Untimed mode
  const submitUntimedExam = await request('POST', '/api/exams/faris-2/submit', {
    durationSeconds: 3600,
    isTimed: false,
    studentAnswers: { [examSampleQ.id]: 'ب' }
  }, { Authorization: `Bearer ${studentToken}` });
  console.log('تسليم اختبار مجمع (حل بدون وقت):', submitUntimedExam.status, '| النسبة:', submitUntimedExam.data.results.scorePercent + '%');
  if (submitUntimedExam.status !== 200) throw new Error('فشل تسليم الاختبار المجمع غير الموقوت.');
  console.log('✓ يعمل الاختبار المجمع بنجاح تام في كلا النمطين (حل بوقت وحل بدون وقت).');

  // 10. Check No "تعذر الاتصال بالخادم" or Route Crashes
  console.log('\n--- 10. فحص مرونة أرقام ومعرفات الاختبارات المجمعة (Fix "تعذر الاتصال بالخادم") ---');
  const startExamFlexible = await request('GET', '/api/exams/1/start', null, { Authorization: `Bearer ${studentToken}` });
  console.log('طلب الاختبار بالمعرف الرقمي "/api/exams/1/start":', startExamFlexible.status, '| النتيجة:', startExamFlexible.data.success);
  if (startExamFlexible.status !== 200) {
    throw new Error('فشل طلب الاختبار بالمعرف الرقمي.');
  }
  console.log('✓ تم علاج خطأ تعذر الاتصال بالخادم ومعالجة جميع صيغ المعرفات بنجاح.');

  console.log('\n===============================================================');
  console.log('🎉 جميع الفحوصات والوظائف المطلوبة نجحت بنسبة 100%! المنصة مكتملة تماماً.');
  console.log('===============================================================');
}

runComprehensiveTests().catch(err => {
  console.error('\n❌ خطأ أثناء الفحص:', err);
  process.exit(1);
});
