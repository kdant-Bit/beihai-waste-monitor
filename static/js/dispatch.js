const dispatchCharts = {};
let dispatchMap = null;
let dispatchBaseLayer = null;
let dispatchCanvasRenderer = null;
let dispatchCityLayer = null;
let dispatchDistrictLayer = null;
let dispatchDistrictLabels = null;
let dispatchMarkerLayer = null;
let dispatchFlowData = null;
let dispatchFlowFrame = null;

function getDispatchChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) {
    throw new Error(`Missing dispatch chart container: ${domId}`);
  }
  if (!dispatchCharts[domId]) {
    dispatchCharts[domId] = echarts.init(dom);
  }
  return dispatchCharts[domId];
}

function createLightRoadLayer() {
  return L.layerGroup([
    L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}", {
      subdomains: "1234",
      maxZoom: 18,
      className: "light-road-tile",
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 2,
    }),
    L.tileLayer("https://webst0{s}.is.autonavi.com/appmaptile?lang=zh_cn&style=8&x={x}&y={y}&z={z}", {
      subdomains: "1234",
      maxZoom: 18,
      className: "light-road-label-tile",
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 2,
    }),
  ]);
}

function toggleLayerVisibility(layerGroup, visible) {
  if (!layerGroup) return;
  layerGroup.eachLayer((layer) => {
    const element = typeof layer.getElement === "function" ? layer.getElement() : null;
    if (element) {
      element.style.visibility = visible ? "visible" : "hidden";
    }
  });
}

async function loadBeihaiDistricts() {
  const response = await fetch("/api/beihai-districts");
  if (!response.ok) {
    throw new Error("Failed to load Beihai districts");
  }
  return response.json();
}

async function loadGuangxiCities() {
  const response = await fetch("/api/guangxi-cities");
  if (!response.ok) {
    throw new Error("Failed to load Guangxi cities");
  }
  return response.json();
}

function getDistrictColor(name) {
  const palette = {
    "海城区": "#4CAF50",
    "银海区": "#29B6F6",
    "铁山港区": "#FFA726",
    "合浦县": "#AB47BC",
  };
  return palette[name] || "#66BB6A";
}

function normalizeDistrictName(name) {
  return String(name || "").replace(/\s+/g, "").trim();
}

function createDistrictLabel(name, summary) {
  return L.divIcon({
    className: "district-label-wrapper",
    html: `
      <div class="district-label-chip">
        <div class="district-label-name">${name}</div>
        <div class="district-label-meta">${summary.total} 站 · ${summary.totalTons} 吨/日</div>
      </div>
    `,
    iconSize: [132, 44],
    iconAnchor: [66, 22],
  });
}

function renderGuangxiCities(geojson) {
  if (dispatchCityLayer) {
    dispatchCityLayer.remove();
  }
  dispatchCityLayer = L.geoJSON(geojson, {
    renderer: dispatchCanvasRenderer,
    smoothFactor: 1.2,
    style(feature) {
      const name = feature?.properties?.name || "";
      const isBeihai = name === "北海市";
      return {
        color: isBeihai ? "#90A49A" : "#C8D0CB",
        weight: isBeihai ? 1.2 : 1,
        opacity: 0.9,
        fillColor: isBeihai ? "#EAF4EC" : "#E2E6E3",
        fillOpacity: isBeihai ? 0.08 : 0.26,
      };
    },
    interactive: false,
  }).addTo(dispatchMap);
}

