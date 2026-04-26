import { useRef, useState, useCallback } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';

const s = {
  container: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: '#ffffff',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    fontSize: '15px',
    marginBottom: '10px',
    color: '#111827',
  },
  nameInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
    marginBottom: '12px',
    outline: 'none',
  },
  canvasWrapper: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#f9fafb',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '150px',
    touchAction: 'none',
  },
  placeholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#9ca3af',
    fontSize: '14px',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  clearBtn: {
    marginTop: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    color: '#374151',
  },
};

export default function SignaturePad({ label, name = '', onNameChange, onSignatureChange }) {
  const sigCanvasRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleEnd = useCallback(() => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      setIsEmpty(false);
      onSignatureChange?.(sigCanvasRef.current.toDataURL('image/png'));
    }
  }, [onSignatureChange]);

  const handleClear = useCallback(() => {
    sigCanvasRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  return (
    <div style={s.container}>
      <span style={s.label}>{label}</span>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => onNameChange?.(e.target.value)}
        style={s.nameInput}
        autoComplete="off"
      />
      <div style={s.canvasWrapper}>
        <ReactSignatureCanvas
          ref={sigCanvasRef}
          onEnd={handleEnd}
          penColor="#1e293b"
          canvasProps={{ style: s.canvas }}
        />
        {isEmpty && <span style={s.placeholder}>Hier unterschreiben</span>}
      </div>
      <button type="button" onClick={handleClear} style={s.clearBtn}>
        Löschen
      </button>
    </div>
  );
}
