import { useEffect, useState } from 'react';

/**
 * 숫자 입력. 지우는 중간 상태("", "12.")를 허용해야 해서 문자열을 따로 들고 있는다.
 */
export default function NumberField({
  label,
  value,
  onChange,
  suffix,
  step,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  suffix?: string;
  step?: 'int' | 'decimal';
  placeholder?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    const current = text.trim() === '' ? undefined : Number(text);
    if (current !== value && !(Number.isNaN(current as number) && value == null)) {
      setText(value == null ? '' : String(value));
    }
    // value 가 밖에서 바뀔 때만 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="field suffix">
      <span>{label}</span>
      <input
        type="text"
        inputMode={step === 'decimal' ? 'decimal' : 'numeric'}
        className="num"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d.]/g, '');
          setText(next);
          const n = next.trim() === '' ? undefined : Number(next);
          onChange(n == null || Number.isNaN(n) ? undefined : n);
        }}
      />
      {suffix && <i>{suffix}</i>}
    </label>
  );
}