function renderDistrictPolygons(geojson, points) {
  const districtIndex = points.reduce((acc, point) => {
    const district = normalizeDistrictName(point.district);
    if (!acc[district]) {
      acc[district] = { totalTons: 0, total: 0 };
    }
    acc[district].totalTons += Number(point.daily_tons || 0);
    acc[district].total += 1;
    return acc;
  }, {});

  if (dispatchDistrictLayer) {
    dispatchDistrictLayer.remove();
  }
  if (dispatchDistrictLabels) {
    dispatchDistrictLabels.clearLayers();
  } else {
    dispatchDistrictLabels = L.layerGroup().addTo(dispatchMap);
  }

  dispatchDistrictLayer = L.geoJSON(geojson, {
    renderer: dispatchCanvasRenderer,
    smoothFactor: 1,
    style(feature) {
      const name = feature?.properties?.name || "";
      const color = getDistrictColor(name);
      return {
        color,
        weight: 2.2,
        opacity: 0.95,
        fillColor: color,
        fillOpacity: 0.14,
      };
    },
    onEachFeature(feature, layer) {
      const name = feature?.properties?.name || "";
      const summary = districtIndex[normalizeDistrictName(name)] || { totalTons: 0, total: 0 };
      layer.bindTooltip(
        `${name}<br/>站点数：${summary.total}<br/>日处理量：${summary.totalTons} 吨`,
        { sticky: true, direction: "top", className: "district-tooltip" }
      );

      const center = feature?.properties?.centroid || feature?.properties?.center;
      if (Array.isArray(center) && center.length === 2) {
        L.marker([center[1], center[0]], {
          icon: createDistrictLabel(name, summary),
          interactive: false,
        }).addTo(dispatchDistrictLabels);
      }
    },
  }).addTo(dispatchMap);
}

