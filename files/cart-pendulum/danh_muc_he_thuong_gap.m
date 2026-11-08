%% danh_muc_he_thuong_gap.m
% Simscape Multibody Robotics · Bài 9 — Tám hệ hay gặp: mô hình hóa và tuyến tính hóa
% Mỗi hệ: viết f(s, u) phi tuyến, chọn điểm làm việc (s*, u*), tuyến tính hóa thành A, B,
% rồi in ra cực vòng hở và hạng của ma trận điều khiển được.
% Cần Symbolic Math Toolbox và Control System Toolbox.

clear; clc;

%% 1. Con lắc đơn có động cơ ở khớp (theta = 0 khi treo thẳng xuống)
syms m l b J g tau th w real
f   = [w; (tau - b*w - m*g*l*sin(th))/J];
ten = [m l b J g];
gt  = [0.5 0.3 0.01 0.5*0.3^2 9.81];
for th0 = [0, pi/4, pi/2, pi]
    tau0 = m*g*l*sin(th0);                                   % mô-men giữ tại điểm cân bằng
    [~, ~, An, Bn] = tuyen_tinh_hoa(f, [th; w], tau, [th0; 0], tau0, ten, gt);
    in_ket_qua(sprintf('1. Con lắc đơn, theta* = %g độ, tau* = %.3f N.m', ...
        rad2deg(th0), double(subs(tau0, ten, gt))), An, Bn);
end

%% 2. Động cơ DC + hộp số + tải (quy đổi về phía tải)
syms Jm bm JL bL N Kt Ke R La V i thL wL real
Jeff = JL + N^2*Jm;                                          % quán tính quy đổi
beff = bL + N^2*bm;
f    = [wL; (N*Kt*i - beff*wL)/Jeff; (V - R*i - Ke*N*wL)/La];
ten  = [Jm bm JL bL N Kt Ke R La];
gt   = [1e-5 1e-6 0.01 1e-3 10 0.05 0.05 1 5e-4];
[~, ~, An, Bn] = tuyen_tinh_hoa(f, [thL; wL; i], V, [0; 0; 0], 0, ten, gt);
in_ket_qua('2. Động cơ DC + hộp số N = 10', An, Bn);
% Rút gọn bậc: bỏ điện cảm (La -> 0), còn một phương trình cho vận tốc
a_rg = -(beff + N^2*Kt*Ke/R)/Jeff;
b_rg = N*Kt/(R*Jeff);
fprintf('   Rút gọn: d(omega)/dt = %.2f*omega + %.2f*V\n', double(subs(a_rg, ten, gt)), double(subs(b_rg, ten, gt)));

%% 3. Bể nước (Torricelli), điểm làm việc khác 0
syms At a h q_in positive
syms g positive
f   = (q_in - a*sqrt(2*g*h))/At;
ten = [At a g];
gt  = [0.01 5e-5 9.81];
for h0 = [0.2 0.05]
    q0 = a*sqrt(2*g*h0);                                     % lưu lượng vào để giữ mực h0
    [~, ~, An, Bn] = tuyen_tinh_hoa(f, h, q_in, h0, q0, ten, gt);
    in_ket_qua(sprintf('3. Bể nước, h* = %.2f m, q* = %.2f L/min, tau = %.1f s', ...
        h0, 60000*double(subs(q0, ten, gt)), -1/An), An, Bn);
end

%% 4. Nâng từ trường: lực từ ~ i^2/x^2, x là khe hở (dương hướng xuống)
syms m k g x Rc Lc positive
syms v i V real
f   = [v; g - k*i^2/(m*x^2); (V - Rc*i)/Lc];
x0  = 0.01;  i0 = 0.5;
ten = [m k g Rc Lc];
gt  = [0.02, 0.02*9.81*x0^2/i0^2, 9.81, 10, 0.1];           % chọn k để i* = 0.5 A giữ được bi
[A4, ~, An, Bn] = tuyen_tinh_hoa(f, [x; v; i], V, [x0; 0; i0], Rc*i0, ten, gt);
in_ket_qua('4. Nâng từ trường, x* = 1 cm, i* = 0.5 A', An, Bn);
disp('   Hàng 2 của A ở dạng ký hiệu (sau khi thay k = m*g*x*^2/i*^2):');
disp(simplify(subs(A4(2, :), k, m*g*x0^2/i0^2)));

