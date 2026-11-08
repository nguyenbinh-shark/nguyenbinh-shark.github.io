function out = chay_motor_speed_multibody(kichBan, moHinhVaDoThi)
% Motor DC nhan dien ap, rotor Multibody nhan momen K*i; khong ep chuyen dong.
% Can MATLAB R2022b+, Simulink, Simscape va Simscape Multibody.
% Giu file .m va motor_speed_multibody.slx cung thu muc.
% out = chay_motor_speed_multibody('PID100_200_10',false); % chi lay du lieu
% CTMS: University of Michigan/CMU/UDMercy; adaptation CC BY-SA 4.0.
% https://ctms.engin.umich.edu/CTMS/index.php?example=MotorSpeed&section=ControlPID
% CTMS dung D ly tuong. Model nay dung Kd*s/(Tf*s+1) de dien ap huu han.
% Gioi han dien ap va tai co la vi du bo sung, khong phai thong so CTMS.
if nargin<1, kichBan='PID100_200_10'; end
if nargin<2, moHinhVaDoThi=true; end
validateattributes(moHinhVaDoThi,{'logical','numeric'},{'scalar'});
kichBan=upper(string(kichBan));
if ~isscalar(kichBan), error('CTMS:Scenario','Chon mot ten kich ban.'); end
p=struct('J',.01,'b',.1,'K',.01,'R',1,'L',.5,'r',1,'Kp',100,'Ki',200,'Kd',10,'Tf',.001,'umax',Inf,'antiWindup',0,...
 'openLoop',0,'openVoltage',1,'voltageDisturbance',0,'loadTorque',0,...
 'disturbanceTime',3,'stopTime',8);
switch kichBan
    case "VONG_HO", p.openLoop=1;
    case "P100", p.Kp=100; p.Ki=0; p.Kd=0;
    case "PID75_1_1", p.Kp=75; p.Ki=1; p.Kd=1; p.stopTime=600;
    case "PID100_200_1", p.Kd=1;
    case "PID100_200_10"
    case "GIOI_HAN", p.umax=12;
    case "CHONG_WINDUP", p.umax=12; p.antiWindup=1;
    case "TAI_CO", p.loadTorque=.01;
    case "QUAN_TINH_LON", p.J=1.2*p.J;
    otherwise, error('CTMS:Scenario','Ten kich ban khong hop le. Xem HUONG-DAN-MULTIBODY.md.');
end
folder=fileparts(mfilename('fullpath')); mdl='motor_speed_multibody'; file=fullfile(folder,[mdl '.slx']);
if ~isfile(file), error('CTMS:MissingModel','Dat %s.slx canh file .m.',mdl); end
if bdIsLoaded(mdl) && ~strcmpi(get_param(mdl,'FileName'),file)
 error('CTMS:ModelConflict','Dang mo model cung ten o thu muc khac. Hay dong no truoc.');
end
load_system(file); if moHinhVaDoThi, open_system(mdl); end
in=Simulink.SimulationInput(mdl); names=fieldnames(p);
for k=1:numel(names), in=in.setVariable(names{k},p.(names{k}),'Workspace',mdl); end
if ~moHinhVaDoThi, in=in.setModelParameter('SimMechanicsOpenEditorOnUpdate','off'); end
out=sim(in); y=out.omega_log; u=out.u_log;
fprintf('%s: Kp=%g, Ki=%g, Kd=%g, Tf=%g s, J=%g kg*m^2.\n',kichBan,p.Kp,p.Ki,p.Kd,p.Tf,p.J);
fprintf('t=%g s: y=%.8g rad/s, max|V thuc|=%.8g V.\n',y.Time(end),y.Data(end),max(abs(u.Data)));
fprintf('Mau cuoi la gia tri huu han; bam Run truc tiep dung lai mac dinh.\n');
if moHinhVaDoThi
 figure('Name',['Multibody - ' char(kichBan)],'Color','w'); tiledlayout(3,1);
 nexttile; plot(y.Time,y.Data,'LineWidth',1.5); hold on; yline(p.r,'--'); grid on; ylabel('Toc do (rad/s)');
 nexttile; plot(out.u_requested_log.Time,out.u_requested_log.Data,'--',u.Time,u.Data,'LineWidth',1.2); grid on; ylabel('Dien ap (V)'); legend('Yeu cau','Thuc');
 nexttile; plot(out.current_log.Time,out.current_log.Data,'LineWidth',1.2); grid on; ylabel('Dong dien (A)'); xlabel('Thoi gian (s)');
end
end
