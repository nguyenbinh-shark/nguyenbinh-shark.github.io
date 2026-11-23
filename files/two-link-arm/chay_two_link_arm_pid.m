function [out,metrics] = chay_two_link_arm_pid(scenario,makePlots)
%CHAY_TWO_LINK_ARM_PID Run one verified teaching scenario without changing the model.
%   [out,metrics] = chay_two_link_arm_pid('PID_CO_TRONG_LUC',true)
% Both built-in PID blocks run at Ts_pid = 0.001 s, with trapezoidal I
% and backward-Euler filtered D; the Multibody plant stays continuous.
%
% Scenarios:
%   P_KHONG_TRONG_LUC  - illustrate proportional response with gravity disabled
%   PD_CO_TRONG_LUC    - gravity on, no integral action
%   PID_CO_TRONG_LUC   - gravity on, built-in PID at both joints
%   PID_MANG_TAI       - same gains with a 0.20 kg payload
%   HAI_KHOP_TUONG_TAC - hold shoulder reference while moving the elbow

if nargin < 1 || isempty(scenario), scenario = 'PID_CO_TRONG_LUC'; end
if nargin < 2, makePlots = true; end
scenario = upper(string(scenario));

folder = fileparts(mfilename('fullpath'));
modelPath = fullfile(folder,'two_link_arm_pid.slx');
mdl = 'two_link_arm_pid';
if ~bdIsLoaded(mdl), load_system(modelPath); end

v = struct('l1',0.40,'l2',0.30,'m1',1.00,'m2',0.60, ...
    'gravityVector',[0 -9.80665 0], ...
    'q1_initial',deg2rad(-90),'q2_initial',0, ...
    'q1_ref0',deg2rad(-90),'q2_ref0',0, ...
    'q1_ref1',deg2rad(30),'q2_ref1',deg2rad(-60), ...
    'q1_ref2',deg2rad(30),'q2_ref2',deg2rad(-60), ...
    't_change1',1,'t_change2',100,'refRate',deg2rad(45), ...
    'Kp1',35,'Ki1',10,'Kd1',4, ...
    'Kp2',12,'Ki2',3,'Kd2',0.8, ...
    'pidI0_1',0,'pidI0_2',0,'Ts_pid',0.001, ...
    'tau1_max',12,'tau2_max',4, ...
    'payloadMass',0,'stopTime',15);

switch scenario
    case "P_KHONG_TRONG_LUC"
        v.gravityVector = [0 0 0];
        v.q1_initial = 0; v.q2_initial = 0;
        v.q1_ref0 = 0; v.q2_ref0 = 0;
        v.q1_ref1 = deg2rad(10); v.q2_ref1 = 0;
        v.q1_ref2 = v.q1_ref1; v.q2_ref2 = v.q2_ref1;
        v.Ki1 = 0; v.Ki2 = 0; v.Kd1 = 0; v.Kd2 = 0;
        v.stopTime = 5;
    case "PD_CO_TRONG_LUC"
        v.Ki1 = 0; v.Ki2 = 0;
    case "PID_CO_TRONG_LUC"
        % Defaults above.
    case "PID_MANG_TAI"
        v.payloadMass = 0.20;
    case "HAI_KHOP_TUONG_TAC"
        v.payloadMass = 0.20;
        v.q1_initial = deg2rad(30); v.q2_initial = deg2rad(-60);
        v.q1_ref0 = v.q1_initial; v.q2_ref0 = v.q2_initial;
        v.q1_ref1 = v.q1_ref0; v.q2_ref1 = deg2rad(45);
        v.q1_ref2 = v.q1_ref1; v.q2_ref2 = v.q2_ref1;
        v.t_change1 = 2;
        v.stopTime = 10;
    otherwise
        error('Unknown scenario %s.',scenario);
end

% Preload only the active integral terms with the static gravity torque at
% the initial pose. This lets the coupling scenario hold its initial pose
% before the elbow command instead of confusing startup sag with coupling.
[gravityTau1,gravityTau2] = static_gravity_torque(v);
if v.Ki1 ~= 0, v.pidI0_1 = gravityTau1; end
if v.Ki2 ~= 0, v.pidI0_2 = gravityTau2; end
assert(abs(v.pidI0_1) <= v.tau1_max && abs(v.pidI0_2) <= v.tau2_max, ...
    'Static gravity preload exceeds a PID output limit.');

in = Simulink.SimulationInput(mdl);
fields = fieldnames(v);
for k = 1:numel(fields)
    in = in.setVariable(fields{k},v.(fields{k}),'Workspace',mdl);
end
in = in.setModelParameter('StopTime',num2str(v.stopTime));
out = sim(in);

