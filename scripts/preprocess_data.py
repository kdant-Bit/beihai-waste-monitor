from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"

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


def parse_tons(value: Any) -> int:
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"\d+", str(value))
    return int(match.group()) if match else 0


def normalize_status(value: str) -> str:
    text = str(value).strip().lower()
    if text in {"online", "运行中", "正常"}:
        return "online"
    return "offline"


def district_from_address(address: str) -> str:
    for district in ["海城区", "银海区", "铁山港区", "合浦县"]:
        if district in address:
            return district
    return "未分区"


def build_stations() -> list[dict[str, Any]]:
    raw_stations = {item["name"]: item for item in read_json("stations.json")}
    raw_points = {item["name"]: item for item in read_json("map_points.json")}
    stations: list[dict[str, Any]] = []

    for name in STATION_ID_BY_NAME:
        raw = raw_stations.get(name, {})
        point = raw_points.get(name, {})
        supplement = STATION_SUPPLEMENT[name]
        value = point.get("value", [])
        daily_tons = parse_tons(raw.get("daily", supplement.get("daily_tons", value[2] if len(value) >= 3 else 0)))
        address = raw.get("address") or supplement.get("address") or point.get("address", "")
        status = normalize_status(raw.get("status", supplement.get("status", point.get("status", "online"))))
        lat = supplement.get("lat", value[1] if len(value) >= 2 else None)
        lng = supplement.get("lng", value[0] if len(value) >= 1 else None)
        district = supplement.get("district") or district_from_address(address)
        classification_values = supplement["classification"]
        classification = [
            {"name": class_name, "value": value}
            for class_name, value in zip(CLASS_NAMES, classification_values)
        ]
        weekly_values = [max(0, round(daily_tons * factor)) for factor in [0.93, 0.96, 0.98, 1.01, 1.03, 0.99, 1.0]]
        if status == "offline":
            weekly_values[-3:-1] = [0, 0]

        stations.append(
            {
                "id": STATION_ID_BY_NAME[name],
                "name": name,
                "address": address,
                "collector": raw.get("collector") or supplement.get("collector", "未配置"),
                "daily_tons": daily_tons,
                "status": status,
                "lat": lat,
                "lng": lng,
                "district": district,
                "operation_hours": supplement["operation_hours"],
                "equipment_online": supplement["equipment_online"],
                "equipment_total": supplement["equipment_total"],
                "capacity": supplement["capacity"],
                "load_pct": round(daily_tons / supplement["capacity"] * 100),
                "classification": classification,
                "weekly_trend": {
                    "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                    "values": weekly_values,
                },
            }
        )
    return stations


def aggregate_district_values(stations: list[dict[str, Any]]) -> dict[str, Any]:
    districts = ["海城区", "银海区", "铁山港区", "合浦县"]
    return {
        "title": "各区垃圾日产量（吨）",
        "categories": districts,
        "values": [sum(station["daily_tons"] for station in stations if station["district"] == district) for district in districts],
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


def build_dashboard_payload(stations: list[dict[str, Any]]) -> dict[str, Any]:
    daily = read_json("daily_collection.json")
    waste_class = read_json("waste_class.json")
    monthly_rate = read_json("monthly_rate.json")

    daily_collect = sum(station["daily_tons"] for station in stations)
    yesterday = daily["collection"][-2]
    recycling_today = daily["recycling"][-1]
    utilization_rate = round(recycling_today / daily_collect * 100)
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
        "daily_collect_pct": round((daily_collect - yesterday) / yesterday * 100, 1),
        "utilization_rate": utilization_rate,
        "utilization_rate_yesterday": round(daily["recycling"][-2] / yesterday * 100),
        "utilization_rate_change": utilization_rate - round(daily["recycling"][-2] / yesterday * 100),
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
    capacity_score = min(100, station["capacity"] / 185 * 100)
    recycling_score = min(100, station["classification"][2]["value"] / 42 * 100)
    equipment_score = station["equipment_online"] / station["equipment_total"] * 100
    status_score = 100 if station["status"] == "online" else 45
    return round(capacity_score * 0.35 + recycling_score * 0.30 + equipment_score * 0.20 + status_score * 0.15)


def build_assessment_payload(stations: list[dict[str, Any]]) -> dict[str, Any]:
    rankings = sorted([
        {"name": s["name"], "recycling": s["classification"][2]["value"], "output": s["daily_tons"], "capacity": s["capacity"], "score": score_station(s)}
        for s in stations
    ], key=lambda item: item["score"], reverse=True)
    districts = ["海城区", "银海区", "铁山港区", "合浦县"]
    tree_children = []
    for district in districts:
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


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    stations = build_stations()
    dashboard = build_dashboard_payload(stations)
    assessment = build_assessment_payload(stations)
    dispatch = build_dispatch_payload(dashboard)
    write_json("dashboard.json", dashboard)
    write_json("assessment.json", assessment)
    write_json("dispatch.json", dispatch)
    print(f"processed data generated: {PROCESSED_DIR}")


if __name__ == "__main__":
    main()
