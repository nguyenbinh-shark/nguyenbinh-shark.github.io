// Cooperating application firmware must implement this command. Sending it is not
// proof of entering DFU; reconnect through WebUSB after USB re-enumeration.
export async function requestDfu(serial, ending = 'raw') {
  const suffix = { raw: '', lf: '\n', crlf: '\r\n' }[ending];
  if (suffix === undefined) throw new Error('Kiểu kết thúc lệnh dfu không hợp lệ.');
  if (!serial?.requestPort) throw new Error('Cần Chrome/Edge hỗ trợ Web Serial, qua HTTPS hoặc localhost.');
  // Must run directly in the click's activation, before any asynchronous work.
  const port = await serial.requestPort();
  let writer, opened = false, closeError = null;
  const wait = async operation => {
    let timer;
    try {
      return await Promise.race([operation, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Virtual COM không phản hồi sau 10 giây. Kiểm tra mạch đã vào DFU chưa trước khi thử lại.')), 10000);
      })]);
    } finally { clearTimeout(timer); }
  };
  try {
    await wait(port.open({ baudRate: 115200 })); opened = true;
    if (!port.writable) throw new Error('Virtual COM không có luồng ghi.');
    writer = port.writable.getWriter();
    await wait(writer.write(new TextEncoder().encode(`dfu${suffix}`)));
  } finally {
    // Firmware can disconnect immediately after receiving dfu. Never retry the command.
    try { writer?.releaseLock(); } catch {}
    if (opened) { try { await wait(port.close()); } catch (error) { closeError = error.message; } }
  }
  return { bytesSent: 3 + suffix.length, closeError };
}
