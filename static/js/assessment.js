const assessmentCharts = {};
let assessmentFlowMap = null;
let assessmentFlowData = null;
let assessmentFlowMarkers = null;
let assessmentDistrictLayer = null;
let assessmentDistrictLabels = null;
let assessmentCityLayer = null;
let assessmentBaseLayer = null;
let assessmentCanvasRenderer = null;

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
    "<table><thead><tr><th>排名</th><th>站点</th><th>回收量</th><th>产出量</th><th>处理能力</th><th>评分</th></tr></thead><tbody>",
    ...rankings.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.recycling}</td>
        <td>${item.output}</td>
        <td>${item.capacity}</td>
        <td>${item.score}</td>
      </tr>
    `),
    "</tbody></table>",
  ].join("");
  document.getElementById("rankingTable").innerHTML = html;
}

function renderVerticalBar(chartData) {
  const chart = getAssessmentChart("assessmentVerticalChart");
  chart.setOption({
    grid: { left: 34, right: 18, top: 18, bottom: 50, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "category",
      data: chartData.categories,
      axisLabel: { rotate: 32, color: "#5D4D40", fontSize: 10 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#D0C8C0" } },
    },
    yAxis: {
      type: "value",
      max: 100,
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 11 },
    },
    series: [{
      type: "bar",
      data: chartData.values,
      barWidth: "50%",
      label: { show: true, position: "top", color: "#5D4D40" },
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
    grid: { left: 76, right: 20, top: 18, bottom: 18, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#E2D8D0" } },
      axisLabel: { color: "#5D4D40", fontSize: 11 },
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
      barWidth: 14,
      barCategoryGap: "30%",
      label: { show: true, position: "right", color: "#5D4D40", formatter: "{c} 吨/日" },
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
    grid: { left: 90, right: 20, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      data: chartData.xAxis,
      splitArea: { show: true },
      axisLabel: { color: "#5D4D40", fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: chartData.yAxis,
      splitArea: { show: true },
      axisLabel: { color: "#5D4D40", fontSize: 10 },
    },
    visualMap: {
      min: 20,
      max: 190,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#F5EFEA", "#A5D6A7", "#2E7D32"] },
    },
    series: [{
      type: "heatmap",
      data: chartData.values,
      label: { show: true, color: "#3D3530", fontSize: 10 },
    }],
  });
}

function renderTree(chartData) {
  const chart = getAssessmentChart("assessmentTreeChart");
  chart.setOption({
    tooltip: { trigger: "item", triggerOn: "mousemove" },
    series: [{
      type: "tree",
      data: [chartData.data],
      top: "4%",
      left: "8%",
      bottom: "4%",
      right: "20%",
      symbolSize: 10,
      lineStyle: { color: "#8A7A6D", width: 1.2 },
      label: { color: "#5D4D40", fontSize: 11, verticalAlign: "middle", align: "right" },
      leaves: { label: { position: "right", align: "left", color: "#2E7D32" } },
      expandAndCollapse: true,
      initialTreeDepth: 2,
      animationDuration: 550,
    }],
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
  assessmentFlowData = chartData;
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

async function bootstrapAssessment() {
  const response = await fetch("/api/assessment");
  if (!response.ok) {
    throw new Error("Failed to load assessment data.");
  }
  const payload = await response.json();
  document.getElementById("assessmentTitle").textContent = payload.meta.title;
  renderSummary(payload.summary);
  renderRankingTable(payload.rankings);
  renderVerticalBar(payload.charts.vertical_bar);
  renderHorizontalBar(payload.charts.horizontal_bar);
  renderHeatmap(payload.charts.heatmap);
  renderTree(payload.charts.tree);
  await renderFlow(payload.charts.flows);
}

window.addEventListener("resize", () => {
  Object.values(assessmentCharts).forEach((chart) => chart.resize());
  if (assessmentFlowMap) {
    assessmentFlowMap.invalidateSize();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  bootstrapAssessment().catch((error) => {
    console.error("Assessment bootstrap failed:", error);
  });
});
