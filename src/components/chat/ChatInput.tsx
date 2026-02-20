"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MAX_CHARS = 2000;
const CHAR_WARN_THRESHOLD = 1600;

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = value.length;
  const showCharCount = charCount > CHAR_WARN_THRESHOLD;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = value.trim().length > 0 && !disabled && !isOverLimit;

  return (
    <div
      className="border-t px-4 py-3 sm:px-6 sm:py-4"
      style={{
        borderColor: "var(--color-border)",
        background: "linear-gradient(to top, var(--color-surface) 0%, var(--color-accent-light) 100%)",
      }}
    >
      <div
        className="flex items-end gap-3 rounded-xl border px-4 py-3 transition-all duration-200"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          boxShadow: "0 1px 3px rgba(184, 149, 106, 0.06)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(184, 149, 106, 0.12), 0 2px 8px rgba(184, 149, 106, 0.08)";
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(184, 149, 106, 0.06)";
          }
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS + 50))}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:opacity-50"
          style={{
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
            maxHeight: "160px",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 disabled:opacity-30"
          style={{
            background: canSend ? "var(--color-accent)" : "transparent",
          }}
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
              stroke={canSend ? "white" : "var(--color-text-tertiary)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Character counter */}
      {showCharCount && (
        <div className="flex justify-end mt-1.5 pr-1">
          <span
            className="text-[11px] tabular-nums"
            style={{
              color: isOverLimit
                ? "var(--color-error)"
                : "var(--color-text-tertiary)",
            }}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      )}
    </div>
  );
}
