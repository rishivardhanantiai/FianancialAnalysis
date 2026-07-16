import React, { useState } from 'react';

export function ChangePwModal({
  onClose,
  changePassword,
}: {
  onClose: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
}) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPw.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔑 Change Password
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '14px' }}>
              Password changed successfully!
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
              Closing…
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div style={{ color: 'var(--red)', fontSize: '11px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn-ui btn-outline" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-ui btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
