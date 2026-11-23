function out=chay_suspension_multibody(kichBan,moHinhVaDoThi)
%CHAY_SUSPENSION_MULTIBODY He treo hai khoi luong nhan luc, Multibody 3D.
% Can MATLAB R2022b+, Simulink, Simscape, Simscape Multibody.
% Dat file nay canh suspension_multibody.slx. Khong can toolbox dieu khien.
% out=chay_suspension_multibody('PID_GAP_DOI');
% out=chay_suspension_multibody('VONG_HO',false);
% CTMS gains follow EXECUTABLE CODE, not swapped labels in tutorial prose.
% Derivative is Kd*s/(Tf*s+1), Tf=0.1 ms (ideal CTMS uses Kd*s).
% Road is a 0.1 m step filtered with 1 ms time constant; neither mass motion
% is prescribed. The tire damper sees the finite road velocity.
% Gravity removed: displacements are deviations from static equilibrium.
% Limit +/-10 kN and antiwindup are illustrative additions, not CTMS specs.
% CTMS Suspension, University of Michigan and collaborators; CC BY-SA 4.0.
% https://ctms.engin.umich.edu/CTMS/index.php?example=Suspension&section=ControlPID
if nargin<1,kichBan='PID_GAP_DOI';end
if nargin<2,moHinhVaDoThi=true;end
validateattributes(moHinhVaDoThi,{'numeric','logical'},{'scalar'});
kichBan=upper(string(kichBan));if ~isscalar(kichBan),error('CTMS:Scenario','Chon mot kich ban.');end
p=struct('m1',2500,'m2',320,'k1',80000,'k2',500000,'b1',350,'b2',15020,'Kp',1664200,'Ki',1248150,'Kd',416050,'Tf',0.0001,'roadTau',0.001,'roadHeight',0.1,'roadTime',0.5,'umax',Inf,'antiWindup',0,'stopTime',10);
switch kichBan
 case "VONG_HO",p.Kp=0;p.Ki=0;p.Kd=0;p.stopTime=80;
 case "PID_BAN_DAU",p.Kp=832100;p.Ki=624075;p.Kd=208025;
 case "PID_GAP_DOI"
 case "GIOI_HAN",p.umax=10000;
 case "CHONG_WINDUP",p.umax=10000;p.antiWindup=1;
 case "DUONG_EM_HON",p.roadTau=0.02;
 case "THAN_NANG_HON",p.m1=3000;
 otherwise,error('CTMS:Scenario','Chon VONG_HO, PID_BAN_DAU, PID_GAP_DOI, GIOI_HAN, CHONG_WINDUP, DUONG_EM_HON hoac THAN_NANG_HON.');
end
folder=fileparts(mfilename('fullpath'));mdl='suspension_multibody';file=fullfile(folder,[mdl '.slx']);
if ~isfile(file),error('CTMS:MissingModel','Dat %s.slx canh file .m.',mdl);end
if bdIsLoaded(mdl)&&~strcmpi(get_param(mdl,'FileName'),file),error('CTMS:ModelConflict','Dang mo mo hinh cung ten o thu muc khac. Hay dong no truoc.');end
load_system(file);if moHinhVaDoThi,open_system(mdl);end
in=Simulink.SimulationInput(mdl);fn=fieldnames(p);for k=1:numel(fn),in=in.setVariable(fn{k},p.(fn{k}),'Workspace',mdl);end
if ~moHinhVaDoThi,in=in.setModelParameter('SimMechanicsOpenEditorOnUpdate','off');end
out=sim(in);q=out.q_log;u=out.u_log;
fprintf('\n%s: max|x1-x2|=%.6f mm; max|luc|=%.3f N; q cuoi=%.6f mm.\n',kichBan,1000*max(abs(q.Data)),max(abs(u.Data)),1000*q.Data(end));
fprintf('Tf=%g s; roadTau=%g s. Gia tri cuoi huu han khong tu dong la xac lap.\n',p.Tf,p.roadTau);
fprintf('SimulationInput chi doi lan chay nay. Run truc tiep dung lai PID_GAP_DOI.\n');
if moHinhVaDoThi
 figure('Name',['Suspension - ' char(kichBan)],'Color','w','NumberTitle','off');tiledlayout(3,1,'TileSpacing','compact');
 nexttile;plot(q.Time,1000*q.Data,'LineWidth',1.4);hold on;yline(5,'--');yline(-5,'--');grid on;ylabel('x1-x2 (mm)');title(char(kichBan),'Interpreter','none');
 nexttile;plot(out.x1_log.Time,out.x1_log.Data,out.x2_log.Time,out.x2_log.Data,out.road_log.Time,out.road_log.Data,'LineWidth',1.2);grid on;ylabel('Chuyen vi (m)');legend('Than x1','Banh x2','Duong w','Location','best');
 nexttile;plot(out.u_requested_log.Time,out.u_requested_log.Data,u.Time,u.Data,'LineWidth',1.2);grid on;ylabel('Luc (N)');xlabel('Thoi gian (s)');legend('Yeu cau','Thuc','Location','best');
end
end
