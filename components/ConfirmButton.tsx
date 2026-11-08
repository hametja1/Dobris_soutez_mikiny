"use client";

/** Odesílací tlačítko, které se před provedením akce zeptá na potvrzení. */
export default function ConfirmButton({
  message,
  className = "btn danger small-btn",
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
