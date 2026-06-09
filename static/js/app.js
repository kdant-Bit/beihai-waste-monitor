const chartInstances = {};
let dashboardPayload = null;
let mapInstance = null;
let markerLayer = null;
let districtLayer = null;
let districtLabelLayer = null;
let cityLayer = null;
let activeDistrictName = null;
let mapBaseLayer = null;
let mapCanvasRenderer = null;


function stationDetailUrl(stationId) {
  return `/stations/${stationId}`;
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


function animateValue(element, target, suffix = "") {
  const duration = 1200;
  const stepTime = 16;
  const totalSteps = Math.max(1, Math.floor(duration / stepTime));
  let currentStep = 0;

  const timer = setInterval(() => {
    currentStep += 1;
    const progress = currentStep / totalSteps;
    const value = Math.round(target * progress);
    element.textContent = `${value}${suffix}`;
    if (currentStep >= totalSteps) {
      clearInterval(timer);
    }
  }, stepTime);
}


function updateClock() {
  const now = new Date();
  const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const text = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${days[now.getDay()]} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  document.getElementById("nowTime").textContent = text;
}


function hideLoader(hostId) {
  const host = document.getElementById(hostId);
  const loader = host?.parentElement?.querySelector(".chart-loader");
  if (loader) {
    loader.classList.add("hidden");
  }
}


function createChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) {
    throw new Error(`Chart container not found: ${domId}`);
  }
  if (!chartInstances[domId]) {
    chartInstances[domId] = echarts.init(dom);
  }
  return chartInstances[domId];
}


function renderWasteClass(chartData) {
  // title now in HTML
  const chart = createChart("chartClass");
  const colors = ["#4CAF50", "#9E9E9E", "#2196F3", "#F44336"];
  chart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: {c} 吨 ({d}%)" },
    legend: {
      orient: "vertical",
      right: 8,
      top: "center",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 12, color: "#5D4D40" },
    },
    series: [{
      type: "pie",
      center: ["40%", "50%"],
      radius: ["55%", "80%"],
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold" } },
      data: chartData.data.map((item, index) => ({
        ...item,
        itemStyle: { color: colors[index] },
      })),
    }],
  });
  hideLoader("chartClass");
}


function renderDistrict(chartData) {
  // title now in HTML
  const chart = createChart("chartDistrict");
  chart.setOption({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 34, right: 12, top: 26, bottom: 18, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.categories,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 11, margin: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 11, margin: 12 },
    },
    series: [{
      type: "bar",
      barWidth: "46%",
      data: chartData.values,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#4CAF50" },
          { offset: 1, color: "#A5D6A7" },
        ]),
      },
    }],
  });
  hideLoader("chartDistrict");
}


function renderDailyTrend(chartData) {
  // title now in HTML
  const chart = createChart("chartTrend");
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: {
      data: ["收集量", "回收量"],
      right: 16,
      top: 0,
      textStyle: { fontSize: 11, color: "#5D4D40" },
    },
    grid: { left: 56, right: 24, top: 36, bottom: 28, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.dates,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 11, margin: 12 },
    },
    series: [
      {
        name: "收集量",
        type: "bar",
        barWidth: "40%",
        data: chartData.collection,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#1565C0" },
            { offset: 1, color: "#90CAF9" },
          ]),
        },
      },
      {
        name: "回收量",
        type: "line",
        smooth: true,
        data: chartData.recycling,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#2E7D32", width: 2 },
        itemStyle: { color: "#2E7D32" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(46,125,50,0.15)" },
            { offset: 1, color: "rgba(46,125,50,0)" },
          ]),
        },
      },
    ],
  });
  hideLoader("chartTrend");
}


