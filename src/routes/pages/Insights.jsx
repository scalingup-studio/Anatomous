import React, { useState, useEffect } from "react";
import { useAuth } from "../../api/AuthContext";
import ChatComponent from "../../components/ChatBox-TEST";
import { InsightApi } from "../../api/insightApi";
import { ComprehensiveAlertsApi } from "../../api/comprehensiveAlertsApi";
import { UploadFileApi } from "../../api/uploadFileApi";
import { TrendsApi } from "../../api/trendsApi";
import { useNotifications } from "../../api/NotificationContext";
import { Modal } from "../../components/Modal";
import { useSearchParams } from "react-router-dom";
import { CUSTOM_ENDPOINTS } from "../../api/apiConfig";
import useOpenAI from "../../hooks/useOpenAI";

// Normalize metric title: remove underscores and capitalize first letter
function formatMetricTitle(input) {
  if (input == null) return "";
  try {
    const text = String(input).replace(/_/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  } catch {
    return String(input);
  }
}

// BarGraph Component with tooltips
function BarGraph({ data, height = 120, color = "var(--primary)", gradientBg = "rgba(0,186,206,0.1)" }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = React.useRef(null);

  if (!data || data.length === 0) {
    return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>No data</div>;
  }

  return (
    <div ref={containerRef} style={{ position: "relative", overflow: "visible" }}>
      <div
        style={{
          height,
          background: `linear-gradient(to top, ${gradientBg} 0%, transparent 100%)`,
          border: "1px solid var(--border)",
          borderRadius: 8,
          display: "flex",
          alignItems: "flex-end",
          padding: 8,
        }}
      >
        {data.map((item, i) => {
          const isEmpty = item.isEmpty === true;
          const barColor = isEmpty ? "var(--border)" : color;
          
          return (
            <div
              key={i}
              onMouseEnter={() => setTooltip({ x: i, value: item.value, label: item.label || `Day ${i + 1}`, isEmpty })}
              onMouseLeave={() => setTooltip(null)}
              style={{
                flex: 1,
                height: `${item.height}%`,
                background: barColor,
                margin: "0 2px",
                borderRadius: "2px 2px 0 0",
                cursor: "pointer",
                transition: "all 0.2s",
                opacity: isEmpty ? 0.4 : 1,
              }}
            />
          );
        })}
      </div>
      
      {/* X-axis labels */}
      <div style={{ display: "flex", gap: "2px", paddingTop: 4 }}>
        {data.map((item, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              fontSize: 8,
              color: "var(--muted)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                writingMode: data.length > 15 ? "vertical-rl" : "horizontal-tb",
                textOrientation: "mixed",
                transform: data.length > 15 ? "rotate(180deg)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {(() => {
                // If label is in format "1 Oct", just show "1"
                if (item.label && /^\d+/.test(item.label)) {
                  return item.label.split(' ')[0];
                }
                return item.label || `${i + 1}`;
              })()}
            </span>
          </div>
        ))}
      </div>
      
      {tooltip && (() => {
        const width = containerRef.current?.clientWidth || 0;
        const rawLeft = (tooltip.x / data.length) * width;
        const clamped = Math.max(56, Math.min(width - 56, rawLeft));
        return (
          <div
            style={{
              position: "absolute",
              left: clamped,
              bottom: "100%",
              transform: "translateY(-8px)",
              background: "rgba(0,0,0,0.9)",
              backdropFilter: "blur(8px)",
              color: "var(--text)",
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              border: "1px solid var(--border)",
              zIndex: 2000,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.label}</div>
            <div style={{ color: tooltip.isEmpty ? "var(--muted)" : color, fontSize: 11 }}>
              {tooltip.isEmpty ? "No data" : tooltip.value}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Robust bar chart using flex divs (no SVG), tooltip pinned inside container
function FlexBarChart({ data, height = 140, color = 'var(--primary)' }) {
  const [tip, setTip] = useState(null); // {x,label,value}
  const ref = React.useRef(null);
  const barRefs = React.useRef([]);
  if (!data || data.length === 0) {
    return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>No data</div>;
  }
  const maxH = Math.max(1, ...data.map(d=>Number(d.height)||0));
  return (
    <div ref={ref} style={{ position:'relative', border:'1px solid var(--border)', borderRadius:8, padding:'8px', background:'linear-gradient(to top, rgba(0,186,206,0.08), transparent)', height }}>
      <div style={{ position:'absolute', inset:'8px', display:'flex', alignItems:'flex-end', gap:4 }}>
        {data.map((d,i)=>{
          const hPct = Math.max(0, Math.min(100, (Number(d.height)||0)));
          return (
            <div key={i} ref={el => (barRefs.current[i] = el)}
              style={{ flex:1, minWidth:2, height:'100%', display:'flex', alignItems:'flex-end' }}
              onMouseEnter={() => {
                const cont = ref.current?.getBoundingClientRect();
                const b = barRefs.current[i]?.getBoundingClientRect();
                if (!cont || !b) return;
                const center = (b.left + b.right) / 2 - cont.left;
                setTip({ x: center, label: d.label || `Day ${i+1}`, value: d.value });
              }}
              onMouseLeave={() => setTip(null)}
            >
              <div style={{ width:'100%', height:`${(hPct/maxH)*100}%`, background:color, opacity:d.isEmpty?0.4:1, borderRadius:'2px 2px 0 0' }} />
            </div>
          );
        })}
      </div>
      {tip && (()=>{
        const w = ref.current?.clientWidth || 0;
        const left = Math.max(56, Math.min(w-56, tip.x));
        return (
          <div style={{ position:'absolute', left, top:8, transform:'translateX(-50%)', background:'rgba(0,0,0,0.9)', color:'var(--text)', padding:'6px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, pointerEvents:'none', zIndex:3000, maxWidth:'90%', whiteSpace:'nowrap' }}>
            <div style={{ fontWeight:600, marginBottom:2 }}>{tip.label}</div>
            <div style={{ fontSize:11 }}>{tip.value}</div>
          </div>
        );
      })()}
    </div>
  );
}

// Google Charts ColumnChart wrapper
function GoogleColumnChart({ data, height = 180, color = '#00BACE' }) {
  const containerRef = React.useRef(null);

  const loadGoogle = React.useCallback(() => {
    return new Promise((resolve) => {
      if (window.google && window.google.charts) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[src="https://www.gstatic.com/charts/loader.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://www.gstatic.com/charts/loader.js';
      s.async = true;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }, []);

  const draw = React.useCallback(() => {
    if (!containerRef.current || !window.google) return;
    const google = window.google;
    if (!google.visualization) return;

    const table = new google.visualization.DataTable();
    table.addColumn('string', 'Day');
    table.addColumn('number', 'Value');
    table.addColumn({ type: 'string', role: 'style' });

    const rows = (data || []).map((d, i) => {
      const label = d.label || String(i + 1);
      // Prefer value if present; fallback to height percentage
      const val = Number(d.value ?? d.height ?? 0);
      return [label, isNaN(val) ? 0 : val, `color: ${color}`];
    });
    table.addRows(rows);

    const opts = {
      backgroundColor: 'transparent',
      legend: { position: 'none' },
      bar: { groupWidth: '85%' },
      height,
      chartArea: { left: 32, top: 12, width: '88%', height: '72%' },
      hAxis: { textStyle: { color: '#9AA0A6', fontSize: 9 } },
      vAxis: { textStyle: { color: '#9AA0A6', fontSize: 9 }, gridlines: { color: 'rgba(255,255,255,0.1)' } },
      tooltip: { isHtml: false },
    };

    const chart = new google.visualization.ColumnChart(containerRef.current);
    chart.draw(table, opts);
    return chart;
  }, [data, height, color]);

  React.useEffect(() => {
    let chartInstance = null;
    let resize;
    let mounted = true;
    (async () => {
      await loadGoogle();
      if (!mounted) return;
      window.google.charts.load('current', { packages: ['corechart'] });
      window.google.charts.setOnLoadCallback(() => {
        chartInstance = draw();
        resize = () => draw();
        window.addEventListener('resize', resize);
      });
    })();
    return () => {
      mounted = false;
      if (resize) window.removeEventListener('resize', resize);
      // google charts cleans on next draw; nothing to dispose safely here
    };
  }, [loadGoogle, draw]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

// LineGraph Component with tooltips
function LineGraph({ data, height = 120, color = "var(--primary)", gradientBg = "rgba(0,186,206,0.1)" }) {
  const [tooltip, setTooltip] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);

  if (!data || data.length === 0) {
    return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>No data</div>;
  }

  // Calculate points with scaled coordinates for viewBox (margins: left 10px, right 5px, top 8px, bottom 20px)
  const points = data.map((item, i) => {
    const x = 10 + (i / (data.length - 1)) * 85; // 10 to 95 (with left margin)
    const y = 8 + (100 - item.height) * 0.72; // 8 to 80 (with top/bottom margins)
    return { x, y, index: i, ...item };
  });

  // Find closest point on the line for cursor tracking
  const findPointOnLine = (mouseX) => {
    if (!points.length) return null;
    
    // Find which segment the mouse is in
    let closestPoint = points[0];
    let minDistance = Infinity;
    
    for (let i = 0; i < points.length - 1; i++) {
      const point1 = points[i];
      const point2 = points[i + 1];
      
      // Check if mouse is between these points
      if (mouseX >= point1.x && mouseX <= point2.x) {
        // Interpolate y position on the line between these points
        const t = (mouseX - point1.x) / (point2.x - point1.x);
        const y = point1.y + (point2.y - point1.y) * t;
        
        return {
          x: mouseX,
          y: y,
          label: point1.label,
          value: point1.value,
          index: point1.index
        };
      }
      
      // Also check distance for closest point
      const distance = Math.abs(mouseX - point1.x);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point1;
      }
    }
    
    return closestPoint;
  };

  // Create smooth curve using quadratic bezier curves
  const createSmoothPath = () => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      if (i === 1) {
        // First point - use smooth transition
        const cpX = points[i].x - (points[i + 1] ? (points[i + 1].x - points[i].x) / 2 : 0);
        const cpY = points[i].y;
        path += ` Q ${cpX} ${cpY}, ${points[i].x} ${points[i].y}`;
      } else if (i === points.length - 1) {
        // Last point - smooth to end
        path += ` L ${points[i].x} ${points[i].y}`;
      } else {
        // Middle points - use quadratic bezier for smooth curves
        const prevX = points[i - 1].x;
        const prevY = points[i - 1].y;
        const currX = points[i].x;
        const currY = points[i].y;
        const nextX = points[i + 1].x;
        const nextY = points[i + 1].y;
        
        const cpX = (prevX + currX) / 2;
        const cpY = (prevY + currY) / 2;
        
        path += ` Q ${currX} ${cpY}, ${currX} ${currY}`;
      }
    }
    
    return path;
  };
  
  const pathD = createSmoothPath();

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    // Adjust for viewBox margins (5 to 95)
    const adjustedX = ((mouseX - 5) / 90) * 100;
    const point = findPointOnLine(mouseX);
    if (point) {
      setHoverPoint(point);
      setTooltip({ x: point.index, value: point.value, label: point.label });
    }
  };

  const handleMouseLeave = () => {
    setHoverPoint(null);
    setTooltip(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", overflow: "visible" }}>
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          background: `linear-gradient(to top, ${gradientBg} 0%, transparent 100%)`,
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 10px 20px 20px",
          display: "block",
        }}
      >
        {/* Filled area under the line */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} 80 L 10 80 Z`}
          fill={`url(#gradient-${color.replace(/[^a-zA-Z]/g, '')})`}
          opacity="0.2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${color.replace(/[^a-zA-Z]/g, '')}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((value) => (
          <text
            key={value}
            x="-2"
            y={100 - value}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="8"
            fill="var(--muted)"
          >
            {value}%
          </text>
        ))}
        
        {/* Grid lines (horizontal) */}
        {[0, 25, 50, 75, 100].map((value) => {
          const yPos = 8 + (100 - value) * 0.72;
          return (
            <line
              key={`grid-y-${value}`}
              x1="10"
              y1={yPos}
              x2="95"
              y2={yPos}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.3"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((value) => {
          const yPos = 8 + (100 - value) * 0.72;
          return (
            <text
              key={`y-${value}`}
              x="9"
              y={yPos}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9"
              fill="var(--muted)"
            >
              {value}
            </text>
          );
        })}
        
        {/* X-axis labels */}
        {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map((point) => (
          <text
            key={point.x}
            x={point.x}
            y="93"
            textAnchor="middle"
            dominantBaseline="hanging"
            fontSize="9"
            fill="var(--muted)"
          >
            {point.label ? point.label.replace('Day ', 'D') : point.index + 1}
          </text>
        ))}
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Hover indicator line and point */}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1="8"
              x2={hoverPoint.x}
              y2="80"
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.4"
            />
            {/* Show value on Y-axis */}
            <text
              x="-2"
              y={hoverPoint.y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9"
              fontWeight="600"
              fill={color}
            >
              {hoverPoint.value}
            </text>
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="5"
              fill={color}
              stroke="var(--bg)"
              strokeWidth="2"
              style={{ transition: "all 0.2s" }}
            />
          </>
        )}
        
        {/* Points */}
        {points.map((point, i) => (
          <g key={i}>
            {/* Outer glow */}
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={color}
              opacity="0.3"
            />
            {/* Inner point */}
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke="var(--bg)"
              strokeWidth="2"
              style={{ cursor: "pointer", transition: "r 0.2s" }}
              onMouseEnter={(e) => {
                e.currentTarget.setAttribute('r', '6');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.setAttribute('r', '4');
              }}
            />
          </g>
        ))}
      </svg>
      
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: `${Math.min(92, Math.max(8, (tooltip.x / data.length) * 100))}%`,
            bottom: "100%",
            transform: "translateY(-8px)",
            background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(8px)",
            color: "var(--text)",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            border: "1px solid var(--border)",
            zIndex: 2000,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.label}</div>
          <div style={{ color: color, fontSize: 11 }}>{tooltip.value}</div>
        </div>
      )}
    </div>
  );
}

