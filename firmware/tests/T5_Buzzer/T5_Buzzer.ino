// T5 — Còi buzzer.
// Module 3 chân: VCC→5V, GND→GND, I/O→D8.
// Còi rời 2 chân + transistor S8050 (trên test board): D8 → trở 1k → B; E → GND; C → chân (−) còi; chân (+) còi → 5V.
// Đạt: kêu 3 tiếng ngắn rồi 1 tiếng dài, lặp lại. Nếu kêu liên tục và im đúng lúc lẽ ra kêu → đổi BUZZ_ACTIVE_LOW.

const byte BUZZ = 8;
const bool BUZZ_ACTIVE_LOW = false; // module dùng transistor PNP thường kêu khi LOW → đặt true

void buzz(bool on) { digitalWrite(BUZZ, (on ^ BUZZ_ACTIVE_LOW) ? HIGH : LOW); }

void setup() {
  buzz(false); pinMode(BUZZ, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("T5: coi"));
}

void loop() {
  for (int i = 0; i < 3; i++) { buzz(true); delay(120); buzz(false); delay(150); }
  delay(300);
  buzz(true); delay(600); buzz(false);
  Serial.println(F("Da keu: 3 ngan + 1 dai"));
  delay(2000);
}
