# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Sinh viên tự làm đồ án môn Vi điều khiển, một người ngồi trước laptop cá nhân trong nhiều phiên làm việc dài. Họ dùng ứng dụng để (1) hiểu firmware Arduino Mega điều khiển bơm ra sao và thử các sự cố, (2) hiểu cấu tạo mô hình bằng cách tháo rời từng bộ phận, (3) cầm BOM, bản vẽ, sơ đồ cắt, sơ đồ đấu nối và hướng dẫn lắp ráp đi mua linh kiện rồi dựng mô hình thật.

## Product Purpose

Phòng thí nghiệm ảo (digital twin) cho mô hình giám sát mực nước bể chứa và điều khiển bơm tự động: Arduino Mega 2560 + HC-SR04 + Water Sensor + relay + bơm chìm 5 V + ESP8266 ESP-01 + LCD 1602 I2C + còi. Thành công là khi sinh viên dựng được mô hình thật khớp với bản số và giải thích được mọi hành vi an toàn của firmware.

## Positioning

Một mô hình tham số duy nhất (`js/design.js`) sinh ra cùng lúc mô hình 3D, mô phỏng vật lý + firmware, bản vẽ, BOM có giá thật, danh sách cắt và các bước lắp ráp; đổi một kích thước đo thực tế là mọi thứ cập nhật theo. Hai phương án (bản chi tiết / bản đơn giản) dùng chung firmware.

## Operating Context

- Ba workspace: Vận hành (mô phỏng, điều khiển tiêu thụ, LCD và trạng thái phần cứng), Thí nghiệm (gây sự cố, thật ↔ Mega đo, nhật ký), Chế tạo (cây bộ phận, exploded view, mặt cắt, lắp ráp từng bước, thẻ bộ phận; Hồ sơ: thông số, BOM + CSV, bản vẽ, cắt vật liệu, nối dây, lắp ráp, so sánh, ảnh ngoài đời, in/PDF). Mô hình 3D là trung tâm; panel và điện thoại chỉ mở khi cần.
- Điện thoại giả lập đại diện cho app di động thật nhận dữ liệu qua ESP-01: có trạng thái mất kết nối, dữ liệu cũ, cảnh báo khóa an toàn.
- Giá linh kiện lấy từ Điện tử Spider (dientuspider.com) ngày 18/11/2026.

## Capabilities and Constraints

- Mở `index.html` là chạy, không build, không backend, không framework; Three.js nằm trong `vendor/` để chạy offline. Chỉ phông chữ cần mạng và phải có phông dự phòng hệ thống.
- Toàn bộ giao diện bằng tiếng Việt, giữ thuật ngữ hiện có.
- Điện thoại giả lập phải trông như một app di động thật, tách biệt với giao diện lab.
- `tests/selftest.js` kiểm tra nhất quán kích thước và kịch bản an toàn; `window.twin` mở cho sinh viên thử trong Console.
- Hồ sơ chế tạo có chức năng in/lưu PDF (hiện có, giữ nguyên).

## Brand Commitments

- Hướng thị giác: chuẩn của ngành (category standard), làm thật chỉn chu, không “cá tính hóa” lén. Thước đo độ hoàn thiện: Arduino Cloud (dashboard IoT), Onshape / Fusion web viewer (trình xem CAD: cây bộ phận, explode, mặt cắt, đo), Linear / Vercel dashboard (chữ, khoảng cách, tương tác). Người dùng chọn ngày 18/11/2026.

## Evidence on Hand

- Giá, link sản phẩm, kích thước danh nghĩa trong `js/design.js`. Không bịa thêm giá, nhà cung cấp, hay thông số.
- Kích thước có nhãn “Đo thực tế” là giả định phải đo lại; lưu lượng bơm là ước tính.

## Product Principles

1. Một nguồn sự thật: giao diện chỉ hiển thị cái mô hình tham số và mô phỏng thật sự tính ra.
2. Trung thực kỹ thuật: phân biệt rõ số thiết kế, số danh nghĩa, số phải đo; không che giấu cảnh báo an toàn.
3. Hiểu trước, chi tiết sau: trạng thái thiết yếu luôn thấy được, số liệu kỹ thuật sâu mở ra khi cần.
4. Từ màn hình ra bàn làm việc: mọi thứ trong Chế tạo phải dùng được khi cầm đi mua và lắp thật.

## Accessibility & Inclusion

Thao tác dài trên laptop: tương phản WCAG AA, điều khiển bằng bàn phím, tôn trọng prefers-reduced-motion.
