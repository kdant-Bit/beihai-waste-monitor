from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"

RAW_FILES = [
    "stations.json",
    "map_points.json",
    "daily_collection.json",
    "district.json",
    "monthly_rate.json",
    "waste_class.json",
]

# 课程设计演示数据需要稳定的路由 ID，避免中文站名直接进入 URL。
STATION_ID_BY_NAME = {
    "北部湾广场站": "beibuwan-square",
    "银滩站": "yintan",
    "侨港站": "qiaogang",
    "铁山港站": "tieshangang",
    "合浦站": "hepu",
    "工业园区站": "industrial-park",
    "老城转运站": "old-town-transfer",
    "银滩东区站": "yintan-east",
    "机场物流园站": "airport-logistics",
    "廉州西片区站": "lianzhou-west",
}

# 原始 JSON 字段较少，以下映射用于补齐大屏演示所需的设备、能力、分类等业务字段。
STATION_SUPPLEMENT = {
    "北部湾广场站": {"district": "海城区", "operation_hours": "06:00 - 22:00", "equipment_online": 8, "equipment_total": 8, "capacity": 150, "classification": [54, 39, 33, 8]},
    "银滩站": {"district": "银海区", "operation_hours": "07:00 - 22:00", "equipment_online": 6, "equipment_total": 7, "capacity": 132, "classification": [46, 35, 30, 9]},
    "侨港站": {"district": "银海区", "operation_hours": "06:30 - 21:30", "equipment_online": 5, "equipment_total": 6, "capacity": 124, "classification": [42, 33, 27, 8]},
    "铁山港站": {"district": "铁山港区", "operation_hours": "07:30 - 21:00", "equipment_online": 4, "equipment_total": 5, "capacity": 118, "classification": [36, 29, 25, 8]},
    "合浦站": {"district": "合浦县", "operation_hours": "08:00 - 20:00", "equipment_online": 3, "equipment_total": 5, "capacity": 110, "classification": [26, 21, 18, 7]},
    "工业园区站": {"district": "海城区", "operation_hours": "24小时运行", "equipment_online": 10, "equipment_total": 10, "capacity": 168, "classification": [58, 44, 37, 11]},
    "老城转运站": {"address": "海城区四川南路", "collector": "周明辉", "daily_tons": 140, "status": "online", "lat": 21.47, "lng": 109.10, "district": "海城区", "operation_hours": "06:00 - 23:00", "equipment_online": 9, "equipment_total": 9, "capacity": 155, "classification": [55, 43, 33, 9]},
    "银滩东区站": {"address": "银海区金海岸大道", "collector": "梁晓云", "daily_tons": 124, "status": "online", "lat": 21.41, "lng": 109.20, "district": "银海区", "operation_hours": "07:00 - 22:30", "equipment_online": 7, "equipment_total": 7, "capacity": 138, "classification": [48, 37, 30, 9]},
    "机场物流园站": {"address": "合浦县北海大道西延线", "collector": "冯建平", "daily_tons": 170, "status": "online", "lat": 21.54, "lng": 109.25, "district": "合浦县", "operation_hours": "24小时运行", "equipment_online": 11, "equipment_total": 12, "capacity": 185, "classification": [61, 58, 40, 11]},
    "廉州西片区站": {"address": "合浦县廉州镇西环路", "collector": "黄淑敏", "daily_tons": 167, "status": "online", "lat": 21.67, "lng": 109.16, "district": "合浦县", "operation_hours": "06:30 - 22:00", "equipment_online": 8, "equipment_total": 9, "capacity": 178, "classification": [64, 51, 41, 11]},
}

CLASS_NAMES = ["厨余垃圾", "其他垃圾", "可回收物", "有害垃圾"]
DISTRICTS = ["海城区", "银海区", "铁山港区", "合浦县"]
BEIHAI_BOUNDS = {"min_lat": 21.18, "max_lat": 21.85, "min_lng": 108.85, "max_lng": 109.65}

COMPLAINTS = {
    "title": "投诉分析",
    "total_month": 47,
    "total_change": -12,
    "categories": ["噪音扰民", "异味污染", "运输洒漏", "分类不规范", "其他"],
    "values": [18, 12, 8, 6, 3],
    "trend_dates": ["5/15", "5/18", "5/21", "5/24", "5/27", "5/29"],
    "trend_values": [11, 9, 8, 7, 6, 5],
}


