%% lqr_motor_speed.m
% Simscape Multibody Robotics · LQR 2 Motor Speed
% Chạy lại thiết kế LQR/LQI và xuất các thông số để đưa vào bài viết.
% Trạng thái x = [omega; i].
%
J = 0.01; b = 0.1; K_e = 0.01; R_mot = 1; L = 0.5;
A = [-b/J   K_e/J
     -K_e/L -R_mot/L];
B = [0; 1/L];
C = [1 0];
D = 0;
r = 1; % lệnh 1 rad/s

fprintf('\n=== LQR 2 Motor Speed ===\n');

%% CTMS LQR thiết kế: place cực -5±i
p_mot = [-5+1i, -5-1i];
K_place = place(A, B, p_mot);
Nbar_place = rscale(A, B, C, D, K_place);
fprintf('CTMS Place cuc -5+/-1i:\n');
fprintf('K = [%.4f, %.4f], Nbar = %.4f\n', K_place(1), K_place(2), Nbar_place);

%% 1. LQR với giới hạn vật lý (Bryson với nguồn +-12 V)
% Lệnh 1 rad/s. Giả sử sai lệch tốc độ omega_max = 1 rad/s (để trọng số tốc độ tương đối)
% Và ta muốn giới hạn điện áp u_max = 12 V.
% Dòng điện max cỡ 2 A? CTMS không giới hạn dòng, nên ta chọn Q cho i bằng 0.
Q_bryson = diag([1/1^2, 0]);
R_bryson = 1/12^2;
K_bryson = lqr(A, B, Q_bryson, R_bryson);
Nbar_bryson = rscale(A, B, C, D, K_bryson);
fprintf('\nBryson umax = 12 V, omega_max = 1:\n');
fprintf('Q = [%g 0; 0 %g], R = %g\n', Q_bryson(1,1), Q_bryson(2,2), R_bryson);
fprintf('K (Bryson) = [%.4f, %.4f]\n', K_bryson(1), K_bryson(2));
fprintf('Nbar = %.4f\n', Nbar_bryson);

%% 2. LQI khi có tải (thay thế cho PI)
% Ở trang PID, Kp = 100, Ki = 200.
% LQI mở rộng trạng thái
Aa = [A zeros(2,1); -C 0];
Ba = [B; 0];
% Thử lqr cho hệ mở rộng để ra được khoảng K tương đương hoặc ta tự dùng pole placement?
% CTMS LQR trang gợi ý tự thiết kế tích phân
Q_lqi = diag([0, 0, 400]); R_lqi = 1;
K_lqi = lqr(Aa, Ba, Q_lqi, R_lqi);
fprintf('\nLQI voi Q33 = 400, R = 1:\n');
fprintf('K lqi = [%.4f, %.4f, %.4f]\n', K_lqi(1), K_lqi(2), K_lqi(3));
fprintf('Tuc la Kx = [%.4f, %.4f], Ki = %.4f\n', K_lqi(1), K_lqi(2), -K_lqi(3));

function Nbar = rscale(a,b,c,d,k)
    s = size(a,1);
    Z = [zeros([1,s]) 1];
    N = inv([a,b;c,d])*Z';
    Nx = N(1:s);
    Nu = N(1+s);
    Nbar = Nu + k*Nx;
end

