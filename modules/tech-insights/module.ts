import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "tech-insights",
  pages: [
    { path: "tech-insights", file: "web/dashboard.tsx", id: "tech-insights-dashboard" },
    { path: "tech-insights/reports/:id", file: "web/report.tsx", id: "tech-insights-report" },
    { path: "tech-insights/taxonomy", file: "web/admin-taxonomy.tsx", id: "admin-tech-insights-taxonomy", admin: true, nav: "技术方向树" },
    { path: "tech-insights/reports", file: "web/admin-reports.tsx", id: "admin-tech-insights-reports", admin: true, nav: "技术洞察周报" },
  ],
  apiPaths: [
    /^\/api\/tech-insights(\/|$)/,
    /^\/api\/admin\/tech-insights(\/|$)/,
  ],
});
