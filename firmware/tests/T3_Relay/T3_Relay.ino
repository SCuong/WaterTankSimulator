// T3 — Module relay 5V (và bơm nếu đã nối nguồn adapter vào tiếp điểm).
// Cắm: relay VCC→5V, GND→GND, IN→D6.
// Đạt: cứ 3 giây relay kêu "tách", đèn trên module đổi trạng thái; Serial in BAT/TAT.
// Module kích mức THẤP: IN = LOW thì relay đóng. Nếu thấy ngược (in BAT mà đèn tắt), đổi RELAY_ACTIVE_LOW = false.

const byte RELAY = 6;
const bool RELAY_ACTIVE_LOW = true;

void relay(bool on) { digitalWrite(RELAY, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW); }

void setup() {
  relay(false);            // ghi mức TẮT trước khi bật OUTPUT: relay không nháy lúc khởi động
  pinMode(RELAY, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("T3: relay"));
}

void loop() {
  relay(true);  Serial.println(F("Relay BAT (bom chay neu da noi)")); delay(3000);
  relay(false); Serial.println(F("Relay TAT"));                       delay(3000);
}
