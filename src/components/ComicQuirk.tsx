import { useState, useRef, useEffect, type ReactNode, type MouseEvent } from "react";
import "./comic-quirk.css";

const DEFAULT_PHRASES = [
  "Gosh!",
  "What the heck are you doing?!",
  "Your mom goes to college.",
  "Tina, you fat lard! Come get some dinner!",
  "Don’t be jealous that I’ve been chatting online with babes all day.",
  "Napoleon, don’t be jealous…",
  "Yes. I know.",
  "I see you're drinking 1%. Is that 'cause you think you're fat?",
];

interface ComicQuirkProps {
  children: ReactNode;
  phrases?: string[];
  phrase?: string;
  duration?: number;
  offset?: { x?: number; y?: number };
  className?: string;
  noGlow?: boolean;
}

export function ComicQuirk({
  children,
  phrases = DEFAULT_PHRASES,
  phrase,
  duration = 2800,
  offset = { x: 12, y: -48 },
  className = "",
  noGlow = false,
}: ComicQuirkProps) {
  const [visible, setVisible] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState("");
  const timerRef = useRef<number | null>(null);

  const show = (e: MouseEvent) => {
    e.stopPropagation();
    const text = phrase ?? phrases[Math.floor(Math.random() * phrases.length)];
    setCurrentPhrase(text);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (duration > 0) {
      timerRef.current = window.setTimeout(() => setVisible(false), duration);
    }
  };

  useEffect(() => {
    if (!visible || duration === 0) return;
    const close = () => setVisible(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [visible, duration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <span
      onClick={show}
      className={`relative inline-block cursor-pointer select-none ${className}`}
    >
      <span
        className={
          noGlow
            ? ""
            : [
                "inline-block",
                "transition-all duration-200 ease-out",
                "hover:scale-[1.03]",
                "hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.75)]",
                "hover:brightness-110",
                "hover:contrast-105",
              ].join(" ")
        }
      >
        {children}
      </span>

      {visible && (
        <span
          className="speech-bubble pointer-events-none absolute z-50"
          style={{ left: offset.x, top: offset.y }}
          role="status"
          aria-live="polite"
        >
          {currentPhrase}
        </span>
      )}
    </span>
  );
}
