import './globals.css'
import type { Metadata } from 'next'
import ExtensionErrorGuard from './ExtensionErrorGuard'
import Script from 'next/script'
import SiteHeader from './components/SiteHeader'

export const metadata: Metadata = {
  title: 'Bitcoin Frogs',
  description: 'RIBBIT',
  icons: {
    icon: '/frogs/favicon.png',
    shortcut: '/frogs/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="ext-error-guard-pre" strategy="beforeInteractive">
          {`
            (function(){
              function isExt(src){
                return typeof src === 'string' && (src.includes('chrome-extension://') || src.includes('moz-extension://') || src.includes('safari-extension://'));
              }
              window.addEventListener('error', function(e){
                var src = (e && e.filename ? e.filename : '') + '\n' + ((e && e.error && e.error.stack) || '');
                var msg = (e && e.message) || '';
                if (isExt(src) || msg.indexOf('Cannot redefine property: ethereum') !== -1 || msg.indexOf('Cannot convert undefined or null to object') !== -1) {
                  try { e.preventDefault(); } catch(_){ }
                  try { e.stopImmediatePropagation && e.stopImmediatePropagation(); } catch(_){ }
                  return false;
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e){
                var r = e && e.reason; var stack = (r && r.stack) || ''; var msg = (r && r.message) || (r+'');
                if (isExt(stack) || msg.indexOf('Cannot redefine property: ethereum') !== -1 || msg.indexOf('Cannot convert undefined or null to object') !== -1) {
                  try { e.preventDefault(); } catch(_){ }
                  try { e.stopImmediatePropagation && e.stopImmediatePropagation(); } catch(_){ }
                  return false;
                }
              }, true);
            })();
          `}
        </Script>
      </head>
      <body className="font-press">
        <ExtensionErrorGuard />
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  )
}
