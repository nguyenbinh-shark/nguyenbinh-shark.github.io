---
title: "Dự án Robot Điều Khiển Từ Xa"
excerpt: "Video demo xe robot hai bánh điều khiển từ xa<br/>"
collection: portfolio
---

Sau đây là video demo dự án **Robot xe hai bánh điều khiển từ xa**, được mình thực hiện bằng ESP32 và điều khiển qua Wi-Fi:

<iframe width="560" height="315"
  src="https://www.youtube.com/embed/TzDKLDsIgCA"
  title="Robot điều khiển từ xa"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>

---

##  Mô tả dự án

**Mục tiêu**:
- Thiết kế mô hình robot hai bánh điều khiển từ xa qua Wi-Fi, sử dụng vi điều khiển **ESP32**.

**Tính năng nổi bật**:
- Điều khiển di chuyển tiến/lùi/quay trái/phải thông qua giao diện web.
- Cảm biến tốc độ bánh xe (nếu có): để cân bằng và ổn định di chuyển.
- Giao diện điều khiển thân thiện, hiển thị tình trạng pin và trạng thái kết nối.

**Công nghệ sử dụng**:
- **Phần cứng**: ESP32, driver motor, bánh xe, pin.
- **Phần mềm front-end**: giao diện web đơn giản (HTML + CSS + JavaScript).
- **Giao thức**: ESP32 tạo Access Point hoặc kết nối Wi-Fi, người dùng dùng điện thoại để truy cập và điều khiển.

**Quá trình thực hiện**:
1. Lập trình ESP32 để làm web server có giao diện điều khiển.
2. Kết nối driver motor để điều khiển động cơ thông qua tín hiệu GPIO.
3. Thiết kế UI và xử lý sự kiện (touch/click).
4. Kiểm tra robot di chuyển, tối ưu độ trễ và phản hồi điều khiển.

---

##  Tại sao nên xem demo?

Video demo thể hiện robot di chuyển nhạy, điều khiển từ xa nhanh và ổn định — minh chứng rõ ràng cho cả kỹ năng phần cứng và phần mềm bạn đang có.

---

*Trần Nguyên Bình – Robotics & Mechatronics enthusiast*

