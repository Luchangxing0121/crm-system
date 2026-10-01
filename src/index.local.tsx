/**
 * 本地部署专用入口
 *
 * 与平台版本 index.tsx 的区别：
 * 1. 使用 HashRouter 而非 BrowserRouter — 直接双击 index.html 打开也能正常路由
 * 2. 不依赖 AppContainer / ErrorRender 等飞书平台组件
 * 3. basename 固定为空（hash 路由不需要）
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import App from './app';
import './index.css';

function LocalErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div
      style={{
        padding: '40px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1A1A1A',
        background: '#F4F7F9',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', background: '#fff', padding: 32, borderRadius: 8 }}>
        <h2 style={{ marginTop: 0, color: '#EF4444' }}>应用运行出错</h2>
        <p style={{ color: '#64748b' }}>很抱歉，应用遇到了意外错误。您可以尝试刷新页面。</p>
        <pre
          style={{
            background: '#F8FAFC',
            padding: 16,
            borderRadius: 6,
            fontSize: 13,
            overflow: 'auto',
            color: '#334155',
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          style={{
            marginTop: 16,
            padding: '8px 20px',
            background: '#0033A0',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          重试
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ErrorBoundary FallbackComponent={LocalErrorFallback}>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>,
);
