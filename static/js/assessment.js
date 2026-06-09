const assessmentCharts = {};
let assessmentFlowMap = null;
let assessmentFlowMarkers = null;
let assessmentDistrictLayer = null;
let assessmentDistrictLabels = null;
let assessmentCityLayer = null;
let assessmentBaseLayer = null;
let assessmentCanvasRenderer = null;

function updateAssessmentClock() {
  const now = new Date();
  const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const text = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${days[now.getDay()]} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const host = document.getElementById("assessmentNowTime");
  if (host) {
    host.textContent = text;
  }
}

function getAssessmentChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) {
    throw new Error(`Missing assessment chart container: ${domId}`);
  }
  if (!assessmentCharts[domId]) {
    assessmentCharts[domId] = echarts.init(dom);
  }
  return assessmentCharts[domId];
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

function renderSummary(summary) {
  document.getElementById("summaryOutput").textContent = `${summary.total_output} 吨`;
  document.getElementById("summaryRecycling").textContent = `${summary.total_recycling} 吨`;
  document.getElementById("summaryCapacity").textContent = `${summary.average_capacity} 吨/日`;
  document.getElementById("summaryTopStation").textContent = summary.top_station;
}

function renderRankingTable(rankings) {
  const html = [
    "<table><thead><tr><th>排名</th><th>站点</th><th>回收量</th><th>产出量</th><th>能力</th><th>评分</th></tr></thead><tbody>",
    ...rankings.map((item, index) => `
      <tr>
        <td><span class="rank-badge">${index + 1}</span></td>
        <td>${item.name}</td>
        <td>${item.recycling}</td>
        <td>${item.output}</td>
        <td>${item.capacity}</td>
        <td><b>${item.score}</b></td>
      </tr>
    `),
    "</tbody></table>",
  ].join("");
  document.getElementById("rankingTable").innerHTML = html;
}

function renderVerticalBar(chartData) {
  const chart = getAssessmentChart("assessmentVerticalChart");
  chart.setOption({
    grid: { left: 38, right: 18, top: 28, bottom: 70, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "category",
      data: chartData.categories,
      axisLabel: {
        interval: 0,
        rotate: 36,
        color: "#5D4D40",
        fontSize: 10,
        overflow: "truncate",
        width: 66,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#D0C8C0" } },
    },
    yAxis: {
      type: "value",
      max: 100,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    series: [{
      type: "bar",
      data: chartData.values,
      barWidth: "42%",
      label: { show: true, position: "top", color: "#5D4D40", fontSize: 10 },
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#2E7D32" },
          { offset: 1, color: "#A5D6A7" },
        ]),
      },
    }],
  });
}

function renderHorizontalBar(chartData) {
  const chart = getAssessmentChart("assessmentHorizontalChart");
  chart.setOption({
    grid: { left: 120, right: 64, top: 18, bottom: 20, containLabel: false },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: chartData.categories,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 10, interval: 0, width: 104, overflow: "break" },
    },
    series: [{
      type: "bar",
      data: chartData.values,
      barWidth: 12,
      barCategoryGap: "34%",
      label: { show: true, position: "right", color: "#5D4D40", fontSize: 10, formatter: "{c} 吨/日" },
      itemStyle: {
        borderRadius: [0, 8, 8, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: "#A5D6A7" },
          { offset: 1, color: "#2E7D32" },
        ]),
      },
    }],
  });
}

function renderHeatmap(chartData) {
  const chart = getAssessmentChart("assessmentHeatmapChart");
  chart.setOption({
    tooltip: {
      position: "top",
      formatter(params) {
        return `${chartData.yAxis[params.data[1]]}<br/>${chartData.xAxis[params.data[0]]}: ${params.data[2]}`;
      },
    },
    grid: { left: 86, right: 14, top: 18, bottom: 38, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.xAxis,
      splitArea: { show: true },
      axisLabel: { color: "#5D4D40", fontSize: 10, interval: 0 },
    },
    yAxis: {
      type: "category",
      data: chartData.yAxis,
      splitArea: { show: true },
      axisLabel: { color: "#5D4D40", fontSize: 10, overflow: "truncate", width: 76 },
    },
    visualMap: {
      min: 20,
      max: 190,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 2,
      itemWidth: 8,
      itemHeight: 72,
      text: ["190", "20"],
      textStyle: { color: "#5D4D40", fontSize: 9 },
      inRange: { color: ["#F5EFEA", "#A5D6A7", "#2E7D32"] },
    },
    series: [{
      type: "heatmap",
      data: chartData.values,
      label: { show: false },
      emphasis: {
        itemStyle: {
          borderColor: "#2E7D32",
          borderWidth: 1,
          shadowBlur: 6,
          shadowColor: "rgba(46,125,50,0.18)",
        },
      },
    }],
  });
}

