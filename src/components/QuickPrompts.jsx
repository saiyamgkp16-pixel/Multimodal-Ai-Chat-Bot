import React from "react";
import { Sparkles, HeartHandshake, FilePlus2, Globe2, Eye, Brain } from "lucide-react";

export default function QuickPrompts({ onSelectPrompt }) {
  const prompts = [
    {
      icon: <HeartHandshake size={18} color="var(--rose-400)" />,
      badge: "Emotional Support",
      badgeColor: "rgba(251, 113, 133, 0.15)",
      textColor: "var(--rose-400)",
      title: "Feeling study pressure & stress",
      prompt: "I'm feeling quite stressed and overwhelmed with my exam preparation. Can you help me reflect and share some encouraging thoughts?"
    },
    {
      icon: <FilePlus2 size={18} color="var(--emerald-400)" />,
      badge: "Document Creation",
      badgeColor: "rgba(52, 211, 153, 0.15)",
      textColor: "var(--emerald-400)",
      title: "Create a study note on DBMS",
      prompt: "Create a study note about DBMS normalization, including 1NF, 2NF, and 3NF."
    },
    {
      icon: <Globe2 size={18} color="var(--cyan-400)" />,
      badge: "Web Search",
      badgeColor: "rgba(34, 211, 238, 0.15)",
      textColor: "var(--cyan-400)",
      title: "Latest AI Developments",
      prompt: "What are the latest developments in AI and multimodal reasoning?"
    },
    {
      icon: <Eye size={18} color="var(--purple-400)" />,
      badge: "Vision & Files",
      badgeColor: "rgba(192, 132, 252, 0.15)",
      textColor: "var(--purple-400)",
      title: "Analyze image or diagram",
      prompt: "Explain how multimodal AI combines text, vision, and audio pipelines."
    }
  ];

  return (
    <div style={{
      width: "100%",
      maxWidth: "740px",
      margin: "0 auto",
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center"
    }}>
      {/* Hero Welcome Card */}
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, var(--primary-500), #ec4899)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "16px",
        boxShadow: "0 0 28px var(--primary-glow)"
      }}>
        <Sparkles size={28} color="#fff" />
      </div>

      <h2 style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.65rem",
        fontWeight: 700,
        letterSpacing: "-0.03em",
        marginBottom: "8px",
        background: "linear-gradient(to right, #ffffff, #cbd5e1)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        What would you like to explore today?
      </h2>

      <p style={{
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        maxWidth: "520px",
        marginBottom: "28px",
        lineHeight: "1.5"
      }}>
        Your beginner-friendly multimodal companion. Talk through voice or text, drop diagrams, upload documents for RAG, search the web, or reflect on your day.
      </p>

      {/* Grid of Starter Suggestions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "12px",
        width: "100%"
      }}>
        {prompts.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-glass)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(12px)",
              textAlign: "left",
              cursor: "pointer",
              transition: "all var(--transition-normal)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--border-highlight)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.backgroundColor = "var(--bg-glass)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{
                padding: "6px",
                borderRadius: "8px",
                backgroundColor: item.badgeColor
              }}>
                {item.icon}
              </div>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                color: item.textColor,
                padding: "2px 7px",
                borderRadius: "4px",
                backgroundColor: item.badgeColor
              }}>
                {item.badge}
              </span>
            </div>

            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>
              {item.title}
            </div>

            <div style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              lineHeight: "1.4",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}>
              "{item.prompt}"
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
