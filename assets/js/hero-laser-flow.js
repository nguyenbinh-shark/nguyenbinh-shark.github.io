/* Laser Flow shader and palette: David Haz / React Bits (2026).
 * https://reactbits.dev/animations/laser-flow
 * MIT + Commons Clause: see ./react-bits-LICENSE.txt.
 * Native Jekyll adapter, flowing color waves, theme handling and lifecycle
 * are site-specific.
 */
(() => {
  'use strict';
  const container = document.querySelector('[data-laser-flow]');
  if (!container || !window.requestAnimationFrame) return;
  const VERTEX = `#version 300 es
  in vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }`;
  
  const FRAGMENT = `#version 300 es
  precision highp float;
  out vec4 outColor;
  uniform vec2 uResolution;
  uniform float uDpr;
  uniform float uScale;
  uniform float uTime;
  uniform float uBeamX;
  uniform vec4 uSurface;
  uniform float uRadius;
  uniform vec3 uIntro;
  uniform vec4 uPour;
  uniform vec2 uRun;
  uniform vec4 uLens;
  uniform sampler2D uReveal;
  uniform vec4 uRevealMap;
  uniform vec2 uRevealInfo;
  uniform float uAtmosphere;
  uniform vec4 uAmount;
  uniform vec4 uShape;
  uniform vec4 uExtra;
  uniform vec4 uBeamMotion;
  uniform float uTheme;
  uniform vec3 uTint[16];
  uniform vec3 uNextTint[16];
  uniform float uColorProgress;

  float colorBlend;
  vec3 waveTint(int index) {
    return mix(uTint[index], uNextTint[index], colorBlend);
  }
  
  #define BEAM waveTint(0)
  #define LEFT waveTint(1)
  #define RIGHT waveTint(2)
  #define CYAN waveTint(3)
  #define PINK waveTint(4)
  #define LILAC waveTint(5)
  #define SKY waveTint(6)
  #define PURPLE waveTint(7)
  #define DEEP waveTint(8)
  #define MIST waveTint(9)
  #define NAVY waveTint(10)
  #define WARM waveTint(11)
  #define EMBER waveTint(12)
  #define WHITE waveTint(13)
  #define HAZE waveTint(14)
  #define LAVENDER waveTint(15)
  
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }
  
  float sq(float x) {
    return x * x;
  }
  
  float roundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  
  vec3 spill(float e, float fall, float strength, float front, float t, out vec3 glow) {
    glow = vec3(0.0);
    if (strength < 0.0005) return vec3(0.0);
    float f = max(fall, 0.0);
    float d = max(e, 0.0);
    float u = d / (6.0 + 0.28 * f);
    float start = smoothstep(-6.0, 12.0, fall);
    float fade = exp(-sq(max(f - 125.0, 0.0) / 40.0));
    float streak = 0.88 + 0.24 * noise(vec2(u * 6.0, f / 22.0 - t * 1.7));
    float bright = pow(strength, 1.5);
    float soft = sqrt(strength);
    float warmth = smoothstep(90.0, 130.0, f);
    vec3 coreK = mix(WHITE, WARM, warmth * exp(-d / 9.0));
    float core = mix(9.0, 2.6, warmth) * exp(-sq(d / (3.5 + 0.04 * f))) * exp(-sq(max(f - 130.0, 0.0) / 38.0));
    float wall = 24.0 * exp(-sq(d / 1.1)) * exp(-sq(max(f - 100.0, 0.0) / 30.0));
    float bandCenter = 0.7 - 0.3 * smoothstep(30.0, 110.0, f);
    float offset = u - bandCenter;
    float decay = (1.05 - bandCenter) / 1.31;
    float profile = offset < 0.0 ? exp(-sq(offset / 0.3)) : exp(-offset / decay);
    profile *= 1.0 - smoothstep(1.0, 1.4, u);
    vec3 bandA = mix(CYAN, PINK, smoothstep(50.0, 75.0, f));
    bandA = mix(bandA, LILAC, smoothstep(100.0, 125.0, f));
    vec3 bandB = mix(SKY, PURPLE, smoothstep(50.0, 75.0, f));
    vec3 fanK = mix(bandA, bandB, smoothstep(0.06, 0.18, offset));
    fanK = mix(fanK, DEEP, smoothstep(0.22, 0.42, offset));
    vec3 thread = WHITE * wall * bright + coreK * core * streak * bright;
    glow += fanK * 4.5 * profile * fade * streak * bright;
    glow += MIST * 0.7 * exp(-max(u - 1.0, 0.0) / 0.9) * smoothstep(0.7, 1.2, u) * fade * soft;
    glow += EMBER * 0.35 * exp(-sq((f - 165.0) / 22.0)) * exp(-d / 25.0) * bright;
    float lag = u * (6.0 + 0.28 * f) * 0.35;
    float reveal = 1.0 - smoothstep(front - 70.0, front + 8.0, f + lag);
    glow *= start * reveal;
    return thread * start * reveal;
  }
  
  vec3 easeLight(vec3 light, float amount) {
    return -log(max(1.0 - amount * (1.0 - exp(-light)), vec3(0.0001)));
  }
  
  void main() {
    vec2 frag = vec2(gl_FragCoord.x, uResolution.y * uDpr - gl_FragCoord.y) / uDpr;
    // Follow the existing beam down, then carry the new color along the floor.
    // Only the palette moves: the beam, its brightness and its intro stay intact.
    float flowPath = frag.y + abs(frag.x - uBeamX) * smoothstep(uSurface.y - 80.0 * uScale, uSurface.y, frag.y);
    float maxPath = uResolution.y + max(uBeamX, uResolution.x - uBeamX);
    float feather = max(40.0 * uScale, uResolution.y * 0.08);
    float colorFront = mix(-feather, maxPath + feather, uColorProgress);
    colorBlend = 1.0 - smoothstep(colorFront - feather, colorFront + feather, flowPath);
    vec2 p = frag / uScale;
    float t = uTime;
    float bx = uBeamX / uScale;
    float sl = uSurface.x / uScale;
    float sy = uSurface.y / uScale;
    float sr = uSurface.z / uScale;
    float sb = uSurface.w / uScale;
    float radius = uRadius / uScale;
    float h = sy - p.y;
    float hp = max(h, 0.0);
    float dx = (p.x - bx) - hp * uBeamMotion.x;
    float adx = abs(dx);
    float above = smoothstep(-0.5, 0.5, h);
    float side = smoothstep(-24.0, 24.0, dx);
    vec3 sideK = mix(mix(LAVENDER, LEFT, smoothstep(40.0, 140.0, adx)), RIGHT, side);
    float beamWidth = uShape.x;
    float flare = uShape.y;
    float spread = 250.0 * uShape.z;
    float reachL = max(bx - sl, 1.0);
    float reachR = max(sr - bx, 1.0);
    float reach = dx < 0.0 ? reachL : reachR;
    float layerLen = clamp(0.29 * reach, 20.0, 100.0) * sqrt(uShape.z);
    float run = uRun.x;
    float runMask = 1.0 - smoothstep(run - 34.0, run + 6.0, adx);
    float bead = exp(-sq((adx - run + 16.0) / (18.0 + 0.04 * run))) * uRun.y;
    float flowMask = (1.0 - smoothstep(0.75 * spread, 1.1 * spread, adx)) * runMask;
    float edgeMask = (1.0 - smoothstep(0.8 * spread, 1.25 * spread, adx)) * runMask;
    float bloom = uIntro.y;
    vec2 center = vec2((sl + sr) * 0.5, (sy + sb) * 0.5);
    vec2 halfSize = vec2((sr - sl) * 0.5, (sb - sy) * 0.5);
    float sd = roundBox(p - center, halfSize, radius);
    float outline = max(sd, 0.0);
    float below = max(p.y - sy - radius, 0.0);
    float hug = smoothstep(-0.5, 0.5, sd) * exp(-sq(below / 14.0));
    float hugWide = smoothstep(-0.5, 0.5, sd) * exp(-sq(below / 40.0));
  
    vec3 col = vec3(0.0);
  
    float breathe = 1.0 + uExtra.x * (0.12 * sin(t * 1.5708) + 0.08 * (noise(vec2(t * 0.5, 3.0)) - 0.5));
  
    float front = uIntro.x / uScale;
    float drop = smoothstep(front + 10.0, front - 110.0, p.y);
    float falling = 1.0 - smoothstep(sy - 24.0, sy, front);
    float top = mix(0.3, 1.0, smoothstep(0.0, 0.3 * sy, p.y));
    float wavePulse = 1.0 + uBeamMotion.y * sin(p.y / 52.0 - t * 2.1);
    float beamCore = 24.0 * exp(-adx / (2.0 * beamWidth));
    float beamHalo = (1.3 * exp(-adx / (6.0 * beamWidth)) + 0.34 * exp(-adx / (24.0 * beamWidth))) * uBeamMotion.z * wavePulse;
    vec3 haloK = mix(BEAM, sideK, exp(-hp / 80.0));
    col += (BEAM * beamCore + haloK * beamHalo) * top * above * drop;
    float head = exp(-sq((p.y - front) / 24.0)) * falling;
    col += mix(WHITE, BEAM, 0.35) * head * (7.0 * exp(-adx / (2.6 * beamWidth)) + 1.0 * exp(-adx / (14.0 * beamWidth)));
  
    float psi = adx * (outline + 1.0);
    float rise = max(hp - 17.9 * flare, 0.0);
    float skirtAmp = 16.6 * (exp(-sq(rise / (11.8 * flare))) + 0.3 * exp(-rise / (60.0 * flare)));
    float skirtSpread = mix(134.0, 155.0, side) * breathe * flare * flare * mix(0.35, 1.0, min(bloom, 1.0)) * max(bloom, 1.0);
    float skirt = skirtAmp * exp(-psi / skirtSpread) * exp(-sq(adx / (max(layerLen, 60.0 * sqrt(uShape.z)) * 1.48))) * hug;
    col += sideK * skirt * flowMask * min(bloom, 1.0);
  
    float layer = 12.0 * exp(-adx / layerLen) * exp(-outline / (0.19 * layerLen)) * (1.0 + 0.4 * bead);
    col += sideK * layer * hug * flowMask * min(bloom, 1.0);
    float washMask = smoothstep(sl - 60.0, sl + 6.0, p.x) * (1.0 - smoothstep(sr - 6.0, sr + 45.0, p.x));
    float wash = 1.4 * exp(-adx / 100.0) * exp(-outline / 30.0);
    col += mix(BEAM, sideK, 0.25) * wash * hugWide * washMask * flowMask * min(bloom, 1.0);
    float highWash = 0.7 * exp(-adx / 140.0) * exp(-outline / 60.0);
    col += mix(BEAM, NAVY, 0.5) * highWash * hugWide * washMask * runMask * min(bloom, 1.0);
  
    float sideSign = dx < 0.0 ? 0.0 : 1.0;
    float along = 0.5 * log((hp + 1.0) / (adx + 1.0));
    float lineScale = 6.0;
    float lp = log(max(psi, 1.0) / (120.0 * flare * flare)) * lineScale;
    float lineIndex = floor(lp) + sideSign * 97.0;
    float wobble = 0.22 * (noise(vec2(lineIndex * 3.7, t * 0.4 + along)) - 0.5);
    float lf = fract(lp + wobble) - 0.5;
    float gradient = lineScale * length(vec2(hp + 1.0, adx)) / max(psi, 1.0) / uScale;
    float halfWidth = max(0.35 * gradient, 0.0001);
    float drawWidth = max(halfWidth, 0.6 * gradient);
    float lineShape = exp(-lf * lf / (drawWidth * drawWidth)) * (halfWidth / drawWidth);
    float lineOn = step(0.3, hash(vec2(lineIndex, 1.3)));
    float lineFlow = smoothstep(0.25, 0.85, noise(vec2(lineIndex * 5.3 + 2.0, along * 3.0 + t * 1.1)));
    float flareArea = 120.0 * flare * flare;
    float lineEnvelope = smoothstep(0.85 * flareArea, 1.4 * flareArea, psi) * (1.0 - smoothstep(3.2 * flareArea, 7.5 * flareArea, psi));
    lineEnvelope *= exp(-adx / (layerLen * 1.5)) * hug * flowMask * (1.0 - smoothstep(35.0 * flare, 80.0 * flare, hp));
    float lineBright = mix(0.35, 1.0, hash(vec2(lineIndex, 4.0)));
    col += mix(sideK, WHITE, 0.6) * lineShape * lineOn * lineFlow * lineEnvelope * lineBright * 2.6 * uAmount.w * min(bloom, 1.0);
  
    float edgeGlow = 22.8 * exp(-sq(adx / (150.0 * uShape.z))) * edgeMask * (1.0 + 0.9 * bead);
    float onTop = 1.0 - smoothstep(sy + radius, sy + radius + 10.0, p.y);
    float edgeLine = (exp(-sq(max(sd, 0.0) / 0.9)) + 0.12 * exp(-max(sd, 0.0) / 3.0)) * edgeGlow * onTop;
    col += mix(sideK, WHITE, 0.6) * edgeLine * min(bloom, 1.0);
  
    float pour = uShape.w;
    float baseline = exp(-sq(130.0 / 150.0));
    float strengthR = exp(-sq(reachR / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachR)) / baseline * pour;
    float strengthL = exp(-sq(reachL / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachL)) / baseline * pour;
    float fallY = p.y - sy - 0.3 * radius;
    float rightHalf = smoothstep(center.x - 4.0, center.x + 4.0, p.x);
    float haloR = exp(-length(p - vec2(sr - 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthR);
    float haloL = exp(-length(p - vec2(sl + 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthL);
    vec3 glowR;
    vec3 glowL;
    col += spill(sd, fallY, strengthR, uPour.y, t, glowR) * rightHalf;
    col += spill(sd, fallY, strengthL, uPour.x, t, glowL) * (1.0 - rightHalf);
    col += easeLight(glowR * rightHalf + NAVY * 0.9 * haloR, uPour.w);
    col += easeLight(glowL * (1.0 - rightHalf) + NAVY * 0.9 * haloL, uPour.z);
  
    vec2 toLens = frag - uLens.xy;
    float lens = exp(-dot(toLens, toLens) / sq(uLens.z)) * uLens.w;
    col *= 1.0 + 0.35 * lens * hug;
    float fogAmount = uAmount.y * uAtmosphere;
    float near = exp(-adx / 150.0);
    float envelope = near * (0.3 + 0.4 * exp(-hp / 50.0) + 1.2 * exp(-p.y / 120.0));
    if (fogAmount > 0.001 && h > -2.0 && envelope * max(0.25, 6.0 * exp(-adx / 50.0)) > 0.002) {
      vec2 fq = vec2(dx / 1.7, h) / 85.0 + uExtra.zw;
      vec2 fw = vec2(fbm(fq * 1.3 + vec2(1.7, 9.2) + t * 0.03), fbm(fq * 1.3 + vec2(8.3, 2.8) - t * 0.025));
      float cloud = fbm(fq + uBeamMotion.w * fw);
      float density = smoothstep(0.5, 0.78, cloud);
      float lit = exp(-adx / 50.0);
      float fogMask = smoothstep(-2.0, 20.0, h);
      float reached = smoothstep(front + 80.0, front - 40.0, p.y);
      vec3 fog = (HAZE * 0.45 + BEAM * 6.0 * lit * reached) * density * envelope * fogMask;
      float surfaceLit = exp(-adx / (layerLen * 1.3)) * exp(-outline / 28.0) * hugWide * flowMask * washMask * min(bloom, 1.0);
      fog += sideK * 2.2 * surfaceLit * (smoothstep(0.38, 0.72, cloud) - 0.35) * fogMask;
      float smoke = smoothstep(0.3, 0.75, cloud);
      fog += BEAM * 0.35 * exp(-adx / (22.0 * beamWidth)) * (0.35 + 0.9 * smoke) * fogMask * top * drop;
      col += fog * fogAmount * (1.0 + 1.2 * lens) * mix(1.0, 0.45, uTheme);
    }
  
    if (uRevealInfo.y > 0.001 && uLens.w > 0.002) {
      vec2 toReveal = frag - uLens.xy;
      float reveal = exp(-dot(toReveal, toReveal) / sq(uRevealInfo.x)) * uLens.w;
      vec2 uv = frag * uRevealMap.xy + uRevealMap.zw;
      float onImage = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
      vec4 ui = texture(uReveal, uv);
      float ink = max(ui.r, max(ui.g, ui.b)) * onImage;
      float lit = clamp(col.b * 0.9, 0.0, 1.0) * (1.0 - smoothstep(0.9, 2.2, col.b));
      float clearance = smoothstep(60.0 * sqrt(beamWidth), 150.0 * sqrt(beamWidth), adx);
      col += mix(BEAM, WHITE, 0.4) * ink * reveal * lit * clearance * uRevealInfo.y * 2.2;
    }
  
    float haze = max(col.r, max(col.g, col.b));
    float dotGrid = 1.0 - smoothstep(0.16, 0.32, length(fract(frag / 3.0) - 0.5));
    col += BEAM * dotGrid * clamp(haze, 0.0, 1.5) * (1.0 - smoothstep(1.5, 4.0, haze)) * (0.18 + 0.3 * lens) * uExtra.y;
    if (lens > 0.002) {
      vec2 drift = frag - vec2(0.0, t * 14.0);
      vec2 sparkCell = floor(drift / 7.0);
      vec2 sparkPos = (sparkCell + 0.2 + 0.6 * vec2(hash(sparkCell + 5.1), hash(sparkCell + 2.3))) * 7.0;
      float sparkDist = length(drift - sparkPos);
      float sparkOn = step(0.8, hash(sparkCell + 8.8));
      float sparkTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(sparkCell + 3.7) * 6.283);
      col += WHITE * exp(-sparkDist * sparkDist / 0.35) * sparkOn * sparkTwinkle * lens * clamp(haze * 1.5, 0.0, 1.0) * 1.6 * uAmount.z;
    }
  
    float dustAmount = uAmount.z;
    if (dustAmount > 0.001) {
      float dustLp = log(max(psi, 1.0) / (120.0 * flare * flare)) * 2.2;
      vec2 flowCell = vec2(dustLp / 1.1, (along + t * 0.22) / 0.06);
      vec2 cellId = floor(flowCell) + vec2(sideSign * 131.0, 0.0);
      vec2 cellJitter = vec2(hash(cellId + 1.7), hash(cellId + 8.3));
      vec2 particleFlow = (floor(flowCell) + 0.1 + cellJitter * 0.8) * vec2(1.1, 0.06);
      float particlePsi = 120.0 * flare * flare * exp(particleFlow.x / 2.2);
      float particleAlong = particleFlow.y - t * 0.22;
      float particleX = sqrt(particlePsi * exp(-2.0 * particleAlong)) - 1.0;
      float particleH = sqrt(particlePsi * exp(2.0 * particleAlong)) - 1.0;
      float particleDist = length(vec2(adx - particleX, hp - particleH)) * uScale;
      float particleOn = step(0.62, hash(cellId + 3.1));
      float particleTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(cellId + 9.2) * 6.283);
      float dustZone = exp(-sq(log(max(psi, 1.0) / (200.0 * flare * flare)) / 0.55)) * hug * flowMask * smoothstep(0.0, 6.0, outline);
      col += WHITE * exp(-particleDist * particleDist / 0.3) * particleOn * particleTwinkle * dustZone * 3.0 * dustAmount * min(bloom, 1.0);
  
      vec2 glitterCell = vec2(dx / 3.0, (p.y - t * 26.0) / 9.0);
      vec2 glitterId = floor(glitterCell);
      vec2 glitterJitter = vec2(hash(glitterId + 4.4), hash(glitterId + 2.9));
      vec2 glitterPos = (glitterId + 0.15 + glitterJitter * 0.7) * vec2(3.0, 9.0);
      float glitterDist = length(vec2(dx, p.y - t * 26.0) - glitterPos) * uScale;
      float glitterOn = step(0.7, hash(glitterId + 6.6));
      float glitterTwinkle = 0.5 + 0.5 * sin(t * 6.0 + hash(glitterId + 1.1) * 6.283);
      float glitterZone = exp(-adx / (5.0 * beamWidth)) * smoothstep(1.5, 4.0, adx / beamWidth) * above * smoothstep(25.0, 70.0, hp) * top * drop;
      col += WHITE * exp(-glitterDist * glitterDist / 0.25) * glitterOn * glitterTwinkle * glitterZone * 2.2 * dustAmount * uAtmosphere;
    }
  
    col *= uAmount.x * (1.0 + uIntro.z * 0.9 * exp(-length(vec2(dx, h * 1.6)) / 70.0));
    col *= smoothstep(-0.75, 0.25, sd * uScale);
  
    vec3 emit = 1.0 - exp(-col * mix(1.0, 0.6, uTheme));
    float peak = max(emit.r, max(emit.g, emit.b));
    if (uTheme > 0.5) {
      float low = min(emit.r, min(emit.g, emit.b));
      float chroma = peak - low;
      vec3 hue = (emit - low) / max(chroma, 0.0001);
      float alpha = clamp(pow(chroma, 1.35) * 1.3, 0.0, 1.0) * 0.9;
      outColor = vec4((hue * 0.82 + 0.06) * alpha, alpha);
    } else {
      outColor = vec4(emit, peak);
    }
  }`;
  
  const TINTS = [
    [0, 1],
    [-11.5, 0.77],
    [9.5, 0.95],
    [-53.5, 0.79],
    [39.5, 0.77],
    [16, 0.81],
    [-16.3, 0.92],
    [13.3, 0.96],
    [3, 1.01],
    [1, 0.68],
    [1, 1.15],
    [142.5, 0.51],
    [113.6, 0.28],
    [-7.5, 0.13],
    [-2.7, 0.32],
    [7.5, 0.81]
  ];
  
  const BASE_SATURATION = 0.78;
  const MAX_RENDER_DIM = 2048;
  const INTRO_DROP = 1.25;
  const INTRO_END = 5;
  const COLOR_TRAVEL = 2.8;
  const LASER_COLORS = ['#3847ff', '#ff5a1f', '#1fb6ff', '#a855f7', '#ff9ffc', '#19e3b1', '#ffc233', '#ff3d81'];
  const LASER_RGB = LASER_COLORS.map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255));
  
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const spring = time => {
    const omega = 8;
    const zeta = 0.62;
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    return (
      1 - Math.exp(-zeta * omega * time) * (Math.cos(damped * time) + ((zeta * omega) / damped) * Math.sin(damped * time))
    );
  };
  
  const toHsv = ([r, g, b]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta > 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
    }
    return [(hue * 60 + 360) % 360, max > 0 ? delta / max : 0];
  };
  
  const fromHsv = (hue, saturation) => {
    const h = (((hue % 360) + 360) % 360) / 60;
    const c = saturation;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = 1 - c;
    const [r, g, b] =
      h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    return [r + m, g + m, b + m];
  };
  
  const buildTints = rgb => {
    const [hue, saturation] = toHsv(rgb);
    const strength = saturation / BASE_SATURATION;
    const data = new Float32Array(TINTS.length * 3);
    TINTS.forEach(([shift, scale], index) => {
      data.set(fromHsv(hue + shift, clamp(BASE_SATURATION * scale * strength, 0, 1)), index * 3);
    });
    return data;
  };
  
  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  
  const link = (gl, vertexSource, fragmentSource) => {
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return program;
  };
  
  const locate = (gl, program, names) => {
    const result = {};
    for (const name of names) result[name] = gl.getUniformLocation(program, name);
    return result;
  };

  const hero = container.closest('.home-hero');
  const canvas = document.createElement('canvas');
  let gl;
  try { gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (_) { return; }
  if (!gl) return;
  canvas.className = 'laser-background__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  container.append(canvas);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const mobile = window.matchMedia('(pointer: coarse), (max-width: 767px)');
  let program, vao, buffer, texture, uniforms, parallel;
  let raf = 0, last = 0, lastDraw = 0, time = 0, intro = reduced.matches ? INTRO_END : 0;
  let ready = false, failed = false, dirty = true, visible = !('IntersectionObserver' in window), printing = false;
  let width = 1, height = 1, ratio = 1, theme = 0, palettes = [];
  const pointer = { x: 0, y: 0, inside: false };
  const lens = { x: 0, y: 0, amount: 0 };
  const uniformNames = ['uResolution', 'uDpr', 'uScale', 'uTime', 'uBeamX', 'uSurface', 'uRadius', 'uIntro', 'uPour', 'uRun', 'uLens', 'uReveal', 'uRevealMap', 'uRevealInfo', 'uAtmosphere', 'uAmount', 'uShape', 'uExtra', 'uBeamMotion', 'uTheme', 'uTint', 'uNextTint', 'uColorProgress'];

  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function wake() {
    if (!raf && !failed && visible && !document.hidden && !printing) raf = requestAnimationFrame(frame);
  }
  function fail() {
    failed = true;
    stop();
    container.classList.remove('is-enhanced');
    canvas.hidden = true;
  }
  function refresh() { dirty = true; wake(); }
  function initialise() {
    ready = false;
    failed = false;
    parallel = gl.getExtension('KHR_parallel_shader_compile');
    program = link(gl, VERTEX, FRAGMENT);
    if (!program) { fail(); return; }
    vao = gl.createVertexArray();
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    dirty = true;
    wake();
  }
  function resolveProgram() {
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { fail(); return false; }
    uniforms = locate(gl, program, uniformNames);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    ready = true;
    return true;
  }
  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    const isMob = mobile.matches;
    const dpr = isMob ? 0.65 : Math.min(window.devicePixelRatio || 1, 1.25);
    const cap = Math.min(MAX_RENDER_DIM, isMob ? 640 : 1280);
    ratio = Math.min(dpr, cap / Math.max(width, height));
    const pixelWidth = Math.max(1, Math.round(width * ratio)), pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    ratio = canvas.width / width;
    const style = getComputedStyle(hero);
    theme = document.documentElement.dataset.theme === 'dark' ? 0 : 1;
    palettes = LASER_RGB.map(buildTints);
    dirty = false;
  }
  let uiColor = '', lastColorPublish = 0, lastThemePublished = -1;
  const initialColor = reduced.matches ? 0 : Math.floor(Math.random() * LASER_COLORS.length);
  const colorState = {
    from: initialColor,
    to: initialColor,
    phase: 0,
    travel: COLOR_TRAVEL,
    hold: 4.2 + Math.random() * 4.5,
    progress: 1
  };
  const smooth01 = x => {
    const c = clamp(x, 0, 1);
    return c * c * (3 - 2 * c);
  };
  function stepColor(elapsed) {
    colorState.phase += elapsed;
    if (colorState.from === colorState.to) {
      if (colorState.phase >= colorState.hold) {
        const offset = 1 + Math.floor(Math.random() * (LASER_COLORS.length - 1));
        colorState.to = (colorState.from + offset) % LASER_COLORS.length;
        colorState.phase = 0;
        colorState.travel = COLOR_TRAVEL * (0.85 + Math.random() * 0.45);
        colorState.progress = 0;
      } else {
        colorState.progress = 1;
      }
      return;
    }
    const raw = colorState.phase / colorState.travel;
    if (raw >= 1) {
      colorState.from = colorState.to;
      colorState.phase = 0;
      colorState.hold = 4.2 + Math.random() * 4.5;
      colorState.progress = 1;
    } else {
      colorState.progress = smooth01(raw);
    }
  }
  function publishColor(fromIndex, toIndex, progress, now) {
    // Share the beam colour with the page so buttons and accents follow the laser.
    const isMob = mobile.matches;
    const minInterval = isMob ? 160 : 80;
    const themeChanged = theme !== lastThemePublished;
    if (!themeChanged && uiColor && now - lastColorPublish < minInterval) return;
    const from = LASER_RGB[fromIndex % LASER_RGB.length];
    const to = LASER_RGB[toIndex % LASER_RGB.length];
    const mixed = from.map((value, index) => value + (to[index] - value) * progress);
    const to255 = value => isMob ? Math.min(255, Math.round(clamp(value, 0, 1) * 63) * 4) : Math.round(clamp(value, 0, 1) * 255);
    const luma = 0.2126 * mixed[0] + 0.7152 * mixed[1] + 0.0722 * mixed[2];
    const dim = theme ? 0.62 : 1;
    const key = mixed.map(to255).join(',') + (theme ? 'l' : 'd');
    if (key === uiColor) return;
    uiColor = key;
    lastColorPublish = now;
    lastThemePublished = theme;
    const root = document.documentElement.style;
    root.setProperty('--laser-accent', 'rgb(' + mixed.map(to255).join(',') + ')');
    root.setProperty('--laser-text', 'rgb(' + mixed.map(value => to255(value * dim)).join(',') + ')');
    root.setProperty('--laser-soft', 'rgba(' + mixed.map(to255).join(',') + ',.14)');
    root.setProperty('--laser-ink', luma > 0.55 ? '#10101a' : '#ffffff');
  }
  // Critically damped C¹ smooth random drift of beam and smoke parameters.
  const WANDER = {
    beamX: { base: 0, range: 0.022, omega: 0.42, minWait: 3.5, maxWait: 7.5 },
    beamTilt: { base: 0, range: 0.026, omega: 0.38, minWait: 4.0, maxWait: 8.5 },
    width: { base: 1.22, range: 0.38, omega: 0.58, minWait: 2.5, maxWait: 6.0 },
    flare: { base: 1.16, range: 0.34, omega: 0.50, minWait: 3.0, maxWait: 6.5 },
    spread: { base: 1.30, range: 0.36, omega: 0.48, minWait: 3.0, maxWait: 7.0 },
    power: { base: 1.36, range: 0.30, omega: 0.62, minWait: 2.2, maxWait: 5.5 },
    fog: { base: 0.13, range: 0.025, omega: 0.44, minWait: 3.0, maxWait: 7.0 },
    dust: { base: 0.98, range: 0.36, omega: 0.55, minWait: 2.5, maxWait: 6.0 },
    wisps: { base: 1.08, range: 0.42, omega: 0.52, minWait: 2.5, maxWait: 6.0 },
    breathe: { base: 0.72, range: 0.36, omega: 0.46, minWait: 3.0, maxWait: 6.5 },
    dotGrid: { base: 0.55, range: 0.16, omega: 0.40, minWait: 3.5, maxWait: 7.5 },
    fogWarp: { base: 1.4, range: 0.18, omega: 0.42, minWait: 3.0, maxWait: 7.5 },
    beamHalo: { base: 1.10, range: 0.32, omega: 0.54, minWait: 2.5, maxWait: 6.0 },
    pulse: { base: 0.14, range: 0.10, omega: 0.56, minWait: 2.5, maxWait: 5.5 },
    flowSpeed: { base: 0.72, range: 0.28, omega: 0.35, minWait: 3.5, maxWait: 8.0 },
    windX: { base: 0.012, range: 0.015, omega: 0.35, minWait: 4.0, maxWait: 8.5 },
    windY: { base: -0.03, range: 0.012, omega: 0.38, minWait: 3.5, maxWait: 7.5 }
  };
  const pickTarget = current => {
    let next = Math.sin((Math.random() - 0.5) * Math.PI);
    if (Math.abs(next - current) < 0.35) next = Math.sin((Math.random() - 0.5) * Math.PI);
    return next;
  };
  const wander = {};
  Object.keys(WANDER).forEach(key => {
    const initial = reduced.matches ? 0 : (Math.random() * 2 - 1) * 0.45;
    wander[key] = {
      value: initial,
      vel: 0,
      target: pickTarget(initial),
      wait: 0.6 + Math.random() * 2.2
    };
  });
  function stepWander(dt) {
    for (const key in WANDER) {
      const cfg = WANDER[key];
      const w = wander[key];
      w.wait -= dt;
      if (w.wait <= 0) {
        w.target = pickTarget(w.value);
        w.wait = cfg.minWait + Math.random() * (cfg.maxWait - cfg.minWait);
      }
      const omega = cfg.omega;
      const decay = Math.exp(-omega * dt);
      const diff = w.value - w.target;
      const nextVal = w.target + (diff * (1 + omega * dt) + w.vel * dt) * decay;
      const nextVel = (w.vel * (1 - omega * dt) - omega * omega * diff * dt) * decay;
      w.value = clamp(nextVal, -1, 1);
      w.vel = nextVel;
    }
  }
  const wv = key => WANDER[key].base + (reduced.matches ? 0 : wander[key].value * WANDER[key].range);
  const fogOffset = {
    x: 56.27 + (reduced.matches ? 0 : Math.random() * 40),
    y: 21.09 + (reduced.matches ? 0 : Math.random() * 40)
  };
  function render(dt, now) {
    if (!reduced.matches) {
      stepWander(dt);
      fogOffset.x += dt * wv('windX');
      fogOffset.y += dt * wv('windY');
    }
    const scale = Math.max(0.2, Math.min(width / 585, height / 507));
    // Anchor the flare to the canvas bottom so no unlit band remains below it.
    const surface = height, startY = -0.15 * height;
    const span = surface - startY + 0.3 * height;
    const settled = intro >= INTRO_END;
    const front = settled ? surface + 0.3 * height : startY + span * Math.pow(clamp(intro / INTRO_DROP, 0, 1), 1.3);
    const impact = INTRO_DROP * Math.pow((surface - startY) / span, 1 / 1.3);
    const tau = intro - impact;
    const bloom = settled ? 1 : tau <= 0 ? 0 : spring(tau);
    const flash = settled || tau <= 0 ? 0 : Math.exp(-tau / 0.35) * (1 - Math.exp(-tau / 0.05));
    const runRange = 1.25 * 250 * 1.3 + 80;
    const runFront = settled ? 100000 : tau <= 0 ? -40 : runRange * (1 - Math.exp(-1.15 * tau));
    const bead = settled || tau <= 0 ? 0 : Math.exp(-1.15 * tau) * (1 - Math.exp(-tau / 0.08));
    const atmosphere = settled ? 1 : tau <= 0 ? 0.3 * easeOut(intro / INTRO_DROP) : 0.3 + 0.7 * (1 - Math.exp(-1.3 * tau));
    const active = pointer.inside && !reduced.matches && !coarse.matches;
    const lag = 1 - Math.exp(-dt * 8);
    lens.x += (pointer.x - lens.x) * lag;
    lens.y += (pointer.y - lens.y) * lag;
    lens.amount += ((active ? 1 : 0) - lens.amount) * (1 - Math.exp(-dt * 4));
    const isMob = mobile.matches;
    const beamShift = (reduced.matches ? 0 : wander.beamX.value * WANDER.beamX.range) * (isMob ? 0.55 : 1);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(uniforms.uDpr, ratio);
    gl.uniform1f(uniforms.uScale, scale);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uBeamX, width * ((isMob ? 0.9 : 0.82) + beamShift));
    gl.uniform4f(uniforms.uSurface, -width * 2, surface, width * 3, height * 3);
    gl.uniform1f(uniforms.uRadius, 0);
    gl.uniform3f(uniforms.uIntro, front, bloom, flash);
    gl.uniform4f(uniforms.uPour, 1000, 1000, 1, 1);
    gl.uniform2f(uniforms.uRun, runFront, bead);
    gl.uniform4f(uniforms.uLens, lens.x, lens.y, 95 * scale, reduced.matches ? 0 : lens.amount);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.uReveal, 0);
    gl.uniform4f(uniforms.uRevealMap, 1 / width, 1 / height, 0, 0);
    gl.uniform2f(uniforms.uRevealInfo, 220, 0);
    gl.uniform1f(uniforms.uAtmosphere, atmosphere);
    gl.uniform4f(uniforms.uAmount, wv('power'), wv('fog'), wv('dust'), wv('wisps'));
    gl.uniform4f(uniforms.uShape, wv('width'), wv('flare'), wv('spread'), 0);
    gl.uniform4f(uniforms.uExtra, wv('breathe'), wv('dotGrid'), fogOffset.x, fogOffset.y);
    gl.uniform4f(uniforms.uBeamMotion, wv('beamTilt') * (isMob ? 0.5 : 1), wv('pulse'), wv('beamHalo'), wv('fogWarp'));
    gl.uniform1f(uniforms.uTheme, theme);
    gl.uniform3fv(uniforms.uTint, palettes[colorState.from]);
    gl.uniform3fv(uniforms.uNextTint, palettes[colorState.to]);
    gl.uniform1f(uniforms.uColorProgress, colorState.progress);
    publishColor(colorState.from, colorState.to, colorState.progress, now);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    canvas.hidden = false;
    container.classList.add('is-enhanced');
  }
  function frame(now) {
    raf = 0;
    if (failed || !visible || document.hidden || printing) return;
    try {
      if (!ready && !resolveProgram()) { wake(); return; }
      const interval = 1000 / (mobile.matches ? 16 : 30);
      if (!dirty && !reduced.matches && now - lastDraw < interval - 1) { wake(); return; }
      if (dirty) resize();
      const elapsed = last ? Math.max(0, (now - last) / 1000) : 1 / 30;
      const dt = Math.min(0.1, elapsed);
      last = lastDraw = now;
      if (reduced.matches) intro = INTRO_END;
      else { time += dt * wv('flowSpeed'); stepColor(elapsed); intro = Math.min(INTRO_END, intro + dt); }
      render(dt, now);
      if (!reduced.matches) wake();
    } catch (_) { fail(); }
  }
  hero.addEventListener('pointermove', event => {
    if (reduced.matches || event.pointerType === 'touch') return;
    const rect = container.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.inside = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.inside = false; }, { passive: true });
  const onHeroReplay = () => {
    // Do not replay the drop-in intro when returning to the hero: its sweeping
    // front showed up as a thin horizontal line across the screen.
    if (reduced.matches) return;
    dirty = true;
    wake();
  };
  hero.addEventListener('section:prepare', onHeroReplay);
  hero.addEventListener('section:enter', onHeroReplay);
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(container);
  window.addEventListener('resize', refresh, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else { pointer.inside = false; stop(); }
  }).observe(hero);
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pointer.inside = false; stop(); } else refresh(); });
  reduced.addEventListener?.('change', () => {
    stop();
    pointer.inside = false;
    lens.amount = 0;
    if (reduced.matches) { colorState.from = colorState.to; colorState.progress = 1; }
    refresh();
  });
  coarse.addEventListener?.('change', refresh);
  mobile.addEventListener?.('change', refresh);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('beforeprint', () => { printing = true; stop(); });
  window.addEventListener('afterprint', () => { printing = false; refresh(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); });
  canvas.addEventListener('webglcontextrestored', () => { try { initialise(); } catch (_) { fail(); } });
  try { initialise(); } catch (_) { fail(); }
})();
