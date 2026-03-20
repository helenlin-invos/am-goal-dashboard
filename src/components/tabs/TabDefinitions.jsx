import React from 'react';

const SECTIONS = [
  {
    title: '客戶等級（inv_clientlevel）',
    color: '#7C3AED',
    items: [
      { term: 'Top Account',      desc: '頂級客戶，年度合作金額最高、策略重要性最強，需 Helen 親自關注。' },
      { term: 'Key Account',      desc: '關鍵客戶，穩定合作、有成長空間，AM 深度經營的核心對象。' },
      { term: 'SMB',              desc: '中小型客戶（Small & Medium Business），個別金額較小但數量多，批量維護為主。' },
      { term: 'Potential Account',desc: '潛力客戶，尚未穩定合作或仍在評估中，目標是轉化為 Key Account。' },
    ],
  },
  {
    title: '客戶階段（inv_clientstage）',
    color: '#2563EB',
    items: [
      { term: 'Active Customer（活躍客戶）',          desc: '目前有進行中合作、成交頻率正常，關係健康。' },
      { term: 'Growth / Expansion（成長／擴張中）',    desc: '今年合作明顯擴大，有 upsell 或新服務導入，是最佳客群。' },
      { term: 'Active Evaluation（積極評估中）',       desc: '正在評估新合作方案，決策中，需積極跟進。' },
      { term: 'Target Account（目標客戶）',            desc: '列為開發目標，尚未成交或剛開始接觸。' },
      { term: 'At Risk（高風險）',                     desc: '續約風險高：預算縮減、競品威脅、關係疏遠或超過 90 天無互動。需立即介入。' },
      { term: 'Churned / Dormant（流失／休眠）',       desc: '已流失或超過 180 天無成交。分為可挽留（有 inv_developeplan）和放棄兩類。' },
    ],
  },
  {
    title: '客戶風險（inv_client_risk_level）',
    color: '#EF4444',
    items: [
      { term: 'HIGH / 高',                    desc: '立即行動：客戶明確表示縮預算、轉競品、或已流失。ACV 高的 HIGH 優先於一切。' },
      { term: '中：已超過 180 天無成交',       desc: '長期未合作，需確認關係是否仍在。若無回應，考慮移入 Churned。' },
      { term: '中：客戶期待過高/與預算不匹配', desc: '需重新對焦合作範疇，或調整提案規模。Helen 應協助談判策略。' },
      { term: '低：客戶內部人事小調整',        desc: '短期不穩定，但不影響長期合作意願。持續 follow up 即可。' },
      { term: '健康無風險',                   desc: '合作關係穩定，按計畫推進，AM 維持正常維護節奏。' },
    ],
  },
  {
    title: '數字欄位說明',
    color: '#10B981',
    items: [
      { term: 'ACV（acv）',                         desc: '2026 Annual Contract Value Goal，即各客戶今年的年度合作目標金額，由 AM 設定在 HubSpot。' },
      { term: '今年實績（ke_hu_jin_nian_du_zong_jin_e）', desc: '2026 年迄今的實際成交累計金額，即時從 HubSpot 拉取。' },
      { term: '去年實績（qu_nian_du_zong_cheng_jiao_jin_e）', desc: '2025 年全年成交總金額，作為 YoY 比較基準。' },
      { term: '達成率',                              desc: '今年實績 ÷ ACV 目標 × 100%。超過 100% 表示超標。' },
      { term: 'YoY',                                desc: '（今年實績 − 去年實績）÷ 去年實績。正值為成長，負值為衰退。' },
    ],
  },
  {
    title: '下一步計畫（inv_developeplan）',
    color: '#F59E0B',
    items: [
      { term: '填寫規範',  desc: 'AM 在 HubSpot 公司記錄中手動填寫，描述對此客戶的下一個具體行動（含時間、對象、內容）。' },
      { term: '更新頻率', desc: '建議每次客戶互動後更新，最少每兩週確認一次，確保 Helen 看到的資訊是最新的。' },
      { term: '空白代表',  desc: '該客戶尚未填寫下一步計畫，代表可能缺乏主動跟進，屬於高風險信號。' },
    ],
  },
];

export default function TabDefinitions() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="card p-5 border-l-4" style={{ borderLeftColor: '#1B3A5C' }}>
        <h2 className="font-bold text-gray-800 mb-1">名詞定義說明</h2>
        <p className="text-sm text-gray-500">
          以下定義對應 HubSpot Company 資料庫中 2026 AM Goal view 使用的各項屬性，
          所有數字皆即時從 HubSpot 拉取，每日 08:00 / 14:00 自動更新。
        </p>
      </div>

      {SECTIONS.map(sec => (
        <div key={sec.title} className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100" style={{ borderLeftWidth: 4, borderLeftColor: sec.color, borderLeftStyle: 'solid' }}>
            <h3 className="font-semibold text-gray-800 text-sm">{sec.title}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {sec.items.map(item => (
              <div key={item.term} className="px-5 py-3.5 flex gap-4">
                <div className="flex-shrink-0 w-52">
                  <span className="text-sm font-semibold" style={{ color: sec.color }}>
                    {item.term}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
