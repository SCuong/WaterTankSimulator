# Lắp và test mạch điện — không cần hàn

Mục tiêu buổi này: cắm bằng dây Dupont + test board, kiểm tra **từng linh kiện chạy đúng**, rồi chạy **bản ghép tổng T7** (logic giống app mô phỏng). Chưa làm phần cần hàn (ESP-01 nối Mega, nối dài cáp cảm biến).

Thời gian: khoảng 1,5–2 giờ.

---

## 0. Chuẩn bị

**Phần mềm** — Arduino IDE 2.x. Tools › Board: **Arduino Mega or Mega 2560**, Processor: **ATmega2560**, Port: cổng COM của Mega (chip CH340 — nếu không thấy cổng, cài driver CH340). Serial Monitor tốc độ **9600**.

**Mở sketch** — mỗi thư mục `T1_…`, `T2_…` là một sketch: File › Open → chọn file `.ino` bên trong.

**Đồ cần có**

| Món | Ghi chú |
|---|---|
| Arduino Mega 2560 + cáp USB | |
| HC-SR04, module relay 5V, Water Sensor | |
| Còi: module 3 chân **hoặc** còi rời + S8050 + trở 1 kΩ | |
| LCD 1602A (đã có hàng chân) + **chiết áp 10K** (WH148 của bạn bè) | Không cần module I2C |
| Test board, dây Dupont **đực–cái ~25 sợi**, **đực–đực ~10 sợi** | |
| (Thử bơm) bơm 5V, adapter 5V 3A, jack DC cái **có cầu đấu vít**, domino, diode 1N4007, cốc nước | Jack loại phải hàn thì bỏ phần bơm |
| (Thử ESP-01) ESP-01 + USB nạp ESP8266 CH340 | |

## Quy tắc an toàn (đọc trước)

1. **Rút cáp USB trước khi cắm hoặc đổi dây.** Cắm xong soát lại mới cắm USB.
2. Buổi này **Mega chạy bằng USB**. **Không** nối adapter 5V vào chân 5V của Mega khi đang cắm USB (hai nguồn 5 V đấu song song).
3. **Bơm không bao giờ lấy điện từ chân 5V của Mega** — bơm chạy bằng adapter, qua tiếp điểm relay.
4. **ESP-01 chỉ chịu 3,3 V.** Không cắm ESP-01 vào 5V hay vào chân TX của Mega.
5. Bơm phải **ngâm trong nước** khi chạy (chạy khô vài giây là hỏng phớt).

## Nguồn chung trên test board

Dây **5V** của Mega → hàng nguồn **đỏ (+)** của test board; dây **GND** của Mega → hàng **xanh (−)**. Mọi linh kiện ở dưới lấy 5V/GND từ hai hàng này.

---

## T1 — Mega + nạp code

Không cắm gì. Nạp `T1_Blink`.
**Đạt:** đèn L nháy mỗi giây; Serial Monitor in `Mega OK, chay duoc … s`.
**Lỗi thường gặp:** không nạp được → sai Board/Port, hoặc thiếu driver CH340.

## T2 — HC-SR04

| HC-SR04 | Nối tới |
|---|---|
| VCC | 5V (hàng đỏ) |
| GND | GND (hàng xanh) |
| TRIG | D9 |
| ECHO | D10 |

Nạp `T2_HCSR04`. Đưa tay / tấm bìa phẳng trước cảm biến ở 5–30 cm.
**Đạt:** khoảng cách đổi theo tay, ổn định ±1 cm. Rút dây ECHO → in `KHONG CO TIENG VONG`.
**Lỗi:** luôn 0 / không có tiếng vọng → đảo nhầm TRIG/ECHO; số nhảy loạn → vật phản xạ không phẳng hoặc quá xa (> 2 m).

## T3 — Relay (+ bơm nếu có jack vít)

| Relay | Nối tới |
|---|---|
| VCC | 5V |
| GND | GND |
| IN | D6 |

Nạp `T3_Relay`.
**Đạt:** cứ 3 s relay kêu "tách", đèn module đổi. Nếu Serial in `BAT` mà đèn relay **tắt** → đổi `RELAY_ACTIVE_LOW = false` trong code.

**Thêm bơm (tùy chọn):**

```
Adapter (+) ──► relay COM
relay NO    ──► bơm (+, dây đỏ)
bơm (−)     ──► Adapter (−)
Diode 1N4007 song song bơm: vạch trắng về phía bơm (+)
```

Dây bơm mảnh: xoắn chặt / gập đôi đầu dây trước khi vặn vít. Bơm thả trong cốc nước. **Đạt:** bơm chạy 3 s, nghỉ 3 s theo relay.

## T4 — Water Sensor

| Water Sensor | Nối tới |
|---|---|
| S | A0 |
| + | D7 (Mega chỉ cấp điện lúc đọc) |
| − | GND |

Nạp `T4_WaterSensor`.
**Đạt:** khô in `KHO` (số nhỏ). Chấm ngón tay ướt / vài giọt nước lên vạch đồng → `UOT`, số > 300. Ghi lại số khi khô và khi ướt — nếu chênh ít, chỉnh `WS_WET`.
Thử xong **lau khô** cảm biến.