function renderTree(chartData) {
  const chart = getAssessmentChart("assessmentTreeChart");
  const root = chartData.data || { name: "区域站点", children: [] };
  const districts = (root.children || []).map((district) => {
    const stations = district.children || [];
    const total = stations.reduce((sum, station) => sum + Number(station.value || 0), 0);
    return { name: district.name, value: total, stations };
  });
  const topStations = districts
    .flatMap((district) => district.stations.map((station) => ({
      name: station.name,
      value: Number(station.value || 0),
      district: district.name,
    })))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const maxStationValue = Math.max(...topStations.map((station) => station.value), 1);

  chart.setOption({
    tooltip: {
      trigger: "item",
      formatter(params) {
        if (params.seriesName === "区域汇总") {
          return `${params.name}<br/>总处理能力：${params.value} 吨/日<br/>占比：${params.percent}%`;
        }
        const item = topStations[params.dataIndex];
        return `${item.district} / ${item.name}<br/>处理能力：${item.value} 吨/日`;
      },
    },
    color: ["#66BB6A", "#29B6F6", "#FFA726", "#AB47BC"],
    graphic: [{
      type: "text",
      left: 12,
      top: "50%",
      style: {
        text: "Top 站点处理能力",
        fill: "#6D7D6D",
        font: "600 11px sans-serif",
      },
    }],
    grid: {
      left: 88,
      right: 34,
      top: "58%",
      bottom: 20,
      containLabel: false,
    },
    xAxis: {
      type: "value",
      show: false,
      max: Math.ceil(maxStationValue * 1.18),
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: topStations.map((station) => station.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 10, overflow: "truncate", width: 78 },
    },
    series: [
      {
        name: "区域汇总",
        type: "pie",
        radius: ["24%", "39%"],
        center: ["50%", "27%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: "rgba(255,255,255,0.92)",
          borderWidth: 2,
        },
        label: {
          color: "#2F4F33",
          fontSize: 10,
          lineHeight: 13,
          formatter: "{b}\n{c}",
        },
        labelLine: { length: 6, length2: 4, lineStyle: { color: "#9AAC9F" } },
        data: districts,
      },
      {
        name: "Top站点",
        type: "bar",
        data: topStations.map((station) => station.value),
        barWidth: 7,
        barCategoryGap: "42%",
        label: { show: true, position: "right", color: "#2F4F33", fontSize: 10, formatter: "{c}" },
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "#C8E6C9" },
            { offset: 1, color: "#43A047" },
          ]),
        },
      },
    ],
  });
}

function renderAssessmentTrend(chartData) {
  const chart = getAssessmentChart("assessmentTrendChart");
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: {
      data: ["收集量", "回收量"],
      right: 16,
      top: 0,
      textStyle: { fontSize: 11, color: "#5D4D40" },
    },
    grid: { left: 54, right: 28, top: 36, bottom: 30, containLabel: true },
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
      axisLabel: { color: "#5D4D40", fontSize: 10 },
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
        lineStyle: { color: "#2E7D32", width: 2.5 },
        itemStyle: { color: "#2E7D32" },
      },
    ],
  });
}

function renderAssessmentMonthlyRate(chartData) {
  const chart = getAssessmentChart("assessmentRateChart");
  chart.setOption({
    tooltip: { trigger: "axis", formatter: "{b}: {c}%" },
    grid: { left: 38, right: 28, top: 24, bottom: 22, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.months,
      axisLine: { lineStyle: { color: "#D0C8C0" } },
      axisTick: { show: false },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 20,
      max: 50,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    series: [{
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 7,
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
          label: { formatter: `目标 ${chartData.target}%`, fontSize: 10, color: "#F44336" },
        }],
      },
    }],
  });
}

