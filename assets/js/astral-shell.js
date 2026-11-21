/*
 * Astral Shell WebGL globe for Jekyll achievements showcase.
 * Adapted from React Bits Pro AstralShell by David Haz (https://pro.reactbits.dev/docs/components/astral-shell).
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 * Native WebGL adapter, rim-faded off-edge placement, OptionWheel geometry sync, and gentle constellation drift are site-specific.
 */
(() => {
  'use strict';

  const containers = [...document.querySelectorAll('[data-astral-shell]')];
  if (!containers.length || !window.requestAnimationFrame) return;
  if (window.matchMedia('(pointer: coarse), (max-width: 767px)').matches) return;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const degToRad = d => (d * Math.PI) / 180;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const PULSE_GLSL = `
uniform float uClock;
uniform float uDepthFade;
uniform float uPulseTime[4];
uniform vec3 uPulseOrigin[4];
uniform float uPulseSpeed;

float pulseGlow(vec3 direction) {
  float glow = 0.0;
  for (int k = 0; k < 4; k++) {
    float age = uClock - uPulseTime[k];
    if (age < 0.0 || age > 12.0) continue;
    float travelled = acos(clamp(dot(direction, uPulseOrigin[k]), -1.0, 1.0));
    float front = age * uPulseSpeed - travelled;
    glow += exp(-front * front * 55.0) * exp(-age * 0.55);
  }
  return glow;
}
`;

  const SHELL_LIGHT_GLSL = `
${PULSE_GLSL}
uniform float uTime;
uniform float uWorldRadius;
uniform vec2 uPointer;
uniform float uHover;
uniform float uHoverRadius;
uniform float uAspect;

void shellLight(vec4 mv, out vec4 clip, out float depthLight, out float hover, out float front) {
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float facing = clamp((mv.z - center.z) / max(uWorldRadius, 1e-4), -1.0, 1.0);
  front = smoothstep(-0.55, 0.65, facing);
  float r2d = length(mv.xy - center.xy) / max(uWorldRadius, 1e-4);
  float rimFade = 1.0 - smoothstep(0.56, 1.0, r2d);
  depthLight = mix(1.0 - uDepthFade, 1.0, front) * (0.32 + 0.68 * rimFade);
  clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
  hover = exp(-dot(delta, delta) / max(uHoverRadius * uHoverRadius, 1e-4)) * uHover * front * rimFade;
}
`;

  const POINTS_VERT = `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute float aDegree;
attribute float aSeed;

${SHELL_LIGHT_GLSL}

uniform float uSize;
uniform float uPixelRatio;

varying float vBright;
varying float vHeat;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float pulse = pulseGlow(normalize(position)) * mix(1.0 - uDepthFade * 0.8, 1.0, front);
  float hub = min(aDegree / 6.0, 1.0);
  float twinkle = 0.8 + 0.2 * sin(uTime * (0.45 + aSeed * 1.1) + aSeed * 40.0);
  vHeat = clamp(hover * 0.75 + pulse * 0.55, 0.0, 1.0);
  vBright = depthLight * (0.48 + 0.52 * hub) * twinkle + hover * 0.85 + pulse * 0.42;
  gl_Position = clip;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = center.z / min(mv.z, -1e-3);
  gl_PointSize = uSize * uPixelRatio * scale * (0.65 + 0.68 * hub) * (1.0 + vHeat * 0.35);
}
`;

  const POINTS_FRAG = `
precision highp float;

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;

varying float vBright;
varying float vHeat;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float disc = 1.0 - smoothstep(0.3, 1.0, r);
  float amount = disc * vBright;
  if (amount < 0.003) discard;
  vec3 color = mix(uBase, uHot, clamp(vHeat + 0.22, 0.0, 1.0));
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.88, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`;

  const LINES_VERT = `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute float aLength;

${SHELL_LIGHT_GLSL}

uniform float uReach;
uniform float uLineOpacity;

varying float vBright;
varying float vHover;
varying float vFront;
varying float vSpan;
varying vec3 vDirection;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float span = 1.0 - smoothstep(uReach * 0.35, uReach, aLength);
  vBright = depthLight * uLineOpacity * (0.35 + 0.65 * span) + hover * 0.45;
  vHover = hover;
  vFront = front;
  vSpan = mix(0.55, 1.0, span);
  vDirection = position;
  gl_Position = clip;
}
`;

  const LINES_FRAG = `
precision highp float;

${PULSE_GLSL}

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;
uniform float uLineGain;

varying float vBright;
varying float vHover;
varying float vFront;
varying float vSpan;
varying vec3 vDirection;

void main() {
  float pulse = pulseGlow(normalize(vDirection)) * mix(1.0 - uDepthFade * 0.8, 1.0, vFront);
  float heat = clamp(vHover * 0.65 + pulse * 0.45, 0.0, 1.0);
  vec3 color = mix(uBase, uHot, heat);
  float amount = (vBright + pulse * 0.28) * vSpan * uLineGain;
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.82, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`;

  const FALLBACK_SHARD = parseHexRgb('#e3a17a');
  const FALLBACK_ACCENT = parseHexRgb('#f97316');
  const FALLBACK_LIGHT_BASE = parseHexRgb('#b45309');
  const FALLBACK_LIGHT_HOT = parseHexRgb('#ea580c');

  let laserRaw = null;
  let laserCache = null;
  function readLaserTint() {
    const raw = document.documentElement.style.getPropertyValue('--laser-accent');
    if (raw !== laserRaw) {
      laserRaw = raw;
      const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(raw);
      if (m) {
        const c = [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
        laserCache = { accent: c, shard: c.map(v => v + (1 - v) * 0.3) };
      } else {
        laserCache = null;
      }
    }
    return laserCache;
  }

  function resolveSharedPalette(dark) {
    const tint = readLaserTint();
    if (dark) {
      const shard = tint ? tint.shard : FALLBACK_SHARD;
      const accent = tint ? tint.accent : FALLBACK_ACCENT;
      const base = [
        shard[0] * 0.68 + accent[0] * 0.32,
        shard[1] * 0.68 + accent[1] * 0.32,
        shard[2] * 0.68 + accent[2] * 0.32
      ];
      const hot = [
        accent[0] * 0.38 + 0.62,
        accent[1] * 0.38 + 0.60,
        accent[2] * 0.38 + 0.56
      ];
      return [base, hot];
    }
    if (tint) {
      const c = tint.accent;
      return [
        [c[0] * 0.62, c[1] * 0.62, c[2] * 0.62],
        [c[0] * 0.86, c[1] * 0.86, c[2] * 0.86]
      ];
    }
    return [FALLBACK_LIGHT_BASE.slice(), FALLBACK_LIGHT_HOT.slice()];
  }

  function parseHexRgb(hex) {
    const clean = (hex || '#7C6BFF').trim().replace(/^#/, '');
    const n = parseInt(clean.slice(0, 6), 16);
    if (Number.isNaN(n)) return [0.486, 0.42, 1.0];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function norm3(x, y, z) {
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
  }

  function randomSpherePoint(rng) {
    const z = 2 * rng() - 1;
    const phi = rng() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(phi), r * Math.sin(phi), z];
  }

  function gaussianPerturb(center, spread, rng) {
    const g = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-6))) * Math.cos(2 * Math.PI * rng());
    return norm3(center[0] + g() * spread, center[1] + g() * spread, center[2] + g() * spread);
  }

  function slerpVec3(a, b, t) {
    const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    if (omega < 1e-4) return a.slice();
    const sinO = Math.sin(omega);
    const w0 = Math.sin((1 - t) * omega) / sinO;
    const w1 = Math.sin(t * omega) / sinO;
    return norm3(a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1);
  }

  function buildConstellation(nodes, connections, reach, clustering, chords, seed) {
    let state = (0x2545f491 ^ Math.floor(9973 * (seed + 0.37))) >>> 0;
    const rng = () => {
      let e = (state = (state + 0x6d2b79f5) >>> 0);
      e = Math.imul(e ^ (e >>> 15), 1 | e);
      return (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ (e >>> 14)) >>> 0) / 0x100000000;
    };

    const hubs = [];
    const hubCount = Math.max(8, Math.round(nodes / 90));
    for (let i = 0; i < hubCount; i += 1) hubs.push(randomSpherePoint(rng));

    const filaments = [];
    for (let i = 0; i < hubCount; i += 1) {
      const nearest = hubs
        .map((h, j) => ({
          j,
          d: j === i ? Infinity : 1 - (h[0] * hubs[i][0] + h[1] * hubs[i][1] + h[2] * hubs[i][2])
        }))
        .sort((a, b) => a.d - b.d);
      for (let k = 0; k < 3; k += 1) {
        const j = nearest[k].j;
        if (!filaments.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) {
          filaments.push([i, j]);
        }
      }
    }

    const scatterProb = 1 - 0.85 * clamp(clustering, 0, 1);
    const points = new Float32Array(3 * nodes);
    for (let i = 0; i < nodes; i += 1) {
      let pt;
      const r = rng();
      if (r < scatterProb) {
        pt = randomSpherePoint(rng);
      } else if (r < scatterProb + (1 - scatterProb) * 0.35) {
        pt = gaussianPerturb(hubs[Math.floor(rng() * hubs.length)], 0.07 + 0.06 * rng(), rng);
      } else {
        const [a, b] = filaments[Math.floor(rng() * filaments.length)];
        pt = gaussianPerturb(slerpVec3(hubs[a], hubs[b], rng()), 0.018 + 0.02 * rng(), rng);
      }
      points.set(pt, 3 * i);
    }

    const cell = Math.max(reach, 0.05);
    const grid = new Map();
    const cellKey = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    for (let i = 0; i < nodes; i += 1) {
      const k = cellKey(points[3 * i], points[3 * i + 1], points[3 * i + 2]);
      const bucket = grid.get(k);
      if (bucket) bucket.push(i);
      else grid.set(k, [i]);
    }

    const degree = new Float32Array(nodes);
    const seen = new Set();
    const edges = [];
    const lengths = [];
    const reachSq = reach * reach;
    const candidates = [];

    const addEdge = (a, b, len, countDegree) => {
      const key = a < b ? a * nodes + b : b * nodes + a;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(a, b);
      lengths.push(len);
      if (countDegree) {
        degree[a] += 1;
        degree[b] += 1;
      }
    };

    for (let i = 0; i < nodes; i += 1) {
      candidates.length = 0;
      const x = points[3 * i];
      const y = points[3 * i + 1];
      const z = points[3 * i + 2];
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      const cz = Math.floor(z / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
        for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
          for (let gz = cz - 1; gz <= cz + 1; gz += 1) {
            const bucket = grid.get(`${gx},${gy},${gz}`);
            if (!bucket) continue;
            for (let b = 0; b < bucket.length; b += 1) {
              const j = bucket[b];
              if (j === i) continue;
              const dx = points[3 * j] - x;
              const dy = points[3 * j + 1] - y;
              const dz = points[3 * j + 2] - z;
              const dSq = dx * dx + dy * dy + dz * dz;
              if (dSq < reachSq) candidates.push({ j, d: dSq });
            }
          }
        }
      }
      candidates.sort((a, b) => a.d - b.d);
      const lim = Math.min(connections, candidates.length);
      for (let k = 0; k < lim; k += 1) {
        addEdge(i, candidates[k].j, Math.sqrt(candidates[k].d), true);
      }
    }

    const chordCount = Math.round(nodes * clamp(chords, 0, 2));
    for (let c = 0; c < chordCount; c += 1) {
      const a = Math.floor(rng() * nodes);
      for (let tries = 0; tries < 6; tries += 1) {
        const b = Math.floor(rng() * nodes);
        if (b === a) continue;
        const dist = Math.hypot(
          points[3 * b] - points[3 * a],
          points[3 * b + 1] - points[3 * a + 1],
          points[3 * b + 2] - points[3 * a + 2]
        );
        if (dist > 0.45 && dist < 1.6) {
          addEdge(a, b, dist, false);
          break;
        }
      }
    }

    const seeds = new Float32Array(nodes);
    for (let i = 0; i < nodes; i += 1) seeds[i] = rng();

    return {
      points,
      degree,
      seeds,
      edges: Uint32Array.from(edges),
      lengths: Float32Array.from(lengths),
      reach
    };
  }

  function quatFromAxisAngle(ax, ay, az, angle) {
    const half = angle * 0.5;
    const s = Math.sin(half);
    return [ax * s, ay * s, az * s, Math.cos(half)];
  }

  function quatMultiply(a, b) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    return [
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz
    ];
  }

  function quatNormalize(q) {
    const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    q[0] /= len;
    q[1] /= len;
    q[2] /= len;
    q[3] /= len;
    return q;
  }

  function quatFromEulerXYZ(x, y, z) {
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    return [
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3
    ];
  }

  function applyQuatInverse(vx, vy, vz, q) {
    const qx = -q[0], qy = -q[1], qz = -q[2], qw = q[3];
    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;
    return norm3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    );
  }

  function writePerspective(out, fovRad, aspect, near, far) {
    const f = 1 / Math.tan(fovRad / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
  }

  function writeModelView(out, tx, ty, tz, q, scale) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    out[0] = (1 - (yy + zz)) * scale;
    out[1] = (xy + wz) * scale;
    out[2] = (xz - wy) * scale;
    out[3] = 0;

    out[4] = (xy - wz) * scale;
    out[5] = (1 - (xx + zz)) * scale;
    out[6] = (yz + wx) * scale;
    out[7] = 0;

    out[8] = (xz + wy) * scale;
    out[9] = (yz - wx) * scale;
    out[10] = (1 - (xx + yy)) * scale;
    out[11] = 0;

    out[12] = tx;
    out[13] = ty;
    out[14] = tz;
    out[15] = 1;
  }

  function compileShader(gl, type, source) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function mountShell(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'astral-shell-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.prepend(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      canvas.remove();
      return;
    }

    const pointsProg = createProgram(gl, POINTS_VERT, POINTS_FRAG);
    const linesProg = createProgram(gl, LINES_VERT, LINES_FRAG);
    if (!pointsProg || !linesProg) {
      canvas.remove();
      return;
    }

    const getUniforms = prog => ({
      modelViewMatrix: gl.getUniformLocation(prog, 'modelViewMatrix'),
      projectionMatrix: gl.getUniformLocation(prog, 'projectionMatrix'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uClock: gl.getUniformLocation(prog, 'uClock'),
      uWorldRadius: gl.getUniformLocation(prog, 'uWorldRadius'),
      uDepthFade: gl.getUniformLocation(prog, 'uDepthFade'),
      uPointer: gl.getUniformLocation(prog, 'uPointer'),
      uHover: gl.getUniformLocation(prog, 'uHover'),
      uHoverRadius: gl.getUniformLocation(prog, 'uHoverRadius'),
      uAspect: gl.getUniformLocation(prog, 'uAspect'),
      uPulseTime: gl.getUniformLocation(prog, 'uPulseTime[0]'),
      uPulseOrigin: [
        gl.getUniformLocation(prog, 'uPulseOrigin[0]'),
        gl.getUniformLocation(prog, 'uPulseOrigin[1]'),
        gl.getUniformLocation(prog, 'uPulseOrigin[2]'),
        gl.getUniformLocation(prog, 'uPulseOrigin[3]')
      ],
      uPulseSpeed: gl.getUniformLocation(prog, 'uPulseSpeed'),
      uSize: gl.getUniformLocation(prog, 'uSize'),
      uPixelRatio: gl.getUniformLocation(prog, 'uPixelRatio'),
      uReach: gl.getUniformLocation(prog, 'uReach'),
      uLineOpacity: gl.getUniformLocation(prog, 'uLineOpacity'),
      uLineGain: gl.getUniformLocation(prog, 'uLineGain'),
      uBase: gl.getUniformLocation(prog, 'uBase'),
      uHot: gl.getUniformLocation(prog, 'uHot'),
      uInk: gl.getUniformLocation(prog, 'uInk')
    });

    const pUni = getUniforms(pointsProg);
    const lUni = getUniforms(linesProg);

    const pAttr = {
      position: gl.getAttribLocation(pointsProg, 'position'),
      aDegree: gl.getAttribLocation(pointsProg, 'aDegree'),
      aSeed: gl.getAttribLocation(pointsProg, 'aSeed')
    };
    const lAttr = {
      position: gl.getAttribLocation(linesProg, 'position'),
      aLength: gl.getAttribLocation(linesProg, 'aLength')
    };

    const NODES = 1450;
    const cfg = {
      nodes: NODES,
      connections: 4,
      reach: 0.2,
      clustering: 0.84,
      chords: 0.32,
      radius: 0.3,
      originX: 0.16,
      originY: 0.5,
      lineOpacity: 0.62,
      nodeSize: 0.78,
      depthFade: 0.75,
      spin: 0.75,
      tilt: 16,
      hoverRadius: 0.22,
      hoverBoost: 0.9,
      pulseSpeed: 1.15,
      seed: 0
    };

    const baseGraph = buildConstellation(cfg.nodes, cfg.connections, cfg.reach, cfg.clustering, cfg.chords, cfg.seed);
    const homePoints = new Float32Array(baseGraph.points);
    const livePoints = new Float32Array(baseGraph.points);
    const liveDegree = new Float32Array(baseGraph.degree);
    let linePositions = new Float32Array(baseGraph.edges.length * 3);
    let lineLengths = new Float32Array(baseGraph.edges.length);

    function rebuildLineArrays(graph, pts) {
      const edgeCount = graph.edges.length / 2;
      if (linePositions.length !== edgeCount * 6) {
        linePositions = new Float32Array(edgeCount * 6);
        lineLengths = new Float32Array(edgeCount * 2);
      }
      for (let i = 0; i < edgeCount; i += 1) {
        const a = graph.edges[2 * i] * 3;
        const b = graph.edges[2 * i + 1] * 3;
        const out = i * 6;
        linePositions[out] = pts[a];
        linePositions[out + 1] = pts[a + 1];
        linePositions[out + 2] = pts[a + 2];
        linePositions[out + 3] = pts[b];
        linePositions[out + 4] = pts[b + 1];
        linePositions[out + 5] = pts[b + 2];
        const len = graph.lengths[i];
        lineLengths[2 * i] = len;
        lineLengths[2 * i + 1] = len;
      }
    }

    rebuildLineArrays(baseGraph, livePoints);

    const pointPosBuf = gl.createBuffer();
    const pointDegBuf = gl.createBuffer();
    const pointSeedBuf = gl.createBuffer();
    const linePosBuf = gl.createBuffer();
    const lineLenBuf = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, livePoints, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointDegBuf);
    gl.bufferData(gl.ARRAY_BUFFER, liveDegree, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointSeedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, baseGraph.seeds, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, linePosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, linePositions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineLenBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineLengths, gl.STATIC_DRAW);

    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
    let [curBase, curHot] = resolveSharedPalette(isDark());

    const st = {
      width: 0,
      height: 0,
      paneWidth: 0,
      paneHeight: 0,
      canvasOffsetX: 0,
      dpr: 1,
      time: 0,
      clock: 0,
      quaternion: [0, 0, 0, 1],
      spinVelocity: [0, 0],
      lean: [0, 0],
      tiltCurrent: cfg.tilt,
      tiltTarget: cfg.tilt,
      spinCurrent: cfg.spin,
      spinTarget: cfg.spin,
      hover: 0,
      pointerX: 9,
      pointerY: 9,
      pointer: { x: 0.5, y: 0.5, inside: false },
      pulseTimes: new Float32Array([-99, -99, -99, -99]),
      pulseOrigins: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [-1, 0, 0]
      ],
      nextPulse: 0,
      morph: null,
      visible: typeof IntersectionObserver === 'undefined',
      raf: 0,
      last: 0
    };

    const projMat = new Float32Array(16);
    const mvMat = new Float32Array(16);
    const rotAxis = norm3(0.18, 1, 0.08);

    // Pull the globe center near the left edge of the pane so ~45% bleeds out to the left
    // and only a sleek faded arc occupies the left side of the wheel.
    function computeGlobeGeometry() {
      const paneW = st.paneWidth || container.clientWidth || 640;
      const paneH = st.paneHeight || container.clientHeight || 430;
      const canvasW = st.width || canvas.clientWidth || paneW;
      const canvasH = st.height || canvas.clientHeight || paneH;
      const offsetX = st.canvasOffsetX || 0;

      let paneCx;
      if (paneW < 460) {
        cfg.radius = 0.255;
        paneCx = -18;
      } else if (paneW < 580) {
        cfg.radius = 0.275;
        paneCx = 4;
      } else {
        cfg.radius = 0.295;
        paneCx = 24;
      }

      const rPx = cfg.radius * canvasH;
      const canvasCx = paneCx - offsetX;
      cfg.originX = canvasCx / Math.max(canvasW, 1);
      cfg.originY = 0.5;
      const cy = paneH * 0.5;
      return { width: paneW, height: paneH, cx: paneCx, cy, rPx };
    }

    function resize() {
      const paneRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      st.paneWidth = Math.max(1, Math.round(paneRect.width));
      st.paneHeight = Math.max(1, Math.round(paneRect.height));
      st.canvasOffsetX = canvasRect.left - paneRect.left;

      const w = Math.max(1, Math.round(canvasRect.width));
      const h = Math.max(1, Math.round(canvasRect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== st.width || h !== st.height || dpr !== st.dpr) {
        st.width = w;
        st.height = h;
        st.dpr = dpr;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      computeGlobeGeometry();
      container.dispatchEvent(new CustomEvent('astral:resize'));
      wake();
    }

    function firePulse(dirVec) {
      const slot = st.nextPulse;
      st.nextPulse = (st.nextPulse + 1) % 4;
      st.pulseOrigins[slot] = norm3(dirVec[0], dirVec[1], dirVec[2]);
      st.pulseTimes[slot] = st.clock;
    }

    // Gentle, subtle random transition when switching wheel items (stays synced with AeroShards palette)
    function triggerRandomTransition(direction = 1) {
      // Subtle localized star drift around each star's home position (no jarring scramble)
      const fromPts = new Float32Array(livePoints);
      const toPts = new Float32Array(livePoints.length);
      const phaseA = Math.random() * Math.PI * 2;
      const phaseB = Math.random() * Math.PI * 2;
      const driftAmp = 0.045 + Math.random() * 0.035;

      for (let i = 0; i < cfg.nodes; i += 1) {
        const idx = i * 3;
        const hx = homePoints[idx];
        const hy = homePoints[idx + 1];
        const hz = homePoints[idx + 2];
        const s = baseGraph.seeds[i];
        const dx = Math.sin(s * 18.0 + phaseA) * driftAmp;
        const dy = Math.cos(s * 23.0 + phaseB) * driftAmp;
        const dz = Math.sin(s * 31.0 + phaseA - phaseB) * driftAmp;
        const [nx, ny, nz] = norm3(hx + dx, hy + dy, hz + dz);
        toPts[idx] = nx;
        toPts[idx + 1] = ny;
        toPts[idx + 2] = nz;
      }

      st.morph = {
        t: 0,
        duration: 0.95,
        mode: Math.floor(Math.random() * 3),
        fromPts,
        toPts,
        twistSign: direction >= 0 ? 1 : -1
      };

      // Noticeable rotational turn and subtle tilt shift on item switch
      const dirSign = direction >= 0 ? 1 : -1;
      st.spinVelocity[0] = clamp(st.spinVelocity[0] + dirSign * (0.55 + Math.random() * 0.35), -1.4, 1.4);
      st.spinVelocity[1] = clamp(st.spinVelocity[1] + dirSign * (1.15 + Math.random() * 0.4), -2.2, 2.2);
      st.tiltTarget = 10 + Math.random() * 14;

      // Single soft ripple from the eastern rim
      const eulerQ = quatFromEulerXYZ(degToRad(st.tiltCurrent), 0, 0);
      const totalQ = quatMultiply(eulerQ, st.quaternion);
      const rimLocal = applyQuatInverse(0.92, (Math.random() - 0.5) * 0.25, 0.35, totalQ);
      firePulse(rimLocal);

      wake();
    }

    function nudgeSpin(deltaStep) {
      st.spinVelocity[1] = clamp(st.spinVelocity[1] + clamp(deltaStep, -1, 1) * 0.42, -2.2, 2.2);
      st.spinVelocity[0] = clamp(st.spinVelocity[0] + clamp(deltaStep, -1, 1) * 0.18, -1.4, 1.4);
      wake();
    }

    function setProgramSharedUniforms(uni, worldRadius, aspect, lineGain, ink) {
      gl.uniformMatrix4fv(uni.modelViewMatrix, false, mvMat);
      gl.uniformMatrix4fv(uni.projectionMatrix, false, projMat);
      gl.uniform1f(uni.uTime, st.time);
      gl.uniform1f(uni.uClock, st.clock);
      gl.uniform1f(uni.uWorldRadius, worldRadius);
      gl.uniform1f(uni.uDepthFade, cfg.depthFade);
      gl.uniform2f(uni.uPointer, 2 * st.pointerX - 1, 2 * st.pointerY - 1);
      gl.uniform1f(uni.uHover, st.hover * cfg.hoverBoost);
      gl.uniform1f(uni.uHoverRadius, cfg.hoverRadius);
      gl.uniform1f(uni.uAspect, aspect);
      gl.uniform1fv(uni.uPulseTime, st.pulseTimes);
      for (let k = 0; k < 4; k += 1) {
        const o = st.pulseOrigins[k];
        gl.uniform3f(uni.uPulseOrigin[k], o[0], o[1], o[2]);
      }
      gl.uniform1f(uni.uPulseSpeed, cfg.pulseSpeed);
      gl.uniform3f(uni.uBase, curBase[0], curBase[1], curBase[2]);
      gl.uniform3f(uni.uHot, curHot[0], curHot[1], curHot[2]);
      gl.uniform1f(uni.uInk, ink);
      if (uni.uLineGain) gl.uniform1f(uni.uLineGain, lineGain);
    }

    function renderFrame(now) {
      st.raf = 0;
      if (!st.visible || document.hidden) {
        st.last = 0;
        return;
      }

      const dt = st.last ? Math.min(Math.max((now - st.last) / 1000, 0), 0.05) : 0.016;
      st.last = now;
      const isReduced = reducedQuery.matches;

      if (!isReduced) st.time += dt;
      st.clock += dt;

      const easeK = 1 - Math.exp(-2.4 * dt);
      st.tiltCurrent += (st.tiltTarget - st.tiltCurrent) * easeK;
      st.spinCurrent += (st.spinTarget - st.spinCurrent) * easeK;

      const decay = Math.exp(-2.15 * dt);
      st.spinVelocity[0] *= decay;
      st.spinVelocity[1] *= decay;

      if (Math.abs(st.spinVelocity[0]) > 1e-4) {
        const qY = quatFromAxisAngle(0, 1, 0, st.spinVelocity[0] * dt);
        st.quaternion = quatMultiply(qY, st.quaternion);
      }
      if (Math.abs(st.spinVelocity[1]) > 1e-4) {
        const qX = quatFromAxisAngle(1, 0, 0, -st.spinVelocity[1] * dt);
        st.quaternion = quatMultiply(qX, st.quaternion);
      }
      if (!isReduced) {
        const omega = 0.095 * st.spinCurrent;
        const qSpin = quatFromAxisAngle(rotAxis[0], rotAxis[1], rotAxis[2], omega * dt);
        st.quaternion = quatMultiply(qSpin, st.quaternion);
      }
      quatNormalize(st.quaternion);

      const activePointer = !isReduced && st.pointer.inside;
      const targetLeanX = activePointer ? (st.pointer.x - 0.5) * 1.4 : 0;
      const targetLeanY = activePointer ? (st.pointer.y - 0.5) * 1.4 : 0;
      const leanK = 1 - Math.exp(-2.2 * dt);
      st.lean[0] += (targetLeanX - st.lean[0]) * leanK;
      st.lean[1] += (targetLeanY - st.lean[1]) * leanK;

      const hoverTarget = activePointer ? 1 : 0;
      st.hover += (hoverTarget - st.hover) * (1 - Math.exp(-5 * dt));
      if (activePointer) {
        const pK = 1 - Math.exp(-14 * dt);
        if (st.pointerX > 5) {
          st.pointerX = st.pointer.x;
          st.pointerY = st.pointer.y;
        }
        st.pointerX += (st.pointer.x - st.pointerX) * pK;
        st.pointerY += (st.pointer.y - st.pointerY) * pK;
      } else if (st.hover < 0.002) {
        st.pointerX = 9;
        st.pointerY = 9;
      }

      // Sync palette continuously with AeroShards & --laser-accent, with a warm flare on transitions
      const [targetBase, targetHot] = resolveSharedPalette(isDark());
      const colorK = 1 - Math.exp(-6 * dt);
      let flare = 0;
      if (st.morph) {
        const mu = isReduced ? 1 : Math.min(1, st.morph.t + dt / st.morph.duration);
        flare = Math.sin(mu * Math.PI) * 0.16;
      }
      for (let c = 0; c < 3; c += 1) {
        const goalBase = targetBase[c] + (targetHot[c] - targetBase[c]) * flare;
        curBase[c] += (goalBase - curBase[c]) * colorK;
        curHot[c] += (targetHot[c] - curHot[c]) * colorK;
      }

      // Gentle constellation morph & transition
      let lineOpacityBoost = 1;
      if (st.morph) {
        const m = st.morph;
        m.t = Math.min(1, m.t + dt / m.duration);
        const u = isReduced ? 1 : m.t;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const wave = Math.sin(u * Math.PI);

        const seeds = baseGraph.seeds;
        const fPts = m.fromPts;
        const tPts = m.toPts;

        for (let i = 0; i < cfg.nodes; i += 1) {
          const idx = i * 3;
          const seed = seeds[i];
          let x = fPts[idx] + (tPts[idx] - fPts[idx]) * ease;
          let y = fPts[idx + 1] + (tPts[idx + 1] - fPts[idx + 1]) * ease;
          let z = fPts[idx + 2] + (tPts[idx + 2] - fPts[idx + 2]) * ease;
          const len = Math.hypot(x, y, z) || 1;
          x /= len;
          y /= len;
          z /= len;

          let radial = 1;
          if (m.mode === 0) {
            radial = 1 + 0.028 * wave * Math.sin(seed * Math.PI * 2 + u * 3);
          } else if (m.mode === 1) {
            const twist = wave * y * 0.16 * m.twistSign;
            const cs = Math.cos(twist);
            const sn = Math.sin(twist);
            const nx = x * cs - z * sn;
            const nz = x * sn + z * cs;
            x = nx;
            z = nz;
            radial = 1 + 0.018 * wave;
          } else {
            radial = 1 + (seed > 0.5 ? 0.032 : -0.025) * wave;
          }

          livePoints[idx] = x * radial;
          livePoints[idx + 1] = y * radial;
          livePoints[idx + 2] = z * radial;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, livePoints);

        rebuildLineArrays(baseGraph, livePoints);
        gl.bindBuffer(gl.ARRAY_BUFFER, linePosBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, linePositions);

        lineOpacityBoost = 1 + 0.08 * wave;
        if (m.t >= 1) st.morph = null;
      }

      const aspect = st.width / Math.max(st.height, 1);
      const fovRad = degToRad(35);
      writePerspective(projMat, fovRad, aspect, 0.1, 100);

      const camZ = 10;
      const halfH = camZ * Math.tan(fovRad / 2);
      const worldRadius = 2 * clamp(cfg.radius, 0.05, 1.5) * halfH;
      const tx = (clamp(cfg.originX, -0.5, 1.5) - 0.5) * 2 * halfH * aspect;
      const ty = (clamp(cfg.originY, -0.5, 1.5) - 0.5) * 2 * halfH;

      const baseQ = quatFromEulerXYZ(
        degToRad(clamp(st.tiltCurrent, -90, 90)) - 0.09 * st.lean[1],
        0.12 * st.lean[0],
        0
      );
      const finalQ = quatMultiply(baseQ, st.quaternion);
      writeModelView(mvMat, tx, ty, -camZ, finalQ, worldRadius);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);

      const ink = isDark() ? 0 : 1;
      if (ink > 0.5) {
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      }

      const lineGain = 1 + (Math.max(st.dpr, 1) - 1) * 0.85;

      gl.useProgram(linesProg);
      setProgramSharedUniforms(lUni, worldRadius, aspect, lineGain, ink);
      gl.uniform1f(lUni.uReach, cfg.reach);
      gl.uniform1f(lUni.uLineOpacity, cfg.lineOpacity * lineOpacityBoost);

      gl.bindBuffer(gl.ARRAY_BUFFER, linePosBuf);
      gl.enableVertexAttribArray(lAttr.position);
      gl.vertexAttribPointer(lAttr.position, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, lineLenBuf);
      gl.enableVertexAttribArray(lAttr.aLength);
      gl.vertexAttribPointer(lAttr.aLength, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINES, 0, lineLengths.length);

      gl.useProgram(pointsProg);
      setProgramSharedUniforms(pUni, worldRadius, aspect, lineGain, ink);
      gl.uniform1f(pUni.uSize, 3.2 * cfg.nodeSize);
      gl.uniform1f(pUni.uPixelRatio, st.dpr);

      gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuf);
      gl.enableVertexAttribArray(pAttr.position);
      gl.vertexAttribPointer(pAttr.position, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, pointDegBuf);
      gl.enableVertexAttribArray(pAttr.aDegree);
      gl.vertexAttribPointer(pAttr.aDegree, 1, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, pointSeedBuf);
      gl.enableVertexAttribArray(pAttr.aSeed);
      gl.vertexAttribPointer(pAttr.aSeed, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, cfg.nodes);

      if (!isReduced || st.morph) {
        st.raf = requestAnimationFrame(renderFrame);
      } else {
        st.last = 0;
      }
    }

    function wake() {
      if (!st.raf && st.visible && !document.hidden) {
        st.last = performance.now();
        st.raf = requestAnimationFrame(renderFrame);
      }
    }

    container.addEventListener(
      'pointermove',
      e => {
        const r = canvas.getBoundingClientRect();
        st.pointer.x = (e.clientX - r.left) / Math.max(r.width, 1);
        st.pointer.y = 1 - (e.clientY - r.top) / Math.max(r.height, 1);
        st.pointer.inside = true;
        wake();
      },
      { passive: true }
    );

    const onLeave = () => {
      st.pointer.inside = false;
      wake();
    };
    container.addEventListener('pointerleave', onLeave, { passive: true });
    container.addEventListener('pointercancel', onLeave, { passive: true });

    new MutationObserver(() => {
      const [b, h] = resolveSharedPalette(isDark());
      curBase = b.slice();
      curHot = h.slice();
      wake();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        ([entry]) => {
          st.visible = entry.isIntersecting;
          if (st.visible) wake();
        },
        { rootMargin: '80px' }
      ).observe(container);
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(container);
    }
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) wake();
    });

    container._astralShell = {
      triggerRandomTransition,
      nudgeSpin,
      getGeometry: computeGlobeGeometry
    };

    resize();
  }

  if ('IntersectionObserver' in window) {
    const lazyMount = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          lazyMount.unobserve(entry.target);
          mountShell(entry.target);
        });
      },
      { rootMargin: '260px 0px' }
    );
    containers.forEach(container => lazyMount.observe(container));
  } else {
    containers.forEach(mountShell);
  }
})();
