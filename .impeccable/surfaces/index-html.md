---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["css/app.css","js/app.js","js/scene3d.js"]
---

Scope: whole app shell `index.html` (Vận hành, Tháo rời, Chế tạo + điện thoại giả lập). Mode: Operate. Audience: sinh viên tự làm đồ án, laptop cá nhân, phiên dài.

## Direction contract

THESIS: Dashboard IoT + trình xem CAD theo chuẩn ngành, làm đến độ chỉn chu của Arduino Cloud, Onshape và Linear. Từ chối kiểu “mọi thứ bày ra cùng lúc” của bản cũ: mỗi chế độ chỉ hiện trạng thái thiết yếu, chi tiết kỹ thuật nằm sau tab, disclosure, tooltip.

OWN-WORLD: Nền xám lạnh #f5f7fa, bề mặt trắng, viền 1 px #e5e7eb, chữ #111827, một màu nhấn xanh dương #2563eb cho chọn/chính; màu trạng thái chỉ khi mang nghĩa (xanh lá chạy/ổn, hổ phách cảnh báo, đỏ nguy hiểm), nước là xanh trời. Inter (chữ số tabular) cho UI; mono chỉ cho LCD. Icon SVG nét 1.75. Viewport 3D sáng như Onshape. Điện thoại giả lập giữ bản sắc app di động riêng (font hệ thống, khung máy tối).

STORY: Sinh viên mở app, thấy ngay mô hình đang chạy, firmware đang làm gì, điện thoại thấy gì; gây sự cố từ một tab; chuyển sang Tháo rời để xem cây bộ phận đánh số khớp với bóng số trên 3D; sang Chế tạo để lấy BOM, bản vẽ, hướng dẫn mang đi làm.

FIRST VIEWPORT: Thanh trên 52 px (thương hiệu, bộ chuyển 3 workspace ở giữa, menu phương án bên phải). Bên dưới toàn bộ là viewport 3D với thẻ trạng thái firmware góc trên trái và một dock công cụ ở đáy (Hiển thị, Đo, mô phỏng, nút mở panel). Ở 1440: Vận hành/Thí nghiệm mở sẵn panel 312 px bên phải; điện thoại đóng, mở bằng dock. Chế tạo: cây bộ phận trái, inspector chỉ hiện khi chọn bộ phận, Hồ sơ thay viewport bằng tài liệu. Mobile: panel là tấm trượt đáy, điện thoại toàn màn hình.

FORM: canon (chuẩn của ngành), người dùng chọn qua lối thoát cố định; signature: bóng số (BOM balloons) kiểu bản vẽ lắp CAD thay cho nhãn tên dài trên 3D, khớp số với cây bộ phận. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
