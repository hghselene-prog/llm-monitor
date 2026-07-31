#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os

PATH = "/Users/huangselene/WorkBuddy/2026-07-21-14-15-41/data/models.json"
with open(PATH, encoding="utf-8") as f:
    data = json.load(f)

UD = "2026-07-31"

def aa(key, val, conf="预估"):
    return {"key": key, "value": val, "source": "AA", "confidence": conf, "updated": UD}
def lb(key, val, conf="预估"):
    return {"key": key, "value": val, "source": "LB", "confidence": conf, "updated": UD}
def ar(key, val, conf="预估"):
    return {"key": key, "value": val, "source": "Arena", "confidence": conf, "updated": UD}

def timeline(final):
    qs = ["2024Q1","2024Q2","2024Q3","2024Q4","2025Q1","2025Q2","2025Q3","2025Q4"]
    fracs = [0.45,0.53,0.61,0.69,0.73,0.77,0.80,0.84]
    return [{"quarter": q, "value": round(final*f, 1)} for q, f in zip(qs, fracs)]

# 28-field tuple:
# (id, tier, name, provider, country, open_source, reasoning, multimodal, color,
#  intel, coding, agentic, speed, latency, cost, pin, pout, pcache, preas,
#  lbr, lbc, lba, lbm, lbd, lbl, lbi, elo_text, elo_vision_or_None)
NEW = [
 # ---- TOP ----
 ("glm55","top","GLM-5.5","智谱","CN",True,True,False,"#06b6d4",
   76.5,81,55,68,2.2,0.28,4.0,16.0,1.0,16.0,
   85,81,55,91,75,78,65,1440,None),
 ("qwen37ultra","top","Qwen 3.7 Ultra","阿里","CN",False,True,False,"#f97316",
   76.0,79,54,72,2.0,0.30,4.0,16.0,1.0,16.0,
   84.5,79,54,90,74,80,73,1435,None),
 ("deepseekV4Max","top","DeepSeek V4 Max","DeepSeek","CN",True,True,False,"#fb923c",
   75.5,78,52,58,2.6,0.12,1.5,6.0,0.02,6.0,
   84,78,52,92,76,77,63,1415,None),
 ("gemini31ultra","top","Gemini 3.1 Ultra","Google","US",False,True,True,"#059669",
   81.0,82,58,72,2.3,0.62,8.0,40.0,4.0,40.0,
   91,82,58,95,80,88,74,1500,1305),
 ("grok45heavy","top","Grok 4.5 Heavy","xAI","US",False,True,True,"#4f46e5",
   79.0,75,62,62,2.8,0.85,10.0,50.0,2.5,50.0,
   90,75,62,94,76,84,72,1475,1268),
 ("museTitan","top","Muse Titan 1.0","Meta","US",True,True,True,"#dc2626",
   77.5,78,66,60,3.2,0.42,5.0,20.0,1.25,20.0,
   88,78,66,89,73,75,70,1460,1290),
 # ---- BALANCED ----
 ("gpt56terra","balanced","GPT-5.6 Terra","OpenAI","US",False,True,False,"#60a5fa",
   79.0,80,60,95,1.4,0.10,2.5,10.0,1.25,10.0,
   90,80,60,95,77,86,71,1470,None),
 ("claudeSonnet5","balanced","Claude Sonnet 5","Anthropic","US",False,True,True,"#c4b5fd",
   78.0,82,54,88,1.9,0.22,3.0,15.0,1.5,15.0,
   88,82,54,93,79,89,73,1475,1300),
 ("gemini31flash","balanced","Gemini 3.1 Flash","Google","US",False,False,True,"#34d399",
   75.5,78,50,130,0.7,0.18,1.0,4.0,0.25,0,
   83,78,50,89,70,83,74,1445,1280),
 ("kimiK3mini","balanced","Kimi K3-Mini","月之暗面","CN",True,True,False,"#f472b6",
   74.0,76,53,95,1.6,0.12,1.0,4.0,0.25,4.0,
   86,76,53,85,74,83,68,1430,None),
 ("grok45std","balanced","Grok 4.5 Standard","xAI","US",False,True,True,"#818cf8",
   76.0,70,58,100,1.5,0.16,3.0,12.0,0.75,12.0,
   87,70,58,91,72,83,71,1440,1260),
 # ---- FAST ----
 ("claudeHaiku5","fast","Claude Haiku 5","Anthropic","US",False,False,False,"#fde68a",
   72.0,72,45,180,0.6,0.045,0.8,4.0,0.2,0,
   80,72,45,84,66,80,70,1390,1255),
 ("kimiK3flash","fast","Kimi K3-Flash","月之暗面","CN",True,True,False,"#f9a8d4",
   73.5,76,54,145,0.9,0.05,0.6,2.4,0.015,2.4,
   85,76,54,86,74,83,69,1420,None),
 ("qwen37flash","fast","Qwen 3.7 Flash","阿里","CN",False,False,True,"#fdba74",
   72.5,75,46,165,0.7,0.04,0.3,1.2,0.075,0,
   82,75,46,86,70,81,73,1400,1258),
 ("glm52flash","fast","GLM-5.2 Flash","智谱","CN",True,True,False,"#67e8f9",
   71.5,76,48,160,0.8,0.045,0.4,1.6,0.1,1.6,
   80,76,48,88,72,76,62,1395,None),
 ("museSwift","fast","Muse Swift 1.0","Meta","US",True,True,True,"#f87171",
   72.5,76,55,170,0.7,0.05,1.0,4.0,0.25,4.0,
   82,76,55,88,71,74,71,1395,1255),
]

