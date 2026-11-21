# Bể chứa Arduino — Digital Twin

Phòng thí nghiệm ảo cho đồ án Vi điều khiển: giám sát mực nước bể chứa và điều khiển bơm tự động.

Phần cứng: Arduino Mega 2560 R3, HC-SR04, Water Sensor trong khay hứng, relay 5 V 1 kênh, bơm chìm 5 V, ESP8266 ESP-01 (qua AMS1117-3.3 và module chuyển mức), LCD 1602 I2C, còi 5 V, adapter 5 V–3 A. Giá linh kiện lấy từ Điện tử Spider (dientuspider.com) ngày 18/11/2026.

Hai phương án, chuyển bằng menu phương án ở góc phải thanh tiêu đề:
- **Bản chi tiết** — đế, bục, ống xả qua van, ống tràn, vách chắn, tấm gắn LCD.
- **Bản đơn giản** — bình nguồn + bơm, bình chứa trong khay rò rỉ, một ống cấp, thanh mica đỡ HC-SR04, hộp ABS chứa mạch có LCD trên nắp. Mục *So sánh* trong Hồ sơ (Chế tạo) đối chiếu kích thước, chi phí, vật liệu, độ phức tạp.

## Chạy

Mở `index.html` bằng Chrome/Edge (nhấp đúp). Không cần cài đặt, không cần backend; Three.js nằm sẵn trong `vendor/` nên chạy được khi không có mạng (chỉ phông chữ cần mạng, thiếu thì tự dùng phông hệ thống).

Nếu trình duyệt chặn file cục bộ, chạy máy chủ tĩnh trong thư mục này:

```bash
python -m http.server 5173
```

rồi mở http://localhost:5173.

## Ba workspace

Mô hình 3D chiếm toàn màn hình; mọi công cụ nằm trên **dock** ở đáy viewport, panel chỉ mở khi bấm.

- **Vận hành** — mô phỏng nước + firmware Arduino Mega. Panel *Điều khiển*: van xả / múc nước, châm nước, LCD 16×2, relay, còi, Water Sensor, ESP-01. Nút *Điện thoại* mở app giả lập (dashboard, tự động/thủ công, ngưỡng, cảnh báo, lịch sử).
- **Thí nghiệm** — panel *Sự cố* (rò rỉ, bơm yếu/tắc ống, mất Wi-Fi, mất điện, HC-SR04 mất tín hiệu/nhiễu/treo, rút cạn, lau khô, RESET), *Số đo* (thật ↔ Mega đo), *Nhật ký*. Mở điện thoại bên cạnh để so sánh dữ liệu cũ khi mất kết nối. Số sự cố đang bật hiện trên tab workspace.
- **Chế tạo** — cây bộ phận đánh số, tháo rời (theo cụm), mặt cắt, lắp ráp từng bước, thẻ bộ phận (ảnh mô hình cạnh ảnh ngoài đời). Nút **Hồ sơ**: thông số (nhập kích thước bình/hộp thật), BOM + dự toán + CSV, bản vẽ, cắt vật liệu, điện & nối dây (kèm *Đi dây gọn theo kênh*: bản vẽ nhìn từ trên, vị trí kẻ tim kênh, độ dài từng dây và cỡ Dupont — lấy từ chính bó dây trong 3D), hướng dẫn lắp ráp, so sánh hai phương án, ảnh ngoài đời; in/lưu PDF.

Phím Esc lùi từng lớp: đóng popover → thoát thước đo → bỏ chọn bộ phận. Trên điện thoại, panel là tấm trượt từ đáy.

## Kiểu hiển thị mô hình

Nút **Hiển thị** trên dock (mọi workspace): kiểu (Sơ đồ / 3D / Thực tế / So sánh), 7 góc nhìn, bóng số bộ phận, kích thước chính, chi tiết cao (khi xem Thực tế).

