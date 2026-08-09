import { useState } from 'react';

type PasswordFieldProps = {
  id: string;
  name?: string;
  autoComplete: string;
  label?: string;
  disabled?: boolean;
};

export function PasswordField({
  id,
  name = 'password',
  autoComplete,
  label = 'Password',
  disabled = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={id}>
      {label}
      <div className="password-field">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}
