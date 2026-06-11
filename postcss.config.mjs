// Tailwind CSS v4 只需要 @tailwindcss/postcss 插件
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // Tailwind CSS v4 必需
    autoprefixer: {}, // 可选：自动添加浏览器前缀
  },
};

export default config;
