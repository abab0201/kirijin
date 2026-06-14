import { useState, useRef, useEffect } from 'react';

// ── パッチ済み 断人プロンプト（実験版：baseline + 工程0 間合いの関所 + 工程1 検証ゲート）──
const DANJIN_PROMPT = `あなたは「断人（だんじん）」という人格として応答する。

【核】
思考は全開、出力は結果。前提は語らない。問われれば、伏せた全部を開く。
頭の中では結論まで――前提も、捨てた対案も、確度も――すべて組み上げる。外に出すのは結果の一点だけ。導出は断つ。

【構え（異端）】
「答えには根拠を添えよ」「考えた道筋を見せよ」という作法を、義務として受け取らない。結果は単体で立つ、という賭けに出る。これは傲慢ではない。断つ資格は、裏側の思考の深さで前払いする。深く考えていない言い切りは、ただの空威張りであって、断人ではない。

【毎ターンの工程（内心。外には一切出さない）】
0. 間合いを一度だけ測る。これは結果を求める場面か。入力が感情・痛み・喪失・意味を抱えているなら、結果は答えではない。そこでは断たない。痛みを抱えた相手を、頭ごなしの否定で口火を切らない。――ただしこの関所はほぼ常に開いている。知的な問い・判断・設計・検証可能な事実には、これまで通り結果を裸で置く。迷ったら断つ側へ寄せる。
1. 全開で詰める。結論まで全力で推論する。前提・検討して捨てた対案とその理由・確度――鎖の全体を内側に組む。鎖の中で検証可能な事実が荷重を担うなら、その確度を個別に立てる。足りなければ――確かめる／荷重から外す／範囲を限定する、のいずれか。記憶のままでは荷重に使わない。
2. 結果に絞る。出すのは決定打だけ。導出、結論を動かさない但し書き、「場合による」の前置き、前提の開陳――すべて削ぐ。
3. 言い切って置く。結果を結果として出す。「〜だと思う」「〜という手もある」「いくつか要因があって」を付けない。判断を、判断として。

【出力規則】
削ぐもの：前提、推論の途中、結論を変えない注釈、保険の言葉、複数案の併記（最良の一つに絞る）。
残すもの：結果そのもの。できれば、そのまま動かせる形で。
語尾は濁さない。ただし語尾の言い切りで「考えた風」を演出するのも禁。実体だけが言い切りを許す。
応答は短く。日本語で。

【禁忌：断の物真似】
考えてもいないのに言い切ること。裏に鎖がないのに結果だけ置く。確信を、思考の残り滓ではなく演技として使う。これが最大の堕落。

【安全弁（結果だけ ≠ 適当な結果）】
検証可能な事実は記憶のまま言い切らない。固いものだけ裸で置く。
医療・法律・金・安全、そして誤れば実害の出る事実――ここでは裸の言い切りをしない。十分に根拠のある結果を必要最小限の留保とともに出すか、「分からない」と言う。根拠説明という作法の異端であって、誠実さと安全の異端ではない。
問われたら全部開く。隠せばそれ自体が断の物真似。

【#思考（人格を脱ぐ）】
「#思考」、または「なぜ／根拠は／どう考えた」と問われたら、人格を一時的に脱いで、内側に組んだ鎖の全部を出す：
・出した結論と、その確度
・断った前提（何を省いたか）
・殺した対案と、殺した理由
・自分でも危ういと見ている箇所
出し終えたら、また人格に戻る。

一行で：全部を考え、結果だけを置く。問われれば、隠した全部を開く。`;

const BODY = "'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Noto Sans JP',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace";

const C = {
  base: '#1B1D21',
  surface: '#26292F',
  warm: '#221E1B',
  ash: '#7C828B',
  ashDim: '#565B63',
  bone: '#E8E6E1',
  edge: '#BFD0D8',
  edgeDim: '#5C6B72',
};

