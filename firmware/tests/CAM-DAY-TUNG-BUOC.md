# Cắm dây từng bước — không hàn

Làm **theo thứ tự cụm A → G**. Xong mỗi cụm thì nạp sketch kiểm tra của cụm đó; đạt rồi mới sang cụm sau (dây cụm trước **giữ nguyên**).

## Đọc trước 1 phút

**Loại dây**
- **ĐĐ** = dây **đực–đực** (hai đầu là kim). Dùng nối **Mega ↔ test board** (cả hai đều là lỗ).
- **ĐC** = dây **đực–cái**. **Đầu cái** chụp vào **chân kim** của cảm biến, module, LCD, ESP-01; **đầu đực** cắm vào lỗ của Mega hoặc test board.
- **CC** = dây **cái–cái**: chỉ dùng ở cụm G, nối chân kim với chân kim (ESP-01 ↔ module chuyển mức).

**Màu dây** theo quy ước trong Hồ sơ của app (đỏ = 5V, đen = GND…). Bó dây không đủ màu thì dùng màu khác, miễn **ghi nhớ dây nào là dây nào** — đừng dùng đỏ/đen cho tín hiệu.

**Tên chân trên Mega** in ngay cạnh lỗ:
- `5V`, `GND` — dãy POWER (cạnh jack nguồn).
- `6`, `7`, `8`, `9`, `10` — dãy DIGITAL phía trên.
- `TX1 18`, `RX1 19` — dãy COMMUNICATION phía trên bên phải.
- `22` … `27` — đầu dãy chân đôi ở **cạnh phải** board (22 và 23 nằm cặp đầu tiên, 24–25 cặp thứ hai, 26–27 cặp thứ ba).
- `A0` — dãy ANALOG IN phía dưới.

**Test board** có 4 thanh nguồn dài ở hai mép: gọi là **thanh + trên**, **thanh − trên** (mép trên), **thanh + dưới**, **thanh − dưới** (mép dưới). Giữa board là các **cột** đánh số, mỗi cột 5 lỗ nối thông nhau; rãnh giữa chia board làm **nửa trên** và **nửa dưới**.

**Luôn rút cáp USB trước khi cắm hoặc gỡ dây.** Cắm xong soát lại rồi mới cắm USB.

---

## Cụm A — Nguồn 5V lên test board (2 dây)

| Bước | Dây | Màu | Một đầu | Đầu kia |
|---|---|---|---|---|
| 1 | ĐĐ | Đỏ | Mega **5V** | **Thanh + trên** |
| 2 | ĐĐ | Đen | Mega **GND** | **Thanh − trên** |

Từ giờ: "**5V**" = thanh + trên, "**GND**" = thanh − trên.

**Kiểm tra A:** nạp `T1_Blink` → đèn L trên Mega nháy mỗi giây.

---

## Cụm B — Cảm biến siêu âm HC-SR04 (4 dây)

Nhìn mặt trước HC-SR04 (hai "mắt" tròn), chân in chữ **VCC – TRIG – ECHO – GND**.

| Bước | Dây | Màu | Đầu cái chụp vào | Đầu đực cắm vào |
|---|---|---|---|---|
| 3 | ĐC | Đỏ | HC-SR04 **VCC** | **Thanh + trên** |
| 4 | ĐC | Đen | HC-SR04 **GND** | **Thanh − trên** |
| 5 | ĐC | Vàng | HC-SR04 **TRIG** | Mega **9** |
| 6 | ĐC | Xanh lá | HC-SR04 **ECHO** | Mega **10** |

**Kiểm tra B:** nạp `T2_HCSR04`, mở Serial Monitor **9600** → đưa tay trước cảm biến, khoảng cách đổi theo.

---

## Cụm C — Module relay (3 dây)

Phía có 3 chân kim của relay in **VCC (DC+) – GND (DC−) – IN**.

