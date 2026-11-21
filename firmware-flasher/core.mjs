// STM32 DfuSe protocol: ST AN3156. Only main flash on the listed F4 profiles.
export const FLASH_BASE = 0x08000000;
export const PROFILES = Object.freeze({
  f401cc: { name: 'STM32F401CC · 256 KB', flash: 256 * 1024, ram: 64 * 1024 },
  f401ce: { name: 'STM32F401CE · 512 KB', flash: 512 * 1024, ram: 96 * 1024 },
  f411ce: { name: 'STM32F411CE · 512 KB', flash: 512 * 1024, ram: 128 * 1024 },
  // Observed ROM DFU on the user's F407VE advertises the full F407 1 MiB map.
  // Descriptor compatibility does not expand the physical 512 KiB write boundary.
  f407ve: { name: 'STM32F407VET6 · 512 KB', flash: 512 * 1024, ram: 128 * 1024, ccm: 64 * 1024, dfuFlashSizes: [512 * 1024, 1024 * 1024] },
});
export const hex = n => `0x${n.toString(16).toUpperCase().padStart(8, '0')}`;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const cancelled = signal => { if (signal?.aborted) throw new DOMException('Đã dừng nạp.', 'AbortError'); };

export function parseAddress(value) {
  check(/^(0x[\da-f]+|\d+)$/i.test(String(value).trim()), 'Địa chỉ nạp không hợp lệ. Ví dụ: 0x08000000.');
  const address = Number(value);
  check(Number.isSafeInteger(address) && address >= 0 && address <= 0xffffffff, 'Địa chỉ phải là số 32 bit.');
  return address;
}

export function parseFirmware(name, buffer, address = FLASH_BASE) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  check(bytes.length > 0, 'File firmware đang rỗng.');
  if (/\.bin$/i.test(name)) {
    check(bytes.length <= 512 * 1024, 'File BIN lớn hơn 512 KB, vượt phạm vi chip đang hỗ trợ.');
    return [{ address: parseAddress(address), data: bytes.slice() }];
  }
  check(/\.hex$/i.test(name), 'Chỉ nhận firmware đã biên dịch dạng .bin hoặc Intel .hex.');
  check(bytes.length <= 2 * 1024 * 1024, 'File HEX quá lớn.');
  const records = []; let base = 0; let eof = false;
  const lines = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line) continue;
    check(!eof, `HEX dòng ${i + 1}: có dữ liệu sau bản ghi kết thúc.`);
    check(/^:([\da-f]{2})+$/i.test(line), `HEX dòng ${i + 1}: sai định dạng.`);
    const row = Uint8Array.from(line.slice(1).match(/../g), v => parseInt(v, 16));
    check(row.length >= 5 && row.length === row[0] + 5, `HEX dòng ${i + 1}: sai độ dài.`);
    check(row.reduce((a, b) => a + b, 0) % 256 === 0, `HEX dòng ${i + 1}: checksum không đúng.`);
    const count = row[0], offset = row[1] * 256 + row[2], type = row[3], data = row.slice(4, 4 + count);
    if (type === 0) {
      check(offset + count <= 0x10000, `HEX dòng ${i + 1}: vượt ranh giới địa chỉ 64 KB.`);
      if (count) records.push({ address: base + offset, data });
    } else {
      const sizes = { 1: 0, 2: 2, 3: 4, 4: 2, 5: 4 };
      check(type in sizes && offset === 0 && count === sizes[type], `HEX dòng ${i + 1}: loại bản ghi không hợp lệ.`);
      if (type === 1) eof = true;
      if (type === 2) base = (data[0] * 256 + data[1]) * 16;
      if (type === 4) base = (data[0] * 256 + data[1]) * 65536;
      // Start-address records are metadata; execution uses the Cortex-M vector table.
    }
  }
  check(eof && records.length > 0, 'HEX thiếu dữ liệu hoặc bản ghi kết thúc.');
  records.sort((a, b) => a.address - b.address);
  const groups = [];
  for (const record of records) {
    const group = groups.at(-1);
    check(!group || record.address >= group.end, 'HEX có các vùng dữ liệu chồng lấn.');
    if (group && group.end === record.address) { group.parts.push(record.data); group.end += record.data.length; }
    else groups.push({ address: record.address, end: record.address + record.data.length, parts: [record.data] });
  }
  return groups.map(group => {
    const data = new Uint8Array(group.end - group.address); let offset = 0;
    for (const part of group.parts) { data.set(part, offset); offset += part.length; }
    return { address: group.address, data };
  });
}

