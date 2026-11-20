"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { sendChatMessage, type ChatMessage } from "@/modules/chat/api/chat";
import styles from "./HealthChat.module.css";

type HealthChatProps = {
  role: "Patient" | "Doctor";
};

export function HealthChat({ role }: HealthChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = { role: "user", content };
    if (selectedImage) userMessage.image = selectedImage;
    const nextMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setSelectedImage(null);
    setError("");
    setIsSending(true);
    try {
      const requestMessages = nextMessages.map((message, index) =>
        index === nextMessages.length - 1 ? message : { ...message, image: undefined },
      );
      const answer = await sendChatMessage(requestMessages);
      setMessages([...nextMessages, { role: "assistant", content: answer }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The assistant couldn't respond. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={styles.widget}>
      {isOpen && (
        <section className={styles.panel} aria-label="Carecell AI health information chat">
          <header className={styles.header}>
            <div>
              <span className={styles.eyebrow}>CARECELL ASSISTANT</span>
              <h2>Health information chat</h2>
            </div>
            <button className={styles.closeButton} type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">×</button>
          </header>
          <p className={styles.disclaimer}>General information only — not a diagnosis or a substitute for professional medical care. Don’t share identifying or sensitive health information.</p>
          <div className={styles.transcript} ref={transcriptRef} aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 ? (
              <p className={styles.welcome}>Hi! Ask a general health question to get started.</p>
            ) : messages.map((message, index) => (
              <div className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`} key={`${message.role}-${index}`}>
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
                {message.image && <Image className={styles.messageImage} src={message.image} alt="Image attached to your message" width={240} height={120} unoptimized />}
                <p>{message.content}</p>
              </div>
            ))}
            {isSending && <p className={styles.thinking} role="status">Assistant is thinking…</p>}
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <form className={styles.composer} onSubmit={handleSubmit}>
            <label className={styles.imageButton} title="Attach an image">
              <span aria-hidden="true">＋</span>
              <span className={styles.srOnly}>Attach an image (JPEG, PNG, or WebP, up to 5 MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSending}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError("Choose an image smaller than 5 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setSelectedImage(reader.result);
                      setError("");
                    }
                  };
                  reader.onerror = () => setError("The image could not be read. Please try another file.");
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <label className={styles.srOnly} htmlFor={`health-chat-message-${role.toLowerCase()}`}>Your message</label>
            <textarea
              id={`health-chat-message-${role.toLowerCase()}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask a general health question…"
              maxLength={8000}
              rows={2}
              disabled={isSending}
              required
            />
            <button type="submit" disabled={isSending || !draft.trim()} aria-label="Send message">➤</button>
          </form>
          {selectedImage && <div className={styles.imagePreview}><Image src={selectedImage} alt="Selected image preview" width={240} height={120} unoptimized /><button type="button" onClick={() => setSelectedImage(null)} aria-label="Remove attached image">×</button></div>}
          <span className={styles.privacyNote}>Chat isn’t saved. Messages and any attached images are sent to your configured AI provider.</span>
        </section>
      )}
      <button
        className={styles.launcher}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close health assistant" : "Open health assistant"}
      >
        <span aria-hidden="true">{isOpen ? "×" : "✳"}</span>
        {!isOpen && <span className={styles.launcherText}>Ask assistant</span>}
      </button>
    </div>
  );
}
