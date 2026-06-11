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

  // ─── Register ───
  'register.title': { th: 'สร้างบัญชี', en: 'Create Account' },
  'register.subtitle': { th: 'สมัครใช้งาน CTAR', en: 'Join CTAR platform' },
  'register.firstName': { th: 'ชื่อ', en: 'First Name' },
  'register.lastName': { th: 'นามสกุล', en: 'Last Name' },
  'register.submit': { th: 'สร้างบัญชี', en: 'Sign Up' },
  'register.loading': { th: 'กำลังสร้างบัญชี...', en: 'Creating Account...' },
  'register.hasAccount': { th: 'มีบัญชีแล้ว?', en: 'Already have an account?' },
  'register.signIn': { th: 'เข้าสู่ระบบ', en: 'Sign In' },

  // ─── Header ───
  'header.title': { th: 'CTAR Dashboard', en: 'CTAR Dashboard' },
  'header.subtitle': { th: 'ระบบ IoT ทางการแพทย์', en: 'Medical IoT System' },
  'header.logout': { th: 'ออกจากระบบ', en: 'Logout' },

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
  'calibrate.complete': { th: 'ปรับตั้งค่าเสร็จสิ้น! 🎉', en: 'Calibration Complete! 🎉' },
  'calibrate.avgForce': { th: 'แรงกดสูงสุด:', en: 'Peak Force:' },
  'calibrate.hint': { th: 'กดค้างไว้ให้เต็มแรง แล้วปล่อยเพื่อเสร็จสิ้น', en: 'Press and hold to peak, then release to finish' },
  'calibrate.adjusting': { th: 'กำลังปรับระดับเกม...', en: 'Adjusting game difficulty...' },
  'calibrate.current': { th: 'ปัจจุบัน:', en: 'Current:' },

  // ─── Game ───
  'game.activeSession': { th: 'กำลังฝึก', en: 'Active Session' },
  'game.targetReps': { th: 'เป้าหมาย:', en: 'Target Reps:' },
  'game.finish': { th: 'จบการฝึก', en: 'Finish Session' },
  'game.feedback.squeeze': { th: 'กดและค้างลูกโป่งให้อยู่ในโซนเป้าหมาย...', en: 'Press and hold the balloon in the target zone...' },
  'game.feedback.hold': { th: 'นิ่งไว้! รักษาตำแหน่ง...', en: 'Perfect! Keep steady.' },
  'game.feedback.holdAlmost': { th: 'ค้างไว้อีกนิดเดียว...!', en: 'Hold it right there...!' },
  'game.feedback.tooHard': { th: 'กดแรงเกินไป! ผ่อนแรงลงเล็กน้อย...', en: 'Too hard! Relax slightly...' },
  'game.feedback.release': { th: 'เยี่ยมยอด! ปล่อยแรงกดให้สุดเพื่อจบ Rep...', en: 'Great hold! Release all force to complete rep...' },
  'game.feedback.success': { th: 'สำเร็จแล้ว! 🎉', en: 'Rep Completed! 🎉' },

  // ─── Summary ───
  'summary.title': { th: 'ฝึกเสร็จแล้ว!', en: 'Session Complete!' },
  'summary.subtitle': { th: 'เก่งมาก! คุณฝึกเสร็จเรียบร้อยแล้ว', en: 'Great job completing your therapy session.' },
  'summary.saving': { th: 'กำลังบันทึกผลอย่างปลอดภัย...', en: 'Saving your progress securely...' },
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
  'error.noData': { th: 'ไม่พบข้อมูลการฝึกในรอบนี้', en: 'No data recorded in this session.' },
  'error.loginRequired': { th: 'กรุณาเข้าสู่ระบบก่อนบันทึก', en: 'You must be logged in to save.' },
  'register.error.firstName': { th: 'กรุณากรอกชื่อจริง', en: 'First name is required' },
  'register.error.lastName': { th: 'กรุณากรอกนามสกุล', en: 'Last name is required' },
  'register.error.email': { th: 'กรุณากรอกอีเมล', en: 'Email is required' },
  'register.error.passwordRequired': { th: 'กรุณากรอกรหัสผ่าน', en: 'Password is required' },
  'register.error.passwordLength': { th: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', en: 'Password must be at least 6 characters' },
  'register.error.passwordComplexity': { th: 'รหัสผ่านต้องมีอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข (เช่น Ctar1234)', en: 'Password must contain uppercase, lowercase, and numbers (e.g. Ctar1234)' },

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
      localStorage.setItem('lang', this.currentLang());
    });
  }

  toggleLang() {
    this.currentLang.update(lang => lang === 'th' ? 'en' : 'th');
  }

  t(key: string): string {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[this.currentLang()] || entry['en'] || key;
  }
}
