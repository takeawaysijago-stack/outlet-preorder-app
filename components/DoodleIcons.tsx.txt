// Ikon gaya "doodle" — garis tebal hitam, bentuk sedikit tidak simetris/miring
// biar terasa digambar tangan, senada sama gaya logo Geprek Si Jago.

export function IkonCentang({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 13.5c2 2 4.5 4.5 5.5 5.5C12 15.5 16 9 20 5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IkonLonceng({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c-3.5 0-4.5 3-4.7 6.5-.1 2-.5 3.5-1.8 5h13c-1.3-1.5-1.7-3-1.8-5C16.5 6 15.5 3 12 3Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M9.5 17.5c.3 1.3 1.2 2 2.5 2s2.2-.7 2.5-2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IkonSilang({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.5 5.5 18.7 18.7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M18.5 5.5 5.3 18.7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function IkonJamPasir({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3.5h12M6 20.5h12M7 3.5c0 4 3 5.5 5 6.5 2-1 5-2.5 5-6.5M7 20.5c0-4 3-5.5 5-6.5 2 1 5 2.5 5 6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IkonPiring({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="9" ry="7" stroke="currentColor" strokeWidth="2.3" />
      <ellipse cx="12" cy="12" rx="4.5" ry="3.3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IkonGelas({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4h10l-1.2 15.5a1 1 0 0 1-1 .9H9.2a1 1 0 0 1-1-.9L7 4Z"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path d="M8 9.5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
