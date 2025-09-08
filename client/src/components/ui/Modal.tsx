import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";   // 배경 스크롤 잠금
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000]">                   {/* 탭바보다 높은 z */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 top-0 mx-auto max-w-xl
                   bg-white rounded-t-2xl md:rounded-2xl shadow-xl
                   flex flex-col max-h-[100svh] overflow-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }} // 아이폰 홈바 대응
      >
        <div className="flex-1 overflow-y-auto overscroll-contain"> {/* 내부 스크롤 */}
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}