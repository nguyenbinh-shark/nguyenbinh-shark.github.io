function out = chay_suspension_lqr(name, mo_cua_so)
if nargin < 2, mo_cua_so = true; end
mdl = 'suspension_lqr_multibody';
load_system(mdl);

% CTMS Manual Tuning
K_ctms = [0 2300000 500000000 0];
Ki_ctms = 8000000;

switch name
    case 'CTMS_PLACE'
        % use default CTMS Manual Tuning
        K = K_ctms; Ki = Ki_ctms; umax = Inf; antiWindup = 0; Nbar = 0;
    case 'BRYSON'
        [A, B, C, D] = physical_suspension();
        Aa = [A, zeros(4,1); -C, 0]; Ba_u = [B; 0];
        Q = diag([1e7, 1e5, 1e7, 1e5, 1e9]); % Tuned for physical LQR
        R = 1;
        Klqi = lqr(Aa, Ba_u, Q, R);
        K = Klqi(1:4); Ki = -Klqi(5); Nbar = 0;
        umax = Inf; antiWindup = 0;
    case 'BRYSON_LIMIT'
        % Same LQI but with 10kN limit
        [A, B, C, D] = physical_suspension();
        Aa = [A, zeros(4,1); -C, 0]; Ba_u = [B; 0];
        Q = diag([1e7, 1e5, 1e7, 1e5, 1e9]);
        R = 1/(10000^2);
        Klqi = lqr(Aa, Ba_u, Q, R);
        K = Klqi(1:4); Ki = -Klqi(5); Nbar = 0;
        umax = 10000; antiWindup = 0.1;
end

mw = get_param(mdl, 'ModelWorkspace');
assignin(mw, 'K', K); assignin(mw, 'Ki', Ki); assignin(mw, 'Nbar', Nbar);
assignin(mw, 'umax', umax); assignin(mw, 'antiWindup', antiWindup);
assignin(mw, 'roadHeight', 0.1); assignin(mw, 'stopTime', 5);

fprintf('\nMultibody %s:\n', name);
out = sim(mdl);

if mo_cua_so
    figure('Name', ['LQR 4 Suspension - ' name], 'NumberTitle', 'off');
    subplot(2,1,1);
    plot(out.q_log.Time, out.q_log.Data, 'b', 'LineWidth', 1.5);
    hold on; grid on;
    title('Deflection Y1 (m)');
    
    subplot(2,1,2);
    plot(out.u_log.Time, out.u_log.Data, 'r', 'LineWidth', 1.5);
    hold on; grid on;
    title('Applied Force (N)');
    xlabel('Time (s)');
end
end
