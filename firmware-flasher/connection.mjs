import { DfuDevice } from './core.mjs?v=20261117-f407map';
import { requestDfu } from './serial.mjs';

// The second chooser needs a fresh user click after the application reboots.
// Keep it on the same button; never retry dfu automatically or start flashing.
export class BoardConnection {
  constructor({ serial, usb, openDfu = device => new DfuDevice(device).connect() }) {
    this.serial = serial; this.usb = usb; this.openDfu = openDfu; this.phase = 'application';
  }
  reset() { this.phase = 'application'; }
  async hasGrantedDfu() {
    const devices = await this.usb?.getDevices?.() || [];
    return devices.some(device => device.vendorId === 0x0483 && device.productId === 0xdf11);
  }
  async connect({ ending = 'raw', alreadyDfu = false } = {}) {
    if (alreadyDfu || this.phase === 'dfu') {
      this.phase = 'dfu';
      const device = await this.usb.requestDevice({ filters: [{ vendorId: 0x0483, productId: 0xdf11 }] });
      return { phase: 'connected', dfu: await this.openDfu(device) };
    }
    const result = await requestDfu(this.serial, ending);
    this.phase = 'dfu';
    return { phase: 'dfu', serial: result };
  }
}
