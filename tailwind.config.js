/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1e1e1e',
          secondary: '#252526',
          tertiary: '#2d2d2d',
          hover: '#37373d',
          active: '#094771'
        },
        text: {
          primary: '#cccccc',
          secondary: '#858585',
          accent: '#569cd6',
          link: '#4fc1ff'
        },
        border: {
          DEFAULT: '#3c3c3c',
          focus: '#007fd4'
        },
        status: {
          added: '#73c991',
          modified: '#e2c08d',
          deleted: '#c74e39',
          conflict: '#e51400',
          untracked: '#858585'
        }
      }
    }
  },
  plugins: []
}
