import { Injectable, signal, effect, computed } from '@angular/core';

export type Lang = 'th' | 'en';

const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // ─── Login ───
  'login.welcome': { th: 'ยินดีต้อนรับ', en: 'Welcome Back' },
  'login.subtitle': { th: 'เข้าสู่ระบบบัญชี CTAR ของคุณ', en: 'Sign in to your CTAR account' },
  'login.email': { th: 'อีเมล', en: 'Email Address' },
  'login.password': { th: 'รหัสผ่าน', en: 'Password' },
  'login.submit': { th: 'เข้าสู่ระบบ', en: 'Sign In' },
  'login.loading': { th: 'กำลังเข้าสู่ระบบ...', en: 'Signing in...' },
  'login.noAccount': { th: 'ยังไม่มีบัญชี?', en: "Don't have an account?" },
  'login.createOne': { th: 'สร้างบัญชีใหม่', en: 'Create one' },
  'login.forgotPassword': { th: 'ลืมรหัสผ่าน?', en: 'Forgot Password?' },
  'forgot.title': { th: 'ลืมรหัสผ่าน', en: 'Forgot Password' },
  'forgot.subtitle': { th: 'กรุณากรอกอีเมลของคุณเพื่อรับลิงก์กู้คืนรหัสผ่าน', en: 'Enter your email address to receive a password reset link' },
  'forgot.submit': { th: 'ส่งอีเมลกู้คืนรหัสผ่าน', en: 'Send Reset Link' },
  'forgot.back': { th: 'กลับไปหน้าเข้าสู่ระบบ', en: 'Back to Login' },
  'forgot.success': { th: 'ส่งลิงก์กู้คืนรหัสผ่านสำเร็จแล้ว! กรุณาตรวจสอบกล่องจดหมายของคุณ', en: 'Password reset link sent! Please check your email inbox.' },
  'reset.title': { th: 'ตั้งรหัสผ่านใหม่', en: 'Reset Password' },
  'reset.subtitle': { th: 'กรุณากรอกรหัสผ่านใหม่สำหรับบัญชีของคุณ', en: 'Please enter a new password for your account' },
  'reset.newPassword': { th: 'รหัสผ่านใหม่', en: 'New Password' },
  'reset.confirmPassword': { th: 'ยืนยันรหัสผ่านใหม่', en: 'Confirm New Password' },
  'reset.submit': { th: 'บันทึกรหัสผ่านใหม่', en: 'Update Password' },
  'reset.success': { th: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว! กำลังนำคุณไปที่หน้าหลัก...', en: 'Password updated successfully! Redirecting...' },
  'reset.error.match': { th: 'รหัสผ่านไม่ตรงกัน', en: 'Passwords do not match' },

  // ─── Register ───
  'register.title': { th: 'สร้างบัญชี', en: 'Create Account' },
  'register.subtitle': { th: 'สมัครใช้งาน CTAR', en: 'Join CTAR platform' },
  'register.firstName': { th: 'ชื่อ', en: 'First Name' },
  'register.lastName': { th: 'นามสกุล', en: 'Last Name' },
  'register.submit': { th: 'สร้างบัญชี', en: 'Sign Up' },
  'register.loading': { th: 'กำลังสร้างบัญชี...', en: 'Creating Account...' },
  'register.confirmEmail': { th: 'สร้างบัญชีแล้ว กรุณาตรวจสอบอีเมลและกดยืนยันก่อนเข้าสู่ระบบ', en: 'Your account was created. Please check your email and confirm your address before signing in.' },
  'register.hasAccount': { th: 'มีบัญชีแล้ว?', en: 'Already have an account?' },
  'register.signIn': { th: 'เข้าสู่ระบบ', en: 'Sign In' },

  // ─── Header ───
  'header.title': { th: 'CTAR Dashboard', en: 'CTAR Dashboard' },
  'header.subtitle': { th: 'ระบบ IoT ทางการแพทย์', en: 'Medical IoT System' },
  'header.logout': { th: 'ออกจากระบบ', en: 'Logout' },
  'header.openMenu': { th: 'เปิดเมนู', en: 'Open menu' },
  'header.closeMenu': { th: 'ปิดเมนู', en: 'Close menu' },
  'header.lightMode': { th: 'โหมดสว่าง', en: 'Light mode' },
  'header.darkMode': { th: 'โหมดมืด', en: 'Dark mode' },

  // ─── Accessibility ───
  'accessibility.fontSize': { th: 'ขนาดตัวอักษร', en: 'Font size' },
  'accessibility.fontSizeNormal': { th: 'ปกติ', en: 'Normal' },
  'accessibility.fontSizeLarge': { th: 'ใหญ่', en: 'Large' },
  'accessibility.fontSizeXLarge': { th: 'ใหญ่มาก', en: 'Extra large' },
  'accessibility.fontSizeNext': { th: 'กดเพื่อเปลี่ยนเป็น{0}', en: 'Press to change to {0}' },
  'accessibility.fontSizeApplied': { th: 'ใช้ขนาดตัวอักษร{0}แล้ว', en: 'Font size set to {0}' },
  'accessibility.showPassword': { th: 'แสดงรหัสผ่าน', en: 'Show password' },
  'accessibility.hidePassword': { th: 'ซ่อนรหัสผ่าน', en: 'Hide password' },

  // ─── Connect ───
  'connect.title': { th: 'เชื่อมต่ออุปกรณ์', en: 'Connect Device' },
  'connect.subtitle': { th: 'กรุณาเชื่อมต่ออุปกรณ์ CTAR เพื่อเริ่มการฝึก', en: 'Please connect your CTAR hardware to begin your therapy session.' },
  'connect.btnConnect': { th: 'เชื่อมต่อผ่าน Bluetooth', en: 'Connect via Bluetooth' },
  'connect.btnSimulate': { th: 'จำลองอุปกรณ์ (สำหรับทดสอบ)', en: 'Simulate Device (Dev Mode)' },
  'connect.connected': { th: 'เชื่อมต่อแล้ว!', en: 'Connected!' },

  // ─── Calibrate ───
  'calibrate.title': { th: 'ปรับตั้งค่าเครื่อง', en: 'Calibration Phase' },
  'calibrate.intro': {
    th: 'เราจะวัดแรงกดของคุณโดยให้คุณ<strong>กดเต็มแรง 1 ครั้งและปล่อย</strong><br><br>เราจะนำค่าแรงกดสูงสุดนี้ไปใช้ตั้งค่าระดับความยากของเกมให้เหมาะสมกับคุณ',
    en: 'We will measure your strength by asking you to <strong>press as hard as you can once and release</strong>.<br><br>We will use this peak force to set the game difficulty.'
  },
  'calibrate.start': { th: 'เริ่มปรับตั้งค่า', en: 'Start Calibration' },
  'calibrate.round': { th: 'รอบที่', en: 'Round' },
  'calibrate.of': { th: 'จาก', en: 'of' },
  'calibrate.squeeze': { th: 'กดให้แรงที่สุด!', en: 'PRESS AS HARD AS YOU CAN!' },
  'calibrate.rest': { th: 'พักผ่อน...', en: 'REST AND RELAX...' },
  'calibrate.complete': { th: 'ปรับตั้งค่าเสร็จสิ้น!', en: 'Calibration Complete!' },
  'calibrate.avgForce': { th: 'แรงกดสูงสุด:', en: 'Peak Force:' },
  'calibrate.hint': { th: 'กดค้างไว้ให้เต็มแรง แล้วปล่อยเพื่อเสร็จสิ้น', en: 'Press and hold to peak, then release to finish' },
  'calibrate.adjusting': { th: 'กำลังปรับระดับเกม...', en: 'Adjusting game difficulty...' },
  'calibrate.current': { th: 'ปัจจุบัน:', en: 'Current:' },

  // ─── Game ───
  'game.activeSession': { th: 'กำลังฝึก', en: 'Active Session' },
  'game.targetReps': { th: 'เป้าหมาย:', en: 'Target Reps:' },
  'game.finish': { th: 'จบการฝึก', en: 'Finish Session' },
  'game.start.title': { th: 'พร้อมเริ่มการฝึกหรือยัง?', en: 'Ready to start training?' },
  'game.start.instructions': { th: 'ทำตาม 3 ขั้นตอนนี้ แล้วค่อยกดปุ่มพร้อมเริ่ม', en: 'Follow these three steps, then tap when you are ready.' },
  'game.start.step1': { th: 'วางคางบนอุปกรณ์ให้สบาย', en: 'Rest your chin comfortably on the device' },
  'game.start.step2': { th: 'กดให้ลูกโป่งเข้าโซนเป้าหมาย', en: 'Press until the balloon reaches the target zone' },
  'game.start.step3': { th: 'ค้างไว้ แล้วผ่อนแรงเมื่อระบบบอก', en: 'Hold steady, then relax when prompted' },
  'game.start.button': { th: 'พร้อมเริ่ม', en: 'I’m ready to start' },
  'game.countdown.three': { th: 'จัดท่าให้พร้อม', en: 'Get into position' },
  'game.countdown.two': { th: 'ปล่อยแรงก่อน', en: 'Relax your force' },
  'game.countdown.one': { th: 'เตรียมกดตามคำสั่ง', en: 'Get ready to press' },
  'game.feedback.squeeze': { th: 'กดและค้างลูกโป่งให้อยู่ในโซนเป้าหมาย...', en: 'Press and hold the balloon in the target zone...' },
  'game.feedback.hold': { th: 'นิ่งไว้! รักษาตำแหน่ง...', en: 'Perfect! Keep steady.' },
  'game.feedback.holdAlmost': { th: 'ค้างไว้อีกนิดค่ะ', en: 'Hold on a little longer' },
  'game.feedback.tooHard': { th: 'กดแรงเกินไป! ผ่อนแรงลงเล็กน้อย...', en: 'Too hard! Relax slightly...' },
  'game.feedback.release': { th: 'เยี่ยมยอด! ปล่อยแรงกดให้สุดเพื่อจบ Rep...', en: 'Great hold! Release all force to complete rep...' },
  'game.feedback.success': { th: 'สำเร็จแล้ว!', en: 'Rep Completed!' },
  // Cue lines below are the exact sentences of the Thai voice clips (see zen-balloon-voice.ts).
  'game.voice.intro': { th: 'พร้อมแล้ว เตรียมเริ่มกัน', en: 'Ready, let us begin' },
  'game.feedback.squeeze1': { th: 'ค่อยๆ เพิ่มแรงอีกนิด', en: 'Gently add a little more force' },
  'game.feedback.squeeze2': { th: 'เริ่มได้ดี กดต่ออีกเล็กน้อย', en: 'Good start, press a little more' },
  'game.feedback.squeeze3': { th: 'กดให้ลูกโป่งลอยขึ้นอีกนิด', en: 'Press a little more to lift the balloon' },
  'game.feedback.squeeze4': { th: 'ค่อยๆ กดต่อ ทำได้ดีมาก', en: 'Keep pressing gently, you are doing well' },
  'game.feedback.hold1': { th: 'ดีมาก ค้างไว้ค่ะ', en: 'Very good, hold it there' },
  'game.feedback.tooHard1': { th: 'แรงไปนิดนึง ผ่อนลงหน่อยค่ะ', en: 'A little too hard, ease off a bit' },
  'game.feedback.release1': { th: 'เยี่ยมมากค่ะ ปล่อยสบายๆ ได้เลยค่ะ', en: 'Excellent, you can relax and let go' },
  'game.feedback.restWarning': { th: 'อย่าเพิ่งออกแรงนะคะ ปล่อยคางสบายๆ ก่อน', en: 'Do not press yet, relax your chin first' },
  'game.feedback.success1': { th: 'สำเร็จหนึ่งครั้ง เก่งมากค่ะ', en: 'One rep done, great job' },
  'game.feedback.success2': { th: 'เยี่ยมมากค่ะ', en: 'Excellent!' },
  'game.feedback.success3': { th: 'ทำได้ดีมาก', en: 'Very well done' },
  'game.feedback.success4': { th: 'เก่งมาก คุณรักษาแรงได้ดี', en: 'Great job, you kept the force steady' },
  // Praise-star words: the short form of the matching success line above.
  'game.praise.1': { th: 'สำเร็จ!', en: 'Done!' },
  'game.praise.2': { th: 'เยี่ยมมาก!', en: 'Excellent!' },
  'game.praise.3': { th: 'ดีมาก!', en: 'Well done!' },
  'game.praise.4': { th: 'เก่งมาก!', en: 'Great job!' },

  // ─── Summary ───
  'summary.title': { th: 'ฝึกเสร็จแล้ว!', en: 'Session Complete!' },
  'summary.subtitle': { th: 'เก่งมาก! คุณฝึกเสร็จเรียบร้อยแล้ว', en: 'Great job completing your therapy session.' },
  'summary.saving': { th: 'กำลังบันทึกผลอย่างปลอดภัย...', en: 'Saving your progress securely...' },
  'game.sessionComplete': { th: 'ฝึกครบแล้ว พักได้เลย', en: 'Training complete. You can relax.' },
  'summary.duration': { th: 'ระยะเวลา', en: 'Duration' },
  'summary.reps': { th: 'จำนวนครั้ง', en: 'Total Reps' },
  'summary.peakForce': { th: 'แรงกดสูงสุด', en: 'Peak Force' },
  'summary.done': { th: 'เสร็จสิ้น', en: 'Done for today' },
  'summary.noChange': { th: 'ไม่เปลี่ยนแปลง', en: 'No change' },

  // ─── Errors ───
  'error.title': { th: 'เกิดข้อผิดพลาด', en: 'Error' },
  'error.bleNotSupported': { th: 'เบราว์เซอร์นี้ไม่รองรับ Bluetooth\nกรุณาใช้ Chrome บน Android', en: 'Web Bluetooth API is not supported in this browser.' },
  'error.connectionFailed': { th: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', en: 'Connection failed. Please try again.' },
  'error.userCancelled': { th: 'ยกเลิกการเชื่อมต่อ', en: 'Connection cancelled by user.' },
  'error.saveFailed': { th: 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่', en: 'Failed to save session data to cloud.' },
  'summary.savedOffline': { th: 'บันทึกข้อมูลในเครื่องเรียบร้อยแล้ว (ระบบจะส่งขึ้นคลาวด์อัตโนมัติเมื่อมีอินเทอร์เน็ต)', en: 'Session saved on this device. It will automatically sync to the cloud when online.' },
  'summary.syncing': { th: 'กำลังซิงค์ข้อมูล...', en: 'Syncing data...' },
  'summary.missions': { th: 'ภารกิจประจำสัปดาห์', en: 'Weekly missions' },
  'summary.missionComplete': { th: 'ภารกิจสำเร็จ!', en: 'Mission complete!' },
  'summary.starsEarned': { th: 'ได้รับ {0} ดาว', en: 'Earned {0} stars' },
  'portal.pendingSync': { th: 'มีข้อมูลรอส่งขึ้นคลาวด์ {0} รายการ', en: '{0} session(s) waiting to sync' },
  'error.noData': { th: 'ไม่พบข้อมูลการฝึกในรอบนี้', en: 'No data recorded in this session.' },
  'error.loginRequired': { th: 'กรุณาเข้าสู่ระบบก่อนบันทึก', en: 'You must be logged in to save.' },
  'error.invalidCredentials': { th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', en: 'The email or password is incorrect. Please try again.' },
  'error.emailInUse': { th: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ', en: 'This email is already registered. Try another email or sign in.' },
  'error.network': { th: 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาตรวจสอบสัญญาณแล้วลองใหม่', en: 'Unable to connect. Check your internet connection and try again.' },
  'error.generic': { th: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', en: 'Something went wrong. Please try again.' },
  'error.invalidResetSession': { th: 'ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ตั้งรหัสผ่านใหม่', en: 'This reset link is expired or invalid. Request a new password reset link.' },
  'register.error.firstName': { th: 'กรุณากรอกชื่อจริง', en: 'First name is required' },
  'register.error.lastName': { th: 'กรุณากรอกนามสกุล', en: 'Last name is required' },
  'register.error.email': { th: 'กรุณากรอกอีเมล', en: 'Email is required' },
  'register.error.passwordRequired': { th: 'กรุณากรอกรหัสผ่าน', en: 'Password is required' },
  'register.error.passwordLength': { th: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', en: 'Password must be at least 6 characters' },
  'register.error.passwordComplexity': { th: 'รหัสผ่านต้องมีอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข (เช่น Ctar1234)', en: 'Password must contain uppercase, lowercase, and numbers (e.g. Ctar1234)' },
  'register.successTitle': { th: 'สร้างบัญชีเรียบร้อย', en: 'Account created' },
  'register.successBody': { th: 'เราส่งลิงก์ยืนยันไปที่ {email} แล้ว กรุณาเปิดอีเมลและกดลิงก์ก่อนเข้าสู่ระบบ', en: 'We sent a confirmation link to {email}. Open the email and tap the link before signing in.' },
  'register.goToLogin': { th: 'ไปหน้าเข้าสู่ระบบ', en: 'Go to sign in' },
  'reset.error.confirmRequired': { th: 'กรุณากรอกรหัสผ่านอีกครั้ง', en: 'Please re-enter your password' },
  'reset.requestNewLink': { th: 'ขอลิงก์ใหม่', en: 'Request a new link' },
  'reset.validating': { th: 'กำลังตรวจสอบลิงก์...', en: 'Checking your link...' },
  'auth.error.emailInvalid': { th: 'รูปแบบอีเมลไม่ถูกต้อง (ตัวอย่าง: name@example.com)', en: 'Invalid email format (e.g. name@example.com)' },
  'error.emailNotConfirmed': { th: 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาเปิดอีเมลแล้วกดลิงก์ยืนยัน', en: 'This account has not confirmed its email yet. Open your email and tap the confirmation link.' },
  'auth.placeholder.password': { th: 'กรอกรหัสผ่าน', en: 'Enter password' },
  'auth.placeholder.firstName': { th: 'เช่น สมชาย', en: 'e.g. John' },
  'auth.placeholder.lastName': { th: 'เช่น ใจดี', en: 'e.g. Smith' },
  'auth.rule.title': { th: 'รหัสผ่านต้องมี:', en: 'Your password needs:' },
  'auth.rule.length': { th: 'อย่างน้อย 6 ตัวอักษร', en: 'At least 6 characters' },
  'auth.rule.case': { th: 'ตัวพิมพ์ใหญ่และตัวพิมพ์เล็ก (A-Z, a-z)', en: 'Upper and lower case letters (A-Z, a-z)' },
  'auth.rule.digit': { th: 'ตัวเลขอย่างน้อย 1 ตัว (0-9)', en: 'At least one number (0-9)' },
  'auth.rule.met': { th: '(ผ่านแล้ว)', en: '(done)' },
  'auth.rule.unmet': { th: '(ยังไม่ผ่าน)', en: '(not yet)' },

  // ─── Dashboard / Navigation ───
  'nav.clinicRecords': { th: 'บันทึกทางคลินิก', en: 'Clinical Records' },
  'nav.classicDashboard': { th: 'แดชบอร์ดคลาสสิก', en: 'Classic Dashboard' },
  'nav.gameFlow': { th: 'เริ่มเกม', en: 'Game Flow' },

  // ─── Clinic Dashboard ───
  'clinic.title': { th: 'รายชื่อผู้ป่วย', en: 'Patient Directory' },
  'clinic.subtitle': { th: 'ระบบจัดการข้อมูลผู้ป่วย CTAR', en: 'CTAR Patient Management System' },
  'clinic.totalPatients': { th: 'จำนวนผู้ป่วยทั้งหมด', en: 'Total Patients' },
  'clinic.totalSessions': { th: 'จำนวน Session ทั้งหมด', en: 'Total Sessions' },
  'clinic.search': { th: 'ค้นหาผู้ป่วย...', en: 'Search patients...' },
  'clinic.sessions': { th: 'ครั้ง', en: 'sessions' },
  'clinic.lastSession': { th: 'ฝึกล่าสุด:', en: 'Last session:' },
  'clinic.noSessions': { th: 'ยังไม่มีการฝึก', en: 'No sessions yet' },
  'clinic.viewDetails': { th: 'ดูรายละเอียด', en: 'View Details' },
  'clinic.noPatients': { th: 'ยังไม่มีข้อมูลผู้ป่วย', en: 'No patient data found' },
  'clinic.refresh': { th: 'โหลดใหม่', en: 'Refresh Data' },

  // ─── Patient Detail ───
  'detail.title': { th: 'ข้อมูลผู้ป่วย', en: 'Patient Details' },
  'detail.back': { th: 'กลับ', en: 'Back' },
  'detail.profile': { th: 'ข้อมูลส่วนตัว', en: 'Profile' },
  'detail.sessionHistory': { th: 'ประวัติการฝึก', en: 'Session History' },
  'detail.progressTrend': { th: 'พัฒนาการ', en: 'Progress Trend' },
  'detail.date': { th: 'วันที่', en: 'Date' },
  'detail.maxForce': { th: 'แรงกดสูงสุด', en: 'Max Force' },
  'detail.avgForce': { th: 'แรงกดเฉลี่ย', en: 'Avg Force' },
  'detail.reps': { th: 'จำนวนครั้ง', en: 'Reps' },
  'detail.duration': { th: 'ระยะเวลา', en: 'Duration' },
  'detail.actions': { th: 'การดำเนินการ', en: 'Actions' },
  'detail.viewChart': { th: 'ดูกราฟ', en: 'View' },
  'detail.downloadCSV': { th: 'ดาวน์โหลด', en: 'CSV' },
  'detail.noSessions': { th: 'ยังไม่มีประวัติการฝึก', en: 'No session history found' },
  'detail.registered': { th: 'ลงทะเบียนเมื่อ', en: 'Registered' },
  'detail.day': { th: 'วัน', en: 'Day' },
  'detail.week': { th: 'สัปดาห์', en: 'Week' },
  'detail.month': { th: 'เดือน', en: 'Month' },
  'detail.compareDay': { th: 'เทียบครั้งก่อน', en: 'vs Prev Day' },
  'detail.compareWeek': { th: 'เทียบสัปดาห์ก่อน', en: 'vs Prev Week' },
  'detail.compareMonth': { th: 'เทียบเดือนก่อน', en: 'vs Prev Month' },
  'detail.forceCurve': { th: 'กราฟแรงกด', en: 'Force Curve' },
  'detail.noRawData': { th: 'ไม่พบข้อมูลกราฟดิบสำหรับการฝึกนี้', en: 'No raw data found for this session.' },
  'pagination.show': { th: 'แสดง', en: 'Show' },
  'pagination.entries': { th: 'รายการ', en: 'entries' },
  'pagination.showing': { th: 'แสดง', en: 'Showing' },
  'pagination.to': { th: 'ถึง', en: 'to' },
  'pagination.of': { th: 'จากทั้งหมด', en: 'of' },
  'pagination.previous': { th: 'ก่อนหน้า', en: 'Previous' },
  'pagination.next': { th: 'ถัดไป', en: 'Next' },
  
  // ─── Patient Portal ───
  'portal.welcome': { th: 'สวัสดี', en: 'Hello' },
  'portal.ready': { th: 'พร้อมที่จะเริ่มฝึกกล้ามเนื้อการกลืนของคุณหรือยัง?', en: 'Ready to start your swallowing muscle training?' },
  'portal.startSession': { th: 'เริ่มการฝึก CTAR', en: 'Start CTAR Session' },
  'portal.startDesc': { th: 'เชื่อมต่ออุปกรณ์และทำภารกิจของคุณวันนี้', en: 'Connect device and complete your daily task' },
  'portal.startBtn': { th: 'เริ่มเลย', en: 'Start Now' },
  'portal.statsTitle': { th: 'สถิติล่าสุดของคุณ', en: 'Your Latest Stats' },
  'portal.noStats': { th: 'ยังไม่มีข้อมูลการฝึก', en: 'No session data yet' },

  // ─── Onboarding / Chin Tuck Demo ───
  'onboarding.step1': { th: 'วางเครื่องมือไว้บนอก', en: 'Place the device on your chest' },
  'onboarding.step2': { th: 'วางคางลงบนแผ่นรองด้านบน', en: 'Rest your chin on the top pad' },
  'onboarding.step3': { th: 'ก้มคางกดลงให้แรงที่สุด แล้วปล่อย', en: 'Press your chin down as hard as you can, then release' },

  // ─── Calibrate (Updated) ───
  'calibrate.intro.updated': {
    th: 'วางเครื่องมือไว้บนอก แล้ววางคางลงบนแผ่นรองด้านบน<br><br>เมื่อพร้อม ให้<strong>ก้มคางกดลงให้แรงที่สุด แล้วปล่อย</strong>',
    en: 'Place the device on your chest and rest your chin on the top pad.<br><br>When ready, <strong>press your chin down as hard as you can, then release</strong>.'
  },
  'calibrate.waiting.desc': {
    th: 'ก้มคางกดลงบนแผ่นรอง...<br><br>ออกแรงกดให้<strong>มากกว่า 20 N</strong> เพื่อเริ่มจับเวลา',
    en: 'Press your chin down on the top pad...<br><br>Exceed <strong>20 N</strong> to start the timer.'
  },
  'calibrate.getReady': { th: 'เตรียมตัว...', en: 'Get ready...' },
  'calibrate.goToGame': { th: 'เริ่มเล่นเกม →', en: 'Start Game →' },

  // ─── Connect (Updated) ───
  'connect.continue': { th: 'เชื่อมต่อสำเร็จ! กดเพื่อเริ่มต้น →', en: 'Connected! Tap to continue →' },

  // ─── Game (Zen Balloon) ───
  'game.title': { th: 'ลูกโป่งเซน', en: 'The Zen Balloon' },
  'game.hud.current': { th: 'ปัจจุบัน', en: 'Current' },
  'game.hud.peak': { th: 'สูงสุด', en: 'Peak' },
  'game.hud.goal': { th: 'เป้า:', en: 'Goal:' },
  'game.hud.reps': { th: 'ครั้ง', en: 'Reps' },
  'game.zone.target': { th: 'เป้าหมาย', en: 'Target' },
  'game.zone.rest': { th: 'พักผ่อน', en: 'Rest Zone' },
  'game.hud.holdTimer': { th: 'เวลาค้างแรง', en: 'Hold Timer' },
  'game.hud.releaseStatus': { th: 'ปล่อยแรงกด', en: 'Release Force' },
  'game.feedback.releaseBelow': { th: 'ปล่อยแรงกดเพื่อพักผ่อน...', en: 'Release force to rest...' },
  'game.feedback.keepRelaxed': { th: 'เยี่ยม! ผ่อนคลายอีก {0} วินาที...', en: 'Great! Relax for {0}s...' },
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  public currentLang = signal<Lang>('th');

  constructor() {
    const saved = localStorage.getItem('lang') as Lang;
    if (saved === 'th' || saved === 'en') {
      this.currentLang.set(saved);
    }

    effect(() => {
      const lang = this.currentLang();
      localStorage.setItem('lang', lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    });
  }

  toggleLang() {
    this.currentLang.update(lang => lang === 'th' ? 'en' : 'th');
  }

  setLang(lang: Lang) {
    this.currentLang.set(lang);
  }

  /** The shipped voice pack is Thai; avoid requesting missing English files. */
  voiceLanguage(): Lang | null {
    return this.currentLang() === 'th' ? 'th' : null;
  }

  t(key: string): string {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[this.currentLang()] || entry['en'] || key;
  }
}
