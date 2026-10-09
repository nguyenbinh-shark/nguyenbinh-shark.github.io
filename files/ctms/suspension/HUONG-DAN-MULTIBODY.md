# Hệ treo CTMS — hai khối lượng trong Simscape Multibody

Gói này gồm `suspension_multibody.slx`, `chay_suspension_multibody.m` và hướng dẫn này. Cần MATLAB R2022b trở lên, Simulink, Simscape và Simscape Multibody. Chạy mô hình không cần Control System Toolbox.

## Mở và chạy

1. Giải nén ba file vào cùng thư mục, chọn thư mục đó trong MATLAB.
2. Mở `suspension_multibody.slx`, bấm **Run**. Tham số lưu sẵn trong **Model Workspace**, không cần script khởi tạo.
3. Mechanics Explorer hiển thị khối lượng thân xe màu xanh và khối lượng bánh/cầu màu xám. Hai khớp trượt đứng nhận **lực** và tự tính chuyển động; không gán sẵn chuyển vị cho hai khối lượng.
4. Mở **Deflection and body motions**: thứ tự tín hiệu `q=x1-x2`, `x1`, `x2`, `w` (m). Mở **Force requested and applied** để xem lực yêu cầu/thực (N), **P I D force** để xem các nhánh (N).

```matlab
out = chay_suspension_multibody('PID_GAP_DOI');
out = chay_suspension_multibody('PID_BAN_DAU',false); % chỉ lấy dữ liệu
plot(out.q_log.Time,1000*out.q_log.Data); grid on % mm
```

## Các kịch bản

| Tên | Thay đổi |
| :--- | :--- |
| `VONG_HO` | Không điều khiển; chạy 80 s để thấy dao động chậm |
| `PID_BAN_DAU` | Code CTMS: Kp=832100, Ki=624075, Kd=208025 |
| `PID_GAP_DOI` | Nhân cả ba hệ số trên với 2; mặc định của file |
| `GIOI_HAN` | PID gấp đôi, chặn lực ±10000 N, không anti-windup |
| `CHONG_WINDUP` | Cùng giới hạn, bật back-calculation với hằng số 0.1 s |
| `DUONG_EM_HON` | Hằng số thời gian mặt đường 20 ms thay cho 1 ms |
| `THAN_NANG_HON` | Tăng m1 từ 2500 lên 3000 kg, giữ PID |

Hàm dùng `SimulationInput`; các thay đổi chỉ áp dụng cho lần chạy ấy. Bấm **Run** trong file sau đó lại dùng `PID_GAP_DOI` mặc định. Hàm từ chối dùng một mô hình trùng tên đang mở từ thư mục khác.

## Ý nghĩa vật lý và phạm vi

Các chuyển vị `x1`, `x2`, `w` là **độ lệch quanh cân bằng tĩnh đã chịu tải**. Gravity đặt bằng 0 để không cộng trọng lực lần nữa vào phương trình biến lệch. Độ cao hình học ban đầu chỉ để nhìn hai khối lượng tách nhau; không phải chuyển vị `x1`, `x2` trong CTMS.

Khối lượng `m1=2500 kg`, `m2=320 kg`; `k1=80000`, `k2=500000 N/m`; `b1=350`, `b2=15020 N.s/m`. Lực tác dụng:

```text
q  = x1-x2
F1 = u-k1*q-b1*(v1-v2)
F2 = -u+k1*q+b1*(v1-v2)-k2*(x2-w)-b2*(v2-wdot)
```

Lực lò xo, giảm chấn và actuator giữa hai khối lượng xuất hiện với dấu đối nhau. Phần **Physical plant** tính các lực từ vị trí/vận tốc đo được rồi đưa chúng vào khớp thông qua converter đơn vị N. Khối vật rắn và khớp của Multibody tính gia tốc/chuyển động theo lực. Mô hình chưa có tiếp xúc lốp, mất tiếp xúc đường, ma sát, phi tuyến lò xo, giới hạn hành trình, pitch/roll hoặc động học cả xe.

**Hai khác biệt cần giữ khi so với code CTMS:**

- CTMS dùng D lý tưởng `Kd*s`; gói dùng `Kd*s/(Tf*s+1)` với `Tf=0.0001 s` để D không tăng vô hạn ở tần số cao.
- CTMS dùng bước mặt đường lý tưởng 0.1 m. Qua giảm chấn lốp, bước này tạo xung lực vì `wdot` là xung. Gói dùng bước qua `1/(roadTau*s+1)`, `roadTau=0.001 s`, bắt đầu tại 0.5 s. `wdot=(step-w)/roadTau`, nên chuyển động đường và lực ban đầu hữu hạn. Đường là biên nhiễu; chuyển động hai khối lượng vẫn do lực quyết định.

Giới hạn ±10 kN và back-calculation là **ví dụ học thêm**, không phải thông số actuator được CTMS cung cấp. Anti-windup chỉ giảm tích lũy của I khi bão hòa; không tạo thêm lực và không bảo đảm đạt tiêu chí khi đường quá gắt.

## Tự đổi tham số

```matlab
mdl='suspension_multibody'; load_system(mdl);
in=Simulink.SimulationInput(mdl);
in=in.setVariable('umax',15000,'Workspace',mdl);
in=in.setVariable('antiWindup',1,'Workspace',mdl);
out=sim(in);
```

`Tf`, `roadTau` phải dương. `umax=Inf` bỏ giới hạn. `antiWindup=0/1` tắt/bật bù ngược. Có thể thay `Kp`, `Ki`, `Kd`, các thông số `m1`, `m2`, `k1`, `k2`, `b1`, `b2`, `roadHeight`, `roadTime`, `stopTime`.

Kết quả: `q_log`, `x1_log`, `x2_log`, `v1_log`, `v2_log`, `road_log`, `u_log` (sau giới hạn), `u_requested_log`, `p_force_log`, `i_force_log`, `d_force_log`, đều là timeseries. Đơn vị SI như trên. Giá trị mẫu cuối là kết quả hữu hạn, chưa tự động là xác lập.

## Nguồn và giấy phép

[CTMS Suspension — System Modeling](https://ctms.engin.umich.edu/CTMS/index.php?example=Suspension&section=SystemModeling) và [PID](https://ctms.engin.umich.edu/CTMS/index.php?example=Suspension&section=ControlPID), University of Michigan và cộng tác viên. Hệ số theo **code chạy được** của tutorial; đoạn văn ngay trước code đang đảo tên ba hệ số. Mô hình vật lý, lọc D, đường hữu hạn và khảo sát giới hạn là phần chuyển thể/bổ sung. Chia sẻ theo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
