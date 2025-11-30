"use client"

import { Card } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-context"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

interface TrendChartProps {
  data: ChartDataPoint[]
  type?: 'line' | 'bar'
  dataKey?: string
  color?: string
  title?: string
  height?: number
}

export function TrendChart({
  data,
  type = 'line',
  dataKey = 'value',
  color = '#F5A623',
  title,
  height = 300
}: TrendChartProps) {
  const { theme } = useTheme()

  const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"
  const gridColor = theme === "light" ? "#E2E8F0" : "#334155"
  const tooltipBg = theme === "light" ? "#FFFFFF" : "#1E293B"

  // 🔥 老王：自定义Tooltip样式
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="px-4 py-2 rounded-lg shadow-lg border"
          style={{
            backgroundColor: tooltipBg,
            borderColor: gridColor
          }}
        >
          <p className={`text-sm font-medium ${textColor} mb-1`}>{label}</p>
          <p className="text-sm" style={{ color: color }}>
            {dataKey}: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={`${cardBg} border shadow-lg`}>
      <div className="p-6">
        {title && (
          <h3 className={`text-lg font-semibold ${textColor} mb-4`}>{title}</h3>
        )}

        <ResponsiveContainer width="100%" height={height}>
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke={theme === "light" ? "#64748B" : "#94A3B8"}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke={theme === "light" ? "#64748B" : "#94A3B8"}
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke={theme === "light" ? "#64748B" : "#94A3B8"}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke={theme === "light" ? "#64748B" : "#94A3B8"}
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
