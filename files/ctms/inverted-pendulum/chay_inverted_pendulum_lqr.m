function out = chay_inverted_pendulum_lqr(name, mo_cua_so)
if nargin < 2, mo_cua_so = true; end
mdl = 'inverted_pendulum_lqr_multibody';
if ~bdIsLoaded(mdl), load_system(mdl); end
if mo_cua_so, open_system(mdl); end

in = Simulink.SimulationInput(mdl);
in = in.setModelParameter('StopTime', '5');

% Physical parameters — populate base workspace so Simscape block
% expressions resolve correctly at sim time
assignin('base', 'M', 0.5);
assignin('base', 'm', 0.2);
assignin('base', 'b', 0.1);
assignin('base', 'I', 0.006);
assignin('base', 'g', 9.8);
assignin('base', 'l', 0.3);

if strcmp(name, 'CTMS_LQR')
    in = in.setVariable('K', [-70.7107 -37.8345 105.5298 20.9238]);
    in = in.setVariable('Nbar', -70.7107);
    in = in.setVariable('L_obs', [82.6416 -1.0372; 1699.2028 -40.2283; -1.3856 83.1766; -76.1826 1760.4216]);
    
    A = [0 1 0 0; 0 -0.1818 2.6727 0; 0 0 0 1; 0 -0.4545 31.1818 0];
    B = [0; 1.8182; 0; 4.5455];
    C = [1 0 0 0; 0 0 1 0];
    in = in.setVariable('A_obs', A);
    in = in.setVariable('B_obs', B);
    in = in.setVariable('C_obs', C);
    
    in = in.setVariable('umax', 10);
    in = in.setVariable('reference', 0.2);
else
    error('Unknown scenario: %s', name);
end

out = sim(in);
assignin('base', 'out', out);
assignin('base', 'x_log', out.x_log);
assignin('base', 'x_hat_log', out.x_hat_log);
assignin('base', 'u_log', out.u_log);
assignin('base', 'u_requested_log', out.u_requested_log);
assignin('base', 'reference_log', out.reference_log);

end
