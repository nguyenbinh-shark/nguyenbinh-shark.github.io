/*
 * Aero Shards WebGPU background for Jekyll home sections.
 * Adapted from React Bits AeroShards by David Haz (2026).
 * Source: https://reactbits.dev/tools/background-studio
 * License: ./react-bits-LICENSE.txt (MIT + Commons Clause).
 * Standalone WebGPU adapter, multi-instance lifecycle, theme syncing and 2D fallback are site-specific.
 */
(() => {
  'use strict';

  const containers = [...document.querySelectorAll('[data-aero-shards]')];
  if (!containers.length || !window.requestAnimationFrame) return;
  if (window.matchMedia('(pointer: coarse), (max-width: 767px)').matches) return;

  const CANVAS = 'aero-shards-canvas';
  const PLACEMENTS = ['full', 'left', 'right', 'center'];
  const MATERIALS = {
    glass: [0, 0, 0, 0],
    chrome: [1, 0, 0, 0]
  };
  const FLOATS = 24;
  const SAMPLES = 160;
  const CAMERA = 4;
  const FOCUS = 3.1;
  const SHARD_FOCUS = 2.75;
  const LAYER_SCALES = [1, 0.5];
  const MAX_BANK = 1.0;
  const DEPTHS = [2.7, 3.9, 5.6, 8.1, 11.6];
  const SHARE = [0.26, 0.23, 0.2, 0.17, 0.14];
  const GROWTH = [1, 1.3, 1.8, 2.6, 3.6];
  const FADE = [1, 0.8, 0.52, 0.32, 0.2];
  const LEVELS = DEPTHS.length;
  const INTRO_SECONDS = 3.4;
  const MARKER_STYLES = { plus: 0, dots: 1 };
  const MARKER_FLOATS = 8;
  const MARKER_PHASES = [
    [0.37, 0.61],
    [0.83, 0.12],
    [0.21, 0.88],
    [0.66, 0.44],
    [0.05, 0.27]
  ];
  const MAX_RINGS = 4;
  const RING_SECONDS = 2.6;
  const BLOOM_LEVELS = 4;
  const FULL_SLOPES = [
    [0.2, -0.78],
    [-0.72, 0.02],
    [0.58, -0.06],
    [-0.24, 0.62],
    [0.8, 0.3]
  ];
  const SIDE_OFFSETS = [0.84, 0.62, 0.44, 0.28, 0.14];
  const RING_SIZES = [
    [0.98, 0.78],
    [0.9, 0.7],
    [0.84, 0.64],
    [0.8, 0.6],
    [0.76, 0.56]
  ];
  const TAU = Math.PI * 2;

  const SHARD_SHADER = `
struct Frame {
  view: vec4f,
  eye: vec4f,
  forward: vec4f,
  right: vec4f,
  up: vec4f,
  shard: vec4f,
  accent: vec4f,
  marker: vec4f,
  surface: vec4f,
}

struct Layer {
  view: vec4f,
  look: vec4f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat, first) center: vec4f,
  @location(1) @interpolate(flat, first) axis: vec4f,
  @location(2) @interpolate(flat, first) normal: vec4f,
  @location(3) @interpolate(flat, first) p01: vec4f,
  @location(4) @interpolate(flat, first) p23: vec4f,
  @location(5) @interpolate(flat, first) p4: vec4f,
  @location(6) @interpolate(flat, first) topA: vec4f,
  @location(7) @interpolate(flat, first) topB: vec4f,
  @location(8) @interpolate(flat, first) topC: vec4f,
  @location(9) @interpolate(flat, first) bottomA: vec4f,
  @location(10) @interpolate(flat, first) bottomB: vec4f,
  @location(11) @interpolate(flat, first) bottomC: vec4f,
}

struct FragmentOut {
  @location(0) color: vec4f,
  @builtin(frag_depth) depth: f32,
}

@group(0) @binding(0) var<uniform> scene: Frame;
@group(0) @binding(1) var<storage, read> shards: array<vec4f>;
@group(0) @binding(2) var<uniform> layerInfo: Layer;

fn project(world: vec3f) -> vec3f {
  let offset = world - scene.eye.xyz;
  let depth = max(dot(offset, scene.forward.xyz), 0.05);
  let x = dot(offset, scene.right.xyz);
  let y = dot(offset, scene.up.xyz);
  return vec3f(layerInfo.view.x * 0.5 + x * layerInfo.view.z / depth, layerInfo.view.y * 0.5 - y * layerInfo.view.z / depth, depth);
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instance: u32) -> VertexOut {
  let index = instance * 6u;
  let a = shards[index];
  let b = shards[index + 1u];
  let c = shards[index + 2u];
  let d = shards[index + 3u];
  let e = shards[index + 4u];
  let f = shards[index + 5u];
  let center = a.xyz;
  let size = a.w;
  let axis = normalize(b.xyz);
  let normal = normalize(c.xyz);
  let side = normalize(cross(normal, axis));

  var out: VertexOut;
  let middle = project(center);
  if (middle.z < 0.35 || size <= 0.0) {
    out.position = vec4f(2.0, 2.0, 0.5, 1.0);
    return out;
  }

  let count = i32(f.z);
  let points = array<vec2f, 5>(d.xy, d.zw, e.xy, e.zw, f.xy);
  var low = vec2f(1e9);
  var high = vec2f(-1e9);
  var tops = array<vec2f, 5>(vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0));
  var bottoms = array<vec2f, 5>(vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0));
  for (var i = 0; i < 5; i += 1) {
    let corner = points[min(i, count - 1)];
    let onPlate = center + (axis * corner.x + side * corner.y) * size;
    let top = project(onPlate + normal * b.w * size);
    let bottom = project(onPlate - normal * b.w * size);
    tops[i] = top.xy;
    bottoms[i] = bottom.xy;
    low = min(low, min(top.xy, bottom.xy));
    high = max(high, max(top.xy, bottom.xy));
  }
  low -= vec2f(2.0);
  high += vec2f(2.0);
  let corners = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0), vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0));
  let pixel = mix(low, high, corners[vertexIndex]);
  out.position = vec4f(pixel.x / layerInfo.view.x * 2.0 - 1.0, 1.0 - pixel.y / layerInfo.view.y * 2.0, 0.5, 1.0);
  out.center = a;
  out.axis = vec4f(axis, b.w);
  out.normal = vec4f(normal, c.w);
  out.p01 = d;
  out.p23 = e;
  out.p4 = f;
  out.topA = vec4f(tops[0], tops[1]);
  out.topB = vec4f(tops[2], tops[3]);
  out.topC = vec4f(tops[4], 0.0, 0.0);
  out.bottomA = vec4f(bottoms[0], bottoms[1]);
  out.bottomB = vec4f(bottoms[2], bottoms[3]);
  out.bottomC = vec4f(bottoms[4], 0.0, 0.0);
  return out;
}

fn cross2(a: vec2f, b: vec2f) -> f32 {
  return a.x * b.y - a.y * b.x;
}

fn outlineCoverage(p: vec2f, points: array<vec2f, 5>, count: i32) -> f32 {
  var area = 0.0;
  for (var i = 0; i < 5; i += 1) {
    if (i < count) {
      area += cross2(points[i], points[(i + 1) % count]);
    }
  }
  let orient = select(-1.0, 1.0, area > 0.0);
  var distance = -1e9;
  for (var i = 0; i < 5; i += 1) {
    if (i < count) {
      let a = points[i];
      let edge = points[(i + 1) % count] - a;
      let span = length(edge);
      if (span > 1e-4) {
        let n = vec2f(edge.y, -edge.x) * (orient / span);
        distance = max(distance, dot(p - a, n));
      }
    }
  }
  return clamp(0.5 - distance, 0.0, 1.0);
}

struct Prism {
  points: array<vec2f, 5>,
  count: i32,
  half: f32,
}

struct Hit {
  near: f32,
  far: f32,
  normal: vec3f,
}

fn plane(prism: Prism, k: i32) -> vec4f {
  if (k == 0) { return vec4f(0.0, 0.0, 1.0, prism.half); }
  if (k == 1) { return vec4f(0.0, 0.0, -1.0, prism.half); }
  let a = prism.points[k - 2];
  let b = prism.points[(k - 1) % prism.count];
  let edge = b - a;
  let n = normalize(vec2f(edge.y, -edge.x));
  return vec4f(n, 0.0, dot(n, a));
}

fn trace(prism: Prism, ro: vec3f, rd: vec3f) -> Hit {
  var hit: Hit;
  hit.near = -1e9;
  hit.far = 1e9;
  hit.normal = vec3f(0.0, 0.0, 1.0);
  for (var k = 0; k < 7; k += 1) {
    if (k < prism.count + 2) {
      let p = plane(prism, k);
      let denom = dot(p.xyz, rd);
      let gap = p.w - dot(p.xyz, ro);
      if (abs(denom) < 1e-7) {
        if (gap < 0.0) { hit.far = -1e9; }
      } else {
        let t = gap / denom;
        if (denom < 0.0) {
          if (t > hit.near) {
            hit.near = t;
            hit.normal = p.xyz;
          }
        } else if (t < hit.far) {
          hit.far = t;
        }
      }
    }
  }
  return hit;
}

fn exitFrom(prism: Prism, ro: vec3f, rd: vec3f) -> vec4f {
  var best = 1e9;
  var normal = vec3f(0.0, 0.0, -1.0);
  for (var k = 0; k < 7; k += 1) {
    if (k < prism.count + 2) {
      let p = plane(prism, k);
      let denom = dot(p.xyz, rd);
      if (denom > 1e-6) {
        let t = (p.w - dot(p.xyz, ro)) / denom;
        if (t < best) {
          best = t;
          normal = p.xyz;
        }
      }
    }
  }
  return vec4f(normal, max(best, 0.0));
}

fn rectLight(r: vec3f, dir: vec3f, across: vec3f, extent: vec2f, soft: f32) -> f32 {
  let facing = dot(r, dir);
  if (facing <= 0.0) { return 0.0; }
  let up = cross(dir, across);
  let u = dot(r, across) / facing;
  let v = dot(r, up) / facing;
  let a = 1.0 - smoothstep(extent.x - soft, extent.x + soft, abs(u));
  let b = 1.0 - smoothstep(extent.y - soft, extent.y + soft, abs(v));
  return a * b;
}

const KEY_DIR = vec3f(-0.28, 0.72, 0.64) / length(vec3f(-0.28, 0.72, 0.64));
const KEY_ACROSS = vec3f(0.92, 0.0, 0.4) / length(vec3f(0.92, 0.0, 0.4));
const LEFT_DIR = vec3f(-0.86, 0.12, 0.5) / length(vec3f(-0.86, 0.12, 0.5));
const LEFT_ACROSS = vec3f(0.5, 0.0, 0.86) / length(vec3f(0.5, 0.0, 0.86));
const RIM_DIR = vec3f(0.78, 0.22, -0.58) / length(vec3f(0.78, 0.22, -0.58));
const RIM_ACROSS = vec3f(0.6, 0.0, 0.8) / length(vec3f(0.6, 0.0, 0.8));
const TOP_DIR = vec3f(0.05, 0.94, -0.33) / length(vec3f(0.05, 0.94, -0.33));
const TOP_ACROSS = vec3f(1.0, 0.0, 0.0);

fn lobe(r: vec3f, dir: vec3f, width: f32) -> f32 {
  return exp((dot(r, dir) - 1.0) / (width * width));
}

fn studio(r: vec3f, soft: f32, accent: vec3f, ink: vec3f) -> vec3f {
  let sky = clamp(r.y * 0.5 + 0.5, 0.0, 1.0);
  var col = mix(ink * 0.03, ink * 0.12 + accent * 0.03, smoothstep(0.25, 0.95, sky));
  col += mix(ink, vec3f(1.0), 0.6) * lobe(r, KEY_DIR, 0.38) * 3.6;
  col += mix(accent, vec3f(1.0), 0.2) * lobe(r, RIM_DIR, 0.34) * 3.4;
  col += vec3f(1.0, 0.98, 1.0) * rectLight(r, LEFT_DIR, LEFT_ACROSS, vec2f(0.12, 0.8), 0.08 + soft) * 3.2;
  col += vec3f(1.0, 0.98, 1.0) * rectLight(r, TOP_DIR, TOP_ACROSS, vec2f(0.9, 0.1), 0.08 + soft) * 2.6;
  return col;
}

fn studioLight(r: vec3f, soft: f32, accent: vec3f) -> vec3f {
  let ground = vec3f(0.2, 0.2, 0.23);
  let skyTone = vec3f(0.97, 0.97, 0.99);
  var col = mix(ground, skyTone, smoothstep(-0.08 - soft, 0.16 + soft, r.y));
  col = mix(col, vec3f(0.55, 0.55, 0.6), lobe(r, vec3f(0.0, -1.0, 0.0), 0.5) * 0.4);
  col += vec3f(0.4) * rectLight(r, KEY_DIR, KEY_ACROSS, vec2f(0.46, 0.3), 0.07 + soft);
  col -= vec3f(0.55) * rectLight(r, LEFT_DIR, LEFT_ACROSS, vec2f(0.1, 0.85), 0.05 + soft);
  col -= vec3f(0.45) * rectLight(r, RIM_DIR, RIM_ACROSS, vec2f(0.12, 0.9), 0.05 + soft);
  return clamp(col, vec3f(0.05), vec3f(1.2));
}

fn schlick(cosine: f32, f0: f32) -> f32 {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);
}

fn rayFor(pixel: vec2f) -> vec3f {
  let x = pixel.x - layerInfo.view.x * 0.5;
  let y = layerInfo.view.y * 0.5 - pixel.y;
  return normalize(scene.forward.xyz * layerInfo.view.z + scene.right.xyz * x + scene.up.xyz * y);
}

struct Surface {
  coverage: f32,
  color: vec3f,
  alpha: f32,
  depth: f32,
}

fn shade(pixel: vec2f, in: VertexOut) -> Surface {
  let center = in.center.xyz;
  let size = in.center.w;
  let axis = in.axis.xyz;
  let plateNormal = in.normal.xyz;
  let side = normalize(cross(plateNormal, axis));
  var prism: Prism;
  prism.points = array<vec2f, 5>(in.p01.xy, in.p01.zw, in.p23.xy, in.p23.zw, in.p4.xy);
  prism.count = i32(in.p4.z);
  prism.half = in.axis.w;

  let eye = scene.eye.xyz;
  let toLocal = mat3x3f(axis.x, side.x, plateNormal.x, axis.y, side.y, plateNormal.y, axis.z, side.z, plateNormal.z);
  let fromLocal = mat3x3f(axis, side, plateNormal);
  let origin = toLocal * (eye - center) / size;

  let rd = rayFor(pixel);
  let ray = toLocal * rd;
  let denom = dot(ray, vec3f(0.0, 0.0, 1.0));
  let flatT = -origin.z / select(denom, 1e-4, abs(denom) < 1e-4);
  let flatPoint = origin.xy + ray.xy * flatT;
  let footprint = max(length(fwidth(flatPoint)) * 0.7, 1e-4);
  let softBase = clamp(length(fwidth(reflect(rd, plateNormal))) * 0.5, 0.0, 0.5);

  let primary = trace(prism, origin, ray);
  let tops = array<vec2f, 5>(in.topA.xy, in.topA.zw, in.topB.xy, in.topB.zw, in.topC.xy);
  let bottoms = array<vec2f, 5>(in.bottomA.xy, in.bottomA.zw, in.bottomB.xy, in.bottomB.zw, in.bottomC.xy);
  let coverage = max(outlineCoverage(pixel, tops, prism.count), outlineCoverage(pixel, bottoms, prism.count));

  var surface: Surface;
  let facing = select(-1.0, 1.0, origin.z > 0.0);
  let capT = (facing * prism.half - origin.z) / select(ray.z, -1e-4 * facing, abs(ray.z) < 1e-4);
  let missed = primary.near > primary.far;
  let hitT = select(primary.near, capT, missed);
  let hitNormal = select(primary.normal, vec3f(0.0, 0.0, facing), missed);
  surface.coverage = select(0.0, coverage, hitT > 0.0);
  surface.color = vec3f(0.0);
  surface.alpha = 0.0;
  surface.depth = 1.0;
  if (surface.coverage <= 0.0) { return surface; }
  let mainRay = ray;

  let local = origin + mainRay * hitT;
  let worldRay = fromLocal * mainRay;
  let viewDepth = max(hitT * size * dot(worldRay, scene.forward.xyz), 0.05);
  surface.depth = clamp(1.0 - 0.3 / viewDepth, 0.0, 1.0);

  let radius = max(prism.half * 1.15, footprint * 2.5);
  var n = hitNormal;
  var bevel = 0.0;
  if (abs(n.z) > 0.5) {
    var gap = 1e9;
    for (var k = 2; k < 7; k += 1) {
      if (k < prism.count + 2) {
        let p = plane(prism, k);
        gap = min(gap, p.w - dot(p.xy, local.xy));
      }
    }
    var toward = vec2f(0.0);
    for (var k = 2; k < 7; k += 1) {
      if (k < prism.count + 2) {
        let p = plane(prism, k);
        let g = p.w - dot(p.xy, local.xy);
        toward += p.xy * exp(-(g - gap) / (radius * 0.35));
      }
    }
    toward = normalize(toward);
    bevel = clamp(1.0 - gap / radius, 0.0, 1.0);
    let angle = bevel * bevel * 0.7853982;
    n = normalize(n * cos(angle) + vec3f(toward, 0.0) * sin(angle));
  } else {
    let gap = prism.half - abs(local.z);
    bevel = clamp(1.0 - gap / radius, 0.0, 1.0);
    let angle = bevel * bevel * 0.7853982;
    n = normalize(n * cos(angle) + vec3f(0.0, 0.0, sign(local.z)) * sin(angle));
  }
  let bendRate = 1.8 / max(radius / footprint, 1.0);
  let normal = normalize(fromLocal * n);
  let view = -worldRay;
  let reflected = reflect(worldRay, normal);
  let soft = softBase + bendRate * smoothstep(0.0, 0.25, bevel) * 1.2 + clamp(footprint * 0.6, 0.0, 0.5);
  let ndv = clamp(dot(normal, view), 0.0, 1.0);

  let accent = scene.accent.rgb;
  let base = scene.shard.rgb;
  let world = center + fromLocal * local * size;
  let height = clamp(0.5 + world.y * 0.45, 0.0, 1.0);
  let tone = mix(accent, base, height);
  let body = mix(tone, mix(base, accent, 0.5), in.normal.w * 0.3);
  let mode = scene.surface.x;
  let lightMode = scene.up.w > 0.5;
  let wrap = clamp(dot(normal, KEY_DIR) * 0.5 + 0.5, 0.0, 1.0);

  var color = vec3f(0.0);
  var alpha = 1.0;
  let chrome = mode > 0.5;
  if (lightMode) {
    let env = studioLight(reflected, soft, accent);
    if (chrome) {
      color = env * mix(body, vec3f(1.0), 0.6);
    } else {
      let fresnel = schlick(ndv, 0.05);
      let diffuse = clamp(dot(normal, KEY_DIR) * 0.5 + 0.5, 0.0, 1.0);
      alpha = clamp(0.32 + fresnel * 0.5 + (1.0 - abs(n.z)) * 0.5, 0.0, 1.0);
      color = mix(body, vec3f(1.0), 0.15) * (0.5 + 0.4 * diffuse) * alpha + (env - vec3f(0.78)) * fresnel * 0.8;
    }
  } else if (chrome) {
    let env = studio(reflected, soft, accent, body);
    color = env * mix(body, vec3f(1.0), 0.55) * 0.9 + body * 0.02;
  } else {
    let fresnel = schlick(ndv, 0.04);
    let env = studio(reflected, soft, accent, body);
    var light = vec3f(0.0);
    var cursor = local;
    var direction = toLocal * refract(worldRay, normal, 1.0 / 1.5);
    var travelled = 0.0;
    var carry = 1.0 - fresnel;
    var through = 0.0;
    for (var bounce = 0; bounce < 3; bounce += 1) {
      let outlet = exitFrom(prism, cursor, direction);
      travelled += outlet.w;
      cursor = cursor + direction * outlet.w;
      let outward = outlet.xyz;
      let escaped = refract(direction, -outward, 1.5);
      if (dot(escaped, escaped) > 0.0) {
        let leave = schlick(dot(direction, outward), 0.04);
        let worldOut = normalize(fromLocal * escaped);
        let absorb = exp(-(vec3f(1.0) - body) * travelled * size * 22.0);
        let straight = smoothstep(0.97, 0.999, dot(worldOut, worldRay));
        let energy = carry * (1.0 - leave);
        light += studio(worldOut, soft * 2.0 + 0.04, accent, body) * absorb * energy * (1.0 - straight) * 2.0;
        through += energy * straight * (absorb.r + absorb.g + absorb.b) / 3.0;
        carry *= leave;
      }
      direction = reflect(direction, outward);
    }
    let edge = max(pow(1.0 - abs(n.z), 1.2), bevel * bevel * 0.85);
    let glow = mix(mix(body, accent, 0.35), vec3f(1.0), 0.28) * edge * (0.35 + 0.45 * wrap);
    color = env * fresnel * 0.85 + light * (1.0 - smoothstep(0.0, 0.6, bevel)) + body * 0.02 + glow;
    alpha = clamp(1.0 - through + edge * 0.25, 0.0, 1.0);
  }

  color *= select(1.3, 1.0, lightMode);
  let haze = smoothstep(3.5, 12.0, viewDepth) * layerInfo.look.x;
  let hazeColor = select(mix(base, accent, 0.5) * 0.3, mix(base, vec3f(1.0), 0.72), lightMode);
  color = mix(color, hazeColor * alpha + color * 0.3, haze);
  let flash = in.p4.w;
  color += mix(accent, vec3f(1.0), 0.42) * flash * select(0.85, 0.0, lightMode) * max(alpha, 0.5);
  alpha = clamp(max(alpha, flash * 0.65 * select(1.0, 0.0, lightMode)), 0.0, 1.0);
  surface.color = color;
  surface.alpha = alpha;
  return surface;
}

@fragment
fn fs_solid(in: VertexOut) -> FragmentOut {
  let surface = shade(in.position.xy, in);
  if (surface.coverage < 0.999 || surface.alpha < 0.6) { discard; }
  var out: FragmentOut;
  out.color = vec4f(surface.color, surface.alpha);
  out.depth = surface.depth;
  return out;
}

@fragment
fn fs_edge(in: VertexOut) -> FragmentOut {
  let surface = shade(in.position.xy, in);
  if (surface.coverage <= 0.001 || (surface.coverage >= 0.9996 && surface.alpha >= 0.62)) { discard; }
  var out: FragmentOut;
  out.color = vec4f(surface.color, surface.alpha) * surface.coverage;
  out.depth = surface.depth;
  return out;
}
`;

  const SCREEN_VERTEX = `
struct ScreenOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_screen(@builtin(vertex_index) index: u32) -> ScreenOut {
  var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var coords = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var out: ScreenOut;
  out.position = vec4f(corners[index], 0.0, 1.0);
  out.uv = coords[index];
  return out;
}
`;

  const LAYER_BLUR_SHADER = `${SCREEN_VERTEX}
struct Spread { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> spreadInfo: Spread;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sigma = max(spreadInfo.texel.z, 0.3);
  let reach = min(i32(ceil(sigma * 2.6)), 20);
  var total = textureSampleLevel(source, linearSampler, uv, 0.0);
  var weight = 1.0;
  for (var i = 1; i <= reach; i += 1) {
    let w = exp(-f32(i * i) / (2.0 * sigma * sigma));
    let o = spreadInfo.texel.xy * f32(i);
    total += (textureSampleLevel(source, linearSampler, uv + o, 0.0) + textureSampleLevel(source, linearSampler, uv - o, 0.0)) * w;
    weight += 2.0 * w;
  }
  return total / weight;
}
`;

  const SHADOW_SHADER = `${SCREEN_VERTEX}
struct Shade {
  info: vec4f,
  more: vec4f,
}
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var depthMap: texture_depth_2d;
@group(0) @binding(2) var<uniform> shadeInfo: Shade;

@fragment
fn fs_main(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let bounds = vec2i(textureDimensions(source)) - vec2i(1);
  let here = vec2i(pixel.xy);
  let color = textureLoad(source, here, 0);
  if (color.a <= 0.002 || shadeInfo.info.z <= 0.0) { return color; }
  let depth = textureLoad(depthMap, here, 0);
  let east = textureLoad(depthMap, clamp(here + vec2i(1, 0), vec2i(0), bounds), 0);
  let west = textureLoad(depthMap, clamp(here - vec2i(1, 0), vec2i(0), bounds), 0);
  let south = textureLoad(depthMap, clamp(here + vec2i(0, 1), vec2i(0), bounds), 0);
  let north = textureLoad(depthMap, clamp(here - vec2i(0, 1), vec2i(0), bounds), 0);
  let limit = shadeInfo.more.x * 0.5;
  let slopeX = clamp(select(east - depth, depth - west, abs(depth - west) < abs(east - depth)), -limit, limit);
  let slopeY = clamp(select(south - depth, depth - north, abs(depth - north) < abs(south - depth)), -limit, limit);
  var occlusion = 0.0;
  for (var i = 1; i <= 12; i += 1) {
    let offset = -shadeInfo.info.xy * f32(i);
    let probe = clamp(vec2i(pixel.xy + offset), vec2i(0), bounds);
    let other = textureLoad(depthMap, probe, 0);
    let expected = depth + slopeX * offset.x + slopeY * offset.y;
    let closer = smoothstep(shadeInfo.more.x * 0.6, shadeInfo.more.x * 2.4, expected - other);
    let reach = 1.0 - f32(i - 1) / 12.0;
    occlusion = max(occlusion, closer * reach * reach);
  }
  return vec4f(color.rgb * (1.0 - occlusion * shadeInfo.info.z), color.a);
}
`;

  const COMPOSITE_SHADER = `${SCREEN_VERTEX}
struct Blend { info: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> mixInfo: Blend;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSampleLevel(source, linearSampler, uv, 0.0) * mixInfo.info.x;
}
`;

  const MARKER_SHADER = `
struct Frame {
  view: vec4f,
  eye: vec4f,
  forward: vec4f,
  right: vec4f,
  up: vec4f,
  shard: vec4f,
  accent: vec4f,
  marker: vec4f,
  surface: vec4f,
}

struct MarkerOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat, first) shape: vec4f,
  @location(2) @interpolate(flat, first) light: vec4f,
}

@group(0) @binding(0) var<uniform> scene: Frame;
@group(0) @binding(1) var<storage, read> markers: array<vec4f>;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instance: u32) -> MarkerOut {
  let a = markers[instance * 2u];
  let b = markers[instance * 2u + 1u];
  let offset = a.xyz - scene.eye.xyz;
  let depth = max(dot(offset, scene.forward.xyz), 0.05);
  let center = vec2f(
    scene.view.x * 0.5 + dot(offset, scene.right.xyz) * scene.view.z / depth,
    scene.view.y * 0.5 - dot(offset, scene.up.xyz) * scene.view.z / depth,
  );
  let pixel = scene.marker.y;
  let size = scene.marker.z * clamp(sqrt(scene.marker.w / depth), 0.6, 1.3) * b.z;
  let blur = min(scene.forward.w * abs(1.0 - scene.eye.w / depth), scene.right.w) * 0.18;
  let frame = b.y;
  let reach = select(size, size * 2.6, frame > 0.001) + blur + 1.5 * pixel;
  let corners = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));
  let corner = corners[vertexIndex % 6u] * reach;
  var out: MarkerOut;
  if (depth < 0.35 || a.w <= 0.002) {
    out.position = vec4f(2.0, 2.0, 0.5, 1.0);
    return out;
  }
  let at = center + corner;
  out.position = vec4f(at.x / scene.view.x * 2.0 - 1.0, 1.0 - at.y / scene.view.y * 2.0, 0.5, 1.0);
  out.local = corner;
  out.shape = vec4f(size, blur, frame, pixel);
  out.light = vec4f(b.x, a.w, 0.0, 0.0);
  return out;
}

fn bar(value: f32, edge: f32, soft: f32) -> f32 {
  return clamp((edge - value) / soft + 0.5, 0.0, 1.0);
}

@fragment
fn fs_main(in: MarkerOut) -> @location(0) vec4f {
  let size = in.shape.x;
  let blur = in.shape.y;
  let frame = in.shape.z;
  let pixel = in.shape.w;
  let q = abs(in.local);
  let soft = 1.0 + blur;
  let thick = 0.6 * pixel + blur * 0.5;
  let energy = (0.6 * pixel) / thick;
  var cover = 0.0;
  if (scene.marker.x < 0.5) {
    let across = bar(q.x, size, soft) * bar(q.y, thick, soft);
    let down = bar(q.y, size, soft) * bar(q.x, thick, soft);
    cover = max(across, down) * energy;
  } else {
    cover = bar(length(in.local), size * 0.42 + blur * 0.3, soft) * mix(1.0, energy, 0.6);
  }
  if (frame > 0.001) {
    let edge = size * 2.3;
    let span = edge * 0.45;
    let line = 0.5 * pixel;
    let sides = bar(abs(q.x - edge), line, 1.0) * bar(edge - span - q.y, 0.0, 1.0) * bar(q.y - edge - line, 0.0, 1.0);
    let caps = bar(abs(q.y - edge), line, 1.0) * bar(edge - span - q.x, 0.0, 1.0) * bar(q.x - edge - line, 0.0, 1.0);
    cover = max(cover, max(sides, caps) * frame * 0.85);
  }
  let glow = in.light.x;
  let fade = in.light.y;
  let tint = mix(scene.shard.rgb, scene.accent.rgb, 0.4);
  if (scene.up.w > 0.5) {
    let ink = (1.0 - exp(-glow * 1.6)) * 0.85 * cover * fade;
    return vec4f(mix(tint, scene.accent.rgb, 0.5) * 0.55 * ink, ink);
  }
  let light = cover * glow * fade;
  let color = (1.0 - exp(-mix(tint, vec3f(1.0), 0.35) * light * 1.6)) * 1.4;
  return vec4f(color, max(max(color.r, color.g), color.b) * 0.8);
}
`;

  const PREFILTER_SHADER = `${SCREEN_VERTEX}
struct Bloom { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> bloom: Bloom;

fn bright(uv: vec2f) -> vec3f {
  let color = textureSampleLevel(source, linearSampler, uv, 0.0).rgb;
  let peak = max(max(color.r, color.g), color.b);
  return color * smoothstep(bloom.texel.z, bloom.texel.z + bloom.texel.w, peak);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let o = bloom.texel.xy;
  let total = bright(uv + vec2f(o.x, o.y)) + bright(uv + vec2f(-o.x, o.y)) + bright(uv + vec2f(o.x, -o.y)) + bright(uv - o);
  return vec4f(total * 0.25, 0.0);
}
`;

  const DOWNSAMPLE_SHADER = `${SCREEN_VERTEX}
struct Bloom { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> bloom: Bloom;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let o = bloom.texel.xy;
  var color = textureSampleLevel(source, linearSampler, uv, 0.0) * 0.25;
  color += textureSampleLevel(source, linearSampler, uv + vec2f(o.x, o.y), 0.0) * 0.1875;
  color += textureSampleLevel(source, linearSampler, uv + vec2f(-o.x, o.y), 0.0) * 0.1875;
  color += textureSampleLevel(source, linearSampler, uv + vec2f(o.x, -o.y), 0.0) * 0.1875;
  color += textureSampleLevel(source, linearSampler, uv - o, 0.0) * 0.1875;
  return color;
}
`;

  const BLUR_SHADER = `${SCREEN_VERTEX}
struct Bloom { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> bloom: Bloom;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let delta = bloom.texel.xy;
  var color = textureSampleLevel(source, linearSampler, uv, 0.0) * 0.181862;
  color += (textureSampleLevel(source, linearSampler, uv + delta * 1.423135, 0.0) + textureSampleLevel(source, linearSampler, uv - delta * 1.423135, 0.0)) * 0.284316;
  color += (textureSampleLevel(source, linearSampler, uv + delta * 3.326702, 0.0) + textureSampleLevel(source, linearSampler, uv - delta * 3.326702, 0.0)) * 0.106598;
  color += (textureSampleLevel(source, linearSampler, uv + delta * 5.242989, 0.0) + textureSampleLevel(source, linearSampler, uv - delta * 5.242989, 0.0)) * 0.018156;
  return color;
}
`;

  const FINISH_SHADER = `${SCREEN_VERTEX}
struct Finish {
  info: vec4f,
  paper: vec4f,
  mode: vec4f,
}
@group(0) @binding(0) var sceneTexture: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var bloom0: texture_2d<f32>;
@group(0) @binding(3) var bloom1: texture_2d<f32>;
@group(0) @binding(4) var bloom2: texture_2d<f32>;
@group(0) @binding(5) var bloom3: texture_2d<f32>;
@group(0) @binding(6) var<uniform> finish: Finish;

fn hash12(value: vec2f) -> f32 {
  let p = fract(value * vec2f(0.1031, 0.1030));
  let mixed = p + dot(p, p.yx + 33.33);
  return fract((mixed.x + mixed.y) * mixed.x);
}

fn smootherstep(x: f32) -> f32 {
  let t = clamp(x, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

@fragment
fn fs_main(@location(0) uv: vec2f, @builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let scene = textureLoad(sceneTexture, vec2i(pixel.xy), 0);
  let alpha = clamp(scene.a, 0.0, 1.0);
  let noise = hash12(floor(pixel.xy) + vec2f(finish.info.y, finish.info.y * 1.618)) - 0.5;
  let grain = 1.0 + noise * finish.info.x;
  var rgb = vec3f(0.0);
  var a = alpha;
  if (finish.mode.x > 0.5) {
    rgb = clamp(scene.rgb, vec3f(0.0), vec3f(alpha)) * grain;
  } else {
    var halo = textureSampleLevel(bloom0, linearSampler, uv, 0.0).rgb * 0.4;
    halo += textureSampleLevel(bloom1, linearSampler, uv, 0.0).rgb * 0.3;
    halo += textureSampleLevel(bloom2, linearSampler, uv, 0.0).rgb * 0.2;
    halo += textureSampleLevel(bloom3, linearSampler, uv, 0.0).rgb * 0.1;
    halo = halo * finish.info.z;
    rgb = (1.0 - exp(-max(scene.rgb, vec3f(0.0)) * finish.info.w)) * grain + halo / (1.0 + halo);
    a = max(alpha, max(max(rgb.r, rgb.g), rgb.b));
  }
  let vignette = finish.mode.y;
  if (vignette > 0.0) {
    let size = vec2f(textureDimensions(sceneTexture));
    let reach = max(vignette * 0.5 * min(size.x, size.y), 1.0);
    let fromEdge = min(pixel.xy, size - pixel.xy);
    let mask = smootherstep(fromEdge.x / reach) * smootherstep(fromEdge.y / reach);
    rgb *= mask;
    a *= mask;
  }
  rgb = clamp(rgb, vec3f(0.0), vec3f(max(a, 0.0)));
  if (finish.paper.a > 0.5) {
    return vec4f(finish.paper.rgb * (1.0 - a) + rgb, 1.0);
  }
  return vec4f(rgb, a);
}
`;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const smoother = x => {
    const t = clamp(x, 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  let probe = null;
  const parseColor = (value, fallback) => {
    if (value === 'transparent') return null;
    if (!probe) probe = document.createElement('canvas').getContext('2d');
    if (!probe) return fallback;
    probe.fillStyle = '#000000';
    probe.fillStyle = value;
    const text = probe.fillStyle;
    if (text.startsWith('#')) {
      const hex = parseInt(text.slice(1), 16);
      return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
    }
    const match = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(text);
    if (!match) return fallback;
    if (match[4] !== undefined && Number(match[4]) === 0) return null;
    return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
  };

  // Follow the hero laser colour (published as --laser-accent by hero-laser-flow.js).
  let tintRaw = null;
  let tintCache = null;
  const laserTint = () => {
    const raw = document.documentElement.style.getPropertyValue('--laser-accent');
    if (raw !== tintRaw) {
      tintRaw = raw;
      const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(raw);
      if (m) {
        const c = [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
        tintCache = { accent: c, shard: c.map(v => v + (1 - v) * 0.3) };
      } else tintCache = null;
    }
    return tintCache;
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const prefersReduced = () => reducedMotion.matches;

  const latticeHash = (a, b, c, d) => {
    let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= Math.imul(c + 0x27d4eb2f, 0x165667b1) ^ Math.imul(d + 0x7f4a7c15, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  };

  const random = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const ribbonPoint = (placement, level, s, aspect, out) => {
    let u;
    let v;
    let d;
    if (placement === 0) {
      u = -1.32 + 2.64 * s;
      const slope = FULL_SLOPES[level];
      v =
        slope[0] +
        (slope[1] - slope[0]) * s +
        0.1 * Math.sin(s * TAU * 0.7 + level * 2.3) +
        0.045 * Math.sin(s * TAU * 1.9 + level);
      d = DEPTHS[level] + 0.35 * Math.sin(s * Math.PI * 1.4 + level * 1.9);
    } else if (placement === 3) {
      const angle = s * TAU + level * 0.9 + Math.PI * 0.5;
      const size = RING_SIZES[level];
      u = Math.cos(angle) * size[0];
      v = Math.sin(angle) * size[1] - 0.02;
      d = DEPTHS[level] * 1.1 - Math.sin(angle) * (0.5 + level * 0.25);
    } else {
      const mirror = placement === 1 ? -1 : 1;
      v = 1.32 - 2.64 * s;
      u =
        mirror *
        (SIDE_OFFSETS[level] +
          0.1 * Math.sin(s * TAU * 0.6 + level * 1.3) +
          0.03 * Math.sin(s * TAU * 2.1 + level) -
          0.08 * (1 - s));
      d = DEPTHS[level] + 0.3 * Math.sin(s * Math.PI * 1.2 + level);
    }
    out[0] = (u * aspect * d) / CAMERA;
    out[1] = (v * d) / CAMERA;
    out[2] = CAMERA - d;
    return out;
  };

  const createShards = (count, seed) => {
    const next = random(seed);
    const shards = [];
    let made = 0;
    for (let level = 0; level < LEVELS; level += 1) {
      const amount = level === LEVELS - 1 ? count - made : Math.round(count * SHARE[level]);
      made += amount;
      for (let index = 0; index < amount; index += 1) {
        const flat = next() * 2 - 1;
        const family = next();
        const outline = [];
        if (family < 0.55) {
          const spread = 0.17 + next() * 0.15;
          outline.push([1, (next() - 0.5) * 0.08]);
          outline.push([-0.5 - next() * 0.25, spread * (0.8 + next() * 0.4)]);
          outline.push([-0.5 - next() * 0.25, -spread * (0.8 + next() * 0.4)]);
        } else if (family < 0.8) {
          const spread = 0.2 + next() * 0.14;
          outline.push([1, 0]);
          outline.push([(next() - 0.3) * 0.5, spread]);
          outline.push([-0.55 - next() * 0.2, (next() - 0.5) * 0.1]);
          outline.push([(next() - 0.3) * 0.5, -spread * (0.8 + next() * 0.4)]);
        } else {
          const sides = next() < 0.5 ? 4 : 5;
          const stretch = 0.4 + next() * 0.3;
          const turn = next() * TAU;
          for (let corner = 0; corner < sides; corner += 1) {
            const angle = turn + ((corner + (next() - 0.5) * 0.6) * TAU) / sides;
            outline.push([Math.cos(angle), Math.sin(angle) * stretch]);
          }
        }
        const sides = outline.length;
        let mx = 0;
        let my = 0;
        for (const point of outline) {
          mx += point[0] / sides;
          my += point[1] / sides;
        }
        const shape = [];
        for (let corner = 0; corner < 5; corner += 1) {
          const point = outline[Math.min(corner, sides - 1)];
          shape.push(point[0] - mx, point[1] - my);
        }
        shards.push({
          level,
          phase: (index + next()) / Math.max(amount, 1),
          lane: Math.sign(flat) * Math.pow(Math.abs(flat), 0.85),
          layer: Math.sqrt(-2 * Math.log(Math.max(next(), 1e-6))) * Math.cos(TAU * next()),
          size: 0.6 + next() * next() * 1.25,
          shape,
          sides,
          thickness: 0.06 + next() * 0.04,
          yaw: (next() - 0.5) * 0.36,
          bank: (next() - 0.5) * 0.5,
          pitch: (next() - 0.5) * 0.24,
          tint: next(),
          drift: [next() * TAU, next() * TAU, next() * TAU],
          rate: [0.3 + next() * 0.35, 0.25 + next() * 0.35, 0.3 + next() * 0.3],
          flutter: [next() * TAU, 0.5 + next() * 0.5],
          arrive: next(),
          sign: next() < 0.5 ? -1 : 1,
          slot: [next() * TAU, 0.06 + 0.3 * Math.sqrt(next()), next() - 0.5, next() < 0.85 ? 1 : -1],
          offset: [0, 0, 0],
          velocity: [0, 0, 0],
          tilt: 0,
          tiltVelocity: 0,
          flash: 0,
          gather: 0,
          joined: false,
          position: [0, 0, 0],
          s: 0
        });
      }
    }
    return shards;
  };

  /* Minimal native WebGPU adapter implementing the vgpu primitives used by AeroShards. */
  const vgpu = (() => {
    const PREMULTIPLIED = {
      color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
    };

    const parseBindings = source => {
      const found = [];
      const re = /@group\(0\)\s*@binding\((\d+)\)\s*var(?:<[^>]+>)?\s+(\w+)\s*:/g;
      let match;
      while ((match = re.exec(source))) {
        found.push({ binding: Number(match[1]), name: match[2] });
      }
      return found.sort((a, b) => a.binding - b.binding);
    };

    const init = async ({ powerPreference } = {}) => {
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) throw new Error('WebGPU is not available');
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: powerPreference || 'high-performance' });
      if (!adapter) throw new Error('WebGPU adapter unavailable');
      const device = await adapter.requestDevice();
      const listeners = new Set();
      let destroyed = false;
      const emitError = error => {
        if (destroyed) return;
        listeners.forEach(listener => listener(error));
      };
      device.addEventListener('uncapturederror', event => {
        emitError(new Error(event.error?.message || 'WebGPU uncaptured error'));
      });
      device.lost.then(info => {
        if (info.reason !== 'destroyed') emitError(new Error(info.message || 'WebGPU device lost'));
      });
      return {
        device,
        modules: new Map(),
        targets: new Set(),
        buffers: new Set(),
        onError(callback) {
          listeners.add(callback);
          return () => listeners.delete(callback);
        },
        dispose() {
          if (destroyed) return;
          destroyed = true;
          listeners.clear();
          this.targets.forEach(t => t.destroy());
          this.buffers.forEach(b => b.destroy());
          this.targets.clear();
          this.buffers.clear();
          device.destroy();
        }
      };
    };

    const surface = (gpu, canvas, opts) => {
      const context = canvas.getContext('webgpu');
      if (!context) throw new Error('WebGPU canvas context unavailable');
      const format = opts.format || navigator.gpu.getPreferredCanvasFormat();
      const alphaMode = opts.alphaMode || 'premultiplied';
      const size = [Math.max(1, opts.size[0]), Math.max(1, opts.size[1])];
      const configure = () => {
        canvas.width = size[0];
        canvas.height = size[1];
        context.configure({ device: gpu.device, format, alphaMode });
      };
      configure();
      return {
        size,
        format,
        colors: [format],
        resize(next) {
          const w = Math.max(1, next[0]);
          const h = Math.max(1, next[1]);
          if (w === size[0] && h === size[1]) return;
          size[0] = w;
          size[1] = h;
          configure();
        },
        getView() {
          return context.getCurrentTexture().createView();
        }
      };
    };

    const target = (gpu, opts) => {
      const format = opts.format || 'rgba16float';
      const depthFormat = opts.depth || null;
      const item = {
        size: [Math.max(1, opts.size[0]), Math.max(1, opts.size[1])],
        format,
        colors: [format],
        texture: null,
        view: null,
        version: 0,
        depth: depthFormat ? { format: depthFormat, texture: null, view: null, version: 0 } : null,
        resize(next) {
          const w = Math.max(1, next[0]);
          const h = Math.max(1, next[1]);
          if (w === item.size[0] && h === item.size[1]) return;
          item.size[0] = w;
          item.size[1] = h;
          allocate();
        },
        destroy() {
          item.texture?.destroy();
          item.depth?.texture?.destroy();
        }
      };
      const allocate = () => {
        item.texture?.destroy();
        item.depth?.texture?.destroy();
        item.texture = gpu.device.createTexture({
          size: item.size,
          format,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        item.view = item.texture.createView();
        item.version += 1;
        if (item.depth) {
          item.depth.texture = gpu.device.createTexture({
            size: item.size,
            format: depthFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
          });
          item.depth.view = item.depth.texture.createView();
          item.depth.version += 1;
        }
      };
      allocate();
      gpu.targets.add(item);
      return item;
    };

    const sampler = (gpu, opts) => ({
      kind: 'sampler',
      resource: gpu.device.createSampler(opts),
      version: 1
    });

    const uniforms = (gpu, initial) => {
      const keys = Object.keys(initial);
      const data = new Float32Array(keys.length * 4);
      const offsets = new Map(keys.map((key, index) => [key, index * 4]));
      const buffer = gpu.device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      gpu.buffers.add(buffer);
      const set = patch => {
        for (const [key, value] of Object.entries(patch)) {
          const off = offsets.get(key);
          if (off === undefined) continue;
          for (let i = 0; i < 4; i += 1) data[off + i] = value[i] ?? 0;
        }
        gpu.device.queue.writeBuffer(buffer, 0, data);
      };
      set(initial);
      return { kind: 'uniform', buffer, version: 1, set };
    };

    const storage = (gpu, byteLength) => {
      const size = Math.max(16, Math.ceil(byteLength / 16) * 16);
      const buffer = gpu.device.createBuffer({
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      gpu.buffers.add(buffer);
      return {
        kind: 'storage',
        buffer,
        version: 1,
        write(typed) {
          gpu.device.queue.writeBuffer(buffer, 0, typed.buffer, typed.byteOffset, typed.byteLength);
        }
      };
    };

    const draw = (gpu, opts) => {
      const specs = parseBindings(opts.shader);
      const bound = Object.assign({}, opts.set || {});
      const vertices = opts.vertices ?? 3;
      const vertexEntry = opts.entry?.vertex || (opts.shader.includes('fn vs_screen') ? 'vs_screen' : 'vs_main');
      const fragmentEntry = opts.entry?.fragment || 'fs_main';
      let pipeline = null;
      let bindGroup = null;
      let versions = [];

      const item = {
        vertices,
        set(map) {
          Object.assign(bound, map);
          bindGroup = null;
        },
        async compile(signature) {
          let module = gpu.modules.get(opts.shader);
          if (!module) {
            module = gpu.device.createShaderModule({ code: opts.shader });
            gpu.modules.set(opts.shader, module);
          }
          const colorFormats = signature.colors || [signature.format || 'rgba16float'];
          const desc = {
            label: opts.label,
            layout: 'auto',
            vertex: { module, entryPoint: vertexEntry },
            fragment: {
              module,
              entryPoint: fragmentEntry,
              targets: colorFormats.map(format =>
                opts.blend === 'premultiplied' ? { format, blend: PREMULTIPLIED } : { format }
              )
            },
            primitive: { topology: 'triangle-list', cullMode: opts.cull || 'none' }
          };
          if (signature.depth && opts.depth !== false) {
            desc.depthStencil = {
              format: signature.depth.format,
              depthWriteEnabled: !!(opts.depth && opts.depth.write),
              depthCompare: (opts.depth && opts.depth.compare) || 'less'
            };
          }
          pipeline = await gpu.device.createRenderPipelineAsync(desc);
          bindGroup = null;
        },
        getPipeline() {
          return pipeline;
        },
        getBindGroup() {
          if (!pipeline) return null;
          let stale = !bindGroup || versions.length !== specs.length;
          if (!stale) {
            for (let i = 0; i < specs.length; i += 1) {
              const targetItem = bound[specs[i].name];
              if (!targetItem || targetItem.version !== versions[i]) {
                stale = true;
                break;
              }
            }
          }
          if (!stale) return bindGroup;
          const entries = [];
          const nextVersions = [];
          for (const spec of specs) {
            const targetItem = bound[spec.name];
            if (!targetItem) return null;
            nextVersions.push(targetItem.version);
            let resource;
            if (targetItem.kind === 'uniform' || targetItem.kind === 'storage') {
              resource = { buffer: targetItem.buffer };
            } else if (targetItem.kind === 'sampler') {
              resource = targetItem.resource;
            } else {
              resource = targetItem.view;
            }
            entries.push({ binding: spec.binding, resource });
          }
          bindGroup = gpu.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries
          });
          versions = nextVersions;
          return bindGroup;
        }
      };
      return item;
    };

    const frame = (gpu, record) => {
      const encoder = gpu.device.createCommandEncoder();
      const api = {
        pass(options, fn) {
          const tgt = options.target;
          const view = tgt.getView ? tgt.getView() : tgt.view;
          const colorAttachment = {
            view,
            loadOp: options.clear === false ? 'load' : 'clear',
            storeOp: 'store'
          };
          if (Array.isArray(options.clear)) {
            colorAttachment.clearValue = options.clear;
          }
          const passDescriptor = { colorAttachments: [colorAttachment] };
          if (tgt.depth) {
            passDescriptor.depthStencilAttachment = {
              view: tgt.depth.view,
              depthLoadOp: options.clearDepth !== undefined ? 'clear' : 'load',
              depthStoreOp: 'store',
              depthClearValue: options.clearDepth ?? 1
            };
          }
          const passEncoder = encoder.beginRenderPass(passDescriptor);
          fn({
            draw(drawItem, drawOpts = {}) {
              const p = drawItem.getPipeline();
              const bg = drawItem.getBindGroup();
              if (!p || !bg) return;
              passEncoder.setPipeline(p);
              passEncoder.setBindGroup(0, bg);
              passEncoder.draw(drawItem.vertices, drawOpts.instances ?? 1, 0, drawOpts.firstInstance ?? 0);
            }
          });
          passEncoder.end();
        }
      };
      record(api);
      gpu.device.queue.submit([encoder.finish()]);
    };

    return { init, surface, target, sampler, uniforms, storage, draw, frame };
  })();

  const readPreset = container => {
    const d = container.dataset;
    const num = (val, fallback) => {
      if (val === undefined || val === '') return fallback;
      const parsed = Number(val);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    return {
      shardColor: d.aeroShardColor || '#e3a17a',
      accentColor: d.aeroAccentColor || '#f97316',
      backgroundColor: 'transparent',
      placement: d.aeroPlacement || 'full',
      material: d.aeroMaterial || 'chrome',
      markers: d.aeroMarkers || 'dots',
      count: num(d.aeroCount, 650),
      depthOfField: num(d.aeroDof, 0.75),
      glow: num(d.aeroGlow, 0.35),
      grain: num(d.aeroGrain, 0.06),
      vignette: num(d.aeroVignette, 0.3),
      intro: true,
      mouseInteraction: true,
      mouseStrength: num(d.aeroMouseStrength, 0.6),
      pulseOnClick: true,
      holdToGather: true,
      parallax: num(d.aeroParallax, 0.5),
      shardSize: num(d.aeroShardSize, 0.87),
      spread: num(d.aeroSpread, 1.43),
      twist: num(d.aeroTwist, 1.67),
      billow: num(d.aeroBillow, 1),
      speed: num(d.aeroSpeed, 0.9),
      scale: num(d.aeroScale, 1),
      paused: false
    };
  };

  const makeSettings = preset => ({
    shard: parseColor(preset.shardColor, [0.89, 0.63, 0.48]) ?? [0.89, 0.63, 0.48],
    accent: parseColor(preset.accentColor, [0.98, 0.45, 0.09]) ?? [0.98, 0.45, 0.09],
    paper: parseColor(preset.backgroundColor, null),
    lightMode: document.documentElement.dataset.theme !== 'dark',
    placement: Math.max(0, PLACEMENTS.indexOf(preset.placement)),
    material: MATERIALS[preset.material] ?? MATERIALS.chrome,
    count: Math.round(clamp(preset.count, 100, 6000)),
    shardSize: clamp(preset.shardSize, 0.2, 4),
    spread: clamp(preset.spread, 0, 3),
    twist: clamp(preset.twist, 0, 3),
    billow: clamp(preset.billow, 0, 3),
    speed: clamp(preset.speed, 0, 4),
    scale: clamp(preset.scale, 0.4, 2.5),
    depthOfField: clamp(preset.depthOfField, 0, 1),
    glow: clamp(preset.glow, 0, 2),
    grain: clamp(preset.grain, 0, 0.5),
    vignette: clamp(preset.vignette, 0, 1),
    intro: preset.intro,
    mouseInteraction: preset.mouseInteraction,
    mouseStrength: clamp(preset.mouseStrength, 0, 1),
    markers: MARKER_STYLES[preset.markers] ?? -1,
    pulseOnClick: preset.pulseOnClick,
    holdToGather: preset.holdToGather,
    parallax: clamp(preset.parallax, 0, 1),
    paused: preset.paused,
    dpr: coarsePointer.matches ? 1.25 : 2
  });

  let sharedGpuPromise = null;
  const getSharedGpu = () => {
    if (!sharedGpuPromise) {
      sharedGpuPromise = vgpu.init({ powerPreference: 'high-performance' });
    }
    return sharedGpuPromise;
  };

  /* Canvas 2D fallback used only when WebGPU is unavailable or fails before first frame. */
  function startFallback2D(container, preset, seed) {
    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    const canvas = document.createElement('canvas');
    canvas.className = CANVAS;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetPlacement = Math.max(0, PLACEMENTS.indexOf(container.dataset.aeroPlacement || preset.placement));
    let weights = PLACEMENTS.map((_, i) => (i === targetPlacement ? 1 : 0));
    let weightVelocity = [0, 0, 0, 0];
    let pathKey2D = '';
    let settling2D = false;
    const shards = createShards(Math.min(280, preset.count), seed);
    const paths = Array.from({ length: LEVELS }, () => []);
    const pointer = [0.5, 0.5];
    let inside = false;
    let visible = !('IntersectionObserver' in window);
    let printing = false;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let introAt = 0;
    let rings = [];
    let w = 1;
    let h = 1;
    let ratio = 1;
    const out = [0, 0, 0];

    const buildPaths2D = aspect => {
      const key = `${aspect.toFixed(4)}|${weights.map(weight => weight.toFixed(4)).join(',')}`;
      if (key === pathKey2D) return;
      pathKey2D = key;
      for (let level = 0; level < LEVELS; level += 1) {
        paths[level] = [];
        for (let i = 0; i <= 80; i += 1) {
          const s = i / 80;
          let x = 0;
          let y = 0;
          let z = 0;
          for (let k = 0; k < 4; k += 1) {
            const weight = weights[k];
            if (weight < 0.0001) continue;
            ribbonPoint(k, level, s, aspect, out);
            x += out[0] * weight;
            y += out[1] * weight;
            z += out[2] * weight;
          }
          paths[level].push([x, y, z]);
        }
      }
    };

    const resize2D = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, container.clientWidth);
      h = Math.max(1, container.clientHeight);
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      buildPaths2D(w / Math.max(h, 1));
    };

    const draw2D = dt => {
      const reduced = prefersReduced();
      const light = document.documentElement.dataset.theme !== 'dark';
      if (!reduced) clock += dt * preset.speed;
      for (const ring of rings) ring.age += dt;
      rings = rings.filter(r => r.age < (r.duration || RING_SECONDS));

      const goal = PLACEMENTS.map((_, i) => (i === targetPlacement ? 1 : 0));
      settling2D = false;
      if (reduced) {
        weights = goal;
        weightVelocity = [0, 0, 0, 0];
      } else {
        const decay = Math.exp(-4 * dt);
        for (let i = 0; i < 4; i += 1) {
          const offset = weights[i] - goal[i];
          const momentum = weightVelocity[i] + 4 * offset;
          weights[i] = goal[i] + (offset + momentum * dt) * decay;
          weightVelocity[i] = (weightVelocity[i] - 4 * momentum * dt) * decay;
          if (Math.abs(weights[i] - goal[i]) > 0.0005) settling2D = true;
        }
        if (!settling2D) {
          weights = goal;
          weightVelocity = [0, 0, 0, 0];
        }
      }
      buildPaths2D(w / Math.max(h, 1));

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const focal = h * 0.5 * CAMERA * preset.scale;
      const halfH = Math.max(h * 0.5, 1);
      const px = (pointer[0] - 0.5) * w;
      const py = (pointer[1] - 0.5) * h;
      const introAge = Math.max(0, clock - introAt);
      const introSpan = INTRO_SECONDS - 1.0 - (LEVELS - 1) * 0.22;
      const activeTint = laserTint();
      const shardRgb = activeTint?.shard ?? parseColor(preset.shardColor, [0.89, 0.63, 0.48]) ?? [0.89, 0.63, 0.48];
      const accentRgb = activeTint?.accent ?? parseColor(preset.accentColor, [0.98, 0.45, 0.09]) ?? [0.98, 0.45, 0.09];
      const baseR = shardRgb[0] * 255;
      const baseG = shardRgb[1] * 255;
      const baseB = shardRgb[2] * 255;
      const accR = accentRgb[0] * 255;
      const accG = accentRgb[1] * 255;
      const accB = accentRgb[2] * 255;
      const ringStates = rings.map(ring => {
        const dur = ring.duration || RING_SECONDS;
        const life = clamp(ring.age / dur, 0, 1);
        const falloffPow = (ring.gain || 1) > 1.2 ? 1.45 : 2;
        return {
          x: ring.x,
          y: ring.y,
          age: ring.age,
          startRadius: ring.startRadius || 0,
          speed: ring.speed || 2.3,
          width: ring.width || 0.012,
          gain: ring.gain || 1,
          strength: (1 - Math.exp(-ring.age / 0.05)) * Math.pow(1 - life, falloffPow)
        };
      });

      for (let i = shards.length - 1; i >= 0; i -= 1) {
        const shard = shards[i];
        const level = shard.level;
        const s0 = (shard.phase + clock * 0.028 * (1 - level * 0.12)) % 1;
        const begin = level * 0.22 + Math.max(0, s0 - 0.1) * introSpan + shard.arrive * 0.15;
        const appear = preset.intro && !reduced ? smoother(clamp((introAge - begin) / 0.9, 0, 1)) : 1;
        if (appear <= 0.002) continue;
        const idx = Math.floor(s0 * 80);
        const p = paths[level][Math.min(idx, 80)];
        const angle = preset.twist * (s0 * TAU * 0.6 + clock * 0.08 + level * 1.7);
        const depth = Math.max(CAMERA - p[2], 0.5);
        const widthSpread = preset.spread * (0.18 + 0.04 * DEPTHS[level]);
        const wx = p[0] + Math.cos(angle) * shard.lane * widthSpread;
        const wy = p[1] + Math.sin(angle) * shard.lane * widthSpread * 0.65 +
          preset.billow * 0.14 * Math.sin(s0 * TAU * 1.3 - clock * 0.5 + level);
        let sx = w * 0.5 + (wx * focal) / depth;
        let sy = h * 0.5 - (wy * focal) / depth;
        if (inside && !reduced) {
          const dx = sx - (px + w * 0.5);
          const dy = sy - (py + h * 0.5);
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 1) {
            const push = (1 - dist / 140) * 28;
            sx += (dx / dist) * push;
            sy += (dy / dist) * push;
          }
        }
        let ringFlash = 0;
        let rotBoost = 0;
        if (ringStates.length) {
          const fx2 = (sx - w * 0.5) / halfH;
          const fy2 = (h * 0.5 - sy) / halfH;
          for (const ring of ringStates) {
            const radius = ring.startRadius + Math.max(0, ring.age - level * 0.07) * ring.speed;
            const dxr = fx2 - ring.x;
            const dyr = fy2 - ring.y;
            const dist2 = Math.hypot(dxr, dyr);
            const band = Math.exp(-((dist2 - radius) * (dist2 - radius)) / ring.width) * ring.strength * ring.gain;
            if (band > 0.01) {
              const outward = Math.max(dist2, 0.05);
              const push2 = band * 44 * (DEPTHS[level] / CAMERA);
              sx += (dxr / outward) * push2;
              sy -= (dyr / outward) * push2;
              ringFlash = Math.max(ringFlash, Math.min(band * 1.4, 2.2));
              rotBoost += band * 0.75 * shard.sign;
            }
          }
        }
        const sz = (0.062 * preset.shardSize * shard.size * GROWTH[level] * focal) / depth * (0.4 + 0.6 * appear);
        const rot = s0 * 4 + shard.yaw + Math.sin(clock * shard.flutter[1] + shard.flutter[0]) * 0.25 + rotBoost;
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);
        const tilt = 0.45 + 0.55 * Math.abs(Math.cos(angle + shard.bank));
        const alpha = Math.min(1, FADE[level] * (light ? 0.52 : 0.72) * appear + ringFlash * 0.4);
        const mix = shard.tint;
        const rCol = Math.min(255, Math.round(baseR * (1 - mix) + accR * mix + ringFlash * 45));
        const gCol = Math.min(255, Math.round(baseG * (1 - mix) + accG * mix + ringFlash * 45));
        const bCol = Math.min(255, Math.round(baseB * (1 - mix) + accB * mix + ringFlash * 45));

        ctx.save();
        ctx.translate(sx, sy);
        ctx.beginPath();
        for (let k = 0; k < shard.sides; k += 1) {
          const lx = shard.shape[k * 2] * sz;
          const ly = shard.shape[k * 2 + 1] * sz * tilt;
          const rx = lx * cr - ly * sr;
          const ry = lx * sr + ly * cr;
          if (k === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        const grad = ctx.createLinearGradient(-sz, -sz, sz, sz);
        grad.addColorStop(0, `rgba(255,244,235,${(alpha * (light ? 0.65 : 0.9)).toFixed(2)})`);
        grad.addColorStop(0.5, `rgba(${rCol},${gCol},${bCol},${alpha.toFixed(2)})`);
        grad.addColorStop(1, `rgba(${Math.round(accR * 0.48)},${Math.round(accG * 0.42)},${Math.round(accB * 0.35)},${(alpha * 0.85).toFixed(2)})`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      if (ringStates.length) {
        ctx.save();
        for (const ring of ringStates) {
          const rad = (ring.startRadius + ring.age * (ring.speed * 0.65)) * halfH;
          const op = Math.min(0.85, ring.strength * ring.gain * 0.45);
          if (rad <= 1 || op <= 0.002) continue;
          const rx = w * 0.5 + ring.x * halfH;
          const ry = h * 0.5 - ring.y * halfH;
          ctx.beginPath();
          ctx.arc(rx, ry, rad, 0, TAU);
          ctx.strokeStyle = `rgba(${Math.round(accR)},${Math.round(accG)},${Math.round(accB)},${(op * 0.35).toFixed(3)})`;
          ctx.lineWidth = 6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(rx, ry, rad, 0, TAU);
          ctx.strokeStyle = `rgba(255,244,235,${op.toFixed(3)})`;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
        ctx.restore();
      }

      container.dataset.aeroRenderer = '2d';
      container.classList.add('is-enhanced');
    };

    const stop2D = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    const tick2D = now => {
      raf = 0;
      if (!visible || document.hidden || printing) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      draw2D(dt);
      if (settling2D || !prefersReduced() || rings.length > 0) raf = requestAnimationFrame(tick2D);
    };
    const wake2D = () => {
      if (!raf && visible && !document.hidden && !printing) raf = requestAnimationFrame(tick2D);
    };

    const ro2D = new ResizeObserver(() => { resize2D(); draw2D(0); });
    ro2D.observe(container);
    if ('IntersectionObserver' in window) {
      const io2D = new IntersectionObserver(entries => {
        visible = entries.some(e => e.isIntersecting);
        if (visible) { draw2D(0); wake2D(); } else stop2D();
      });
      io2D.observe(container);
    }
    const mo2D = new MutationObserver(() => { draw2D(0); wake2D(); });
    mo2D.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const moConfig2D = new MutationObserver(() => {
      const next = container.dataset.aeroPlacement;
      if (next && PLACEMENTS.includes(next)) {
        preset.placement = next;
        targetPlacement = PLACEMENTS.indexOf(next);
      }
      draw2D(0);
      wake2D();
    });
    moConfig2D.observe(container, { attributes: true, attributeFilter: ['data-aero-placement'] });
    window.addEventListener('pointermove', event => {
      const rect = container.getBoundingClientRect();
      inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (inside) pointer[0] = (event.clientX - rect.left) / Math.max(rect.width, 1), pointer[1] = (event.clientY - rect.top) / Math.max(rect.height, 1);
    }, { passive: true });
    window.addEventListener('pointerdown', event => {
      if (event.button !== 0 || prefersReduced()) return;
      if (event.target instanceof Element && event.target.closest('a, button, input, textarea, select, label, [role="button"], [data-carousel-viewport], [data-carousel-controls], [data-option-wheel]')) return;
      const rect = container.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      const aspect = w / Math.max(h, 1);
      rings.push({ x: (((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1) * aspect, y: 1 - ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2, age: 0 });
      if (rings.length > MAX_RINGS) rings.shift();
      wake2D();
    });
    const emitPulseAtClient2D = (clientX, clientY, opts = {}) => {
      if (prefersReduced()) return;
      const rect = container.getBoundingClientRect();
      const ch = Math.max(rect.height, 1);
      const cw = Math.max(rect.width, 1);
      const aspect = cw / ch;
      const startRadius = Math.max(0, Number(opts.startRadiusPx) || 0) / (ch * 0.5);
      rings.push({
        x: (((clientX - rect.left) / cw) * 2 - 1) * aspect,
        y: 1 - ((clientY - rect.top) / ch) * 2,
        age: 0,
        startRadius,
        speed: opts.speed ?? 1.9,
        width: opts.width ?? 0.026,
        gain: opts.gain ?? 1.35,
        duration: opts.duration ?? 2.8
      });
      if (rings.length > MAX_RINGS) rings.shift();
      wake2D();
    };
    container.addEventListener('aero:pulse', event => {
      const detail = event.detail;
      if (detail && Number.isFinite(detail.clientX) && Number.isFinite(detail.clientY)) {
        emitPulseAtClient2D(detail.clientX, detail.clientY, detail);
      }
    });
    container._aeroShards = { pulseAtClient: emitPulseAtClient2D };
    const onReplay2D = () => {
      if (prefersReduced()) return;
      introAt = clock;
      rings = [];
      draw2D(0);
      wake2D();
    };
    const host2D = container.closest('section') || container;
    host2D.addEventListener('section:prepare', onReplay2D);
    host2D.addEventListener('section:enter', onReplay2D);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop2D(); else wake2D(); });
    window.addEventListener('beforeprint', () => { printing = true; stop2D(); });
    window.addEventListener('afterprint', () => { printing = false; wake2D(); });
    resize2D();
    draw2D(0);
    wake2D();
  }

  function mountContainer(container, instanceIndex) {
    const preset = readPreset(container);
    const seed = 1337 + instanceIndex * 97;
    let disposed = false;
    let raf = 0;
    let renderedOnce = false;
    const cleanups = [];
    const ownTargets = new Set();
    const ownBuffers = new Set();
    const canvas = document.createElement('canvas');
    canvas.className = CANVAS;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    const fail = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      cleanups.forEach(cleanup => cleanup());
      cleanups.length = 0;
      ownTargets.forEach(t => t.destroy());
      ownBuffers.forEach(b => b.destroy());
      ownTargets.clear();
      ownBuffers.clear();
      if (!renderedOnce) {
        startFallback2D(container, preset, seed);
      } else {
        canvas.remove();
        container.classList.remove('is-enhanced');
      }
    };

    const start = async () => {
      const shared = await getSharedGpu();
      if (disposed) return;
      const instance = {
        device: shared.device,
        modules: shared.modules,
        targets: ownTargets,
        buffers: ownBuffers,
        onError: shared.onError
      };
      cleanups.push(shared.onError(fail));
      const initialPlacement = container.dataset.aeroPlacement;
      if (initialPlacement && PLACEMENTS.includes(initialPlacement)) {
        preset.placement = initialPlacement;
      }
      let currentSettings = makeSettings(preset);
      const format = navigator.gpu.getPreferredCanvasFormat();
      const sizeFor = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, currentSettings.dpr);
        return [
          Math.max(1, Math.round(container.clientWidth * ratio)),
          Math.max(1, Math.round(container.clientHeight * ratio))
        ];
      };
      const output = vgpu.surface(instance, canvas, {
        autoResize: false,
        size: sizeFor(),
        format,
        alphaMode: 'premultiplied'
      });
    const linear = vgpu.sampler(instance, {
      minFilter: 'linear',
      magFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge'
    });
    const scene = vgpu.target(instance, { size: output.size, format: 'rgba16float' });
    const levelSize = index => [
      Math.max(1, Math.round(output.size[0] / 2 ** (index + 1))),
      Math.max(1, Math.round(output.size[1] / 2 ** (index + 1)))
    ];
    const levels = Array.from({ length: BLOOM_LEVELS }, (_, index) => ({
      main: vgpu.target(instance, { size: levelSize(index), format: 'rgba16float' }),
      spare: vgpu.target(instance, { size: levelSize(index), format: 'rgba16float' })
    }));
    const frameParams = vgpu.uniforms(instance, {
      view: [1, 1, 1, 0],
      eye: [0, 0, CAMERA, FOCUS],
      forward: [0, 0, -1, 0],
      right: [1, 0, 0, 0],
      up: [0, 1, 0, 0],
      shard: [0.89, 0.63, 0.48, 0.5],
      accent: [0.98, 0.45, 0.09, 0],
      marker: [0, 1, 4, CAMERA],
      surface: [1, 0, 0, 2.4]
    });

    const channel = new MessageChannel();
    cleanups.push(() => channel.port1.close());
    const breathe = () =>
      new Promise(resolve => {
        channel.port1.onmessage = resolve;
        channel.port2.postMessage(0);
      });

    const pending = [];
    const prepare = (item, signature) => {
      const ready = item.compile(signature);
      ready.catch(fail);
      pending.push(ready);
      return item;
    };

    const groupSize = s => [
      Math.max(1, Math.round(output.size[0] * s)),
      Math.max(1, Math.round(output.size[1] * s))
    ];
    const groups = LAYER_SCALES.map((s, index) => ({
      scale: s,
      layer: vgpu.target(instance, { size: groupSize(s), format: 'rgba16float', depth: 'depth32float' }),
      shaded: vgpu.target(instance, { size: groupSize(s), format: 'rgba16float' }),
      temp: vgpu.target(instance, { size: index === 0 ? [1, 1] : groupSize(s), format: 'rgba16float' }),
      blurred: vgpu.target(instance, { size: index === 0 ? [1, 1] : groupSize(s), format: 'rgba16float' }),
      softReady: index !== 0
    }));
    const params = groups.map(() => vgpu.uniforms(instance, { view: [1, 1, 1, 0], look: [0.7, 0, 0, 0] }));
    const shades = groups.map(() => vgpu.uniforms(instance, { info: [0, 0, 0, 0], more: [0, 0, 0, 0] }));
    const solids = [];
    const edges = [];
    const shadows = [];
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      solids.push(
        prepare(
          vgpu.draw(instance, {
            shader: SHARD_SHADER,
            entry: { fragment: 'fs_solid' },
            vertices: 6,
            cull: 'none',
            depth: { write: true, compare: 'less' },
            label: `aero-shards-solid-${index}`
          }),
          group.layer
        )
      );
      await breathe();
      if (disposed) return;
      edges.push(
        prepare(
          vgpu.draw(instance, {
            shader: SHARD_SHADER,
            entry: { fragment: 'fs_edge' },
            vertices: 6,
            cull: 'none',
            depth: { write: false, compare: 'less' },
            blend: 'premultiplied',
            label: `aero-shards-edge-${index}`
          }),
          group.layer
        )
      );
      await breathe();
      if (disposed) return;
      shadows.push(
        prepare(
          vgpu.draw(instance, {
            shader: SHADOW_SHADER,
            label: `aero-shards-shadow-${index}`,
            set: { source: group.layer, depthMap: group.layer.depth, shadeInfo: shades[index] }
          }),
          group.shaded
        )
      );
    }

    let markerCapacity = 0;
    let markerBuffer = null;
    let markerData = new Float32Array(0);
    const markerDraw = prepare(
      vgpu.draw(instance, {
        shader: MARKER_SHADER,
        vertices: 6,
        cull: 'none',
        depth: false,
        blend: 'premultiplied',
        label: 'aero-shards-markers'
      }),
      scene
    );
    const ensureMarkers = needed => {
      if (needed <= markerCapacity && markerBuffer) return;
      markerCapacity = Math.max(needed, 512);
      markerData = new Float32Array(markerCapacity * MARKER_FLOATS);
      markerBuffer = vgpu.storage(instance, markerData.byteLength, 'read');
      markerDraw.set({ scene: frameParams, markers: markerBuffer });
    };
    ensureMarkers(512);

    let capacity = 0;
    let shardBuffer = null;
    let upload = new Float32Array(0);
    let staging = new Float32Array(0);
    let depths = new Float32Array(0);
    const ensureCapacity = needed => {
      if (needed <= capacity && shardBuffer) return;
      capacity = Math.max(needed, 256);
      upload = new Float32Array(capacity * FLOATS);
      staging = new Float32Array(capacity * FLOATS);
      depths = new Float32Array(capacity);
      shardBuffer = vgpu.storage(instance, upload.byteLength, 'read');
      groups.forEach((_, index) => {
        solids[index].set({ scene: frameParams, shards: shardBuffer, layerInfo: params[index] });
        edges[index].set({ scene: frameParams, shards: shardBuffer, layerInfo: params[index] });
      });
    };
    ensureCapacity(currentSettings.count);

    const passes = levels.map((level, index) => {
      const source = index === 0 ? scene : levels[index - 1].main;
      const downParams = vgpu.uniforms(instance, { texel: [0, 0, 0, 0] });
      const horizontalParams = vgpu.uniforms(instance, { texel: [0, 0, 0, 0] });
      const verticalParams = vgpu.uniforms(instance, { texel: [0, 0, 0, 0] });
      return {
        source,
        level,
        downParams,
        horizontalParams,
        verticalParams,
        down: prepare(
          vgpu.draw(instance, {
            shader: index === 0 ? PREFILTER_SHADER : DOWNSAMPLE_SHADER,
            label: `aero-shards-down-${index}`,
            set: { source, linearSampler: linear, bloom: downParams }
          }),
          level.main
        ),
        horizontal: prepare(
          vgpu.draw(instance, {
            shader: BLUR_SHADER,
            label: `aero-shards-blur-x-${index}`,
            set: { source: level.main, linearSampler: linear, bloom: horizontalParams }
          }),
          level.spare
        ),
        vertical: prepare(
          vgpu.draw(instance, {
            shader: BLUR_SHADER,
            label: `aero-shards-blur-y-${index}`,
            set: { source: level.spare, linearSampler: linear, bloom: verticalParams }
          }),
          level.main
        )
      };
    });

    const finishParams = vgpu.uniforms(instance, { info: [0, 0, 0, 1], paper: [0, 0, 0, 0], mode: [0, 0, 0, 0] });
    const finish = prepare(
      vgpu.draw(instance, {
        shader: FINISH_SHADER,
        label: 'aero-shards-finish',
        set: {
          sceneTexture: scene,
          linearSampler: linear,
          bloom0: levels[0].main,
          bloom1: levels[1].main,
          bloom2: levels[2].main,
          bloom3: levels[3].main,
          finish: finishParams
        }
      }),
      { colors: [format] }
    );
    await breathe();
    if (disposed) return;

    const spreadX = DEPTHS.map(() => vgpu.uniforms(instance, { texel: [0, 0, 0, 0] }));
    const spreadY = DEPTHS.map(() => vgpu.uniforms(instance, { texel: [0, 0, 0, 0] }));
    const mixParams = DEPTHS.map(() => vgpu.uniforms(instance, { info: [1, 0, 0, 0] }));
    const layerPasses = [];
    for (let level = 0; level < LEVELS; level += 1) {
      layerPasses.push(
        groups.map((group, index) => ({
          blurX: prepare(
            vgpu.draw(instance, {
              shader: LAYER_BLUR_SHADER,
              label: `aero-shards-depth-x-${level}-${index}`,
              set: { source: group.shaded, linearSampler: linear, spreadInfo: spreadX[level] }
            }),
            group.temp
          ),
          blurY: prepare(
            vgpu.draw(instance, {
              shader: LAYER_BLUR_SHADER,
              label: `aero-shards-depth-y-${level}-${index}`,
              set: { source: group.temp, linearSampler: linear, spreadInfo: spreadY[level] }
            }),
            group.blurred
          ),
          sharp: prepare(
            vgpu.draw(instance, {
              shader: COMPOSITE_SHADER,
              label: `aero-shards-sharp-${level}-${index}`,
              blend: 'premultiplied',
              set: { source: group.shaded, linearSampler: linear, mixInfo: mixParams[level] }
            }),
            scene
          ),
          soft: prepare(
            vgpu.draw(instance, {
              shader: COMPOSITE_SHADER,
              label: `aero-shards-soft-${level}-${index}`,
              blend: 'premultiplied',
              set: { source: group.blurred, linearSampler: linear, mixInfo: mixParams[level] }
            }),
            scene
          )
        }))
      );
      await breathe();
      if (disposed) return;
    }
    await Promise.all(pending);
    if (disposed) return;
    channel.port1.close();

    const paths = Array.from({ length: LEVELS }, () => ({
      position: new Float32Array(SAMPLES * 3),
      tangent: new Float32Array(SAMPLES * 3),
      across: new Float32Array(SAMPLES * 3),
      lift: new Float32Array(SAMPLES * 3),
      length: 1
    }));
    const markerCounts = [0, 0, 0, 0, 0];
    const markerStarts = [0, 0, 0, 0, 0];
    const raw = new Float32Array((SAMPLES + 1) * 3);
    const lengths = new Float32Array(SAMPLES + 1);
    const point = [0, 0, 0];
    let pathKey = '';

    const state = {
      visible: !('IntersectionObserver' in window),
      printing: false,
      clock: 0,
      last: 0,
      travel: new Float64Array(LEVELS),
      roll: 0,
      twist: 0,
      drift: 0,
      introAt: -1,
      weights: PLACEMENTS.map((_, index) => (index === currentSettings.placement ? 1 : 0)),
      weightVelocity: [0, 0, 0, 0],
      shards: createShards(currentSettings.count, seed),
      order: [],
      pointer: [0.5, 0.5],
      inside: false,
      presence: 0,
      yaw: 0,
      pitch: 0,
      yawVelocity: 0,
      pitchVelocity: 0,
      pressAt: -1,
      pressPoint: null,
      holding: false,
      hold: 0,
      reach: 0,
      gatherCenter: [0, 0, 0],
      rings: [],
      markerDrift: 0,
      markerTarget: '',
      markerTotal: 0,
      targets: new Map(),
      quiet: 0,
      seen: null
    };

    const buildPaths = aspect => {
      const closed = state.weights[3] > 0.999;
      const key = `${aspect.toFixed(4)}|${state.weights.map(w => w.toFixed(4)).join(',')}`;
      if (key === pathKey) return closed;
      pathKey = key;
      for (let level = 0; level < LEVELS; level += 1) {
        const path = paths[level];
        let total = 0;
        for (let i = 0; i <= SAMPLES; i += 1) {
          const s = i / SAMPLES;
          let x = 0;
          let y = 0;
          let z = 0;
          for (let k = 0; k < 4; k += 1) {
            const weight = state.weights[k];
            if (weight < 0.0001) continue;
            ribbonPoint(k, level, s, aspect, point);
            x += point[0] * weight;
            y += point[1] * weight;
            z += point[2] * weight;
          }
          raw[i * 3] = x;
          raw[i * 3 + 1] = y;
          raw[i * 3 + 2] = z;
          if (i > 0) total += Math.hypot(x - raw[i * 3 - 3], y - raw[i * 3 - 2], z - raw[i * 3 - 1]);
          lengths[i] = total;
        }
        path.length = Math.max(total, 1e-3);
        let cursor = 0;
        for (let i = 0; i < SAMPLES; i += 1) {
          const want = (i / (SAMPLES - 1)) * total;
          while (cursor < SAMPLES - 1 && lengths[cursor + 1] < want) cursor += 1;
          const span = Math.max(lengths[cursor + 1] - lengths[cursor], 1e-6);
          const f = clamp((want - lengths[cursor]) / span, 0, 1);
          for (let c = 0; c < 3; c += 1) {
            path.position[i * 3 + c] = raw[cursor * 3 + c] + (raw[cursor * 3 + 3 + c] - raw[cursor * 3 + c]) * f;
          }
        }
        let px = 0;
        let py = 1;
        let pz = 0;
        for (let i = 0; i < SAMPLES; i += 1) {
          const a = Math.max(0, i - 1);
          const b = Math.min(SAMPLES - 1, i + 1);
          let tx = path.position[b * 3] - path.position[a * 3];
          let ty = path.position[b * 3 + 1] - path.position[a * 3 + 1];
          let tz = path.position[b * 3 + 2] - path.position[a * 3 + 2];
          const tl = Math.hypot(tx, ty, tz) || 1;
          tx /= tl;
          ty /= tl;
          tz /= tl;
          if (i === 0) {
            px = -ty;
            py = tx;
            pz = 0;
          }
          const along = px * tx + py * ty + pz * tz;
          px -= tx * along;
          py -= ty * along;
          pz -= tz * along;
          const pl = Math.hypot(px, py, pz) || 1;
          px /= pl;
          py /= pl;
          pz /= pl;
          path.tangent[i * 3] = tx;
          path.tangent[i * 3 + 1] = ty;
          path.tangent[i * 3 + 2] = tz;
          path.across[i * 3] = px;
          path.across[i * 3 + 1] = py;
          path.across[i * 3 + 2] = pz;
          path.lift[i * 3] = ty * pz - tz * py;
          path.lift[i * 3 + 1] = tz * px - tx * pz;
          path.lift[i * 3 + 2] = tx * py - ty * px;
        }
      }
      return closed;
    };

    const resize = () => {
      const next = sizeFor();
      if (next[0] === output.size[0] && next[1] === output.size[1]) return;
      output.resize(next);
      scene.resize(next);
      groups.forEach(group => {
        group.layer.resize(groupSize(group.scale));
        group.shaded.resize(groupSize(group.scale));
        if (group.softReady) {
          group.temp.resize(groupSize(group.scale));
          group.blurred.resize(groupSize(group.scale));
        }
      });
      levels.forEach((level, index) => {
        level.main.resize(levelSize(index));
        level.spare.resize(levelSize(index));
      });
      groups.forEach((group, index) => shadows[index].set({ depthMap: group.layer.depth }));
      state.quiet = 0;
    };

    const cam = { eye: [0, 0, CAMERA], forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], focal: 1 };

    const updateCamera = s => {
      const cy = Math.cos(state.yaw);
      const sy = Math.sin(state.yaw);
      const cp = Math.cos(state.pitch);
      const sp = Math.sin(state.pitch);
      cam.eye[0] = sy * cp * CAMERA;
      cam.eye[1] = sp * CAMERA;
      cam.eye[2] = cy * cp * CAMERA;
      cam.forward[0] = -sy * cp;
      cam.forward[1] = -sp;
      cam.forward[2] = -cy * cp;
      const rl = Math.hypot(cam.forward[2], cam.forward[0]) || 1;
      cam.right[0] = -cam.forward[2] / rl;
      cam.right[1] = 0;
      cam.right[2] = cam.forward[0] / rl;
      cam.up[0] = cam.right[1] * cam.forward[2] - cam.right[2] * cam.forward[1];
      cam.up[1] = cam.right[2] * cam.forward[0] - cam.right[0] * cam.forward[2];
      cam.up[2] = cam.right[0] * cam.forward[1] - cam.right[1] * cam.forward[0];
      cam.focal = output.size[1] * 0.5 * CAMERA * s.scale;
    };

    const ray = [0, 0, 1];
    const rayAt = (px, py) => {
      const x = (px - 0.5) * output.size[0];
      const y = (0.5 - py) * output.size[1];
      ray[0] = cam.forward[0] * cam.focal + cam.right[0] * x + cam.up[0] * y;
      ray[1] = cam.forward[1] * cam.focal + cam.right[1] * x + cam.up[1] * y;
      ray[2] = cam.forward[2] * cam.focal + cam.right[2] * x + cam.up[2] * y;
      const length = Math.hypot(ray[0], ray[1], ray[2]) || 1;
      ray[0] /= length;
      ray[1] /= length;
      ray[2] /= length;
      return ray;
    };

    const simulate = (s, dt, reduced) => {
      const aspect = output.size[0] / Math.max(output.size[1], 1);
      const closed = buildPaths(aspect);
      const introOn = s.intro && !reduced;
      const introAge = state.introAt < 0 ? 0 : state.clock - state.introAt;
      const hover = s.mouseInteraction && !reduced ? state.presence * s.mouseStrength : 0;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      if (hover > 0.001) {
        rayAt(state.pointer[0], state.pointer[1]);
        rx = ray[0];
        ry = ray[1];
        rz = ray[2];
      }
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / Math.max(steps, 1);
      const halfHeight = output.size[1] * 0.5;
      const rings = state.rings.map(ring => {
        const dur = ring.duration || RING_SECONDS;
        const life = clamp(ring.age / dur, 0, 1);
        const falloffPow = (ring.gain || 1) > 1.2 ? 1.45 : 2;
        return {
          x: ring.x,
          y: ring.y,
          age: ring.age,
          startRadius: ring.startRadius || 0,
          speed: ring.speed || 2.3,
          width: ring.width || 0.012,
          gain: ring.gain || 1,
          strength: (1 - Math.exp(-ring.age / 0.05)) * Math.pow(1 - life, falloffPow)
        };
      });
      const screenOf = (x, y, z, out) => {
        const ex = x - cam.eye[0];
        const ey = y - cam.eye[1];
        const ez = z - cam.eye[2];
        const depth = Math.max(ex * cam.forward[0] + ey * cam.forward[1] + ez * cam.forward[2], 0.05);
        out[0] = ((ex * cam.right[0] + ey * cam.right[1] + ez * cam.right[2]) * cam.focal) / depth / halfHeight;
        out[1] = ((ex * cam.up[0] + ey * cam.up[1] + ez * cam.up[2]) * cam.focal) / depth / halfHeight;
        return depth;
      };
      const ringBand = (sx, sy, level) => {
        let total = 0;
        for (const ring of rings) {
          const radius = ring.startRadius + Math.max(0, ring.age - level * 0.07) * ring.speed;
          const distance = Math.hypot(sx - ring.x, sy - ring.y);
          total += Math.exp(-((distance - radius) * (distance - radius)) / ring.width) * ring.strength * ring.gain;
        }
        return total;
      };
      const flat = [0, 0];
      const shards = state.shards;
      const twistWeight = Math.min(1, s.twist);
      for (let index = 0; index < shards.length; index += 1) {
        const shard = shards[index];
        const level = shard.level;
        const path = paths[level];
        let s0 = (shard.phase + state.travel[level]) % 1;
        let appear = 1;
        let introBank = 0;
        if (introOn) {
          const begin =
            level * 0.22 + Math.max(0, s0 - 0.1) * (INTRO_SECONDS - 1.0 - (LEVELS - 1) * 0.22) + shard.arrive * 0.15;
          const local = clamp((introAge - begin) / 0.9, 0, 1);
          appear = smoother(local);
          const glide = (1 - local) * (1 - local);
          s0 = closed ? s0 - glide * 0.06 : Math.max(0, s0 - glide * 0.06);
          introBank = glide * 0.9 * shard.sign;
        }
        shard.s = s0;
        const f = (((s0 % 1) + 1) % 1) * (SAMPLES - 1);
        const i0 = Math.floor(f);
        const i1 = Math.min(i0 + 1, SAMPLES - 1);
        const t = f - i0;
        const at = (array, c) => array[i0 * 3 + c] + (array[i1 * 3 + c] - array[i0 * 3 + c]) * t;
        const cx = at(path.position, 0);
        const cy = at(path.position, 1);
        const cz = at(path.position, 2);
        const tx = at(path.tangent, 0);
        const ty = at(path.tangent, 1);
        const tz = at(path.tangent, 2);
        const ax0 = at(path.across, 0);
        const ay0 = at(path.across, 1);
        const az0 = at(path.across, 2);
        const lx0 = at(path.lift, 0);
        const ly0 = at(path.lift, 1);
        const lz0 = at(path.lift, 2);
        const angle = s.twist * (s0 * TAU * 0.6 + state.twist + level * 1.7);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const ax = ax0 * ca + lx0 * sa;
        const ay = ay0 * ca + ly0 * sa;
        const az = az0 * ca + lz0 * sa;
        const bx = lx0 * ca - ax0 * sa;
        const by = ly0 * ca - ay0 * sa;
        const bz = lz0 * ca - az0 * sa;
        const depthScale = DEPTHS[level] / CAMERA;
        const width =
          s.spread * (0.15 + 0.035 * DEPTHS[level]) * (0.8 + 0.3 * Math.sin(s0 * TAU * 1.3 + level * 0.8));
        const lane = shard.lane * width;
        const layer = shard.layer * 0.012 * depthScale;
        const ringWeight = clamp(state.weights[3], 0, 1);
        const edgeTaper = smoother(s0 / 0.12) * smoother((1 - s0) / 0.12);
        const taper = edgeTaper + (1 - edgeTaper) * ringWeight;
        const billow =
          s.billow *
          0.16 *
          depthScale *
          Math.sin(s0 * TAU * 1.3 - state.drift * 0.5 + level * 1.1) *
          (0.4 + 0.6 * taper);
        const sway = s.billow * 0.06 * depthScale * Math.sin(s0 * TAU * 0.8 - state.drift * 0.35 + level * 2.4);
        const wobble = 0.009 * depthScale;
        const drift = state.drift;
        const hx =
          cx +
          lx0 * billow +
          ax0 * sway +
          ax * lane +
          bx * layer +
          Math.sin(drift * shard.rate[0] + shard.drift[0]) * wobble;
        const hy =
          cy +
          ly0 * billow +
          ay0 * sway +
          ay * lane +
          by * layer +
          Math.sin(drift * shard.rate[1] + shard.drift[1]) * wobble;
        const hz =
          cz +
          lz0 * billow +
          az0 * sway +
          az * lane +
          bz * layer +
          Math.sin(drift * shard.rate[2] + shard.drift[2]) * wobble;

        let fx = 0;
        let fy = 0;
        let fz = 0;
        let tiltTarget = 0;
        const px = hx + shard.offset[0];
        const py = hy + shard.offset[1];
        const pz = hz + shard.offset[2];
        if (hover > 0.001) {
          const ex = px - cam.eye[0];
          const ey = py - cam.eye[1];
          const ez = pz - cam.eye[2];
          const along = ex * rx + ey * ry + ez * rz;
          const qx = ex - rx * along;
          const qy = ey - ry * along;
          const qz = ez - rz * along;
          const gap = Math.hypot(qx, qy, qz);
          const reach = (0.24 * depthScale) / s.scale;
          const falloff = Math.exp(-(gap * gap) / (reach * reach));
          if (falloff > 0.002 && gap > 1e-5) {
            const nx = qx / gap;
            const ny = qy / gap;
            const nz = qz / gap;
            const sideways = (nx * tx + ny * ty + nz * tz) * 0.7;
            const strength = hover * falloff * 9 * depthScale;
            fx += (nx - tx * sideways) * strength;
            fy += (ny - ty * sideways) * strength;
            fz += (nz - tz * sideways) * strength;
            tiltTarget += hover * falloff * 1.1 * (nx * ax0 + ny * ay0 + nz * az0);
          }
        }

        if (state.hold > 0.001 && shard.joined) {
          const slot = shard.slot;
          const orbit = slot[0] + state.clock * (0.8 / (0.12 + slot[1])) * slot[3];
          const radius = slot[1] / s.scale;
          const gx = state.gatherCenter[0] + Math.cos(orbit) * radius;
          const gy = state.gatherCenter[1] + Math.sin(orbit) * radius * 0.75;
          const gz = state.gatherCenter[2] + Math.sin(orbit) * radius * 0.45 + slot[2] * 0.3;
          shard.gather += (state.hold - shard.gather) * (1 - Math.exp(-dt / 0.3));
          const pull = shard.gather * 30;
          fx += (gx - px) * pull;
          fy += (gy - py) * pull;
          fz += (gz - pz) * pull;
          tiltTarget += shard.gather * 0.6 * Math.sin(orbit);
        } else {
          shard.gather += (0 - shard.gather) * (1 - Math.exp(-dt / 0.2));
        }

        if (rings.length) {
          screenOf(px, py, pz, flat);
          for (const ring of rings) {
            const radius = ring.startRadius + Math.max(0, ring.age - level * 0.07) * ring.speed;
            const dxr = flat[0] - ring.x;
            const dyr = flat[1] - ring.y;
            const distance = Math.hypot(dxr, dyr);
            const band = Math.exp(-((distance - radius) * (distance - radius)) / ring.width) * ring.strength * ring.gain;
            if (band > 0.01) {
              shard.flash = Math.max(shard.flash, Math.min(band * 1.35, 3.2));
              const outward = Math.max(distance, 0.05);
              const ux = (cam.right[0] * dxr + cam.up[0] * dyr) / outward;
              const uy = (cam.right[1] * dxr + cam.up[1] * dyr) / outward;
              const uz = (cam.right[2] * dxr + cam.up[2] * dyr) / outward;
              tiltTarget += band * 2.1 * (ux * ax0 + uy * ay0 + uz * az0);
              const push = (band * 4.4 * depthScale) / Math.max(distance, 0.05);
              fx += (cam.right[0] * dxr + cam.up[0] * dyr) * push;
              fy += (cam.right[1] * dxr + cam.up[1] * dyr) * push;
              fz += (cam.right[2] * dxr + cam.up[2] * dyr) * push;
            }
          }
        }

        const stiffness = 24 * (1 - shard.gather * 0.95);
        for (let step = 0; step < steps; step += 1) {
          shard.velocity[0] += (fx - stiffness * shard.offset[0] - 7.5 * shard.velocity[0]) * h;
          shard.velocity[1] += (fy - stiffness * shard.offset[1] - 7.5 * shard.velocity[1]) * h;
          shard.velocity[2] += (fz - stiffness * shard.offset[2] - 7.5 * shard.velocity[2]) * h;
          shard.offset[0] += shard.velocity[0] * h;
          shard.offset[1] += shard.velocity[1] * h;
          shard.offset[2] += shard.velocity[2] * h;
          shard.tiltVelocity += (90 * (tiltTarget - shard.tilt) - 15 * shard.tiltVelocity) * h;
          shard.tilt += shard.tiltVelocity * h;
        }
        shard.flash *= Math.exp(-dt / 0.45);

        const ox = hx + shard.offset[0];
        const oy = hy + shard.offset[1];
        const oz = hz + shard.offset[2];
        shard.position[0] = ox;
        shard.position[1] = oy;
        shard.position[2] = oz;

        let vx = cam.eye[0] - ox;
        let vy = cam.eye[1] - oy;
        let vz = cam.eye[2] - oz;
        const vl = Math.hypot(vx, vy, vz) || 1;
        vx /= vl;
        vy /= vl;
        vz /= vl;
        let dx = tx + shard.velocity[0] * 0.05;
        let dy = ty + shard.velocity[1] * 0.05;
        let dz = tz + shard.velocity[2] * 0.05;
        const facingPart = dx * vx + dy * vy + dz * vz;
        dx -= vx * facingPart;
        dy -= vy * facingPart;
        dz -= vz * facingPart;
        let dl = Math.hypot(dx, dy, dz);
        if (dl < 1e-4) {
          dx = cam.right[0];
          dy = cam.right[1];
          dz = cam.right[2];
          dl = 1;
        }
        dx /= dl;
        dy /= dl;
        dz /= dl;
        const wx = vy * dz - vz * dy;
        const wy = vz * dx - vx * dz;
        const wz = vx * dy - vy * dx;
        const yaw = shard.yaw + 0.05 * Math.sin(state.clock * shard.flutter[1] * 0.7 + shard.flutter[0]);
        const cyaw = Math.cos(yaw);
        const syaw = Math.sin(yaw);
        const kx = dx * cyaw + wx * syaw;
        const ky = dy * cyaw + wy * syaw;
        const kz = dz * cyaw + wz * syaw;
        const jx = wx * cyaw - dx * syaw;
        const jy = wy * cyaw - dy * syaw;
        const jz = wz * cyaw - dz * syaw;
        const wave =
          0.8 * twistWeight * Math.sin(angle) +
          0.3 * Math.sin(s0 * TAU * 1.6 - state.roll * 0.55 + level * 0.9 + shard.lane * 0.7);
        const flutter = 0.06 * Math.sin(state.clock * shard.flutter[1] + shard.flutter[0]);
        const bank = MAX_BANK * Math.tanh((wave + shard.bank + flutter + shard.tilt + introBank) / MAX_BANK);
        const cb = Math.cos(bank);
        const sb = Math.sin(bank);
        const mx = vx * cb + jx * sb;
        const my = vy * cb + jy * sb;
        const mz = vz * cb + jz * sb;
        const pitch = shard.pitch + 0.2 * Math.sin(s0 * TAU * 1.1 - state.roll * 0.4 + level * 2.1);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const axisX = kx * cp + mx * sp;
        const axisY = ky * cp + my * sp;
        const axisZ = kz * cp + mz * sp;
        const nx = mx * cp - kx * sp;
        const ny = my * cp - ky * sp;
        const nz = mz * cp - kz * sp;

        const ex = ox - cam.eye[0];
        const ey = oy - cam.eye[1];
        const ez = oz - cam.eye[2];
        const viewDepth = ex * cam.forward[0] + ey * cam.forward[1] + ez * cam.forward[2];
        depths[index] = viewDepth;
        const core = 1 - 0.45 * shard.lane * shard.lane;
        const size = 0.062 * s.shardSize * shard.size * GROWTH[level] * appear * Math.sqrt(taper) * core;
        const o = index * FLOATS;
        staging[o] = ox;
        staging[o + 1] = oy;
        staging[o + 2] = oz;
        staging[o + 3] = size > 1e-5 ? size : 0;
        staging[o + 4] = axisX;
        staging[o + 5] = axisY;
        staging[o + 6] = axisZ;
        staging[o + 7] = shard.thickness;
        staging[o + 8] = nx;
        staging[o + 9] = ny;
        staging[o + 10] = nz;
        staging[o + 11] = shard.tint;
        for (let k = 0; k < 10; k += 1) staging[o + 12 + k] = shard.shape[k];
        staging[o + 22] = shard.sides;
        staging[o + 23] = shard.flash;
      }

      let markerTotal = 0;
      for (let level = 0; level < LEVELS; level += 1) {
        markerCounts[level] = 0;
        markerStarts[level] = 0;
      }
      if (s.markers >= 0) {
        const ratio = output.size[1] / Math.max(container.clientHeight, 1);
        const pointerX = (state.pointer[0] - 0.5) * 2 * aspect;
        const pointerY = (0.5 - state.pointer[1]) * 2;
        const engaged = s.mouseInteraction && !reduced ? state.presence : 0;
        const previousTargets = state.targets;
        const nextTargets = new Map();
        const targetEase = 1 - Math.exp(-dt / 0.12);
        let nearestKey = '';
        let nearestGap = 72;
        for (let level = LEVELS - 1; level >= 0; level -= 1) {
          markerStarts[level] = markerTotal;
          const depth = DEPTHS[level];
          const depthScale = depth / CAMERA;
          const spacing = 0.42 * Math.pow(depthScale, 0.55);
          const halfW = ((aspect * depth) / (CAMERA * s.scale)) * 1.12 + spacing;
          const halfH = (depth / (CAMERA * s.scale)) * 1.12 + spacing;
          const drift = state.markerDrift;
          const phase = MARKER_PHASES[level];
          const i0 = Math.floor((drift - halfW) / spacing - phase[0]);
          const i1 = Math.ceil((drift + halfW) / spacing - phase[0]);
          const j0 = Math.floor(-halfH / spacing - phase[1]);
          const j1 = Math.ceil(halfH / spacing - phase[1]);
          const band = s.spread * (0.15 + 0.035 * depth) * 1.4;
          const position = paths[level].position;
          for (let i = i0; i <= i1; i += 1) {
            for (let j = j0; j <= j1; j += 1) {
              const keep = latticeHash(level, i, j, 11);
              if (keep > 0.5) continue;
              const x = (i + phase[0]) * spacing - drift;
              const y = (j + phase[1]) * spacing;
              const z = CAMERA - depth;
              const markerDepth = screenOf(x, y, z, flat);
              if (Math.abs(flat[0]) > aspect * 1.05 || Math.abs(flat[1]) > 1.05) continue;
              let best = Infinity;
              for (let k = 0; k < SAMPLES; k += 2) {
                const dx = x - position[k * 3];
                const dy = y - position[k * 3 + 1];
                const dz = z - position[k * 3 + 2];
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < best) best = d2;
              }
              const near = Math.exp(-best / (band * band));
              const blinkSeed = latticeHash(level, i, j, 23);
              const blinkRate = latticeHash(level, i, j, 37);
              const blink =
                blinkSeed < 0.07 ? 0.5 + 0.5 * Math.sin(state.clock * (1.4 + blinkRate * 2.2) + blinkRate * 40) : 0;
              const pointerGap = (Math.hypot(flat[0] - pointerX, flat[1] - pointerY) * halfHeight) / ratio;
              const key = `${level}:${i}:${j}`;
              if (level <= 2 && engaged > 0.01 && pointerGap < nearestGap) {
                nearestGap = pointerGap;
                nearestKey = key;
              }
              const wanted = key === state.markerTarget ? engaged * (1 - smoother((pointerGap - 30) / 42)) : 0;
              const before = previousTargets.get(key) ?? 0;
              const target = before + (wanted - before) * targetEase;
              if (target > 0.002) nextTargets.set(key, target);
              const bracket = Math.max(smoother((blink - 0.55) / 0.4), target);
              let ring = 0;
              if (rings.length) ring = ringBand(flat[0], flat[1], level);
              let reveal = 1;
              if (introOn) {
                const across = clamp((flat[0] / aspect + 1) * 0.5, 0, 1);
                const begin = level * 0.22 + 0.35 + across * (INTRO_SECONDS - 1.3 - (LEVELS - 1) * 0.22);
                reveal = smoother((introAge - begin) / 0.5);
              }
              const fade = FADE[level] * (1 - smoother((markerDepth - 3) / 10) * 0.45) * reveal;
              if (fade < 0.002) continue;
              if (markerTotal >= markerCapacity) ensureMarkers(markerCapacity * 2);
              const o = markerTotal * MARKER_FLOATS;
              markerData[o] = x;
              markerData[o + 1] = y;
              markerData[o + 2] = z;
              markerData[o + 3] = fade;
              markerData[o + 4] = 0.42 + 0.5 * near + blink * 0.9 + target * 1.3 + ring * 3.4;
              markerData[o + 5] = bracket;
              markerData[o + 6] = 1 + 0.15 * near + 0.3 * blink + 0.2 * target + Math.min(ring * 0.85, 2.2);
              markerData[o + 7] = 0;
              markerTotal += 1;
              markerCounts[level] += 1;
            }
          }
        }
        state.targets = nextTargets;
        state.markerTarget = nearestKey;
      }
      state.markerTotal = markerTotal;
    };

    const render = (s, dt, reduced) => {
      updateCamera(s);
      const shards = state.shards;
      ensureCapacity(shards.length);
      simulate(s, dt, reduced);
      if (state.order.length !== shards.length) state.order = shards.map((_, index) => index);
      const order = state.order;
      for (let i = 0; i < shards.length; i += 1) depths[i] += shards[i].level * 100;
      for (let i = 1; i < order.length; i += 1) {
        const value = order[i];
        const key = depths[value];
        let j = i - 1;
        while (j >= 0 && depths[order[j]] < key) {
          order[j + 1] = order[j];
          j -= 1;
        }
        order[j + 1] = value;
      }
      const counts = [0, 0, 0, 0, 0];
      for (let slot = 0; slot < order.length; slot += 1) {
        const from = order[slot] * FLOATS;
        const to = slot * FLOATS;
        counts[shards[order[slot]].level] += 1;
        for (let k = 0; k < FLOATS; k += 1) upload[to + k] = staging[from + k];
      }
      shardBuffer?.write(upload.subarray(0, shards.length * FLOATS));
      if (state.markerTotal > 0) markerBuffer?.write(markerData.subarray(0, state.markerTotal * MARKER_FLOATS));
      const starts = [0, 0, 0, 0, 0];
      let running = 0;
      for (let level = LEVELS - 1; level >= 0; level -= 1) {
        starts[level] = running;
        running += counts[level];
      }

      frameParams.set({
        view: [output.size[0], output.size[1], cam.focal, state.clock],
        eye: [cam.eye[0], cam.eye[1], cam.eye[2], FOCUS],
        forward: [cam.forward[0], cam.forward[1], cam.forward[2], s.depthOfField * output.size[1] * 0.03],
        right: [cam.right[0], cam.right[1], cam.right[2], output.size[1] * 0.05],
        up: [cam.up[0], cam.up[1], cam.up[2], s.lightMode ? 1 : 0],
        shard: [...(laserTint()?.shard ?? s.shard), 0],
        accent: [...(laserTint()?.accent ?? s.accent), 0],
        surface: s.material,
        marker: [
          s.markers,
          output.size[1] / Math.max(container.clientHeight, 1),
          4 * (output.size[1] / Math.max(container.clientHeight, 1)),
          FOCUS
        ]
      });
      passes.forEach(({ downParams, horizontalParams, verticalParams, source, level }) => {
        downParams.set({ texel: [0.5 / source.size[0], 0.5 / source.size[1], 0.75, 0.5] });
        horizontalParams.set({ texel: [1 / level.main.size[0], 0, 0, 0] });
        verticalParams.set({ texel: [0, 1 / level.main.size[1], 0, 0] });
      });
      const paper = s.paper ?? [0, 0, 0];
      const blooming = s.glow > 0.001 && !s.lightMode;
      finishParams.set({
        info: [s.grain, Math.floor(state.clock * 24), blooming ? s.glow : 0, 1.3],
        paper: [paper[0], paper[1], paper[2], s.paper ? 1 : 0],
        mode: [s.lightMode ? 1 : 0, s.vignette, 0, 0]
      });

      const coc = s.depthOfField * output.size[1] * 0.012;
      const cap = output.size[1] * 0.02;
      const plan = DEPTHS.map((depth, level) => {
        const sigma = Math.min(coc * Math.abs(1 - SHARD_FOCUS / depth), cap);
        const groupIndex = sigma >= 2.2 ? 1 : 0;
        const group = groups[groupIndex];
        const soft = sigma >= 0.45;
        if (soft && !group.softReady) {
          group.softReady = true;
          group.temp.resize(groupSize(group.scale));
          group.blurred.resize(groupSize(group.scale));
        }
        const size = group.layer.size;
        params[groupIndex].set({
          view: [size[0], size[1], cam.focal * (size[0] / output.size[0]), 0],
          look: [s.lightMode ? 0.5 : 0.7, 0, 0, 0]
        });
        const local = sigma * group.scale;
        spreadX[level].set({ texel: [1 / size[0], 0, local, 0] });
        spreadY[level].set({ texel: [0, 1 / size[1], local, 0] });
        mixParams[level].set({ info: [FADE[level], 0, 0, 0] });
        const step = Math.max(0.6, 1.4 * (size[0] / Math.max(container.clientWidth, 1)));
        const shadowStrength = s.material === MATERIALS.glass ? 0 : s.lightMode ? 0.32 : 0.62;
        shades[groupIndex].set({ info: [step * 0.55, step * 0.85, shadowStrength, 0], more: [0.00045, 0, 0, 0] });
        return { group, groupIndex, soft };
      });

      vgpu.frame(instance, current => {
        for (let level = LEVELS - 1; level >= 0; level -= 1) {
          const { group, groupIndex, soft } = plan[level];
          const steps = layerPasses[level][groupIndex];
          if (counts[level] > 0) {
            current.pass({ target: group.layer, clear: [0, 0, 0, 0], clearDepth: 1 }, pass => {
              pass.draw(solids[groupIndex], { instances: counts[level], firstInstance: starts[level] });
              pass.draw(edges[groupIndex], { instances: counts[level], firstInstance: starts[level] });
            });
            current.pass({ target: group.shaded, clear: [0, 0, 0, 0] }, pass => pass.draw(shadows[groupIndex]));
            if (soft) {
              current.pass({ target: group.temp, clear: [0, 0, 0, 0] }, pass => pass.draw(steps.blurX));
              current.pass({ target: group.blurred, clear: [0, 0, 0, 0] }, pass => pass.draw(steps.blurY));
            }
          }
          current.pass({ target: scene, clear: level === LEVELS - 1 ? [0, 0, 0, 0] : false }, pass => {
            if (markerCounts[level] > 0) {
              pass.draw(markerDraw, { instances: markerCounts[level], firstInstance: markerStarts[level] });
            }
            if (counts[level] > 0) pass.draw(soft ? steps.soft : steps.sharp);
          });
        }
        passes.forEach((pass, index) => {
          const level = levels[index];
          if (!blooming) {
            current.pass({ target: level.main, clear: [0, 0, 0, 0] }, () => {});
            return;
          }
          current.pass({ target: level.main, clear: [0, 0, 0, 0] }, p => p.draw(pass.down));
          current.pass({ target: level.spare, clear: [0, 0, 0, 0] }, p => p.draw(pass.horizontal));
          current.pass({ target: level.main, clear: [0, 0, 0, 0] }, p => p.draw(pass.vertical));
        });
        current.pass({ target: output, clear: [0, 0, 0, 0] }, pass => pass.draw(finish));
      });

      renderedOnce = true;
      container.dataset.aeroRenderer = 'webgpu';
      container.classList.add('is-enhanced');
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      state.last = 0;
    };

    const wake = () => {
      if (disposed || raf || !state.visible || document.hidden || state.printing) return;
      raf = requestAnimationFrame(tick);
    };

    const tick = now => {
      raf = 0;
      if (disposed || !state.visible || document.hidden || state.printing) {
        state.last = 0;
        return;
      }
      const s = currentSettings;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0;
      state.last = now;
      const reduced = prefersReduced();
      state.clock += dt;
      if (state.introAt < 0) state.introAt = state.clock;
      if (state.shards.length !== s.count) {
        state.shards = createShards(s.count, seed);
        state.order = [];
      }
      const moving = !s.paused && !reduced;
      if (moving) {
        for (let level = 0; level < LEVELS; level += 1) {
          state.travel[level] = (state.travel[level] + (dt * s.speed * 0.09) / paths[level].length) % 1;
        }
        state.roll += dt * s.speed * 1.0;
        state.twist += dt * s.speed * 0.08;
        state.drift += dt * s.speed;
      }

      const goal = PLACEMENTS.map((_, index) => (index === s.placement ? 1 : 0));
      let settling = false;
      if (reduced) {
        for (let index = 0; index < 4; index += 1) {
          if (Math.abs(state.weights[index] - goal[index]) > 0.0005) settling = true;
        }
        state.weights = goal;
        state.weightVelocity = [0, 0, 0, 0];
      } else {
        const decay = Math.exp(-4 * dt);
        for (let index = 0; index < 4; index += 1) {
          const offset = state.weights[index] - goal[index];
          const momentum = state.weightVelocity[index] + 4 * offset;
          state.weights[index] = goal[index] + (offset + momentum * dt) * decay;
          state.weightVelocity[index] = (state.weightVelocity[index] - 4 * momentum * dt) * decay;
          if (Math.abs(state.weights[index] - goal[index]) > 0.0005) settling = true;
        }
        if (!settling) {
          state.weights = goal;
          state.weightVelocity = [0, 0, 0, 0];
        }
      }

      const engaged = s.mouseInteraction && state.inside && !reduced;
      state.presence += ((engaged ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / 0.25));
      const lean = engaged ? s.parallax : 0;
      const targetYaw = (state.pointer[0] - 0.5) * lean * 0.14;
      const targetPitch = (state.pointer[1] - 0.5) * lean * 0.08;
      state.yawVelocity += (38 * (targetYaw - state.yaw) - 11 * state.yawVelocity) * dt;
      state.pitchVelocity += (38 * (targetPitch - state.pitch) - 11 * state.pitchVelocity) * dt;
      state.yaw += state.yawVelocity * dt;
      state.pitch += state.pitchVelocity * dt;
      const leaning =
        Math.abs(targetYaw - state.yaw) + Math.abs(targetPitch - state.pitch) > 1e-4 ||
        Math.abs(state.yawVelocity) + Math.abs(state.pitchVelocity) > 1e-4;

      if (
        state.pressAt >= 0 &&
        state.pressPoint &&
        s.holdToGather &&
        !reduced &&
        state.clock - state.pressAt > 0.18
      ) {
        if (!state.holding) {
          state.holding = true;
          updateCamera(s);
          rayAt(state.pressPoint[0], state.pressPoint[1]);
          const travelTo =
            FOCUS / Math.max(ray[0] * cam.forward[0] + ray[1] * cam.forward[1] + ray[2] * cam.forward[2], 0.2);
          state.gatherCenter = [
            cam.eye[0] + ray[0] * travelTo,
            cam.eye[1] + ray[1] * travelTo,
            cam.eye[2] + ray[2] * travelTo
          ];
          state.reach = 0;
        }
        state.hold = Math.min(1, state.hold + dt / 0.5);
        state.reach = Math.min(state.reach + dt * 0.5, 0.55);
        const reach = (0.22 + state.reach) / s.scale;
        for (const shard of state.shards) {
          if (shard.joined || shard.level > 2) continue;
          const gx = shard.position[0] - state.gatherCenter[0];
          const gy = shard.position[1] - state.gatherCenter[1];
          if (gx * gx + gy * gy < reach * reach) shard.joined = true;
        }
      } else if (state.hold > 0) {
        state.hold = Math.max(0, state.hold - dt / 0.3);
        if (state.hold === 0) {
          for (const shard of state.shards) shard.joined = false;
        }
      }

      for (const ring of state.rings) ring.age += dt;
      state.rings = state.rings.filter(ring => ring.age < (ring.duration || RING_SECONDS));
      if (moving) state.markerDrift += dt * s.speed * 0.045;

      const flashing = state.shards.some(
        shard => shard.flash > 0.01 || Math.abs(shard.tiltVelocity) > 0.01 || Math.abs(shard.tilt) > 0.01
      );
      const transient =
        settling ||
        leaning ||
        flashing ||
        state.presence > 0.002 ||
        state.rings.length > 0 ||
        state.hold > 0 ||
        (s.intro && !reduced && state.clock - state.introAt < INTRO_SECONDS + 0.5);
      if (state.seen !== s || transient || moving) state.quiet = 0;
      else state.quiet += 1;
      state.seen = s;
      if (state.quiet <= 30) {
        resize();
        render(s, dt, reduced);
      }
      if (state.quiet <= 30 && state.visible && !document.hidden && !state.printing) {
        raf = requestAnimationFrame(tick);
      }
    };

    const local = event => {
      const rect = container.getBoundingClientRect();
      return {
        point: [
          (event.clientX - rect.left) / Math.max(rect.width, 1),
          (event.clientY - rect.top) / Math.max(rect.height, 1)
        ],
        inside:
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
      };
    };

    const onMove = event => {
      const hit = local(event);
      state.inside = hit.inside;
      if (hit.inside) {
        state.pointer = hit.point;
        if (state.visible) {
          state.quiet = 0;
          wake();
        }
      }
    };

    const onLeave = () => {
      state.inside = false;
    };

    const onDown = event => {
      const s = currentSettings;
      if (event.button !== 0 || prefersReduced() || !s.mouseInteraction) return;
      if (
        event.target instanceof Element &&
        event.target.closest('a, button, input, textarea, select, label, [role="button"], [data-carousel-viewport], [data-carousel-controls], [data-option-wheel]')
      ) {
        return;
      }
      const hit = local(event);
      if (!hit.inside) return;
      state.pointer = hit.point;
      state.pressAt = state.clock;
      state.pressPoint = hit.point;
      state.quiet = 0;
      wake();
    };

    const onUp = () => {
      const s = currentSettings;
      if (state.pressAt < 0) return;
      if (!state.holding && s.pulseOnClick && state.pressPoint) {
        const aspect = output.size[0] / Math.max(output.size[1], 1);
        state.rings.push({
          x: (state.pressPoint[0] * 2 - 1) * aspect,
          y: 1 - state.pressPoint[1] * 2,
          age: 0
        });
        if (state.rings.length > MAX_RINGS) state.rings.shift();
      }
      if (state.holding) {
        for (const shard of state.shards) {
          if (shard.joined) shard.tiltVelocity += 9 * shard.sign;
        }
      }
      state.pressAt = -1;
      state.holding = false;
      state.quiet = 0;
      wake();
    };

    const onResize = () => {
      resize();
      state.quiet = 0;
      wake();
    };

    const onThemeChange = () => {
      currentSettings = makeSettings(preset);
      state.quiet = 0;
      wake();
    };

    const onConfigChange = () => {
      const nextPlacement = container.dataset.aeroPlacement;
      if (nextPlacement && PLACEMENTS.includes(nextPlacement)) {
        preset.placement = nextPlacement;
      }
      currentSettings = makeSettings(preset);
      state.quiet = 0;
      wake();
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else {
        state.quiet = 0;
        wake();
      }
    };

    const onMotionChange = () => {
      state.quiet = 0;
      wake();
    };

    const onBeforePrint = () => {
      state.printing = true;
      stop();
    };

    const onAfterPrint = () => {
      state.printing = false;
      state.quiet = 0;
      wake();
    };

    const onPageHide = () => stop();
    const onPageShow = () => {
      state.quiet = 0;
      wake();
    };

    const sizes = new ResizeObserver(onResize);
    sizes.observe(container);
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const configObserver = new MutationObserver(onConfigChange);
    configObserver.observe(container, { attributes: true, attributeFilter: ['data-aero-placement'] });

    const onSectionReplay = () => {
      if (prefersReduced()) return;
      state.introAt = state.clock;
      state.rings = [];
      state.quiet = 0;
      wake();
    };
    const emitPulseAtClient = (clientX, clientY, opts = {}) => {
      if (disposed || prefersReduced()) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const aspect = rect.width / Math.max(rect.height, 1);
      const x = (((clientX - rect.left) / rect.width) * 2 - 1) * aspect;
      const y = 1 - ((clientY - rect.top) / rect.height) * 2;
      const startRadius = Math.max(0, Number(opts.startRadiusPx) || 0) / Math.max(rect.height * 0.5, 1);
      state.rings.push({
        x,
        y,
        age: 0,
        startRadius,
        speed: opts.speed ?? 1.9,
        width: opts.width ?? 0.026,
        gain: opts.gain ?? 1.35,
        duration: opts.duration ?? 2.8
      });
      if (state.rings.length > MAX_RINGS) state.rings.shift();
      state.quiet = 0;
      wake();
    };

    const onExternalPulse = event => {
      const detail = event.detail;
      if (detail && Number.isFinite(detail.clientX) && Number.isFinite(detail.clientY)) {
        emitPulseAtClient(detail.clientX, detail.clientY, detail);
      }
    };
    container.addEventListener('aero:pulse', onExternalPulse);
    container._aeroShards = { pulseAtClient: emitPulseAtClient };

    const host = container.closest('section') || container;
    host.addEventListener('section:prepare', onSectionReplay);
    host.addEventListener('section:enter', onSectionReplay);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.addEventListener?.('change', onMotionChange);
    coarsePointer.addEventListener?.('change', onThemeChange);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    cleanups.push(() => {
      container.removeEventListener('aero:pulse', onExternalPulse);
      if (container._aeroShards?.pulseAtClient === emitPulseAtClient) {
        delete container._aeroShards;
      }
      host.removeEventListener('section:prepare', onSectionReplay);
      host.removeEventListener('section:enter', onSectionReplay);
      sizes.disconnect();
      themeObserver.disconnect();
      configObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener?.('change', onMotionChange);
      coarsePointer.removeEventListener?.('change', onThemeChange);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    });

    if ('IntersectionObserver' in window) {
      const visibility = new IntersectionObserver(entries => {
        state.visible = entries.some(entry => entry.isIntersecting);
        if (state.visible) {
          state.quiet = 0;
          wake();
        } else {
          stop();
        }
      });
      visibility.observe(container);
      cleanups.push(() => visibility.disconnect());
    }

    wake();
    };

    start().catch(fail);
  }

  if ('IntersectionObserver' in window) {
    const lazyMount = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const container = entry.target;
          lazyMount.unobserve(container);
          const index = containers.indexOf(container);
          mountContainer(container, index < 0 ? 0 : index);
        });
      },
      { rootMargin: '260px 0px' }
    );
    containers.forEach(container => lazyMount.observe(container));
  } else {
    containers.forEach((container, index) => mountContainer(container, index));
  }
})();