// DonutChart Component
function DonutChart({ data, size = 120, strokeWidth = 16 }) {
  const [tooltip, setTooltip] = useState(null);
  
  if (!data || data.length === 0) {
    return (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        No data
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = data.map((item, i) => {
    const startPercent = cumulative;
    cumulative += item.value;
    const endPercent = cumulative;
    const color = item.color || ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--error)'][i % 4];
    
    // Calculate dash for this segment
    const dashLength = (endPercent - startPercent) / total;
    const dashArray = `${dashLength * circumference} ${circumference}`;
    const dashOffset = -(startPercent / total) * circumference;
    
    return { ...item, index: i, color, dashArray, dashOffset };
  });

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        
        {/* Data segments */}
        {segments.map((segment, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            onMouseEnter={() => setTooltip({ ...segment, percentage: ((segment.value / total) * 100).toFixed(0) })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
          />
        ))}
        
        {/* Center text */}
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="600"
          fill="var(--text)"
        >
          {total}%
        </text>
        <text
          x={center}
          y={center + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fill="var(--muted)"
        >
          Forecast
        </text>
      </svg>
      
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "100%",
            transform: "translateX(-50%) translateY(-8px)",
            background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(8px)",
            color: "var(--text)",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            border: "1px solid var(--border)",
            zIndex: 1000,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.label}</div>
          <div style={{ color: tooltip.color, fontSize: 11 }}>{tooltip.percentage}%</div>
        </div>
      )}
    </div>
  );
}

