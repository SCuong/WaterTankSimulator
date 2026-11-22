// T4 — Water Sensor (cảm biến nước trong khay hứng).
// Cắm: S→A0, + → D7 (Mega chỉ cấp điện lúc đọc để vạch đồng đỡ bị ăn mòn), − → GND.
// Thử: để khô → số nhỏ (~0–50). Chấm ngón tay ướt hoặc nhỏ vài giọt nước lên vạch đồng → số > 300.
// Đạt: khô in "KHO", ướt in "UOT". Ngưỡng 300 có thể chỉnh theo số đo thực tế của bạn.

const byte WS_PWR = 7, WS_SIG = A0;
const int WS_WET = 300;

int readWs() {
  digitalWrite(WS_PWR, HIGH); delay(10);
  int v = analogRead(WS_SIG);
  digitalWrite(WS_PWR, LOW);
  return v;
}

void setup() {
  pinMode(WS_PWR, OUTPUT); digitalWrite(WS_PWR, LOW);
  Serial.begin(9600);
  Serial.println(F("T4: Water Sensor"));
}

void loop() {
  int v = readWs();
  Serial.print(F("A0 = ")); Serial.print(v);
  Serial.println(v > WS_WET ? F("  -> UOT (co nuoc)") : F("  -> KHO"));
  delay(500);
}