%% 5. Xe hai bánh tự cân bằng (x = r*phi, mô-men tau đặt giữa bánh và thân)
syms mb l Ib mw r Jw g positive
syms x th dx dth ddx ddth tau real
q = [x; th];  dq = [dx; dth];  ddq = [ddx; ddth];
pG  = [x + l*sin(th); r + l*cos(th)];
vG  = jacobian(pG, q)*dq;
T   = 1/2*mw*dx^2 + 1/2*Jw*(dx/r)^2 + 1/2*mb*(vG.'*vG) + 1/2*Ib*dth^2;
Vp  = mb*g*pG(2);
eqs = lagrange_eqs(T, Vp, q, dq, ddq, [tau/r; -tau]);      % Q_x = tau/r, Q_theta = -tau
f   = trang_thai_tu_lagrange(eqs, q, dq, ddq);
ten = [mb l Ib mw r Jw g];
gt  = [1.0 0.1 1.0*0.2^2/12 0.2 0.035 0.5*0.2*0.035^2 9.81];
[~, ~, An, Bn] = tuyen_tinh_hoa(f, [x; dx; th; dth], tau, zeros(4, 1), 0, ten, gt);
in_ket_qua('5. Xe hai bánh tự cân bằng', An, Bn);

%% 6. Robot vi sai
syms px py psi v w real
f = [v*cos(psi); v*sin(psi); w];
[~, ~, An, Bn] = tuyen_tinh_hoa(f, [px; py; psi], [v; w], [0; 0; 0], [0; 0], [], []);
in_ket_qua('6a. Robot vi sai đứng yên', An, Bn);
% Sai số bám trong hệ tọa độ thân xe (Kanayama), quanh quỹ đạo đặt (v_r, w_r)
syms ex ey ep vr wr real
fe = [w*ey - v + vr*cos(ep); -w*ex + vr*sin(ep); wr - w];
[Ae, Be, An, Bn] = tuyen_tinh_hoa(fe, [ex; ey; ep], [v; w], [0; 0; 0], [vr; wr], [vr wr], [0.5 0.2]);
disp('   A sai số bám (ký hiệu) ='); disp(Ae);
in_ket_qua('6b. Robot vi sai bám quỹ đạo, v_r = 0.5 m/s, w_r = 0.2 rad/s', An, Bn);
in_ket_qua('6c. Cùng mô hình nhưng quỹ đạo đặt đứng yên', double(subs(Ae, [vr wr], [0 0])), double(Be));

%% 7. Drone phẳng: lực nâng tổng T, mô-men M
syms m J g T M real
syms y z ph vy vz wp real
f   = [vy; vz; wp; -T*sin(ph)/m; T*cos(ph)/m - g; M/J];
ten = [m J g];
gt  = [0.5 0.003 9.81];
[A7, B7, An, Bn] = tuyen_tinh_hoa(f, [y; z; ph; vy; vz; wp], [T; M], zeros(6, 1), [m*g; 0], ten, gt);
disp('   A drone (ký hiệu) ='); disp(A7);
in_ket_qua('7. Drone phẳng lơ lửng, T* = m*g', An, Bn);

%% 8. Tay máy hai khâu (khối lượng tập trung ở cuối khâu, góc đo từ phương ngang)
syms m1 m2 l1 l2 g positive
syms q1 q2 dq1 dq2 ddq1 ddq2 tau1 tau2 real
q = [q1; q2];  dq = [dq1; dq2];  ddq = [ddq1; ddq2];
p1  = [l1*cos(q1); l1*sin(q1)];
p2  = p1 + [l2*cos(q1 + q2); l2*sin(q1 + q2)];
v1  = jacobian(p1, q)*dq;
v2  = jacobian(p2, q)*dq;
T   = 1/2*m1*(v1.'*v1) + 1/2*m2*(v2.'*v2);
Vp  = m1*g*p1(2) + m2*g*p2(2);
eqs = lagrange_eqs(T, Vp, q, dq, ddq, [tau1; tau2]);
Gq  = simplify(subs(eqs, [ddq; dq], zeros(4, 1)) + [tau1; tau2]);   % G(q)
acc = simplify(-(jacobian(eqs, ddq) \ (eqs - jacobian(eqs, ddq)*ddq)));
f   = [dq; acc];                                                     % trạng thái [q1; q2; dq1; dq2]
ten = [m1 m2 l1 l2 g];
gt  = [1 0.5 0.3 0.25 9.81];
tu_the = {[0; 0], 'duỗi ngang'; [pi/2; 0], 'dựng thẳng đứng'; [-pi/2; 0], 'buông thõng'};
for k = 1:size(tu_the, 1)
    q0   = tu_the{k, 1};
    tau0 = subs(Gq, q, q0);                                          % mô-men bù trọng lực
    [~, ~, An, Bn] = tuyen_tinh_hoa(f, [q; dq], [tau1; tau2], [q0; 0; 0], tau0, ten, gt);
    in_ket_qua(sprintf('8. Tay máy hai khâu, %s, tau* = %s N.m', tu_the{k, 2}, ...
        mat2str(double(subs(tau0, ten, gt)).', 3)), An, Bn);
end

%% ===== Hàm cục bộ =====
function [A, B, An, Bn] = tuyen_tinh_hoa(f, s, u, s0, u0, ten, gia_tri)
% Jacobian của f theo s và u tại điểm làm việc (s0, u0), rồi thay số
A = simplify(subs(jacobian(f, s), [s; u], [s0; u0]));
B = simplify(subs(jacobian(f, u), [s; u], [s0; u0]));
if isempty(ten)
    An = double(A);
    Bn = double(B);
else
    An = double(subs(A, ten, gia_tri));
    Bn = double(subs(B, ten, gia_tri));
end
end

function eqs = lagrange_eqs(T, V, q, dq, ddq, Q)
% d/dt(dL/d(dq)) - dL/dq - Q = 0, đạo hàm theo thời gian viết bằng quy tắc chuỗi
L      = T - V;
dL_dq  = jacobian(L, q).';
dL_ddq = jacobian(L, dq).';
eqs    = simplify(jacobian(dL_ddq, q)*dq + jacobian(dL_ddq, dq)*ddq - dL_dq - Q);
end

function f = trang_thai_tu_lagrange(eqs, q, dq, ddq)
% Từ M(q)*ddq + h = 0 suy ra ds = f(s, u) với s xếp xen kẽ [q1; dq1; q2; dq2; ...]
Mq  = simplify(jacobian(eqs, ddq));
h   = simplify(eqs - Mq*ddq);
acc = simplify(-(Mq \ h));
f   = sym(zeros(2*numel(q), 1));
f(1:2:end) = dq;
f(2:2:end) = acc;
end

function in_ket_qua(ten_he, An, Bn)
fprintf('\n=== %s ===\n', ten_he);
disp('A ='); disp(An);
disp('B ='); disp(Bn);
fprintf('Cực vòng hở : %s\n', mat2str(eig(An).', 4));
fprintf('Hạng ctrb   : %d / %d\n', rank(ctrb(An, Bn)), size(An, 1));
end
