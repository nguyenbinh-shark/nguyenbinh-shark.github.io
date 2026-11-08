# Động cơ DC — tốc độ trên Simscape Multibody

Gói chỉ có `motor_speed_multibody.slx`, `chay_motor_speed_multibody.m` và hướng dẫn này. Cần MATLAB R2022b trở lên, Simulink, Simscape, Simscape Multibody. Hàm chạy không cần Control System Toolbox.

## Mở và chạy

1. Giải nén ZIP vào một thư mục, chọn làm Current Folder trong MATLAB.
2. Mở `motor_speed_multibody.slx`, bấm Run. Mặc định `PID100_200_10`, góc/tốc độ đặt 1 rad/s, chưa giới hạn điện áp.
3. Mechanics Explorer hiển thị vỏ cố định và rotor cam. Bấm Play để xem lại; giảm playback speed nếu chuyển động quá nhanh.
4. Mở Scope **Reference and actual**, **Voltage requested and applied**, **P I D voltage**. Đơn vị đầu ra rad/s, điện áp V.

```matlab
out = chay_motor_speed_multibody('PID100_200_10');
out = chay_motor_speed_multibody('PID100_200_10',false); % chỉ lấy dữ liệu
```

## Kịch bản có sẵn

`VONG_HO`, `P100`, `PID75_1_1`, `PID100_200_1`, `PID100_200_10`, `GIOI_HAN`, `CHONG_WINDUP`, `TAI_CO`, `QUAN_TINH_LON`.

`VONG_HO`: điện áp 1 V. `PID75_1_1` chạy 600 s để thấy đuôi tích phân chậm.

`GIOI_HAN`/`CHONG_WINDUP`: giới hạn điện áp ±12 V, I liên tục/có điều kiện. `TAI_CO`: tải cơ 0.01 N*m ở t=3 s. `QUAN_TINH_LON`: tăng riêng J 20%. Các giới hạn nguồn/tải cơ này là ví dụ bổ sung, không phải định mức CTMS.

## Đọc phần vật lý

**Physical plant**: `Voltage balance` tính V−R*i−K*omega; `Inverse inductance` và `Armature current` giải L*di/dt. Dòng nhân K thành mômen. `Torque to joint` cấp mômen cho Revolute Joint; khớp tự tính góc/tốc độ với damping b.

Rotor là Brick Solid 0.16×0.05×0.025 m, khối lượng 12*J/(0.16^2+0.05^2), nên Izz=J. Rotor offset chỉ dọc trục quay. Vỏ cố định với World, không cộng quán tính quay. Torque: Provided by Input; Motion: Automatically Computed. Không có chuyển động góc đặt sẵn để làm animation.

Phần điện giải bằng khối Simulink, phần cơ bằng Simscape Multibody. Chưa có PWM, encoder, hộp số, ma sát khô, tải đàn hồi, giới hạn dòng hoặc nhiệt.

## Tham số và kết quả

Model Workspace lưu sẵn `J,b,K,R,L,r,Kp,Ki,Kd,Tf,umax,antiWindup,openLoop,openVoltage,voltageDisturbance,loadTorque,disturbanceTime,stopTime`.

CTMS dùng D lý tưởng. File dùng **Kd*s/(Tf*s+1)** với Tf=0.001 s; phải giữ Tf>0. Ở bước lệnh 1 từ trạng thái 0, điện áp yêu cầu ban đầu Kp+Kd/Tf. Chưa giới hạn nguồn thì có thể rất lớn; đây không phải một thiết kế nguồn/driver.

```matlab
mdl = 'motor_speed_multibody'; load_system(mdl);
in = Simulink.SimulationInput(mdl);
in = in.setVariable('umax',12,'Workspace',mdl);
in = in.setVariable('antiWindup',1,'Workspace',mdl);
out = sim(in);
plot(out.omega_log.Time,out.omega_log.Data); grid on
```

Hàm dùng SimulationInput, không ghi đè mặc định; bấm Run trực tiếp sẽ dùng lại mặc định. Kết quả: `theta_log` rad, `omega_log` rad/s, `current_log` A, `torque_log` N*m, `u_requested_log`, `u_log`, `armature_voltage_log`, `p_log`, `integral_log`, `d_log` V. Điện áp phần ứng là u_log cộng nhiễu điện áp ngoài.

Mẫu cuối là giá trị ở thời gian hữu hạn, không tự là giá trị xác lập. Bộ giải ode15s giữ cả điện cảm và trạng thái dòng điện. Gói được kiểm trên MATLAB R2022b; đồ thị/bảng bài viết lấy từ chạy thật và so với hàm truyền dùng cùng D lọc khi chưa bão hòa.

## Nguồn và giấy phép

Thông số, phương trình và các bộ PID dựa trên CTMS — University of Michigan, Carnegie Mellon University, University of Detroit Mercy:
https://ctms.engin.umich.edu/CTMS/index.php?example=MotorSpeed&section=ControlPID
https://ctms.engin.umich.edu/CTMS/index.php?example=MotorSpeed&section=SystemModeling

Rotor Multibody, lời giải thích, D lọc, giới hạn nguồn và tải cơ là phần chuyển thể/bổ sung. Chia sẻ theo CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/ .
