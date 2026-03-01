/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './frontend/index.html',
        './frontend/assets/app.js',
        './frontend/assets/defs.js',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                }
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'soft': '0 4px 20px -5px rgba(0,0,0,0.05)',
                'glow': '0 0 15px rgba(59, 130, 246, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
            },
        },
    },
    plugins: [],
}
