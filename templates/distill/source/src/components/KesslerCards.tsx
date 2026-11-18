import React from 'react';
import { type KesslerCardData } from '../data/kesslerCards';

/** "$2,400" as ["$", "2,400"], so the currency sign sits small and raised. */
function currency(title: string): [string, string] {
  const m = title.match(/^([^\p{L}\p{N}\s]{1,2})\s*(.+)$/u);
  return m ? [m[1], m[2]] : ['', title];
}

const bg = (src: string) => (src ? `url("${src.replace(/["\\]/g, '')}")` : 'none');

function KesslerNav({ card }: { card: KesslerCardData }) {
  const items = card.menu;
  const active = card.active;
  return (
    <div className="k-nav">
      <div className="k-brand">
        <svg viewBox="0 0 54 42" fill="none" aria-hidden="true">
          <path
            d="M3 39L19 7L35 39"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 39L35 11L51 39"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{card.site}</span>
      </div>
      <div className="k-menu">
        {items.map((item, i) => (
          <span key={i} className={item === active ? 'is-active' : undefined}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function KesslerCardContent({ card }: { card: KesslerCardData }) {
  switch (card.id) {
    case 'home':
      return (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: bg(card.images[0]),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(20,10,4,0.25) 0%, rgba(20,10,4,0) 30%, rgba(20,10,4,0.55) 100%)',
            }}
          />
          <KesslerNav card={card} />
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              bottom: '4.4cqw',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4cqw',
              zIndex: 2,
            }}
          >
            {card.rows.slice(0, 3).map(([num, label], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: '1px', height: '10.5cqw', background: 'rgba(255,255,255,0.35)' }} />}
                <div>
                  <div style={{ fontWeight: 300, fontSize: '9cqw', lineHeight: 0.9, letterSpacing: '-0.04em' }}>{num}</div>
                  <div style={{ marginTop: '1cqw', fontSize: '1.9cqw', opacity: 0.85 }}>{label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              right: '4.4cqw',
              bottom: '4.4cqw',
              width: '24cqw',
              fontSize: '2.2cqw',
              lineHeight: 1.32,
              fontWeight: 400,
              zIndex: 2,
            }}
          >
            {card.title}
          </div>
        </>
      );

    case 'price':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            color: '#2A1406',
            background:
              'radial-gradient(120% 90% at 20% 110%, #FF6A1F 0, #FF9A4A 35%, #F7C79A 62%, #EFD9C4 100%)',
          }}
        >
          <KesslerNav card={card} />
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              top: '38%',
              fontWeight: 300,
              fontSize: '13cqw',
              lineHeight: 0.95,
              letterSpacing: '-0.05em',
            }}
          >
            <span
              style={{
                fontSize: '0.4em',
                verticalAlign: '0.9em',
                marginRight: '0.04em',
                fontWeight: 400,
              }}
            >
              {currency(card.title)[0]}
            </span>
            {currency(card.title)[1]}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              top: '62%',
              fontFamily: 'var(--mono)',
              fontSize: '1.6cqw',
              letterSpacing: '0.06em',
              opacity: 0.75,
            }}
          >
            {card.kicker}
          </div>
          <div
            style={{
              position: 'absolute',
              right: '4.4cqw',
              top: '38%',
              width: '36cqw',
              fontSize: '2cqw',
            }}
          >
            {card.rows.slice(0, 4).map(([name, val], i) => (
              <div
                key={i}
                style={{
                  borderTop: '1px solid rgba(42,20,6,0.25)',
                  padding: '1.45cqw 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{name}</span>
                <span style={{ fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              bottom: '4.4cqw',
              background: '#2A1406',
              color: '#F7E6D6',
              borderRadius: '999px',
              padding: '1.3cqw 2.6cqw',
              fontSize: '1.75cqw',
              fontWeight: 500,
            }}
          >
            {card.button}
          </div>
        </div>
      );

    case 'case':
      return (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: bg(card.images[0]),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(1.4cqw) saturate(1.1)',
              transform: 'scale(1.12)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(25,14,8,0.15) 0%, rgba(25,14,8,0.55) 100%)',
            }}
          />
          <KesslerNav card={card} />
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              top: '17%',
              fontFamily: 'var(--mono)',
              fontSize: '1.4cqw',
              letterSpacing: '0.08em',
              opacity: 0.85,
              zIndex: 2,
            }}
          >
            {card.kicker}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              top: '24%',
              width: '56cqw',
              fontFamily: 'var(--serif)',
              fontSize: '4.6cqw',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              zIndex: 2,
            }}
          >
            {card.title}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              right: '4.4cqw',
              bottom: '4.4cqw',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '3cqw',
              zIndex: 2,
            }}
          >
            {card.rows.slice(0, 3).map(([num, label], i) => (
              <div
                key={i}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.32)',
                  paddingTop: '1.7cqw',
                }}
              >
                <div
                  style={{
                    fontWeight: 300,
                    fontSize: '6cqw',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    marginTop: '0.9cqw',
                    fontSize: '1.75cqw',
                    opacity: 0.82,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </>
      );

    case 'vision':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#1B1311',
          }}
        >
          <KesslerNav card={card} />
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              right: '4.4cqw',
              top: '21%',
              height: '46%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.2fr',
              gap: '2cqw',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                borderRadius: '1.4cqw',
                backgroundImage: bg(card.images[0]),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div
              style={{
                borderRadius: '1.4cqw',
                backgroundImage: bg(card.images[1]),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '3.4cqw',
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '0.6cqw',
              }}
            >
              <span>
                {card.title}{' '}
                <em style={{ opacity: 0.75 }}>
                  {card.emphasis}
                </em>
              </span>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              right: '4.4cqw',
              bottom: '4.4cqw',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '1.6cqw',
              opacity: 0.7,
              lineHeight: 1.4,
            }}
          >
            <div>
              {card.text.map((l, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {l}
                </React.Fragment>
              ))}
            </div>
            <div>Manifesto · 6 min</div>
          </div>
        </div>
      );

    case 'alloy':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#140C08',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: bg(card.images[0]),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(0.6cqw)',
              transform: 'scale(1.06)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(20,12,8,0.18) 0%, rgba(20,12,8,0.68) 100%)',
            }}
          />
          <KesslerNav card={card} />
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              bottom: '4.4cqw',
              fontFamily: 'var(--serif)',
              fontSize: '7.4cqw',
              lineHeight: 0.98,
              letterSpacing: '-0.025em',
              zIndex: 2,
            }}
          >
            {card.title}
            <br />
            <em>{card.emphasis}</em>
          </div>
          <div
            style={{
              position: 'absolute',
              right: '4.4cqw',
              bottom: '4.4cqw',
              width: '30cqw',
              fontSize: '1.75cqw',
              zIndex: 2,
            }}
          >
            {card.rows.slice(0, 4).map(([k, v], i) => (
              <div
                key={i}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.32)',
                  padding: '1.1cqw 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ opacity: 0.7 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'journal':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#E9ECF1',
            color: '#121A2A',
          }}
        >
          <KesslerNav card={card} />
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              top: '23%',
              fontFamily: 'var(--serif)',
              fontSize: '5.6cqw',
              lineHeight: 1.03,
              letterSpacing: '-0.02em',
            }}
          >
            <div>Journal</div>
            <div style={{ fontStyle: 'italic', color: '#46618E' }}>
              {card.title}
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: '4.4cqw',
              right: '4.4cqw',
              bottom: '4cqw',
              display: 'grid',
              gridTemplateColumns: '1.25fr 1fr 1fr',
              gap: '2.2cqw',
              alignItems: 'start',
            }}
          >
            {card.rows.slice(0, 3).map(([kicker, title], i) => ({ img: card.images[i] || card.images[0], kicker, title })).map((post, i) => (
              <div key={i}>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    borderRadius: '1.2cqw',
                    backgroundImage: bg(post.img),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    marginBottom: '1.1cqw',
                  }}
                />
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '1.15cqw',
                    letterSpacing: '0.06em',
                    color: '#6A7891',
                    marginBottom: '0.45cqw',
                  }}
                >
                  {post.kicker}
                </div>
                <div
                  style={{
                    fontSize: '1.65cqw',
                    lineHeight: 1.24,
                    fontWeight: 500,
                  }}
                >
                  {post.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
  }
}
