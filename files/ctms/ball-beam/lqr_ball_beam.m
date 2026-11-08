% Script for Ball & Beam LQR
m = 0.111; R = 0.015; g = 9.8; 
L = 1.0; h = 0.02;
J_beam = 1.0 * (L^2 + h^2) / 12; % mass=1

%% 1. CTMS Original Design (for angular acceleration input)
H = -m*(-9.8)/(9.99e-6/(R^2)+m); % CTMS used g = -9.8
A_ctms = [0 1 0 0; 0 0 H 0; 0 0 0 1; 0 0 0 0];
B_ctms = [0;0;0;1];
C_ctms = [1 0 0 0];
D_ctms = 0;

p1 = -2+2i; p2 = -2-2i; p3 = -20; p4 = -80;
K_ctms = place(A_ctms, B_ctms, [p1, p2, p3, p4]);
sys_ctms = ss(A_ctms, B_ctms, C_ctms, 0);
% Nbar for CTMS
Nbar_ctms = rscale(sys_ctms, K_ctms);

%% 2. Our New Multibody Plant Design (Torque input, realistic)
% For small alpha: r_ddot = -g*alpha
% J_beam * alpha_ddot + m*g*r = tau
% alpha_ddot = - (m*g/J_beam)*r + tau/J_beam
A = [0 1 0 0; 
     0 0 -g 0; 
     0 0 0 1; 
     -m*g/J_beam 0 0 0];
B = [0; 0; 0; 1/J_beam];
C = [1 0 0 0];
D = 0;

% Let's place the exact same poles for the new plant just to see!
K_new_poles = place(A, B, [p1, p2, p3, p4]);
sys_new = ss(A, B, C, 0);
Nbar_new_poles = rscale(sys_new, K_new_poles);

% Let's also use Bryson's Rule directly
% r_max = 0.25, alpha_max = 0.35 rad (20 deg), tau_max = 10 N.m
Q = diag([1/0.25^2, 0, 1/0.35^2, 0]);
R_lqr = 1/10^2;
K_bryson = lqr(A, B, Q, R_lqr);
Nbar_bryson = rscale(sys_new, K_bryson);

% Let's output these to results.txt
fid = fopen('../../../local/ctms-lqr/results_ball_beam.txt', 'w');
fprintf(fid, 'CTMS K (for acc): [%.4f, %.4f, %.4f, %.4f]\n', K_ctms);
fprintf(fid, 'CTMS Nbar: %.4f\n', Nbar_ctms);

fprintf(fid, 'New Plant K (same poles): [%.4f, %.4f, %.4f, %.4f]\n', K_new_poles);
fprintf(fid, 'New Plant Nbar (same poles): %.4f\n', Nbar_new_poles);

fprintf(fid, 'Bryson K: [%.4f, %.4f, %.4f, %.4f]\n', K_bryson);
fprintf(fid, 'Bryson Nbar: %.4f\n', Nbar_bryson);
fclose(fid);
