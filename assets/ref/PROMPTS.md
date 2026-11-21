# Ảnh tham chiếu: nguồn và prompt tạo ảnh

Ảnh dùng trong panel bộ phận và tab "Ngoài đời". Ưu tiên ảnh thật có giấy phép mở; linh kiện nào không có ảnh thật thì tạo ảnh bằng AI theo cùng một phong cách và gắn nhãn "Ảnh minh họa AI" trong app. Ảnh chỉ để đối chiếu, không thay mô hình 3D.

## Ảnh thật (Wikimedia Commons)

| File | Nguồn | Tác giả | Giấy phép |
|---|---|---|---|
| `mega.jpg` | File:Arduino MEGA 2560 R3, front side.jpg | Dsimic | CC BY-SA 4.0 |
| `hcsr04.jpg` | File:HC SR04 Ultrasonic Module.jpg | Suyash.dwivedi | CC BY-SA 4.0 |
| `relay.jpg` | File:SRD-05VDC-SL-C 5V one-channel relay module.jpg | Suyash.dwivedi | CC BY-SA 4.0 |
| `lcd.jpg` | File:MELT 16x2 LCD alphanumeric display 02(DXO).jpg | Retired electrician | CC0 |

## Khối phong cách chung (dán vào cuối mọi prompt)

> Photorealistic photograph, full-frame DSLR, 50 mm lens at f/5.6, true-to-life color. Soft diffused daylight from a large window on the left plus a white bounce card on the right; soft natural shadows, no harsh specular blowouts. Neutral light-grey matte workbench surface with faint scratches. Realistic small imperfections (hand-cut edges, a little hot glue, light dust). No added text, no watermark, no logos invented, no people, no hands. Hobbyist student build, not an industrial or concept render.

## Linh kiện thiếu ảnh thật (tỷ lệ 4:3)

**water-sensor.png:** Close-up product photo of a common Arduino "Water Sensor" water-level module: red rectangular PCB about 62 × 20 mm with ten exposed parallel tinned copper traces forming an interleaved comb across most of its length, a small red power LED and one SMD transistor near the end, a 3-pin male header labelled S, +, − in white silkscreen. Lying flat, camera at a 35° three-quarter angle from above, the sensing traces catching soft light. + khối phong cách chung.

**pump.png:** Product photo of a mini DC 3–6 V submersible water pump used in Arduino projects: black ABS plastic rectangular body about 45 × 24 × 33 mm with a rounded inlet grille on one face and a horizontal outlet nozzle about 7.5 mm diameter, two thin red and black lead wires about 20 cm long with tinned ends. Standing on its base, camera at a 30° three-quarter angle, a short length of clear silicone tubing (ID 6 mm) pushed onto the nozzle. + khối phong cách chung.

**esp01.png:** Close-up product photo of an ESP8266 ESP-01 Wi-Fi module: small black PCB about 24.8 × 14.3 mm with a meandering gold PCB antenna trace at one end, a silver metal-can-free ESP8266EX chip and a small 8-pin SPI flash chip, two tiny SMD LEDs (red power, blue status), and a 2 × 4 male pin header on the other end. Lying flat, camera at a 35° three-quarter angle from above. + khối phong cách chung.

**buzzer.png:** Close-up product photo of a 5 V active buzzer module for Arduino: small blue PCB about 33 × 13 mm, black cylindrical 12 mm buzzer with a white peel-off sticker on top, one small SMD transistor and resistor, 3-pin male header labelled VCC, I/O, GND. Lying flat, camera at a 35° three-quarter angle. + khối phong cách chung.

## Mô hình hoàn chỉnh, bản chi tiết (tỷ lệ 3:2)

Mô tả chung (dán vào đầu mỗi prompt bên dưới):

