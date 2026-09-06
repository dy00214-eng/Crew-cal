import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveProperty } from '../db/repo.ts';
import type { Property } from '../db/types.ts';
import PropertyForm from './PropertyForm.tsx';
import TopBar from './TopBar.tsx';

/** 담기 화면 본체. 직접 입력과 공유로 담기가 같은 폼을 쓴다. */
export default function PropertyCreator({
  initial,
  title,
  note,
}: {
  initial: Property;
  title: string;
  note?: ReactNode;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Property>(initial);
  const [saving, setSaving] = useState(false);

  const canSave = Boolean(draft.title.trim() || draft.address.trim() || draft.price > 0);

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const id = await saveProperty(draft);
      navigate(`/p/${id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title={title} back="-1" />
      {note}
      <main className="main">
        <PropertyForm value={draft} onChange={setDraft} />
      </main>
      <div className="bottombar">
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          취소
        </button>
        <button type="button" className="btn btn-primary" disabled={!canSave || saving} onClick={save}>
          저장
        </button>
      </div>
    </>
  );
}
