// T7 — Ghép tổng trên bàn (chưa có Wi-Fi/ESP-01): đúng logic điều khiển của app mô phỏng.
// Cần cắm đủ T2 (HC-SR04), T3 (relay), T4 (Water Sensor), T5 (còi), T6 (LCD) cùng lúc.
//
// Thử trên bàn bằng BÀN TAY thay cho mặt nước (tay gần cảm biến = nước cao):
//   - Tay xa / không có tay: mức thấp ≤ 30 % → relay đóng (bơm chạy).
//   - Đưa tay lại gần dần (~5 cm): mức ≥ 85 % → relay nhả. Rút tay ra lại: phải chờ relay nghỉ đủ 5 s mới đóng.
//   - Giữ tay đứng yên khi relay đang đóng 20 s → khóa CHẠY KHÔ (mức không tăng). Đó là đúng.
//   - Chấm nước vào Water Sensor → khóa RÒ RỈ, còi kêu. Rút dây ECHO → khóa LỖI CẢM BIẾN.
//   - Mở khóa: sửa nguyên nhân rồi gõ  r  + Enter trong Serial Monitor (9600), hoặc bấm nút RESET trên Mega.

#include <LiquidCrystal.h>

// ---- Chân (khớp Hồ sơ › Điện & nối dây; LCD cắm thẳng D22–D27) ----
const byte TRIG = 9, ECHO = 10, WS_PWR = 7, WS_SIG = A0, RELAY = 6, BUZZ = 8;
LiquidCrystal lcd(22, 23, 24, 25, 26, 27);
const bool RELAY_ACTIVE_LOW = true;   // module relay kích mức thấp
const bool BUZZ_ACTIVE_LOW = false;   // đổi true nếu còi kêu khi LOW

// ---- Kích thước & ngưỡng (bản chi tiết; bản đơn giản: S 191, 100 % 161, chạy tối đa 146 s) ----
const float S_MM = 193, USABLE_MM = 163;
const int LOW_PCT = 30, HIGH_PCT = 85;
const unsigned long RELAY_MIN_OFF_MS = 5000, MAX_RUN_MS = 178000UL, DRY_WINDOW_MS = 20000;
const float DRY_MIN_RISE_MM = 2;
const int WS_WET = 300;

enum Lock { L_NONE, L_LEAK, L_SENSOR, L_DRY, L_TIMEOUT };
const char *LOCK_LCD[] = { "", "!! RO RI NUOC", "!! LOI CAM BIEN", "!! BOM CHAY KHO", "!! BOM QUA GIO" };
Lock lockCode = L_NONE;

float buf[5]; byte nBuf = 0, spikes = 0, noEcho = 0;
float filt = -1, levelMm = -1, pct = -1;
bool pump = false; unsigned long pumpOnAt = 0, pumpOffAt = 0;
float riseLog[21]; byte riseN = 0; unsigned long riseT = 0; // mức mỗi giây khi bơm chạy
int wsAdc = 0;

void relay(bool on) { digitalWrite(RELAY, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW); }
void buzz(bool on) { digitalWrite(BUZZ, (on ^ BUZZ_ACTIVE_LOW) ? HIGH : LOW); }

void setPump(bool on, const __FlashStringHelper *why) {
  if (on == pump) return;
  pump = on; relay(on);
  if (on) { pumpOnAt = millis(); riseN = 0; riseT = 0; } else pumpOffAt = millis();
  Serial.print(on ? F("BAT bom - ") : F("TAT bom - ")); Serial.print(why);
  Serial.print(F(" (muc ")); Serial.print(pct, 0); Serial.println(F(" %)"));
}

void lockPump(Lock c, const __FlashStringHelper *msg) {
  if (lockCode != L_NONE) return;
  lockCode = c; setPump(false, F("khoa an toan"));
  Serial.print(F("KHOA: ")); Serial.println(msg);
}

float median5() { float s[5]; for (byte i = 0; i < nBuf; i++) s[i] = buf[i];
  for (byte i = 1; i < nBuf; i++) for (byte j = i; j > 0 && s[j] < s[j - 1]; j--) { float t = s[j]; s[j] = s[j - 1]; s[j - 1] = t; }
  return s[nBuf / 2]; }

// Đọc HC-SR04 mỗi 200 ms: lọc trung vị 5 mẫu, bỏ xung nhảy > 40 mm (chấp nhận nếu lặp 4 lần liền)
void ping() {
  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 30000UL);
  if (us == 0) { if (++noEcho >= 5) lockPump(L_SENSOR, F("Khong co tieng vong 5 lan lien tiep (dut day ECHO/TRIG?)")); return; }
  noEcho = 0;
  float mm = us * 0.343 / 2;
  if (mm < 20 || mm > S_MM + 20) return;                       // ngoài tầm đo: bỏ
  if (filt >= 0 && fabs(mm - filt) > 40) { if (++spikes < 4) return; nBuf = 0; }
  spikes = 0;
  if (nBuf == 5) { for (byte i = 0; i < 4; i++) buf[i] = buf[i + 1]; nBuf = 4; }
  buf[nBuf++] = mm;
  filt = median5();
  levelMm = constrain(S_MM - filt, 0, S_MM);
  pct = levelMm / USABLE_MM * 100;
}

