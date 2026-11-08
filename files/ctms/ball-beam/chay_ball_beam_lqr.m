function out = chay_ball_beam_lqr(name, mo_cua_so)
if nargin < 2, mo_cua_so = true; end
mdl = 'ball_beam_lqr_multibody';
if ~bdIsLoaded(mdl), load_system(mdl); end
if mo_cua_so, open_system(mdl); end

in = Simulink.SimulationInput(mdl);
in = in.setModelParameter('StopTime', '5');

% Physical parameters — populate base workspace so Simscape block
% expressions (e.g. 'L', 'g', 'm') resolve correctly at sim time
assignin('base', 'm', 0.111);
assignin('base', 'R', 0.015);
assignin('base', 'g', 9.8);
assignin('base', 'L', 1.0);
assignin('base', 'w', 0.06);
assignin('base', 'h', 0.02);
assignin('base', 'J_beam', 1.0 * (1.0^2 + 0.02^2) / 12);

if strcmp(name, 'CTMS_LQR')
    % CTMS K for angular acceleration input
    % We apply K directly, but since our plant input is Torque, 
    % we use the CTMS-derived K multiplied by J_beam in our K vector setup
    % Actually we will just pass the K matrix designed by our LQR script
    % which is already designed for the Torque plant!
    % The script lqr_ball_beam.m will generate this.
    in = in.setVariable('K', [226.7, 108.6, 219.5, 33.6]); 
    in = in.setVariable('Nbar', 226.7);
    in = in.setVariable('Ki', 0);
    in = in.setVariable('umax', 10);
    in = in.setVariable('reference', 0.25);
elseif strcmp(name, 'LQR_BRYSON')
    % From Bryson's rule
    in = in.setVariable('K', [-41.1026, -18.3201, 41.0990, 2.6177]); 
    in = in.setVariable('Nbar', -40.0148);
    in = in.setVariable('Ki', 0);
    in = in.setVariable('umax', 10);
    in = in.setVariable('reference', 0.25);
else
    error('Unknown scenario: %s', name);
end

out = sim(in);
assignin('base', 'out', out);
assignin('base', 'x_log', out.x_log);
assignin('base', 'r_log', out.r_log);
assignin('base', 'u_log', out.u_log);
assignin('base', 'u_requested_log', out.u_requested_log);
assignin('base', 'feedback_terms_log', out.feedback_terms_log);
assignin('base', 'reference_log', out.reference_log);

end
