// T2 — Cảm biến siêu âm HC-SR04: đo khoảng cách và quy ra mực nước %.
// Cắm: VCC→5V, GND→GND, TRIG→D9, ECHO→D10.
// Thử: đưa bàn tay / tấm bìa phẳng trước cảm biến ở 5–30 cm, số đo đổi theo.
// Đạt: khoảng cách ổn định ±1 cm; che kín hoặc rút dây ECHO thì in "KHONG CO TIENG VONG".

const byte TRIG = 9, ECHO = 10;
const float S_MM = 193;      // mặt cảm biến → đáy trong bình (bản chi tiết). Bản đơn giản: 191
const float USABLE_MM = 163; // chiều cao ứng với 100 %. Bản đơn giản: 161

void setup() {
  pinMode(TRIG, OUTPUT); digitalWrite(TRIG, LOW);
  pinMode(ECHO, INPUT);
  Serial.begin(9600);
  Serial.println(F("T2: HC-SR04"));
}

void loop() {
  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW); // xung 10 µs
  unsigned long us = pulseIn(ECHO, HIGH, 30000UL);                            // quá 30 ms = mất tín hiệu
  if (us == 0) {
    Serial.println(F("KHONG CO TIENG VONG (kiem tra day ECHO/TRIG)"));
  } else {
    float mm = us * 0.343 / 2;                 // tốc độ âm thanh 0,343 mm/µs, đi và về
    float pct = (S_MM - mm) / USABLE_MM * 100; // tay càng gần cảm biến = "nước càng cao"
    Serial.print(F("echo ")); Serial.print(us); Serial.print(F(" us  ->  "));
    Serial.print(mm, 0); Serial.print(F(" mm  ->  muc "));
    Serial.print(pct, 0); Serial.println(F(" %"));
  }
  delay(200);
}
