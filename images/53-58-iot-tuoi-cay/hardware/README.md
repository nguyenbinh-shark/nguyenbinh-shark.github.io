# Ảnh phần cứng thực tế — Hệ thống Tưới nhỏ giọt IoT

Thư mục này chứa ảnh chụp phần cứng thực tế hiển thị khi người xem bấm vào các khối thiết bị (hoặc nhãn `📷 Ảnh`) trong 6 mô phỏng tương tác tại `files/iot-tuoi-cay/demo1..6.html`.

## Quy tắc gắn ảnh (Drop-in tự động)

Chỉ cần chép đúng tên file `.jpg` vào thư mục này (`images/53-58-iot-tuoi-cay/hardware/`). Không cần sửa HTML: khi file tồn tại, giao diện tự động ẩn khung chờ và hiển thị ảnh thật; khi chưa có file, giao diện tự động hiện khung mô tả thông số kỹ thuật và đường dẫn cần bổ sung.

| STT | Tên file mặc định | Thành phần phần cứng | Gợi ý góc chụp rõ nhất |
| :--- | :--- | :--- | :--- |
| 1 | `stm32f401rct6.png` | Bo mạch trung tâm `STM32F401RCT6` (LQFP64) | **Đã gắn ảnh thực tế** |
| 2 | `modem_ec600n_4g.jpg` | Module 4G LTE `Quectel EC600N` & ăng-ten | **Đã gắn ảnh thực tế** |
| 3 | `esp32_ota_swd.jpg` | Board `ESP32` nạp Firmware OTA qua SWD | **Đã gắn ảnh thực tế** |
| 4 | `cam_bien_am_dat.png` | 4 Cảm biến độ ẩm đất điện dung | **Đã gắn ảnh mẫu thực tế** — Cảm biến điện dung v2.0 HW-390 ([lkcg.vn](https://lkcg.vn/cam-bien-do-am-dien-dung-dau-ra-analog-mau-den)) |
| 5 | `cam_bien_aht30.jpg` | Cảm biến nhiệt độ & độ ẩm không khí `AHT30` | **Đã gắn ảnh thực tế** |
| 6 | `bom_nuoc_12v.jpg` | Máy bơm nước mini 12V DC | **Đã gắn ảnh thực tế** |
| 7 | `tu_dien_tong_the.jpg` | Toàn cảnh tủ điều khiển & mô hình 3 hàng cây | Toàn cảnh hộp điện đặt cạnh mô hình 3 hàng × 4 chậu (12 chậu) và nguồn 12V/5V/3.3V |

## Thêm nhiều góc chụp hoặc đổi định dạng ảnh (`.png`, `.webp`)

Nếu muốn dùng định dạng khác hoặc thêm nhiều ảnh cho một linh kiện, chỉnh mảng `photos` của mục tương ứng trong file [`files/iot-tuoi-cay/hardware-photos.js`](../../../files/iot-tuoi-cay/hardware-photos.js):

```js
photos: [
  { file: "stm32f401rct6.jpg", label: "Mặt trên bo STM32F401RCT6", hint: "..." },
  { file: "stm32f401rct6_pinout.png", label: "Sơ đồ đấu dây thực tế", hint: "..." }
]
```
