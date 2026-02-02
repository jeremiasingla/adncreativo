import React from "react";

const containerStyle = {
  background: "rgba(255, 255, 255, 0.18)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow:
    "rgba(0, 0, 0, 0.12) 0px 12px 40px, rgba(255, 255, 255, 0.35) 0px 1px inset, rgba(0, 0, 0, 0.05) 0px -1px inset",
  color: "rgb(15, 20, 25)",
  fontSize: 16,
  margin: 0,
  textAlign: "start",
  lineHeight: 24,
  fontWeight: 400,
  letterSpacing: "-0.01em",
  fontFamily: "var(--font-sans)",
};

const inputStyle = {
  color: "inherit",
  font: "inherit",
  letterSpacing: "inherit",
};

export default function WebsiteUrlInput({
  value,
  onChange,
  onSubmit,
  placeholder = "tusitio.com",
  className = "",
  disabled = false,
}) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <div
        className="relative flex w-full items-center rounded-lg px-4 py-2 gap-3"
        style={containerStyle}
      >
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none h-8 placeholder:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={disabled}
          className="flex items-center justify-center size-8 bg-gradient-to-b from-black via-black to-gray-800 text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          aria-label="Enviar"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12 7-7 7 7M12 19V5"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
