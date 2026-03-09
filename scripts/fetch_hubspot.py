"""
fetch_hubspot.py
────────────────
從 HubSpot 抓取 AM Goal 客戶資料，輸出 data.json 供 Dashboard 使用。
執行方式：python scripts/fetch_hubspot.py
需要環境變數：HUBSPOT_TOKEN
"""

import os, json, requests
from datetime import datetime, timezone

HUBSPOT_TOKEN = os.environ["HUBSPOT_TOKEN"]

HEADERS = {
    "Authorization": f"Bearer {HUBSPOT_TOKEN}",
    "Content-Type": "application/json",
}

PROPERTIES = [
    "name",
    "acv",
    "hubspot_owner_id",
    "inv_clientstage",
    "inv_clientlevel",
    "ke_hu_jin_nian_du_zong_jin_e",
    "qu_nian_du_zong_cheng_jiao_jin_e",
    "inv_client_risk_level",
    "inv_developeplan",
]

FILTER_GROUPS = [
    {
        "filters": [
            {"propertyName": "inv_clientlevel", "operator": "HAS_PROPERTY"},
            {"propertyName": "am_guan_li",      "operator": "EQ", "value": "true"},
        ]
    }
]

def fetch_all():
    url = "https://api.hubapi.com/crm/v3/objects/companies/search"
    results, after = [], None
    while True:
        body = {
            "filterGroups": FILTER_GROUPS,
            "properties": PROPERTIES,
            "limit": 200,
        }
        if after:
            body["after"] = after
        resp = requests.post(url, headers=HEADERS, json=body)
        resp.raise_for_status()
        data = resp.json()
        results.extend(data.get("results", []))
        paging = data.get("paging", {})
        after = paging.get("next", {}).get("after")
        if not after:
            break
    return results

def parse(r):
    p = r.get("properties", {})
    def num(k):
        v = p.get(k)
        try: return float(v) if v else 0
        except: return 0
    return {
        "id":    str(r["id"]),
        "name":  p.get("name") or "—",
        "acv":   num("acv"),
        "oid":   p.get("hubspot_owner_id") or "",
        "stage": p.get("inv_clientstage") or "",
        "level": p.get("inv_clientlevel") or "",
        "a26":   num("ke_hu_jin_nian_du_zong_jin_e"),
        "a25":   num("qu_nian_du_zong_cheng_jiao_jin_e"),
        "risk":  p.get("inv_client_risk_level") or "",
        "plan":  (p.get("inv_developeplan") or "").strip(),
    }

if __name__ == "__main__":
    print("Fetching HubSpot data...")
    raw = fetch_all()
    print(f"  → {len(raw)} records fetched")
    records = [parse(r) for r in raw]

    now_tw = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M") + " UTC+8"
    output = {
        "updated_at": now_tw,
        "total": len(records),
        "records": records,
    }

    out_path = os.path.join(os.path.dirname(__file__), "..", "data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"  → data.json written ({len(records)} clients)")