export function validateImage(segments, profile) {
  check(profile && segments.length > 0, 'Chưa chọn chip hoặc firmware.');
  let total = 0, previousEnd = FLASH_BASE;
  for (const segment of segments) {
    check(segment.data.length > 0 && Number.isSafeInteger(segment.address) && segment.address >= previousEnd &&
      segment.address + segment.data.length <= FLASH_BASE + profile.flash,
    'Firmware nằm ngoài flash của chip đã chọn hoặc có vùng chồng lấn. Không ghi RAM/OTP/option bytes.');
    // Word-aligned chunks avoid F4 programming alignment ambiguity. Never pad HEX holes.
    check(segment.address % 4 === 0 && segment.data.length % 4 === 0,
      'Vùng firmware phải bắt đầu và kết thúc theo bội số 4 byte. Hãy xuất lại file BIN/HEX từ bộ biên dịch.');
    total += segment.data.length; previousEnd = segment.address + segment.data.length;
  }
  const first = segments[0];
  check(first.address % 512 === 0 && first.data.length >= 8, 'Thiếu bảng vector hợp lệ ở đầu chương trình (căn 512 byte).');
  const vector = new DataView(first.data.buffer, first.data.byteOffset, 8);
  const sp = vector.getUint32(0, true), reset = vector.getUint32(4, true), entry = reset - (reset % 2);
  const inSram = sp > 0x20000000 && sp <= 0x20000000 + profile.ram;
  const inCcm = profile.ccm && sp > 0x10000000 && sp <= 0x10000000 + profile.ccm;
  check((inSram || inCcm) && sp % 8 === 0,
    'Stack pointer không phù hợp với RAM của chip đã chọn. Kiểm tra lại file và loại chip.');
  check(reset % 2 === 1 && segments.some(s => entry >= s.address && entry < s.address + s.data.length),
    'Reset handler không nằm trong firmware. File có thể không phải chương trình cho chip này.');
  return { total, start: first.address, end: previousEnd };
}

export function parseMemoryMap(name) {
  const match = /^@Internal Flash\s*\/\s*(0x[\da-f]+)\s*\/\s*(.+)$/i.exec(name || '');
  check(match, 'Không đọc được sơ đồ Internal Flash từ DFU. Không chọn RAM/OTP/option bytes.');
  let address = parseAddress(match[1]); const sectors = [];
  for (const raw of match[2].split(',')) {
    const item = /^\s*(\d+)\s*\*\s*(\d+)\s*([BKM])([a-g])\s*$/i.exec(raw);
    check(item, 'Sơ đồ sector DFU không được hỗ trợ.');
    const count = Number(item[1]), size = Number(item[2]) * ({ B: 1, K: 1024, M: 1048576 }[item[3].toUpperCase()]);
    const permissions = item[4].toLowerCase().charCodeAt(0) - 96;
    check(count > 0 && count <= 32 && size > 0 && size <= 512 * 1024, 'Kích thước sector DFU không hợp lệ.');
    for (let i = 0; i < count; i++) { sectors.push({ address, size, permissions }); address += size; }
  }
  return sectors;
}

