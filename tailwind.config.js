/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    dark: "#050505",
                    accent: "#00f3ff",
                    secondary: "#ff00e5",
                    glass: "rgba(255, 255, 255, 0.05)",
                    border: "rgba(0, 243, 255, 0.2)",
                },
            },
            backgroundImage: {
                'cyber-grid': "radial-gradient(circle, rgba(0, 243, 255, 0.1) 1px, transparent 1px)",
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
