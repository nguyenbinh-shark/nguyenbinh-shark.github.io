%% lqr_mobile_robot.m
% Simscape Multibody Robotics · Bài 10 — LQR cho mobile robot vi sai
% Thiết kế LQR cho tầng bám quỹ đạo (vòng ngoài) của robot Omron ở Bài 5,
% so sánh với luật Kanayama đang dùng trong file Tracking_omron_full_simulink.slx.
%
% Sai số bám viết trong hệ thân xe: e = [ex; ey; epsi]
%   ex   > 0 : robot tụt lại phía sau tư thế đặt
%   ey   > 0 : tư thế đặt nằm bên TRÁI robot
%   epsi > 0 : hướng đặt lệch sang trái so với hướng robot
% Lệnh gửi xuống vòng trong = phần biết trước (feedforward) + phần sửa sai:
%   v = vr*cos(epsi) + dv,   w = wr + dw,   [dv; dw] = -K*e
%
% Dùng làm InitFcn cho mô hình Simulink (chỉ tính K, Ka, bảng K_tab, không mô phỏng):
%   chay_mo_phong = false; lqr_mobile_robot
% Muốn chạy lại phần so sánh từ cửa sổ lệnh: clear chay_mo_phong; lqr_mobile_robot

if ~exist('chay_mo_phong', 'var'), chay_mo_phong = true; end

%% 1. Thông số robot (khớp file Simscape của Bài 4, Bài 5)
r      = 0.09685;   % bán kính bánh (m)
d      = 0.405;     % khoảng cách hai bánh (m) - đo được trên Simscape: khoảng 0.41 m
w_max  = 17.3;      % tốc độ góc bánh tối đa (rad/s)
tau_in = 0.086;     % hằng số thời gian vòng trong PID vận tốc (s), mục 6.3 của Bài 5

%% 2. Mô hình sai số tuyến tính hóa quanh quỹ đạo đặt
% ex' =  wr*ey - dv,   ey' = -wr*ex + vr*epsi,   epsi' = -dw
A_of = @(vr, wr) [0 wr 0; -wr 0 vr; 0 0 0];
B    = [-1 0; 0 0; 0 -1];

fprintf('Hạng ma trận ctrb:\n');
fprintf('  đang chạy thẳng (vr = 0.6, wr = 0)     : %d / 3\n', rank(ctrb(A_of(0.6, 0), B)));
fprintf('  đứng yên        (vr = 0,   wr = 0)     : %d / 3\n', rank(ctrb(A_of(0, 0), B)));
fprintf('  quay tại chỗ    (vr = 0,   wr = 0.5)   : %d / 3\n', rank(ctrb(A_of(0, 0.5), B)));

%% 3. Kanayama của Bài 5 viết thành phản hồi trạng thái
% Tuyến tính hóa: dv = Kx*ex,  dw = vr*Ky*ey + vr*Kz*epsi
Kx = 1.5;  Ky = 5.0;  Kz = 2.0;
K_kan = @(vr) -[Kx 0 0; 0 vr*Ky vr*Kz];

%% 4. LQR với trọng số theo luật Bryson
ex_max   = 0.2;     % tụt lại sau lịch trình bao nhiêu thì đáng lo (m)
ey_max   = 0.1;     % lệch ngang bao nhiêu thì đáng lo (m)
epsi_max = inf;     % không phạt sai số hướng: hướng chỉ là phương tiện để sửa ey
dv_max   = 0.3;     % "giá" của lệnh sửa vận tốc (m/s)
dw_max   = 0.5;     % "giá" của lệnh sửa vận tốc góc (rad/s): gia tốc ngang 0.3 m/s^2 ở 0.6 m/s
Q = diag([1/ex_max^2, 1/ey_max^2, 1/epsi_max^2]);
R = diag([1/dv_max^2, 1/dw_max^2]);

vr0 = 0.6;  wr0 = 0;                        % điểm làm việc danh định: chạy thẳng 0.6 m/s
[K_lqr, ~, p_lqr] = lqr(A_of(vr0, wr0), B, Q, R);

