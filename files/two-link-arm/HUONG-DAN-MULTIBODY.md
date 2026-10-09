# Mô hình tay máy hai khâu dùng PID trong Simscape Multibody

> Trong giai đoạn tự dựng, file mô hình hoàn chỉnh và gói ZIP tạm thời chưa mở tải. Hãy dựng cơ hệ và hai vòng PID theo mục 2–4 của [Bài 6](https://nguyenbinh-shark.github.io/posts/2026/10/simscape-multibody-pid-tay-may-hai-khau/). Script và số liệu vẫn được cung cấp để tham khảo, đối chiếu; script không tự tạo mô hình.

## Yêu cầu

- MATLAB/Simulink R2022b trở lên.
- Simscape và Simscape Multibody.
- Không cần CAD, Robotics System Toolbox hoặc PID Tuner để chạy mô hình mặc định.

## Chạy nhanh

1. Lưu mô hình tự dựng với tên `two_link_arm_pid.slx`, tải `chay_two_link_arm_pid.m` và đặt trong cùng một thư mục. Khi gói tham khảo được mở tải trở lại, có thể giải nén gói để dùng mô hình mẫu. Mô hình tự dựng cần dùng tên biến Model Workspace và tín hiệu log khớp với script.
2. Mở MATLAB tại thư mục đó.
3. Chạy:

```matlab
[out,metrics] = chay_two_link_arm_pid('PID_CO_TRONG_LUC',true);
```

Mô hình `two_link_arm_pid.slx` cũng có thể mở và chạy trực tiếp. Cấu hình lưu sẵn dùng tải `payloadMass = 0.20 kg`. Các kích thước, khối lượng, gain, góc đặt và giới hạn mô-men nằm trong **Model Workspace**, nên mô hình không phụ thuộc Base Workspace hay script khởi tạo.

Gói tham khảo sẽ được mở tải sau giai đoạn tự dựng, gồm:

| File | Dùng để làm gì |
|---|---|
| `two_link_arm_pid.slx` | Mô hình Simulink + cơ hệ Simscape Multibody |
| `chay_two_link_arm_pid.m` | Chọn kịch bản, mô phỏng, tính chỉ số và vẽ đồ thị |
| `results.csv`, `results.json` | Kết quả năm kịch bản đã chạy khi xuất bản bài |
| `HUONG-DAN-MULTIBODY.md` | Hướng dẫn này |

## Các kịch bản

| Tên đưa vào hàm | Thời gian | Tải | Điều cần quan sát |
|---|---:|---:|---|
| `P_KHONG_TRONG_LUC` | 5 s | 0 | P đơn thuần, không trọng lực: sai số và tương tác khớp vẫn xuất hiện |
| `PD_CO_TRONG_LUC` | 15 s | 0 | D hãm chuyển động, nhưng PD còn sai số để tạo mô-men chống trọng lực |
| `PID_CO_TRONG_LUC` | 15 s | 0 | I tích lũy mô-men giữ và giảm sai số cuối |
| `PID_MANG_TAI` | 15 s | 0,20 kg | Giữ nguyên gain, thêm tải ở đầu tay |
| `HAI_KHOP_TUONG_TAC` | 10 s | 0,20 kg | Giữ vai 2 s, rồi đổi điểm đặt khuỷu và xem mô-men vai thay đổi |

Ví dụ chạy tất cả theo thứ tự:

```matlab
scenarios = {'P_KHONG_TRONG_LUC','PD_CO_TRONG_LUC', ...
    'PID_CO_TRONG_LUC','PID_MANG_TAI','HAI_KHOP_TUONG_TAC'};
for k = 1:numel(scenarios)
    [out{k},metrics{k}] = chay_two_link_arm_pid(scenarios{k},true);
end
```

Hàm dùng `Simulink.SimulationInput`, vì vậy chạy một kịch bản không ghi đè các giá trị mặc định đã lưu trong file mô hình.

`metrics` trả về thời lượng chạy, sai số cuối, tích phân trị tuyệt đối sai số (IAE), mô-men đỉnh và phần trăm **thời gian** mô-men nằm ở giới hạn. Kịch bản tương tác còn trả về độ lệch vai lớn nhất trước và sau lệnh khuỷu. Vì mô hình dùng solver bước biến thiên, tỷ lệ bão hòa được tính theo thời gian tích phân chứ không đếm số mẫu. Chỉ so trực tiếp IAE của các lần chạy có cùng thời lượng.

## Quy ước

- Tay máy chuyển động trong mặt phẳng World `XY`; trọng lực theo `-Y`.
- Hai khớp quay quanh `+Z`; ngược chiều kim đồng hồ là chiều dương.
- `q1` là góc khâu 1 so với `+X` của World.
- `q2` là góc khâu 2 so với khâu 1. Góc tuyệt đối của khâu 2 là `q1 + q2`.
- Hai khâu là `Brick Solid` đồng chất, khối tâm ở chính giữa, quán tính được tính từ hình học.
- Tải ở đầu tay là `Spherical Solid`; dùng `payloadMass = 0.20` kg trong cấu hình chạy trực tiếp, kịch bản mang tải và kịch bản tương tác hai khớp.
- Trong kịch bản không tải, runner đặt `payloadMass = 0`; biểu thức của Solid giữ một khối lượng số học `1e-6 kg` để tránh vật rắn có khối lượng bằng 0. Giá trị này không đại diện cho tải thật.

## Thông số mặc định trong Model Workspace

| Nhóm | Giá trị |
|---|---|
| Khâu 1 | `l1 = 0.40 m`, `m1 = 1.00 kg` |
| Khâu 2 | `l2 = 0.30 m`, `m2 = 0.60 kg` |
| Tiết diện hai thanh | `0.04 × 0.02 m` |
| Tải khi mở model và Run trực tiếp | `payloadMass = 0.20 kg` |
| Trọng lực | `[0 -9.80665 0] m/s^2` |
| Vai | `Kp1 = 35`, `Ki1 = 10`, `Kd1 = 4`, `tau1_max = 12 N.m` |
| Khuỷu | `Kp2 = 12`, `Ki2 = 3`, `Kd2 = 0.8`, `tau2_max = 4 N.m` |
| Bộ lọc D | `Nfilter = 40` |
| Chu kỳ hai PID | `Ts_pid = 0.001 s` (1 kHz) |
| Tốc độ đổi góc đặt | `refRate = 45 deg/s` |

Các gain trên là một bộ khởi đầu đã chạy được với đúng mô hình trong gói. Khi đổi chiều dài, khối lượng, tải hoặc giới hạn mô-men, hãy xem chúng là điểm xuất phát và đánh giá lại đáp ứng.

## Các khối điều khiển

Robot có **hai bậc tự do cơ khí** là hai tọa độ `q1`, `q2`. Cụm **(2DOF)** trong tên block PID lại có nghĩa khác: bộ điều khiển có hai trọng số điểm đặt `b`, `c`. Mỗi block vẫn chỉ điều khiển **một** khớp, nên mô hình dùng hai block **PID Controller (2DOF)** có sẵn của Simulink.

Trước mỗi PID, file mẫu đổi cả điểm đặt và góc đo về góc tương đối so với tư thế khởi tạo:

```text
r_tilde = q_ref - q_initial
y_tilde = q     - q_initial
```

Vì `r_tilde - y_tilde = q_ref - q`, sai số P/I không đổi. Với `c = 0`, nhánh D nhận `-y_tilde`, bằng 0 ở lúc bắt đầu; trạng thái lọc D bằng 0 vì vậy không tạo cú giật mô-men giả tại `t = 0`. Scope và các biến log vẫn ghi góc khớp gốc: `q1` so với World, `q2` so với khâu 1.

Cấu hình mỗi PID:

- Dạng Parallel, miền thời gian rời rạc (`Discrete-time`).
- Sample time: `Ts_pid = 0.001 s`; hai PID cập nhật đồng thời mỗi 1 ms.
- Integrator method: `Trapezoidal`; Filter method: `Backward Euler`.
- `b = 1`, `c = 0`: khâu D tác động lên tín hiệu đo, tránh derivative kick khi đổi góc đặt.
- Lọc D với `N = 40`.
- Giới hạn đầu ra ngay trong PID: vai `+-12 N.m`, khuỷu `+-4 N.m`.
- Anti-windup: `clamping`.

Khối PID tự áp dụng chu kỳ lấy mẫu trong tích phân và lọc D; nhập trực tiếp các gain trong bảng, không nhân `Ki` hay chia `Kd` thêm một lần cho `Ts_pid`. Cơ hệ Multibody vẫn liên tục, dùng solver `ode23t`, `Max step = 0.001 s`, `RelTol = 1e-6`, `AbsTol = 1e-8`. Đầu ra PID được giữ giữa hai lần cập nhật. Bước solver và chu kỳ PID là hai thiết lập khác nhau.

Trong kịch bản `HAI_KHOP_TUONG_TAC`, runner khởi tạo đóng góp I bằng mô-men giữ tĩnh `5.690 N.m` ở vai và `1.274 N.m` ở khuỷu. Tay nhờ đó đứng đúng tại `(30 deg, -60 deg)` trong 2 giây đầu; độ lệch sau đó mới gắn với lệnh chuyển động khuỷu. Hai kịch bản P/PD luôn dùng trạng thái I ban đầu bằng 0.

Trong hai `Revolute Joint`:

- **Torque** chọn `Provided by Input`.
- **Motion** chọn `Automatically Computed`.
- Bật **Position** và **Velocity sensing**.
- `PS-Simulink Converter` của góc dùng `rad`; converter vận tốc dùng `rad/s`.
- `Simulink-PS Converter` của mô-men dùng `N*m`.

Nếu chọn ngược hai chế độ actuation, Simscape sẽ ép chuyển động theo lệnh hoặc thiếu đầu vào mô-men; lúc đó PID không còn điều khiển cơ hệ như bài học.

## Đọc kết quả

- `q1_ref_log`, `q2_ref_log`: góc đặt sau `Rate Limiter`.
- `q1_log`, `q2_log`: góc joint đo từ Multibody.
- `w1_log`, `w2_log`: vận tốc góc.
- `tau1_log`, `tau2_log`: lệnh mô-men sau giới hạn của PID.

Mỗi biến là một `timeseries`. Dữ liệu từ `PS-Simulink Converter` có thể có kích thước `1×1×N`; script runner đã đưa các tín hiệu vô hướng về vectơ cột trước khi tính chỉ số và vẽ.

## Khi mô phỏng không chạy như mong đợi

- Kiểm tra đủ license Simscape và Simscape Multibody.
- Không đổi đồng thời chiều trục joint và dấu phản hồi.
- Nếu sửa chiều dài/khối lượng, kiểm tra lại giới hạn mô-men trước khi tăng gain.
- Mở các Scope `Shoulder angle`, `Elbow angle`, `Joint torques` và xem mô-men có chạm trần không.
- Nếu cơ cấu giật mạnh, giảm tốc độ thay đổi góc đặt `refRate`; đừng chỉ giảm bước solver.
- Kết quả trong gói đã chạy với PID rời rạc 1 ms, tích phân `Trapezoidal` và lọc D `Backward Euler`. Khi đổi chu kỳ hoặc phương pháp rời rạc hóa, hãy chạy lại các kịch bản và đánh giá lại gain.
- Khi chuyển lên vi điều khiển, dùng Timer 1 ms và kiểm tra nhiễu cảm biến, trễ tính toán, dao động chu kỳ cùng giới hạn động cơ thực.
