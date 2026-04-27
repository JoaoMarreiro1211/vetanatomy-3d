module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './features/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F9FCFA',
        foreground: '#1F2A22',
        card: '#FFFFFF',
        border: '#D8E8DC',
        primary: {
          DEFAULT: '#9DCFA6',
          strong: '#7FBF8E',
          soft: '#DFF3E3',
          foreground: '#1F2A22',
        },
        secondary: { surface: '#F6FBF7' },
        muted: { DEFAULT: '#EEF6F0', foreground: '#5F7265' },
        success: '#6FBF73',
        warning: '#D7B267',
        danger: '#D97C7C',
        info: '#8BB8A8',
      },
      boxShadow: {
        clinical: '0 12px 32px rgba(31, 42, 34, 0.08)',
      },
    },
  },
  plugins: [],
};
