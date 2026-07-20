import { format } from 'date-fns';

export function BottomStatusBar() {
  const now = new Date();
  return (
    <footer className="no-print flex h-6 shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-800 px-4 text-2xs text-slate-300">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
          <span>Hệ thống hoạt động bình thường</span>
        </div>
        <span className="text-slate-500">|</span>
        <span>Phiên bản: 0.1.0</span>
        <span className="text-slate-500">|</span>
        <span>Cơ sở dữ liệu: Phòng TCCB – Sở GDĐT Lạng Sơn</span>
      </div>
      <div className="text-slate-400">
        Ngày: {format(now, 'dd/MM/yyyy · HH:mm')}
      </div>
    </footer>
  );
}