function renderAssessmentConclusions(conclusions) {
  const host = document.getElementById("assessmentAnalysisList");
  if (!host) return;
  const icons = { good: "&#10003;", warn: "&#9888;", bad: "&#10007;", info: "&#8505;" };
  host.innerHTML = conclusions.map((item) => `
    <div class="conclusion-item conclusion-${item.level}">
      <span class="conclusion-icon">${icons[item.level] || ""}</span>
      <span class="conclusion-text">${item.text}</span>
    </div>
  `).join("");
}

function renderAssessmentAiAlerts(aiData) {
  const host = document.getElementById("assessmentAiAlerts");
  if (!host) return;
  const icons = { danger: "⚠", warning: "⚠", info: "ℹ" };
  host.innerHTML = aiData.predictions.map((item) => `
    <div class="ai-item ai-${item.level}">
      <div class="ai-item-head"><span class="ai-icon">${icons[item.level] || ""}</span><span class="ai-prob">${item.probability}%</span></div>
      <div class="ai-item-text">${item.message}</div>
    </div>
  `).join("");
}

function renderAssessmentAiDispatch(dispatchData) {
  const host = document.getElementById("assessmentAiDispatch");
  if (!host) return;
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

function buildStationTooltip(point, centerName) {
  const isCenter = point.name === centerName;
  return `
    <div class="station-hover-card">
      <div class="station-hover-name">${point.name}</div>
      <div class="station-hover-meta">${isCenter ? "中心枢纽站" : "评估站点"}</div>
      <div class="station-hover-meta">${point.value} 吨/日</div>
    </div>
  `;
}

function createMarkerIcon(color, size = 18) {
  return L.divIcon({
    className: "station-marker-icon",
    html: `<div class="station-marker-core" style="background:${color}; width:${size}px; height:${size}px;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -12],
  });
}

function buildDistrictPointIndex(points) {
  const mapping = {
    "北部湾广场站": "海城区",
    "工业园区站": "海城区",
    "老城转运站": "海城区",
    "银滩站": "银海区",
    "侨港站": "银海区",
    "银滩东区站": "银海区",
    "铁山港站": "铁山港区",
    "机场物流园站": "合浦县",
    "廉州西片区站": "合浦县",
    "合浦站": "合浦县",
  };

  return points.reduce((acc, point) => {
    const district = mapping[point.name];
    if (!district) return acc;
    if (!acc[district]) {
      acc[district] = { totalTons: 0, total: 0, online: 0 };
    }
    acc[district].totalTons += Number(point.value || 0);
    acc[district].total += 1;
    acc[district].online += point.name === "合浦站" ? 0 : 1;
    return acc;
  }, {});
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
  if (assessmentCityLayer) {
    assessmentCityLayer.remove();
  }
  assessmentCityLayer = L.geoJSON(geojson, {
    renderer: assessmentCanvasRenderer,
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
  }).addTo(assessmentFlowMap);
}

function renderDistrictPolygons(geojson, chartData) {
  const districtIndex = buildDistrictPointIndex(chartData.points);

  if (assessmentDistrictLayer) {
    assessmentDistrictLayer.remove();
  }
  if (assessmentDistrictLabels) {
    assessmentDistrictLabels.clearLayers();
  } else {
    assessmentDistrictLabels = L.layerGroup().addTo(assessmentFlowMap);
  }

  assessmentDistrictLayer = L.geoJSON(geojson, {
    renderer: assessmentCanvasRenderer,
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
      const summary = districtIndex[normalizeDistrictName(name)] || { totalTons: 0, total: 0, online: 0 };
      layer.bindTooltip(
        `${name}<br/>评估站点：${summary.total}<br/>日处理量：${summary.totalTons} 吨`,
        { sticky: true, direction: "top", className: "district-tooltip" }
      );

      const center = feature?.properties?.centroid || feature?.properties?.center;
      if (Array.isArray(center) && center.length === 2) {
        L.marker([center[1], center[0]], {
          icon: createDistrictLabel(name, summary),
          interactive: false,
        }).addTo(assessmentDistrictLabels);
      }
    },
  }).addTo(assessmentFlowMap);
}

function ensureAssessmentMap() {
  if (assessmentFlowMap) {
    return;
  }

  assessmentFlowMap = L.map("assessmentFlowMap", {
    center: [21.52, 109.18],
    zoom: 10,
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  });
  assessmentCanvasRenderer = L.canvas({ padding: 0.5 });
  assessmentBaseLayer = createLightRoadLayer();
  assessmentBaseLayer.addTo(assessmentFlowMap);

  const beihaiBounds = L.latLngBounds(
    L.latLng(21.18, 108.85),
    L.latLng(21.85, 109.65),
  );
  assessmentFlowMap.setMaxBounds(beihaiBounds.pad(0.08));
  assessmentFlowMap.setMinZoom(9);
  assessmentFlowMarkers = L.layerGroup().addTo(assessmentFlowMap);
  assessmentFlowMap.on("zoomstart", () => {
    toggleLayerVisibility(assessmentDistrictLabels, false);
    toggleLayerVisibility(assessmentFlowMarkers, false);
  });
  assessmentFlowMap.on("zoomend", () => {
    toggleLayerVisibility(assessmentDistrictLabels, true);
    toggleLayerVisibility(assessmentFlowMarkers, true);
  });
}

async function renderFlow(chartData) {
  ensureAssessmentMap();

  try {
    const guangxiCities = await loadGuangxiCities();
    renderGuangxiCities(guangxiCities);
  } catch (error) {
    console.warn("Guangxi background map unavailable:", error);
  }

  const beihaiDistricts = await loadBeihaiDistricts();
  renderDistrictPolygons(beihaiDistricts, chartData);

  assessmentFlowMarkers.clearLayers();
  chartData.points.forEach((point) => {
    const isCenter = point.name === chartData.center.name;
    const marker = L.marker([point.coord[1], point.coord[0]], {
      icon: createMarkerIcon(isCenter ? "#2E7D32" : "#1565C0", isCenter ? 20 : 16),
    }).addTo(assessmentFlowMarkers);

    marker.bindTooltip(buildStationTooltip(point, chartData.center.name), {
      direction: "top",
      offset: [0, -12],
      opacity: 1,
      className: "station-hover-tooltip",
    });
    marker.on("mouseover", () => marker.openTooltip());
    marker.on("mouseout", () => marker.closeTooltip());
  });

  assessmentFlowMap.fitBounds(assessmentDistrictLayer.getBounds(), { padding: [18, 18] });
  setTimeout(() => assessmentFlowMap.invalidateSize(), 50);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

async function bootstrapAssessment() {
  const [assessmentPayload, dashboardPayload] = await Promise.all([
    fetchJson("/api/assessment"),
    fetchJson("/api/dashboard"),
  ]);

  document.getElementById("assessmentTitle").textContent = assessmentPayload.meta.title;
  renderSummary(assessmentPayload.summary);
  renderRankingTable(assessmentPayload.rankings);
  renderVerticalBar(assessmentPayload.charts.vertical_bar);
  renderHorizontalBar(assessmentPayload.charts.horizontal_bar);
  renderHeatmap(assessmentPayload.charts.heatmap);
  renderTree(assessmentPayload.charts.tree);
  renderAssessmentTrend(dashboardPayload.charts.daily_trend);
  renderAssessmentMonthlyRate(dashboardPayload.charts.monthly_rate);
  renderAssessmentConclusions(dashboardPayload.analysis.conclusions);
  renderAssessmentAiAlerts(dashboardPayload.ai_alerts);
  renderAssessmentAiDispatch(dashboardPayload.ai_dispatch);
  await renderFlow(assessmentPayload.charts.flows);
}

window.addEventListener("resize", () => {
  Object.values(assessmentCharts).forEach((chart) => chart.resize());
  if (assessmentFlowMap) {
    assessmentFlowMap.invalidateSize();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  updateAssessmentClock();
  setInterval(updateAssessmentClock, 1000);
  bootstrapAssessment().catch((error) => {
    console.error("Assessment bootstrap failed:", error);
  });
});