| Bước | Dây | Màu | Đầu cái chụp vào | Đầu đực cắm vào |
|---|---|---|---|---|
| 7 | ĐC | Đỏ | Relay **VCC / DC+** | **Thanh + trên** |
| 8 | ĐC | Đen | Relay **GND / DC−** | **Thanh − trên** |
| 9 | ĐC | Xanh dương | Relay **IN** | Mega **6** |

**Kiểm tra C:** nạp `T3_Relay` → relay kêu "tách" mỗi 3 giây.

*(Bơm: chưa nối ở bước này. Thử bơm theo mục cuối file, cần jack DC loại có vít.)*

---

## Cụm D — Water Sensor (3 dây)

Chân in **S – + – −**.

| Bước | Dây | Màu | Đầu cái chụp vào | Đầu đực cắm vào |
|---|---|---|---|---|
| 10 | ĐC | Cam | Water Sensor **S** | Mega **A0** |
| 11 | ĐC | Đỏ | Water Sensor **+** | Mega **7** — **không** cắm vào thanh + |
| 12 | ĐC | Đen | Water Sensor **−** | **Thanh − trên** |

**Kiểm tra D:** nạp `T4_WaterSensor` → khô in `KHO`; chấm ngón tay ướt lên vạch đồng → `UOT`. Thử xong lau khô.

---

## Cụm E — Còi (chọn **E1** hoặc **E2**)

### E1 — Module còi 3 chân (3 dây)

| Bước | Dây | Màu | Đầu cái chụp vào | Đầu đực cắm vào |
|---|---|---|---|---|
| 13 | ĐC | Đỏ | Còi **VCC** | **Thanh + trên** |
| 14 | ĐC | Đen | Còi **GND** | **Thanh − trên** |
| 15 | ĐC | Nâu | Còi **I/O** | Mega **8** |

### E2 — Còi rời + transistor S8050 + trở 1 kΩ (cắm trên test board)

Đặt linh kiện vào **nửa trên** test board:

- **S8050:** mặt phẳng có chữ **hướng về phía bạn**, 3 chân cắm vào **cột 10, 11, 12** → chân trái **E** (cột 10), giữa **B** (cột 11), phải **C** (cột 12).
- **Trở 1 kΩ** (vạch nâu–đen–đỏ): một chân cột **11**, chân kia cột **16**.
- **Còi:** chân **dài (+)** cột **20**, chân **ngắn (−)** cắm vào cột bên cạnh mà nó rơi tới (thường cột **23**).

| Bước | Dây | Màu | Một đầu | Đầu kia |
|---|---|---|---|---|
| 13 | ĐĐ | Nâu | Mega **8** | Cột **16** (chân trở) |
| 14 | ĐĐ | Đen | Cột **10** (chân E) | **Thanh − trên** |
| 15 | ĐĐ | Trắng | Cột **12** (chân C) | Cột của chân **(−) còi** |
| 16 | ĐĐ | Đỏ | Cột **20** (chân + còi) | **Thanh + trên** |

**Kiểm tra E:** nạp `T5_Buzzer` → 3 tiếng ngắn + 1 tiếng dài. Im lúc lẽ ra kêu → đổi `BUZZ_ACTIVE_LOW` trong code.

---

## Cụm F — LCD 1602 + chiết áp 10K (14 dây)

**Chiết áp WH148 10K:** núm xoay hướng về phía bạn, 3 chân cắm vào **nửa dưới** test board, **cột 25, 26, 27** (trái → phải).

| Bước | Dây | Màu | Một đầu | Đầu kia |
|---|---|---|---|---|
| 17 | ĐĐ | Đỏ | Cột **25** (chân trái chiết áp) | **Thanh + trên** |
| 18 | ĐĐ | Đen | Cột **27** (chân phải chiết áp) | **Thanh − trên** |

**LCD:** hàng chân ở mép trên, chân **1** ở **bên trái** khi nhìn mặt kính (có số 1 / 16 in cạnh chân). Đầu **cái** chụp vào chân LCD.