function renderMonthlyRate(chartData) {
  // title now in HTML
  const chart = createChart("chartRate");
  chart.setOption({
    tooltip: { trigger: "axis", formatter: "{b}: {c}%" },
    grid: { left: 34, right: 28, top: 26, bottom: 18, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.months,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 11, margin: 10 },
    },
    yAxis: {
      type: "value",
      min: 20,
      max: 50,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 11, margin: 12 },
    },
    series: [{
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      data: chartData.values,
      lineStyle: { color: "#2E7D32", width: 2.5 },
      itemStyle: { color: "#2E7D32", borderColor: "#fff", borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(46,125,50,0.2)" },
          { offset: 1, color: "rgba(46,125,50,0)" },
        ]),
      },
      markLine: {
        silent: true,
        symbol: "none",
        data: [{
          yAxis: chartData.target,
          lineStyle: { color: "#F44336", type: "dashed", width: 1 },
          label: {
            formatter: `目标线 ${chartData.target}%`,
            position: "insideEndTop",
            distance: 6,
            fontSize: 10,
            color: "#F44336",
          },
        }],
      },
    }],
  });
  hideLoader("chartRate");
}


function renderDistrictEfficiency(chartData) {
  // title now in HTML
  const chart = createChart("chartEfficiency");
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: {
      top: 0,
      textStyle: { fontSize: 11, color: "#5D4D40" },
    },
    grid: { left: 46, right: 18, top: 38, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.categories,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 11, margin: 10 },
    },
    yAxis: [
      {
        type: "value",
        name: "%",
        max: 50,
        splitLine: { lineStyle: { color: "#E2D8D0" } },
        axisLabel: { color: "#5D4D40", fontSize: 11 },
      },
      {
        type: "value",
        name: "吨",
        splitLine: { show: false },
        axisLabel: { color: "#8A7A6D", fontSize: 11 },
      },
    ],
    series: [
      {
        name: "资源化率",
        type: "bar",
        barWidth: "36%",
        data: chartData.recovery_rate,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#2E7D32" },
            { offset: 1, color: "#A5D6A7" },
          ]),
        },
      },
      {
        name: "平均日处理量",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: chartData.daily_average,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { color: "#1565C0", width: 2.5 },
        itemStyle: { color: "#1565C0" },
      },
    ],
  });
  hideLoader("chartEfficiency");
}


function renderStationTable(stations) {
  const html = [
    "<table><thead><tr><th>站点</th><th>位置</th><th>日收集量</th><th>状态</th><th>操作</th></tr></thead><tbody>",
    ...stations.map((station) => {
      const statusClass = station.status === "online" ? "status-online" : "status-offline";
      const statusText = station.status === "online" ? "运行中" : "离线";
      const rowClass = station.status === "offline" ? ' class="row-offline"' : "";
      return `<tr data-station-id="${station.id}" title="点击查看 ${station.name} 详情"${rowClass}><td>${station.name}</td><td>${station.address}</td><td>${station.daily_tons}吨</td><td><span class="station-status"><span class="status-dot ${statusClass}"></span>${statusText}</span></td><td class="station-action-cell"><span class="station-action-link">查看详情 →</span></td></tr>`;
    }),
    "</tbody></table>",
  ].join("");
  document.getElementById("stationTable").innerHTML = html;

  document.querySelectorAll("#stationTable tr[data-station-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = stationDetailUrl(row.getAttribute("data-station-id"));
    });
  });
}

