/** Tailwind config added for dynamic grid column classes & color states used in ChoiceGroup */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './srcs/frontend/app/src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // grid column utilities potentially used by ChoiceGroup
    'grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4',
    'grid-cols-5','grid-cols-6','grid-cols-7','grid-cols-8',
    'grid-cols-9','grid-cols-10','grid-cols-11','grid-cols-12',
    // active state color combos you rely on (expand if needed)
    'border-cyan-400','bg-cyan-400/20','text-cyan-300',
    'border-purple-400','bg-purple-400/20','text-purple-300',
    'border-pink-400','bg-pink-400/20','text-pink-300',
    'border-emerald-400','bg-emerald-400/20','text-emerald-300',
    // inactive / hover states
    'border-slate-600','hover:border-slate-500','text-slate-400','hover:text-slate-300'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
