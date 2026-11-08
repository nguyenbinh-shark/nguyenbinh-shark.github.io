function out = chay_cruise_lqr(kichBan, moHinhVaDoThi)
%CHAY_CRUISE_LQR Chon va chay xe 3-D nhan luc tu bo LQR/LQI.
% Can MATLAB R2022b+, Simulink, Simscape va Simscape Multibody.
%   out = chay_cruise_lqr('CTMS_PLACE');
%   out = chay_cruise_lqr('BRYSON');
%   out = chay_cruise_lqr('LQI');
%   out = chay_cruise_lqr('LQI_TAI');

if nargin<1, kichBan='LQI'; end
if nargin<2, moHinhVaDoThi=true; end
validateattributes(moHinhVaDoThi,{'logical','numeric'},{'scalar'});
kichBan=upper(string(kichBan));
if ~isscalar(kichBan), error('CTMS:Scenario','Chon mot ten kich ban.'); end

% Default param values matching LQR
p=struct('m',1000,'b',50,'Nbar',1450,'K',1450,'Ki',0,'umax',1500,...
    'loadForce',0,'disturbanceTime',20,'stopTime',120);

switch kichBan
    case "CTMS_PLACE"
        p.K = 1450; p.Nbar = 1450; p.Ki = 0;
    case "BRYSON"
        p.K = 800; p.Nbar = 850; p.Ki = 0; % Nbar = Nu + K*Nx = 50 + 800 = 850
    case "LQI"
        p.K = 800; p.Ki = 40; p.Nbar = 0;
    case "LQI_TAI"
        p.K = 800; p.Ki = 40; p.Nbar = 0;
        p.loadForce = 200;
    case "LQI_XE_NANG_HON"
        p.K = 800; p.Ki = 40; p.Nbar = 0;
        p.m = 1200;
    case "BRYSON_TAI"
        p.K = 800; p.Nbar = 850; p.Ki = 0;
        p.loadForce = 200;
    case "BRYSON_XE_NANG_HON"
        p.K = 800; p.Nbar = 850; p.Ki = 0;
        p.m = 1200;
    otherwise
        error('CTMS:Scenario', 'Ten khong hop le.');
end

folder=fileparts(mfilename('fullpath'));
mdl='cruise_control_lqr_multibody';
file=fullfile(folder,[mdl '.slx']);
if ~isfile(file), error('CTMS:MissingModel','Dat %s.slx canh file .m nay.',mdl); end
if bdIsLoaded(mdl) && ~strcmpi(get_param(mdl,'FileName'),file)
    error('CTMS:ModelConflict','Dang mo mot %s.slx o thu muc khac. Hay dong no truoc.',mdl);
end
load_system(file);
if moHinhVaDoThi, open_system(mdl); end
in=Simulink.SimulationInput(mdl);
fields=fieldnames(p);
for k=1:numel(fields), in=in.setVariable(fields{k},p.(fields{k}),'Workspace',mdl); end
if ~moHinhVaDoThi
    in=in.setModelParameter('SimMechanicsOpenEditorOnUpdate','off');
end
out=sim(in);
v=out.v_log; u=out.u_log;
fprintf('\nMultibody %s: K=%g, Ki=%g, Nbar=%g, m=%g kg, load=%g N.\n',...
    kichBan,p.K,p.Ki,p.Nbar,p.m,p.loadForce);
fprintf('Tai t=%g s: v=%.6f m/s; luc thuc=%.6f N.\n',...
    v.Time(end),v.Data(end),u.Data(end));

if moHinhVaDoThi
    requested=out.u_requested_log;
    kx_log=out.kx_log;
    nbar_log=out.nbar_log;
    integral=out.integral_log;
    figure('Name',['Multibody - ' char(kichBan)],'NumberTitle','off','Color','w');
    tiledlayout(3,1,'TileSpacing','compact');
    nexttile;
    plot(v.Time,v.Data,'LineWidth',1.5); hold on;
    yline(10,'--','Toc do dat'); grid on;
    ylabel('Toc do (m/s)'); legend('v do duoc','r dat','Location','best');
    title(['Cruise Control LQR - ' char(kichBan)],'Interpreter','none');
    nexttile;
    plot(requested.Time,requested.Data,'--',u.Time,u.Data,'LineWidth',1.3); grid on;
    ylabel('Luc (N)'); legend('Luc yeu cau','Luc thuc','Location','best');
    nexttile;
    plot(nbar_log.Time,nbar_log.Data,kx_log.Time,kx_log.Data,integral.Time,integral.Data,'LineWidth',1.3); grid on;
    ylabel('Luc (N)'); xlabel('Thoi gian (s)'); legend('Nbar*r','-K*x','-Ki*int','Location','best');
end
end

