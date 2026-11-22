// T1 — Kiểm tra Arduino Mega + cáp USB + nạp code.
// Đạt: đèn L trên board nháy 1 lần/giây, Serial Monitor (9600) in "Mega OK" mỗi giây.

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);   // đèn L = chân D13
  Serial.begin(9600);
  Serial.println(F("T1: bat dau"));
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH); delay(500);
  digitalWrite(LED_BUILTIN, LOW);  delay(500);
  Serial.print(F("Mega OK, chay duoc "));
  Serial.print(millis() / 1000);
  Serial.println(F(" s"));
}