- **Sơ đồ** — sơ đồ đấu nối thực tế.
- **3D** — mô hình kỹ thuật sạch (mặc định).
- **Thực tế** — cùng mô hình đặt trên bàn gỗ trong một góc phòng lab nhỏ (cửa sổ bên trái, bảng treo dụng cụ, kệ, thảm cắt, đồng hồ vạn năng). Nắng qua cửa sổ in vệt lá cây lên bàn và mô hình, bóng đổ mềm; gỗ, tường, cảnh ngoài cửa sổ và mặt nạ vệt nắng là texture tạo bằng Codex (`js/lab-tex.js`, prompt trong `assets/ref/PROMPTS.md`); nước trong khúc xạ thước và bơm phía sau, có vạch mặt nước; thành PET/hộp nhựa chỉ phản chiếu cửa sổ; ống silicone bán trong; mạch in có chữ lụa; kính LCD phản chiếu. Mọi công cụ (tháo rời, mặt cắt — chỉ cắt mô hình, không cắt bàn —, thước đo, chọn bộ phận) vẫn hoạt động. Khi camera đứng yên, khung hình được hoàn thiện như ảnh chụp: bóng tối ở góc và dưới vật (AO), nền xa mờ, viền ảnh tối nhẹ. Máy yếu/điện thoại tự tắt khúc xạ và hậu kỳ.
- **So sánh** — mô hình Thực tế đặt cạnh ảnh ngoài đời; chọn góc ảnh thì camera 3D chuyển theo.

## Cấu trúc

| File | Vai trò |
|---|---|
| `js/design.js` | Mô hình tham số: mọi kích thước, ống, dây, miếng cắt, BOM, bước lắp. Nguồn sự thật duy nhất. |
| `js/sim.js` | Vật lý nước + logic firmware Mega (lọc trung vị, hai ngưỡng, relay nghỉ ≥ 5 s, khóa an toàn, chống chạy khô, quá giờ, LCD, còi, Wi-Fi failsafe). |
| `js/scene3d.js` | Mô hình 3D dựng từ `design.js`, đồng bộ với `sim.js`. |
| `js/parts3d.js` | Linh kiện điện tử chi tiết theo kích thước thật (ba mức chi tiết). |
| `js/post3d.js` | Hậu kỳ chế độ Thực tế (chất lượng cao): AO từ độ sâu, làm mờ nền (DOF), viền tối, ACES. AO/DOF chỉ bật dần khi camera đứng yên. |
| `js/lab3d.js` | Bối cảnh phòng lab của chế độ Thực tế (bàn, tường, cửa sổ, vệt nắng, đồ trên bàn). Texture canvas dự phòng, thay bằng ảnh Codex trong `js/lab-tex.js` (tải khi bật Thực tế lần đầu). |
| `js/drawings.js` | Bản vẽ SVG sinh từ `design.js`. |
| `js/app.js` | Giao diện, điện thoại, hồ sơ chế tạo. |
| `assets/ref/` | Ảnh ngoài đời. Ảnh thật lấy từ Wikimedia Commons (nguồn, tác giả, giấy phép trong `assets/ref/PROMPTS.md` và trong app). Thư mục `ai/` chứa ảnh minh họa tạo bằng AI (Codex image generation) cho linh kiện không có ảnh thật và cho mô hình hoàn chỉnh; prompt gốc nằm cạnh mỗi ảnh (`*.prompt.txt`) và trong `PROMPTS.md`. |
| `tests/selftest.js` | `node tests/selftest.js` — kiểm tra nhất quán kích thước và các kịch bản an toàn. |

Trong Console (F12) có `twin.sim` và `twin.model` để thử nghiệm thêm.

## Lưu ý trung thực

- Giá là tham khảo, có thể chênh ±30 %.
- Kích thước linh kiện mua sẵn là danh nghĩa; lưu lượng bơm là ước tính — hiệu chuẩn bằng ca đong.
- Kích thước có nhãn “Đo thực tế” phải đo vật thật rồi nhập lại ở mục Thông số.
- Ảnh gắn nhãn “Ảnh minh họa AI” dựng theo bố cục và kích thước bản vẽ nhưng không phải ảnh chụp mô hình thật; chi tiết nhỏ (chữ trên board, vị trí dây) có thể khác.
