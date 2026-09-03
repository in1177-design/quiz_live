import { useLayoutEffect, useRef, useState } from 'react';
import { AvatarStack, pastelFor } from './BarChart.jsx';
import { ImageIcon } from './icons.jsx';

// Applied to translated (non-Hebrew) text on the presenter screen — tall, more legible from a
// distance than the default Hebrew font. Bold for the question title, light for the answers,
// medium for the reveal explanation. Harmless on Hebrew text since Roboto Condensed has no
// Hebrew glyphs and the browser falls back to the default font for those.
export const LTR_FONT = { fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700 };
export const LTR_FONT_LIGHT = { fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 300 };
export const LTR_FONT_MEDIUM = { fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 500 };

// A celebratory banner the presenter can toggle on (from the remote) while an answer is
// revealed — up to 3 of the players who answered correctly, shown as circles over the screen.
export function CorrectAnswerSpotlight({ voters }) {
  if (!voters?.length) return null;
  const shown = voters.slice(0, 3);
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
      display: 'flex', gap: 20, alignItems: 'flex-start', background: 'rgba(0,0,0,0.6)',
      padding: '16px 26px', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    }}>
      {shown.map((p, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 84 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', border: `3px solid ${pastelFor(p?.name ?? i)}`, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'white', flexShrink: 0,
          }}>
            {p?.avatar?.type === 'photo'
              ? <img src={p.avatar.value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : p?.avatar?.value}
          </div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13, textAlign: 'center', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{p?.name}</div>
        </div>
      ))}
    </div>
  );
}