void readWs() {
  digitalWrite(WS_PWR, HIGH); delay(10); wsAdc = analogRead(WS_SIG); digitalWrite(WS_PWR, LOW);
  if (wsAdc > WS_WET) lockPump(L_LEAK, F("Co nuoc trong khay hung. Lau kho roi go r de mo khoa."));
}

void control() {
  unsigned long now = millis();
  bool want = pump; const __FlashStringHelper *why = F("giu");
  if (lockCode != L_NONE || pct < 0) want = false;
  else if (pct <= LOW_PCT) { want = true; why = F("muc <= nguong bat"); }
  else if (pct >= HIGH_PCT) { want = false; why = F("muc >= nguong tat"); }
  if (want && pump) {
    if (now - riseT >= 1000) { // ghi mức mỗi giây, giữ 20 s gần nhất
      riseT = now; if (riseN == 21) { for (byte i = 0; i < 20; i++) riseLog[i] = riseLog[i + 1]; riseN = 20; } riseLog[riseN++] = levelMm;
    }
    if (now - pumpOnAt >= DRY_WINDOW_MS && riseN >= 21 && riseLog[20] - riseLog[0] < DRY_MIN_RISE_MM) lockPump(L_DRY, F("Bom chay 20 s ma muc khong tang: nguon can, tac ong hoac cam bien treo."));
    else if (now - pumpOnAt > MAX_RUN_MS) lockPump(L_TIMEOUT, F("Bom chay qua thoi gian cho phep."));
    if (lockCode != L_NONE) want = false;
  }
  if (want && !pump && now - pumpOffAt < RELAY_MIN_OFF_MS) want = false; // relay nghỉ tối thiểu 5 s
  setPump(want, why);
}

void showLcd() {
  char l1[17], l2[17];
  if (lockCode != L_NONE) { snprintf(l1, 17, "%-16s", LOCK_LCD[lockCode]); snprintf(l2, 17, "%-16s", "Bom KHOA  go r"); }
  else {
    unsigned long rest = millis() - pumpOffAt;
    char st[6]; if (!pump && rest < RELAY_MIN_OFF_MS && pct >= 0 && pct <= LOW_PCT) snprintf(st, 6, "CHO%lu", (RELAY_MIN_OFF_MS - rest + 999) / 1000); else strcpy(st, pump ? "BAT" : "TAT");
    if (pct < 0) snprintf(l1, 17, "%-16s", "Muc --%  --mm");
    else snprintf(l1, 17, "Muc%3d%% %3dmm   ", (int)(pct + 0.5), (int)(levelMm + 0.5));
    snprintf(l2, 17, "Bom:%-5s TD    ", st);
  }
  lcd.setCursor(0, 0); lcd.print(l1); lcd.setCursor(0, 1); lcd.print(l2);
}

void setup() {
  relay(false); pinMode(RELAY, OUTPUT); buzz(false); pinMode(BUZZ, OUTPUT);
  pinMode(TRIG, OUTPUT); digitalWrite(TRIG, LOW); pinMode(ECHO, INPUT);
  pinMode(WS_PWR, OUTPUT); digitalWrite(WS_PWR, LOW);
  lcd.begin(16, 2); lcd.print("AquaTwin Mega"); lcd.setCursor(0, 1); lcd.print("Khoi dong...");
  Serial.begin(9600); Serial.println(F("T7: tong hop - go r de mo khoa"));
  pumpOffAt = millis(); // vừa khởi động coi như relay vừa nhả: nghỉ đủ 5 s
  delay(1500);
}

unsigned long tPing = 0, tWs = 0, tCtl = 0, tLcd = 0, tLog = 0;
void loop() {
  unsigned long now = millis();
  if (now - tPing >= 200) { tPing = now; ping(); }
  if (now - tWs >= 500) { tWs = now; readWs(); }
  if (now - tCtl >= 100) { tCtl = now; control(); }
  if (now - tLcd >= 250) { tLcd = now; showLcd(); }
  buzz(lockCode != L_NONE && (now / 250) % 2); // khóa an toàn → còi báo động
  if (now - tLog >= 1000) { tLog = now;
    Serial.print(F("muc ")); Serial.print(pct, 0); Serial.print(F(" %  ")); Serial.print(levelMm, 0); Serial.print(F(" mm  ws ")); Serial.print(wsAdc);
    Serial.print(F("  bom ")); Serial.println(pump ? F("BAT") : F("TAT")); }
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'r' || c == 'R') {
      if (lockCode == L_LEAK && wsAdc > WS_WET) Serial.println(F("Khay van uot - lau kho truoc."));
      else if (lockCode != L_NONE) { lockCode = L_NONE; noEcho = 0; Serial.println(F("Da mo khoa.")); }
    }
  }
}
