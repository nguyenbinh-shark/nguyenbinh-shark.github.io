function [out, v] = chay_pendulum_multibody(kich_ban, mo_cua_so)
% CHAY_PENDULUM_MULTIBODY Chon PID, xung luc, loc D, gioi han luc.
% Vi du: out=chay_pendulum_multibody('pid_final',false);
% Can MATLAB R2022b+, Simulink, Simscape, Simscape Multibody.
% Dieu khien goc phi=0; KHONG dieu khien vi tri xe.
if nargin<1,kich_ban='pid_final';end
if nargin<2,mo_cua_so=true;end
kich_ban=lower(char(kich_ban));
mdl='inverted_pendulum_multibody'; thu_muc=fileparts(mfilename('fullpath'));
load_system(fullfile(thu_muc,[mdl '.slx']));
v=struct('M',.5,'m',.2,'b',.1,'I',.006,'g',9.8,'l',.3,...
 'Kp',100,'Ki',1,'Kd',20,'N',200,'idealD',1,'umax',Inf,...
 'pulseImpulse',1,'pulseWidth',.01,'pulseStart',.2,'stopTime',10);
switch kich_ban
 case 'pid1',v.Kp=1;v.Ki=1;v.Kd=1;v.stopTime=2;
 case 'pid100',v.Kd=1;
 case 'pid_final'
 case 'no_integral',v.Ki=0;
 case 'filtered',v.idealD=0;v.N=200;
 case 'limited',v.umax=10;
 case 'large_pulse',v.pulseImpulse=2;
 otherwise,error('Kich ban: pid1, pid100, pid_final, no_integral, filtered, limited, large_pulse.');
end
si=Simulink.SimulationInput(mdl);ten=fieldnames(v);
for k=1:numel(ten),si=si.setVariable(ten{k},v.(ten{k}),'Workspace',mdl);end
si=si.setModelParameter('StopTime',num2str(v.stopTime),...
 'SimMechanicsOpenEditorOnUpdate',onoff(mo_cua_so));
if mo_cua_so,open_system(mdl);end
out=sim(si);
if mo_cua_so
 open_system([mdl '/Angle and rate']);open_system([mdl '/Cart position and speed']);
 open_system([mdl '/Control force and disturbance']);
end
fprintf('%s: max|phi|=%.6f rad; x cuoi=%.6f m; v cuoi=%.6f m/s; max|u|=%.6f N.\n',...
 kich_ban,max(abs(out.phi_log.Data)),out.x_log.Data(end),out.v_log.Data(end),max(abs(out.u_log.Data)));
fprintf('Xung %.4g N.s = %.4g N trong %.4g s, bat dau %.4g s.\n',...
 v.pulseImpulse,v.pulseImpulse/v.pulseWidth,v.pulseWidth,v.pulseStart);
end
function s=onoff(b),if b,s='on';else,s='off';end,end