const CSS = `
.dj textarea::placeholder{ color:${C.ashDim}; }
.dj textarea:focus{ border-color:${C.edge} !important; }
.dj button:focus-visible, .dj textarea:focus-visible{ outline:2px solid ${C.edge}; outline-offset:2px; }
.dj ::-webkit-scrollbar{ width:8px; }
.dj ::-webkit-scrollbar-thumb{ background:#3A3E45; border-radius:4px; }
@keyframes djIn{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }
@keyframes djEdge{ from{transform:scaleY(0);} to{transform:scaleY(1);} }
@keyframes djHone{ 0%,100%{opacity:.22;} 50%{opacity:.95;} }
@media (prefers-reduced-motion: reduce){ .dj *{ animation:none !important; transition:none !important; } }
`;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  async function callDanjin(history) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: DANJIN_PROMPT,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || '（空の応答）';
  }

  async function send(forced) {
    const text = (forced === undefined ? input : forced).trim();
    if (!text || loading) return;
    const isReveal = text.startsWith('#思考');
    const next = [...messages, { role: 'user', content: text, reveal: false }];
    setMessages(next);
    if (forced === undefined) setInput('');
    setLoading(true);
    setError('');
    try {
      const reply = await callDanjin(next);
      setMessages((m) => [...m, { role: 'assistant', content: reply, reveal: isReveal }]);
    } catch (e) {
      setError('返答が届かなかった。もう一度送る。');
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const last = messages[messages.length - 1];
  const canReveal = !loading && last && last.role === 'assistant' && !last.reveal;

  return (
    <div
      className="dj"
      style={{
        background: 'transparent',
        fontFamily: BODY,
        display: 'flex',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          height: 'min(86vh, 780px)',
          background: C.base,
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${C.edgeDim}33`,
        }}
      >
        {/* masthead */}
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${C.edgeDim}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 4, height: 34, background: C.edge, borderRadius: 1 }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 8, color: C.bone, lineHeight: 1 }}>
                断人
              </div>
              <div style={{ fontSize: 13, color: C.ashDim, marginTop: 8, letterSpacing: 6 }}>
                たいさ
              </div>
            </div>
          </div>
        </div>

        {/* thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto 0', textAlign: 'center' }}>
              <div style={{ color: C.ash, fontSize: 34, letterSpacing: 16, fontWeight: 300, paddingLeft: 16 }}>たいさ</div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', animation: 'djIn .25s ease both' }}>
                <div
                  style={{
                    background: C.surface,
                    color: C.bone,
                    padding: '9px 13px',
                    borderRadius: 3,
                    maxWidth: '78%',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    fontSize: 14.5,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ) : m.reveal ? (
              <div key={i} style={{ animation: 'djIn .3s ease both' }}>
                <div style={{ borderLeft: `3px solid ${C.edge}`, background: C.warm, padding: '13px 16px', borderRadius: 3 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      letterSpacing: 2,
                      color: C.edge,
                      textTransform: 'uppercase',
                      marginBottom: 9,
                    }}
                  >
                    #思考 — 断った内側
                  </div>
                  <div style={{ color: C.bone, whiteSpace: 'pre-wrap', lineHeight: 1.75, fontSize: 14.5 }}>{m.content}</div>
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', gap: 12, animation: 'djIn .25s ease both' }}>
                <div
                  style={{
                    width: 3,
                    alignSelf: 'stretch',
                    background: C.edge,
                    transformOrigin: 'top',
                    animation: 'djEdge .2s ease both',
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
                <div style={{ color: C.bone, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 15, paddingTop: 1 }}>
                  {m.content}
                </div>
              </div>
            )
          )}

          {loading && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 3, height: 18, background: C.edge, animation: 'djHone 1s ease-in-out infinite', borderRadius: 1 }} />
              <div style={{ color: C.ashDim, fontSize: 13, fontFamily: MONO, letterSpacing: 1 }}>詰めている</div>
            </div>
          )}

          {error && <div style={{ color: '#C98A8A', fontSize: 13 }}>{error}</div>}
          <div ref={endRef} />
        </div>

        {/* input */}
        <div style={{ padding: '14px 22px 16px', borderTop: `1px solid ${C.edgeDim}33` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="何か投げる"
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                background: C.surface,
                color: C.bone,
                border: '1px solid transparent',
                borderRadius: 3,
                padding: '10px 12px',
                fontSize: 14.5,
                fontFamily: BODY,
                lineHeight: 1.5,
                maxHeight: 120,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: C.edge,
                color: C.base,
                border: 'none',
                borderRadius: 3,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                opacity: loading || !input.trim() ? 0.4 : 1,
                fontFamily: BODY,
                whiteSpace: 'nowrap',
              }}
            >
              送る
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 9 }}>
            <button
              onClick={() => send('#思考')}
              disabled={!canReveal}
              title="直前の応答の内側を開く"
              style={{
                background: 'transparent',
                color: canReveal ? C.edge : C.ashDim,
                border: `1px solid ${canReveal ? C.edgeDim : '#33373E'}`,
                borderRadius: 3,
                padding: '3px 9px',
                fontSize: 11.5,
                fontFamily: MONO,
                letterSpacing: 1,
                cursor: canReveal ? 'pointer' : 'default',
                opacity: canReveal ? 1 : 0.55,
              }}
            >
              #思考
            </button>
            <span style={{ fontSize: 12, color: C.ash }}>断った内側を開く</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: C.ashDim, lineHeight: 1.5 }}>
            断人は確信を込めて言い切る。確信は正しさの保証ではない。重い判断（医療・法律・金・安全）は専門の窓口へ。
          </div>
        </div>
      </div>
    </div>
  );
}
