const detailCharts = {};


function getDetailChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) {
    throw new Error(`Missing detail chart container: ${domId}`);
  }
  if (!detailCharts[domId]) {
    detailCharts[domId] = echarts.init(dom);
  }
  return detailCharts[domId];
}


function renderStationMeta(station) {
  document.getElementById("stationPageTitle").textContent = `${station.name} 详情`;
  document.getElementById("detailName").textContent = station.name;
  document.getElementById("detailAddress").textContent = `${station.district} · ${station.address}`;
  document.getElementById("detailCollector").textContent = `负责人：${station.collector}`;

  const statusBadge = document.getElementById("detailStatus");
  const isOnline = station.status === "online";
  statusBadge.textContent = isOnline ? "运行中" : "离线";
  statusBadge.classList.toggle("offline", !isOnline);

  document.getElementById("detailDailyTons").textContent = `${station.daily_tons} 吨`;
  document.getElementById("detailCapacity").textContent = `${station.capacity || "--"} 吨/日`;
  document.getElementById("detailHours").textContent = station.operation_hours;
  document.getElementById("detailEquipment").textContent = `${station.equipment_online}/${station.equipment_total}`;
  document.getElementById("detailDistrict").textContent = station.district;
  document.getElementById("detailClassCount").textContent = `${station.classification?.length || 0} 类`;

  const loadPct = Number(station.load_pct || 0);
  const loadPctEl = document.getElementById("detailLoadPct");
  const loadBar = document.getElementById("detailLoadBar");
  const loadHint = document.getElementById("detailLoadHint");
  loadPctEl.textContent = `${loadPct}%`;
  loadBar.style.width = `${Math.min(100, loadPct)}%`;
  loadBar.className = "detail-load-bar";
  if (loadPct >= 85) {
    loadBar.classList.add("load-high");
    loadHint.textContent = "高负荷运行，建议关注转运频次与备用设备。";
  } else if (loadPct >= 70) {
    loadBar.classList.add("load-medium");
    loadHint.textContent = "负荷偏高，建议保持设备巡检。";
  } else {
    loadBar.classList.add("load-normal");
    loadHint.textContent = "负荷处于平稳区间，运行状态良好。";
  }
}


function renderClassificationChart(station) {
  const chart = getDetailChart("stationClassChart");
  chart.setOption({
    color: ["#4CAF50", "#9E9E9E", "#2196F3", "#F44336"],
    tooltip: { trigger: "item", formatter: "{b}: {c} 吨" },
    series: [{
      type: "pie",
      radius: ["48%", "72%"],
      center: ["50%", "54%"],
      label: {
        color: "#5D4D40",
        fontSize: 12,
        formatter: "{b}\n{d}%",
      },
      data: station.classification,
    }],
  });
}


function renderTrendChart(station) {
  const total = station.classification.reduce((sum, item) => sum + item.value, 0);
  const categories = station.classification.map((item) => item.name);
  const categoryColors = {
    "厨余垃圾": "#4CAF50",
    "其他垃圾": "#9E9E9E",
    "可回收物": "#2196F3",
    "有害垃圾": "#F44336",
  };
  const stackedSeries = station.classification.map((item) => {
    const ratio = total > 0 ? item.value / total : 0;
    const dailyValues = station.weekly_trend.values.map((dayValue) => {
      return Number((dayValue * ratio).toFixed(1));
    });
    return {
      name: item.name,
      type: "bar",
      stack: "total",
      barWidth: "42%",
      data: dailyValues,
      itemStyle: {
        color: categoryColors[item.name],
        borderRadius: item.name === "厨余垃圾" ? [4, 4, 0, 0] : 0,
      },
      label: {
        show: true,
        position: "inside",
        formatter: Math.round(ratio * 100) >= 8 ? `${Math.round(ratio * 100)}%` : "",
        color: "#FFFFFF",
        fontSize: 10,
      },
    };
  });

  const chart = getDetailChart("stationTrendChart");
  chart.setOption({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const lines = [`<b>${params[0].axisValue}</b>`];
        params.forEach((item) => {
          lines.push(`${item.marker}${item.seriesName}: ${item.value} 吨`);
        });
        return lines.join("<br/>");
      },
    },
    legend: {
      top: 0,
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: "#5D4D40", fontSize: 11 },
    },
    grid: { left: 48, right: 18, top: 44, bottom: 26, containLabel: true },
    xAxis: {
      type: "category",
      data: station.weekly_trend.dates,
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
      name: "日总量",
      type: "line",
      smooth: true,
      data: station.weekly_trend.values,
      symbol: "circle",
      symbolSize: 8,
      yAxisIndex: 0,
      lineStyle: { color: "#2E7D32", width: 3 },
      itemStyle: { color: "#2E7D32" },
    }, ...stackedSeries],
  });
}


async function bootstrapStationPage() {
  const response = await fetch(`/api/stations/${window.STATION_ID}`);
  if (!response.ok) {
    throw new Error("Failed to load station detail.");
  }
  const station = await response.json();
  renderStationMeta(station);
  renderClassificationChart(station);
  renderTrendChart(station);
}


window.addEventListener("resize", () => {
  Object.values(detailCharts).forEach((chart) => chart.resize());
});


document.addEventListener("DOMContentLoaded", () => {
  bootstrapStationPage().catch((error) => {
    console.error("Station detail bootstrap failed:", error);
  });
});
