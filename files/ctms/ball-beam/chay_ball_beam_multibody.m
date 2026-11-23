function [out, v] = chay_ball_beam_multibody(kich_ban, mo_cua_so)
% CHAY_BALL_BEAM_MULTIBODY Mo hinh tuong duong goc nho CTMS.
% Bong chuyen dong do luc trong joint, khong ap dat quy dao.
% D tren sai so DUOC LOC; CTMS ideal PD la doi chieu rieng trong bai.
if nargin<1,kich_ban='pd15_40';end
if nargin<2,mo_cua_so=true;end
kich_ban=lower(char(kich_ban));mdl='ball_beam_multibody';
load_system(fullfile(fileparts(mfilename('fullpath')),[mdl '.slx']));
v=struct('m',.111,'R',.015,'J',9.99e-6,'g',9.8,'d',.03,'L',1,...
 'Kp',15,'Kd',40,'N',100,'reference',.25,'thetaMax',Inf,...
 'derivativeOnError',1,'stopTime',10);
switch kich_ban
 case 'p1',v.Kp=1;v.Kd=0;v.stopTime=70;
 case 'pd10_10',v.Kp=10;v.Kd=10;
 case 'pd10_20',v.Kp=10;v.Kd=20;
 case 'pd15_40'
 case 'd_measurement',v.derivativeOnError=0;v.stopTime=15;
 case 'limited',v.thetaMax=1;v.derivativeOnError=0;v.stopTime=15;
 case 'filter10',v.N=10;
 otherwise,error('Kich ban: p1, pd10_10, pd10_20, pd15_40, d_measurement, limited, filter10.');
end
si=Simulink.SimulationInput(mdl);ten=fieldnames(v);
for k=1:numel(ten),si=si.setVariable(ten{k},v.(ten{k}),'Workspace',mdl);end
if mo_cua_so,s='on';else,s='off';end
si=si.setModelParameter('StopTime',num2str(v.stopTime),'SimMechanicsOpenEditorOnUpdate',s);
if mo_cua_so,open_system(mdl);end
out=sim(si);
if mo_cua_so,open_system([mdl '/Position reference and velocity']);open_system([mdl '/Servo and beam angle']);end
fprintf('%s: r cuoi=%.6f m; max|theta|=%.4g rad; max|alpha|=%.4g rad.\n',...
 kich_ban,out.r_log.Data(end),max(abs(out.theta_log.Data)),max(abs(out.alpha_log.Data)));
end
