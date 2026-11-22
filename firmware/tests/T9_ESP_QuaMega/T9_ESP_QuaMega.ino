// T9 — Nói chuyện với ESP-01 qua Mega (Serial1 = chân D18 TX1 / D19 RX1, qua module chuyển mức).
// Mega chỉ chuyển tiếp: máy tính ↔ Mega (USB) ↔ ESP-01.
// Serial Monitor: tốc độ 115200, chọn "Both NL & CR". Gõ AT → phải trả về OK.
// Không thấy gì: đổi ESP_BAUD thành 9600 (một số ESP-01 xuất xưởng ở 9600) rồi nạp lại.

const long ESP_BAUD = 115200;

void setup() {
  Serial.begin(115200);
  Serial1.begin(ESP_BAUD);
  Serial.println(F("T9: go AT de thu ESP-01"));
}

void loop() {
  while (Serial.available())  Serial1.write(Serial.read());   // máy tính → ESP
  while (Serial1.available()) Serial.write(Serial1.read());   // ESP → máy tính
}
