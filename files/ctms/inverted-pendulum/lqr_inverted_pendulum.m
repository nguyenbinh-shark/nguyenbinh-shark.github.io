% Script for Inverted Pendulum LQR
M = 0.5; m = 0.2; b = 0.1; I = 0.006; g = 9.8; l = 0.3;
p = I*(M+m)+M*m*l^2; 

A = [0 1 0 0;
     0 -(I+m*l^2)*b/p (m^2*g*l^2)/p 0;
     0 0 0 1;
     0 -(m*l*b)/p m*g*l*(M+m)/p 0];
B = [ 0; (I+m*l^2)/p; 0; m*l/p];
C = [1 0 0 0; 0 0 1 0];
D = [0; 0];

%% 1. LQR Design
Q = C'*C;
Q(1,1) = 5000;
Q(3,3) = 100;
R = 1;
K = lqr(A, B, Q, R);

%% 2. Precompensation
Cn = [1 0 0 0];
sys_ss = ss(A, B, Cn, 0);
Nbar = rscale(sys_ss, K);

%% 3. Observer Design
% Measure x and phi
P_obs = [-40 -41 -42 -43];
L_obs = place(A', C', P_obs)';

%% Write results
fid = fopen('../../../local/ctms-lqr/results_inverted_pendulum.txt', 'w');
fprintf(fid, 'K: [%.4f, %.4f, %.4f, %.4f]\n', K);
fprintf(fid, 'Nbar: %.4f\n', Nbar);
fprintf(fid, 'L_obs (column 1 - x): [%.4f, %.4f, %.4f, %.4f]\n', L_obs(:,1));
fprintf(fid, 'L_obs (column 2 - phi): [%.4f, %.4f, %.4f, %.4f]\n', L_obs(:,2));

% Also we will print the exact numbers to initialize the runner script
fprintf(fid, 'L_obs matrix formatting for script:\n[');
fprintf(fid, '%.4f %.4f; ', L_obs(1,:));
fprintf(fid, '%.4f %.4f; ', L_obs(2,:));
fprintf(fid, '%.4f %.4f; ', L_obs(3,:));
fprintf(fid, '%.4f %.4f', L_obs(4,:));
fprintf(fid, ']\n');

fclose(fid);
