fprintf('\n=== LQR 4 Suspension ===\n');
[A, B, C, D] = physical_suspension();

% Physical Augmented System
Aa = [A, zeros(4,1); -C, 0];
Ba = [B; 0];
Ba_u = Ba(:,1);

K_ctms = [0 2300000 500000000 0 8000000];
K = K_ctms(1:4);
Ki = K_ctms(5);
fprintf('CTMS K do tay:\n');
fprintf('K = [%.4e, %.4e, %.4e, %.4e], Ki = %.4e\n\n', K, Ki);

% Bryson
% do lech = 5 mm -> 0.005 m, luc actuator = 10 kN -> 10000 N
max_deflection = 0.005;
max_force = 10000;
R_weight = 1/(max_force^2);
Q_weight = diag([0, 0, 1/(max_deflection^2), 0, 0]);
% But wait, we also want steady state to be 0 for deflection, so penalize integral?
% Bryson for integral: maybe 1/(0.001^2) for small integral error?
% Let's see if standard Bryson is enough.
Q_weight(5,5) = 1/(0.001^2);

Klqi = lqr(Aa, Ba_u, Q_weight, R_weight);
fprintf('LQI Bryson (5mm, 10kN):\n');
fprintf('Q = %s, R = %.4e\n', mat2str(diag(Q_weight)'), R_weight);
fprintf('K lqi = [%.4e, %.4e, %.4e, %.4e], Ki = %.4e\n', Klqi(1:4), -Klqi(5));

