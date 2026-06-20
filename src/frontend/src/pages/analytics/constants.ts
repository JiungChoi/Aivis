// CSS animations injected via a <style> tag in AnalyticsPage.
export const ANIMATION_CSS = `
@keyframes analytics-dash {
  to { stroke-dashoffset: -20; }
}
@keyframes analytics-dash-dim {
  to { stroke-dashoffset: -14; }
}
@keyframes star-twinkle {
  0%, 100% { opacity: var(--star-base, 0.5); }
  50%       { opacity: calc(var(--star-base, 0.5) * 0.25); }
}
`;