function renderMetrics(metrics) {
  // Daily collect with trend
  const elCollect = document.getElementById("metricCollect");
  animateValue(elCollect, metrics.daily_collect, "");
  const trendCollect = document.getElementById("metricCollectTrend");
  if (trendCollect) {
    const arrow = metrics.daily_collect_change >= 0 ? "↑" : "↓";
    const cls = metrics.daily_collect_change >= 0 ? "trend-up" : "trend-down";
    trendCollect.innerHTML = "<span class=\"" + cls + "\">" + arrow + " " + Math.abs(metrics.daily_collect_change) + (metrics.daily_collect_pct != null ? " (" + Number(metrics.daily_collect_pct).toFixed(1) + "%)" : "") + "</span>";
    trendCollect.title = "vs 昨日" + metrics.daily_collect_yesterday + " 吨";
  }

  // Utilization rate with trend
  const elRate = document.getElementById("metricRate");
  animateValue(elRate, metrics.utilization_rate, "%");
  const trendRate = document.getElementById("metricRateTrend");
  if (trendRate) {
    const arrow = metrics.utilization_rate_change >= 0 ? "↑" : "↓";
    const cls = metrics.utilization_rate_change >= 0 ? "trend-up" : "trend-down";
    trendRate.innerHTML = "<span class=\"" + cls + "\">" + arrow + " " + Math.abs(metrics.utilization_rate_change) + "pp</span>";
    trendRate.title = "目标: " + metrics.utilization_rate_target + "%, vs 昨日 " + metrics.utilization_rate_yesterday + "%";
  }

  // Online stations
  const elStation = document.getElementById("metricStation");
  animateValue(elStation, metrics.online_stations, "");
  const trendStation = document.getElementById("metricStationSub");
  if (trendStation && metrics.online_stations_offline > 0) {
    trendStation.innerHTML = "<span class=\"trend-warn\">" + metrics.online_stations_offline + " 个站点离线</span>";
  }

  // Complaint KPI
  const elComplaint = document.getElementById("metricComplaint");
  const complaintData = metrics.complaint_total || dashboardPayload?.complaints?.total_month || 0;
  animateValue(elComplaint, complaintData, "");
  const trendComplaint = document.getElementById("metricComplaintTrend");
  if (trendComplaint && dashboardPayload?.complaints?.total_change != null) {
    const change = dashboardPayload.complaints.total_change;
    const arrow = change <= 0 ? "\u2193" : "\u2191";
    const cls = change <= 0 ? "trend-down" : "trend-up";
    trendComplaint.innerHTML = "<span class=\"" + cls + "\">" + arrow + " " + Math.abs(change) + " 件</span>";
  }
}


function renderOverviewList(stations) {
  const host = document.getElementById("overviewList");
  if (!host) return;
  host.innerHTML = stations.map((station) => `
    <div class="overview-item">
      <div class="overview-item-main">
        <span class="overview-item-name">${station.name}</span>
        <span class="overview-item-meta">${station.address}</span>
      </div>
      <a class="overview-link" href="${stationDetailUrl(station.id)}">查看详情</a>
    </div>
  `).join("");
}


function renderAlerts(alerts) {
  const banner = document.getElementById("alertBanner");
  if (!banner || !alerts || alerts.length === 0) {
    if (banner) banner.classList.add("hidden");
    return;
  }
  banner.classList.remove("hidden");
  banner.innerHTML = alerts.map(function(a) {
    var icon = a.level === "warning" ? "&#9888;" : "";
    return '<span class="alert-item alert-' + a.level + '">' + icon + ' ' + a.message + '</span>';
  }).join("");
}

function renderConclusions(conclusions) {
  const host = document.getElementById("analysisList");
  if (!host) return;
  const icons = { good: "&#10003;", warn: "&#9888;", bad: "&#10007;", info: "&#8505;" };
  host.innerHTML = conclusions.map(function(c) {
    return '<div class="conclusion-item conclusion-' + c.level + '">'
      + '<span class="conclusion-icon">' + (icons[c.level] || "") + '</span>'
      + '<span class="conclusion-text">' + c.text + '</span>'
      + '</div>';
  }).join("");
}


function renderStationLoad(chartData) {
  const chart = createChart("chartStationLoad");
  chart.setOption({
    grid: { left: 12, right: 12, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      show: false,
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: chartData.categories,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 11 },
    },
    series: [{
      type: "bar",
      data: chartData.values,
      barWidth: 12,
      label: {
        show: true,
        position: "right",
        color: "#5D4D40",
        fontSize: 11,
        formatter: "{c} 吨",
      },
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: "#A5D6A7" },
          { offset: 1, color: "#2E7D32" },
        ]),
      },
    }],
  });
}


