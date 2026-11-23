# Con lắc ngược CTMS: xe nhận lực, thanh tự chuyển động

Gói chứa `inverted_pendulum_multibody.slx`, `chay_pendulum_multibody.m` và hướng dẫn này.
Cần MATLAB R2022b trở lên, Simulink, Simscape và Simscape Multibody. Không cần Control System Toolbox để chạy gói.

## Chạy nhanh

Giải nén, chuyển Current Folder tới thư mục đó; mở `.slx`, bấm Run hoặc:

```matlab
out=chay_pendulum_multibody('pid_final');
```

Mặc định PID (100, 1, 20), góc đặt 0, xung nhiễu 1 N·s = 100 N trong 0,01 s bắt đầu ở 0,2 s; controller chưa chặn lực. Mô phỏng 10 s.
Mở Scope `Angle and rate`, `Cart position and speed`, `Control force and disturbance`.
Mechanics Explorer cho thấy xe–thanh 3D. Xe không có vòng vị trí; cần xem Scope xe trôi.

## Kịch bản

| Tên | Cấu hình |
| --- | --- |
| `pid1` | PID (1, 1, 1), 2 s, không đạt giữ góc |
| `pid100` | PID (100, 1, 1), đỉnh góc còn lớn |
| `pid_final` | PID (100, 1, 20), D lý tưởng dùng tốc độ góc đo |
| `no_integral` | PID (100, 0, 20) |
| `filtered` | Gain cuối, D có lọc N = 200 s⁻¹ |
| `limited` | Gain cuối, chặn lực controller ±10 N |
| `large_pulse` | Xung 2 N·s = 200 N × 0,01 s |

`[out,p]=chay_pendulum_multibody('pid_final',false)` chạy không mở cửa sổ và trả tham số.

## Dữ liệu

`out.phi_log` góc lệch rad (0 thẳng đứng lên, dương nghiêng về −x);
`out.omega_log` tốc độ góc rad/s; `out.x_log` vị trí xe m; `out.v_log` vận tốc xe m/s;
`out.u_log` lực controller N sau giới hạn; `out.u_requested_log` lực yêu cầu;
`out.d_log` lực nhiễu N. Mỗi biến là timeseries.

```matlab
plot(out.phi_log.Time-p.pulseStart,out.phi_log.Data); grid on
yline(.05);yline(-.05);
figure;plot(out.x_log.Time,out.x_log.Data);grid on
```

## Tham số Model Workspace

`M=.5kg`, `m=.2kg`, `b=.1N.s/m`, `I=.006kg.m²` quanh tâm thanh;
`l=.3m` từ khớp tới tâm, `g=9.8m/s²`, `Kp=100`, `Ki=1`, `Kd=20`,
`N=200`, `idealD=1`, `umax=Inf`, `pulseImpulse=1`, `pulseWidth=.01`, `pulseStart=.2`, `stopTime=10`.
`idealD=0` chọn D dùng tốc độ góc lọc N/(s+N).

```matlab
mdl='inverted_pendulum_multibody';load_system(mdl);
si=Simulink.SimulationInput(mdl);
si=si.setVariable('pulseWidth',.005,'Workspace',mdl);
si=si.setVariable('pulseImpulse',1,'Workspace',mdl);
out=sim(si);
```

Hàm chạy đặt lại tham số bằng SimulationInput; dùng cấu hình riêng qua SimulationInput nếu không muốn preset ghi đè. MaxStep=.0005s; xung ngắn hơn nhiều cần giảm bước và kiểm diện tích xung.

## Plant, phép thử và giới hạn

Cart joint là Prismatic: force input, computed motion, damping b. Pendulum joint là Revolute: không mômen input, computed motion. Rod có khối lượng m, COM cách khớp l, inertia I quanh tâm được chỉ định; inertia quanh khớp I + ml² = 0,024 kg·m². Gravity hướng xuống. Không áp đặt x(t) hoặc phi(t).

CTMS PID giữ góc 0 sau xung 1 N·s, yêu cầu đỉnh góc dưới 0,05 rad và lắng dưới 5 s. Không bám bước vị trí xe. Xe trôi là trạng thái chưa điều khiển. Giới hạn lực nằm trên controller; xung nhiễu cộng SAU giới hạn để vẫn có đúng diện tích 1 N·s. Mô hình chưa có anti-windup, đường ray hữu hạn, motor, ma sát khô, lấy mẫu hoặc nhiễu cảm biến. Điều kiện đầu thanh đứng, xe và thanh có vận tốc 0.

Phần CTMS dùng plant tuyến tính hóa và xung toán học lý tưởng. Gói dùng trọng lực/hình học phi tuyến và chữ nhật hữu hạn; so script phải dùng cùng xung trước khi so hai mô hình. D lý tưởng lấy tốc độ góc đo khi reference0; lọc D thay đáp ứng. Nếu thanh đã đổ nhiều, plant tuyến tính không còn xấp xỉ tốt.

Nguồn: https://ctms.engin.umich.edu/CTMS/index.php?example=InvertedPendulum&section=SystemModeling và section=ControlPID.
Phương trình/thông số và phần mở rộng này chia sẻ CC BY-SA4.0: https://creativecommons.org/licenses/by-sa/4.0/.