def read_json(filename: str) -> Any:
    return json.loads((DATA_DIR / filename).read_text(encoding="utf-8-sig"))


def write_json(filename: str, payload: dict[str, Any]) -> None:
    target = PROCESSED_DIR / filename
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_divide(numerator: float, denominator: float, default: float = 0) -> float:
    return numerator / denominator if denominator else default


def parse_tons(value: Any) -> tuple[int, bool]:
    if isinstance(value, (int, float)):
        return int(value), False
    match = re.search(r"\d+", str(value))
    return (int(match.group()), True) if match else (0, False)


def normalize_status(value: str) -> tuple[str, bool]:
    text = str(value).strip().lower()
    normalized = "online" if text in {"online", "运行中", "正常"} else "offline"
    return normalized, text != normalized


def district_from_address(address: str) -> str:
    for district in DISTRICTS:
        if district in address:
            return district
    return "未分区"


def calculate_load_pct(daily_tons: int, capacity: int) -> int:
    return round(safe_divide(daily_tons, capacity) * 100)


def load_raw_sources() -> dict[str, Any]:
    return {filename: read_json(filename) for filename in RAW_FILES}


def init_quality(raw_sources: dict[str, Any]) -> dict[str, Any]:
    return {
        "input_files": RAW_FILES,
        "raw_station_count": len(raw_sources["stations.json"]),
        "raw_map_point_count": len(raw_sources["map_points.json"]),
        "target_station_count": len(STATION_ID_BY_NAME),
        "daily_tons_converted_count": 0,
        "status_standardized_count": 0,
        "supplemented_station_count": 0,
        "field_fill_count": 0,
        "filled_fields": [],
        "coordinate_source": Counter(),
        "validation": {},
    }


def record_fill(quality: dict[str, Any], station_name: str, field: str, source: str) -> None:
    quality["field_fill_count"] += 1
    quality["filled_fields"].append({"station": station_name, "field": field, "source": source})


def clean_station_records(raw_sources: dict[str, Any], quality: dict[str, Any]) -> list[dict[str, Any]]:
    raw_stations = {item["name"]: item for item in raw_sources["stations.json"]}
    raw_points = {item["name"]: item for item in raw_sources["map_points.json"]}
    cleaned: list[dict[str, Any]] = []

    for name, station_id in STATION_ID_BY_NAME.items():
        raw = raw_stations.get(name, {})
        point = raw_points.get(name, {})
        supplement = STATION_SUPPLEMENT[name]
        if not raw:
            quality["supplemented_station_count"] += 1

        value = point.get("value", [])
        raw_daily = raw.get("daily", supplement.get("daily_tons", value[2] if len(value) >= 3 else 0))
        daily_tons, converted = parse_tons(raw_daily)
        if converted:
            quality["daily_tons_converted_count"] += 1

        raw_status = raw.get("status", supplement.get("status", point.get("status", "online")))
        status, standardized = normalize_status(raw_status)
        if standardized:
            quality["status_standardized_count"] += 1

        cleaned.append(
            {
                "id": station_id,
                "name": name,
                "address": raw.get("address") or point.get("address") or supplement.get("address"),
                "collector": raw.get("collector") or supplement.get("collector"),
                "daily_tons": daily_tons,
                "raw_daily": raw_daily,
                "status": status,
                "raw_status": raw_status,
                "lat": value[1] if len(value) >= 2 else supplement.get("lat"),
                "lng": value[0] if len(value) >= 1 else supplement.get("lng"),
                "district": supplement.get("district") or district_from_address(raw.get("address", "")),
                "source": "raw+map" if raw and point else "supplemented",
            }
        )
    return cleaned


