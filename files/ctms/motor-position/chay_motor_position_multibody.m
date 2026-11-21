function out = chay_motor_position_multibody(kichBan, moHinhVaDoThi)
% Motor DC nhan dien ap, rotor Multibody nhan momen K*i; khong ep chuyen dong.
% Can MATLAB R2022b+, Simulink, Simscape va Simscape Multibody.
% Giu file .m va motor_position_multibody.slx cung thu muc.
% out = chay_motor_position_multibody('PID21_500_015',false); % chi lay du lieu
% CTMS: University of Michigan/CMU/UDMercy; adaptation CC BY-SA 4.0.
% https://ctms.engin.umich.edu/CTMS/index.php?example=MotorPosition&section=ControlPID
% CTMS dung D ly tuong. Model nay dung Kd*s/(Tf*s+1) de dien ap huu han.
% Gioi han dien ap va tai co la vi du bo sung, khong phai thong so CTMS.
if nargin<1, kichBan='PID21_500_015'; end
if nargin<2, moHinhVaDoThi=true; end
validateattributes(moHinhVaDoThi,{'logical','numeric'},{'scalar'});
kichBan=upper(string(kichBan));
if ~isscalar(kichBan), error('CTMS:Scenario','Chon mot ten kich ban.'); end
p=struct('J',3.2284e-6,'b',3.5077e-6,'K',.0274,'R',4,'L',2.75e-6,'r',1,'Kp',21,'Ki',500,'Kd',.15,'Tf',1e-5,'umax',Inf,'antiWindup',0,...
 'openLoop',0,'openVoltage',1,'voltageDisturbance',0,'loadTorque',0,...
 'disturbanceTime',0.1,'stopTime',0.3);
switch kichBan
    case "VONG_HO", p.openLoop=1;
    case "P1", p.Kp=1; p.Ki=0; p.Kd=0;
    case "P11", p.Kp=11; p.Ki=0; p.Kd=0;
    case "P21", p.Kp=21; p.Ki=0; p.Kd=0;
    case "PI21_100", p.Ki=100; p.Kd=0;
    case "PI21_300", p.Ki=300; p.Kd=0;
    case "PI21_500", p.Kd=0;
    case "PID21_500_005", p.Kd=.05;
    case "PID21_500_015"
    case "PID21_500_025", p.Kd=.25;
    case "NHIEU_P21", p.Kp=21; p.Ki=0; p.Kd=0; p.r=0; p.voltageDisturbance=1; p.disturbanceTime=0;
    case "NHIEU_PID", p.r=0; p.voltageDisturbance=1; p.disturbanceTime=0;
    case "GIOI_HAN", p.umax=24;
    case "CHONG_WINDUP", p.umax=24; p.antiWindup=1;
    case "TAI_CO", p.loadTorque=.001;
    case "QUAN_TINH_LON", p.J=1.2*p.J;
    otherwise, error('CTMS:Scenario','Ten kich ban khong hop le. Xem HUONG-DAN-MULTIBODY.md.');
end
folder=fileparts(mfilename('fullpath')); mdl='motor_position_multibody'; file=fullfile(folder,[mdl '.slx']);
if ~isfile(file), error('CTMS:MissingModel','Dat %s.slx canh file .m.',mdl); end
if bdIsLoaded(mdl) && ~strcmpi(get_param(mdl,'FileName'),file)
 error('CTMS:ModelConflict','Dang mo model cung ten o thu muc khac. Hay dong no truoc.');
end
load_system(file); if moHinhVaDoThi, open_system(mdl); end
in=Simulink.SimulationInput(mdl); names=fieldnames(p);
for k=1:numel(names), in=in.setVariable(names{k},p.(names{k}),'Workspace',mdl); end
if ~moHinhVaDoThi, in=in.setModelParameter('SimMechanicsOpenEditorOnUpdate','off'); end
out=sim(in); y=out.theta_log; u=out.u_log;
fprintf('%s: Kp=%g, Ki=%g, Kd=%g, Tf=%g s, J=%g kg*m^2.\n',kichBan,p.Kp,p.Ki,p.Kd,p.Tf,p.J);
fprintf('t=%g s: y=%.8g rad, max|V thuc|=%.8g V.\n',y.Time(end),y.Data(end),max(abs(u.Data)));
fprintf('Mau cuoi la gia tri huu han; bam Run truc tiep dung lai mac dinh.\n');
if moHinhVaDoThi
 figure('Name',['Multibody - ' char(kichBan)],'Color','w'); tiledlayout(3,1);
 nexttile; plot(y.Time,y.Data,'LineWidth',1.5); hold on; yline(p.r,'--'); grid on; ylabel('Goc (rad)');
 nexttile; plot(out.u_requested_log.Time,out.u_requested_log.Data,'--',u.Time,u.Data,'LineWidth',1.2); grid on; ylabel('Dien ap (V)'); legend('Yeu cau','Thuc');
 nexttile; plot(out.current_log.Time,out.current_log.Data,'LineWidth',1.2); grid on; ylabel('Dong dien (A)'); xlabel('Thoi gian (s)');
end
end