export function makePlan(segments, profile, sectors) {
  const image = validateImage(segments, profile);
  const capacity = sectors.reduce((sum, sector) => sum + sector.size, 0);
  check((profile.dfuFlashSizes || [profile.flash]).includes(capacity),
    `Sơ đồ flash DFU báo ${capacity / 1024} KB không khớp chip ${profile.name}. Kiểm tra chip đã chọn và nhật ký.`);
  const sizes = [16384, 16384, 16384, 16384, 65536, ...Array((capacity - 131072) / 131072).fill(131072)];
  let address = FLASH_BASE;
  check(sectors.length === sizes.length && sectors.every((s, i) => {
    const matches = s.address === address && s.size === sizes[i] && s.permissions === 7;
    address += sizes[i]; return matches;
  }), 'Sơ đồ flash trên mạch không khớp chip đã chọn hoặc thiếu quyền đọc/xóa/ghi.');
  const touched = sectors.filter(s => segments.some(p => p.address < s.address + s.size && p.address + p.data.length > s.address));
  check(touched.every(s => s.address >= FLASH_BASE && s.address + s.size <= FLASH_BASE + profile.flash),
    'Sector cần xóa vượt giới hạn Flash của chip đã chọn.');
  // An offset application may share a sector with a resident bootloader. Refuse to erase its prefix.
  check(image.start === touched[0].address, 'Địa chỉ ứng dụng nằm giữa sector. Nạp sẽ xóa phần đầu sector có thể chứa bootloader; hãy sửa linker/địa chỉ.');
  return { ...image, sectors: touched, erasedBytes: touched.reduce((n, s) => n + s.size, 0) };
}

export function parseConfiguration(bytes, interfaceNumber, alternateSetting) {
  const data = bytes instanceof DataView ? bytes : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = data.byteLength; let active = false, sameInterface = false, stringIndex = 0, functional = null;
  for (let offset = 0; offset < length;) {
    check(offset + 2 <= length, 'USB descriptor bị cắt ngắn.');
    const size = data.getUint8(offset), type = data.getUint8(offset + 1);
    check(size >= 2 && offset + size <= length, 'USB descriptor không hợp lệ.');
    if (type === 4) {
      check(size >= 9, 'USB interface descriptor quá ngắn.');
      sameInterface = data.getUint8(offset + 2) === interfaceNumber;
      active = sameInterface && data.getUint8(offset + 3) === alternateSetting;
      if (active) stringIndex = data.getUint8(offset + 8);
    }
    // The functional descriptor applies to the interface and can follow its last alternate.
    if (type === 0x21 && sameInterface) {
      check(size >= 9, 'DFU functional descriptor quá ngắn.');
      functional = { attributes: data.getUint8(offset + 2), transferSize: data.getUint16(offset + 5, true), version: data.getUint16(offset + 7, true) };
    }
    offset += size;
  }
  return { stringIndex, functional };
}