function createDispatchMarkerIcon(point) {
  const color = point.status === "offline" ? "#E53935" : point.alert_level === "high" ? "#FB8C00" : "#2E7D32";
  return L.divIcon({
    className: "station-marker-icon",
    html: `<div class="station-marker-core" style="background:${color}; width:18px; height:18px;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function buildDispatchTooltip(point) {
  return `
    <div class="station-hover-card">
      <div class="station-hover-name">${point.name}</div>
      <div class="station-hover-meta">${point.district} · 负荷 ${point.load_pct}%</div>
      <div class="station-hover-meta">${point.daily_tons} 吨/日 · ${point.status === "offline" ? "离线" : "在线"}</div>
    </div>
  `;
}

function renderDispatchMarkers(points) {
  if (dispatchMarkerLayer) {
    dispatchMarkerLayer.clearLayers();
  } else {
    dispatchMarkerLayer = L.layerGroup().addTo(dispatchMap);
  }

  points.forEach((point) => {
    const marker = L.marker([point.lat, point.lng], {
      icon: createDispatchMarkerIcon(point),
    }).addTo(dispatchMarkerLayer);

    marker.bindTooltip(buildDispatchTooltip(point), {
      direction: "top",
      offset: [0, -12],
      opacity: 1,
      className: "station-hover-tooltip",
    });
    marker.on("mouseover", () => marker.openTooltip());
    marker.on("mouseout", () => marker.closeTooltip());
  });
}

function ensureDispatchMap() {
  if (dispatchMap) {
    return;
  }

  dispatchMap = L.map("dispatchMap", {
    center: [21.52, 109.18],
    zoom: 10,
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  });
  dispatchCanvasRenderer = L.canvas({ padding: 0.5 });
  dispatchBaseLayer = createLightRoadLayer();
  dispatchBaseLayer.addTo(dispatchMap);

  const beihaiBounds = L.latLngBounds(
    L.latLng(21.18, 108.85),
    L.latLng(21.85, 109.65),
  );
  dispatchMap.setMaxBounds(beihaiBounds.pad(0.08));
  dispatchMap.setMinZoom(9);

  dispatchMap.on("zoomstart", () => {
    toggleLayerVisibility(dispatchDistrictLabels, false);
    toggleLayerVisibility(dispatchMarkerLayer, false);
  });
  dispatchMap.on("zoomend", () => {
    toggleLayerVisibility(dispatchDistrictLabels, true);
    toggleLayerVisibility(dispatchMarkerLayer, true);
    redrawDispatchOverlay();
  });
  dispatchMap.on("moveend", redrawDispatchOverlay);
}

function drawDispatchOverlay(mapData) {
  const svg = document.getElementById("dispatchMapSvg");
  svg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "dispatch-flow-arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");

  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrow.setAttribute("d", "M0,0 L0,6 L9,3 z");
  arrow.setAttribute("fill", "#1565C0");
  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "flow-lines-group");
  svg.appendChild(group);

  mapData.links.forEach((link) => {
    const start = dispatchMap.latLngToContainerPoint([link.from_coord[1], link.from_coord[0]]);
    const end = dispatchMap.latLngToContainerPoint([link.to_coord[1], link.to_coord[0]]);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - 28;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#1565C0");
    path.setAttribute("stroke-width", "2.3");
    path.setAttribute("stroke-opacity", "0.88");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("marker-end", "url(#dispatch-flow-arrow)");
    group.appendChild(path);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(midX));
    label.setAttribute("y", String(midY - 6));
    label.setAttribute("fill", "#2F4F33");
    label.setAttribute("font-size", "10");
    label.setAttribute("text-anchor", "middle");
    label.textContent = `${link.from} → ${link.to} · ${link.volume} 吨`;
    group.appendChild(label);
  });
}

function redrawDispatchOverlay() {
  if (!dispatchMap || !dispatchFlowData) {
    return;
  }
  if (dispatchFlowFrame) {
    cancelAnimationFrame(dispatchFlowFrame);
  }
  dispatchFlowFrame = requestAnimationFrame(() => {
    drawDispatchOverlay(dispatchFlowData);
    dispatchFlowFrame = null;
  });
}

async function renderDispatchMap(mapData) {
  dispatchFlowData = mapData;
  ensureDispatchMap();

  try {
    const guangxiCities = await loadGuangxiCities();
    renderGuangxiCities(guangxiCities);
  } catch (error) {
    console.warn("Guangxi background map unavailable:", error);
  }

  const beihaiDistricts = await loadBeihaiDistricts();
  renderDistrictPolygons(beihaiDistricts, mapData.points);
  renderDispatchMarkers(mapData.points);
  dispatchMap.fitBounds(dispatchDistrictLayer.getBounds(), { padding: [18, 18] });
  redrawDispatchOverlay();
  setTimeout(() => dispatchMap.invalidateSize(), 50);
}

function renderDispatchSummary(summary) {
  document.getElementById("dispatchWarnings").textContent = `${summary.warning_count}`;
  document.getElementById("dispatchUrgent").textContent = `${summary.urgent_count}`;
  document.getElementById("dispatchActions").textContent = `${summary.dispatch_count}`;
  document.getElementById("dispatchPeak").textContent = `${summary.peak_hour} / ${summary.peak_load}吨`;
}

function renderAlerts(alertData) {
  const host = document.getElementById("dispatchAlerts");
  const icons = { danger: "\u26A0", warning: "\u26A0", info: "\u2139" };
  host.innerHTML = alertData.predictions.map((item) => `
    <div class="ai-item ai-${item.level}">
      <div class="ai-item-head">
        <span class="ai-icon">${icons[item.level] || ""}</span>
        <span class="ai-prob">${item.probability}%</span>
      </div>
      <div class="ai-item-text">${item.message}</div>
    </div>
  `).join("");
}

function renderRecommendations(dispatchData) {
  const host = document.getElementById("dispatchRecommendations");
  host.innerHTML = dispatchData.recommendations.map((item) => `
    <div class="dispatch-item">
      <div class="dispatch-priority">#${item.priority}</div>
      <div class="dispatch-body">
        <div class="dispatch-action">${item.action}</div>
        <div class="dispatch-reason">${item.reason}</div>
      </div>
      <div class="dispatch-eta">${item.eta}</div>
    </div>
  `).join("");
}

function renderOverview(payload) {
  const summary = payload.summary;
  const host = document.getElementById("dispatchOverview");
  host.innerHTML = `
    <div class="dispatch-overview-card">
      <div class="dispatch-overview-title">当前首要动作</div>
      <div class="dispatch-overview-main">${summary.top_action}</div>
    </div>
    <div class="dispatch-overview-list">
      <div class="dispatch-overview-row"><span>峰值时段</span><b>${summary.peak_hour}</b></div>
      <div class="dispatch-overview-row"><span>峰值负荷</span><b>${summary.peak_load} 吨</b></div>
      <div class="dispatch-overview-row"><span>运力准点率</span><b>${payload.transport.on_time_rate}%</b></div>
      <div class="dispatch-overview-row"><span>AQI</span><b>${payload.environment.air_quality.aqi}</b></div>
    </div>
  `;
}

function renderForecast(forecastData) {
  const chart = getDispatchChart("dispatchForecastChart");
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: {
      data: ["收集预测", "回收预测", "上置信区间", "下置信区间"],
      bottom: 0,
      textStyle: { fontSize: 11, color: "#5D4D40" },
    },
    grid: { left: 48, right: 24, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: forecastData.hours,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    series: [
      {
        name: "收集预测",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#1565C0", width: 2.5 },
        itemStyle: { color: "#1565C0" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(21,101,192,0.15)" },
            { offset: 1, color: "rgba(21,101,192,0)" },
          ]),
        },
        data: forecastData.collection_forecast,
      },
      {
        name: "回收预测",
        type: "line",
        smooth: true,
        symbol: "diamond",
        symbolSize: 6,
        lineStyle: { color: "#2E7D32", width: 2.5 },
        itemStyle: { color: "#2E7D32" },
        data: forecastData.recycling_forecast,
      },
      {
        name: "上置信区间",
        type: "line",
        symbol: "none",
        lineStyle: { color: "#90CAF9", type: "dashed" },
        data: forecastData.confidence_upper,
      },
      {
        name: "下置信区间",
        type: "line",
        symbol: "none",
        lineStyle: { color: "#A5D6A7", type: "dashed" },
        data: forecastData.confidence_lower,
      },
    ],
  });
}

function renderTransport(transportData) {
  const chart = getDispatchChart("dispatchTransportChart");
  chart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 44, right: 20, top: 16, bottom: 30, containLabel: true },
    xAxis: {
      type: "category",
      data: transportData.routes,
      axisLabel: { color: "#5D4D40", fontSize: 10 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#D0C8C0" } },
    },
    yAxis: {
      type: "value",
      min: 60,
      max: 100,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10, formatter: "{value}%" },
    },
    series: [{
      type: "bar",
      barWidth: "44%",
      data: transportData.efficiency,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#29B6F6" },
          { offset: 1, color: "#90CAF9" },
        ]),
      },
      markLine: {
        silent: true,
        symbol: "none",
        data: [{ yAxis: transportData.on_time_rate, lineStyle: { color: "#2E7D32", type: "dashed" } }],
      },
    }],
  });
}

function renderCapacity(alertData) {
  const host = document.getElementById("dispatchCapacity");
  const levels = { high: "danger", medium: "warning", low: "normal" };
  const labels = { high: "高", medium: "中", low: "低" };
  host.innerHTML = alertData.alerts.map((item) => `
    <div class="capacity-item capacity-${levels[item.level]}">
      <div class="capacity-station">${item.station} <span class="capacity-badge">${labels[item.level]}</span></div>
      <div class="capacity-bar-wrap"><div class="capacity-bar capacity-bar-${levels[item.level]}" style="width:${item.load_pct}%"></div></div>
      <div class="capacity-msg">${item.message}</div>
    </div>
  `).join("");
}

function renderStations(stations) {
  const host = document.getElementById("dispatchStations");
  const topStations = [...stations]
    .sort((a, b) => Number(b.daily_tons || 0) - Number(a.daily_tons || 0))
    .slice(0, 6);

  host.innerHTML = topStations.map((station) => `
    <div class="dispatch-station-item" data-station-id="${station.id}">
      <div>
        <div class="dispatch-station-name">${station.name}</div>
        <div class="dispatch-station-meta">${station.district} · ${station.address}</div>
      </div>
      <div class="dispatch-station-value">${station.daily_tons} 吨/日</div>
    </div>
  `).join("");

  host.querySelectorAll("[data-station-id]").forEach((item) => {
    item.addEventListener("click", () => {
      window.location.href = `/stations/${item.getAttribute("data-station-id")}`;
    });
  });
}

async function bootstrapDispatch() {
  const response = await fetch("/api/dispatch");
  if (!response.ok) {
    throw new Error("Failed to load dispatch data.");
  }

  const payload = await response.json();
  document.getElementById("dispatchTitle").textContent = payload.meta.title;
  document.getElementById("dispatchSubtitle").textContent = payload.meta.subtitle;
  renderDispatchSummary(payload.summary);
  renderAlerts(payload.alerts);
  renderRecommendations(payload.dispatch);
  renderOverview(payload);
  renderForecast(payload.forecast);
  renderTransport(payload.transport);
  renderCapacity(payload.capacity_alerts);
  renderStations(payload.stations);
  await renderDispatchMap(payload.dispatch_map);
}

window.addEventListener("resize", () => {
  Object.values(dispatchCharts).forEach((chart) => chart.resize());
  if (dispatchMap) {
    dispatchMap.invalidateSize();
    redrawDispatchOverlay();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  bootstrapDispatch().catch((error) => {
    console.error("Dispatch bootstrap failed:", error);
  });
});
