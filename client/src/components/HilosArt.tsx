import React from 'react';

// Character SVG - The signature hilos animal mascot with ears and friendly expression
export const HilosCharacter: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="52" r="38" fill="#F87171" stroke="#141510" strokeWidth="3" />
    {/* Ears */}
    <path d="M26 30L16 12C28 16 34 26 34 26" fill="#F87171" stroke="#141510" strokeWidth="3" strokeLinejoin="round" />
    <path d="M74 30L84 12C72 16 66 26 66 26" fill="#F87171" stroke="#141510" strokeWidth="3" strokeLinejoin="round" />
    {/* Inner ears */}
    <polygon points="23,24 19,16 28,24" fill="#FEE2E2" />
    <polygon points="77,24 81,16 72,24" fill="#FEE2E2" />
    {/* Cheeks / White Face mask */}
    <path d="M24 50C24 66 36 78 50 78C64 78 76 66 76 50C76 44 70 42 64 48C56 54 44 54 36 48C30 42 24 44 24 50Z" fill="#FFFBEB" stroke="#141510" strokeWidth="2.5" />
    {/* Eyes */}
    <circle cx="38" cy="46" r="4.5" fill="#141510" />
    <circle cx="62" cy="46" r="4.5" fill="#141510" />
    <circle cx="39.5" cy="44.5" r="1.5" fill="#FFFFFF" />
    <circle cx="63.5" cy="44.5" r="1.5" fill="#FFFFFF" />
    {/* Nose and Mouth */}
    <ellipse cx="50" cy="55" rx="3.5" ry="2.5" fill="#141510" />
    <path d="M46 60C48 62 52 62 54 60" stroke="#141510" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Animal portrait generator with distinctive colors and styles
export const AnimalPortrait: React.FC<{ type: string; size?: number }> = ({ type, size = 36 }) => {
  const getColors = () => {
    switch (type) {
      case 'cat':
        return { bg: '#FDE68A', ear: '#F59E0B', nose: '#EF4444' };
      case 'owl':
        return { bg: '#E0E7FF', ear: '#6366F1', nose: '#F59E0B' };
      case 'bunny':
        return { bg: '#FCE7F3', ear: '#EC4899', nose: '#F43F5E' };
      case 'racoon':
        return { bg: '#E2E8F0', ear: '#475569', nose: '#0F172A' };
      case 'fox':
        return { bg: '#FFEDD5', ear: '#F97316', nose: '#141510' };
      case 'duck':
        return { bg: '#FEF08A', ear: '#EAB308', nose: '#F97316' };
      case 'horse':
        return { bg: '#FED7AA', ear: '#B45309', nose: '#78350F' };
      case 'elephant':
        return { bg: '#CFFAFE', ear: '#06B6D4', nose: '#0891B2' };
      case 'deer':
        return { bg: '#FEE2E2', ear: '#DC2626', nose: '#991B1B' };
      case 'pig':
        return { bg: '#FCE7F3', ear: '#F472B6', nose: '#DB2777' };
      case 'bird':
        return { bg: '#DCFCE7', ear: '#22C55E', nose: '#15803D' };
      case 'croco':
        return { bg: '#D1FAE5', ear: '#10B981', nose: '#047857' };
      default:
        return { bg: '#E5E7EB', ear: '#6B7280', nose: '#374151' };
    }
  };

  const c = getColors();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '28%',
        backgroundColor: c.bg,
        border: '1px solid rgba(20,21,16,0.14)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="22" r="14" fill={c.bg} />
        {/* Cute face dots */}
        <circle cx="15" cy="20" r="2" fill="#141510" />
        <circle cx="25" cy="20" r="2" fill="#141510" />
        <ellipse cx="20" cy="25" rx="2" ry="1.5" fill={c.nose} />
        {/* Simple ears */}
        <polygon points="10,14 14,8 18,14" fill={c.ear} />
        <polygon points="22,14 26,8 30,14" fill={c.ear} />
      </svg>
    </div>
  );
};

