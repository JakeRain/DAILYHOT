import { defineWebModule } from "@aihot/web/modules";
import { L } from "@aihot/web/lib/i18n";

function IconRadar({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12L18.5 5.5" />
    </svg>
  );
}

export default defineWebModule({
  name: "tech-insights",
  sidebar: {
    sectionKey: "tech-insights",
    section: L("技术洞察", "Tech Insights"),
    items: [
      { to: "/tech-insights", label: L("方向看板", "Tech Radar"), icon: IconRadar, covers: ["/tech-insights/reports"] },
    ],
  },
});
