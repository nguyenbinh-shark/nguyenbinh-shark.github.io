%% mo_hinh_hoa_cart_pendulum.m
% Simscape Multibody Robotics · Bài 7 — Từ định luật vật lý đến phương trình trạng thái
% Dẫn phương trình con lắc ngược trên xe bằng Lagrange (Symbolic Math Toolbox),
% đưa về dạng chính tắc M(q)*ddq + C(q,dq)*dq + G(q) = tau,
% viết thành phương trình trạng thái ds = f(s, F) rồi tuyến tính hóa thành A, B.
%
% Quy ước: theta > 0 khi con lắc ngả về phía +x; khối tâm con lắc cách điểm treo một đoạn l.
% Thông số khớp file Simscape của Bài 1: con lắc là khối lượng điểm (I = 0), ray có giảm chấn b = 0.1 N.s/m.

clear; clc;

%% 1. Ký hiệu
syms M m l I b g F real                % thông số và lực đẩy xe
syms x th dx dth ddx ddth real         % tọa độ suy rộng, vận tốc, gia tốc
q   = [x; th];
dq  = [dx; dth];
ddq = [ddx; ddth];

%% 2. Hình học: vị trí và vận tốc khối tâm con lắc
pG = [x + l*sin(th);  l*cos(th)];      % [x_G; y_G]
vG = jacobian(pG, q)*dq;               % vận tốc = (đạo hàm riêng theo q) * dq

%% 3. Năng lượng và lực suy rộng
T   = 1/2*M*dx^2 + 1/2*m*(vG.'*vG) + 1/2*I*dth^2;   % động năng
V   = m*g*pG(2);                                     % thế năng
L   = T - V;                                         % hàm Lagrange
tau = [F - b*dx; 0];                                 % F và giảm chấn ray sinh công trên x, không sinh công trên theta

%% 4. Phương trình Lagrange: d/dt(dL/ddq) - dL/dq = tau
dL_dq  = jacobian(L, q).';
dL_ddq = jacobian(L, dq).';
ddt_dL_ddq = jacobian(dL_ddq, q)*dq + jacobian(dL_ddq, dq)*ddq;   % đạo hàm theo thời gian bằng quy tắc chuỗi
eqs = simplify(ddt_dL_ddq - dL_dq - tau);                          % eqs = 0
disp('Phương trình chuyển động (= 0):'); disp(eqs);

%% 5. Dạng chính tắc M(q)*ddq + h(q,dq) = 0
Mq = simplify(jacobian(eqs, ddq));     % ma trận khối lượng M(q)
h  = simplify(eqs - Mq*ddq);           % phần còn lại: C(q,dq)*dq + G(q) - tau
disp('M(q) ='); disp(Mq);

%% 6. Phương trình trạng thái phi tuyến ds = f(s, F)
acc = simplify(-(Mq \ h));             % [ddx; ddth]
s   = [x; dx; th; dth];
f   = [dx; acc(1); dth; acc(2)];

%% 7. Tuyến tính hóa tại điểm cân bằng thẳng đứng
s0 = [0; 0; 0; 0];  F0 = 0;
A = simplify(subs(jacobian(f, s), [s; F], [s0; F0]));
B = simplify(subs(jacobian(f, F), [s; F], [s0; F0]));
disp('A ='); disp(A);
disp('B ='); disp(B);

%% 8. Thay số (thông số Bài 1)
ten = [M, m, l, I, b, g];
gia_tri = [0.5, 0.2, 0.3, 0, 0.1, 9.80665];        % thanh đặc dài 0.6 m thì I = 0.2*0.6^2/12 = 0.006
An = double(subs(A, ten, gia_tri));
Bn = double(subs(B, ten, gia_tri));
disp('A (số) ='); disp(An);
disp('B (số) ='); disp(Bn);
fprintf('Cực vòng hở, thẳng đứng : %s\n', mat2str(eig(An).', 4));

% Kiểm tra trực giác: tại vị trí treo (theta = pi) con lắc phải dao động chứ không đổ
Ah = double(subs(subs(jacobian(f, s), [s; F], [0; 0; pi; 0; 0]), ten, gia_tri));
fprintf('Cực vòng hở, treo ngược : %s\n', mat2str(eig(Ah).', 4));

%% 9. Đầu ra theo cảm biến: encoder đo x và theta
C = [1 0 0 0;
     0 0 1 0];
D = [0; 0];
he = ss(An, Bn, C, D, 'StateName', {'x', 'v', 'theta', 'omega'}, ...
        'InputName', 'F', 'OutputName', {'x', 'theta'});

%% 10. Dùng chính f để mô phỏng phi tuyến: thả con lắc từ 2 độ, không có lực
f_so = matlabFunction(subs(f, ten, gia_tri), 'Vars', {s, F});
[tt, ss_] = ode45(@(t, z) f_so(z, 0), [0 1], [0; 0; deg2rad(2); 0], odeset('RelTol', 1e-8, 'AbsTol', 1e-10));
figure('Color', 'w');
subplot(2, 1, 1); plot(tt, rad2deg(ss_(:, 3)), 'LineWidth', 1.5); grid on; ylabel('\theta (độ)');
subplot(2, 1, 2); plot(tt, 100*ss_(:, 1), 'LineWidth', 1.5); grid on; ylabel('x (cm)'); xlabel('t (s)');
% Con lắc đổ về phía theta dương, xe trượt về phía x âm: theta = 4.1, 14.8, 52.3 độ và x = -0.31, -1.86, -6.35 cm
% tại t = 0.2, 0.4, 0.6 s. Simscape cho cùng các số này nhưng với dấu theta ngược lại (mục 6.2 của Bài 8).
for t_in = [0.2 0.4 0.6]
    z = interp1(tt, ss_, t_in);
    fprintf('t = %.1f s: theta = %5.2f độ, x = %6.3f cm\n', t_in, rad2deg(z(3)), 100*z(1));
end
