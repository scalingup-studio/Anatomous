import React from "react";
import { API_BASE_URL } from "../../api/configEnv";
// NOTE: For Help Center we use a local Q&A helper and DO NOT call /generate-insight

const HELP_API_BASE = `${API_BASE_URL}/api:14W4C75i`;

export default function HelpCenterPage() {
  const [categories, setCategories] = React.useState([]);
  const [fetching, setFetching] = React.useState(false);
  const [fetchError, setFetchError] = React.useState("");

  const loadCategories = React.useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`${HELP_API_BASE}/get_faqs_by_category`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const apiCategories = data?.categories || data || [];
      // Normalize into expected shape: { id, title, faqs:[{q,a}] }
      const normalized = (apiCategories || []).map((cat) => ({
        id: cat.id ?? cat.slug ?? cat.title ?? `cat-${Math.random()}`,
        title: cat.name || cat.title || cat.category || "FAQ",
        faqs: (cat.items || cat.faqs || cat.questions || []).map((item, idx) => ({
          q: item.question || item.q || item.title || `Question ${idx + 1}`,
          a: item.answer || item.a || item.content || "",
        })),
      }));
      setCategories(normalized);
    } catch (err) {
      console.error("Failed to load FAQs", err);
      setFetchError("Could not load FAQs. Please try again later.");
    } finally {
      setFetching(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const [open, setOpen] = React.useState({});
  const toggle = (key) => setOpen(v => ({ ...v, [key]: !v[key] }));

  const [conversation, setConversation] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [sessionId, setSessionId] = React.useState(null);
  const [chatError, setChatError] = React.useState("");
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const chatScrollRef = React.useRef(null);
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState("");

  const clearConversation = () => {
    setConversation([]);
    setSessionId(null);
    setChatError("");
  };

  const normalizeHistory = (messages) => {
    if (!Array.isArray(messages)) return [];
    return messages
      .map((m) => {
        const role =
          m.role ||
          m.sender ||
          (m.is_user ? "user" : m.author) ||
          (m.user ? "user" : m.assistant ? "assistant" : null) ||
          "assistant";
        const content = m.content || m.message || m.text || m.answer || m.response || "";
        return { role: role === "user" ? "user" : "assistant", content: String(content ?? "") };
      })
      .filter((m) => m.content);
  };

  const getAuthHeaders = () => {
    // Xano help-center chat endpoints require auth; primary token stored as authToken.
    const token =
      (() => { try { return localStorage.getItem("authToken"); } catch { return null; } })()
      || (() => { try { return localStorage.getItem("token"); } catch { return null; } })();
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  const ensureSession = async (initialMessage) => {
    if (sessionId) return sessionId;
    const auth = getAuthHeaders();
    if (!auth) {
      throw new Error("auth_required");
    }
    const startPayload = {
      initial_message: initialMessage || "Help Center chat start",
    };
    try {
      console.log("[HelpCenter] chat_start body:", startPayload);
    } catch {}
    const res = await fetch(`${HELP_API_BASE}/chat_start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...auth,
      },
      body: JSON.stringify(startPayload),
    });
    if (!res.ok) throw new Error(`chat_start failed: ${res.status}`);
    const data = await res.json();
    const sid = data?.session_id || data?.id;
    if (!sid) throw new Error("No session_id returned");
    setSessionId(sid);
    return sid;
  };

  const sendChatMessage = async (message) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setChatError("");
    setConversation((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        throw new Error("auth_required");
      }
      const sid = await ensureSession(trimmed);
      const msgPayload = { session_id: sid, message: trimmed };
      try {
        console.log("[HelpCenter] chat_message body:", msgPayload);
      } catch {}
      const res = await fetch(`${HELP_API_BASE}/chat_message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(msgPayload),
      });
      if (!res.ok) throw new Error(`chat_message failed: ${res.status}`);
      const data = await res.json();
      // Normalize AI reply: ai_response may be an object with content
      const aiNode = data?.ai_response || data?.response || data?.message;
      const reply = typeof aiNode === "string" ? aiNode : (aiNode?.content || "Sorry, I don't have an answer for that yet.");
      setConversation((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Help Center chat error", err);
      if (err.message === "auth_required") {
        setChatError("Please sign in to use chat.");
      } else {
        setChatError("Could not send the message. Please try again.");
      }
      // keep conversation as-is (user message stays)
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async () => {
    setChatError("");
    if (!sessionId) {
      setChatError("Send a message first to create a session.");
      return;
    }
    const auth = getAuthHeaders();
    if (!auth) {
      setChatError("Please sign in to view chat history.");
      return;
    }
    setHistoryLoading(true);
    try {
      const url = `${HELP_API_BASE}/chat_history?session_id=${encodeURIComponent(sessionId)}`;
      const res = await fetch(url, { headers: { ...auth } });
      if (!res.ok) throw new Error(`chat_history failed: ${res.status}`);
      const data = await res.json();
      const msgs = normalizeHistory(data?.messages || data || []);
      if (msgs.length === 0) {
        setChatError("Chat history is empty.");
      } else {
        setConversation(msgs);
      }
    } catch (err) {
      console.error("Help Center chat_history error", err);
      setChatError("Could not load history. Please try again later.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return (categories || [])
      .map(cat => ({
        ...cat,
        faqs: (cat.faqs || []).filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
      }))
      .filter(cat => cat.faqs.length > 0);
  }, [search, categories]);

  const suggestions = [
    'How do I export my data?',
    'Where can I view my past labs?',
    'How to reset my password?',
  ];

  // Remote FAQ search via Xano /search
  React.useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const res = await fetch(`${HELP_API_BASE}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search_query: q,
            category_id: null,
            page: 1,
            per_page: 10
          }),
          signal: controller.signal
        });
        if (!res.ok) throw new Error(`search failed: ${res.status}`);
        const data = await res.json();
        const results = data?.results || data?.items || data || [];
        const normalized = (Array.isArray(results) ? results : []).map((item, idx) => ({
          id: item.id ?? item.faq_item_id ?? idx,
          question: item.question || item.q || item.title || item.content || "Question",
          answer: item.answer || item.a || item.content || item.response || "",
          category: item.category || item.category_name || item.category_id || null,
        }));
        setSearchResults(normalized);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Help Center search error", err);
        setSearchError("Search failed. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    }, 350); // simple debounce

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search]);

  React.useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Help Center</h1>
      </div>

      {/* Intro & Search */}
      <div className="card" style={{ display:'grid', gap:12 }}>
        <div style={{ color:'var(--muted)', fontSize:13, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span>One-stop hub with Smart FAQs and AI assistant. Crisp live chat is not included in the MVP.</span>
          <button className="btn ghost small" onClick={loadCategories} disabled={fetching} style={{ padding:'4px 8px' }}>
            {fetching ? 'Refreshing…' : 'Refresh FAQs'}
          </button>
          {fetchError && <span style={{ color:'var(--error)' }}>{fetchError}</span>}
        </div>
        <div className="form-row">
          <div className="form-field" style={{ flex:1 }}>
            <label>Search FAQs</label>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by keyword…" />
          </div>
          <div style={{ alignSelf:'end' }}>
            <button className="btn ghost" onClick={()=>setSearch("")}>Clear</button>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['Getting Started','Understanding Insights','Privacy & Data','Billing & Subscriptions','Technical Support'].map((t, i) => (
            <button key={i} className="btn outline small" onClick={()=>{
              // Open matching category
              const cat = categories[i];
              setOpen(v => ({ ...v, [cat.id]: true }));
              setTimeout(()=>{
                const el = document.getElementById(`hc-cat-${cat.id}`);
                if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
              }, 0);
            }}>{t}</button>
          ))}
        </div>

        {/* Remote search results */}
        {search.trim() && (
          <div className="card" style={{ padding:12, display:'grid', gap:8, background:'var(--bg-secondary, #f8fbff)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
              <div style={{ fontWeight:600 }}>Search results</div>
              {searchLoading && <div style={{ fontSize:12, color:'var(--muted)' }}>Searching…</div>}
            </div>
            {searchError && <div style={{ color:'var(--error)', fontSize:13 }}>{searchError}</div>}
            {!searchError && !searchLoading && searchResults.length === 0 && (
              <div style={{ color:'var(--muted)', fontSize:13 }}>No results for “{search.trim()}”.</div>
            )}
            <div style={{ display:'grid', gap:8, maxHeight:200, overflow:'auto' }}>
              {searchResults.map((r) => (
                <div key={r.id} className="card" style={{ padding:10 }}>
                  <div style={{ fontWeight:600, marginBottom:4 }}>{r.question}</div>
                  <div style={{ color:'var(--muted)', fontSize:13, whiteSpace:'pre-wrap' }}>{r.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>
        {/* FAQ column */}
        <div className="card" style={{ display: 'flex', gap: 8, flexDirection: 'column', maxHeight:'60vh', overflow:'auto' }}>
          <h3 style={{ marginTop:0 }}>Smart FAQ</h3>
          {fetching && categories.length === 0 && (
            <div className="card" style={{ padding:12, color:'var(--muted)' }}>Loading FAQs…</div>
          )}
          {fetchError && categories.length === 0 && (
            <div className="card" style={{ padding:12, color:'var(--error)' }}>{fetchError}</div>
          )}
          {!fetching && categories.length === 0 && !fetchError && (
            <div className="card" style={{ padding:12, color:'var(--muted)' }}>No FAQs available.</div>
          )}
          {filtered.map(cat => (
            <div key={cat.id} id={`hc-cat-${cat.id}`} className="card" style={{ padding:12 }}>
              <button className="btn ghost" onClick={()=>toggle(cat.id)} style={{ justifyContent:'space-between', display:'flex', width:'100%' }}>
                <span>{cat.title}</span>
                <span>{open[cat.id] ? '▾' : '▸'}</span>
              </button>
              {open[cat.id] && (
                <div style={{ marginTop:8, display:'grid', gap:8 }}>
                  {cat.faqs.map((f, idx) => (
                    <div key={idx} className="card" style={{ padding:12 }}>
                      <div style={{ fontWeight:600 }}>{f.q}</div>
                      <div style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>{f.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI chat column */}
        <div className="card" style={{ display:'flex', flexDirection:'column', gap:8, minHeight: 420, maxHeight:'60vh', overflow:'hidden' }}>
          <h3 style={{ marginTop:0 }}>Ask anything</h3>
          {chatError && (
            <div className="card" style={{ padding:10, color:'var(--error)', background:'rgba(255,0,0,0.05)', border:'1px solid var(--error)', fontSize:13 }}>
              {chatError}
            </div>
          )}
          <div ref={chatScrollRef} style={{ flex:1, overflowY:'auto', display:'grid', gap:8, paddingRight:4, minHeight: 200 }}>
            {conversation.length === 0 && (
              <div style={{ color:'var(--muted)', fontSize:13 }}>Try: "How do I export my data?" or "Where can I view my past labs?"</div>
            )}
            {conversation.map((m, i) => (
              <div key={i} className="card" style={{ background: m.role==='user' ? 'rgba(0,186,206,0.08)' : 'rgba(255,255,255,0.03)', border:'1px solid var(--border)', padding:12 }}>
                <div style={{ fontSize:12, color:'var(--muted)' }}>{m.role === 'user' ? 'You' : 'Assistant'}</div>
                <div style={{ marginTop:4, whiteSpace:'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
          </div>
          <div className="form-row">
            <div className="form-field" style={{ flex:1 }}>
              <label>Ask your question</label>
              <input value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Type your question..." onKeyDown={(e)=>{ if(e.key==='Enter' && prompt.trim()) { sendChatMessage(prompt.trim()); setPrompt(''); } }} />
            </div>
            <div style={{ alignSelf:'end' }}>
              <button className="btn primary" disabled={!prompt.trim() || loading} onClick={()=>{ if(!prompt.trim()) return; sendChatMessage(prompt.trim()); setPrompt(''); }}>{loading ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {suggestions.map((s, i) => (
              <button key={i} className="btn ghost small" onClick={()=>setPrompt(s)}>{s}</button>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ fontSize:12, color:'var(--muted)' }}>AI assistant uses help content for guidance. Not medical advice.</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn ghost small" onClick={clearConversation}>Clear</button>
              <button className="btn ghost small" disabled={historyLoading || !sessionId} onClick={loadChatHistory}>
                {historyLoading ? 'Loading history…' : 'Load history'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


