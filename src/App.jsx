import { useState, useRef, useEffect } from "react";

const COLORS = {
  bg: "#f0f4f8",
  card: "#ffffff",
  primary: "#1a6b4e",
  primaryDark: "#134d38",
  primaryLight: "#e8f5ee",
  accent: "#e8833a",
  accentLight: "#fef3ea",
  text: "#1e293b",
  textMid: "#475569",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  borderHover: "#cbd5e1",
  tagBg: "#f1f5f9",
  urgentBg: "#fef2f2",
  urgentText: "#dc2626",
  starFill: "#f59e0b",
};

const SAMPLE_COMPANIES = [
  "Horizon Technologies", "Meridian Group", "Atlas Industries",
  "Pinnacle Solutions", "Evergreen Partners", "Summit Corp",
  "Coastal Dynamics", "Redwood Analytics", "Forge Digital",
  "Beacon Health", "Crestview Financial", "Lakeshore Media",
  "Ironbridge Consulting", "Northstar Logistics", "Silverton Labs",
  "Clearwater Systems", "Oakmont Services", "Trailhead Ventures",
  "Bridgeport Tech", "Sapphire Networks"
];

const CITIES = [
  "Atlanta, GA", "Charlotte, NC", "Raleigh, NC", "Austin, TX",
  "Denver, CO", "Nashville, TN", "Portland, OR", "Seattle, WA",
  "Chicago, IL", "Boston, MA", "Tampa, FL", "Phoenix, AZ",
  "Remote", "Hybrid - Dallas, TX", "Hybrid - Miami, FL"
];

const SALARY_RANGES = [
  "$35,000 - $45,000", "$40,000 - $55,000", "$45,000 - $60,000",
  "$50,000 - $70,000", "$55,000 - $75,000", "$60,000 - $85,000",
  "$65,000 - $90,000", "$70,000 - $95,000", "$75,000 - $100,000",
  "$80,000 - $110,000", "$85,000 - $120,000", "$90,000 - $130,000"
];

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const POST_AGES = ["Just posted", "1 day ago", "2 days ago", "3 days ago", "5 days ago", "1 week ago", "2 weeks ago", "30+ days ago"];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function generatePlaceholderJobs(query, count = 8) {
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const company = randomFrom(SAMPLE_COMPANIES);
    const type = randomFrom(JOB_TYPES);
    const rating = (3.2 + Math.random() * 1.8).toFixed(1);
    const reviews = randomBetween(50, 5000);
    jobs.push({
      id: `job-${Date.now()}-${i}`,
      title: `${query} ${i === 0 ? "" : ["Specialist", "Associate", "Coordinator", "Analyst", "Manager", "Assistant", "Lead", "Junior"][i % 8]}`.trim(),
      company,
      location: randomFrom(CITIES),
      salary: randomFrom(SALARY_RANGES),
      type,
      posted: randomFrom(POST_AGES),
      rating: parseFloat(rating),
      reviews,
      description: "Loading full description...",
      responsibilities: [],
      qualifications: [],
      benefits: [],
      isPlaceholder: true,
    });
  }
  return jobs;
}

async function generateJobsWithAI(query) {
  const prompt = `You are a job board data generator. Generate exactly 8 realistic job postings for someone searching "${query}". 

Return ONLY a JSON array (no markdown, no backticks, no explanation) of 8 objects. Each object must have:
- "title": realistic job title related to "${query}" (vary seniority: entry-level, mid, senior, etc.)
- "company": a fictional but realistic company name
- "location": a US city/state or "Remote" or "Hybrid - City, ST"
- "salary": salary range like "$50,000 - $70,000" appropriate for the role
- "type": one of "Full-time", "Part-time", "Contract", "Internship"
- "posted": one of "Just posted", "1 day ago", "3 days ago", "1 week ago", "2 weeks ago"
- "rating": company rating 3.0-5.0
- "reviews": number of company reviews 50-5000
- "description": a 3-4 sentence job summary paragraph
- "responsibilities": array of 5-6 specific bullet point strings for the role
- "qualifications": array of 5-6 required/preferred qualifications
- "benefits": array of 4-5 company benefits

Make postings realistic and varied. Include entry-level positions suitable for students/new grads as well as more experienced roles. Return ONLY the JSON array.`;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const jobs = JSON.parse(cleaned);
    return jobs.map((j, i) => ({ ...j, id: `job-${Date.now()}-${i}`, isPlaceholder: false }));
  } catch (e) {
    console.error("AI generation failed:", e);
    return null;
  }
}

