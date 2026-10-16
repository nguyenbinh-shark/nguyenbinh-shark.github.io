function [wR_ref, wL_ref, v_cmd, omega_cmd] = xy_tracking_lqr(x, y, yaw, xr, yr, yaw_ref, Ts, reset)
%#codegen
%XY_TRACKING_LQR  Vong ngoai bam quy dao bang LQR -> TOC DO GOC BANH DAT.
%   Simscape Multibody Robotics - Bai 10. Cung cong vao/ra voi khoi
%   xy_tracking_ctrl_vel (Kanayama) cua Bai 5: dan code nay vao dung khoi do.
%
%   Lenh = phan biet truoc (feedforward) + phan sua sai (LQR):
%       v_cmd     = vr*cos(eth) + dv
%       omega_cmd = wr          + dw,      [dv; dw] = -K*[ex; ey; eth]
%   K = lqr(A, B, Q, R) tinh tai diem lam viec chay thang 0.6 m/s bang
%   lqr_mobile_robot.m (Bryson: ex 0.2 m, ey 0.1 m, dv 0.3 m/s, dw 0.5 rad/s).
%
%   Tuy chon LQI: dat DUNG_TICH_PHAN = true de cong them tich phan cua ex, ey
%   (khu sai so xac lap khi r, d trong code lech so voi robot that). Tich phan
%   chi chay khi robot da vao gan quy dao (|ex|, |ey| < 5 cm), neu khong no
%   nap day trong luc keo robot tu xa ve va lam robot vot lo (windup).
%
%   BAT BUOC: Sample time cua khoi = Ts; hai khoi Saturation +-17.3 rad/s
%   sau wR_ref, wL_ref; cong reset noi Constant 0 (giong Bai 5).

% =========================== THAM SO ===========================
r = 0.09685;                 % ban kinh banh xe [m]
d = 0.405;                   % khoang cach 2 banh [m] - file Bai 5 dang de 0.5, phai sua
K = [-1.5   0      0;        % K_lqr: hang 1 -> dv, hang 2 -> dw
      0    -5.0   -2.449];   % du = -K*e  =>  dv = 1.5*ex, dw = 5*ey + 2.449*eth

DUNG_TICH_PHAN = false;
Ka  = [-2.291  0      0      -1.5   0;      % LQI: -Ka*[ex; ey; eth; zx; zy]
        0     -7.012 -2.901   0    -2.5];
E_GAN = 0.05;                % chi tich phan khi |ex| va |ey| duoi muc nay [m]
Z_MAX = 0.05;                % kep tich phan, lop an toan thu hai [m.s]

% ======================= BIEN TRANG THAI =======================
persistent isInit xrPrev yrPrev yawRefPrev zx zy
if isempty(isInit)
    isInit = false;
    xrPrev = 0; yrPrev = 0; yawRefPrev = 0; zx = 0; zy = 0;
end

% ===================== KHOI TAO / RESET ========================
if (~isInit) || (reset ~= 0)
    isInit = true;
    xrPrev = xr; yrPrev = yr; yawRefPrev = yaw_ref; zx = 0; zy = 0;
    wR_ref = 0; wL_ref = 0; v_cmd = 0; omega_cmd = 0;
    return;
end

% ============== UOC LUONG vr, wr (sai phan lui, nhu Bai 5) =======
dxr = xr - xrPrev;
dyr = yr - yrPrev;
vr  = sqrt(dxr*dxr + dyr*dyr) / Ts;
e    = yaw_ref - yawRefPrev;
wr   = atan2(sin(e), cos(e)) / Ts;
xrPrev = xr; yrPrev = yr; yawRefPrev = yaw_ref;

% ===================== SAI SO TRONG HE THAN =====================
ex  =  cos(yaw)*(xr-x) + sin(yaw)*(yr-y);
ey  = -sin(yaw)*(xr-x) + cos(yaw)*(yr-y);
e2  = yaw_ref - yaw;
eth = atan2(sin(e2), cos(e2));

% ========================= LUAT LQR ============================
if DUNG_TICH_PHAN
    if abs(ex) < E_GAN && abs(ey) < E_GAN
        zx = min(max(zx + ex*Ts, -Z_MAX), Z_MAX);
        zy = min(max(zy + ey*Ts, -Z_MAX), Z_MAX);
    end
    du = -Ka*[ex; ey; eth; zx; zy];
else
    du = -K*[ex; ey; eth];
end
v_cmd     = vr*cos(eth) + du(1);
omega_cmd = wr + du(2);

% ================= DONG HOC NGHICH -> BANH XE ==================
wR_ref = (v_cmd + omega_cmd*d/2) / r;
wL_ref = (v_cmd - omega_cmd*d/2) / r;
end