export class DfuDevice {
  constructor(device) { this.device = device; this.interfaceNumber = 0; this.sectors = []; this.transferSize = 0; this.onLog = () => {}; }
  setup(request, value = 0) { return { requestType: 'class', recipient: 'interface', request, value, index: this.interfaceNumber }; }
  async io(operation) {
    let timer;
    try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('USB không phản hồi sau 30 giây. Ngắt kết nối rồi thử lại.')), 30000); })]); }
    finally { clearTimeout(timer); }
  }
  async read(setup, length) {
    const result = await this.io(this.device.controlTransferIn(setup, length));
    check(result.status === 'ok' && result.data?.byteLength === length, 'USB đọc thiếu dữ liệu hoặc bị từ chối. Kiểm tra driver và bảo vệ flash.');
    return result.data;
  }
  async send(request, value = 0, data = new Uint8Array()) {
    const result = await this.io(this.device.controlTransferOut(this.setup(request, value), data));
    check(result.status === 'ok' && result.bytesWritten === data.byteLength, 'USB ghi thiếu dữ liệu hoặc bị từ chối.');
  }
  async status() {
    const data = await this.read(this.setup(3), 6);
    return { error: data.getUint8(0), poll: data.getUint8(1) + data.getUint8(2) * 256 + data.getUint8(3) * 65536, state: data.getUint8(4) };
  }
  async idle() {
    let status = await this.status();
    if (status.state === 10) { await this.send(4); status = await this.status(); }
    check(status.error === 0, `DFU báo lỗi ${status.error}. Kiểm tra bảo vệ bộ nhớ và kết nối.`);
    if ([5, 9].includes(status.state)) { await this.send(6); status = await this.status(); }
    check(status.error === 0 && status.state === 2, `DFU chưa sẵn sàng (state ${status.state}). Vào lại DFU rồi kết nối lại.`);
  }
  async pollDownload() {
    const deadline = Date.now() + 30000;
    for (;;) {
      const status = await this.status();
      check(status.error === 0, `DFU báo lỗi ${status.error}. Không thể hoàn tất ghi/xóa.`);
      if (status.state === 5) return;
      check([3, 4].includes(status.state), `DFU trả về state ${status.state} ngoài dự kiến.`);
      check(Date.now() + status.poll < deadline, 'Quá thời gian chờ DFU hoàn tất ghi/xóa.');
      await pause(Math.max(status.poll, 1));
    }
  }
  async command(code, address) {
    await this.idle();
    const data = new Uint8Array(5); data[0] = code; new DataView(data.buffer).setUint32(1, address, true);
    await this.send(1, 0, data); await this.pollDownload();
  }
  async string(index) {
    if (!index) return '';
    const request = { requestType: 'standard', recipient: 'device', request: 6, value: 0x0300, index: 0 };
    const languages = await this.io(this.device.controlTransferIn(request, 255));
    check(languages.status === 'ok' && languages.data?.byteLength >= 4, 'Không đọc được ngôn ngữ USB descriptor.');
    request.index = languages.data.getUint16(2, true); request.value |= index;
    const result = await this.io(this.device.controlTransferIn(request, 255));
    check(result.status === 'ok' && result.data?.byteLength >= 2, 'Không đọc được tên vùng nhớ DFU.');
    return new TextDecoder('utf-16le').decode(new Uint8Array(result.data.buffer, result.data.byteOffset + 2, result.data.byteLength - 2));
  }
  async connect() {
    check(this.device.vendorId === 0x0483 && this.device.productId === 0xdf11, 'Chỉ nhận STM32 ROM DFU (0483:DF11).');
    await this.io(this.device.open());
    try {
      const config = this.device.configurations.find(c => c.interfaces.some(i => i.alternates.some(a => a.interfaceClass === 0xfe && a.interfaceSubclass === 1 && a.interfaceProtocol === 2)));
      check(config, 'Không tìm thấy giao diện DFU trên thiết bị.');
      if (this.device.configuration?.configurationValue !== config.configurationValue) await this.io(this.device.selectConfiguration(config.configurationValue));
      const configIndex = this.device.configurations.findIndex(c => c.configurationValue === config.configurationValue);
      const setup = { requestType: 'standard', recipient: 'device', request: 6, value: 0x0200 | configIndex, index: 0 };
      const header = await this.read(setup, 9), total = header.getUint16(2, true);
      check(total >= 9 && total <= 65535, 'Độ dài cấu hình USB không hợp lệ.');
      const raw = await this.read(setup, total); let target;
      for (const iface of config.interfaces) for (const alt of iface.alternates) {
        if (alt.interfaceClass !== 0xfe || alt.interfaceSubclass !== 1 || alt.interfaceProtocol !== 2) continue;
        const descriptor = parseConfiguration(raw, iface.interfaceNumber, alt.alternateSetting);
        const name = alt.interfaceName || await this.string(descriptor.stringIndex);
        if (/^@Internal Flash\s*\//i.test(name)) { target = { iface, alt, descriptor, name }; break; }
      }
      check(target, 'Không tìm thấy Internal Flash của STM32.');
      const functional = target.descriptor.functional;
      check(functional && functional.version === 0x011a && (functional.attributes & 3) === 3 && functional.transferSize >= 4,
        'Thiết bị phải hỗ trợ DfuSe, ghi và đọc lại dữ liệu.');
      this.sectors = parseMemoryMap(target.name);
      this.memoryName = target.name;
      this.transferSize = Math.min(functional.transferSize, 2048) & ~3;
      this.interfaceNumber = target.iface.interfaceNumber;
      await this.io(this.device.claimInterface(this.interfaceNumber));
      await this.io(this.device.selectAlternateInterface(this.interfaceNumber, target.alt.alternateSetting));
      await this.idle(); return this;
    } catch (error) { await this.disconnect().catch(() => {}); throw error; }
  }
  async disconnect() {
    if (this.device.opened) await this.io(this.device.close());
  }
  async flash(segments, profile, { signal, onProgress = () => {}, reboot = true } = {}) {
    const plan = makePlan(segments, profile, this.sectors);
    check(this.transferSize >= 4, 'Chưa kết nối thiết bị DFU.');
    cancelled(signal); await this.idle();
    // Confirm reading is possible before the first destructive command (RDP must not be active).
    await this.command(0x21, plan.start); await this.idle(); await this.read(this.setup(2, 2), 4); await this.idle();
    for (let i = 0; i < plan.sectors.length; i++) {
      cancelled(signal); const sector = plan.sectors[i]; this.onLog(`Xóa sector ${hex(sector.address)} (${sector.size / 1024} KB)`);
      await this.command(0x41, sector.address); onProgress(15 * (i + 1) / plan.sectors.length, 'Đang xóa vùng flash');
    }
    let written = 0;
    for (const segment of segments) {
      for (let offset = 0; offset < segment.data.length; offset += this.transferSize) {
        cancelled(signal);
        // Reset pointer for each chunk and always use block 2. AN3156 defines the address stride
        // using the current request length; a short last block must never shift its destination.
        await this.command(0x21, segment.address + offset);
        cancelled(signal);
        const chunk = segment.data.subarray(offset, offset + this.transferSize);
        await this.send(1, 2, chunk); await this.pollDownload(); written += chunk.length;
        onProgress(15 + 50 * written / plan.total, 'Đang ghi firmware');
      }
    }
    let verified = 0;
    for (const segment of segments) {
      for (let offset = 0; offset < segment.data.length; offset += this.transferSize) {
        cancelled(signal); await this.command(0x21, segment.address + offset); await this.idle();
        const expected = segment.data.subarray(offset, offset + this.transferSize);
        const actual = await this.read(this.setup(2, 2), expected.length);
        for (let i = 0; i < expected.length; i++) check(actual.getUint8(i) === expected[i], `Dữ liệu đọc lại không khớp tại ${hex(segment.address + offset + i)}. Nạp chưa thành công.`);
        verified += expected.length; onProgress(65 + 35 * verified / plan.total, 'Đang đọc lại và đối chiếu');
      }
    }
    await this.idle(); cancelled(signal); this.onLog(`Đã đối chiếu đúng ${plan.total.toLocaleString('vi-VN')} byte.`);
    let rebootRequested = false, rebootError = null;
    if (reboot) {
      try {
        await this.command(0x21, plan.start); await this.send(1, 0); rebootRequested = true;
        const status = await this.status();
        check(status.error === 0 && [6, 7, 8].includes(status.state), 'Thiết bị chưa xác nhận rời DFU.');
      } catch (error) {
        // A disconnect during manifestation is expected; never claim the application is running.
        if (!rebootRequested || error.name !== 'NetworkError') rebootError = error.message;
      }
    }
    return { ...plan, rebootRequested, rebootError };
  }
}
