## Hướng dẫn chạy mô phỏng Inverted Pendulum LQR

1. Mở MATLAB và di chuyển đến thư mục chứa các file này.
2. Chạy lệnh:
   ```matlab
   build_inverted_pendulum_lqr
   ```
   Lệnh này sẽ tạo ra file Simulink `inverted_pendulum_lqr_multibody.slx`. Mô hình này sử dụng bộ điều khiển LQR với một bộ quan sát trạng thái (Observer). Bộ quan sát chỉ đo vị trí xe và góc con lắc để ước lượng vận tốc.

3. Để chạy kịch bản mô phỏng LQR, dùng:
   ```matlab
   chay_inverted_pendulum_lqr('CTMS_LQR')
   ```

Cửa sổ Simulink sẽ hiển thị mô phỏng 3D của hệ thống Multibody. Lực đẩy (tối đa 10 N) sẽ di chuyển xe tới $0.2$ m trong khi vẫn giữ con lắc cân bằng dựng đứng. Các Scope bên trong mô hình lưu trữ đáp ứng trạng thái $x$ thật và $x$ ước lượng để bạn có thể so sánh hiệu suất của bộ quan sát.