| Bước | Dây | Màu | Chân LCD | Đầu đực cắm vào |
|---|---|---|---|---|
| 19 | ĐC | Đen | **1** VSS | **Thanh − trên** |
| 20 | ĐC | Đỏ | **2** VDD | **Thanh + trên** |
| 21 | ĐC | Cam | **3** V0 | Cột **26** (chân **giữa** chiết áp) |
| 22 | ĐC | Trắng | **4** RS | Mega **22** |
| 23 | ĐC | Đen | **5** RW | **Thanh − trên** |
| 24 | ĐC | Xám | **6** E | Mega **23** |
| — | — | — | **7, 8, 9, 10** | **để trống** |
| 25 | ĐC | Tím | **11** D4 | Mega **24** |
| 26 | ĐC | Xanh dương | **12** D5 | Mega **25** |
| 27 | ĐC | Xanh lá | **13** D6 | Mega **26** |
| 28 | ĐC | Vàng | **14** D7 | Mega **27** |
| 29 | ĐC | Đỏ | **15** A (đèn nền +) | **Thanh + trên** |
| 30 | ĐC | Đen | **16** K (đèn nền −) | **Thanh − trên** |

**Kiểm tra F:** nạp `T6_LCD` → dòng 1 `AquaTwin Mega`, dòng 2 đếm giây. Chỉ thấy ô vuông đen → **vặn chiết áp** từ từ.

**Kiểm tra tổng:** nạp `T7_TongHop` → thử theo bảng trong `HUONG-DAN-TEST.md` (dùng bàn tay thay mặt nước).

---

## Cụm G — ESP-01 nối với Mega

> **Chỉ làm khi** module **AMS1117** và **module chuyển mức 4 kênh** đã **có chân hàn sẵn**. Chưa có thì test ESP-01 bằng **USB nạp** (bài T8 trong `HUONG-DAN-TEST.md`) và bỏ qua cụm này.
>
> **ESP-01 chỉ chịu 3,3 V.** Cắm nhầm 5V vào ESP-01 là hỏng ngay. Làm chậm, soát từng dây.

### G-1. Tạo đường 3,3 V ở **thanh dưới** test board

| Bước | Dây / linh kiện | Màu | Một đầu | Đầu kia |
|---|---|---|---|---|
| 31 | ĐĐ | Đen | **Thanh − trên** | **Thanh − dưới** (nối chung GND) |
| 32 | ĐC | Đỏ | AMS1117 chân **VIN / IN** | **Thanh + trên** (5V) |
| 33 | ĐC | Đen | AMS1117 chân **GND** | **Thanh − dưới** |
| 34 | ĐC | Cam | AMS1117 chân **VOUT / OUT** | **Thanh + dưới** |
| 35 | Tụ 470 µF | — | Chân **dài (+)** → **thanh + dưới** | Chân **ngắn**, phía có **vạch (−)** → **thanh − dưới** |

Từ giờ: "**3V3**" = thanh + dưới. **Thanh + dưới không bao giờ được nối với 5V.**

**Kiểm tra G-1 (bắt buộc, chưa cắm ESP-01):** cắm USB, dùng đồng hồ vạn năng đo **thanh + dưới ↔ thanh − dưới = 3,2–3,4 V**. Ra 5 V hoặc 0 V → rút USB, soát lại bước 32–34.

### G-2. Module chuyển mức (5V ↔ 3,3V)

Module có hai hàng chân: phía **HV** (HV, HV1–HV4, GND) và phía **LV** (LV, LV1–LV4, GND).

| Bước | Dây | Màu | Đầu cái chụp vào | Đầu đực cắm vào |
|---|---|---|---|---|
| 36 | ĐC | Đỏ | Chuyển mức **HV** | **Thanh + trên** (5V) |
| 37 | ĐC | Đen | Chuyển mức **GND** (phía HV) | **Thanh − trên** |
| 38 | ĐC | Cam | Chuyển mức **LV** | **Thanh + dưới** (3V3) |
| 39 | ĐC | Đen | Chuyển mức **GND** (phía LV) | **Thanh − dưới** |
| 40 | ĐC | Tím | Chuyển mức **HV1** | Mega **TX1 18** |
| 41 | ĐC | Xám | Chuyển mức **HV2** | Mega **RX1 19** |

