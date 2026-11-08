# Aircraft Pitch — Simscape Multibody

Cần MATLAB R2022b+, Simulink, Simscape và Simscape Multibody. Không cần Control System Toolbox để chạy bộ này.

## Chạy

Giữ `aircraft_pitch_multibody.slx`, `chay_aircraft_multibody.m` và hướng dẫn trong cùng thư mục. Chọn thư mục làm Current Folder, mở `.slx`, bấm Run. Mặc định PID cuối CTMS `(Kp,Ki,Kd)=(5.1852,1.74,2.98)`, lọc D `N=100 s^-1`, lệnh0,2rad, chạy100s. Mechanics Explorer cho thấy thân quay; bấm Play để xem.

```matlab
out = chay_aircraft_multibody('PID_CUOI');
out = chay_aircraft_multibody('CHONG_WINDUP');
out = chay_aircraft_multibody('PI', false);
```

`false` không mở cửa sổ mô hình/Explorer/đồ thị. Hàm dùng SimulationInput: không sửa tham số mặc định trong file.

| Kịch bản | Điều thay đổi |
| --- | --- |
| `P2` | P=2 |
| `P_TUNE` | P=1,1269 |
| `PI` | P=1,13; I=0,0263 |
| `PID_DAU` | P=1,0482; I=D=0,5241 |
| `PID_NHANH` | P=4,17; I=1,2882; D=0,26 |
| `PID_CUOI` | P=5,1852; I=1,74; D=2,98 |
| `GIOI_HAN` | Cánh lái giới hạn±25° |
| `CHONG_WINDUP` | Cùng giới hạn, tích phân có điều kiện |
| `NHIEU_MOMEN` | Thêm gia tốc góc0,02rad/s² từ giây20 |
| `LOC_D_CHAM` | N=10 thay cho100 |

## Đọc mô hình

Hai Scope: **Pitch reference and actual** (góc thânrad); **Elevator requested and applied** (góc cánh láirad trước/sau giới hạn). Tín hiệu `theta_log`, `omega_log`, `alpha_log`, `delta_requested_log`, `delta_log` là Timeseries trong `out`.

Subsystem **Aerodynamic Multibody plant** dùng khớp quay nhận mô-men, Motion=Automatically Computed. Tốc độ vật lý `omega=56.7*q` theo cách chuẩn hóa của CTMS. Khối Alpha state tích phân khí động; Aerodynamic moment cấp `Jpitch*(-.78813*alpha-.426*omega+1.15101*delta)`. Tổng quán tính vật rắn đúng bằng Jpitch. Jpitch=1kg·m² và hình máy bay chỉ dùng chuẩn hóa/hiển thị, không phải dữ liệu một máy bay thật.

Trọng lực bằng0 vì xét độ lệch quanh trạng thái bay cân bằng. Mô hình không tính đường bay, độ cao hoặc sáu bậc tự do. Đạo hàm là `Kd*N*s/(s+N)`, khác D lý tưởng của các công thức CTMS. Mặc định chưa giới hạn: D của bước đặt có thể tạo lệnh cánh lái rất lớn. ±25°, lọc D và nhiễu mô-men là phần thực hành bổ sung. Chưa có giới hạn tốc độ cánh lái.

## Đổi tham số

```matlab
mdl='aircraft_pitch_multibody'; load_system(mdl);
in=Simulink.SimulationInput(mdl);
in=in.setVariable('N',30,'Workspace',mdl);
in=in.setVariable('deltaMax',25*pi/180,'Workspace',mdl);
out=sim(in);
plot(out.theta_log.Time,out.theta_log.Data); grid on
```

Mẫu cuối là kết quả hữu hạn; cần xem đáp ứng đã lắng trước khi gọi là xác lập.

Nguồn: [CTMS Modeling](https://ctms.engin.umich.edu/CTMS/index.php?example=AircraftPitch&section=SystemModeling), [CTMS PID](https://ctms.engin.umich.edu/CTMS/index.php?example=AircraftPitch&section=ControlPID), [MathWorks Revolute Joint](https://www.mathworks.com/help/sm/ref/revolutejoint.html). Phỏng theo CTMS, [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/).
