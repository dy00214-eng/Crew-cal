import { useOnline } from '../lib/useOnline.ts';

/** 오프라인일 때 상단에 얇은 바 하나. 모달이나 토스트로 방해하지 않는다. */
export default function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offlinebar" role="status">
      오프라인 — 저장·기록은 그대로 됩니다
    </div>
  );
}