def enrich_station_records(cleaned: list[dict[str, Any]], quality: dict[str, Any]) -> list[dict[str, Any]]:
    stations: list[dict[str, Any]] = []
    for record in cleaned:
        name = record["name"]
        supplement = STATION_SUPPLEMENT[name]
        station = dict(record)

        for field in ["address", "collector", "district"]:
            if not station.get(field):
                station[field] = supplement.get(field) or "未配置"
                record_fill(quality, name, field, "station_supplement")

        if not station.get("lat") or not station.get("lng"):
            station["lat"] = supplement.get("lat")
            station["lng"] = supplement.get("lng")
            record_fill(quality, name, "lat/lng", "station_supplement")
            quality["coordinate_source"]["supplement"] += 1
        else:
            quality["coordinate_source"]["map_points"] += 1

        for field in ["operation_hours", "equipment_online", "equipment_total", "capacity"]:
            station[field] = supplement[field]
            record_fill(quality, name, field, "station_supplement")

        classification = [
            {"name": class_name, "value": value}
            for class_name, value in zip(CLASS_NAMES, supplement["classification"])
        ]
        station["classification"] = classification
        station["load_pct"] = calculate_load_pct(station["daily_tons"], station["capacity"])
        station["weekly_trend"] = build_weekly_trend(station["daily_tons"], station["status"])
        station.pop("raw_daily", None)
        station.pop("raw_status", None)
        stations.append(station)
    return stations


def build_weekly_trend(daily_tons: int, status: str) -> dict[str, Any]:
    weekly_values = [max(0, round(daily_tons * factor)) for factor in [0.93, 0.96, 0.98, 1.01, 1.03, 0.99, 1.0]]
    if status == "offline":
        weekly_values[-3:-1] = [0, 0]
    return {
        "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
        "values": weekly_values,
    }


def validate_stations(stations: list[dict[str, Any]], quality: dict[str, Any]) -> dict[str, Any]:
    ids = [station["id"] for station in stations]
    duplicated_ids = [station_id for station_id, count in Counter(ids).items() if count > 1]
    missing_fields = []
    coordinate_anomalies = []

    for station in stations:
        for field in ["id", "name", "address", "daily_tons", "status", "lat", "lng", "district"]:
            if station.get(field) in {None, "", 0} and field not in {"daily_tons"}:
                missing_fields.append({"station": station["name"], "field": field})
        lat = station.get("lat")
        lng = station.get("lng")
        if not (BEIHAI_BOUNDS["min_lat"] <= lat <= BEIHAI_BOUNDS["max_lat"] and BEIHAI_BOUNDS["min_lng"] <= lng <= BEIHAI_BOUNDS["max_lng"]):
            coordinate_anomalies.append({"station": station["name"], "lat": lat, "lng": lng})

    high_load = [station for station in stations if station["load_pct"] >= 85]
    offline = [station for station in stations if station["status"] != "online"]
    validation = {
        "standardized_station_count": len(stations),
        "online_station_count": len(stations) - len(offline),
        "offline_station_count": len(offline),
        "offline_stations": [station["name"] for station in offline],
        "high_load_station_count": len(high_load),
        "high_load_stations": [{"name": station["name"], "load_pct": station["load_pct"]} for station in high_load],
        "duplicated_ids": duplicated_ids,
        "missing_fields": missing_fields,
        "coordinate_anomalies": coordinate_anomalies,
    }
    quality["validation"] = validation
    quality["coordinate_source"] = dict(quality["coordinate_source"])
    return validation


def aggregate_district_values(stations: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "title": "各区垃圾日产量（吨）",
        "categories": DISTRICTS,
        "values": [sum(station["daily_tons"] for station in stations if station["district"] == district) for district in DISTRICTS],
    }


def build_analysis(metrics: dict[str, Any], stations: list[dict[str, Any]]) -> dict[str, Any]:
    offline = [station for station in stations if station["status"] != "online"]
    top_station = max(stations, key=lambda item: item["daily_tons"])
    return {
        "conclusions": [
            {"level": "good", "text": f"今日收集总量 {metrics['daily_collect']} 吨，较昨日 {metrics['daily_collect_change']:+d} 吨（{metrics['daily_collect_pct']:+.1f}%），运行态势稳定。"},
            {"level": "warn", "text": f"资源化利用率 {metrics['utilization_rate']}%，距目标 {metrics['utilization_rate_target']}% 还差 {metrics['utilization_rate_target'] - metrics['utilization_rate']} 个百分点。"},
            {"level": "bad", "text": f"{offline[0]['name']} 当前离线，影响 {offline[0]['district']} 区域在线监测覆盖。" if offline else "当前重点站点全部在线，监测覆盖完整。"},
            {"level": "info", "text": f"{top_station['name']} 日处理量 {top_station['daily_tons']} 吨为全市最高，应关注高峰期转运压力。"},
            {"level": "good", "text": "厨余垃圾与可回收物占比持续提升，说明源头分类和回收体系具备优化空间。"},
        ]
    }


