# Mô phỏng Cruise Control bằng Simscape Multibody

Gói này đi cùng bài **PID 1 — Cruise Control** của loạt Điều khiển qua 7 ví dụ CTMS.

Cần **MATLAB R2022b trở lên, Simulink, Simscape và Simscape Multibody**. Mô hình và hàm chạy không cần Control System Toolbox.

| File | Dùng để làm gì? |
| --- | --- |
| `cruise_control_multibody.slx` | Xe 3D chuyển động dọc đường, nhận lực từ bộ P/PI |
| `chay_cruise_multibody.m` | Chọn chín kịch bản, mở mô hình và vẽ các tín hiệu |
| `HUONG-DAN-MULTIBODY.md` | Hướng dẫn chạy, đọc Scope và thay tham số |

## Chạy lần đầu

1. Giải nén gói, giữ ba file cùng thư mục.
2. Chọn thư mục đó làm **Current Folder** trong MATLAB.
3. Mở `cruise_control_multibody.slx`, bấm **Run**. Các tham số có sẵn trong **Model Workspace**; xe đứng yên ban đầu, PI `(800, 40)` và lệnh 10 m/s.
4. Trong **Mechanics Explorer**, bấm **Play** để xem chuyển động. Camera **Follow vehicle** đi theo xe.
5. Mở ba Scope để xem cùng chuyển động ấy qua các tín hiệu:

| Scope | Xem gì? |
| --- | --- |
| **Speed reference and actual** | Tốc độ đặt và tốc độ đo, m/s |
| **Force requested and applied** | Lực yêu cầu trước giới hạn và lực thực cấp cho xe, N |
| **P and I force** | Lực từ P và lực tích lũy của I, N |

Mặc định, tốc độ tiến tới 10 m/s, lực giữ tốc độ tiến tới 500 N. P giảm về 0; I giữ lực bù lực cản. Để chạy mô hình và vẽ cả ba đồ thị:

```matlab
out = chay_cruise_multibody('PI800_40');
```

## Chọn các lần thử của bài

| Kịch bản | Tham số chính | Câu hỏi khi quan sát |
| --- | --- | --- |
| `P100` | Kp = 100, Ki = 0 | Vì sao tốc độ chỉ tới khoảng 6,667 m/s? |
| `P5000` | Kp = 5000, Ki = 0 | Lực ban đầu 50.000 N có phù hợp với xe thật không? |
| `PI600_1` | Kp = 600, Ki = 1; chạy 1200 s | Vì sao phần sửa sai số còn lại kéo dài? |
| `PI800_40` | Kp = 800, Ki = 40 | Khi đúng tốc độ, nhánh I còn giữ lực gì? |
| `GIOI_HAN` | PI800_40, giới hạn ±1500 N | Lực yêu cầu và lực thực khác nhau ở đâu? |
| `CHONG_WINDUP` | Cùng giới hạn, bật tích phân có điều kiện | Bộ nhớ I và vọt lố thay đổi thế nào? |
| `TAI_200N` | Thêm tải cản 200 N ở giây 20 | I bù thêm bao nhiêu lực để giữ 10 m/s? |
| `XE_NANG_HON` | Tổng khối lượng 1200 kg | Cùng PI, xe nặng hơn tăng tốc thế nào? |
| `CAN_LON_HON` | Hệ số lực cản 60 N·s/m | Vì sao thời gian lắng và lực giữ tốc độ đổi? |

```matlab
out = chay_cruise_multibody('P100');
out = chay_cruise_multibody('CHONG_WINDUP');
out = chay_cruise_multibody('TAI_200N');
```

Hàm dùng `SimulationInput` nên tham số chỉ áp dụng cho lần chạy ấy. Bấm **Run** trực tiếp trong `.slx` sau đó sẽ dùng lại mặc định. Tham số thứ hai `false` chạy lấy dữ liệu mà không mở mô hình, Explorer hay đồ thị:

```matlab
out = chay_cruise_multibody('P100', false);
```

## Nối các khối với chiếc xe

