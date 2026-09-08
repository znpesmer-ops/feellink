"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TopEventsChartProps {
  events: {
    id: string;
    title: string;
    ticketCount: number;
  }[];
}

export default function TopEventsChart({ events }: TopEventsChartProps) {
  const router = useRouter();
  const chartRef = useRef<any>(null);
  const [isDark, setIsDark] = useState(false);

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== "undefined") {
        setIsDark(document.documentElement.classList.contains("dark"));
      }
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  const sortedEvents = [...events]
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 5); // En çok 5 tanesini göster

  if (sortedEvents.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111824]/84">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.12),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.10),transparent_30%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.14),transparent_30%)]" />
        <h3 className="relative text-base font-black text-slate-950 dark:text-white mb-2">
          En Çok Katılım Alan Etkinlikler
        </h3>
        <div className="relative h-[2px] w-20 bg-[#ff7b00] rounded-full mb-4" />
        <p className="relative text-slate-600 dark:text-slate-400 text-sm">
          Henüz etkinlik verisi bulunmuyor.
        </p>
      </div>
    );
  }

  const data = {
    labels: sortedEvents.map((e) => e.title),
    datasets: [
      {
        label: "Bilet Sayısı",
        data: sortedEvents.map((e) => e.ticketCount),
        backgroundColor: "#ff7b00",
        hoverBackgroundColor: "#ff9d33",
        borderRadius: 10,
        barThickness: 35,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const, // YATAY grafik (Spotify tarzı)
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeInOutQuart" as const,
    },
    interaction: {
      mode: "nearest" as const,
      intersect: true,
    },
    onHover: (event: any, activeElements: any[]) => {
      if (event.native) {
        event.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#fff" : "#1f1f1f",
        bodyColor: "#ff7b00",
        borderColor: "#ff7b00",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.x} bilet satıldı`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: isDark ? "#aaa" : "#666",
          font: {
            size: 11,
          },
          stepSize: 1,
          callback: (value: any) => `${value} bilet`,
        },
        grid: {
          color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          color: isDark ? "#fff" : "#1f1f1f",
          font: {
            size: 12,
            weight: "500" as const,
          },
        },
        grid: {
          display: false,
        },
      },
    },
    onClick: (event: any, activeElements: any[]) => {
      if (!chartRef.current || activeElements.length === 0) return;
      
      const chart = chartRef.current;
      const clickedIndex = activeElements[0].index;
      const clickedEvent = sortedEvents[clickedIndex];
      
      if (clickedEvent?.id) {
        // 🎯 Yönlendirme - yumuşak geçiş ile
        router.push(`/events/${clickedEvent.id}`);
      }
    },
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111824]/84">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.12),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.10),transparent_30%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.14),transparent_30%)]" />
      <h3 className="relative text-base font-black text-slate-950 dark:text-white mb-2">
        En Çok Katılım Alan Etkinlikler
      </h3>
      <div className="relative h-[2px] w-20 bg-[#ff7b00] rounded-full mb-6" />
      <div className="relative h-64 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/25">
        <Bar ref={chartRef} data={data} options={options as any} />
      </div>
      <p className="relative text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
        Top {sortedEvents.length} etkinlik — toplam {sortedEvents.reduce((sum, e) => sum + e.ticketCount, 0)} bilet satışı
      </p>
    </div>
  );
}