% Trên đường thẳng, nghiệm LQR có dạng đóng (mục 4.3 của bài):
kx   = dv_max/ex_max;
ky   = dw_max/ey_max;
kpsi = sqrt(2*vr0*ky + (dw_max/epsi_max)^2);

sach = @(M) round(M, 9) + 0;        % bỏ số -0.000 và nhiễu 1e-16 khi in
G  = sach(-K_lqr);                  % in -K: hệ số "sửa sai" mang dấu dương cho dễ đọc
Gk = sach(-K_kan(vr0));
fprintf('\nHệ số sửa sai (-K)      ex       ey     epsi\n');
fprintf('LQR       dv  : %8.3f %8.3f %8.3f\n', G(1, :));
fprintf('          dw  : %8.3f %8.3f %8.3f\n', G(2, :));
fprintf('Kanayama  dv  : %8.3f %8.3f %8.3f   (tuyến tính hóa tại vr = %.1f m/s)\n', Gk(1, :), vr0);
fprintf('          dw  : %8.3f %8.3f %8.3f\n', Gk(2, :));
fprintf('Công thức đóng: kx = %.3f, ky = %.3f, kpsi = %.3f\n', kx, ky, kpsi);

fprintf('\nCực vòng kín khi chạy thẳng, theo tốc độ:\n');
for vr = [0.3 0.6 0.9]
    Kv = lqr(A_of(vr, 0), B, Q, R);
    fprintf('  vr = %.1f  Kanayama: %-34s LQR: %s\n', vr, ...
        mat2str(eig(A_of(vr, 0) - B*K_kan(vr)).', 3), mat2str(eig(A_of(vr, 0) - B*Kv).', 3));
end

fprintf('\nHệ số sửa sai của LQR trên đường cong (vr = 0.6 m/s):\n');
for wr = [-0.66 0 0.314 0.66]
    Gc = sach(-lqr(A_of(0.6, wr), B, Q, R));
    fprintf('  wr = %+5.2f  dv: [%6.3f %6.3f %6.3f]   dw: [%6.3f %6.3f %6.3f]\n', wr, Gc(1, :), Gc(2, :));
end

%% 5. Bảng K theo điểm làm việc cho khối gain scheduling
% Bắt đầu từ 0.1 m/s: tại vr = 0 không phạt epsi thì phương trình Riccati vô nghiệm.
vg = 0.1:0.1:1.2;                   % lưới vận tốc dài đặt (m/s)
wg = -1.5:0.25:1.5;                 % lưới vận tốc góc đặt (rad/s)
K_tab = zeros(numel(vg), numel(wg), 6);
for i = 1:numel(vg)
    for j = 1:numel(wg)
        Kij = lqr(A_of(vg(i), wg(j)), B, Q, R);
        K_tab(i, j, :) = Kij(:);    % thứ tự cột của MATLAB: K(1,1) K(2,1) K(1,2) ...
    end
end

% K cố định có còn ổn định khi điểm làm việc đổi không? (kiểm tra "đóng băng thời gian")
xau_nhat = -inf;
for vr = 0.05:0.05:1.0
    for wr = -1.5:0.1:1.5
        xau_nhat = max(xau_nhat, max(real(eig(A_of(vr, wr) - B*K_lqr))));
    end
end
fprintf('\nK cố định trên lưới vr 0.05..1, wr -1.5..1.5: phần thực cực lớn nhất = %.3f\n', xau_nhat);

%% 6. LQI: thêm tích phân của ex, ey để khử sai số xác lập do sai mô hình
z_max = 0.2;                        % mức đáng lo của tích phân sai số (m.s)
Aa = [A_of(vr0, wr0) zeros(3, 2); [1 0 0; 0 1 0] zeros(2)];
Ba = [B; zeros(2)];
Qa = blkdiag(Q, diag([1/z_max^2, 1/z_max^2]));
Ka = lqr(Aa, Ba, Qa, R);            % [dv; dw] = -Ka*[ex; ey; epsi; zx; zy], z = tích phân của e
Ga = sach(-Ka);
fprintf('\nLQI (-Ka)      ex       ey     epsi       zx       zy\n');
fprintf('  dv  : %8.3f %8.3f %8.3f %8.3f %8.3f\n', Ga(1, :));
fprintf('  dw  : %8.3f %8.3f %8.3f %8.3f %8.3f\n', Ga(2, :));