## T5 — Còi

**Module 3 chân:** VCC → 5V, GND → GND, I/O → D8.
**Còi rời + S8050** (cắm trên test board):

```
D8 ── trở 1 kΩ ── B (S8050)
E (S8050) ── GND
C (S8050) ── chân (−) còi
chân (+) còi (chân dài) ── 5V
```

Nạp `T5_Buzzer`. **Đạt:** 3 tiếng ngắn + 1 tiếng dài, lặp lại. Kêu ngược (im lúc lẽ ra kêu) → đổi `BUZZ_ACTIVE_LOW`.
Còi rời mà cấp 5V chỉ "tách" một tiếng → là còi **thụ động**, không dùng được với code này.

## T6 — LCD 1602 (cắm thẳng, không I2C)

| Chân LCD | Nối tới |
|---|---|
| 1 VSS | GND |
| 2 VDD | 5V |
| 3 V0 | **chân giữa** chiết áp 10K (2 chân ngoài: 5V và GND) |
| 4 RS | D22 |
| 5 RW | GND |
| 6 E | D23 |
| 7–10 | để trống |
| 11 D4 · 12 D5 · 13 D6 · 14 D7 | D24 · D25 · D26 · D27 |
| 15 A | 5V |
| 16 K | GND |

Chiết áp cắm lên test board. Nạp `T6_LCD`.
**Đạt:** dòng 1 `AquaTwin Mega`, dòng 2 đếm giây.
**Lỗi:** chỉ thấy **hàng ô đen** → vặn chiết áp; vẫn không chữ → soát RS (D22), E (D23), D4–D7 (hay cắm lệch một chân). Màn tối hẳn → kiểm tra chân 15/16 (đèn nền).

## T7 — Ghép tổng (logic như app)

Giữ nguyên dây của **T2 + T3 + T4 + T5 + T6** (cắm đủ cùng lúc). Nạp `T7_TongHop`, mở Serial Monitor 9600.

Dùng **bàn tay thay mặt nước**: tay càng gần cảm biến = nước càng cao.

| Thử | Kết quả đúng |
|---|---|
| Không có tay trước cảm biến | Mức thấp ≤ 30 % → relay đóng, LCD `Bom:BAT` |
| Đưa tay lại gần (~5 cm) | Mức ≥ 85 % → relay nhả, `Bom:TAT` |
| Rút tay ra ngay | LCD `CHO5…CHO1`: relay nghỉ đủ 5 s mới đóng lại |
| Relay đang đóng, giữ tay **đứng yên 20 s** | Khóa `!! BOM CHAY KHO`, còi kêu (mức không tăng → đúng là chạy khô) |
| Chấm nước lên Water Sensor | Khóa `!! RO RI NUOC`, còi kêu |
| Rút dây ECHO | Khóa `!! LOI CAM BIEN` sau ~1 s |
| Mở khóa | Sửa nguyên nhân (lau khô, cắm lại dây) → gõ `r` + Enter trong Serial Monitor |

Gõ `r` khi khay còn ướt → Mega báo `Khay van uot` và **không** mở khóa — đúng thiết kế.

Hằng số ở đầu file đang theo **bản chi tiết** (`S_MM 193`, `USABLE_MM 163`, chạy tối đa 178 s). Làm **bản đơn giản** thì đổi thành 191 / 161 / 146000.

## T8 — ESP-01 (không cần Mega, không hàn)

1. Gạt công tắc trên USB nạp ESP (nếu có) sang **UART** (không phải PROG).
2. Cắm ESP-01 vào USB nạp, cắm vào máy tính. Arduino IDE › chọn cổng COM của USB nạp › Serial Monitor **115200**, chọn **Both NL & CR**.
3. Gõ lần lượt:

| Lệnh | Kết quả đúng |
|---|---|
| `AT` | `OK` |
| `AT+GMR` | Phiên bản firmware AT |
| `AT+CWMODE=1` | `OK` |
| `AT+CWLAP` | Danh sách Wi-Fi xung quanh |

Không thấy gì → thử tốc độ **9600**; ra ký tự lạ → sai tốc độ.

---

## Chưa làm được hôm nay (cần hàn)

- ESP-01 nối với Mega qua **AMS1117 + module chuyển mức** (nếu module giao chân rời).
- Nối dài cáp cảm biến (hoặc dùng dây Dupont nối tiếp + băng keo, không hàn).
- Jack DC loại ra chân hàn.

## Ghi kết quả

| Test | Đạt? | Ghi chú (số đo thực tế) |
|---|---|---|
| T1 Mega | ☐ | |
| T2 HC-SR04 | ☐ | |
| T3 Relay / bơm | ☐ | |
| T4 Water Sensor | ☐ | khô = … , ướt = … |
| T5 Còi | ☐ | active low? |
| T6 LCD | ☐ | |
| T7 Ghép tổng | ☐ | |
| T8 ESP-01 | ☐ | firmware AT: … |