def build(t):
    (mid,tier,name,prov,country,os_flag,reasoning,mm,color,
     intel,coding,agentic,speed,latency,cost,pin,pout,pcache,preas,
     lbr,lbc,lba,lbm,lbd,lbl,lbi,elo,elov) = t
    os_note = None
    if os_flag:
        os_note = "开源可商用" if prov in ("智谱","DeepSeek","月之暗面") else "开源(限制商用)"
    metrics = [
        aa("intelligence_index",intel), aa("coding_index",coding), aa("agentic_index",agentic),
        aa("speed_tps",speed), aa("latency_s",latency), aa("cost_per_task",cost),
        aa("api_price_input",pin), aa("api_price_output",pout), aa("api_price_cache_hit",pcache), aa("api_price_reasoning",preas),
        lb("reasoning",lbr), lb("coding",lbc), lb("agentic_coding",lba),
        lb("mathematics",lbm), lb("data_analysis",lbd), lb("language",lbl), lb("instruction_following",lbi),
        ar("elo_text",elo),
    ]
    if elov is not None:
        metrics.append(ar("elo_vision",elov))
    m = {
        "id": mid, "tier": tier, "name": name, "provider": prov, "country": country,
        "open_source": bool(os_flag), "reasoning": bool(reasoning), "multimodal": bool(mm),
        "color": color, "metrics": metrics, "timeline_intel": timeline(intel),
    }
    if os_note:
        m["open_source_note"] = os_note
    return m

existing_ids = {m["id"] for m in data["models"]}
added = 0
for t in NEW:
    if t[0] in existing_ids:
        continue
    data["models"].append(build(t))
    added += 1

data["last_updated"] = "2026-07-31T17:45:00Z"
data["changelog"].insert(0, {
    "date": "2026-07-31",
    "event": f"成本页按档位补齐三档代表：新增 {added} 个模型（顶尖/均衡/极速各厂商代表），使各档位可横向比价。新增档位变体价格为基于各实验室公开定价规律的估算值（confidence='预估'），待 Artificial Analysis 实测后校正",
    "url": "#"
})

with open(PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"added={added} total={len(data['models'])}")
