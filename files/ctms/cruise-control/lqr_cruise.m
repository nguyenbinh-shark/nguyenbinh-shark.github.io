%% lqr_cruise.m
% Simscape Multibody Robotics · LQR 1 Cruise Control
% Chạy lại thiết kế LQR/LQI và xuất các thông số để đưa vào bài viết.
% Trạng thái x = v.
%
m = 1000; b = 50; umax = 1500;
A = -b/m; B = 1/m; C = 1; D = 0;
r = 10; % lệnh 10 m/s

fprintf('\n=== LQR 1 Cruise Control ===\n');

%% CTMS LQR thiết kế: place cực -1.5
K_place = place(A, B, -1.5);
Nbar_place = rscale(A, B, C, D, K_place);
fprintf('CTMS Place cuc -1.5:\n');
fprintf('K = %.6f, Nbar = %.6f\n', K_place, Nbar_place);

%% LQR tính tay với Q = 100, R = 1 (CTMS không làm nhưng để minh họa)
Q1 = 100; R1 = 1;
K_lqr = lqr(A, B, Q1, R1);
Nbar = rscale(A, B, C, D, K_lqr);
fprintf('\nLQR Q=100, R=1:\n');
fprintf('K = %.6f, Nbar = %.6f\n', K_lqr, Nbar);

%% 1. Luật Bryson với umax = 1500 của bài PID
% r_max = 10 m/s, umax = 1500 N.
v_max_bryson = 1500 / 800; % Để ra K khoảng 800
Q_bryson = 1/v_max_bryson^2;
R_bryson = 1/umax^2;
K_bryson = lqr(A, B, Q_bryson, R_bryson);
fprintf('\nBryson de co K = 800:\n');
fprintf('v_max = %.3f m/s, umax = %d N\n', v_max_bryson, umax);
fprintf('Q = %.4f, R = %.4e\n', Q_bryson, R_bryson);
fprintf('K (Bryson) = %.4f\n', K_bryson);

%% 2. LQI so với PI (Kp = 800, Ki = 40)
Aa = [A 0; -C 0];
Ba = [B; 0];
% Q và R thử nghiệm
Qlqi = diag([0, 1]); Rlqi = 1/40^2;
Klqi = lqr(Aa, Ba, Qlqi, Rlqi);
fprintf('\nLQI (phai tuong duong PI Kp=800, Ki=40):\n');
fprintf('K lqi = [%.4f, %.4f]\n', Klqi(1), Klqi(2));

%% Kiểm tra cực
K_pi = [800, -40];
e_lqi = eig(Aa - Ba*K_pi);
fprintf('Cuc cua he LQI K=[800, -40]: %.4f, %.4f\n', e_lqi(1), e_lqi(2));

function Nbar = rscale(a,b,c,d,k)
    s = size(a,1);
    Z = [zeros([1,s]) 1];
    N = inv([a,b;c,d])*Z';
    Nx = N(1:s);
    Nu = N(1+s);
    Nbar = Nu + k*Nx;
end

