// Phase 1.5: Tailwind удалён, используем CSS-переменные (Aurora design tokens).
// autoprefixer оставлен для совместимости с Capacitor WebView (CSS Grid, flexbox).
module.exports = {
  plugins: {
    autoprefixer: {},
  },
};
