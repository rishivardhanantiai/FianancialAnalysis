import React from "react";
import { Check } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />

      {/* Modal Box */}
      <div className="relative bg-white rounded-xl shadow-xl border border-blue-pale p-6 max-w-sm w-full mx-auto flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 z-10">
        {/* Green Right Mark / Tick Circle */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm"
          style={{ backgroundColor: "var(--green-bg)" }}
        >
          <Check className="w-7 h-7" style={{ stroke: "var(--green)", strokeWidth: 3 }} />
        </div>

        {/* Text Details */}
        <h3 className="text-base font-extrabold text-navy mb-2 uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-xs text-blue-muted mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-blue-pale font-semibold text-xs rounded-lg hover:bg-blue-pale transition"
            style={{ color: "var(--f-muted)" }}
          >
            {cancelText || "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 font-bold text-xs text-white rounded-lg transition"
            style={{ backgroundColor: "var(--green)" }}
          >
            {confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
