/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta institucional moderna - Rojo institucional
        primary: {
          DEFAULT: '#ff1f3d',  // Rojo institucional vivo
          dark: '#c9142f',
          light: '#ff4d5e',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#e4032e',
          600: '#b80225',
          700: '#8b021c',
          800: '#5e0113',
          900: '#31000a',
        },
        // Color de acción positiva
        success: {
          DEFAULT: '#2f855a',
          dark: '#276749',
          light: '#48bb78',
          50: '#f0fff4',
          100: '#c6f6d5',
          200: '#9ae6b4',
          300: '#68d391',
          400: '#48bb78',
          500: '#2f855a',
          600: '#276749',
          700: '#22543d',
          800: '#1c4532',
          900: '#14352a',
        },
        // Colores institucionales
        institutional: {
          black: '#1a202c',
          white: '#ffffff',
          gray: '#718096',
        },
        // Estados de actividad (suavizados)
        status: {
          borrador: '#d69e2e',
          enviada: '#e4032e',  // Rojo institucional
          aprobada: '#38a169',
          rechazada: '#b80225',
          publicada: '#2f855a',
        },
        // Grises neutrales refinados
        neutral: {
          50: '#f7fafc',
          100: '#edf2f7',
          200: '#e2e8f0',
          300: '#cbd5e0',
          400: '#a0aec0',
          500: '#718096',
          600: '#4a5568',
          700: '#2d3748',
          800: '#1a202c',
          900: '#171923',
        },
        // Superficie y fondos
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f7fafc',
          elevated: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Grotesca institucional para titulos y etiquetas de seccion.
        display: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
        // Cifras tabulares: en un tablero comparativo los numeros tienen que
        // alinearse columna a columna.
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5715' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        'card': '0 2px 8px -2px rgba(228, 3, 46, 0.08), 0 4px 12px -4px rgba(228, 3, 46, 0.06)',
        'card-hover': '0 8px 20px -4px rgba(228, 3, 46, 0.12), 0 4px 12px -4px rgba(228, 3, 46, 0.08)',
        'button': '0 1px 2px 0 rgba(228, 3, 46, 0.08)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.75), 0 8px 24px -12px rgba(16,24,40,0.18)',
        'glass-hover': 'inset 0 1px 0 rgba(255,255,255,0.85), 0 16px 32px -14px rgba(16,24,40,0.26)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      transitionDuration: {
        '250': '250ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