function createMarkerIcon(status) {
  const color = status === "online" ? "#2E7D32" : "#E53935";
  return L.divIcon({
    className: "station-marker-icon",
    html: `<div class="station-marker-core" style="background:${color};"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

function renderDistrictSummary(districtName, stations) {
  const title = document.getElementById("districtPanelTitle");
  const hint = document.getElementById("districtPanelHint");
  const totalTons = stations.reduce((sum, item) => sum + Number(item.daily_tons || 0), 0);
  const onlineCount = stations.filter((item) => item.status === "online").length;
  const offlineCount = stations.length - onlineCount;

  if (title) {
    title.textContent = districtName ? `${districtName}站点汇总` : "站点状态";
  }
  if (hint) {
    hint.textContent = districtName
      ? `共 ${stations.length} 个站点 · 在线 ${onlineCount} · 离线 ${offlineCount} · ${totalTons} 吨/日`
      : "默认显示全市站点";
  }

  const summaryHtml = districtName ? `
    <div class="district-summary">
      <div class="district-summary-metric">
        <span class="district-summary-label">站点数量</span>
        <b>${stations.length}</b>
      </div>
      <div class="district-summary-metric">
        <span class="district-summary-label">在线站点</span>
        <b>${onlineCount}</b>
      </div>
      <div class="district-summary-metric">
        <span class="district-summary-label">离线站点</span>
        <b>${offlineCount}</b>
      </div>
      <div class="district-summary-metric">
        <span class="district-summary-label">日处理量</span>
        <b>${totalTons} 吨</b>
      </div>
    </div>
  ` : "";

  const html = [
    summaryHtml,
    "<table><thead><tr><th>站点</th><th>位置</th><th>日收集量</th><th>状态</th><th>操作</th></tr></thead><tbody>",
    ...stations.map((station) => {
      const statusClass = station.status === "online" ? "status-online" : "status-offline";
      const statusText = station.status === "online" ? "运行中" : "离线";
      const rowClass = station.status === "offline" ? ' class="row-offline"' : "";
      return `<tr data-station-id="${station.id}" title="点击查看 ${station.name} 详情"${rowClass}><td>${station.name}</td><td>${station.address}</td><td>${station.daily_tons}吨</td><td><span class="station-status"><span class="status-dot ${statusClass}"></span>${statusText}</span></td><td class="station-action-cell"><span class="station-action-link">查看详情 →</span></td></tr>`;
    }),
    "</tbody></table>",
  ].join("");
  document.getElementById("stationTable").innerHTML = html;

  document.querySelectorAll("#stationTable tr[data-station-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = stationDetailUrl(row.getAttribute("data-station-id"));
    });
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


function buildDistrictStationIndex(stations) {
  return stations.reduce((acc, station) => {
    const district = normalizeDistrictName(station.district);
    if (!district) return acc;
    if (!acc[district]) {
      acc[district] = { totalTons: 0, online: 0, total: 0, stations: [] };
    }
    acc[district].totalTons += Number(station.daily_tons || 0);
    acc[district].online += station.status === "online" ? 1 : 0;
    acc[district].total += 1;
    acc[district].stations.push(station);
    return acc;
  }, {});
}


function buildStationPopup(station) {
  const statusText = station.status === "online" ? "运行中" : "离线";
  const statusClass = station.status === "online" ? "online" : "offline";
  return `
    <div class="station-popup">
      <div class="station-popup-title">${station.name}</div>
      <div class="station-popup-row"><span>所属辖区</span><b>${station.district || "--"}</b></div>
      <div class="station-popup-row"><span>详细地址</span><b>${station.address || "--"}</b></div>
      <div class="station-popup-row"><span>日处理量</span><b>${Number(station.daily_tons || 0)} 吨</b></div>
      <div class="station-popup-row"><span>运行状态</span><b class="station-popup-status ${statusClass}">${statusText}</b></div>
    </div>
  `;
}


function buildStationTooltip(station) {
  const statusText = station.status === "online" ? "运行中" : "离线";
  return `
    <div class="station-hover-card">
      <div class="station-hover-name">${station.name}</div>
      <div class="station-hover-meta">${station.district || "--"} · ${statusText}</div>
      <div class="station-hover-meta">${Number(station.daily_tons || 0)} 吨/日</div>
    </div>
  `;
}


function createDistrictLabel(name, summary) {
  return L.divIcon({
    className: "district-label-wrapper",
    html: `
      <div class="district-label-chip">
        <div class="district-label-name">${name}</div>
        <div class="district-label-meta">${summary.online}/${summary.total} 在线 · ${summary.totalTons} 吨/日</div>
      </div>
    `,
    iconSize: [132, 44],
    iconAnchor: [66, 22],
  });
}


function renderGuangxiCities(geojson) {
  if (cityLayer) {
    cityLayer.remove();
  }

  cityLayer = L.geoJSON(geojson, {
    renderer: mapCanvasRenderer,
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
    onEachFeature(feature, layer) {
      const name = feature?.properties?.name || "";
      if (name !== "北海市") {
        layer.bindTooltip(name, { sticky: true, direction: "top", className: "city-tooltip" });
      }
    },
    interactive: false,
  }).addTo(mapInstance);
}


function getStationsByDistrict(stations, districtName) {
  return stations.filter((station) => normalizeDistrictName(station.district) === normalizeDistrictName(districtName));
}


function setActiveDistrictStyle(layer, isActive) {
  const name = layer?.feature?.properties?.name || "";
  const color = getDistrictColor(name);
  layer.setStyle({
    color,
    weight: isActive ? 3.5 : 2.2,
    opacity: 1,
    fillColor: color,
    fillOpacity: isActive ? 0.24 : 0.14,
    dashArray: null,
  });
}


function renderDistrictPolygons(geojson, stations) {
  const districtIndex = buildDistrictStationIndex(stations);

  if (districtLayer) {
    districtLayer.remove();
  }
  if (districtLabelLayer) {
    districtLabelLayer.clearLayers();
  } else {
    districtLabelLayer = L.layerGroup().addTo(mapInstance);
  }

  districtLayer = L.geoJSON(geojson, {
    renderer: mapCanvasRenderer,
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
      const summary = districtIndex[normalizeDistrictName(name)] || { totalTons: 0, online: 0, total: 0 };
      layer.bindTooltip(
        `${name}<br/>在线站点：${summary.online}/${summary.total}<br/>日处理量：${summary.totalTons} 吨`,
        { sticky: true, direction: "top", className: "district-tooltip" }
      );

      const center = feature?.properties?.centroid || feature?.properties?.center;
      if (Array.isArray(center) && center.length === 2) {
        L.marker([center[1], center[0]], {
          icon: createDistrictLabel(name, summary),
          interactive: false,
        }).addTo(districtLabelLayer);
      }

      layer.on("mouseover", () => {
        if (activeDistrictName !== name) {
          layer.setStyle({ weight: 3, fillOpacity: 0.3 });
        }
      });
      layer.on("mouseout", () => {
        setActiveDistrictStyle(layer, activeDistrictName === name);
      });
      layer.on("click", () => {
        activeDistrictName = name;
        districtLayer.eachLayer((districtPolygon) => {
          const districtPolygonName = districtPolygon?.feature?.properties?.name || "";
          setActiveDistrictStyle(districtPolygon, districtPolygonName === activeDistrictName);
        });
        renderDistrictSummary(name, getStationsByDistrict(stations, name));
      });
    },
  }).addTo(mapInstance);

  mapInstance.fitBounds(districtLayer.getBounds(), { padding: [18, 18] });
  districtLayer.eachLayer((layer) => {
    setActiveDistrictStyle(layer, activeDistrictName === layer?.feature?.properties?.name);
  });
}


async function renderMap(stations) {
  if (!mapInstance) {
    mapInstance = L.map("mapContainer", {
      center: [21.48, 109.12],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    mapCanvasRenderer = L.canvas({ padding: 0.5 });
    mapBaseLayer = createLightRoadLayer();
    mapBaseLayer.addTo(mapInstance);

    const beihaiBounds = L.latLngBounds(
      L.latLng(21.18, 108.85),
      L.latLng(21.85, 109.65),
    );
    mapInstance.setMaxBounds(beihaiBounds.pad(0.08));
    mapInstance.setMinZoom(9);
    mapInstance.setView([21.52, 109.18], 10);
    mapInstance.on("zoomstart", () => {
      toggleLayerVisibility(districtLabelLayer, false);
      toggleLayerVisibility(markerLayer, false);
    });
    mapInstance.on("zoomend", () => {
      toggleLayerVisibility(districtLabelLayer, true);
      toggleLayerVisibility(markerLayer, true);
    });
  }

  try {
    const guangxiCities = await loadGuangxiCities();
    renderGuangxiCities(guangxiCities);
  } catch (error) {
    console.warn("Guangxi background map unavailable:", error);
  }
  const districts = await loadBeihaiDistricts();
  renderDistrictPolygons(districts, stations);

  if (markerLayer) {
    markerLayer.clearLayers();
  } else {
    markerLayer = L.layerGroup().addTo(mapInstance);
  }

  stations.forEach((station) => {
    const marker = L.marker([station.lat, station.lng], {
      icon: createMarkerIcon(station.status),
    }).addTo(markerLayer);

    marker.bindTooltip(buildStationTooltip(station), {
      direction: "top",
      offset: [0, -12],
      opacity: 1,
      className: "station-hover-tooltip",
    });
    marker.bindPopup(buildStationPopup(station), {
      className: "station-popup-wrap",
      offset: [0, -8],
    });
    marker.on("mouseover", () => {
      marker.openTooltip();
    });
    marker.on("mouseout", () => {
      marker.closeTooltip();
    });
    marker.on("click", () => {
      window.location.href = stationDetailUrl(station.id);
    });
  });

  hideLoader("mapContainer");
  window.setTimeout(() => mapInstance.invalidateSize(), 50);
}


function bindResize() {
  window.addEventListener("resize", () => {
    Object.values(chartInstances).forEach((chart) => chart.resize());
    if (mapInstance) {
      mapInstance.invalidateSize();
    }
  });
}



function renderEnvMonitor(envData) {
  document.getElementById("envAqi").textContent = envData.air_quality.aqi;
  document.getElementById("envPm25").textContent = envData.air_quality.pm25;
  document.getElementById("envPm10").textContent = envData.air_quality.pm10;

  const chart = createChart("chartEmission");
  chart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 16, top: 12, bottom: 20, containLabel: true },
    xAxis: {
      type: "category",
      data: envData.emission.categories,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10, margin: 8 },
    },
    series: [
      {
        type: "bar",
        barWidth: "40%",
        data: envData.emission.values,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#FF8A65" }, { offset: 1, color: "#FFCCBC" },
          ]),
        },
      },
      {
        type: "line",
        data: envData.emission.limits,
        symbol: "none",
        lineStyle: { color: "#E53935", type: "dashed", width: 1 },
        name: "限值",
      },
    ],
  });
}

function renderComplaints(complaintData) {
  const chart = createChart("chartComplaint");
  chart.setOption({
    tooltip: { trigger: "item" },
    legend: {
      orient: "vertical",
      right: 4,
      top: "center",
      itemWidth: 8, itemHeight: 8,
      textStyle: { fontSize: 10, color: "#5D4D40" },
    },
    series: [{
      type: "pie",
      radius: ["50%", "75%"],
      center: ["42%", "52%"],
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13 } },
      data: complaintData.categories.map(function(name, i) {
        return { name: name, value: complaintData.values[i] };
      }),
      itemStyle: {
        borderRadius: 2,
        borderColor: "#FFF8F5", borderWidth: 2,
      },
    }],
  });
}

function renderCapacityAlerts(alertData) {
  var host = document.getElementById("capacityAlerts");
  var levels = { high: "danger", medium: "warning", low: "normal" };
  var labels = { high: "高", medium: "中", low: "低" };
  host.innerHTML = alertData.alerts.map(function(a) {
    return "<div class=\"capacity-item capacity-" + levels[a.level] + "\">"
      + "<div class=\"capacity-station\">" + a.station + " <span class=\"capacity-badge\">" + labels[a.level] + "</span></div>"
      + "<div class=\"capacity-bar-wrap\"><div class=\"capacity-bar capacity-bar-" + levels[a.level] + "\" style=\"width:" + a.load_pct + "%\"></div></div>"
      + "<div class=\"capacity-msg\">" + a.message + "</div>"
      + "</div>";
  }).join("");
}

function renderEquipment(equipData) {
  var chart = createChart("chartEquipment");
  chart.setOption({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 64, right: 20, top: 10, bottom: 12, containLabel: true },
    xAxis: {
      type: "value", max: 20,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    yAxis: {
      type: "category",
      data: equipData.categories,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    series: [
      {
        type: "bar", name: "在线",
        barWidth: 10, barGap: "20%",
        data: equipData.online_counts,
        itemStyle: { color: "#4CAF50", borderRadius: [0, 3, 3, 0] },
      },
      {
        type: "bar", name: "离线",
        barWidth: 10,
        data: equipData.total_counts.map(function(t, i) { return t - equipData.online_counts[i]; }),
        itemStyle: { color: "#EF9A9A", borderRadius: [0, 3, 3, 0] },
      },
    ],
  });
}

function renderTransport(transportData) {
  var chart = createChart("chartTransport");
  chart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 10, bottom: 28, containLabel: true },
    xAxis: {
      type: "category",
      data: transportData.routes,
      axisLabel: { color: "#5D4D40", fontSize: 10, rotate: 20 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value", min: 60, max: 100,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10, formatter: "{value}%" },
    },
    series: [{
      type: "bar",
      barWidth: "45%",
      data: transportData.efficiency,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#1565C0" }, { offset: 1, color: "#90CAF9" },
        ]),
      },
      markLine: {
        silent: true, symbol: "none",
        data: [{ yAxis: transportData.on_time_rate, lineStyle: { color: "#2E7D32", type: "dashed" } }],
      },
    }],
  });
}

function renderAiAlerts(aiData) {
  var host = document.getElementById("aiAlerts");
  var icons = { danger: "\u26A0", warning: "\u26A0", info: "\u2139" };
  host.innerHTML = aiData.predictions.map(function(p) {
    return "<div class=\"ai-item ai-" + p.level + "\">"
      + "<div class=\"ai-item-head\"><span class=\"ai-icon\">" + (icons[p.level] || "") + "</span>"
      + "<span class=\"ai-prob\">" + p.probability + "%</span></div>"
      + "<div class=\"ai-item-text\">" + p.message + "</div>"
      + "</div>";
  }).join("");
}

function renderAiDispatch(dispatchData) {
  var host = document.getElementById("aiDispatch");
  host.innerHTML = dispatchData.recommendations.map(function(r) {
    return "<div class=\"dispatch-item\">"
      + "<div class=\"dispatch-priority\">#" + r.priority + "</div>"
      + "<div class=\"dispatch-body\">"
      + "<div class=\"dispatch-action\">" + r.action + "</div>"
      + "<div class=\"dispatch-reason\">" + r.reason + "</div>"
      + "</div>"
      + "<div class=\"dispatch-eta\">" + r.eta + "</div>"
      + "</div>";
  }).join("");
}

function renderForecast(forecastData) {
  var chart = createChart("chartForecast");
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: {
      data: ["收集预测", "回收预测"],
      bottom: 0,
      textStyle: { fontSize: 11, color: "#5D4D40" },
    },
    grid: { left: 48, right: 24, top: 16, bottom: 36, containLabel: true },
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
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(21,101,192,0.15)" },
            { offset: 1, color: "rgba(21,101,192,0)" },
          ]),
        },
        lineStyle: { color: "#1565C0", width: 2.5 },
        itemStyle: { color: "#1565C0" },
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
    ],
  });
}

async function bootstrap() {
  updateClock();
  setInterval(updateClock, 1000);
  bindResize();

  const response = await fetch("/api/dashboard");
  dashboardPayload = await response.json();

  document.getElementById("headerCity").textContent = dashboardPayload.meta.city;
  document.getElementById("headerTitle").textContent = dashboardPayload.meta.title;
  document.getElementById("headerSubtitle").textContent = dashboardPayload.meta.subtitle;

  renderAlerts(dashboardPayload.alerts);
  renderMetrics(dashboardPayload.metrics);
  renderWasteClass(dashboardPayload.charts.waste_class);
  renderDistrictSummary("", dashboardPayload.stations);
  renderOverviewList(dashboardPayload.stations);
  renderEnvMonitor(dashboardPayload.environment);
  renderComplaints(dashboardPayload.complaints);
  renderCapacityAlerts(dashboardPayload.capacity_alerts);
  renderEquipment(dashboardPayload.equipment);
  renderTransport(dashboardPayload.transport);
  renderMap(dashboardPayload.stations);
}


document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error("Dashboard bootstrap failed:", error);
  });
});
