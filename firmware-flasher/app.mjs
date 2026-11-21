import { PROFILES, hex, parseAddress, parseFirmware, validateImage, makePlan } from './core.mjs?v=20261117-f407map';
import { BoardConnection } from './connection.mjs?v=20261117-f407map';

const $ = id => document.getElementById(id);
const state = { device: null, image: null, file: null, release: null, busy: false, controller: null, systems: [], system: 'local', logs: [] };
const bytes = n => `${n.toLocaleString('vi-VN')} byte`;
const controls = () => document.querySelectorAll('#workspace button:not(#cancel):not(#save-log), #workspace input, #workspace select, #workspace label[for=file]');
const connection = new BoardConnection({ serial: navigator.serial, usb: navigator.usb });

function log(message) {
  state.logs.push(`[${new Date().toLocaleTimeString('vi-VN', { hour12: false })}] ${message}`);
  if (state.logs.length > 500) state.logs.shift();
  $('log').textContent = state.logs.join('\n'); $('log').scrollTop = $('log').scrollHeight;
}
function status(message, kind = '') { $('status').textContent = message; $('status').className = kind; }
function progress(value, message) { $('progress').value = value; $('percent').textContent = `${Math.floor(value)}%`; status(message); }
function errorText(error) {
  if (error.name === 'NotFoundError') return connection.phase === 'dfu'
    ? 'Chưa chọn STM32 BOOTLOADER. Bấm Tiếp tục kết nối để chọn lại. Nếu không thấy mạch, mở phần Trợ giúp.'
    : 'Chưa chọn cổng COM của mạch. Bấm Kết nối mạch để thử lại.';
  if (error.name === 'SecurityError' || error.name === 'NotAllowedError') return 'Trình duyệt chưa được quyền USB. Mở trang qua HTTPS, cấp quyền cho thiết bị và kiểm tra driver WinUSB.';
  if (error.name === 'NetworkError') return 'Mất kết nối USB hoặc thiết bị đang bị ứng dụng khác sử dụng. Kiểm tra cáp, chế độ DFU và driver WinUSB.';
  return error.message || 'Không thể hoàn tất thao tác.';
}
function supported() { return window.isSecureContext && Boolean(navigator.usb); }
function serialSupported() { return window.isSecureContext && Boolean(navigator.serial); }
function lock(value) {
  state.busy = value;
  controls().forEach(el => { if ('disabled' in el) el.disabled = value; });
  $('dropzone').setAttribute('aria-disabled', String(value));
  update();
}
function imagePlan() {
  const profile = PROFILES[$('profile').value];
  if (state.release && state.release.profile !== $('profile').value) throw new Error('Chip đã chọn khác chip của bản firmware có sẵn. Hãy chọn lại bản phù hợp.');
  if (!state.image) return null;
  if (!state.release && /\.bin$/i.test(state.file?.name || '')) state.image[0].address = parseAddress($('address').value);
  const info = validateImage(state.image, profile);
  return state.device ? makePlan(state.image, profile, state.device.sectors) : info;
}
function update() {
  $('connection-state').textContent = state.device ? 'Đã kết nối DFU' : 'Chưa kết nối';
  $('connect').hidden = Boolean(state.device); $('connect').disabled = state.busy || !supported();
  $('connect').textContent = connection.phase === 'dfu' ? 'Tiếp tục kết nối' : 'Kết nối mạch';
  $('disconnect').hidden = !state.device; $('disconnect').disabled = state.busy;
  if (state.device) $('device-detail').textContent = `Sẵn sàng nạp · giới hạn ${PROFILES[$('profile').value].flash / 1024} KB theo chip đã chọn.`;
  $('serial-ending').disabled = state.busy || Boolean(state.device) || !serialSupported();
  $('connection-mode').disabled = state.busy || Boolean(state.device);
  $('address').disabled = state.busy || /\.hex$/i.test(state.file?.name || '') || Boolean(state.release);
  $('cancel').hidden = !state.controller; $('cancel').disabled = Boolean(state.controller?.signal.aborted);
  $('flash').disabled = true;
  if (!state.image) { $('plan').textContent = 'Chọn firmware và kết nối mạch để xem vùng flash sẽ được cập nhật.'; return; }
  try {
    const plan = imagePlan();
    $('file-size').textContent = `${bytes(plan.total)} · ${hex(plan.start)} → ${hex(plan.end - 1)}`;
    $('plan').textContent = plan.sectors
      ? `Sẽ ghi ${bytes(plan.total)}, xóa ${plan.sectors.length} sector (${bytes(plan.erasedBytes)}). Mọi dữ liệu cũ trong các sector này, kể cả ngoài vùng file, sẽ bị xóa.`
      : 'File phù hợp giới hạn chip đã chọn. Kết nối mạch để kiểm tra sơ đồ flash trước khi nạp.';
    $('flash').disabled = state.busy || !state.device || !$('acknowledge').checked;
  } catch (error) { $('plan').textContent = errorText(error); }
}
function clearFile() {
  state.image = null; state.file = null; state.release = null; $('file').value = '';
  $('file-info').hidden = true; $('acknowledge').checked = false;
  progress(0, 'Chưa có phiên nạp'); update();
}
async function prepareFile(file, release = null) {
  if (state.busy) return;
  clearFile(); lock(true); status('Đang kiểm tra firmware…');
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('File lớn hơn 2 MB. Chỉ chọn firmware BIN/HEX cho STM32 F401/F407/F411.');
    const buffer = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), n => n.toString(16).padStart(2, '0')).join('');
    if (release && hash !== release.sha256.toLowerCase()) throw new Error('SHA-256 không khớp bản phát hành. File này sẽ không được nạp.');
    const image = parseFirmware(file.name, buffer, /\.hex$/i.test(file.name) ? 0x08000000 : parseAddress($('address').value));
    validateImage(image, PROFILES[$('profile').value]);
    state.file = file; state.image = image; state.release = release;
    $('file-name').textContent = file.name; $('file-hash').textContent = hash; $('file-info').hidden = false;
    log(`Đã chọn ${file.name} (${bytes(buffer.byteLength)}). Chưa ghi lên mạch.`); status('Đã kiểm tra file. Chưa nạp.');
  } catch (error) { clearFile(); const message = errorText(error); status(message, 'error'); log(message); }
  finally { lock(false); }
}
function element(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
}
function validRelease(release) {
  if (!release || !release.id || !release.name || !release.version || !PROFILES[release.profile] || !/^[\da-f]{64}$/i.test(release.sha256 || '')) return false;
  try {
    const url = new URL(release.file, location.href), root = new URL('./firmware/', location.href);
    return url.origin === root.origin && url.pathname.startsWith(root.pathname) && /\.(bin|hex)$/i.test(url.pathname) && parseAddress(release.address) >= 0x08000000;
  } catch { return false; }
}
async function selectRelease(release) {
  if (state.busy) return;
  clearFile(); lock(true); status('Đang lấy firmware có sẵn…');
  let file;
  try {
    const response = await fetch(new URL(release.file, location.href), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Không lấy được firmware (HTTP ${response.status}).`);
    // Limit response bytes while streaming, even when Content-Length is absent.
    if (Number(response.headers.get('content-length')) > 2 * 1024 * 1024) throw new Error('Firmware có sẵn vượt giới hạn 2 MB.');
    const reader = response.body.getReader(), chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Firmware có sẵn vượt giới hạn 2 MB.'); }
      chunks.push(value);
    }
    file = new File(chunks, decodeURIComponent(new URL(release.file, location.href).pathname.split('/').at(-1)));
    $('profile').value = release.profile; $('address').value = hex(parseAddress(release.address));
  } catch (error) { const message = errorText(error); status(message, 'error'); log(message); }
  finally { lock(false); }
  if (file) await prepareFile(file, release);
}
function renderSystem(id) {
  const system = state.systems.find(s => s.id === id); if (!system || state.busy) return;
  state.system = id; clearFile();
  $('systems').value = id;
  $('system-description').textContent = system.description;
  $('system-description').hidden = id === 'local';
  $('releases').replaceChildren();
  if (!system.releases.length && id !== 'local') {
    $('releases').append(element('p', 'fw-help', 'Chưa có firmware có sẵn. Bạn có thể chọn file từ máy để nạp.'));
  }
  for (const release of system.releases) {
    const card = element('article', 'release'), text = element('div'), button = element('button', 'btn', 'Chọn bản này');
    button.type = 'button'; button.addEventListener('click', () => selectRelease(release));
    text.append(element('strong', '', `${release.name} · ${release.version}`), element('p', '', release.notes || 'Firmware có sẵn cho hệ thống này.'), element('small', '', PROFILES[release.profile].name));
    card.append(text, button); $('releases').append(card);
  }
}
async function loadCatalog() {
  try {
    const response = await fetch('./catalog.json', { cache: 'no-cache', signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.systems) || !catalog.systems.length) throw new Error('Sai cấu trúc danh mục.');
    const ids = new Set();
    state.systems = catalog.systems.map(system => {
      if (!system.id || ids.has(system.id) || typeof system.name !== 'string' || typeof system.description !== 'string' || !Array.isArray(system.releases) || !system.releases.every(validRelease)) throw new Error('Mục hệ thống hoặc firmware có sẵn không hợp lệ.');
      ids.add(system.id); return system;
    });
    $('systems').replaceChildren();
    for (const system of state.systems) {
      const option = element('option', '', system.name); option.value = system.id; $('systems').append(option);
    }
    renderSystem(state.systems[0].id);
    const selected = new URLSearchParams(location.search).get('system'); if (selected) renderSystem(selected);
  } catch (error) {
    log(`Không tải được danh mục hệ thống: ${error.message}. Vẫn có thể nạp file từ máy.`);
    $('system-description').textContent = 'Không tải được danh mục. Bạn vẫn có thể chọn file từ máy tính để nạp.';
  }
}

$('systems').addEventListener('change', event => renderSystem(event.target.value));
$('file').addEventListener('change', event => { if (event.target.files[0]) prepareFile(event.target.files[0]); });
for (const name of ['dragenter', 'dragover']) $('dropzone').addEventListener(name, event => { event.preventDefault(); if (!state.busy) $('dropzone').classList.add('drag'); });
for (const name of ['dragleave', 'drop']) $('dropzone').addEventListener(name, event => { event.preventDefault(); $('dropzone').classList.remove('drag'); });
$('dropzone').addEventListener('drop', event => {
  if (state.busy) return;
  if (event.dataTransfer.files.length !== 1) { status('Hãy chọn đúng một file firmware.', 'error'); return; }
  prepareFile(event.dataTransfer.files[0]);
});
$('profile').addEventListener('change', () => { $('acknowledge').checked = false; update(); });
$('address').addEventListener('input', () => {
  $('acknowledge').checked = false;
  if (state.file && !state.release && /\.bin$/i.test(state.file.name)) {
    try { state.image[0].address = parseAddress($('address').value); } catch { $('flash').disabled = true; $('plan').textContent = 'Địa chỉ nạp chưa hợp lệ.'; return; }
  }
  update();
});
$('acknowledge').addEventListener('change', update);
$('connection-mode').addEventListener('change', () => { connection.reset(); update(); });
$('serial-ending').addEventListener('change', () => { connection.reset(); update(); });
$('connect').addEventListener('click', async () => {
  if (state.busy || !supported()) return;
  lock(true); $('acknowledge').checked = false;
  const alreadyDfu = $('connection-mode').value === 'dfu';
  status(connection.phase === 'dfu' || alreadyDfu ? 'Chọn STM32 BOOTLOADER…' : 'Chọn cổng COM của mạch…');
  try {
    const result = await connection.connect({ ending: $('serial-ending').value, alreadyDfu });
    if (result.phase === 'dfu') {
      log(`Đã gửi dfu qua Virtual COM (${result.serial.bytesSent} byte). Chờ kết nối lại thiết bị.`);
      if (result.serial.closeError) log('COM đã ngắt hoặc đóng khi chuyển chế độ.');
      status('Bấm Tiếp tục kết nối và chọn STM32 BOOTLOADER.');
      return;
    }
    const dfu = result.dfu, device = dfu.device; state.device = dfu; dfu.onLog = log;
    const capacity = dfu.sectors.reduce((n, s) => n + s.size, 0);
    document.querySelector('.device-copy strong').textContent = device.productName || 'STM32 BOOTLOADER';
    log(`Đã kết nối STM32 DFU (0483:DF11), descriptor ${capacity / 1024} KB; giới hạn ghi theo chip ${PROFILES[$('profile').value].flash / 1024} KB. Chưa ghi dữ liệu.`);
    log(`Sơ đồ DFU: ${dfu.memoryName}`); status('Đã kết nối. Chưa nạp.');
  } catch (error) { const message = errorText(error); status(message, 'error'); log(message); }
  finally { lock(false); }
});
function disconnected() {
  state.device = null; connection.reset(); $('acknowledge').checked = false;
  document.querySelector('.device-copy strong').textContent = 'Chưa kết nối mạch';
  document.querySelector('.device-copy p').textContent = 'Cắm cáp USB rồi bấm Kết nối mạch.'; update();
}
$('disconnect').addEventListener('click', async () => {
  if (state.busy) return;
  const dfu = state.device; lock(true);
  try { if (dfu) await dfu.disconnect(); log('Đã ngắt kết nối USB.'); }
  catch (error) { log(errorText(error)); }
  finally { disconnected(); lock(false); }
});
navigator.usb?.addEventListener('disconnect', event => {
  if (state.device?.device === event.device) {
    disconnected(); log('Thiết bị USB đã ngắt kết nối.');
    if (!state.busy) status('Mạch đã ngắt kết nối USB.');
  }
});
$('flash').addEventListener('click', async () => {
  if (state.busy || $('flash').disabled) return;
  const dfu = state.device, image = state.image, profile = PROFILES[$('profile').value];
  state.controller = new AbortController(); lock(true); progress(0, 'Đang kiểm tra mạch trước khi nạp');
  log(`Bắt đầu nạp ${state.file.name} · ${profile.name}.`);
  window.addEventListener('beforeunload', preventExit);
  try {
    const result = await dfu.flash(image, profile, { signal: state.controller.signal, onProgress: progress, reboot: $('reboot').checked });
    progress(100, 'Nạp và đối chiếu thành công.'); $('status').className = 'success';
    if (result.rebootError) log(`Dữ liệu đã khớp; chưa xác nhận được yêu cầu chạy: ${result.rebootError}. Nhấn NRST sau khi thả BOOT0.`);
    else if (result.rebootRequested) log('Đã gửi yêu cầu rời DFU. Hãy kiểm tra hoạt động của hệ thống trên mạch.');
    else log('Mạch đang ở DFU. Thả BOOT0 và nhấn NRST khi muốn chạy chương trình.');
  } catch (error) {
    const message = error.name === 'AbortError' ? 'Đã dừng nạp. Chương trình có thể chưa đầy đủ; hãy nạp lại trước khi sử dụng.' : `Nạp chưa hoàn tất: ${errorText(error)}`;
    status(message, 'error'); log(message);
    await dfu.disconnect().catch(() => {}); disconnected();
  } finally {
    state.controller = null; $('acknowledge').checked = false; lock(false); window.removeEventListener('beforeunload', preventExit);
  }
});
function preventExit(event) { event.preventDefault(); event.returnValue = ''; }
$('cancel').addEventListener('click', () => { state.controller?.abort(); $('cancel').disabled = true; log('Đã yêu cầu dừng. Chờ thao tác USB hiện tại kết thúc.'); });
$('save-log').addEventListener('click', () => {
  const blob = new Blob([['Shark Firmware — Nhật ký phiên nạp', ...state.logs].join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob), anchor = element('a'); anchor.href = url; anchor.download = `shark-firmware-${new Date().toISOString().slice(0, 10)}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
if (!supported()) {
  $('compatibility').hidden = false;
  $('compatibility').textContent = !window.isSecureContext ? 'Cần mở qua HTTPS hoặc localhost để sử dụng USB.' : 'Trình duyệt này chưa hỗ trợ WebUSB. Hãy dùng Chrome hoặc Edge trên máy tính để nạp.';
}
const requestedProfile = new URLSearchParams(location.search).get('profile');
if (Object.hasOwn(PROFILES, requestedProfile)) {
  $('profile').value = requestedProfile;
}
update(); loadCatalog();
connection.hasGrantedDfu().then(found => {
  if (found && !state.busy && !state.device) {
    $('connection-mode').value = 'dfu';
    update(); status('Mạch đang ở chế độ nạp. Bấm Kết nối mạch.');
  }
}).catch(() => {});
