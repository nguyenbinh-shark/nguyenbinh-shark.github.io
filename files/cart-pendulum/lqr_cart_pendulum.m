%% lqr_cart_pendulum.m
% Simscape Multibody Robotics · Bài 8 — Từ Cascade-PID đến LQR
% Thiết kế LQR cho con lắc ngược trên xe đẩy, rồi so sánh với Cascade-PID của Bài 3
% trên mô hình phi tuyến (cú đẩy 15 N trong 50 ms tại t = 1 s).
%
% Quy ước: theta > 0 khi con lắc ngả về phía +x.
% Trạng thái s = [x; v; theta; omega], đầu vào u = F (N), luật điều khiển F = -K*(s - s_ref).
%
% Dùng làm InitFcn cho mô hình Simulink (chỉ tính A, B, K, Kd, không chạy phần so sánh):
%   chay_mo_phong = false; lqr_cart_pendulum
% Muốn chạy lại phần so sánh từ cửa sổ lệnh: clear chay_mo_phong; lqr_cart_pendulum

if ~exist('chay_mo_phong', 'var'), chay_mo_phong = true; end

%% 1. Thông số cơ hệ (khớp file Simscape của Bài 1 và Bài 3)
M = 0.5;            % khối lượng xe (kg)
m = 0.2;            % khối lượng con lắc (kg), khai báo Point Mass trong Simscape
l = 0.3;            % khoảng cách từ khớp quay đến khối lượng con lắc (m)
I = 0;              % quán tính quanh khối tâm: 0 vì là khối lượng điểm
                    % (nếu dựng thanh đặc dài 0.6 m thì đổi thành I = m*0.6^2/12)
b = 0.1;            % hệ số giảm chấn của ray, Damping Coefficient của Prismatic Joint (N.s/m)
g = 9.80665;        % gia tốc trọng trường (m/s^2)

%% 2. Mô hình tuyến tính quanh điểm thẳng đứng
p = I + m*l^2;
q = m*l;
D = (M + m)*p - q^2;
A = [0 1       0               0;
     0 -b*p/D  -q*m*g*l/D      0;
     0 0       0               1;
     0 b*q/D   (M+m)*m*g*l/D   0];
B = [0; p/D; 0; -q/D];

fprintf('Cực vòng hở        : %s\n', mat2str(eig(A).', 4));
fprintf('Hạng ma trận ctrb  : %d / 4\n', rank(ctrb(A, B)));

%% 3. Trọng số theo luật Bryson
x_max  = 0.2;       % lệch vị trí chấp nhận được (m)
th_max = 0.1;       % lệch góc chấp nhận được (rad), khoảng 5.7 độ
F_max  = 3;         % "giá" của lực (N): tăng lên thì bộ điều khiển mạnh tay hơn
Q = diag([1/x_max^2, 0, 1/th_max^2, 0]);
R = 1/F_max^2;

[K, ~, p_lqr] = lqr(A, B, Q, R);

%% 4. Bản rời rạc cho vòng điều khiển 1 kHz
Ts = 1e-3;
Kd = lqrd(A, B, Q, R, Ts);

%% 5. Cascade-PID của Bài 3 viết lại thành một hàng K
Kp_th = 50;  Ki_th = 0.5;  Kd_th = 5;   % vòng trong (góc)
Kp_x  = 0.12;  Kd_x = 0.06;             % vòng ngoài (vị trí), bộ hệ số của bản web
K_pid = -[Kp_th*Kp_x, Kp_th*Kd_x, Kp_th, Kd_th];
p_pid = eig(A - B*K_pid);

fprintf('\n                 x        v    theta    omega\n');
fprintf('K   (LQR)   : %8.2f %8.2f %8.2f %8.2f\n', K);
fprintf('Kd  (1 kHz) : %8.2f %8.2f %8.2f %8.2f\n', Kd);
fprintf('K_pid       : %8.2f %8.2f %8.2f %8.2f\n', K_pid);
fprintf('\nCực vòng kín LQR         : %s\n', mat2str(p_lqr.', 3));
fprintf('Cực vòng kín Cascade-PID : %s\n', mat2str(p_pid.', 3));

if ~chay_mo_phong, return; end

%% 6. So sánh trên mô hình phi tuyến
Tend = 12;
N    = round(Tend/Ts);
ten  = {'Cascade-PID', 'LQR'};
ghi  = zeros(N, 6, 2);                  % mỗi dòng: [t, x, v, theta, omega, F]
th_ref_max = deg2rad(10);

for c = 1:2
    s = zeros(4, 1);
    tich_phan = 0;
    for k = 1:N
        t = (k - 1)*Ts;
        if c == 1
            th_ref = -(Kp_x*s(1) + Kd_x*s(2));
            th_ref = min(max(th_ref, -th_ref_max), th_ref_max);
            e = s(3) - th_ref;
            tich_phan = tich_phan + e*Ts;
            F = Kp_th*e + Ki_th*tich_phan + Kd_th*s(4);
        else
            F = -Kd*s;
        end
        F  = min(max(F, -20), 20);                  % bão hòa lực
        Fd = 15*(t >= 1 && t < 1.05);               % cú đẩy 15 N trong 50 ms
        h  = Ts/2;
        for j = 1:2                                 % RK4, hai bước con mỗi chu kỳ điều khiển
            k1 = dong_luc(s,          F + Fd, M, m, l, I, b, g);
            k2 = dong_luc(s + h/2*k1, F + Fd, M, m, l, I, b, g);
            k3 = dong_luc(s + h/2*k2, F + Fd, M, m, l, I, b, g);
            k4 = dong_luc(s + h*k3,   F + Fd, M, m, l, I, b, g);
            s  = s + h/6*(k1 + 2*k2 + 2*k3 + k4);
        end
        ghi(k, :, c) = [t, s.', F];
    end
end

fprintf('\n');
for c = 1:2
    t = ghi(:, 1, c);  x = ghi(:, 2, c);  th = ghi(:, 4, c);  F = ghi(:, 6, c);
    ngoai = find(abs(x) > 0.01, 1, 'last');
    fprintf('%-12s |theta|max = %5.2f độ   |x|max = %5.1f cm   vào ±1 cm sau %5.2f s   |F|max = %5.1f N\n', ...
        ten{c}, max(abs(rad2deg(th))), 100*max(abs(x)), t(ngoai), max(abs(F)));
end

figure('Name', 'Cascade-PID vs LQR', 'Color', 'w');
nhan  = {'\theta (độ)', 'x (cm)', 'F (N)'};
cot   = [4, 2, 6];
he_so = [180/pi, 100, 1];
for i = 1:3
    subplot(3, 1, i); hold on; grid on;
    for c = 1:2
        plot(ghi(:, 1, c), he_so(i)*ghi(:, cot(i), c), 'LineWidth', 1.5);
    end
    ylabel(nhan{i});
end
xlabel('t (s)');
legend(ten, 'Location', 'best');

%% Hàm cục bộ: phương trình phi tuyến (theta > 0 khi con lắc ngả về +x), có giảm chấn ray b
function ds = dong_luc(s, F, M, m, l, I, b, g)
c  = cos(s(3));
sn = sin(s(3));
d1 = M + m;
d2 = m*l*c;
d3 = I + m*l^2;
b1 = F - b*s(2) + m*l*s(4)^2*sn;
b2 = m*g*l*sn;
dt = d1*d3 - d2^2;
ds = [s(2); (d3*b1 - d2*b2)/dt; s(4); (d1*b2 - d2*b1)/dt];
end
