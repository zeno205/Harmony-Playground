type ToastOptions = {
  duration?: number;
  background?: string;
  color?: string;
};

export function showToast(message: string, opts: ToastOptions = {}) {
  const duration = opts.duration ?? 2000;
  const background = opts.background ?? '#f59e0b';
  const color = opts.color ?? '#000';

  const notice = document.createElement('div');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.textContent = message;
  notice.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${background};color:${color};padding:8px 16px;border-radius:8px;z-index:9999;font-size:14px;font-weight:500;box-shadow:0 6px 18px rgba(0,0,0,0.15);`;
  document.body.appendChild(notice);

  setTimeout(() => {
    notice.style.transition = 'opacity 200ms ease';
    notice.style.opacity = '0';
    setTimeout(() => notice.remove(), 200);
  }, duration);
}

export function showConfirm(message: string, options?: { confirmText?: string; cancelText?: string; danger?: boolean; }) {
  return new Promise<boolean>((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:10000;';

    const dialog = document.createElement('div');
    dialog.role = 'dialog';
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.cssText = 'background:var(--bg-elevated, #fff);padding:20px;border-radius:10px;max-width:480px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);color:var(--text-primary, #111);';

    const msg = document.createElement('div');
    msg.style.cssText = 'margin-bottom:16px;font-weight:500;white-space:pre-wrap;';
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = options?.cancelText ?? 'Cancel';
    // Ensure cancel button is visible on dark themes: transparent background with light text
    cancelBtn.style.cssText = 'padding:8px 12px;border-radius:6px;border:1px solid var(--border-color,#ddd);background:transparent;color:var(--text-primary,#111);cursor:pointer;';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = options?.confirmText ?? 'Confirm';
    confirmBtn.style.cssText = `padding:8px 12px;border-radius:6px;border:1px solid ${options?.danger ? '#dc2626' : 'var(--accent-primary,#2563eb)'};background:${options?.danger ? '#dc2626' : 'var(--accent-primary,#2563eb)'};color:#fff;cursor:pointer;`;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(msg);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cleanup = () => {
      window.removeEventListener('keydown', onKey);
      overlay.remove();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      }
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    window.addEventListener('keydown', onKey);

    // Focus management
    confirmBtn.focus();
  });
}
