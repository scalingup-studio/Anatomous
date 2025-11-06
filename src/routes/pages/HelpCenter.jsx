import React from "react";
// NOTE: For Help Center we use a local Q&A helper and DO NOT call /generate-insight

export default function HelpCenterPage() {
  const categories = [
    {
      id:'getting_started', title:'Getting Started', faqs:[
        { q:'How do I create an account?', a:'Go to Signup, enter your email and a strong password, then confirm via email.' },
        { q:'How do I fill out my health profile?', a:'Open Profile → Personal and Health History sections, then Save.' },
        { q:'Where do I view my insights?', a:'Insights are available in Dashboard → Insights after data is processed.' },
      ]
    },
    {
      id:'insights', title:'Understanding Insights', faqs:[
        { q:'What do the insights mean?', a:'Insights provide educational guidance based on your data; not medical advice.' },
        { q:'Are the insights medical advice?', a:'No. They are educational only. Consult a healthcare professional for medical advice.' },
        { q:'How often are insights updated?', a:'After new data uploads or when you request a refresh.' },
      ]
    },
    {
      id:'privacy', title:'Privacy & Data', faqs:[
        { q:'Can I delete my data?', a:'Yes. Settings → Privacy → Data management → Delete my data.' },
        { q:'Is my information private?', a:'We store data securely; control visibility in Settings → Privacy.' },
        { q:'How do I control what is shared?', a:'Use Data visibility and Goal visibility settings to control sharing.' },
      ]
    },
    {
      id:'billing', title:'Billing & Subscriptions', faqs:[
        { q:'What’s included in each subscription tier?', a:'Each plan lists features on the pricing page. Upgrades unlock advanced analytics.' },
        { q:'How do I upgrade or cancel my plan?', a:'Go to Billing in your account (coming soon) or contact support.' },
        { q:'Where can I find my payment history?', a:'Billing → History (coming soon).' },
      ]
    },
    {
      id:'technical', title:'Technical Support', faqs:[
        { q:'Trouble logging in?', a:'Try resetting your password or clearing browser cookies.' },
        { q:'How to reset your password?', a:'Use Forgot Password on the Login page and follow the instructions.' },
        { q:'Supported browsers and devices', a:'Latest Chrome, Safari, Firefox, Edge; modern iOS/Android browsers.' },
      ]
    },
  ];

  const [open, setOpen] = React.useState({});
  const toggle = (key) => setOpen(v => ({ ...v, [key]: !v[key] }));

  const [conversation, setConversation] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const clearConversation = () => setConversation([]);

  const localSendMessage = async (message) => {
    setLoading(true);
    try {
      // push user message
      setConversation((prev) => [...prev, { role: "user", content: message }]);
      const q = message.trim().toLowerCase();
      // search in categories FAQs
      const matches = [];
      for (const cat of categories) {
        for (const f of cat.faqs) {
          if (
            f.q.toLowerCase().includes(q) ||
            f.a.toLowerCase().includes(q)
          ) {
            matches.push({ q: f.q, a: f.a, cat: cat.title });
          }
        }
      }
      let reply = "I couldn't find an exact answer. Try different keywords or browse the Smart FAQ above.";
      if (matches.length > 0) {
        const top = matches.slice(0, 3)
          .map((m, i) => `${i + 1}. ${m.q}\n${m.a}`)
          .join("\n\n");
        reply = top;
      }
      setConversation((prev) => [...prev, { role: "assistant", content: reply }]);
      return reply;
    } finally {
      setLoading(false);
    }
  };
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.map(cat => ({
      ...cat,
      faqs: cat.faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    })).filter(cat => cat.faqs.length > 0);
  }, [search, categories]);

  const suggestions = [
    'How do I export my data?',
    'Where can I view my past labs?',
    'How to reset my password?',
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Help Center</h1>
      </div>

      {/* Intro & Search */}
      <div className="card" style={{ display:'grid', gap:12 }}>
        <div style={{ color:'var(--muted)', fontSize:13 }}>One-stop hub with Smart FAQs and AI assistant. Crisp live chat is not included in the MVP.</div>
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
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>
        {/* FAQ column */}
        <div className="card" style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <h3 style={{ marginTop:0 }}>Smart FAQ</h3>
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
        <div className="card" style={{ display:'flex', flexDirection:'column', gap:8, minHeight: 420 }}>
          <h3 style={{ marginTop:0 }}>Ask anything</h3>
          <div style={{ flex:1, overflowY:'auto', display:'grid', gap:8, paddingRight:4 }}>
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
              <input value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Type your question..." onKeyDown={(e)=>{ if(e.key==='Enter' && prompt.trim()) { localSendMessage(prompt.trim()); setPrompt(''); } }} />
            </div>
            <div style={{ alignSelf:'end' }}>
              <button className="btn primary" disabled={!prompt.trim() || loading} onClick={()=>{ if(!prompt.trim()) return; localSendMessage(prompt.trim()); setPrompt(''); }}>{loading ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {suggestions.map((s, i) => (
              <button key={i} className="btn ghost small" onClick={()=>setPrompt(s)}>{s}</button>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div style={{ fontSize:12, color:'var(--muted)' }}>AI assistant uses help content for guidance. Not medical advice.</div>
            <button className="btn ghost small" onClick={clearConversation}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}