export default function DashboardInsights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    return ["ai-insights", "trends", "alerts", "uploads"].includes(t) ? t : "ai-insights";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    if (["ai-insights", "trends", "alerts", "uploads"].includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const changeTab = (next) => {
    if (next === activeTab) return;
    setActiveTab(next);
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      sp.set('tab', next);
      return sp;
    }, { replace: true });
  };
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  const tabs = [
    { id: "ai-insights", label: "AI Health Insights" },
    { id: "trends", label: "Trends & Forecasts" },
    { id: "alerts", label: "Early Alerts" },
    { id: "uploads", label: "Uploads" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sub-tabs navigation */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              color: activeTab === tab.id ? "var(--primary)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "ai-insights" && <AIInsightsTab />}
      {activeTab === "trends" && <TrendsTab />}
      {activeTab === "alerts" && <AlertsTab />}
      {activeTab === "uploads" && <UploadsTab />}
    </div>
  );
}

function AIInsightsTab() {
  // Use shared hook instance for both components
  const openAIHook = useOpenAI();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChatComponentWithHook hook={openAIHook} />
      <PreviousQueriesList hook={openAIHook} />
    </div>
  );
}

// Wrapper to pass hook to ChatComponent
function ChatComponentWithHook({ hook }) {
  // Use the shared hook instance
  const {
    loading, 
    error, 
    conversation, 
    sendMessage, 
    clearConversation,
    currentChatId,
    loadChat,
    loadPreviousQueries
  } = hook;
  
  // Pass hook functions to ChatComponent via ref or context
  // For now, we'll modify ChatComponent to accept hook as prop
  return <ChatComponent sharedHook={hook} />;
}

