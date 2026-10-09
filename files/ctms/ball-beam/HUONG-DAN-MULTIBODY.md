# Ball & Beam CTMS: mô hình Multibody tương đương góc nhỏ

Gói chứa `ball_beam_multibody.slx`, `chay_ball_beam_multibody.m` và hướng dẫn này.
Cần MATLAB R2022b trở lên, Simulink, Simscape và Simscape Multibody. Không cần Control System Toolbox để chạy gói.

## Chạy nhanh

Giải nén, chuyển Current Folder tới thư mục đó. Mở `.slx`, bấm Run; hoặc:

```matlab
out = chay_ball_beam_multibody('pd15_40');
```

Mặc định bước đặt 0,25 m, PD(15,40), D trên sai số với bộ lọc N=100 s^-1, không chặn góc. Các Scope là `Position reference and velocity` và `Servo and beam angle`.

## Kịch bản

| Tên | Cấu hình |
| --- | --- |
| `p1` | P=1, D=0, 70 s để quan sát dao động không tắt |
| `pd10_10` | P=10, D=10, N=100 |
| `pd10_20` | P=10, D=20, N=100 |
| `pd15_40` | P=15, D=40, N=100 |
| `d_measurement` | Cùng gain cuối, D trên vận tốc đo có lọc; 15 s |
| `limited` | D trên phép đo, giới hạn góc servo ±1 rad; 15 s |
| `filter10` | PD cuối, D trên sai số, N=10 |

Thêm `false` để không mở cửa sổ: `[out,p]=chay_ball_beam_multibody('limited',false)`.

## Dữ liệu trả về

`out.r_log` vị trí m; `out.v_log` vận tốc m/s; `out.reference_log` vị trí đặt m;
`out.theta_log` góc servo sau giới hạn rad; `out.theta_requested_log` góc trước giới hạn;
`out.alpha_log=(d/L)*theta` góc thanh tương đương rad. Mỗi biến là timeseries.

```matlab
plot(out.r_log.Time,out.r_log.Data); grid on
figure; plot(out.theta_log.Time,out.theta_log.Data); grid on
```

## Tham số và đổi tham số

Tất cả biến nằm trong Model Workspace; bấm Run trực tiếp không cần script chuẩn bị.
`m=.111 kg`, `R=.015 m`, `J=9.99e-6 kg.m²`, `g=9.8 m/s²`, `d=.03 m`, `L=1 m`;
`Kp=15`, `Kd=40`, `N=100`, `reference=.25`, `thetaMax=Inf`, `derivativeOnError=1`, `stopTime=10`.
`derivativeOnError=0` chọn D trên vận tốc đo.

```matlab
mdl='ball_beam_multibody'; load_system(mdl);
si=Simulink.SimulationInput(mdl);
si=si.setVariable('thetaMax',0.5,'Workspace',mdl);
si=si.setVariable('derivativeOnError',0,'Workspace',mdl);
si=si.setModelParameter('StopTime','15');
out=sim(si);
```

Hàm chạy đặt lại toàn bộ tham số kịch bản bằng SimulationInput. Nếu muốn cấu hình riêng, dùng đoạn trên thay vì sửa biến rồi gọi hàm chạy.

## Plant và giới hạn

Đây là tương đương tuyến tính CTMS, không phải mô hình tiếp xúc bóng–thanh phi tuyến.
Prismatic Joint nhận lực `m*g*(d/L)*theta`; motion tự tính. Khối lượng chuyển động là bóng `m` cộng vật rắn ẩn `J/R²` để có quán tính lăn tương đương. Network tắt trọng lực vì lực thành phần trọng trường đã được tính ở đầu vào. Không áp đặt vị trí hay quỹ đạo bóng.

Thanh minh họa trong Mechanics Explorer cố định ngang. Góc servo và góc thanh được ghi trong Scope, không giả thành động cơ hay thanh thật đang nghiêng. Mô hình chưa có giới hạn đầu thanh, lăn/trượt, độ trễ servo, điện áp, mômen động cơ hoặc ma sát.

CTMS dùng m=.111 và g=-9.8 trong code (m=.11 trong prose). Gói giữ m theo code, dùng độ lớn g dương và quy ước góc điều khiển dương tạo gia tốc vị trí dương. Kết quả `rddot=.21*theta` đúng dấu/hệ số code CTMS.

CTMS `pid(Kp,0,Kd)` dùng D lý tưởng trên sai số. Gói dùng lọc `Kd*N*s/(s+N)`; hai controller khác nhau và phải phân biệt khi so bảng. PD cuối với bước 0,25 m có góc servo đỉnh đầu khoảng 1003,75 rad, góc thanh 30,1125 rad: vượt phạm vi góc nhỏ. Đây là tín hiệu yêu cầu của bài toán lý tưởng, không phải chuyển động cơ cấu thật đã được xác thực. D trên phép đo tránh derivative kick nhưng đổi đáp ứng lệnh. Không có I nên không có integral windup.

Nguồn: https://ctms.engin.umich.edu/CTMS/index.php?example=BallBeam&section=SystemModeling và section=ControlPID.
Phương trình/thông số và phần mở rộng này chia sẻ theo CC BY-SA4.0: https://creativecommons.org/licenses/by-sa/4.0/.