> A student-built desktop water-tank control model on a single white PVC foam board (Formex) base 642 × 262 × 5 mm with small rubber feet; everything below is placed left to right on this one base, as in a technical drawing. LEFT (about 200 mm wide): a clear rectangular plastic box with straight vertical walls and slightly rounded corners, 200 × 150 × 120 mm, half filled with water, a small black submersible pump on its bottom. CENTRE: a white PVC-foam platform 160 mm tall shaped like an upside-down U open at the front, 172 × 212 mm on top, carrying a shallow white PVC-foam catch tray; in the tray stands a clear PET cylindrical jar, inner diameter 110 mm and 200 mm tall, set slightly toward the back, filled to about 40 % with clear water, a paper ruler taped vertically on its side. A narrow white PVC-foam bridge plate rests DIRECTLY on the jar rim (no posts, no frame, nothing standing around the jar) holding an HC-SR04 ultrasonic sensor (blue PCB, two silver transducers) pointing straight down into the jar. Clear silicone tubing (6 mm inner diameter) runs from the pump up and over into the jar through a hole in the bridge plate; a second tube leaves a small drain hole near the jar bottom, passes a small blue plastic inline valve and returns to the box; a third overflow tube runs from near the jar top back down to the box. A red Water Sensor module lies flat in the front strip of the catch tray. Right of the platform a LOW white PVC-foam splash wall only 80 mm tall runs front to back. RIGHT electronics area, about 190 mm wide, everything lying flat on the base: at the BACK an Arduino Mega 2560 inside a clear acrylic case; in front of it on the left a small white breadboard 85 × 55 mm carrying an ESP-01 Wi-Fi module and a tiny AMS1117 regulator board; on the right a blue 1-channel 5 V relay module; at the front-left a DC barrel jack with blue screw terminal blocks; at the front-right a 5 V active buzzer module. Along the FRONT edge of the base, directly in front of the electronics area on the RIGHT side (not in front of the platform, the space in front of the platform stays empty), stands only a small vertical white PVC-foam panel, 110 mm wide and 72 mm tall, with a rectangular window holding a green-backlit 16×2 LCD that faces the viewer (LCD centre about 42 mm above the base) showing "Muc 40%  66mm". There is NO tall back panel and nothing mounted vertically behind the electronics. Short neat jumper wires (red, black, yellow, green) and a thin grey 4-core cable bundled with small cable ties.

**assembly-overview.png:** + Camera: three-quarter high angle from the front-left at about 35° elevation, the whole model in frame with some margin. + khối phong cách chung.

**assembly-front.png:** + Camera: straight front elevation at eye level with the base, 85 mm lens, the full width of the model in frame. + khối phong cách chung.

**assembly-tank.png:** + Camera: close-up of the jar area only, slightly above the jar mouth at a 25° angle: the HC-SR04 on the bridge plate, the water surface with a soft reflection, the silicone tube outlet, the catch tray and the red Water Sensor strip. + khối phong cách chung.

**assembly-pump.png:** + Camera: TIGHT close-up macro framing, 85 mm lens, from the front-left at 30°: ONLY the left clear water container fills the frame edge to edge; the black pump on its bottom is seen through the clear water and plastic with soft caustics, the clear tubes rise out of the container and leave the top of the frame, the blue inline valve on the return tube is in the lower right corner. The jar, the electronics and the rest of the model are OUT of frame. + khối phong cách chung.

**assembly-control.png:** + Camera: TIGHT close-up framing, 85 mm lens, from the front-right at 30°: ONLY the electronics area fills the frame: the green-backlit LCD panel at the top, the Arduino Mega in its clear acrylic case, the blue relay module with screw terminals, the ESP-01 on the small white breadboard, the buzzer, blue screw terminal blocks and the DC jack, with tidy cable-tied wiring. The jar, the water container and the pump are OUT of frame. + khối phong cách chung.

## Mô hình hoàn chỉnh, bản đơn giản (tỷ lệ 3:2)

**simple-overview.png:** A simpler student-built water-tank control model directly on a workbench (no base board): left, a clear plastic bottle-style container with water and a small black submersible pump; center, a clear PET jar 110 × 200 mm standing in a shallow white PVC-foam catch tray with a red Water Sensor in the tray; a clear 3 mm acrylic bar across the jar mouth holds an HC-SR04 pointing down; one clear silicone tube runs from the pump into the jar; right, a light-grey ABS project box about 250 × 80 × 70 mm with a green-backlit 16×2 LCD visible through a window cut in its lid and a cable gland on its side. Camera: three-quarter high angle from the front-left at about 35°. + khối phong cách chung.

## Tham chiếu vật liệu và bối cảnh cho chế độ Thực tế (tỷ lệ 3:2, tạo 19/11/2026)

Dùng để chỉnh mô hình 3D (màu tường, bàn gỗ, cửa sổ, độ trong của nước và ống, meniscus), không hiển thị thay mô hình. Prompt đầy đủ trong `ai/*.prompt.txt`.

