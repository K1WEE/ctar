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
    th: 'เราจะวัดแรงกดของคุณโดยให้คุณ<strong>บีบ 3 ครั้ง</strong><br><br>แต่ละครั้งจะใช้เวลา 5 วินาที ตามด้วยพัก 5 วินาที เราจะใช้ค่าเฉลี่ยเพื่อตั้งระดับความยากของเกม',
    en: 'We will measure your strength by asking you to squeeze as hard as you can <strong>3 times</strong>.<br><br>Each squeeze will last 5 seconds, followed by a 5-second rest. We will average your results to set the game difficulty.'
  },
  'calibrate.start': { th: 'เริ่มปรับตั้งค่า', en: 'Start Calibration' },
  'calibrate.round': { th: 'รอบที่', en: 'Round' },
  'calibrate.of': { th: 'จาก', en: 'of' },
  'calibrate.squeeze': { th: 'บีบให้แรงที่สุด!', en: 'SQUEEZE AS HARD AS YOU CAN!' },
  'calibrate.rest': { th: 'พักผ่อน...', en: 'REST AND RELAX...' },
  'calibrate.complete': { th: 'ปรับตั้งค่าเสร็จสิ้น! 🎉', en: 'Calibration Complete! 🎉' },
  'calibrate.avgForce': { th: 'แรงกดเฉลี่ยสูงสุด:', en: 'Average Max Force:' },
  'calibrate.adjusting': { th: 'กำลังปรับระดับเกม...', en: 'Adjusting game difficulty...' },
  'calibrate.current': { th: 'ปัจจุบัน:', en: 'Current:' },

  // ─── Game ───
  'game.activeSession': { th: 'กำลังฝึก', en: 'Active Session' },
  'game.targetReps': { th: 'เป้าหมาย:', en: 'Target Reps:' },
  'game.finish': { th: 'จบการฝึก', en: 'Finish Session' },

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
  'detail.forceCurve': { th: 'กราฟแรงบีบ', en: 'Force Curve' },
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