%% 7. Bản rời rạc khi vòng ngoài chạy chậm hơn vòng trong (ví dụ 20 ms theo nhịp định vị)
Ts_ngoai = 0.02;
K_d = lqrd(A_of(vr0, wr0), B, Q, R, Ts_ngoai);
fprintf('\nlqrd 20 ms, hàng dw: %s   (liên tục: %s)\n', mat2str(sach(-K_d(2, :)), 4), mat2str(G(2, :), 4));

if ~chay_mo_phong, return; end

%% 8. So sánh trên mô hình động học (có trễ vòng trong và bão hòa bánh)
% Bài thử: chạy thẳng 0.6 m/s theo trục y, tại t = 1 s đường đặt nhảy ngang 0.3 m.
Ts   = 1e-3;
Tend = 12;
N    = round(Tend/Ts);
ten  = {'Kanayama (Bài 5)', 'LQR'};
ghi  = zeros(N, 4, 2);                          % [t, ey, dw, vw]
for c = 1:2
    q  = [0; 0; pi/2];                          % tư thế robot [x; y; psi]
    wb = [vr0/r; vr0/r];                        % tốc độ thật hai bánh [phải; trái]
    for k = 1:N
        t   = (k - 1)*Ts;
        xr  = 0.3*(t >= 1);  yr = vr0*t;  psr = pi/2;
        ex  =  cos(q(3))*(xr - q(1)) + sin(q(3))*(yr - q(2));
        ey  = -sin(q(3))*(xr - q(1)) + cos(q(3))*(yr - q(2));
        eps = atan2(sin(psr - q(3)), cos(psr - q(3)));
        if c == 1
            v = vr0*cos(eps) + Kx*ex;
            w = vr0*(Ky*ey + Kz*sin(eps));
        else
            du = -K_lqr*[ex; ey; eps];
            v = vr0*cos(eps) + du(1);
            w = du(2);
        end
        cmd = [(v + w*d/2)/r; (v - w*d/2)/r];
        cmd = min(max(cmd, -w_max), w_max);
        wb  = wb + Ts/tau_in*(cmd - wb);        % vòng trong: trễ bậc nhất
        vt  = r*(wb(1) + wb(2))/2;
        wt  = r*(wb(1) - wb(2))/d;
        q   = q + Ts*[vt*cos(q(3)); vt*sin(q(3)); wt];
        ghi(k, :, c) = [t, ey, w, vt*wt];
    end
end

fprintf('\nBài thử đổi làn 0.3 m trên mô hình động học:\n');
for c = 1:2
    t = ghi(:, 1, c);  ey = ghi(:, 2, c);
    sau = t >= 1;
    vot = max(ey(sau));                         % ey bắt đầu ở -0.3 m, vọt lố là phần dương
    ngoai = find(abs(ey) > 0.01, 1, 'last');
    fprintf('  %-17s vọt lố %4.1f %%   vào ±1 cm sau %4.2f s   |dw|max %4.2f rad/s\n', ...
        ten{c}, 100*vot/0.3, t(ngoai) - 1, max(abs(ghi(sau, 3, c))));
end

figure('Name', 'Kanayama vs LQR', 'Color', 'w');
subplot(2, 1, 1); hold on; grid on;
for c = 1:2, plot(ghi(:, 1, c), 100*ghi(:, 2, c), 'LineWidth', 1.5); end
ylabel('e_y (cm)'); legend(ten, 'Location', 'best');
subplot(2, 1, 2); hold on; grid on;
for c = 1:2, plot(ghi(:, 1, c), ghi(:, 3, c), 'LineWidth', 1.5); end
ylabel('\omega lệnh (rad/s)'); xlabel('t (s)');
