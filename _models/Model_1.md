---
title: "Model 1"
date: 2025-08-18
permalink: /models/model-1/
layout: single
---

<!-- nạp thư viện viewer một lần trên trang -->
<script type="module"
  src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>

<!-- nhúng GLB -->
<model-viewer
  src="{{ '/files/models/model1.glb' | relative_url }}"
  poster="{{ '/images/cover-model1.jpg' | relative_url }}"   <!-- tùy chọn -->
  camera-controls
  auto-rotate
  style="width:100%;max-width:900px;height:520px;background:transparent;display:block;margin:auto;">
</model-viewer>

Mô tả ngắn về mô hình…