Mở subsystem **Physical plant**:

| Khối hoặc thông số | Vai trò |
| --- | --- |
| **Vehicle body**, cabin, bốn bánh | Vật rắn 3D, tổng khối lượng `m` |
| **Longitudinal joint** — Prismatic Joint | Một chuyển động dọc đường, giữ độ cao và hướng xe |
| **Damping Coefficient = b** | Lực cản ngược chiều vận tốc, độ lớn `b*v` |
| **Drive force minus load** | Lực kéo thực trừ tải cản |
| **Force to joint** | Đưa lực vào khớp, đơn vị N |
| **Speed to Simulink** | Đưa tốc độ đo về bộ điều khiển, đơn vị m/s |
| **Position to Simulink** | Ghi vị trí thành `x_log`, đơn vị m |
| **Road scene** | Đường và vạch đường để quan sát chuyển động |

Trong khớp, **Force = Provided by Input**, **Motion = Automatically Computed**: bộ điều khiển cấp lực, phần vật lý tính chuyển động. Lực cản được tính bên trong khớp. Tổng khối lượng chuyển động là thân `0.85*m`, cabin `0.10*m` và mỗi bánh `0.0125*m`.

Xe chỉ chuyển động dọc đường. Bánh minh họa gắn cứng vào thân; chưa có quay bánh, tiếp xúc lốp–đường, hệ treo, động cơ hay đánh lái. Đường là cảnh hiển thị. Đây là mô hình học điều khiển theo giả thiết CTMS.

## Tự đổi tham số và đọc kết quả

```matlab
mdl = 'cruise_control_multibody';
load_system(mdl);
in = Simulink.SimulationInput(mdl);
in = in.setVariable('umax',1500,'Workspace',mdl);
in = in.setVariable('antiWindup',1,'Workspace',mdl);
out = sim(in);
v = out.v_log;
u = out.u_log;
x = out.x_log;
plot(v.Time,v.Data); grid on
```

| Biến | Mặc định | Thay để làm gì? |
| --- | --- | --- |
| `m`, `b`, `r` | 1000, 50, 10 | Đổi khối lượng, lực cản hoặc tốc độ đặt |
| `Kp`, `Ki` | 800, 40 | Đổi bộ điều khiển; `Ki = 0` là P |
| `umax` | `Inf` | Đặt 1500 để giới hạn lực ±1500 N |
| `antiWindup` | 0 | Đặt 1 để tích phân có điều kiện |
| `disturbanceAmplitude` | 0 | Đặt 200 để thêm tải cản 200 N |
| `disturbanceTime` | 20 | Thời điểm xuất hiện tải, s |
| `stopTime` | 120 | Thời gian mô phỏng, s; PI600_1 dùng 1200 s |

Các tín hiệu ghi lại: `v_log`, `x_log`, `u_log`, `u_requested_log`, `proportional_force_log`, `integral_force_log`. Mẫu cuối là kết quả tại thời điểm cuối mô phỏng; cần kiểm tra quá trình đã lắng trước khi coi đó là giá trị xác lập.

Gói đã được chạy đủ chín kịch bản trên MATLAB R2022b từ một thư mục riêng chỉ chứa ba file ở trên. Hai trường hợp P được kiểm tra vị trí, tốc độ và lực theo lời giải phương trình xe; các lần thử PI kiểm tra thời gian đáp ứng, giới hạn lực, tổng lực P/I và tham số mặc định sau khi chạy.

## Nguồn

Thông số và trình tự P → PI dựa trên [CTMS — Cruise Control PID](https://ctms.engin.umich.edu/CTMS/index.php?example=CruiseControl&section=ControlPID). Giới hạn ±1500 N, tải 200 N và thay tham số +20% là các ví dụ bổ sung, không phải số đo một chiếc xe thật. Xem [MathWorks — Prismatic Joint](https://www.mathworks.com/help/sm/ref/prismaticjoint.html) để đọc cấu hình khớp. Tài nguyên phỏng theo CTMS được chia sẻ theo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