async function reviewCoverLetter(coverLetter, jobTitle, jobDescription, qualifications) {
  const prompt = `You are a career counselor reviewing a student's cover letter. The student is applying for this position:

Job Title: ${jobTitle}
Job Description: ${jobDescription}
Key Qualifications: ${qualifications.join(", ")}

The student wrote this cover letter:
"""
${coverLetter}
"""

Provide helpful, encouraging feedback in this JSON format (no markdown, no backticks):
{
  "score": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<specific suggestion 1>", "<specific suggestion 2>", "<specific suggestion 3>"],
  "overall": "<2-3 sentence encouraging summary with the most important next step>"
}

Be constructive and educational. These are high school students learning to write cover letters for the first time. Focus on whether they tailored the letter to this specific job posting.`;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Review failed:", e);
    return null;
  }
}

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20">
          <defs>
            <linearGradient id={`star-${rating}-${i}`}>
              <stop offset={i < full ? "100%" : i === full ? `${partial * 100}%` : "0%"} stopColor={COLORS.starFill} />
              <stop offset={i < full ? "100%" : i === full ? `${partial * 100}%` : "0%"} stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <path d="M10 1l2.5 5.5L18 7.5l-4 4 1 5.5L10 14.5 5 17l1-5.5-4-4 5.5-1z"
            fill={`url(#star-${rating}-${i})`} />
        </svg>
      ))}
      <span style={{ fontSize: 12, color: COLORS.textMid, marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

function SearchBar({ onSearch, initialQuery }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [location, setLocation] = useState("");
  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (query.trim()) onSearch(query.trim());
  };
  return (
    <div style={{
      background: COLORS.primary,
      padding: "16px 24px",
      display: "flex", flexDirection: "column", gap: 8,
      borderBottom: `3px solid ${COLORS.primaryDark}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, cursor: "default" }}>
          <span style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: -1 }}>
            career
          </span>
          <span style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 700, color: COLORS.accent, letterSpacing: -1 }}>
            finder
          </span>
        </div>
        <div style={{ flex: 1, display: "flex", gap: 0, marginLeft: 16 }}>
          <div style={{ flex: 2, position: "relative" }}>
            <label style={{ position: "absolute", top: -18, left: 2, fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: 0.5 }}>What</label>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Job title, keywords, or company"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 15,
                border: "2px solid transparent", borderRadius: "6px 0 0 6px",
                outline: "none", background: "#fff",
                fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <label style={{ position: "absolute", top: -18, left: 2, fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: 0.5 }}>Where</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, state, or remote"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 15,
                border: "2px solid transparent", borderLeft: `1px solid ${COLORS.border}`,
                borderRadius: 0, outline: "none", background: "#fff",
                fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 28px", fontSize: 15, fontWeight: 700,
              background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: "0 6px 6px 0", cursor: "pointer",
              fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
              transition: "background 0.15s",
            }}
            onMouseOver={e => e.target.style.background = "#d6742e"}
            onMouseOut={e => e.target.style.background = COLORS.accent}
          >
            Find jobs
          </button>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 18px",
        background: isSelected ? COLORS.primaryLight : COLORS.card,
        borderLeft: isSelected ? `4px solid ${COLORS.primary}` : "4px solid transparent",
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: "pointer",
        transition: "all 0.15s",
        ...(isSelected ? {} : {}),
      }}
      onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
      onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = COLORS.card; }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, margin: "0 0 4px 0",
        fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif", lineHeight: 1.3 }}>
        {job.title}
      </h3>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, margin: "0 0 3px 0" }}>
        {job.company}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <StarRating rating={job.rating} />
        <span style={{ fontSize: 12, color: COLORS.textLight }}>({job.reviews.toLocaleString()} reviews)</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: COLORS.textMid, display: "flex", alignItems: "center", gap: 3 }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill={COLORS.textLight}><path d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z"/></svg>
          {job.location}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {job.salary && (
          <span style={{ fontSize: 12, padding: "3px 8px", background: COLORS.primaryLight, color: COLORS.primaryDark,
            borderRadius: 4, fontWeight: 600 }}>
            {job.salary}
          </span>
        )}
        <span style={{ fontSize: 12, padding: "3px 8px", background: COLORS.tagBg, color: COLORS.textMid,
          borderRadius: 4 }}>
          {job.type}
        </span>
      </div>
      {job.description && !job.isPlaceholder && (
        <p style={{ fontSize: 13, color: COLORS.textMid, margin: "6px 0 0 0", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {job.description}
        </p>
      )}
      <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 8 }}>
        {job.posted}
      </div>
    </div>
  );
}

function JobDetail({ job, onWriteCoverLetter }) {
  if (!job) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
      color: COLORS.textLight, fontSize: 16, fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
      flexDirection: "column", gap: 12 }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={COLORS.border} strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <span>Select a job to view details</span>
    </div>
  );

  return (
    <div style={{ padding: "24px 28px", overflowY: "auto", height: "100%", boxSizing: "border-box",
      fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, margin: "0 0 6px 0" }}>{job.title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.primary }}>{job.company}</span>
          <span style={{ color: COLORS.textLight }}>•</span>
          <span style={{ fontSize: 14, color: COLORS.textMid }}>{job.location}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <StarRating rating={job.rating} />
          <span style={{ fontSize: 13, color: COLORS.textLight }}>({job.reviews.toLocaleString()} reviews)</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span style={{
            padding: "6px 14px", background: COLORS.primaryLight, color: COLORS.primaryDark,
            borderRadius: 6, fontSize: 14, fontWeight: 700,
          }}>{job.salary}</span>
          <span style={{
            padding: "6px 14px", background: COLORS.tagBg, color: COLORS.textMid,
            borderRadius: 6, fontSize: 14, fontWeight: 600,
          }}>{job.type}</span>
          <span style={{
            padding: "6px 14px", background: COLORS.accentLight, color: COLORS.accent,
            borderRadius: 6, fontSize: 14, fontWeight: 600,
          }}>{job.posted}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onWriteCoverLetter}
            style={{
              padding: "12px 32px", fontSize: 15, fontWeight: 700,
              background: COLORS.primary, color: "#fff", border: "none",
              borderRadius: 8, cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseOver={e => e.target.style.background = COLORS.primaryDark}
            onMouseOut={e => e.target.style.background = COLORS.primary}
          >
            ✍️ Write Cover Letter
          </button>
          <button style={{
            padding: "12px 24px", fontSize: 15, fontWeight: 600,
            background: "transparent", color: COLORS.primary, border: `2px solid ${COLORS.primary}`,
            borderRadius: 8, cursor: "pointer",
          }}>
            ☆ Save Job
          </button>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: "20px 0" }} />

      {job.isPlaceholder ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 20, color: COLORS.textLight }}>
          <div className="spinner" style={{
            width: 20, height: 20, border: `3px solid ${COLORS.border}`,
            borderTop: `3px solid ${COLORS.primary}`, borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          Generating job details...
        </div>
      ) : (
        <>
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: "0 0 10px 0" }}>Job Description</h3>
            <p style={{ fontSize: 14, color: COLORS.textMid, lineHeight: 1.7, margin: 0 }}>{job.description}</p>
          </section>
          {job.responsibilities?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: "0 0 10px 0" }}>Responsibilities</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {job.responsibilities.map((r, i) => (
                  <li key={i} style={{ fontSize: 14, color: COLORS.textMid, lineHeight: 1.7, marginBottom: 4 }}>{r}</li>
                ))}
              </ul>
            </section>
          )}
          {job.qualifications?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: "0 0 10px 0" }}>Qualifications</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {job.qualifications.map((q, i) => (
                  <li key={i} style={{ fontSize: 14, color: COLORS.textMid, lineHeight: 1.7, marginBottom: 4 }}>{q}</li>
                ))}
              </ul>
            </section>
          )}
          {job.benefits?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: "0 0 10px 0" }}>Benefits</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {job.benefits.map((b, i) => (
                  <li key={i} style={{ fontSize: 14, color: COLORS.textMid, lineHeight: 1.7, marginBottom: 4 }}>{b}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CoverLetterModal({ job, onClose }) {
  const [letter, setLetter] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  const handleReview = async () => {
    if (!letter.trim() || letter.trim().length < 50) return;
    setReviewing(true);
    setFeedback(null);
    const result = await reviewCoverLetter(
      letter, job.title, job.description, job.qualifications || []
    );
    setFeedback(result);
    setReviewing(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, width: "90%", maxWidth: 900,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          padding: "18px 24px", background: COLORS.primary, color: "#fff",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Write Your Cover Letter</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {job.title} at {job.company}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
            width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", gap: 24 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              padding: "12px 16px", background: COLORS.primaryLight, borderRadius: 8,
              fontSize: 13, color: COLORS.primaryDark, lineHeight: 1.5,
            }}>
              <strong>💡 Tips:</strong> Reference specific qualifications from the job posting. Explain how your skills and experience match what they're looking for. Show enthusiasm for the company and role.
            </div>
            <textarea
              ref={textareaRef}
              value={letter}
              onChange={e => setLetter(e.target.value)}
              placeholder={`Dear Hiring Manager,\n\nI am writing to express my interest in the ${job.title} position at ${job.company}...\n\n[Explain why you're interested in this specific role]\n\n[Describe relevant skills and experiences]\n\n[Connect your qualifications to their requirements]\n\nSincerely,\n[Your Name]`}
              style={{
                flex: 1, minHeight: 300, padding: 16, fontSize: 14,
                border: `2px solid ${COLORS.border}`, borderRadius: 8,
                outline: "none", resize: "none", lineHeight: 1.7,
                fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
                color: COLORS.text,
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: COLORS.textLight }}>
                {letter.length} characters • {letter.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                onClick={handleReview}
                disabled={reviewing || letter.trim().length < 50}
                style={{
                  padding: "10px 24px", fontSize: 14, fontWeight: 700,
                  background: (reviewing || letter.trim().length < 50) ? COLORS.border : COLORS.accent,
                  color: "#fff", border: "none", borderRadius: 8,
                  cursor: (reviewing || letter.trim().length < 50) ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {reviewing ? "Reviewing..." : "📝 Get AI Feedback"}
              </button>
            </div>
          </div>

          {feedback && (
            <div style={{
              width: 300, background: COLORS.bg, borderRadius: 10, padding: 18,
              fontSize: 13, color: COLORS.text, overflow: "auto",
              animation: "slideIn 0.3s ease",
            }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 56, height: 56, borderRadius: "50%", fontSize: 22, fontWeight: 800,
                  background: feedback.score >= 7 ? "#dcfce7" : feedback.score >= 4 ? "#fef9c3" : "#fee2e2",
                  color: feedback.score >= 7 ? "#16a34a" : feedback.score >= 4 ? "#ca8a04" : "#dc2626",
                }}>
                  {feedback.score}/10
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, margin: "0 0 6px 0" }}>
                  ✅ Strengths
                </h4>
                {feedback.strengths?.map((s, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${COLORS.border}`, lineHeight: 1.5 }}>
                    {s}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent, margin: "0 0 6px 0" }}>
                  🔧 Improvements
                </h4>
                {feedback.improvements?.map((s, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${COLORS.border}`, lineHeight: 1.5 }}>
                    {s}
                  </div>
                ))}
              </div>

              <div style={{
                padding: 12, background: COLORS.primaryLight, borderRadius: 8,
                lineHeight: 1.6, fontStyle: "italic",
              }}>
                {feedback.overall}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("relevance");

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setHasSearched(true);
    setSelectedJob(null);
    setLoading(true);

    const placeholders = generatePlaceholderJobs(query);
    setJobs(placeholders);

    const aiJobs = await generateJobsWithAI(query);
    if (aiJobs) {
      setJobs(aiJobs);
      setSelectedJob(aiJobs[0]);
    } else {
      const fallback = placeholders.map(j => ({ ...j, isPlaceholder: false, description: `This ${j.title} role involves working with a dynamic team to deliver results in the ${query} field.`, responsibilities: ["Collaborate with cross-functional teams", "Meet project deadlines and goals", "Communicate progress to stakeholders"], qualifications: ["Relevant education or experience", "Strong communication skills", "Ability to work independently and in teams"], benefits: ["Health insurance", "Paid time off", "Professional development opportunities"] }));
      setJobs(fallback);
      setSelectedJob(fallback[0]);
    }
    setLoading(false);
  };

  const filteredJobs = jobs.filter(j => filterType === "All" || j.type === filterType);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: COLORS.bg, fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${COLORS.borderHover}; }
      `}</style>

      <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />

      {!hasSearched ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 16, color: COLORS.textMid, padding: 40,
        }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={COLORS.border} strokeWidth="1.2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, margin: 0 }}>
            Search for a Career
          </h2>
          <p style={{ fontSize: 15, textAlign: "center", maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
            Enter a job title, career field, or industry above to browse realistic job postings.
            Find a position that interests you, then practice writing a tailored cover letter!
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, justifyContent: "center" }}>
            {["Software Developer", "Graphic Designer", "Nurse", "Marketing Manager", "Data Analyst", "Teacher", "Mechanical Engineer", "Social Media Manager"].map(s => (
              <button key={s} onClick={() => handleSearch(s)} style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                background: COLORS.card, color: COLORS.primary, border: `1px solid ${COLORS.border}`,
                borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
              }}
                onMouseOver={e => { e.target.style.background = COLORS.primaryLight; e.target.style.borderColor = COLORS.primary; }}
                onMouseOut={e => { e.target.style.background = COLORS.card; e.target.style.borderColor = COLORS.border; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{
            padding: "10px 24px", background: COLORS.card,
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 14, color: COLORS.textMid }}>
                {loading ? "Searching..." : `${filteredJobs.length} jobs found for `}
                {!loading && <strong style={{ color: COLORS.text }}>"{searchQuery}"</strong>}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "Full-time", "Part-time", "Internship", "Contract"].map(t => (
                  <button key={t} onClick={() => setFilterType(t)} style={{
                    padding: "4px 12px", fontSize: 12, fontWeight: 600,
                    background: filterType === t ? COLORS.primary : "transparent",
                    color: filterType === t ? "#fff" : COLORS.textMid,
                    border: `1px solid ${filterType === t ? COLORS.primary : COLORS.border}`,
                    borderRadius: 16, cursor: "pointer",
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
              padding: "6px 12px", fontSize: 13, border: `1px solid ${COLORS.border}`,
              borderRadius: 6, color: COLORS.textMid, background: "#fff", cursor: "pointer",
            }}>
              <option value="relevance">Sort by: Relevance</option>
              <option value="date">Sort by: Date</option>
              <option value="salary">Sort by: Salary</option>
            </select>
          </div>

          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{
              width: 380, minWidth: 380, borderRight: `1px solid ${COLORS.border}`,
              overflowY: "auto", background: COLORS.card,
            }}>
              {filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onClick={() => setSelectedJob(job)}
                />
              ))}
              {filteredJobs.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: COLORS.textLight, fontSize: 14 }}>
                  No {filterType.toLowerCase()} positions found. Try a different filter.
                </div>
              )}
            </div>

            <div style={{ flex: 1, background: COLORS.card, overflow: "hidden" }}>
              <JobDetail
                job={selectedJob}
                onWriteCoverLetter={() => setShowCoverLetter(true)}
              />
            </div>
          </div>
        </>
      )}

      {showCoverLetter && selectedJob && (
        <CoverLetterModal
          job={selectedJob}
          onClose={() => setShowCoverLetter(false)}
        />
      )}
    </div>
  );
}