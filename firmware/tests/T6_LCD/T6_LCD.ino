// T6 — LCD 1602 cắm thẳng (không module I2C), chế độ 4 bit.
// Cắm (dây Dupont cái vào hàng chân có sẵn của LCD):
//   1 VSS → GND   2 VDD → 5V   3 V0 → chân GIỮA chiết áp 10K (2 chân ngoài: 5V và GND)
//   4 RS → D22    5 RW → GND   6 E → D23
//   11 D4 → D24   12 D5 → D25  13 D6 → D26  14 D7 → D27
//   15 A → 5V     16 K → GND   (chân 7–10 để trống)
// Đạt: dòng 1 "AquaTwin Mega", dòng 2 đếm giây. Chỉ thấy ô vuông đen → vặn chiết áp; vẫn không có chữ → soát lại RS, E, D4–D7.

#include <LiquidCrystal.h>
LiquidCrystal lcd(22, 23, 24, 25, 26, 27); // RS, E, D4, D5, D6, D7

void setup() {
  lcd.begin(16, 2);
  lcd.print("AquaTwin Mega");   // LCD không có dấu tiếng Việt: chỉ in ASCII
  Serial.begin(9600);
  Serial.println(F("T6: LCD"));
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print("Chay ");
  lcd.print(millis() / 1000);
  lcd.print(" s     ");
  delay(250);
}
