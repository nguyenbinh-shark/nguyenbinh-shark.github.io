function out = chay_motor_speed_lqr(kichBan, moHinhVaDoThi)
%CHAY_MOTOR_SPEED_LQR Chon va chay dong co DC nhan dien ap tu bo LQR/LQI.
% Can MATLAB R2022b+, Simulink, Simscape va Simscape Multibody.

if nargin<1, kichBan='CTMS_PLACE'; end
if nargin<2, moHinhVaDoThi=true; end
validateattributes(moHinhVaDoThi,{'logical','numeric'},{'scalar'});
kichBan=upper(string(kichBan));
if ~isscalar(kichBan), error('CTMS:Scenario','Chon mot ten kich ban.'); end

% Default param values
p = struct('J',.01,'b',.1,'K_e',.01,'R_m',1,'L',.5,'r',1,...
    'K',[12.99 -1],'Ki',0,'Nbar',12.99,'umax',Inf,...
    'voltageDisturbance',0,'loadTorque',0,'disturbanceTime',3,'stopTime',8);

switch kichBan
    case "CTMS_PLACE"
        p.K = [12.99 -1]; p.Nbar = 12.99; p.Ki = 0;
    case "BRYSON"
        p.K = [10.22 -0.05]; p.Nbar = 10.22; p.Ki = 0; p.umax = 12;
    case "LQI_TAI"
        % K_lqi = [4.38 -0.32 -20] -> Kx = [4.38 -0.32], Ki = 20
        p.K = [4.38 -0.32]; p.Ki = 20; p.Nbar = 0;
        p.loadTorque = 0.01;
    case "LQI_TAI_WINDUP"
        p.K = [4.38 -0.32]; p.Ki = 20; p.Nbar = 0;
        p.loadTorque = 0.01;
        p.umax = 12; % limit to show windup if antiWindup = 0
    case "PLACE_TAI"
        p.K = [12.99 -1]; p.Nbar = 12.99; p.Ki = 0;
        p.loadTorque = 0.01;
    otherwise
        error('CTMS:Scenario', 'Ten khong hop le.');
end

folder=fileparts(mfilename('fullpath'));
mdl='motor_speed_lqr_multibody';
file=fullfile(folder,[mdl '.slx']);
if ~isfile(file), error('CTMS:MissingModel','Dat %s.slx canh file .m nay.',mdl); end
if bdIsLoaded(mdl) && ~strcmpi(get_param(mdl,'FileName'),file)
    error('CTMS:ModelConflict','Dang mo mot %s.slx o thu muc khac. Hay dong no truoc.',mdl);
end
load_system(file);
if moHinhVaDoThi, open_system(mdl); end
in=Simulink.SimulationInput(mdl);
% Handle array parameter
in = in.setVariable('K', p.K, 'Workspace', mdl);
fields=fieldnames(p);
for k=1:numel(fields)
    if ~strcmp(fields{k}, 'K')
        in=in.setVariable(fields{k},p.(fields{k}),'Workspace',mdl);
    end
end
if ~moHinhVaDoThi
    in=in.setModelParameter('SimMechanicsOpenEditorOnUpdate','off');
end
out=sim(in);
v=out.omega_log; u=out.u_log;
fprintf('\nMultibody %s: K=[%g %g], Ki=%g, Nbar=%g, umax=%g, load=%g N.m.\n',...
    kichBan,p.K(1),p.K(2),p.Ki,p.Nbar,p.umax,p.loadTorque);
fprintf('Tai t=%g s: omega=%.6f rad/s; dien ap=%.6f V.\n',...
    v.Time(end),v.Data(end),u.Data(end));

if moHinhVaDoThi
    requested=out.u_requested_log;
    figure('Name',['Multibody - ' char(kichBan)],'NumberTitle','off','Color','w');
    tiledlayout(2,1,'TileSpacing','compact');
    nexttile;
    plot(v.Time,v.Data,'LineWidth',1.5); hold on;
    yline(p.r,'--','Toc do dat'); grid on;
    ylabel('Toc do (rad/s)'); legend('\omega do duoc','r dat','Location','best');
    title(['Motor Speed LQR - ' char(kichBan)],'Interpreter','none');
    nexttile;
    plot(requested.Time,requested.Data,'--',u.Time,u.Data,'LineWidth',1.3); grid on;
    ylabel('Dien ap (V)'); legend('Yeu cau','Thuc te','Location','best');
end
end

