import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/providers";

/**
 * فونت Vazirmatn — فونت اصلی رابط کاربری فارسی
 * از Google Fonts بارگذاری می‌شود و در تمام صفحات استفاده می‌گردد
 */
const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "عکاسی نسیم — سامانه مدیریت استودیو",
  description:
    "سامانه جامع مدیریت استودیو عکاسی و فیلم‌برداری: مشتریان، پروژه‌ها، مالی، تقویم و گزارش‌ها.",
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/*
         * اسکریپت مدیریت خطاهای بارگذاری در iframe پیش‌نمایش Z.ai
         *
         * این اسکریپت فقط وقتی صفحه داخل iframe باشد (پنل پیش‌نمایش) اجرا می‌شود.
         *
         * سه کار انجام می‌دهد:
         *
         * ۱. مسدود کردن HMR WebSocket:
         *    در حالت توسعه، Next.js یک WebSocket برای Hot Module Replacement باز می‌کند.
         *    اما در iframe با منبع متفاوت (cross-origin)، این WebSocket باعث خطای
         *    "Module factory is not available" می‌شود. پس آن را مسدود می‌کنیم.
         *
         * ۲. اصلاح آدرس chunkهای دوگانه:
         *    در webpack dev mode گاهی آدرس chunk به‌صورت /_next//_next/static/... ساخته
         *    می‌شود (دو بار _next). این اسکریپت آدرس را قبل از بارگذاری اصلاح می‌کند.
         *
         * ۳. مدیریت خودکار خطای ChunkLoadError:
         *    وقتی یک chunk بارگذاری نمی‌شود (مثلاً disgust تغییر کد در حین بارگذاری)،
         *    به جای نمایش صفحه خطا، صفحه به‌صورت خودکار reload می‌شود.
         *    این کار با intercept کردن تابع __webpack_require__.e انجام می‌شود.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // فقط داخل iframe اجرا شود (پنل پیش‌نمایش Z.ai)
                if (window.self === window.top) return;

                try {
                  // ۱. مسدود کردن HMR WebSocket برای جلوگیری از خطای module factory
                  var OrigWS = window.WebSocket;
                  window.WebSocket = function(url, protocols) {
                    if (typeof url === 'string' && url.indexOf('webpack-hmr') !== -1) {
                      return {
                        close: function() {}, send: function() {},
                        addEventListener: function() {}, removeEventListener: function() {},
                        dispatchEvent: function() { return false; },
                        readyState: 3,
                        CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3
                      };
                    }
                    return new OrigWS(url, protocols);
                  };
                  window.WebSocket.CONNECTING = 0;
                  window.WebSocket.OPEN = 1;
                  window.WebSocket.CLOSING = 2;
                  window.WebSocket.CLOSED = 3;

                  // ۲. intercept کردن بارگذاری chunkها برای اصلاح آدرس و مدیریت خطا
                  // وقتی webpack آماده شد، تابع __webpack_require__.e را patch می‌کنیم
                  var patchWebpack = function() {
                    if (!window.__webpack_require__ || !window.__webpack_require__.e) {
                      // webpack هنوز بارگذاری نشده — ۱۰۰ms دیگر امتحان کن
                      setTimeout(patchWebpack, 100);
                      return;
                    }

                    var origE = window.__webpack_require__.e;
                    window.__webpack_require__.e = function(chunkId) {
                      return origE.call(this, chunkId).catch(function(err) {
                        // اگر خطا مربوط به بارگذاری chunk است، صفحه را reload کن
                        console.warn('Chunk load failed, reloading...', chunkId);
                        window.location.reload();
                        // promise را reject کن تا webpack متوقف شود
                        throw err;
                      });
                    };
                  };
                  patchWebpack();

                  // ۳. مدیریت خطای unhandled rejection (مثل dynamic import ناموفق)
                  // این دستگیر هر گونه rejection که شامل "Loading chunk" یا "Module" باشد
                  window.addEventListener('unhandledrejection', function(event) {
                    var msg = '';
                    try {
                      if (event.reason && event.reason.message) msg = event.reason.message;
                      else if (typeof event.reason === 'string') msg = event.reason;
                    } catch(e) {}

                    if (msg.indexOf('Loading chunk') !== -1 ||
                        msg.indexOf('Module factory') !== -1 ||
                        msg.indexOf('Loading CSS chunk') !== -1 ||
                        msg.indexOf('Failed to fetch dynamically imported module') !== -1) {
                      event.preventDefault();
                      window.location.reload();
                    }
                  });

                  // ۴. مدیریت خطای عمومی window.onerror
                  window.addEventListener('error', function(event) {
                    var msg = (event && event.message) || '';
                    if (msg.indexOf('Loading chunk') !== -1 ||
                        msg.indexOf('Module factory') !== -1 ||
                        msg.indexOf('Failed to fetch dynamically imported module') !== -1) {
                      event.preventDefault();
                      window.location.reload();
                      return true;
                    }
                  }, true);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${vazir.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors closeButton position="bottom-left" />
        </Providers>
      </body>
    </html>
  );
}