function PreviousQueriesList({ hook }) {
  const [chatIdInput, setChatIdInput] = useState('');
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Use shared hook if provided, otherwise use own instance
  const hookInstance = hook || useOpenAI();
  const { loadChat, setCurrentChatId } = hookInstance;

  const loadQueries = async (chatId) => {
    // chat_id should be integer, default 0
    let chatIdToUse = 0;
    if (chatId !== null && chatId !== undefined) {
      chatIdToUse = typeof chatId === 'string' ? parseInt(chatId, 10) || 0 : chatId;
    } else if (chatIdInput.trim()) {
      chatIdToUse = parseInt(chatIdInput.trim(), 10) || 0;
    }
    
    console.log('🔄 loadQueries called with chat_id:', chatIdToUse);
    
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Loading previous queries for chat_id:', chatIdToUse);
      
      // Call /get-insight API with chat_id (integer, default 0)
      const response = await InsightApi.getInsight(chatIdToUse);
      
      console.log('✅ get-insight response:', response);
      
      // Parse the response structure: { result: [...] }
      let insights = [];
      
      if (response?.result && Array.isArray(response.result)) {
        insights = response.result;
        console.log('📊 Found insights in response.result:', insights.length);
      } else if (Array.isArray(response)) {
        insights = response;
        console.log('📊 Found insights as array:', insights.length);
      } else {
        console.warn('⚠️ Unexpected response structure:', response);
      }
      
      // Sort by created_at (newest first) for display
      const sortedInsights = insights.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeB - timeA; // Newest first
      });
      
      // Map to display format
      const formattedQueries = sortedInsights.map(insight => ({
        id: insight.id,
        created_at: insight.created_at,
        description: insight.description || '',
        metrics: insight.data_sources?.metrics || [],
        chat_id: insight.chat_id,
        title: insight.title || ''
      }));
      
      console.log('📋 Formatted queries:', formattedQueries.length);
      
      setQueries(formattedQueries);
      if (formattedQueries.length === 0 && chatIdToUse !== 0) {
        setError('No queries found for this chat ID');
      } else if (formattedQueries.length === 0) {
        // No error if auto-loading
        console.log('ℹ️ No queries found');
      }
    } catch (err) {
      console.error('❌ Error loading previous queries:', err);
      // Only show error if user explicitly requested load
      if (chatIdToUse !== 0) {
        setError(err?.message || 'Failed to load previous queries');
      }
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load previous queries on component mount
  useEffect(() => {
    console.log('🔄 PreviousQueriesList mounted, auto-loading previous queries...');
    loadPreviousQueriesFromUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreviousQueriesFromUser = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Loading previous queries from /get-insight-user...');
      
      // Call /get-insight-user to get all previous queries/insights
      const response = await InsightApi.getInsightUser();
      
      console.log('✅ get-insight-user response:', response);
      
      // Parse the response structure: { result: [...] }
      // Each item has: id, created_at, user_id, last_message_at, title, archived
      let items = [];
      
      if (response?.result && Array.isArray(response.result)) {
        items = response.result;
        console.log('📊 Found items in response.result:', items.length);
      } else if (Array.isArray(response)) {
        items = response;
        console.log('📊 Found items as array:', items.length);
      } else {
        console.warn('⚠️ Unexpected response structure:', response);
      }
      
      // Sort by last_message_at or created_at (newest first)
      const sortedItems = items.sort((a, b) => {
        const timeA = a.last_message_at || a.created_at || 0;
        const timeB = b.last_message_at || b.created_at || 0;
        return timeB - timeA; // Newest first
      });
      
      // Map to display format
      const formattedQueries = sortedItems.map(item => ({
        id: item.id,
        created_at: item.created_at || item.last_message_at,
        description: item.title || '',
        metrics: [],
        chat_id: item.id,
        title: item.title || `Chat ${item.id}`,
        archived: item.archived || false
      }));
      
      console.log('📋 Formatted queries:', formattedQueries.length);
      
      setQueries(formattedQueries);
      if (formattedQueries.length === 0) {
        console.log('ℹ️ No previous queries found');
      }
    } catch (err) {
      console.error('❌ Error loading previous queries:', err);
      setError(err?.message || 'Failed to load previous queries');
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    console.log('🔵 handleLoad called, chatIdInput:', chatIdInput);
    
    if (!chatIdInput.trim()) {
      console.log('⚠️ No chat ID provided');
      setError('Please enter a chat ID');
      return;
    }

    const chatId = parseInt(chatIdInput.trim(), 10);
    if (isNaN(chatId)) {
      setError('Chat ID must be a number');
      return;
    }

    console.log('✅ Starting load with chat_id:', chatId);
    await loadQueries(chatId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(timestamp);
    }
  };

  const formatMetrics = (metrics) => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return null;
    }
    return metrics.map(m => `${m.metric_type}: ${m.value}`).join(', ');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Previous Queries</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={chatIdInput}
            onChange={(e) => setChatIdInput(e.target.value)}
            placeholder="Enter chat ID to load queries"
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "rgba(17,17,17,.85)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLoad();
              }
            }}
          />
          <button
            onClick={(e) => {
              console.log('🔵 Button clicked!', e);
              e.preventDefault();
              handleLoad();
            }}
            disabled={!chatIdInput.trim() || loading}
            className="btn primary"
            style={{ 
              padding: "8px 16px",
              fontSize: 13,
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: "rgba(255, 59, 48, 0.1)",
          border: "1px solid var(--error)",
          borderRadius: 8,
          color: "var(--error)",
          fontSize: 13
        }}>
          {error}
        </div>
      )}

      {queries.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: '600px',
          overflowY: 'auto',
          paddingRight: 4
        }}>
          {queries.map((query, index) => (
            <div
              key={query.id || index}
              style={{
                padding: 16,
                background: "rgba(0, 186, 206, 0.05)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 186, 206, 0.1)";
                e.currentTarget.style.borderColor = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 186, 206, 0.05)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              onClick={async () => {
                // Load chat history and display in chat window
                if (query.chat_id) {
                  const chatId = typeof query.chat_id === 'string' 
                    ? parseInt(query.chat_id, 10) 
                    : query.chat_id;
                  
                  if (!isNaN(chatId)) {
                    console.log('🔄 Loading chat history for chat_id:', chatId);
                    try {
                      // Load chat history through /get-insight API
                      await loadChat(chatId);
                      // Set currentChatId for continuing conversation
                      setCurrentChatId(chatId);
                      console.log('✅ Chat history loaded, chat_id set to:', chatId);
                    } catch (err) {
                      console.error('❌ Error loading chat history:', err);
                      setError('Failed to load chat history');
                    }
                  }
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
                gap: 8
              }}>
                <div style={{ flex: 1 }}>
                  {query.title && (
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                      {query.title}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    marginBottom: 8
                  }}>
                    {formatDate(query.created_at)}
                  </div>
                  {query.metrics && query.metrics.length > 0 && (
                    <div style={{
                      fontSize: 11,
                      color: "var(--primary)",
                      marginBottom: 8,
                      padding: "4px 8px",
                      background: "rgba(0, 186, 206, 0.1)",
                      borderRadius: 4,
                      display: 'inline-block'
                    }}>
                      {formatMetrics(query.metrics)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: 13,
                color: "var(--text)",
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {query.description || 'No description'}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && queries.length === 0 && !error && (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: "var(--muted)",
          fontSize: 14
        }}>
          Enter a chat ID and click "Load" to view previous queries
        </div>
      )}
    </div>
  );
}

function RecentInsightsCard() {
  const [metric, setMetric] = useState('heart_rate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const metrics = [
    'heart_rate',
    'blood_pressure',
    'sleep_duration',
    'blood_oxygen',
    'body_temp'
  ];

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await InsightApi.getRecentInsights(metric);
      setData(res?.result || res);
    } catch (e) {
      setError(e?.message || 'Failed to load recent insights');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [metric]);

  const items = (() => {
    const r = data ?? [];
    const list = Array.isArray(r)
      ? r
      : (r.items || r.results || r.list || r.insights || r.data || (r.insight ? [r] : []));
    if (!Array.isArray(list)) return [];
    return list.map((it) => {
      const title = it.title || it.name || '';
      const body = it.insight || it.text || it.message || it.content || '';
      const created = it.created_at || it.date || '';
      return { title, body, created };
    });
  })();

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Recent Insights</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={metric} onChange={(e)=>setMetric(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(17,17,17,.85)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
            {metrics.map(m => (<option key={m} value={m}>{m}</option>))}
          </select>
          <button className="btn outline small" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>
      {error ? (
        <div style={{ color: 'var(--error)', fontSize: 12 }}>{error}</div>
      ) : items.length ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map((it, idx) => (
            <div key={idx} style={{ padding:12, border:'1px solid var(--border)', borderRadius:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontWeight:600 }}>Insight #{idx+1}{it.title ? ` — ${it.title}` : ''}</div>
                {it.created ? (<div style={{ fontSize:12, color:'var(--muted)' }}>{new Date(it.created).toLocaleString()}</div>) : null}
              </div>
              <div style={{ fontSize:14, color:'var(--text)' }}>{it.body || '—'}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>No recent insight available for this metric.</div>
      )}
    </div>
  );
}

function TrendsTab() {
  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [trends, setTrends] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("heart_rate");
  const [selectedPeriod, setSelectedPeriod] = useState("Overview");
  const { showNotification } = useNotifications();
  const { user } = useAuth();

  // Recent insights for the selected metric (GET /insights_recent)
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [recentItems, setRecentItems] = useState([]);

  const loadRecentInsights = async () => {
    try {
      setRecentLoading(true);
      setRecentError("");
      const res = await InsightApi.getRecentInsights(selectedMetric);
      const raw = res?.result || res;
      const list = Array.isArray(raw)
        ? raw
        : (raw?.items || raw?.results || raw?.list || raw?.insights || (raw?.insight || raw?.description ? [raw] : []));
      const normalized = Array.isArray(list)
        ? list.map((it) => ({
            title: it.title || it.name || "",
            body: it.description || it.insight || it.text || it.message || it.content || "",
            created: it.created_at || it.date || "",
          }))
        : [];
      setRecentItems(normalized);
    } catch (e) {
      setRecentError(e?.message || "Failed to load recent insights");
      setRecentItems([]);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => { loadRecentInsights(); }, [selectedMetric]);

  const metrics = ["heart_rate", "blood_pressure", "sleep_duration", "blood_oxygen", "body_temp"];

  // Helper function to get days in current month
  const getDaysInMonth = React.useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, []);

  // Generate stable data for vitals graph (only once on mount)
  const vitalsData = React.useMemo(() => 
    [...Array(10)].map((_, i) => ({
      height: 40 + i * 3 + Math.sin(i * 0.5) * 10,
      value: `${Math.floor(60 + i * 2)}`,
      label: `Day ${i + 1}`,
    })), []
  );

  // Generate stable mock data for health trend (current month days)
  const daysInMonth = getDaysInMonth();
  const mockHealthTrendData = React.useMemo(() => 
    [...Array(daysInMonth)].map((_, i) => ({
      height: 30 + (i / 4) * 5 + Math.cos(i * 0.1) * 8,
      value: `${Math.floor(45 + (i / 4) * 3)}`,
      label: `Day ${i + 1}`,
    })), [daysInMonth]
  );

  // Transform API data for display
  const healthTrendData = React.useMemo(() => {
    if (trends && trends.result && Array.isArray(trends.result)) {
      const apiData = trends.result;
      console.log("Using API data for Health Trend:", apiData);
      
      // Process API data with null values as 0
      const processedData = apiData
        .map((item, i) => {
          // Handle null values - show them as 0 on the graph
          const numericValue = item.value === null || item.value === undefined 
            ? 0 
            : parseFloat(item.value);
          
          const finalValue = isNaN(numericValue) ? 0 : numericValue;
          
          // Format period date (2025-10-01 -> "1 Oct")
          let label = `${i + 1}`;
          if (item.period) {
            try {
              const date = new Date(item.period);
              const dayNum = date.getDate();
              label = `${dayNum}`;
            } catch (e) {
              // Keep default label
            }
          }
          
          return {
            height: finalValue,
            value: `${Math.floor(finalValue)}`,
            label: label,
            trend: item.trend || 'neutral', // up, down, neutral
            isEmpty: item.value === null || item.value === undefined, // Flag for null data
          };
        })
      
      // Ensure we have data for all days of the month
      const daysInMonth = getDaysInMonth();
      if (processedData.length < daysInMonth) {
        // Add empty days to fill the rest of the month
        for (let i = processedData.length; i < daysInMonth; i++) {
          processedData.push({
            height: 0,
            value: '0',
            label: `${i + 1}`,
            trend: 'neutral',
            isEmpty: true,
          });
        }
      }
      
      // If we have valid data, return it
      if (processedData.length > 0) {
        return processedData;
      }
    }
    
    // Use mock data if no real data available
    if (trends) {
      console.log("API returned data but no valid values found, using mock data. API response:", trends);
    }
    return mockHealthTrendData;
  }, [trends, mockHealthTrendData]);

  // Mock data for forecast donut chart (fallback)
  const mockForecastDonutData = React.useMemo(() => [
    { label: 'Excellent', value: 35, color: 'rgba(0,186,206,0.9)' },
    { label: 'Good', value: 45, color: 'rgba(0,186,206,0.6)' },
    { label: 'Fair', value: 15, color: 'rgba(0,186,206,0.3)' },
    { label: 'Poor', value: 5, color: 'rgba(0,76,215,0.3)' },
  ], []);

  // Transform forecast data for display
  const forecastDonutData = React.useMemo(() => {
    if (forecast && forecast.result_forecast) {
      console.log("Using API forecast data:", forecast.result_forecast);
      
      const resultForecast = forecast.result_forecast;
      const forecastData = resultForecast.forecast;
      
      // Check if we have forecast points
      if (forecastData && forecastData.points && Array.isArray(forecastData.points) && forecastData.points.length > 0) {
        // We have actual forecast data
        return forecastData.points.map((item, i) => {
          const colors = [
            'rgba(0,186,206,0.9)',  // Excellent
            'rgba(0,186,206,0.6)',  // Good
            'rgba(0,186,206,0.3)',  // Fair
            'rgba(0,76,215,0.3)',   // Poor
          ];
          return {
            label: item.category || item.label || item.type || `Forecast ${i + 1}`,
            value: parseFloat(item.value || item.percentage || 0),
            color: colors[i % colors.length],
          };
        });
      }
      
      // If no forecast but we have trend/confidence info
      if (resultForecast.trend || resultForecast.message) {
        console.log("Using trend info for forecast");
        // Create simple forecast based on trend
        const trend = resultForecast.trend || 'neutral';
        const confidence = forecastData?.confidence || 'low';
        
        // Create forecast based on trend
        if (trend === 'up') {
          return [
            { label: 'Improving', value: 60, color: 'rgba(0,186,206,0.9)' },
            { label: 'Stable', value: 30, color: 'rgba(0,186,206,0.6)' },
            { label: 'Declining', value: 10, color: 'rgba(0,186,206,0.3)' },
          ];
        } else if (trend === 'down') {
          return [
            { label: 'Improving', value: 20, color: 'rgba(0,186,206,0.3)' },
            { label: 'Stable', value: 40, color: 'rgba(0,186,206,0.6)' },
            { label: 'Declining', value: 40, color: 'rgba(0,76,215,0.3)' },
          ];
        }
      }
    }
    
    // Use mock data if no real forecast available
    console.log("Using mock forecast data");
    return mockForecastDonutData;
  }, [forecast, mockForecastDonutData]);

  const handleGetTrends = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate, endDate;
      if (selectedPeriod === 'Monthly') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = first.toISOString().split('T')[0];
        endDate = last.toISOString().split('T')[0];
      } else if (selectedPeriod === 'Daily') {
        const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        startDate = last7.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else {
        const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        startDate = last30.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }
      
      const response = await TrendsApi.getTrends({
        typeMetric: selectedMetric,
        period: selectedPeriod.toLowerCase(),
        startDate,
        endDate,
      });
      
      // Set trends if we got valid data (support both 'succes' and 'success' spelling)
      if (response && (response.success !== false && response.success !== undefined) || (response.succes !== false && response.succes !== undefined)) {
        setTrends(response);
        console.log("Trends loaded successfully from API:", response);
      }
    } catch (error) {
      console.log("Error fetching trends from API, using mock data instead", error);
      // Keep using mock data on error - this is expected if backend API is not available
    } finally {
      setLoading(false);
    }
  };

  const handleGetForecast = async () => {
    try {
      setForecastLoading(true);
      
      const response = await TrendsApi.getForecast(selectedMetric);
      
      // Set forecast if we got valid data
      if (response && (response.success !== false && response.success !== undefined) || (response.succes !== false && response.succes !== undefined)) {
        setForecast(response);
        console.log("Forecast loaded successfully from API:", response);
      }
    } catch (error) {
      console.log("Error fetching forecast from API, using mock data instead", error);
      // Keep using mock data on error
    } finally {
      setForecastLoading(false);
    }
  };

  // Auto-load trends and forecast when metric or period changes
  useEffect(() => {
    if (user && user.id) {
      handleGetTrends();
      handleGetForecast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetric, selectedPeriod, user]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Recent Insights (wired to API) */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ marginTop: 0 }}>Recent Insights</h3>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <select value={selectedMetric} onChange={(e)=>setSelectedMetric(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(17,17,17,.85)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
                {metrics.map(m => (<option key={m} value={m}>{m}</option>))}
              </select>
              <button className="btn outline small" onClick={loadRecentInsights} disabled={recentLoading}>{recentLoading ? 'Loading…' : 'Refresh'}</button>
            </div>
          </div>
          {recentError ? (
            <div style={{ color:'var(--error)', fontSize:12, marginTop:8 }}>{recentError}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              {(recentItems.length ? recentItems.slice(0,4) : []).map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    background: "rgba(0,186,206,0.1)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    minHeight: 100,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Insight #{idx+1}{it.title ? ` — ${it.title}` : ''}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {it.body || '—'}
                  </div>
                </div>
              ))}
              {(!recentItems.length) && [1,2,3,4].map((num) => (
                <div key={`placeholder-${num}`} style={{ padding:12, background:"rgba(0,186,206,0.1)", border:"1px solid var(--border)", borderRadius:8, minHeight:100 }}>
                  <div style={{ fontWeight:600, marginBottom:8 }}>Insight #{num}</div>
                  <div style={{ fontSize:12, color:"var(--muted)" }}>No data yet.</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vitals */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Vitals</h3>
          <div style={{ marginTop: 12 }}>
            {/* Google Column Chart */}
            <GoogleColumnChart data={vitalsData} height={160} />

            {/* Vital stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Heart Rate: 72 bpm",
                "Blood Pressure: 120/80",
                "Weight: 70 kg",
                "Body Temperature: 36.6°C",
                "Blood Oxygen: 98%",
                "Respiratory Rate: 16 bpm",
              ].map((vital, i) => (
                <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>{vital.split(":")[0]}:</span>
                  <span>{vital.split(":")[1]}</span>
                </div>
              ))}
            </div>

            <button className="btn outline" style={{ marginTop: 12, width: "100%" }}>
              New Entry
            </button>
          </div>
        </div>
      </div>

      {/* Bottom section - Trends & Forecasts */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Trends & Forecasts</h3>
              {loading && <span style={{ fontSize: 12, color: "var(--primary)" }}>Loading...</span>}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              style={{
                padding: "6px 12px",
                background: "rgba(17,17,17,.85)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                minWidth: 140,
              }}
            >
              {metrics.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            {["Overview", "Daily", "Monthly"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`btn ${selectedPeriod === period ? "primary" : "outline"} small`}
                style={{ height: 32 }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* Health Trend */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Health Trend</h4>
          
            </div>
            <GoogleColumnChart data={healthTrendData} height={180} />
          </div>

          {/* Forecast */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Forecast</h4>
              {!forecast && (
                <span style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>
                  Mock data
                </span>
              )}
              {forecast && (
                <span style={{ fontSize: 10, color: "var(--success)", fontStyle: "italic" }}>
                  Live data
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <DonutChart data={forecastDonutData} size={120} />
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
                {forecastDonutData.map((item, i) => {
                  const percentage = item.value;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color }} />
                      <span style={{ color: "var(--muted)" }}>{item.label}:</span>
                      <span style={{ fontWeight: 600 }}>{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [learnMoreModal, setLearnMoreModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAlerts();
    }
  }, [user]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await ComprehensiveAlertsApi.fetchComprehensiveAlerts(user.id);
      setAlerts(response.result || response || []);
      
      if (response.result && response.result.length > 0) {
        setSelectedAlert(response.result[0]);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      showNotification("Failed to load alerts", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Alerts list */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Health Alerts</h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
            No alerts at this time
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedAlert(alert)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  background: selectedAlert === alert ? "rgba(0,186,206,0.15)" : "rgba(0,186,206,0.05)",
                  border: selectedAlert === alert ? "2px solid var(--primary)" : "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "conic-gradient(var(--warning) 0%, rgba(245,166,35,0.2) 60%, transparent 60%)",
                    border: "3px solid var(--border)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, textDecoration:'none', textTransform:'capitalize' }}>
                    {formatMetricTitle(alert.metric_name || alert.alert_type || `Alert #${idx + 1}`)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {alert.description || alert.message || "Health alert"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explanation section */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>What This Means</h3>
        {selectedAlert ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <strong>Severity:</strong>{" "}
              <span
                style={{
                  padding: "4px 8px",
                  background: selectedAlert.severity === "critical" || selectedAlert.severity === "high"
                    ? "rgba(255,76,76,0.1)"
                    : "rgba(245,166,35,0.1)",
                  color: selectedAlert.severity === "critical" || selectedAlert.severity === "high"
                    ? "var(--error)"
                    : "var(--warning)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {selectedAlert.severity?.toUpperCase() || "MEDIUM"}
              </span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--muted)", marginBottom: 12 }}>
              {selectedAlert.description || selectedAlert.message || "This is a health alert that requires attention."}
            </div>
            {selectedAlert.timestamp && (
              <div style={{ fontSize: 12, color: "var(--hint)", marginBottom: 12 }}>
                Detected: {new Date(selectedAlert.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "var(--muted)" }}>
            <p>
              Health alerts are generated based on your vital signs and health data. They help you identify
              potential health issues early and take preventive measures.
            </p>
            <p style={{ marginTop: 12 }}>
              Our AI analyzes patterns and deviations from your baseline metrics to provide personalized
              insights and recommendations.
            </p>
          </div>
        )}
        <button 
          className="btn secondary" 
          style={{ marginTop: 16, width: "100%" }}
          onClick={() => setLearnMoreModal(true)}
        >
          Learn More
        </button>
      </div>

      {/* Learn More Modal */}
      <Modal
        open={learnMoreModal}
        title="About Health Alerts"
        onClose={() => setLearnMoreModal(false)}
      >
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Understanding Health Alerts</h3>
          <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
            Health alerts are automatically generated based on your vital signs and health data. 
            Our AI system monitors your metrics 24/7 and identifies patterns or deviations from your baseline.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>Alert Severity Levels</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 12, background: "rgba(255,76,76,0.1)", border: "1px solid rgba(255,76,76,0.35)", borderRadius: 8 }}>
              <strong style={{ color: "var(--error)", marginBottom: 4, display: "block" }}>CRITICAL</strong>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Immediate medical attention required. Seek emergency care.</span>
            </div>
            <div style={{ padding: 12, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.35)", borderRadius: 8 }}>
              <strong style={{ color: "var(--warning)", marginBottom: 4, display: "block" }}>HIGH</strong>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Significant deviation from normal. Consult your healthcare provider soon.</span>
            </div>
            <div style={{ padding: 12, background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8 }}>
              <strong style={{ color: "var(--warning)", marginBottom: 4, display: "block" }}>MEDIUM</strong>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Moderate deviation. Monitor and mention at your next appointment.</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>What to Do</h4>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: "var(--muted)" }}>
            <li>Review the detailed description of each alert</li>
            <li>Consider when the alert was triggered</li>
            <li>Check if you've made any recent lifestyle changes</li>
            <li>Consult with your healthcare provider if concerned</li>
            <li>Keep a log of recurring alerts for pattern analysis</li>
          </ul>
        </div>

        <div style={{ padding: 12, background: "rgba(0,186,206,0.1)", border: "1px solid var(--primary)", borderRadius: 8 }}>
          <strong style={{ color: "var(--primary)", fontSize: 13 }}>Important Note:</strong>
          <p style={{ fontSize: 12, marginTop: 4, marginBottom: 0, color: "var(--muted)" }}>
            Health alerts are informational and educational. They are not a substitute for professional medical advice, 
            diagnosis, or treatment. Always consult a qualified healthcare provider for any health concerns.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn primary" onClick={() => setLearnMoreModal(false)}>
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UploadsTab() {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await UploadFileApi.getUserFiles(user.id);
      setFiles(response.result || response || []);
    } catch (error) {
      console.error('Error loading files:', error);
      showNotification("Failed to load files", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      showNotification("Invalid file type. Please upload PDF, images, or documents.", "error");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await UploadFileApi.uploadFile(file, user.id, "Labs", file.name);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      showNotification("File uploaded successfully", "success");
      loadFiles();
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      showNotification("Failed to upload file", "error");
    } finally {
      setUploading(false);
      // Reset input so the same file can be uploaded again
      e.target.value = '';
    }
  };

  const handleUpload = async (file) => {
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      showNotification("Invalid file type. Please upload PDF, images, or documents.", "error");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await UploadFileApi.uploadFile(file, user.id, "Labs", file.name);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      showNotification("File uploaded successfully", "success");
      loadFiles();
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      showNotification("Failed to upload file", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      await UploadFileApi.downloadFile(fileId, fileName, user.id);
      showNotification("File downloaded successfully", "success");
    } catch (error) {
      showNotification("Failed to download file", "error");
    }
  };

  const handleDeleteClick = (file) => {
    setFileToDelete(file);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      await UploadFileApi.deleteFile(fileToDelete.id || fileToDelete.file_id, user.id);
      showNotification("File deleted successfully", "success");
      loadFiles();
      setDeleteModalOpen(false);
      setFileToDelete(null);
    } catch (error) {
      showNotification("Failed to delete file", "error");
      setDeleteModalOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setFileToDelete(null);
  };

  // Open file URL in a new browser tab (prefer direct file.file.url)
  const handleOpenInNewTab = async (file) => {
    try {
      // If API provided a direct file.file.url, open it directly in a new tab
      const fileUrl = file?.file?.url || file?.file_url;
      if (fileUrl) {
        window.open(fileUrl, '_blank', 'noopener');
        return;
      }

      // Fallback: open authenticated download URL in a new tab
      const fileId = file.id || file.file_id;
      if (!fileId) return;
      const params = new URLSearchParams();
      params.append('file_id', fileId);
      if (user?.id) params.append('user_id', user.id);
      const url = `${CUSTOM_ENDPOINTS.uploudFile.downloadFile}?${params.toString()}`;
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error('Open in new tab error:', e);
      showNotification('Failed to open file in new tab', 'error');
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload section */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Upload Medical Files</h3>
          <label className="btn primary" style={{ cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading..." : "Choose File"}
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: "none" }}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </label>
        </div>
        
        {uploading && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Uploading...</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{uploadProgress}%</span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--border)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${uploadProgress}%`,
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-600) 100%)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            height: 180,
            background: dragging ? "rgba(0,186,206,0.1)" : "rgba(0,186,206,0.05)",
            border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            fontSize: 14,
            transition: "all 0.2s",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Uploading...</div>
            </>
          ) : dragging ? (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ marginBottom: 8 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div style={{ fontWeight: 600, color: "var(--primary)" }}>Drop file here</div>
            </>
          ) : (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 8, opacity: 0.5 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drag & drop files here</div>
              <div style={{ fontSize: 12 }}>or click to browse</div>
              <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>
                Supports: PDF, JPG, PNG, DOC, DOCX
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results table */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lab Results</h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
            No files uploaded yet
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 8px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>
                    Test/File
                  </th>
                  <th style={{ padding: "12px 8px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>
                    Date
                  </th>
                  <th style={{ padding: "12px 8px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>
                    Category
                  </th>
                  <th style={{ padding: "12px 8px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 8px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, idx) => (
                  <tr 
                    key={idx} 
                    style={{ 
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,186,206,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    onClick={() => handleOpenInNewTab(file)}
                  >
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>📄</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{file.filename || file.file_name || `File #${idx + 1}`}</div>
                          {file.file_type && (
                            <div style={{ fontSize: 11, color: "var(--hint)" }}>{file.file_type.toUpperCase()}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--muted)" }}>
                      {file.created_at
                        ? new Date(file.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : file.uploaded_at
                        ? new Date(file.uploaded_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--muted)" }}>
                      {file.category || "Uncategorized"}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background: "rgba(0,195,122,0.1)",
                          color: "var(--success)",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Processed
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn ghost small"
                          style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => handleDownload(file.id || file.file_id, file.filename || file.file_name)}
                          title="Download file"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </button>
                        <button
                          className="btn ghost small"
                          style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error)" }}
                          onClick={() => handleDeleteClick(file)}
                          title="Delete file"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        title="Confirm Delete"
        onClose={handleDeleteCancel}
      >
        <p style={{ marginBottom: 20 }}>
          Are you sure you want to delete this file?
        </p>
        {fileToDelete && (
          <div style={{ padding: 12, background: "rgba(255,76,76,0.1)", border: "1px solid rgba(255,76,76,0.35)", borderRadius: 8, marginBottom: 20 }}>
            <strong>{fileToDelete.filename || fileToDelete.file_name}</strong>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button className="btn outline" onClick={handleDeleteCancel}>
            Cancel
          </button>
          <button className="btn danger" onClick={handleDeleteConfirm}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}