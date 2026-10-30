function [wR_ref, wL_ref, v_cmd, omega_cmd] = xy_tracking_lqr_lap_lich(x, y, yaw, xr, yr, yaw_ref, Ts, reset, K_tab, vg, wg)
%#codegen
%XY_TRACKING_LQR_LAP_LICH  LQR bam quy dao, K lap lich theo (vr, wr).
%   Simscape Multibody Robotics - Bai 10. Giong xy_tracking_lqr, nhung K
%   khong co dinh: noi suy song tuyen tinh tu bang K_tab tinh san bang
%   lqr_mobile_robot.m tren luoi vg (m/s) x wg (rad/s).
%
%   K_tab, vg, wg la PARAMETER (khong phai cong vao): trong cua so Symbols
%   cua khoi, doi Scope cua ba bien nay thanh Parameter. Gia tri lay tu
%   workspace, do InitFcn chay:  chay_mo_phong = false; lqr_mobile_robot
%
%   K_tab(i, j, :) = K(:) tai (vg(i), wg(j)), thu tu cot cua MATLAB.
%   Ngoai luoi thi kep ve bien gan nhat (vd duoi 0.1 m/s dung K cua 0.1 m/s).

r = 0.09685;                 % ban kinh banh xe [m]
d = 0.405;                   % khoang cach 2 banh [m]

persistent isInit xrPrev yrPrev yawRefPrev
if isempty(isInit)
    isInit = false; xrPrev = 0; yrPrev = 0; yawRefPrev = 0;
end
if (~isInit) || (reset ~= 0)
    isInit = true; xrPrev = xr; yrPrev = yr; yawRefPrev = yaw_ref;
    wR_ref = 0; wL_ref = 0; v_cmd = 0; omega_cmd = 0;
    return;
end

% ---- vr, wr bang sai phan lui (nhu Bai 5)
dxr = xr - xrPrev;  dyr = yr - yrPrev;
vr  = sqrt(dxr*dxr + dyr*dyr) / Ts;
e   = yaw_ref - yawRefPrev;
wr  = atan2(sin(e), cos(e)) / Ts;
xrPrev = xr; yrPrev = yr; yawRefPrev = yaw_ref;

% ---- sai so trong he than
ex  =  cos(yaw)*(xr-x) + sin(yaw)*(yr-y);
ey  = -sin(yaw)*(xr-x) + cos(yaw)*(yr-y);
e2  = yaw_ref - yaw;
eth = atan2(sin(e2), cos(e2));

% ---- noi suy K tai (vr, wr)
vq = min(max(vr, vg(1)), vg(end));
wq = min(max(wr, wg(1)), wg(end));
i = 1; while i < numel(vg) - 1 && vg(i+1) <= vq, i = i + 1; end
j = 1; while j < numel(wg) - 1 && wg(j+1) <= wq, j = j + 1; end
a = (vq - vg(i)) / (vg(i+1) - vg(i));
b = (wq - wg(j)) / (wg(j+1) - wg(j));
k = zeros(6, 1);
for c = 1:6
    k(c) = (1-a)*(1-b)*K_tab(i, j, c) + a*(1-b)*K_tab(i+1, j, c) ...
         + (1-a)*b*K_tab(i, j+1, c)   + a*b*K_tab(i+1, j+1, c);
end
K = reshape(k, 2, 3);

% ---- luat LQR + feedforward
du = -K*[ex; ey; eth];
v_cmd     = vr*cos(eth) + du(1);
omega_cmd = wr + du(2);

wR_ref = (v_cmd + omega_cmd*d/2) / r;
wL_ref = (v_cmd - omega_cmd*d/2) / r;
end