// Vector Illustrations for Feature Cards
export const FeatureIllustration: React.FC<{ name: string }> = ({ name }) => {
  switch (name) {
    case 'briefcase':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <rect x="20" y="35" width="60" height="45" rx="8" fill="#FDE047" stroke="#141510" strokeWidth="3" />
          <path d="M38 35V26C38 22.6863 40.6863 20 44 20H56C59.3137 20 62 22.6863 62 26V35" stroke="#141510" strokeWidth="3" />
          <line x1="20" y1="52" x2="80" y2="52" stroke="#141510" strokeWidth="2.5" />
          <rect x="44" y="47" width="12" height="10" rx="2" fill="#FFFFFF" stroke="#141510" strokeWidth="2" />
          <circle cx="28" cy="22" r="8" fill="#60A5FA" stroke="#141510" strokeWidth="2" />
        </svg>
      );
    case 'banana':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <path d="M22 62C22 62 38 78 68 64C72 62 78 52 76 44C74 38 66 38 62 42C56 48 46 54 30 50L22 62Z" fill="#FACC15" stroke="#141510" strokeWidth="3" />
          <rect x="42" y="38" width="40" height="28" rx="4" fill="#E2E8F0" stroke="#141510" strokeWidth="2.5" />
          <rect x="46" y="42" width="32" height="18" rx="2" fill="#3B82F6" />
          <line x1="38" y1="66" x2="86" y2="66" stroke="#141510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'unicycle':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="70" r="18" fill="#F1F5F9" stroke="#141510" strokeWidth="3" />
          <circle cx="50" cy="70" r="4" fill="#141510" />
          <line x1="50" y1="70" x2="50" y2="40" stroke="#141510" strokeWidth="3" />
          <path d="M40 38H60" stroke="#141510" strokeWidth="3" strokeLinecap="round" />
          {/* Friendly alligator head */}
          <path d="M42 36C42 24 58 18 72 26C76 28 80 34 76 38C70 42 54 44 42 36Z" fill="#4ADE80" stroke="#141510" strokeWidth="2.5" />
          <circle cx="58" cy="24" r="3" fill="#141510" />
        </svg>
      );
    case 'croc':
      return (
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <ellipse cx="50" cy="55" rx="36" ry="24" fill="#86EFAC" stroke="#141510" strokeWidth="3" />
          <path d="M20 45C26 34 40 32 50 36C60 32 74 34 80 45" stroke="#141510" strokeWidth="3" />
          <circle cx="35" cy="44" r="4" fill="#141510" />
          <circle cx="65" cy="44" r="4" fill="#141510" />
          <path d="M30 62C40 68 60 68 70 62" stroke="#141510" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'duck':
      return (
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="40" r="20" fill="#FDE047" stroke="#141510" strokeWidth="3" />
          <path d="M66 38L84 42L66 48Z" fill="#F97316" stroke="#141510" strokeWidth="2" />
          <circle cx="58" cy="35" r="3.5" fill="#141510" />
          <rect x="25" y="75" width="50" height="6" rx="3" fill="#141510" />
          <circle cx="30" cy="85" r="8" fill="#E2E8F0" stroke="#141510" strokeWidth="3" />
          <circle cx="70" cy="85" r="8" fill="#E2E8F0" stroke="#141510" strokeWidth="3" />
          <line x1="30" y1="75" x2="50" y2="58" stroke="#141510" strokeWidth="3" />
        </svg>
      );
    case 'monitor':
      return (
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <rect x="18" y="20" width="64" height="48" rx="8" fill="#F8FAFC" stroke="#141510" strokeWidth="3" />
          <rect x="24" y="26" width="52" height="36" rx="4" fill="#3B82F6" stroke="#141510" strokeWidth="2" />
          <line x1="32" y1="36" x2="68" y2="36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="44" x2="54" y2="44" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 68L36 82H64L58 68" fill="#E2E8F0" stroke="#141510" strokeWidth="2.5" />
        </svg>
      );
    case 'key':
      return (
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <circle cx="38" cy="50" r="18" fill="#FDBA74" stroke="#141510" strokeWidth="3" />
          <circle cx="38" cy="50" r="8" fill="#FFFFFF" stroke="#141510" strokeWidth="2.5" />
          <line x1="56" y1="50" x2="84" y2="50" stroke="#141510" strokeWidth="4" strokeLinecap="round" />
          <line x1="72" y1="50" x2="72" y2="60" stroke="#141510" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="80" y1="50" x2="80" y2="60" stroke="#141510" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 'floppy':
      return (
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <rect x="22" y="20" width="56" height="60" rx="6" fill="#FCA5A5" stroke="#141510" strokeWidth="3" />
          <rect x="34" y="20" width="32" height="24" rx="2" fill="#E2E8F0" stroke="#141510" strokeWidth="2" />
          <rect x="32" y="56" width="36" height="24" rx="2" fill="#FFFFFF" stroke="#141510" strokeWidth="2" />
          <line x1="38" y1="64" x2="62" y2="64" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'coffee':
      return (
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <rect x="26" y="38" width="44" height="42" rx="8" fill="#93C5FD" stroke="#141510" strokeWidth="3" />
          <path d="M70 46C78 46 82 52 82 58C82 64 76 68 70 68" stroke="#141510" strokeWidth="3" strokeLinecap="round" />
          {/* Steam */}
          <path d="M36 28C34 22 40 18 38 14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <path d="M48 30C46 24 52 20 50 16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <path d="M60 28C58 22 64 18 62 14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};
