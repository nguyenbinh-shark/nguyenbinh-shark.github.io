function out=chay_aircraft_multibody(kichBan,moHinhVaDoThi)
% MATLAB R2022b+, Simulink, Simscape, Simscape Multibody; no Control Toolbox.
% CTMS AircraftPitch adaptation CC BY-SA 4.0.
% https://ctms.engin.umich.edu/CTMS/index.php?example=AircraftPitch&section=ControlPID
% Computed pitch from moment, linear aerodynamic trim model (not 6-DOF).
if nargin<1,kichBan='PID_CUOI';end
if nargin<2,moHinhVaDoThi=true;end
validateattributes(moHinhVaDoThi,{'logical','numeric'},{'scalar'});
kichBan=upper(string(kichBan));if ~isscalar(kichBan),error('CTMS:Scenario','Chon mot kich ban.');end
p=struct('Kp',5.1852,'Ki',1.74,'Kd',2.98,'N',100,'r',.2,'deltaMax',Inf,...
 'antiWindup',0,'Jpitch',1,'aScale',1,'biasAcceleration',0,'biasTime',20,'stopTime',100);
switch kichBan
 case 'P2',p.Kp=2;p.Ki=0;p.Kd=0;
 case 'P_TUNE',p.Kp=1.1269;p.Ki=0;p.Kd=0;
 case 'PI',p.Kp=1.13;p.Ki=.0263;p.Kd=0;
 case 'PID_DAU',p.Kp=1.0482;p.Ki=.5241;p.Kd=.5241;
 case 'PID_NHANH',p.Kp=4.17;p.Ki=1.2882;p.Kd=.26;
 case 'PID_CUOI'
 case 'GIOI_HAN',p.deltaMax=25*pi/180;
 case 'CHONG_WINDUP',p.deltaMax=25*pi/180;p.antiWindup=1;
 case 'NHIEU_MOMEN',p.biasAcceleration=.02;
 case 'LOC_D_CHAM',p.N=10;
 otherwise,error('CTMS:Scenario','Chon P2, P_TUNE, PI, PID_DAU, PID_NHANH, PID_CUOI, GIOI_HAN, CHONG_WINDUP, NHIEU_MOMEN, LOC_D_CHAM.');
end
folder=fileparts(mfilename('fullpath'));mdl='aircraft_pitch_multibody';file=fullfile(folder,[mdl '.slx']);
if ~isfile(file),error('CTMS:MissingModel','Dat file .slx canh ham nay.');end
if bdIsLoaded(mdl)&&~strcmpi(get_param(mdl,'FileName'),file),error('CTMS:ModelConflict','Dong mo hinh cung ten o thu muc khac.');end
load_system(file);if moHinhVaDoThi,open_system(mdl);end
in=Simulink.SimulationInput(mdl);fn=fieldnames(p);
for k=1:numel(fn),in=in.setVariable(fn{k},p.(fn{k}),'Workspace',mdl);end
if ~moHinhVaDoThi,in=in.setModelParameter('SimMechanicsOpenEditorOnUpdate','off');end
out=sim(in);
fprintf('%s: theta(%g s)=%.6f rad; max|delta|=%.6f rad.\n',kichBan,out.theta_log.Time(end),out.theta_log.Data(end),max(abs(out.delta_log.Data)));
fprintf('Mau cuoi la ket qua huu han; tham so lan chay khong sua mac dinh .slx.\n');
if moHinhVaDoThi
 figure('Name',['Aircraft pitch - ' char(kichBan)],'Color','w');tiledlayout(3,1);
 nexttile;plot(out.theta_log.Time,out.theta_log.Data,'LineWidth',1.4);hold on;yline(p.r,'--');grid on;ylabel('theta (rad)');
 nexttile;plot(out.delta_requested_log.Time,out.delta_requested_log.Data,'--',out.delta_log.Time,out.delta_log.Data,'LineWidth',1.2);grid on;ylabel('delta (rad)');legend('Yeu cau','Thuc');
 nexttile;plot(out.alpha_log.Time,out.alpha_log.Data,out.omega_log.Time,out.omega_log.Data,'LineWidth',1.2);grid on;xlabel('Thoi gian (s)');legend('alpha (rad)','omega (rad/s)');
end
end
