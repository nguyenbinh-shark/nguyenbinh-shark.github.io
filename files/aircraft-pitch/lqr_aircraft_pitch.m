%% lqr_aircraft_pitch.m
% Simscape Multibody Robotics · Bài 11 — Mổ xẻ ví dụ LQR của CTMS: góc pitch máy bay
% Chạy lại từng bước của ví dụ "Aircraft Pitch: State-Space Methods for Controller Design"
% (Control Tutorials for MATLAB & Simulink, Đại học Michigan), rồi đi tiếp những chỗ tutorial bỏ qua:
% vì sao K_theta = sqrt(p), vì sao N̄ = K_theta, zero -0.154 là gì, cánh lái phải lệch bao nhiêu,
% thiết kế lại theo luật Bryson, sai mô hình, cánh lái lệch không và LQI có điều kiện.
%
% Trạng thái x = [alpha; q; theta]: góc tấn (rad), pitch rate ĐÃ CHUẨN HÓA (không thứ nguyên),
% góc pitch (rad). Đầu vào delta: góc cánh lái độ cao (rad). Pitch rate vật lý là
% d(theta)/dt = Omega*q với Omega = 2U/c = 56.7 1/s.
% Cần Control System Toolbox (lqr, ctrb, obsv, tzero, stepinfo, margin).

ve_hinh = true;     % đặt false nếu chỉ muốn xem số in ra cửa sổ lệnh
d2r = pi/180;

%% 1. Mô hình của CTMS (máy bay thương mại Boeing, bay bằng ở tốc độ không đổi)
Omega = 56.7;
A = [-0.313  56.7   0;
     -0.0139 -0.426 0;
      0      56.7   0];
B = [0.232; 0.0203; 0];
C = [0 0 1];
D = 0;
may_bay = ss(A, B, C, D);
r = 0.2;            % lệnh góc pitch: 0.2 rad = 11.5 độ