**workspace-lab.png:** Wide environment photo of a small, clean university electronics lab corner in Vietnam. A light oak-laminate workbench 1.6 m wide and 0.8 m deep with a rounded front edge and a grey steel frame stands against a warm off-white painted wall. On the LEFT wall a large aluminium-framed window with frosted lower panes lets in soft diffused late-morning daylight, a few green leaves of a tree visible outside, casting a soft light patch across the bench. In the centre of the bench sits a student-built water-tank control model on a white PVC foam board base about 64 × 26 cm: a clear plastic box with water and a black mini pump on the left, a clear PET jar with water on a white foam platform in the middle with a small blue ultrasonic sensor on top, an Arduino Mega in a clear acrylic case and small blue modules on the right, a small green-backlit LCD panel at the front right, clear silicone tubes and colorful jumper wires. Around it, kept sparse and tidy: a green self-healing cutting mat partly under the right side, a yellow digital multimeter, a black 5 V power adapter with its cable running to the model. On the back wall a white metal pegboard with a few hand tools and a narrow wooden shelf holding two clear parts organiser boxes. Camera: three-quarter view from the front-right at standing eye height, 35 mm lens, the model sharp in the centre and the room softly out of focus. Calm, uncluttered, modern, warm neutral palette. + khối phong cách chung.

**jar-water.png:** Material reference photo, eye-level side view of a clear PET cylindrical jar, inner diameter 110 mm, 200 mm tall, thin smooth walls with a rolled rim, standing in a shallow white PVC-foam tray, filled to about 40 % with clean tap water. Clearly visible: the meniscus line at the water surface (a thin bright line with a darker band just below), the water surface seen slightly from above with a soft reflection of a window, the refraction that magnifies and shifts a paper millimetre ruler taped vertically to the back of the jar below the waterline, faint caustic light patterns on the tray floor, a clear silicone tube entering from the top. Very slight cyan tint only where the water is deep. Background softly blurred warm off-white wall. 85 mm lens at f/4. + khối phong cách chung.

**tubes-wires.png:** Macro material reference photo on a white PVC foam board (Formex, fine matte texture, slightly soft cut edges): a length of clear food-grade silicone tubing 6 mm inner diameter, 8 mm outer, slightly milky translucent with a soft specular highlight along its curve, partially filled with water with visible small air bubbles, bending in a gentle loop; next to it a loose bundle of Dupont jumper wires (red, black, yellow, green, white) with black plastic connector housings and glossy PVC insulation, one held by a small white nylon cable tie; and a short grey 4-core ribbon cable. Camera 40° above the surface, 100 mm macro lens, shallow depth of field. + khối phong cách chung.

## Texture bối cảnh chế độ Thực tế (nhúng trong `js/lab-tex.js`)

Tạo bằng Codex image generation, nén JPEG rồi nhúng base64 để chạy được khi mở `index.html` trực tiếp (WebGL không nạp ảnh file cục bộ). Mất file thì app dùng texture canvas dự phòng.

**oak:** Seamless tileable texture, perfectly flat orthographic top-down scan, no perspective, no shadows, no objects: light natural oak wood laminate desk surface, straight fine grain running horizontally, soft warm honey-beige tone (#c9a57a average), subtle cathedral grain and fine pores, very faint satin sheen, a few barely visible micro scratches. Even diffuse lighting, no vignette, no highlights. Must tile seamlessly left-right and top-bottom. Square image.

**wall:** Seamless tileable texture, flat orthographic scan, no perspective, no shadows: warm off-white cream painted plaster interior wall (#ebe2d2 average), fine matte roller paint stipple texture, extremely subtle tonal variation, no cracks, no stains, no objects. Even diffuse lighting, no vignette. Must tile seamlessly in both directions. Square image.

**window:** Photograph looking straight out through a window from inside a building in Vietnam on a bright late morning, used as a backdrop: in the foreground fills most of the frame the soft green leafy canopy of a nearby tree with sunlight filtering through, behind it a pale cream apartment block facade slightly out of focus, bright hazy sky at the top. Overexposed bright airy look, soft focus (shallow depth of field), no window frame visible, no glass reflections, no people, no text. 3:2 landscape.

**gobo:** Black and white light pattern image for a projector gobo: soft dappled sunlight falling through a window with tree leaves, seen as flat light patches on a surface. Pure black background with soft-edged bright white irregular blobs of light (leaf-filtered sunlight), arranged inside the rough shape of a window grid of four panes with thin dark mullions, edges slightly blurred. No color, no texture, no objects, high contrast. Square image.

