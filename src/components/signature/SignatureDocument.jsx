import { useState } from 'react';
import SignaturePad from './SignaturePad.jsx';
import { generatePdf } from '../../utils/generatePdf.js';

const DEFAULT_SIGNATORIES = [
  { label: 'Einweiser' },
  { label: 'Eingewiesene Person' },
];

const s = {
  wrapper: {
    padding: '8px 0 4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#111827',
  },
  submitBtn: (enabled) => ({
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: enabled ? '#2563eb' : '#d1d5db',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  }),
  hint: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
  },
};

export default function SignatureDocument({
  title = 'Unterschriften',
  date,
  signatories = DEFAULT_SIGNATORIES,
  onComplete,
  downloadFileName = 'unterschrift.pdf',
  initialNames = [],
}) {
  const [names, setNames] = useState(() =>
    signatories.map((_, i) => initialNames[i] || '')
  );
  const [signatures, setSignatures] = useState(() => signatories.map(() => null));

  const allSigned = signatures.every((sig) => sig !== null);
  const missingCount = signatures.filter((sig) => sig === null).length;

  const handleNameChange = (index, value) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSignatureChange = (index, dataUrl) => {
    setSignatures((prev) => {
      const next = [...prev];
      next[index] = dataUrl;
      return next;
    });
  };

  const handleCreate = () => {
    if (!allSigned) return;

    const signatoryData = signatories.map((sig, i) => ({
      label: sig.label,
      name: names[i],
      signatureDataUrl: signatures[i],
    }));

    const pdfDataUrl = generatePdf({
      title,
      date: date || new Date(),
      signatories: signatoryData,
      fileName: downloadFileName,
    });

    onComplete?.(pdfDataUrl);
  };

  return (
    <div style={s.wrapper}>
      {signatories.map((sig, i) => (
        <SignaturePad
          key={i}
          label={sig.label}
          name={names[i]}
          onNameChange={(val) => handleNameChange(i, val)}
          onSignatureChange={(dataUrl) => handleSignatureChange(i, dataUrl)}
        />
      ))}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!allSigned}
        style={s.submitBtn(allSigned)}
      >
        PDF erstellen &amp; herunterladen
      </button>
      {!allSigned && (
        <p style={s.hint}>
          {missingCount === 1
            ? 'Es fehlt noch 1 Unterschrift'
            : `Es fehlen noch ${missingCount} Unterschriften`}
        </p>
      )}
    </div>
  );
}
