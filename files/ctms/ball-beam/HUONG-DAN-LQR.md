## Hướng dẫn chạy mô phỏng Ball & Beam LQR

1. Mở MATLAB và di chuyển đến thư mục chứa các file này.
2. Chạy lệnh:
   ```matlab
   build_ball_beam_lqr
   ```
   Lệnh này sẽ tạo ra file Simulink `ball_beam_lqr_multibody.slx` với cấu trúc vật lý Multibody, trong đó sử dụng mô-men xoắn (torque) ở khớp xoay của thanh làm đầu vào điều khiển.

3. Để chạy các kịch bản thử nghiệm, dùng:
   ```matlab
   chay_ball_beam_lqr('CTMS_LQR')
   ```
   Hoặc:
   ```matlab
   chay_ball_beam_lqr('LQR_BRYSON')
   ```

### Các kịch bản:
* **CTMS_LQR**: Sử dụng bộ hệ số $K$ thiết kế từ hướng dẫn CTMS, nhưng được áp dụng lên mô hình vật lý sử dụng lực xoắn thay vì giả định điều khiển trực tiếp gia tốc thanh.
* **LQR_BRYSON**: Dùng hệ số $K$ thiết kế theo chuẩn luật Bryson trên toàn bộ hệ động lực học đã tuyến tính hóa của mô hình vật lý (Torque).

Cửa sổ Simulink sẽ mở ra để bạn có thể xem mô phỏng Multibody của thanh xoay và quả bóng. Các scope sẽ hiện kết quả đáp ứng tương tự như phân tích trên trang.

