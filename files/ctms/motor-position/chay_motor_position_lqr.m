function out = chay_motor_position_lqr(name, mo_cua_so)
if nargin < 2, mo_cua_so = true; end
mdl = 'motor_position_lqr_multibody';
load_system(mdl);

% Mặc định từ CTMS_PLACE
J = 0.01; b = 0.1; K_e = 0.01; R_m = 1; L = 0.5; r_ref = 1;
A = [0 1 0; 0 -b/J K_e/J; 0 -K_e/L -R_m/L]; B = [0; 0; 1/L]; C = [1 0 0];
Aa = [A zeros(3,1); -C 0]; Ba = [B; 0];
p = [-100+100i -100-100i -200 -300];
Kc = place(Aa, Ba, p);
K_def = Kc(1:3); Ki_def = -Kc(4);

switch name
    case 'CTMS_PLACE'
        umax = 24; antiWindup = 0.1; Nbar = 0; K = K_def; Ki = Ki_def; loadTorque = 0; disturbanceTime = 0.5;
    case 'LQI'
        R_weight = 1;
        Q_weight = diag([100, 0, 0, 1000]); % Tuned for stability in Multibody
        Klqi_aug = lqr(Aa, Ba, Q_weight, R_weight);
        K = Klqi_aug(1:3); Ki = -Klqi_aug(4); Nbar = 0;
        umax = 24; antiWindup = 0.1; loadTorque = 0; disturbanceTime = 0.5;
    case 'LQI_TAI'
        R_weight = 1;
        Q_weight = diag([100, 0, 0, 1000]);
        Klqi_aug = lqr(Aa, Ba, Q_weight, R_weight);
        K = Klqi_aug(1:3); Ki = -Klqi_aug(4); Nbar = 0;
        umax = 24; antiWindup = 0.1;
        loadTorque = 0.01; disturbanceTime = 2;
end

mw = get_param(mdl, 'ModelWorkspace');
assignin(mw, 'K', K); assignin(mw, 'Ki', Ki); assignin(mw, 'Nbar', Nbar);
assignin(mw, 'umax', umax); assignin(mw, 'antiWindup', antiWindup);
assignin(mw, 'loadTorque', loadTorque); assignin(mw, 'disturbanceTime', disturbanceTime);
assignin(mw, 'voltageDisturbance', 0); assignin(mw, 'stopTime', 5);

fprintf('\nMultibody %s:\n', name);
out = sim(mdl);

if mo_cua_so
    figure('Name', ['LQR 3 Motor Position - ' name], 'NumberTitle', 'off');
    subplot(2,1,1);
    plot(out.theta_log.Time, out.theta_log.Data, 'b', 'LineWidth', 1.5);
    hold on; grid on;
    yline(1, 'r--', 'Reference');
    title('Angle \theta (rad)');
    
    subplot(2,1,2);
    plot(out.u_log.Time, out.u_log.Data, 'r', 'LineWidth', 1.5);
    hold on; grid on;
    title('Applied Voltage (V)');
    xlabel('Time (s)');
end
end
