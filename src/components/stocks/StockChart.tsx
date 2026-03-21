"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface HistoryPoint {
  date: string;
  close: number;
}

interface StockChartProps {
  history: HistoryPoint[];
  currency: string;
  isPositive: boolean;
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <p style={{ color: "#777", fontSize: 11, margin: "0 0 4px" }}>{label}</p>
      <p style={{ color: "#e8e8e8", fontSize: 15, fontWeight: 700, margin: 0 }}>
        {currency === "KRW"
          ? `₩${val?.toLocaleString("ko-KR")}`
          : `$${val?.toFixed(2)}`}
      </p>
    </div>
  );
};

export default function StockChart({
  history,
  currency,
  isPositive,
}: StockChartProps) {
  if (!history || history.length === 0) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
        }}
      >
        차트 데이터 없음
      </div>
    );
  }

  // 한국식: 오르면 빨강, 내리면 파랑
  const color = isPositive ? "#f87171" : "#60a5fa";

  // X축 레이블: 5개만 표시
  const tickInterval = Math.floor(history.length / 5);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={history}
        margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1e1e1e"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: "#555", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
          tickFormatter={(v) => v.slice(5)} // MM-DD만 표시
        />
        <YAxis
          tick={{ fill: "#555", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={currency === "KRW" ? 65 : 55}
          tickFormatter={(v) =>
            currency === "KRW"
              ? `₩${(v / 1000).toFixed(0)}k`
              : `$${v.toFixed(0)}`
          }
          domain={["auto", "auto"]}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={2}
          fill="url(#colorGrad)"
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