def build_dashboard_payload(raw_sources: dict[str, Any], stations: list[dict[str, Any]]) -> dict[str, Any]:
    daily = raw_sources["daily_collection.json"]
    waste_class = raw_sources["waste_class.json"]
    monthly_rate = raw_sources["monthly_rate.json"]

    daily_collect = sum(station["daily_tons"] for station in stations)
    yesterday = daily["collection"][-2]
    recycling_today = daily["recycling"][-1]
    utilization_rate = round(safe_divide(recycling_today, daily_collect) * 100)
    utilization_rate_yesterday = round(safe_divide(daily["recycling"][-2], yesterday) * 100)
    online = sum(1 for station in stations if station["status"] == "online")
    total = len(stations)
    district = aggregate_district_values(stations)
    station_load = sorted(stations, key=lambda item: item["daily_tons"], reverse=True)[:6]
    high_load = [station for station in stations if station["load_pct"] >= 85]
    medium_load = [station for station in stations if 75 <= station["load_pct"] < 85]

    metrics = {
        "daily_collect": daily_collect,
        "daily_collect_yesterday": yesterday,
        "daily_collect_change": daily_collect - yesterday,
        "daily_collect_pct": round(safe_divide(daily_collect - yesterday, yesterday) * 100, 1),
        "utilization_rate": utilization_rate,
        "utilization_rate_yesterday": utilization_rate_yesterday,
        "utilization_rate_change": utilization_rate - utilization_rate_yesterday,
        "utilization_rate_target": 40,
        "online_stations": online,
        "online_stations_total": total,
        "online_stations_offline": total - online,
        "complaint_total": COMPLAINTS["total_month"],
    }

    return {
        "meta": {"city": "北海市", "title": "智慧环卫数据监测平台", "subtitle": "数据采集、预处理、分析评估与调度决策一体化展示"},
        "metrics": metrics,
        "alerts": [{"level": "warning", "message": "合浦站处于离线状态，影响合浦县区域覆盖，建议尽快安排维护人员排查。"}],
        "analysis": build_analysis(metrics, stations),
        "charts": {
            "waste_class": {"title": "垃圾四分类占比", "data": waste_class},
            "district": district,
            "daily_trend": {"title": "近10日垃圾收集与回收趋势（吨）", "dates": daily["dates"], "collection": daily["collection"], "recycling": daily["recycling"]},
            "monthly_rate": {"title": "月度资源化利用率趋势（%），目标 40%", "months": monthly_rate["months"], "values": monthly_rate["rate"], "target": 40},
            "district_efficiency": {"title": "各区资源化效率对比", "categories": district["categories"], "recovery_rate": [42, 39, 34, 31], "daily_average": district["values"]},
            "station_load": {"title": "重点站点负荷分析", "categories": [item["name"] for item in station_load], "values": [item["daily_tons"] for item in station_load]},
            "accuracy": {"title": "分类准确率统计", "data": [{"name": "厨余", "value": 92, "color": "#4CAF50"}, {"name": "可回收", "value": 88, "color": "#2196F3"}, {"name": "有害", "value": 95, "color": "#F44336"}, {"name": "其他", "value": 85, "color": "#9E9E9E"}]},
        },
        "environment": {"title": "环境监测分析", "air_quality": {"aqi": 72, "level": "良", "pm25": 38, "pm10": 62, "trend": "stable"}, "emission": {"title": "垃圾处理排放监测", "categories": ["CO2", "CH4", "NOx", "SO2"], "values": [320, 85, 42, 18], "limits": [400, 120, 80, 50]}, "leachate": {"daily_tons": 85, "treatment_rate": 96, "status": "normal"}},
        "complaints": COMPLAINTS,
        "capacity_alerts": {"title": "容量预警", "alerts": [{"station": item["name"], "level": "high", "load_pct": item["load_pct"], "message": f"负荷达 {item['load_pct']}%，建议增加转运频次"} for item in high_load[:2]] + [{"station": item["name"], "level": "medium", "load_pct": item["load_pct"], "message": "负荷偏高，关注设备状态"} for item in medium_load[:1]]},
        "equipment": {"title": "设备监测", "total": sum(s["equipment_total"] for s in stations), "online": sum(s["equipment_online"] for s in stations), "offline": sum(s["equipment_total"] - s["equipment_online"] for s in stations), "categories": ["压缩机", "粉碎机", "分拣机", "除臭设备", "渗滤液处理"], "online_counts": [12, 8, 15, 10, 6], "total_counts": [14, 10, 16, 11, 7]},
        "transport": {"avg_time_min": 42, "avg_time_yesterday": 45, "on_time_rate": 91, "on_time_yesterday": 88, "routes": ["海城线", "银海线", "铁山港线", "合浦线"], "efficiency": [94, 88, 85, 90]},
        "ai_alerts": {"title": "AI预警中心", "predictions": [{"level": "danger", "message": "合浦站预计明日垃圾增长 15%，建议提前增派运输车辆", "probability": 87}, {"level": "warning", "message": "银海区未来 3 天有暴雨预测，渗滤液处理设备需检查", "probability": 72}, {"level": "info", "message": "厨余垃圾占比持续上升，分类质量趋好", "probability": 65}]},
        "ai_dispatch": {"title": "AI调度建议", "recommendations": [{"priority": 1, "action": "增派 2 辆运输车至机场物流园站", "reason": "负荷接近 92%，预计峰值时段 14:00-16:00", "eta": "30分钟内"}, {"priority": 2, "action": "合浦站维修队即刻出发", "reason": "离线影响区域监测覆盖", "eta": "已通知"}, {"priority": 3, "action": "银滩站增加可回收物分拣班次", "reason": "可回收物占比低于市均", "eta": "明日执行"}]},
        "ai_forecast": {"title": "未来 24 小时预测", "hours": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"], "collection_forecast": [28, 22, 85, 120, 105, 68, 35], "recycling_forecast": [10, 8, 32, 45, 40, 25, 13], "confidence_upper": [35, 28, 98, 138, 118, 78, 42], "confidence_lower": [21, 16, 72, 102, 92, 58, 28]},
        "stations": stations,
        "default_station_id": "beibuwan-square",
    }


def score_station(station: dict[str, Any]) -> int:
    capacity_score = min(100, safe_divide(station["capacity"], 185) * 100)
    recycling_score = min(100, safe_divide(station["classification"][2]["value"], 42) * 100)
    equipment_score = safe_divide(station["equipment_online"], station["equipment_total"]) * 100
    status_score = 100 if station["status"] == "online" else 45
    return round(capacity_score * 0.35 + recycling_score * 0.30 + equipment_score * 0.20 + status_score * 0.15)


def build_assessment_payload(stations: list[dict[str, Any]]) -> dict[str, Any]:
    rankings = sorted([
        {"name": s["name"], "recycling": s["classification"][2]["value"], "output": s["daily_tons"], "capacity": s["capacity"], "score": score_station(s)}
        for s in stations
    ], key=lambda item: item["score"], reverse=True)
    tree_children = []
    for district in DISTRICTS:
        children = [{"name": s["name"], "value": s["capacity"]} for s in stations if s["district"] == district]
        tree_children.append({"name": district, "children": children})
    heatmap_values = []
    for row, item in enumerate(rankings):
        for col, key in enumerate(["recycling", "output", "capacity", "score"]):
            heatmap_values.append([col, row, item[key]])
    flow_points = [{"name": s["name"], "coord": [s["lng"], s["lat"]], "value": s["daily_tons"]} for s in stations[:6]]
    center = max(stations, key=lambda item: item["daily_tons"])
    return {
        "meta": {"title": "北海市垃圾回收与处理能力评估", "subtitle": "Beihai Station Assessment Center"},
        "summary": {"total_output": sum(s["daily_tons"] for s in stations), "total_recycling": sum(s["classification"][2]["value"] for s in stations), "average_capacity": round(sum(s["capacity"] for s in stations) / len(stations)), "top_station": rankings[0]["name"]},
        "rankings": rankings,
        "charts": {
            "vertical_bar": {"title": "各站点综合评分排序", "categories": [item["name"] for item in rankings], "values": [item["score"] for item in rankings]},
            "horizontal_bar": {"title": "各站点处理能力对比（吨/日）", "categories": [item["name"] for item in rankings], "values": [item["capacity"] for item in rankings]},
            "heatmap": {"title": "站点评估热力矩阵", "xAxis": ["回收量", "产出量", "处理能力", "综合评分"], "yAxis": [item["name"] for item in rankings], "values": heatmap_values},
            "tree": {"title": "区域-站点处理能力树图", "data": {"name": "北海市", "children": tree_children}},
            "flows": {"title": "重点站点垃圾流向飞线", "center": {"name": center["name"], "coord": [center["lng"], center["lat"]]}, "lines": [], "points": flow_points},
        },
    }


def build_dispatch_payload(dashboard: dict[str, Any]) -> dict[str, Any]:
    forecast = dashboard["ai_forecast"]
    alerts = dashboard["ai_alerts"]["predictions"]
    recommendations = dashboard["ai_dispatch"]["recommendations"]
    peak_index = max(range(len(forecast["collection_forecast"])), key=lambda idx: forecast["collection_forecast"][idx])
    stations = dashboard["stations"]
    station_lookup = {station["name"]: station for station in stations}
    dispatch_links = [
        {"from": "机场物流园站", "to": "北部湾广场站", "volume": 18, "reason": "高负荷分流", "from_load_pct": 92, "to_spare_pct": 24},
        {"from": "机场物流园站", "to": "老城转运站", "volume": 14, "reason": "转运压力缓释", "from_load_pct": 92, "to_spare_pct": 18},
        {"from": "老城转运站", "to": "银滩站", "volume": 10, "reason": "跨区调度补位", "from_load_pct": 78, "to_spare_pct": 32},
    ]
    points = []
    alert_lookup = {item["station"]: item for item in dashboard["capacity_alerts"]["alerts"]}
    for station in stations:
        alert = alert_lookup.get(station["name"])
        points.append({"id": station["id"], "name": station["name"], "district": station["district"], "status": station["status"], "daily_tons": station["daily_tons"], "lat": station["lat"], "lng": station["lng"], "load_pct": alert["load_pct"] if alert else station["load_pct"], "alert_level": alert["level"] if alert else "normal"})
    return {
        "meta": {"title": "北海市环保调度中心", "subtitle": "AI 预警、调度建议与未来 24 小时预测联动看板"},
        "summary": {"warning_count": len(alerts), "urgent_count": sum(1 for item in alerts if item["level"] in {"danger", "warning"}), "dispatch_count": len(recommendations), "peak_hour": forecast["hours"][peak_index], "peak_load": forecast["collection_forecast"][peak_index], "top_action": recommendations[0]["action"] if recommendations else "--"},
        "alerts": dashboard["ai_alerts"],
        "dispatch": dashboard["ai_dispatch"],
        "forecast": dashboard["ai_forecast"],
        "capacity_alerts": dashboard["capacity_alerts"],
        "transport": dashboard["transport"],
        "environment": dashboard["environment"],
        "stations": stations,
        "dispatch_map": {"points": points, "links": [{**link, "from_coord": [station_lookup[link["from"]]["lng"], station_lookup[link["from"]]["lat"]], "to_coord": [station_lookup[link["to"]]["lng"], station_lookup[link["to"]]["lat"]]} for link in dispatch_links]},
    }


def build_preprocess_report(quality: dict[str, Any], stations: list[dict[str, Any]], dashboard: dict[str, Any]) -> dict[str, Any]:
    validation = quality["validation"]
    district_totals = aggregate_district_values(stations)
    return {
        "title": "北海市环卫可视化项目数据预处理报告",
        "process_version": "course-design-preprocess-v2",
        "pipeline": ["数据读取", "字段清洗", "业务补齐", "质量检查", "指标聚合", "JSON输出"],
        "input_summary": {
            "input_files": quality["input_files"],
            "raw_station_count": quality["raw_station_count"],
            "raw_map_point_count": quality["raw_map_point_count"],
            "target_station_count": quality["target_station_count"],
        },
        "cleaning_summary": {
            "daily_tons_converted_count": quality["daily_tons_converted_count"],
            "status_standardized_count": quality["status_standardized_count"],
            "supplemented_station_count": quality["supplemented_station_count"],
            "field_fill_count": quality["field_fill_count"],
            "coordinate_source": quality["coordinate_source"],
        },
        "quality_summary": validation,
        "aggregation_summary": {
            "daily_collect": dashboard["metrics"]["daily_collect"],
            "utilization_rate": dashboard["metrics"]["utilization_rate"],
            "online_station_rate": round(safe_divide(validation["online_station_count"], validation["standardized_station_count"]) * 100, 1),
            "district_daily_tons": dict(zip(district_totals["categories"], district_totals["values"])),
            "top_station": max(stations, key=lambda item: item["daily_tons"])["name"],
        },
        "output_files": [
            "data/processed/dashboard.json",
            "data/processed/assessment.json",
            "data/processed/dispatch.json",
            "data/processed/preprocess_report.json",
            "data/processed/preprocess_report.md",
        ],
    }


def build_report_markdown(report: dict[str, Any]) -> str:
    aggregation = report["aggregation_summary"]
    quality = report["quality_summary"]
    cleaning = report["cleaning_summary"]
    lines = [
        f"# {report['title']}",
        "",
        "## 1. 处理流程",
        "",
        "本项目的数据处理流程为：" + " → ".join(report["pipeline"]) + "。",
        "",
        "## 2. 输入数据概况",
        "",
        f"- 输入文件数：{len(report['input_summary']['input_files'])}",
        f"- 原始站点记录数：{report['input_summary']['raw_station_count']}",
        f"- 地图点位记录数：{report['input_summary']['raw_map_point_count']}",
        f"- 标准化目标站点数：{report['input_summary']['target_station_count']}",
        "",
        "## 3. 清洗与补齐结果",
        "",
        f"- 日处理量单位字符串转数值：{cleaning['daily_tons_converted_count']} 条",
        f"- 状态字段标准化：{cleaning['status_standardized_count']} 条",
        f"- 通过业务映射补充站点：{cleaning['supplemented_station_count']} 个",
        f"- 字段补齐总次数：{cleaning['field_fill_count']} 次",
        f"- 经纬度来源：{cleaning['coordinate_source']}",
        "",
        "## 4. 数据质量检查",
        "",
        f"- 标准化后站点数：{quality['standardized_station_count']}",
        f"- 在线站点数：{quality['online_station_count']}",
        f"- 离线站点数：{quality['offline_station_count']}（{', '.join(quality['offline_stations']) or '无'}）",
        f"- 高负荷站点数：{quality['high_load_station_count']}",
        f"- 重复 ID：{', '.join(quality['duplicated_ids']) or '无'}",
        f"- 缺失关键字段：{len(quality['missing_fields'])} 项",
        f"- 经纬度异常：{len(quality['coordinate_anomalies'])} 项",
        "",
        "## 5. 聚合指标摘要",
        "",
        f"- 今日垃圾收集量：{aggregation['daily_collect']} 吨",
        f"- 资源化利用率：{aggregation['utilization_rate']}%",
        f"- 站点在线率：{aggregation['online_station_rate']}%",
        f"- 日处理量最高站点：{aggregation['top_station']}",
        "- 各区日产量：" + "、".join(f"{name} {value} 吨" for name, value in aggregation["district_daily_tons"].items()),
        "",
        "## 6. 输出文件",
        "",
        *[f"- `{filename}`" for filename in report["output_files"]],
        "",
        "该报告可作为课程设计说明文档中“数据获取及分析 / 数据预处理过程”的支撑材料。",
        "",
    ]
    return "\n".join(lines)


def write_outputs(dashboard: dict[str, Any], assessment: dict[str, Any], dispatch: dict[str, Any], report: dict[str, Any]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    write_json("dashboard.json", dashboard)
    write_json("assessment.json", assessment)
    write_json("dispatch.json", dispatch)
    write_json("preprocess_report.json", report)
    (PROCESSED_DIR / "preprocess_report.md").write_text(build_report_markdown(report), encoding="utf-8")


def main() -> None:
    raw_sources = load_raw_sources()
    quality = init_quality(raw_sources)
    cleaned = clean_station_records(raw_sources, quality)
    stations = enrich_station_records(cleaned, quality)
    validate_stations(stations, quality)
    dashboard = build_dashboard_payload(raw_sources, stations)
    assessment = build_assessment_payload(stations)
    dispatch = build_dispatch_payload(dashboard)
    report = build_preprocess_report(quality, stations, dashboard)
    write_outputs(dashboard, assessment, dispatch, report)
    print(f"processed data generated: {PROCESSED_DIR}")
    print(f"standardized stations: {report['quality_summary']['standardized_station_count']}")
    print(f"preprocess report: {PROCESSED_DIR / 'preprocess_report.md'}")


if __name__ == "__main__":
    main()
