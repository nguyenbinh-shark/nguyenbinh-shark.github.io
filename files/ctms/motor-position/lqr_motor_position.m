fprintf('\n=== LQR 3 Motor Position ===\n');
J = 0.01; b = 0.1; K = 0.01; R = 1; L = 0.5;
A = [0 1 0; 0 -b/J K/J; 0 -K/L -R/L];
B = [0; 0; 1/L];
C = [1 0 0];
D = 0;
Aa = [A zeros(3,1); -C 0];
Ba = [B; 0];
Ca = [C 0];

% CTMS Place
p = [-100+100i -100-100i -200 -300];
Kc = place(Aa, Ba, p);
K_place = Kc(1:3);
Ki_place = -Kc(4);
fprintf('CTMS Place cuc %s:\n', mat2str(p));
fprintf('K = [%.4f, %.4f, %.4f], Ki = %.4f\n\n', K_place, Ki_place);

% Bryson & LQI
% umax = 24 V
umax = 24;
% Tuned for physical simulation to avoid extreme gains
R_weight = 1;
Q_weight = diag([100, 0, 0, 1000]); % Tuned to get reasonable gains
Klqi_aug = lqr(Aa, Ba, Q_weight, R_weight);
K_lqi = Klqi_aug(1:3);
Ki_lqi = -Klqi_aug(4);

fprintf('LQI umax=24:\n');
fprintf('Q = %s, R = %.6f\n', mat2str(diag(Q_weight)'), R_weight);
fprintf('K lqi = [%.4f, %.4f, %.4f], Ki = %.4f\n', K_lqi, Ki_lqi);

