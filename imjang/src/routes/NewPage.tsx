import PropertyCreator from '../components/PropertyCreator.tsx';
import { emptyProperty } from '../db/repo.ts';
import { useState } from 'react';

export default function NewPage() {
  // 매 렌더마다 새 id 가 생기면 안 된다.
  const [initial] = useState(() => emptyProperty());
  return <PropertyCreator initial={initial} title="매물 담기" />;
}
