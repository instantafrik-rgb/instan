import React, { useState } from 'react';
import { Lock, Delete, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PinLockModalProps {
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ onUnlock }) => {
  const { parametres } = useApp();
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);

  const expectedPin = parametres.codePin || parametres.pinCode || '1234';

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setError(false);

      // Auto check when length matches
      if (next.length === expectedPin.length) {
        if (next === expectedPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setEnteredPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111E] text-white">
      <div className="w-full max-w-xs flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">China Order Manager</h2>
          <p className="text-xs text-slate-400 mt-1">
            Application sécurisée. Veuillez saisir votre code PIN.
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex items-center gap-3 my-2">
          {Array.from({ length: expectedPin.length }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                i < enteredPin.length
                  ? error
                    ? 'bg-rose-500 border-rose-500'
                    : 'bg-blue-500 border-blue-500 scale-110'
                  : 'border-slate-700 bg-slate-900'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-semibold text-rose-400 animate-bounce">
            Code PIN incorrect, réessayez.
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xl font-bold text-white transition-all shadow-sm flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xl font-bold text-white transition-all shadow-sm flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white active:scale-95 text-sm font-semibold transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