[q1e,t1] = aligned_error(out.q1_ref_log,out.q1_log);
[q2e,t2] = aligned_error(out.q2_ref_log,out.q2_log);
tau1 = column_data(out.tau1_log.Data);
tau2 = column_data(out.tau2_log.Data);
tau1Time = column_data(out.tau1_log.Time);
tau2Time = column_data(out.tau2_log.Time);
metrics = struct( ...
    'scenario',char(scenario), ...
    'pid_sample_time_s',v.Ts_pid, ...
    'duration_s',v.stopTime, ...
    'final_error_q1_deg',rad2deg(q1e(end)), ...
    'final_error_q2_deg',rad2deg(q2e(end)), ...
    'iae_q1_deg_s',rad2deg(trapz(t1,abs(q1e))), ...
    'iae_q2_deg_s',rad2deg(trapz(t2,abs(q2e))), ...
    'peak_tau1_Nm',max(abs(tau1)), ...
    'peak_tau2_Nm',max(abs(tau2)), ...
    'sat_tau1_percent',saturation_time_percent(tau1Time,tau1,0.9999*v.tau1_max), ...
    'sat_tau2_percent',saturation_time_percent(tau2Time,tau2,0.9999*v.tau2_max), ...
    'pre_step_max_abs_q1_error_deg',NaN, ...
    'post_step_max_abs_q1_error_deg',NaN);
if scenario == "HAI_KHOP_TUONG_TAC"
    pre = t1 >= max(0,v.t_change1-0.5) & t1 < v.t_change1;
    post = t1 >= v.t_change1;
    metrics.pre_step_max_abs_q1_error_deg = rad2deg(max(abs(q1e(pre))));
    metrics.post_step_max_abs_q1_error_deg = rad2deg(max(abs(q1e(post))));
end

fprintf(['%-20s final error [q1 q2] = [%+.3f %+.3f] deg; ' ...
    'peak torque = [%.3f %.3f] N*m.\n'],scenario, ...
    metrics.final_error_q1_deg,metrics.final_error_q2_deg, ...
    metrics.peak_tau1_Nm,metrics.peak_tau2_Nm);

if makePlots
    figure('Name',['Two-link arm - ' char(scenario)],'Color','w');
    tiledlayout(2,1,'TileSpacing','compact','Padding','compact');
    nexttile;
    plot_series(out.q1_ref_log,180/pi,'--','LineWidth',1.5); hold on;
    plot_series(out.q1_log,180/pi,'LineWidth',1.5);
    plot_series(out.q2_ref_log,180/pi,'--','LineWidth',1.5);
    plot_series(out.q2_log,180/pi,'LineWidth',1.5);
    grid on; ylabel('Goc (deg)');
    legend('q1 ref','q1','q2 ref','q2','Location','best');
    title(strrep(char(scenario),'_',' '));
    nexttile;
    plot_series(out.tau1_log,1,'LineWidth',1.5); hold on;
    plot_series(out.tau2_log,1,'LineWidth',1.5);
    yline(12,':'); yline(-12,':'); yline(4,':'); yline(-4,':');
    grid on; xlabel('Thoi gian (s)'); ylabel('Mo-men (N.m)');
    legend('tau1','tau2','Location','best');
end
end


function [tau1,tau2] = static_gravity_torque(v)
% Positive actuator torque needed to hold the planar arm at its initial pose.
mp = max(v.payloadMass,1e-6); % Same numerical minimum as the Payload Solid.
q1 = v.q1_initial; q12 = v.q1_initial + v.q2_initial;
a = v.m1*v.l1/2 + (v.m2+mp)*v.l1;
b = v.m2*v.l2/2 + mp*v.l2;
gravityTerm = @(theta) v.gravityVector(1)*sin(theta) ...
    - v.gravityVector(2)*cos(theta);
tau1 = a*gravityTerm(q1) + b*gravityTerm(q12);
tau2 = b*gravityTerm(q12);
end

function [e,t] = aligned_error(reference,measurement)
% Convert every log to a column and compare it on the measurement time base.
% Variable-step Simscape signals can contain different minor time points.
assert(numel(reference.Data)==numel(reference.Time), ...
    'Reference log must contain one scalar value per timestamp.');
assert(numel(measurement.Data)==numel(measurement.Time), ...
    'Measurement log must contain one scalar value per timestamp.');
t = column_data(measurement.Time);
y = column_data(measurement.Data);
tr = column_data(reference.Time);
yr = column_data(reference.Data);
if isequal(t,tr)
    yrOnT = yr;
else
    [tr,uniqueIndex] = unique(tr,'stable');
    yr = yr(uniqueIndex);
    yrOnT = interp1(tr,yr,t,'linear','extrap');
end
e = yrOnT-y;
end

function x = column_data(x)
x = squeeze(x);
x = x(:);
end

function h = plot_series(logData,scale,varargin)
h = plot(column_data(logData.Time),scale*column_data(logData.Data),varargin{:});
end

function percent = saturation_time_percent(t,u,limit)
% Variable-step solvers do not sample uniformly, so integrate elapsed time.
if numel(t)<2 || t(end)<=t(1)
    percent = 0;
else
    percent = 100*trapz(t,double(abs(u)>=limit))/(t(end)-t(1));
end
end