%% 2. Vòng hở: máy bay tự nó làm gì?
fprintf('\n=== 2. Vong ho ===\n');
P = tf(may_bay)                                  %#ok<NOPTS>  (1.151 s + 0.1774)/(s^3 + 0.739 s^2 + 0.9215 s)
fprintf('Cuc vong ho: '); fprintf('%.4f%+.4fi  ', [real(eig(A)) imag(eig(A))]'); fprintf('\n');
[wn, zeta] = damp(may_bay);
fprintf('Dao dong chu ky ngan: wn = %.3f rad/s, zeta = %.3f, chu ky = %.2f s\n', wn(end), zeta(end), 2*pi/(wn(end)*sqrt(1 - zeta(end)^2)));
fprintf('Zero: %.4f  -> hang so thoi gian %.2f s\n', tzero(may_bay), -1/tzero(may_bay));
x_bang = -A(1:2, 1:2) \ B(1:2);                  % trạng thái xác lập của alpha, q khi giữ delta = 1 rad
fprintf('Giu canh lai lech 1 do: alpha dung o %.3f do, theta tang deu %.4f do/s\n', x_bang(1), Omega*x_bang(2));
% Phương trình góc quỹ đạo: gamma = theta - alpha  =>  d(gamma)/dt = 0.313*alpha - 0.232*delta

%% 3. Điều khiển được và quan sát được
fprintf('\n=== 3. Kiem tra ===\n');
fprintf('rank(ctrb) = %d, rank(obsv) = %d  (can bang 3)\n', rank(ctrb(A, B)), rank(obsv(A, C)));

%% 4. LQR đúng như CTMS: Q = p*C'*C, R = 1
fprintf('\n=== 4. LQR theo CTMS ===\n');
R = 1;
for p = [2 50]
    Q = p*(C'*C);
    K = lqr(A, B, Q, R);
    % CTMS dùng hàm rscale tự viết (không có sẵn trong MATLAB). Công thức tương đương:
    Nbar = -1/(C*((A - B*K)\B));
    cl_khong_N = ss(A - B*K, B, C, D);
    m1 = chi_tieu(A, B, K, 1, r);
    m2 = chi_tieu(A, B, K, Nbar, r);
    fprintf('p = %-3g K = [%.4f %.4f %.4f]  Nbar = %.4f  sqrt(p) = %.4f\n', p, K, Nbar, sqrt(p));
    fprintf('   chua co Nbar: theta dung o %.4f rad (dat %.0f %%)\n', r*dcgain(cl_khong_N), 100*dcgain(cl_khong_N));
    fprintf('   co Nbar     : Tr %.2f s, Ts %.2f s, vot lo %.2f %%, canh lai lon nhat %.1f do\n', m2(1:3), m2(4)/d2r);
    fprintf('   cuc vong kin: '); fprintf('%.4f%+.4fi  ', [real(eig(A - B*K)) imag(eig(A - B*K))]'); fprintf('\n');
end

%% 5. Hai đẳng thức tutorial không nói: K_theta = sqrt(p/R) và Nbar = K_theta
% Cột thứ ba của A toàn số 0 (theta không ảnh hưởng tới đạo hàm nào). Nhân phương trình Riccati
% A'P + PA - P*B*B'*P/R + Q = 0 với e3' bên trái và e3 bên phải: hai số hạng có A biến mất,
% còn lại (B'*P*e3)^2/R = Q(3,3), tức K(3) = B'*P*e3/R = sqrt(Q(3,3)/R).
% Điểm cân bằng khi theta = r: alpha = 0, q = 0, delta = 0  =>  delta = -K*(x - [0;0;r]) = -K*x + K(3)*r.

%% 6. Zero -0.154: góc tấn tắt dần khi theta đứng yên
% Giữ theta cố định => q = 0 => cánh lái phải bù đúng mô-men do alpha: delta = -A(2,1)/B(2)*alpha.
% Thay vào phương trình alpha: d(alpha)/dt = (A(1,1) - B(1)*A(2,1)/B(2))*alpha.
z_tay = A(1,1) - B(1)*A(2,1)/B(2);
fprintf('\n=== 6. Zero tinh tay: %.4f  (tzero: %.4f)\n', z_tay, tzero(may_bay));

%% 7. Quét p: bốn yêu cầu (vọt lố < 10 %, Tr < 2 s, Ts < 10 s, sai số xác lập < 2 %) và cái giá ở cánh lái
fprintf('\n=== 7. Quet p ===\n');
fprintf('%8s %9s %9s %8s | %9s | %6s %6s %6s | %8s\n', 'p', 'K_alpha', 'K_q', 'K_theta', 'cuc cham', 'Tr', 'Ts', 'OS%', 'delta0');
for p = [0.5 1 2 3 4 4.75 6 10 20 50 100 1000]
    K = lqr(A, B, p*(C'*C), R);
    e = eig(A - B*K); cuc_cham = e(abs(imag(e)) < 1e-9);
    m = chi_tieu(A, B, K, K(3), r);
    dat = m(1) < 2 && m(2) < 10 && m(3) < 10;
    fprintf('%8.2f %9.4f %9.3f %8.4f | %9.4f | %6.2f %6.2f %6.2f | %6.1f do %s\n', p, K, cuc_cham, m(1:3), K(3)*r/d2r, repmat('*', 1, dat));
end
fprintf('(*) dat ca bon yeu cau. Canh lai lon nhat = cu giat tai t = 0 = sqrt(p)*r.\n');

%% 8. Thiết kế lại theo luật Bryson: Q(3,3) = 1/theta_max^2, R = 1/delta_max^2
fprintf('\n=== 8. Bryson ===\n');
theta_max = 0.2;                 % sai lệch góc pitch "đáng lo": cỡ chính bước lệnh
delta_max = 25*d2r;              % giới hạn cánh lái giả định: 25 độ
Qb = diag([0 0 1/theta_max^2]);
Rb = 1/delta_max^2;
Kb = lqr(A, B, Qb, Rb);
pb = (delta_max/theta_max)^2;    % cùng K với Q = p*C'*C, R = 1
mb = chi_tieu(A, B, Kb, Kb(3), r);
fprintf('p tuong duong = %.2f, K = [%.4f %.3f %.4f]\n', pb, Kb);
fprintf('Tr %.2f s, Ts %.2f s, vot lo %.2f %%, canh lai lon nhat %.1f do\n', mb(1:3), mb(4)/d2r);

%% 9. Cánh lái có giới hạn: bộ p = 50 của CTMS khi bị kẹp ±25 độ
fprintf('\n=== 9. Bao hoa canh lai ===\n');
K50 = lqr(A, B, 50*(C'*C), R);
kep = @(u) min(max(u, -delta_max), delta_max);
[t_s, x_s] = ode45(@(t, x) A*x + B*kep(K50(3)*r - K50*x), [0 30], zeros(3, 1), odeset('RelTol', 1e-8, 'MaxStep', 0.002));
S = stepinfo(x_s(:, 3), t_s, r, 'SettlingTimeThreshold', 0.02, 'RiseTimeLimits', [0.1 0.9]);
u_s = kep(K50(3)*r - (K50*x_s')');
fprintf('p = 50, kep +-25 do: Tr %.2f s, Ts %.2f s, vot lo %.2f %%, nam o gioi han %.2f s\n', ...
    S.RiseTime, S.SettlingTime, S.Overshoot, sum(diff(t_s).*(abs(u_s(1:end-1)) >= delta_max - 1e-9)));
fprintf('Goc tan lon nhat: %.1f do (khong kep: %.1f do)\n', max(x_s(:, 1))/d2r, max_alpha(A, B, K50, r)/d2r);

%% 10. Sai mô hình: thiết kế trên mô hình danh định, chạy trên máy bay khác đi
fprintf('\n=== 10. Sai mo hinh (bo Bryson) ===\n');
for k = [0.7 1.3]
    m = chi_tieu(A, k*B, Kb, Kb(3), r);
    fprintf('B x %.1f: theta dung o %.4f rad, Ts %.2f s, vot lo %.2f %%\n', k, r*m(5), m(2), m(3));
end
for k = [0.5 1.5 2]
    Ak = A; Ak(2, 1) = k*A(2, 1);
    e = eig(Ak - B*Kb);
    fprintf('Hang so on dinh tinh A(2,1) x %.1f: zero moi %.4f, cuc vong kin cham nhat %.4f\n', ...
        k, Ak(1,1) - B(1)*Ak(2,1)/B(2), max(real(e)));
end
[Gm, Pm] = margin(ss(A, B, Kb, 0));
fprintf('Bien on dinh o dau vao: GM = %g, PM = %.1f do\n', Gm, Pm);

%% 11. Cánh lái lệch không 1 độ từ t = 30 s: LQR và LQI có điều kiện
fprintf('\n=== 11. LQI ===\n');
lech = @(t) 1*d2r*(t >= 30);
fprintf('LQR: sai so xac lap = lech/K_theta = %.3f do (%.1f %% cua lenh)\n', 1/Kb(3), 100*(d2r/Kb(3))/r);
Aa = [A zeros(3, 1); C 0];                       % thêm trạng thái z = tích phân của (theta - r)
Ba = [B; 0];
Ka = lqr(Aa, Ba, diag([0 0 1.93 0.5]), 1);       % 1.93 chọn để K_theta vẫn bằng 2.18 (cú giật 25 độ)
Kx = Ka(1:3); Ki = Ka(4);
fprintf('Ka = [%.4f %.3f %.4f %.4f]  (Ki = sqrt(0.5) = %.4f)\n', Ka, sqrt(0.5));
nguong = 1*d2r;                                  % chỉ tích phân khi |theta - r| < 1 độ
t_q = (0:0.01:60)';
opt = odeset('RelTol', 1e-9, 'AbsTol', 1e-12, 'MaxStep', 0.01);
[~, s_dk] = ode45(@(t, s) [A*s(1:3) + B*(Kx(3)*r - Kx*s(1:3) - Ki*s(4) + lech(t)); (abs(s(3) - r) < nguong)*(s(3) - r)], t_q, zeros(4, 1), opt);
[~, s_lt] = ode45(@(t, s) [A*s(1:3) + B*(Kx(3)*r - Kx*s(1:3) - Ki*s(4) + lech(t)); (s(3) - r)], t_q, zeros(4, 1), opt);
[~, x_lqr] = ode45(@(t, x) A*x + B*(Kb(3)*r - Kb*x + lech(t)), t_q, zeros(3, 1), opt);
truoc = t_q < 30;
ten = {'LQR Bryson', 'LQI tich phan lien tuc', 'LQI tich phan co dieu kien'};
th = {x_lqr(:, 3), s_lt(:, 3), s_dk(:, 3)};
for i = 1:3
    S = stepinfo(th{i}(truoc), t_q(truoc), r, 'SettlingTimeThreshold', 0.02, 'RiseTimeLimits', [0.1 0.9]);
    fprintf('%-28s Tr %.2f s, Ts %.2f s, vot lo %5.2f %% | sai so tai t = 60 s: %.3f do\n', ...
        ten{i}, S.RiseTime, S.SettlingTime, S.Overshoot, (th{i}(end) - r)/d2r);
end

%% 12. Rời rạc như trang Digital của CTMS: 100 Hz, dlqr với p = 50
fprintf('\n=== 12. Roi rac ===\n');
Ts = 0.01;
may_bay_d = c2d(may_bay, Ts, 'zoh');
Kd = dlqr(may_bay_d.A, may_bay_d.B, 50*(C'*C), 1);
Nbar_d = 1/dcgain(ss(may_bay_d.A - may_bay_d.B*Kd, may_bay_d.B, C, 0, Ts));
fprintf('dlqr K = [%.4f %.4f %.4f], Nbar dung = %.4f (= K(3)), CTMS do tay 6.95\n', Kd, Nbar_d);
fprintf('Cot thu ba cua A roi rac: [%g %g %g]\n', may_bay_d.A(:, 3));
for N = [6.95 Kd(3)]
    y = step(ss(may_bay_d.A - may_bay_d.B*Kd, may_bay_d.B*N*r, C, 0, Ts), 0:Ts:30);
    fprintf('Nbar = %.4f: theta tai 30 s = %.5f rad (%.3f %%)\n', N, y(end), 100*(y(end) - r)/r);
end

%% 13. Hình
if ve_hinh
    t = (0:0.01:20)';
    figure('Name', 'CTMS ba buoc'); hold on; grid on;
    K2 = lqr(A, B, 2*(C'*C), R);
    plot(t, step(ss(A - B*K2, B*r, C, 0), t), t, step(ss(A - B*K50, B*r, C, 0), t), ...
         t, step(ss(A - B*K50, B*r*K50(3), C, 0), t), t, step(ss(A - B*Kb, B*r*Kb(3), C, 0), t), 'LineWidth', 1.5);
    yline(r, '--'); xlabel('t (s)'); ylabel('\theta (rad)');
    legend('p = 2, chưa có N̄', 'p = 50, chưa có N̄', 'p = 50, có N̄', 'Bryson p = 4.75', 'Location', 'southeast');

    figure('Name', 'Quy dao cuc'); hold on; grid on;
    ps = logspace(-3, 4, 300); E = zeros(3, numel(ps));
    for k = 1:numel(ps), E(:, k) = eig(A - B*lqr(A, B, ps(k)*(C'*C), R)); end
    plot(real(E.'), imag(E.'), '.', 'MarkerSize', 6);
    plot(tzero(may_bay), 0, 'ko', 'MarkerSize', 9, 'LineWidth', 1.5);
    xlabel('Phần thực'); ylabel('Phần ảo'); title('Cực vòng kín khi tăng p (o: zero)');

    figure('Name', 'LQI'); hold on; grid on;
    plot(t_q, x_lqr(:, 3)/d2r, t_q, s_lt(:, 3)/d2r, t_q, s_dk(:, 3)/d2r, 'LineWidth', 1.5);
    xline(30, ':'); xlabel('t (s)'); ylabel('\theta (độ)');
    legend(ten, 'Location', 'southeast');
end

%% Hàm phụ
function m = chi_tieu(A, B, K, N, r)
% [Tr, Ts, vọt lố %, |delta| lớn nhất, hệ số xác lập theta/r] cho lệnh bậc r, mô hình tuyến tính
t = (0:0.001:60)';
y = step(ss(A - B*K, B*N*r, [0 0 1; -K], [0; N*r]), t);
S = stepinfo(y(:, 1), t, r, 'SettlingTimeThreshold', 0.02, 'RiseTimeLimits', [0.1 0.9]);
m = [S.RiseTime, S.SettlingTime, S.Overshoot, max(abs(y(:, 2))), y(end, 1)/r];
end

function a = max_alpha(A, B, K, r)
t = (0:0.001:30)';
y = step(ss(A - B*K, B*K(3)*r, [1 0 0], 0), t);
a = max(y);
end