### G-3. Hai trở kéo lên 10 kΩ (vạch nâu–đen–cam)

| Bước | Linh kiện | Một chân | Chân kia |
|---|---|---|---|
| 42 | Trở 10 kΩ số 1 | **Thanh + dưới** (3V3) | **Nửa dưới, cột 5** |
| 43 | Trở 10 kΩ số 2 | **Thanh + dưới** (3V3) | **Nửa dưới, cột 9** |

### G-4. ESP-01 (6 dây — **không** cắm ESP-01 lên test board)

Tìm tên chân: lật mặt sau ESP-01 đọc chữ in cạnh chân. Không có chữ thì theo sơ đồ chuẩn (nhìn mặt có chip, hai hàng chân ở phía dưới):

```
  TX     EN(CH_PD)   RST     VCC(3V3)
  GND    GPIO2       GPIO0   RX
```

**VCC và GND luôn nằm ở hai góc chéo nhau.**

| Bước | Dây | Màu | Đầu cái chụp vào chân ESP-01 | Đầu đực cắm vào |
|---|---|---|---|---|
| 44 | ĐC | Đen | **GND** | **Thanh − dưới** |
| 45 | ĐC | Cam | **VCC** | **Thanh + dưới** (3V3 — **không phải** 5V) |
| 46 | ĐC | Cam | **EN / CH_PD** | **Cột 5** (đầu trở số 1) |
| 47 | ĐC | Trắng | **RST** | **Cột 9** (đầu trở số 2) |
| 48 | **CC** | Tím | **RX** | Chuyển mức **LV1** (hai đầu đều chân kim → dây cái–cái) |
| 49 | **CC** | Xám | **TX** | Chuyển mức **LV2** (dây cái–cái) |
| — | — | — | **GPIO0**, **GPIO2** | **để trống** |

Đường đi tín hiệu: **Mega TX1 18 → HV1 → LV1 → ESP RX** và **ESP TX → LV2 → HV2 → Mega RX1 19**.

**Kiểm tra G:** nạp `T9_ESP_QuaMega`, Serial Monitor **115200**, chọn **Both NL & CR** → gõ `AT` → phải trả về `OK`. Gõ `AT+CWLAP` → danh sách Wi-Fi. Không có gì → đổi `ESP_BAUD = 9600` trong code, nạp lại.

---

## Thử bơm (tùy chọn — cần jack DC cái **loại có vít**)

Bơm **không** lấy điện từ Mega. Mega vẫn chạy bằng USB; bơm chạy bằng adapter 5V qua tiếp điểm relay.

| Bước | Nối | Từ | Tới |
|---|---|---|---|
| P1 | Dây đỏ | Vít **+** của jack DC | Vít **COM** của relay |
| P2 | Dây đỏ của bơm | Vít **NO** của relay | (xoắn chặt đầu dây rồi vặn vít) |
| P3 | Dây đen của bơm | Vít **−** của jack DC | (xoắn chặt rồi vặn vít) |
| P4 | Diode 1N4007 | Kẹp chung vào vít **NO** (phía **vạch trắng**) | Kẹp chung vào vít **−** của jack |

Thả bơm vào cốc nước → cắm adapter vào jack → nạp `T3_Relay` → bơm chạy 3 giây, nghỉ 3 giây.

---

## Soát nhanh trước khi cắm USB

- [ ] Không có dây đỏ nào cắm vào chân tín hiệu (6, 7, 8, 9, 10, 18, 19, 22–27, A0) — trừ dây **+ Water Sensor → 7** (đúng thiết kế).
- [ ] Thanh + trên = 5V, thanh + dưới = 3V3 (chỉ khi làm cụm G), **không** có dây nào nối hai thanh + với nhau.
- [ ] ESP-01 VCC vào **thanh + dưới**.
- [ ] Chân 7–10 của LCD để trống.
- [ ] Bơm (nếu có) nằm trong nước, nguồn bơm từ adapter, không từ Mega.
