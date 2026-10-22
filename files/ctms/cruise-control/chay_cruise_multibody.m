function out = chay_cruise_multibody(kichBan, moHinhVaDoThi)
%CHAY_CRUISE_MULTIBODY Chon va chay xe 3-D nhan luc tu bo P/PI.
% Can MATLAB R2022b+, Simulink, Simscape va Simscape Multibody.
% Giu file nay va cruise_control_multibody.slx cung thu muc.
% Khong can ham ho tro khac hay Control System Toolbox.
%   out = chay_cruise_multibody('PI800_40');
%   out = chay_cruise_multibody('P100');
%   out = chay_cruise_multibody('PI600_1'); % 1200 s de thay duoi cham
%   out = chay_cruise_multibody('CHONG_WINDUP');
%   out = chay_cruise_multibody('P100',false); % khong mo model/Explorer/do thi
% SimulationInput chi doi tham so cho lan chay, khong sua mac dinh cua .slx.
% Xe co mot bac tu do tinh tien. Banh minh hoa duoc gan cung vao than xe;
% chua mo phong quay banh, tiep xuc lop-duong, dong co hoac he treo.
% Attribution: CTMS Cruise Control, University of Michigan and collaborators.
% https://ctms.engin.umich.edu/CTMS/index.php?example=CruiseControl&section=ControlPID
% Adaptation: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/
% Gioi han +/-1500 N, tai 200 N, va sai tham so +20% la vi du bo sung;
% khong phai thong so xe do thuc hay thong so duoc CTMS cung cap.

if nargin<1, kichBan='PI800_40'; end
if nargin<2, moHinhVaDoThi=true; end
validateattributes(moHinhVaDoThi,{'logical','numeric'},{'scalar'});
kichBan=upper(string(kichBan));
if ~isscalar(kichBan), error('CTMS:Scenario','Chon mot ten kich ban.'); end

p=struct('m',1000,'b',50,'r',10,'Kp',800,'Ki',40,'umax',Inf,...
    'antiWindup',0,'disturbanceAmplitude',0,'disturbanceTime',20,'stopTime',120);
switch kichBan
    case "P100"
        p.Kp=100; p.Ki=0;
    case "P5000"
        p.Kp=5000; p.Ki=0;
    case "PI600_1"
        p.Kp=600; p.Ki=1; p.stopTime=1200;
    case "PI800_40"
        % Dung cac gia tri CTMS mac dinh.
    case "GIOI_HAN"
        p.umax=1500;
    case "CHONG_WINDUP"
        p.umax=1500; p.antiWindup=1;
    case "TAI_200N"
        p.disturbanceAmplitude=200;
    case "XE_NANG_HON"
        p.m=1200;
    case "CAN_LON_HON"
        p.b=60;
    otherwise
        error('CTMS:Scenario',...
            ['Ten khong hop le. Chon P100, P5000, PI600_1, PI800_40, '...
             'GIOI_HAN, CHONG_WINDUP, TAI_200N, XE_NANG_HON hoac CAN_LON_HON.']);
end

folder=fileparts(mfilename('fullpath'));
mdl='cruise_control_multibody';
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
fprintf('\nMultibody %s: Kp=%g, Ki=%g, m=%g kg, b=%g N.s/m, gioi han luc=%g N.\n',...
    kichBan,p.Kp,p.Ki,p.m,p.b,p.umax);
fprintf('Tai t=%g s: v=%.6f m/s; luc thuc=%.6f N; max|luc thuc|=%.6f N.\n',...
    v.Time(end),v.Data(end),u.Data(end),max(abs(u.Data)));
fprintf('Ket qua tai mau cuoi la ket qua huu han, khong tu dong la gia tri xac lap.\n');
fprintf('Tham so chi ap dung cho lan chay nay. Bam Run trong .slx se dung lai mac dinh PI800_40.\n');

if moHinhVaDoThi
    requested=out.u_requested_log;
    proportional=out.proportional_force_log;
    integral=out.integral_force_log;
    figure('Name',['Multibody - ' char(kichBan)],'NumberTitle','off','Color','w');
    tiledlayout(3,1,'TileSpacing','compact');
    nexttile;
    plot(v.Time,v.Data,'LineWidth',1.5); hold on;
    yline(p.r,'--','Toc do dat'); grid on;
    ylabel('Toc do (m/s)'); legend('v do duoc','r dat','Location','best');
    title(['Cruise Control - ' char(kichBan)],'Interpreter','none');
    nexttile;
    plot(requested.Time,requested.Data,'--',u.Time,u.Data,'LineWidth',1.3); grid on;
    ylabel('Luc (N)'); legend('Luc yeu cau','Luc thuc','Location','best');
    nexttile;
    plot(proportional.Time,proportional.Data,integral.Time,integral.Data,'LineWidth',1.3); grid on;
    ylabel('Luc (N)'); xlabel('Thoi gian (s)'); legend('Phan P','Phan I','Location','best');
end
end