export function PillTimer({ secondsLeft, totalSeconds }) {
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const urgent = secondsLeft <= 5;
  return (
    <div style={{ position: 'relative', width: 200, height: 40, borderRadius: 20, background: '#0b0b12', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 7, borderRadius: 999, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${pct * 100}%`, borderRadius: 999,
          background: urgent ? 'var(--opt-0)' : 'linear-gradient(90deg, var(--accent), #22d3ee)',
          transition: 'width 1s linear',
        }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 18 }}>
        {Math.ceil(secondsLeft)}
      </div>
    </div>
  );
}

export function AnswerGrid({ options, correctIndex, revealed, voters, ltr, fontScale = 1 }) {
  const tileRefs = useRef([]);
  const [tileHeight, setTileHeight] = useState(null);

  // All 4 tiles share one height — the tallest one's natural content height — so a longer
  // answer (or a bigger fontScale wrapping it to more lines) doesn't leave one row shorter
  // than the other. Re-measured whenever the text, language, or font size changes — clearing
  // the previously-forced height first, otherwise scrollHeight would just echo back that old
  // value forever and the boxes could grow but never shrink back down.
  useLayoutEffect(() => {
    tileRefs.current.forEach((el) => { if (el) el.style.height = 'auto'; });
    const heights = tileRefs.current.map((el) => el?.scrollHeight || 0);
    setTileHeight(Math.max(100 * fontScale, ...heights));
  }, [options, ltr, fontScale]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', direction: ltr ? 'ltr' : 'rtl' }}>
      {options.map((opt, i) => {
        const isCorrect = i === correctIndex;
        const muted = revealed && !isCorrect;
        const count = voters?.[i]?.length || 0;
        const badge = (
          <div style={{ width: 32 * fontScale, height: 32 * fontScale, borderRadius: 16 * fontScale, background: 'rgba(255,255,255,0.31)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 * fontScale, color: 'white', flexShrink: 0 }}>
            {i + 1}
          </div>
        );
        const text = (
          <div style={{
            flex: 1, minWidth: 0, textAlign: ltr ? 'left' : 'right', direction: ltr ? 'ltr' : 'rtl',
            fontWeight: 700, fontSize: 24 * fontScale, color: 'white', ...(ltr ? LTR_FONT_LIGHT : {}),
          }}>
            {opt}
          </div>
        );
        // Hidden until revealed — showing live per-option counts while the question is still
        // open gives away a hint (e.g. "everyone's picking option 2").
        const voteCount = <div style={{ fontWeight: 800, fontSize: 20 * fontScale, color: 'white', flexShrink: 0, minWidth: 20, textAlign: 'center' }}>{revealed ? count : ''}</div>;
        return (
          <div key={i} style={{ position: 'relative' }}>
            {revealed && count > 0 && (
              <div style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', zIndex: 5 }}>
                <AvatarStack voters={voters[i]} />
              </div>
            )}
            <div
              ref={(el) => { tileRefs.current[i] = el; }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 100 * fontScale,
                height: tileHeight || undefined, padding: '16px', borderRadius: 14,
                background: muted ? '#3e376e' : `var(--opt-${i})`, transition: 'background 0.4s ease',
              }}
            >
              {badge}{text}{voteCount}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FADE = 'opacity 0.6s ease';

// Shows the answer explanation. With a translation (q.answerExplanationHe set), it's two
// separate semi-transparent boxes stacked up — the display language on top, Hebrew below it
// in a smaller font. With no translation, it's just the one plain text as before.
function ExplanationText({ q, ltr, fontScale, size }) {
  if (!q.answerExplanation) return null;
  if (!q.answerExplanationHe) {
    return (
      <div style={{ fontSize: size * fontScale, fontWeight: 700, color: '#f59e0b', direction: ltr ? 'ltr' : 'rtl', textAlign: 'center', ...(ltr ? LTR_FONT_MEDIUM : {}) }}>
        {q.answerExplanation}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{
        background: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: '10px 22px', maxWidth: 1100,
        fontSize: size * fontScale, fontWeight: 700, color: '#f59e0b', textAlign: 'center', direction: ltr ? 'ltr' : 'rtl',
        ...LTR_FONT_MEDIUM,
      }}>
        {q.answerExplanation}
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: '7px 18px', maxWidth: 1100,
        fontSize: size * fontScale * 0.68, fontWeight: 700, color: '#f59e0b', textAlign: 'center', direction: 'rtl',
      }}>
        {q.answerExplanationHe}
      </div>
    </div>
  );
}

export function QuestionCard({ q, revealed, secondsLeft, voters, headerLabel, coverImageURL, manualTimer, ltr, fontScale = 1 }) {
  const qImg = q.imageURL || coverImageURL;
  const aImg = q.answerImageURL || q.imageURL || coverImageURL;
  const hasAnyImage = !!(qImg || aImg);

  return (
    <div className="card pop-in" style={{ width: '100%', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {headerLabel && <div className="dim" style={{ width: '100%', textAlign: 'right', fontSize: 13, marginTop: -16 }}>{headerLabel}</div>}

      <div style={{ width: '100%', display: 'grid' }}>
        <div aria-hidden={revealed} style={{ gridArea: '1 / 1', display: 'flex', justifyContent: 'center', opacity: revealed ? 0 : 1, pointerEvents: revealed ? 'none' : 'auto', transition: FADE }}>
          {!manualTimer && <PillTimer secondsLeft={secondsLeft} totalSeconds={q.timeLimit} />}
        </div>
        <div aria-hidden={!revealed} style={{ gridArea: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: revealed ? 1 : 0, pointerEvents: revealed ? 'auto' : 'none', transition: FADE }}>
          <ExplanationText q={q} ltr={ltr} fontScale={fontScale} size={30} />
        </div>
      </div>

      <div className="title" style={{ fontSize: 28 * fontScale, textAlign: 'center', opacity: revealed ? 0.5 : 1, transition: FADE, direction: ltr ? 'ltr' : 'rtl', ...(ltr ? LTR_FONT : {}) }}>{q.text || '(אין טקסט שאלה)'}</div>

      <div style={{
        position: 'relative', width: '100%', maxWidth: 1240, aspectRatio: '1240 / 800', borderRadius: 20,
        border: '1.5px solid #342e5b', overflow: 'hidden', background: 'var(--surface-strong)',
      }}>
        {!hasAnyImage && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={64} />
          </div>
        )}
        {qImg && (
          <img src={qImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: revealed ? 0 : 1, transition: FADE }} />
        )}
        {aImg && (
          <img src={aImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: revealed ? 1 : 0, transition: FADE }} />
        )}
      </div>

      <AnswerGrid options={q.options} correctIndex={q.correctIndex} revealed={revealed} voters={voters} ltr={ltr} fontScale={fontScale} />
    </div>
  );
}

// Full-screen layout: the image is stretched as a cover background across the whole
// screen (proportions preserved, edges cropped as needed) and the question + answers
// float as a layer stuck near the bottom of the screen.
export function FullBackgroundQuestionCard({ q, revealed, secondsLeft, voters, headerLabel, coverImageURL, manualTimer, ltr, fontScale = 1 }) {
  const qImg = q.imageURL || coverImageURL;
  const aImg = q.answerImageURL || q.imageURL || coverImageURL;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {qImg && (
        <img src={qImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: revealed ? 0 : 1, transition: FADE }} />
      )}
      {aImg && (
        <img src={aImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: revealed ? 1 : 0, transition: FADE }} />
      )}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 26%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0) 72%)' }} />

      {headerLabel && (
        <div style={{ position: 'absolute', top: 20, right: 24, color: 'rgba(255,255,255,0.75)', fontSize: 13, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
          {headerLabel}
        </div>
      )}

      {!revealed && !manualTimer && (
        <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', justifyContent: 'center' }}>
          <PillTimer secondsLeft={secondsLeft} totalSeconds={q.timeLimit} />
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '0 32px' }}>
        {revealed && q.answerExplanation && (
          q.answerExplanationHe ? (
            <ExplanationText q={q} ltr={ltr} fontScale={fontScale} size={24} />
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: '16px 28px', maxWidth: 1200 }}>
              <ExplanationText q={q} ltr={ltr} fontScale={fontScale} size={24} />
            </div>
          )
        )}
        <div style={{ fontSize: 30 * fontScale, fontWeight: 800, color: 'white', textAlign: 'center', maxWidth: 1200, textShadow: '0 2px 12px rgba(0,0,0,0.9)', direction: ltr ? 'ltr' : 'rtl', ...(ltr ? LTR_FONT : {}) }}>
          {q.text || '(אין טקסט שאלה)'}
        </div>
        <div style={{ width: '100%', maxWidth: 1240 }}>
          <AnswerGrid options={q.options} correctIndex={q.correctIndex} revealed={revealed} voters={voters} ltr={ltr} fontScale={fontScale} />
        </div>
      </div>
    </div>
  );
}
