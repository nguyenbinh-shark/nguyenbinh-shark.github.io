(function () {
  "use strict";

  const BASE_PATH = "../../images/53-58-iot-tuoi-cay/hardware/";

  const ITEMS = {
    stm32: {
      id: "stm32",
      name: "STM32F401RCT6 (LQFP64)",
      tier: "Tầng 2 · Bộ não tại biên",
      summary: "Vi điều khiển trung tâm ARM Cortex-M4 @ 84 MHz, 256 KiB Flash (128 KiB app + 128 KiB Sector 5 lưu cấu hình), 64 KiB RAM, mã chip DEV_ID=0x423.",
      specs: [
        "Gói chân: LQFP64 (STM32F401RCT6)",
        "Cảm biến: PA0..PA3 (ADC1 đất), PB6/PB7 (I2C1 AHT30)",
        "Chấp hành: PB4 (Bơm), PB5/PB8/PB9 (Van A/B/C)",
        "Truyền thông & Nạp: PA9/PA10 (USART1 EC600N), PA13/PA14 (SWD ESP32), PA11/PA12 (USB)"
      ],
      photos: [
        {
          file: "stm32f401rct6.png",
          label: "Bo mạch vi điều khiển STM32F401RCT6 (LQFP64)",
          hint: "Mặt trên bo mạch điều khiển trung tâm, chip STM32F401RCT6 64 chân, thạch anh RTC 32.768 kHz và các hàng header nối ra cảm biến / rơ-le."
        }
      ],
      svgIcon: `<rect x="18" y="18" width="44" height="44" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <text x="40" y="38" text-anchor="middle" fill="#e2e8f0" font-size="8" font-weight="700">STM32</text>
        <text x="40" y="49" text-anchor="middle" fill="#38bdf8" font-size="7.5" font-weight="700">F401RCT6</text>
        <path d="M24 10v8M32 10v8M40 10v8M48 10v8M56 10v8M24 62v8M32 62v8M40 62v8M48 62v8M56 62v8M10 24h8M10 32h8M10 40h8M10 48h8M10 56h8M62 24h8M62 32h8M62 40h8M62 48h8M62 56h8" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>`
    },
    ec600n: {
      id: "ec600n",
      name: "Modem 4G Quectel EC600N",
      tier: "Tầng 2 · Truyền thông 4G LTE",
      summary: "Module truyền thông di động gắn SIM 4G, giao tiếp STM32 qua USART1 DMA và tự xử lý bảo mật TLS 1.2 lên EMQX Cloud (cổng 8883).",
      specs: [
        "Giao tiếp MCU: USART1 (PA9 TX / PA10 RX) chế độ DMA",
        "Giao thức: MQTTS (TLS 1.2, QoS 1) + đồng bộ giờ 4G/NTP",
        "Khi rớt sóng: STM32 vẫn tự tưới độc lập theo cấu hình Flash"
      ],
      photos: [
        {
          file: "modem_ec600n_4g.jpg",
          label: "Module 4G LTE Quectel EC600N & ăng-ten",
          hint: "Chụp toàn cảnh module Quectel EC600N, khay lắp SIM 4G, giắc ăng-ten SMA và dây UART nối sang bo STM32F401RCT6."
        }
      ],
      svgIcon: `<rect x="16" y="24" width="48" height="38" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <path d="M56 24V10M51 14c3-3 7-3 10 0" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
        <rect x="24" y="33" width="16" height="12" rx="2" fill="#1e293b" stroke="#64748b"/>
        <text x="40" y="55" text-anchor="middle" fill="#38bdf8" font-size="8.5" font-weight="700">EC600N 4G</text>`
    },
    esp32: {
      id: "esp32",
      name: "Board ESP32 (Trạm nạp OTA SWD)",
      tier: "Tầng 2 · Cập nhật Firmware từ xa",
      summary: "Trạm nạp OTA nối với STM32F401RCT6 qua 4 dây SWD; tải tệp .bin từ liên kết ký trên VPS qua Wi-Fi, kiểm tra DEV_ID=0x423 rồi xóa/ghi/đối chiếu Flash.",
      specs: [
        "Chuẩn nạp: 4 dây SWD (SWDIO → PA13, SWCLK → PA14, NRST, GND)",
        "Kết nối mạng: Wi-Fi 2.4 GHz (tải tệp .bin ≤ 128 KiB qua HTTPS)",
        "Hỗ trợ từ xa: Nạp firmware mới & nút Reset (ESP32 / STM32 / EC600N)"
      ],
      photos: [
        {
          file: "esp32_ota_swd.jpg",
          label: "Board ESP32 & 4 dây nạp SWD sang STM32",
          hint: "Chụp board ESP32 và bó 4 dây SWDIO, SWCLK, NRST, GND nối tới cổng debug của bo STM32F401RCT6."
        }
      ],
      svgIcon: `<rect x="14" y="18" width="52" height="44" rx="6" fill="#0f172a" stroke="#a78bfa" stroke-width="2"/>
        <path d="M22 26h14v12H22z" fill="#1e293b" stroke="#a78bfa"/>
        <text x="40" y="52" text-anchor="middle" fill="#a78bfa" font-size="8.5" font-weight="700">ESP32 SWD</text>
        <path d="M26 62v6M35 62v6M45 62v6M54 62v6" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/>`
    },
    soil: {
      id: "soil",
      name: "4 Cảm biến Độ ẩm Đất Điện dung",
      tier: "Tầng 1 · Cảm biến ngoài vườn",
      summary: "4 đầu đo độ ẩm đất điện dung đặt tại các điểm đại diện B-1, B-3 (Hàng B) và C-1, C-3 (Hàng C), cắm sâu ~15 cm vùng rễ cà chua.",
      specs: [
        "Mẫu cảm biến: Capacitive Soil Moisture Sensor v2.0 (HW-390 · VCC / GND / AOUT)",
        "Chân ADC STM32: PA0, PA1, PA2, PA3 (ADC1 · 0–3.3 V)",
        "Xử lý nhiễu: Lấy 16 mẫu, cắt bỏ 2 thấp nhất + 2 cao nhất, lọc EMA",
        "Hàng A không cắm cảm biến đất (chạy đối chứng hẹn giờ cố định)"
      ],
      refUrl: "https://lkcg.vn/cam-bien-do-am-dien-dung-dau-ra-analog-mau-den",
      refLabel: "Trang thông số linh kiện tham khảo (lkcg.vn)",
      photos: [
        {
          file: "cam_bien_am_dat.png",
          label: "Cảm biến độ ẩm đất điện dung v2.0 (HW-390 · Đầu ra Analog · 99.2 × 22.3 mm)",
          hint: "Chụp cận cảnh que cảm biến độ ẩm đất điện dung cắm trong bầu giá thể chậu cà chua và dây tín hiệu nối về hộp mạch."
        }
      ],
      svgIcon: `<path d="M32 14h16v20l-5 30h-6l-5-30z" fill="#0f172a" stroke="#22c55e" stroke-width="2"/>
        <path d="M18 46c10-4 34-4 44 0" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="3 3" fill="none"/>
        <text x="40" y="27" text-anchor="middle" fill="#4ade80" font-size="7.5" font-weight="700">SOIL</text>`
    },
    aht: {
      id: "aht",
      name: "Cảm biến Không khí AHT30",
      tier: "Tầng 1 · Cảm biến vi khí hậu",
      summary: "Cảm biến số đo Nhiệt độ (°C) và Độ ẩm tương đối (%) của không khí quanh tán cây để STM32 tính chỉ số VPD (kPa) cho chiến lược tưới Hàng C.",
      specs: [
        "Giao tiếp: I2C1 (PB6 SCL / PB7 SDA, địa chỉ 0x38)",
        "Ứng dụng: Tính VPD = es(T) × (1 - RH/100) cho Hàng C",
        "Khi AHT30 mất tín hiệu: VPD trả về null, Hàng C chạy ngưỡng cơ bản"
      ],
      photos: [
        {
          file: "cam_bien_aht30.jpg",
          label: "Module cảm biến nhiệt độ & độ ẩm không khí AHT30",
          hint: "Chụp module AHT30 tại vị trí đặt trong khu vực trồng cây và cáp I2C 4 dây."
        }
      ],
      svgIcon: `<rect x="20" y="18" width="40" height="44" rx="6" fill="#0f172a" stroke="#22c55e" stroke-width="2"/>
        <rect x="30" y="26" width="20" height="14" rx="2" fill="#1e293b" stroke="#4ade80"/>
        <text x="40" y="54" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="700">AHT30</text>`
    },
    act: {
      id: "act",
      name: "Bơm 12V, 3 Van Điện từ A/B/C & Mạch Relay",
      tier: "Tầng 1 · Chấp hành thủy lực",
      summary: "Hệ thống chia nước từ bồn qua 1 Bơm 12V chung và 3 Van điện từ thường đóng (A, B, C) tới 12 đầu nhỏ giọt đã hiệu chuẩn lưu lượng thực tế.",
      specs: [
        "Động cơ bơm: Bơm màng mini 12V DC cấp nước tới các nhánh",
        "Relay điều khiển: PB4 (Bơm 12V), PB5 (Van A), PB8 (Van B), PB9 (Van C)",
        "Khóa cứng tại biên: Chỉ mở tối đa 1 van tại một thời điểm (luân phiên)",
        "Lưu ý phần cứng: Hiện chưa lắp phao bồn vật lý và đồng hồ xung Hall"
      ],
      photos: [
        {
          file: "bom_nuoc_12v.jpg",
          label: "Máy bơm nước mini 12V DC",
          hint: "Bơm màng mini 12V DC dùng cấp áp lực nước cho hệ thống tưới nhỏ giọt 3 nhánh van A/B/C."
        }
      ],
      svgIcon: `<circle cx="28" cy="40" r="14" fill="#0f172a" stroke="#22c55e" stroke-width="2"/>
        <text x="28" y="43" text-anchor="middle" fill="#4ade80" font-size="7.5" font-weight="700">PUMP</text>
        <path d="M42 40h18M52 24v32" stroke="#38bdf8" stroke-width="2"/>
        <rect x="47" y="18" width="14" height="10" rx="2" fill="#1e293b" stroke="#38bdf8"/>
        <rect x="47" y="52" width="14" height="10" rx="2" fill="#1e293b" stroke="#38bdf8"/>`
    },
    cabinet: {
      id: "cabinet",
      name: "Tủ điều khiển biên & Mô hình 3 hàng cây",
      tier: "Toàn cảnh Phần cứng ngoài vườn",
      summary: "Bố trí tổng thể hộp mạch điều khiển (nguồn, STM32F401RCT6, EC600N, ESP32, Relay) kết nối ra 3 hàng × 4 chậu cà chua (12 chậu).",
      specs: [
        "12 chậu: Hàng A (A-1..4 hẹn giờ), Hàng B (B-1..4 ẩm đất), Hàng C (C-1..4 ẩm + VPD)",
        "Tất cả cảm biến và relay đấu nối về bo STM32F401RCT6 trong hộp điện",
        "Hoạt động tự lập ngoài vườn ngay cả khi mất sóng 4G hoặc tắt VPS"
      ],
      photos: [
        {
          file: "tu_dien_tong_the.jpg",
          label: "Toàn cảnh tủ điện điều khiển & 3 hàng cà chua",
          hint: "Chụp toàn cảnh tủ điện đã mở nắp (thấy rõ bố trí bo mạch, nguồn, dây) hoặc khung giàn 3 hàng × 4 chậu."
        }
      ],
      svgIcon: `<rect x="14" y="14" width="52" height="52" rx="6" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
        <rect x="20" y="20" width="18" height="16" rx="2" fill="#1e293b" stroke="#38bdf8"/>
        <rect x="42" y="20" width="18" height="16" rx="2" fill="#1e293b" stroke="#4ade80"/>
        <rect x="20" y="42" width="40" height="18" rx="2" fill="#1e293b" stroke="#f59e0b"/>`
    }
  };

  const ORDER = ["stm32", "ec600n", "esp32", "soil", "aht", "act", "cabinet"];

  let stylesInjected = false;
  let modalEl = null;
  let activeGroup = ORDER.slice();
  let activeId = "stm32";
  let activePhotoIdx = 0;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const css = `
      .hwv-svg-trigger { cursor: pointer; outline: none; }
      .hwv-svg-trigger:hover > rect:first-of-type,
      .hwv-svg-trigger:focus-visible > rect:first-of-type { stroke: #38bdf8 !important; stroke-width: 2.2 !important; }
      .hwv-pill { cursor: pointer; }
      .hwv-pill rect {
        fill: #0f172a;
        stroke: #38bdf8;
        stroke-width: 1.1;
        transition: fill 0.15s ease, stroke 0.15s ease;
      }
      .hwv-pill text {
        fill: #7dd3fc;
        font-size: 8.5px;
        font-weight: 700;
        font-family: Inter, system-ui, sans-serif;
        pointer-events: none;
      }
      .hwv-svg-trigger:hover .hwv-pill rect,
      .hwv-pill:hover rect { fill: #1e3a5f; stroke: #7dd3fc; }

      .hwv-inline {
        margin-top: 10px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 9px 11px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .hwv-inline-thumb {
        width: 132px;
        height: 82px;
        flex: 0 0 132px;
        border-radius: 7px;
        background: #0b1120;
        border: 1px dashed #334155;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
      }
      .hwv-inline-thumb img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #ffffff;
        display: block;
      }
      .hwv-inline-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 4px;
        text-align: center;
      }
      .hwv-inline-fallback svg { width: 42px; height: 42px; }
      .hwv-inline-fallback span {
        font-size: 0.65rem;
        color: #94a3b8;
        line-height: 1.2;
      }
      .hwv-inline-info { flex: 1 1 auto; min-width: 0; }
      .hwv-inline-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 3px;
      }
      .hwv-inline-head strong { font-size: 0.84rem; color: #f8fafc; }
      .hwv-inline-status {
        font-size: 0.68rem;
        padding: 1px 7px;
        border-radius: 999px;
        font-weight: 700;
        background: rgba(245, 158, 11, 0.14);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
      }
      .hwv-inline-status.ready {
        background: rgba(34, 197, 94, 0.14);
        color: #4ade80;
        border-color: rgba(34, 197, 94, 0.35);
      }
      .hwv-inline-path {
        margin: 0 0 4px;
        font-size: 0.75rem;
        color: #94a3b8;
        line-height: 1.38;
      }
      .hwv-inline-path code {
        color: #7dd3fc;
        background: #111827;
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 0.72rem;
      }
      .hwv-btn {
        border: 1px solid #38bdf8;
        background: rgba(56, 189, 248, 0.14);
        color: #7dd3fc;
        padding: 5px 10px;
        border-radius: 7px;
        font: inherit;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .hwv-btn:hover { background: #38bdf8; color: #0b1120; }
      .hwv-btn-ghost {
        border: 1px solid #334155;
        background: #111827;
        color: #e2e8f0;
        padding: 5px 10px;
        border-radius: 7px;
        font: inherit;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
      }
      .hwv-btn-ghost:hover { border-color: #38bdf8; color: #38bdf8; }

      .hwv-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(2, 6, 23, 0.84);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      .hwv-backdrop[hidden] { display: none; }
      .hwv-dialog {
        width: 100%;
        max-width: 780px;
        max-height: calc(100vh - 20px);
        overflow-y: auto;
        background: #111827;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 12px 14px;
        color: #f8fafc;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      }
      .hwv-modal-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }
      .hwv-tier {
        display: inline-block;
        font-size: 0.68rem;
        font-weight: 700;
        color: #38bdf8;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .hwv-title {
        margin: 2px 0 0;
        font-size: 1rem;
        font-weight: 700;
        color: #f8fafc;
      }
      .hwv-tabs {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .hwv-tab {
        border: 1px solid #334155;
        background: #0f172a;
        color: #94a3b8;
        padding: 4px 8px;
        border-radius: 6px;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
      }
      .hwv-tab:hover { border-color: #38bdf8; color: #e2e8f0; }
      .hwv-tab.active {
        background: rgba(56, 189, 248, 0.16);
        border-color: #38bdf8;
        color: #7dd3fc;
      }
      .hwv-media {
        background: #0b1120;
        border: 1px solid #1e293b;
        border-radius: 10px;
        min-height: 190px;
        max-height: 46vh;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 8px;
      }
      .hwv-media img {
        max-width: 100%;
        max-height: 43vh;
        object-fit: contain;
        border-radius: 6px;
        display: block;
      }
      .hwv-slot {
        text-align: center;
        padding: 12px 14px;
        max-width: 560px;
      }
      .hwv-slot svg { width: 72px; height: 72px; margin-bottom: 4px; }
      .hwv-slot-badge {
        display: inline-block;
        padding: 2px 9px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 700;
        background: rgba(245, 158, 11, 0.14);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
        margin-bottom: 6px;
      }
      .hwv-slot-hint {
        margin: 0 0 6px;
        font-size: 0.8rem;
        color: #cbd5e1;
        line-height: 1.45;
      }
      .hwv-slot-file {
        display: inline-block;
        font-family: ui-monospace, Consolas, monospace;
        font-size: 0.72rem;
        color: #7dd3fc;
        background: #111827;
        border: 1px dashed #334155;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .hwv-photo-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
        font-size: 0.76rem;
        color: #94a3b8;
      }
      .hwv-photo-dots { display: flex; gap: 5px; flex-wrap: wrap; }
      .hwv-dot-btn {
        border: 1px solid #334155;
        background: #0f172a;
        color: #cbd5e1;
        padding: 2px 7px;
        border-radius: 5px;
        font-size: 0.7rem;
        cursor: pointer;
      }
      .hwv-dot-btn.active { border-color: #38bdf8; color: #38bdf8; }
      .hwv-desc {
        margin: 8px 0 6px;
        font-size: 0.81rem;
        color: #e2e8f0;
        line-height: 1.45;
      }
      .hwv-specs {
        margin: 0;
        padding-left: 18px;
        font-size: 0.77rem;
        color: #cbd5e1;
        line-height: 1.45;
      }
      .hwv-ref-link {
        display: inline-block;
        margin-top: 4px;
        font-size: 0.75rem;
        color: #38bdf8;
        text-decoration: none;
        word-break: break-all;
      }
      .hwv-ref-link:hover { text-decoration: underline; color: #7dd3fc; }
      .hwv-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #1e293b;
      }
      @media (max-width: 600px) {
        .hwv-inline { flex-direction: column; align-items: stretch; }
        .hwv-inline-thumb { width: 100%; flex: none; height: 96px; }
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createSvgIcon(iconBody) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 80 80");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = iconBody;
    return svg;
  }

  function createRefLink(item) {
    if (!item || !item.refUrl) return null;
    const a = document.createElement("a");
    a.className = "hwv-ref-link";
    a.href = item.refUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "🔗 " + (item.refLabel || item.refUrl);
    return a;
  }

  function buildModal() {
    if (modalEl) return modalEl;
    injectStyles();

    const backdrop = document.createElement("div");
    backdrop.className = "hwv-backdrop";
    backdrop.setAttribute("hidden", "");
    backdrop.innerHTML = `
      <div class="hwv-dialog" role="dialog" aria-modal="true" aria-labelledby="hwvModalTitle">
        <div class="hwv-modal-top">
          <div>
            <span class="hwv-tier" id="hwvModalTier"></span>
            <h2 class="hwv-title" id="hwvModalTitle"></h2>
          </div>
          <button type="button" class="hwv-btn-ghost" id="hwvBtnClose" aria-label="Đóng cửa sổ">✕ Đóng</button>
        </div>
        <div class="hwv-tabs" id="hwvModalTabs"></div>
        <div class="hwv-media" id="hwvModalMedia"></div>
        <div class="hwv-photo-bar">
          <span id="hwvModalPhotoLabel"></span>
          <div class="hwv-photo-dots" id="hwvModalPhotoDots"></div>
        </div>
        <p class="hwv-desc" id="hwvModalDesc"></p>
        <ul class="hwv-specs" id="hwvModalSpecs"></ul>
        <div id="hwvModalRefWrap"></div>
        <div class="hwv-footer">
          <div style="display:flex;gap:6px;">
            <button type="button" class="hwv-btn-ghost" id="hwvBtnPrev">← Thiết bị trước</button>
            <button type="button" class="hwv-btn-ghost" id="hwvBtnNext">Thiết bị tiếp →</button>
          </div>
          <button type="button" class="hwv-btn-ghost" id="hwvBtnShowAll">Xem tất cả (7 khối)</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector("#hwvBtnClose").addEventListener("click", close);
    backdrop.querySelector("#hwvBtnPrev").addEventListener("click", () => stepGroup(-1));
    backdrop.querySelector("#hwvBtnNext").addEventListener("click", () => stepGroup(1));
    backdrop.querySelector("#hwvBtnShowAll").addEventListener("click", () => {
      activeGroup = ORDER.slice();
      activePhotoIdx = 0;
      renderModal();
    });

    document.addEventListener("keydown", (e) => {
      if (backdrop.hasAttribute("hidden")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") stepGroup(-1);
      else if (e.key === "ArrowRight") stepGroup(1);
    });

    modalEl = backdrop;
    return modalEl;
  }

  function stepGroup(delta) {
    if (!activeGroup.length) return;
    const idx = activeGroup.indexOf(activeId);
    const nextIdx = (idx === -1 ? 0 : (idx + delta + activeGroup.length) % activeGroup.length);
    activeId = activeGroup[nextIdx];
    activePhotoIdx = 0;
    renderModal();
  }

  function renderModal() {
    const backdrop = buildModal();
    const item = ITEMS[activeId] || ITEMS.stm32;
    const photos = item.photos || [];
    const safePhotoIdx = Math.max(0, Math.min(activePhotoIdx, Math.max(0, photos.length - 1)));
    const photo = photos[safePhotoIdx];

    backdrop.querySelector("#hwvModalTier").textContent = item.tier;
    backdrop.querySelector("#hwvModalTitle").textContent = item.name;
    backdrop.querySelector("#hwvModalDesc").textContent = item.summary;

    const specsEl = backdrop.querySelector("#hwvModalSpecs");
    specsEl.innerHTML = "";
    item.specs.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      specsEl.appendChild(li);
    });

    const refWrap = backdrop.querySelector("#hwvModalRefWrap");
    refWrap.innerHTML = "";
    const refLink = createRefLink(item);
    if (refLink) refWrap.appendChild(refLink);

    const tabsEl = backdrop.querySelector("#hwvModalTabs");
    tabsEl.innerHTML = "";
    activeGroup.forEach((gid) => {
      const gItem = ITEMS[gid];
      if (!gItem) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hwv-tab" + (gid === item.id ? " active" : "");
      btn.textContent = gItem.name.split("(")[0].trim();
      btn.addEventListener("click", () => {
        activeId = gid;
        activePhotoIdx = 0;
        renderModal();
      });
      tabsEl.appendChild(btn);
    });

    const showAllBtn = backdrop.querySelector("#hwvBtnShowAll");
    showAllBtn.style.display = activeGroup.length < ORDER.length ? "inline-block" : "none";

    const mediaEl = backdrop.querySelector("#hwvModalMedia");
    mediaEl.innerHTML = "";

    const labelEl = backdrop.querySelector("#hwvModalPhotoLabel");
    if (photo) {
      labelEl.textContent = photo.label;

      const slot = document.createElement("div");
      slot.className = "hwv-slot";
      slot.appendChild(createSvgIcon(item.svgIcon));

      const badge = document.createElement("div");
      badge.className = "hwv-slot-badge";
      badge.textContent = "Chưa gắn ảnh thực tế — Khung chờ bổ sung";
      slot.appendChild(badge);

      const hint = document.createElement("p");
      hint.className = "hwv-slot-hint";
      hint.textContent = photo.hint;
      slot.appendChild(hint);

      const pathCode = document.createElement("div");
      pathCode.className = "hwv-slot-file";
      pathCode.textContent = "Đặt ảnh vào: images/53-58-iot-tuoi-cay/hardware/" + photo.file;
      slot.appendChild(pathCode);

      const img = document.createElement("img");
      img.alt = photo.label;
      img.src = BASE_PATH + photo.file;
      img.style.display = "none";

      img.addEventListener("load", () => {
        slot.style.display = "none";
        img.style.display = "block";
      });
      img.addEventListener("error", () => {
        img.style.display = "none";
        slot.style.display = "block";
      });

      mediaEl.appendChild(img);
      mediaEl.appendChild(slot);
    } else {
      labelEl.textContent = "";
    }

    const dotsEl = backdrop.querySelector("#hwvModalPhotoDots");
    dotsEl.innerHTML = "";
    if (photos.length > 1) {
      photos.forEach((p, idx) => {
        const d = document.createElement("button");
        d.type = "button";
        d.className = "hwv-dot-btn" + (idx === safePhotoIdx ? " active" : "");
        d.textContent = "Ảnh " + (idx + 1);
        d.addEventListener("click", () => {
          activePhotoIdx = idx;
          renderModal();
        });
        dotsEl.appendChild(d);
      });
    }
  }

  function open(id, opts) {
    const resolvedId = ITEMS[id] ? id : "stm32";
    const group = opts && Array.isArray(opts.group) && opts.group.length
      ? opts.group.filter((k) => Boolean(ITEMS[k]))
      : ORDER.slice();
    if (!group.includes(resolvedId)) group.unshift(resolvedId);
    activeGroup = group;
    activeId = resolvedId;
    activePhotoIdx = (opts && typeof opts.photoIndex === "number") ? opts.photoIndex : 0;

    const backdrop = buildModal();
    renderModal();
    backdrop.removeAttribute("hidden");
  }

  function close() {
    if (!modalEl) return;
    modalEl.setAttribute("hidden", "");
  }

  function renderInline(containerEl, id) {
    if (!containerEl) return;
    injectStyles();
    const item = ITEMS[id];
    if (!item) {
      containerEl.innerHTML = "";
      containerEl.setAttribute("hidden", "");
      return;
    }

    const firstPhoto = (item.photos && item.photos[0]) || { file: "", label: item.name, hint: "" };
    containerEl.removeAttribute("hidden");
    containerEl.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "hwv-inline";

    const thumb = document.createElement("div");
    thumb.className = "hwv-inline-thumb";
    thumb.title = "Bấm để mở khung xem ảnh phần cứng thực tế";

    const fb = document.createElement("div");
    fb.className = "hwv-inline-fallback";
    fb.appendChild(createSvgIcon(item.svgIcon));
    const fbTxt = document.createElement("span");
    fbTxt.textContent = "Khung chờ ảnh";
    fb.appendChild(fbTxt);

    const img = document.createElement("img");
    img.alt = firstPhoto.label;
    img.src = BASE_PATH + firstPhoto.file;
    img.style.display = "none";

    thumb.appendChild(img);
    thumb.appendChild(fb);
    thumb.addEventListener("click", () => open(item.id));

    const info = document.createElement("div");
    info.className = "hwv-inline-info";

    const head = document.createElement("div");
    head.className = "hwv-inline-head";
    const hTitle = document.createElement("strong");
    hTitle.textContent = "Ảnh phần cứng thực tế · " + item.name;
    const status = document.createElement("span");
    status.className = "hwv-inline-status";
    status.textContent = "Chờ ảnh";
    head.appendChild(hTitle);
    head.appendChild(status);

    const pPath = document.createElement("p");
    pPath.className = "hwv-inline-path";
    const code = document.createElement("code");
    code.textContent = "images/53-58-iot-tuoi-cay/hardware/" + firstPhoto.file;
    pPath.appendChild(document.createTextNode(firstPhoto.hint + " File: "));
    pPath.appendChild(code);

    const inlineRefWrap = document.createElement("div");
    const inlineRefLink = createRefLink(item);
    if (inlineRefLink) inlineRefWrap.appendChild(inlineRefLink);

    info.appendChild(head);
    info.appendChild(pPath);
    if (inlineRefLink) info.appendChild(inlineRefWrap);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hwv-btn";
    btn.textContent = "📷 Xem ảnh";
    btn.addEventListener("click", () => open(item.id));

    img.addEventListener("load", () => {
      fb.style.display = "none";
      img.style.display = "block";
      status.textContent = "Đã có ảnh thật";
      status.classList.add("ready");
      pPath.textContent = firstPhoto.label;
    });
    img.addEventListener("error", () => {
      img.style.display = "none";
      fb.style.display = "flex";
    });

    wrap.appendChild(thumb);
    wrap.appendChild(info);
    wrap.appendChild(btn);
    containerEl.appendChild(wrap);
  }

  function addSvgPill(nodeEl, pillPos, onPillClick) {
    if (nodeEl.querySelector(".hwv-pill")) return;
    const boxRect = nodeEl.querySelector("rect");
    if (!boxRect) return;

    const rx = parseFloat(boxRect.getAttribute("x") || "0");
    const ry = parseFloat(boxRect.getAttribute("y") || "0");
    const w = parseFloat(boxRect.getAttribute("width") || "120");
    const h = parseFloat(boxRect.getAttribute("height") || "60");

    const pw = 46;
    const ph = 15;
    let px = rx + w - pw - 4;
    let py = ry + h - 5;

    if (pillPos === "tr") {
      px = rx + w - pw - 4;
      py = ry - 8;
    } else if (pillPos === "br-in") {
      px = rx + w - pw - 4;
      py = ry + h - ph - 3;
    } else if (pillPos === "center-b") {
      px = rx + (w - pw) / 2;
      py = ry + h - 5;
    }

    const ns = "http://www.w3.org/2000/svg";
    const pill = document.createElementNS(ns, "g");
    pill.setAttribute("class", "hwv-pill");

    const r = document.createElementNS(ns, "rect");
    r.setAttribute("x", String(px));
    r.setAttribute("y", String(py));
    r.setAttribute("width", String(pw));
    r.setAttribute("height", String(ph));
    r.setAttribute("rx", "7.5");

    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", String(px + pw / 2));
    t.setAttribute("y", String(py + 10.5));
    t.setAttribute("text-anchor", "middle");
    t.textContent = "📷 Ảnh";

    pill.appendChild(r);
    pill.appendChild(t);
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      onPillClick();
    });
    nodeEl.appendChild(pill);
  }

  function attachSvgTriggers(bindings) {
    injectStyles();
    if (!Array.isArray(bindings)) return;

    bindings.forEach((b) => {
      const el = document.querySelector(b.selector);
      if (!el || !ITEMS[b.id]) return;

      el.classList.add("hwv-svg-trigger");
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");

      if (!el.querySelector("title")) {
        const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleEl.textContent = ITEMS[b.id].name + " — Bấm để xem ảnh phần cứng thực tế";
        el.appendChild(titleEl);
      }

      const openTarget = () => open(b.id, b.group ? { group: b.group } : undefined);

      if (b.showPill !== false) {
        addSvgPill(el, b.pillPos || "br", openTarget);
      }

      if (b.openOnNodeClick !== false) {
        el.addEventListener("click", openTarget);
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openTarget();
          }
        });
      }
    });
  }

  window.IoTHardwareViewer = {
    open: open,
    close: close,
    renderInline: renderInline,
    attachSvgTriggers: attachSvgTriggers,
    hasItem: function (id) { return Boolean(ITEMS[id]); },
    getOrder: function () { return ORDER.slice(); }
  };
})();
