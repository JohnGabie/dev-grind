import { useEffect } from 'react'

interface BgPatternProps {
  color1?: string
  color2?: string
  color3?: string
  speed?: number
  preview?: boolean
}

const MAT_DELAYS = [-2.5,-3.2,-1.8,-2.9,-1.5,-3.8,-2.1,-2.7,-3.4,-1.9,-3.6,-2.3,-3.1,-2.6,-3.7,-2.8,-3.3,-2.2,-3.9,-2.4,-1.7,-3.5,-2.0,-4.0,-1.6,-3.0,-3.8,-2.5,-3.2,-2.7,-1.8,-3.6,-2.1,-3.4,-2.8,-3.7,-2.3,-1.9,-3.5,-2.6]
const MAT_DURS  = [3,4,2.5,3.5,3,4.5,2.8,3.2,3.8,2.7,4.2,3.1,3.6,2.9,4.1,3.3,3.7,2.6,4.3,3.4,2.4,3.9,3,4.4,2.3,3.5,4,2.8,3.6,3.2,2.7,4.1,3.1,3.7,2.9,4.2,3.3,2.5,3.8,3.4]

const PATTERN_CSS = `
.bp-wrap{position:absolute;inset:0;overflow:hidden;pointer-events:none}

/* ── MATRIX ── */
.bp-mat{position:relative;width:100%;height:100%;background:#0a0a0a;display:flex}
.bp-mat-pat{position:relative;width:1000px;height:100%;flex-shrink:0}
.bp-mat-col{position:absolute;top:-100%;width:20px;height:100%;font-size:16px;line-height:18px;font-weight:bold;animation:bp-fall linear infinite;white-space:nowrap}
.bp-mat-col::before{
  content:"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  position:absolute;top:0;left:0;
  background:linear-gradient(to bottom,#fff 0%,#fff 4%,var(--bg-c1) 10%,var(--bg-c1) 25%,var(--bg-c2) 50%,var(--bg-c3) 80%,rgba(0,0,0,0) 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  writing-mode:vertical-lr;letter-spacing:1px;
}
.bp-mat-col:nth-child(odd)::before{content:"アイウエオカキクケコサシスセソタチツテトナニヌネノ123456789"}
.bp-mat-col:nth-child(even)::before{content:"ガギグゲゴザジズゼゾダヂヅデドバビブベボABCDEFGHIJKLMNOPQRSTUVWXYZ"}
.bp-mat-col:nth-child(3n)::before{content:"アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソ0987654321"}
.bp-mat-col:nth-child(4n)::before{content:"ンヲロヨモホノトソコオレメヘネテセケエルユムフヌツスクウリミヒニチシキイワラヤマハナタサカア"}
.bp-mat-col:nth-child(5n)::before{content:"ガザダバパギジヂビピグズヅブプゲゼデベペゴゾドボポ!@#$%^&*()_+"}
@keyframes bp-fall{0%{transform:translateY(-10%);opacity:1}100%{transform:translateY(200%);opacity:0}}

/* ── RAIN ── */
.bp-rain{position:absolute;inset:0;background-color:#0a0a0a;
  background-image:
    radial-gradient(4px 100px at 0px 235px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 235px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 117.5px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 252px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 252px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 126px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 150px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 150px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 75px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 253px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 253px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 126.5px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 204px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 204px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 102px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 134px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 134px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 67px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 179px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 179px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 89.5px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 299px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 299px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 149.5px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 215px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 215px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 107.5px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 281px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 281px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 140.5px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 158px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 158px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 79px,var(--bg-c1) 100%,#0000 150%),
    radial-gradient(4px 100px at 0px 210px,var(--bg-c1),#0000),radial-gradient(4px 100px at 300px 210px,var(--bg-c1),#0000),radial-gradient(1.5px 1.5px at 150px 105px,var(--bg-c1) 100%,#0000 150%);
  background-size:
    300px 235px,300px 235px,300px 235px,300px 252px,300px 252px,300px 252px,
    300px 150px,300px 150px,300px 150px,300px 253px,300px 253px,300px 253px,
    300px 204px,300px 204px,300px 204px,300px 134px,300px 134px,300px 134px,
    300px 179px,300px 179px,300px 179px,300px 299px,300px 299px,300px 299px,
    300px 215px,300px 215px,300px 215px,300px 281px,300px 281px,300px 281px,
    300px 158px,300px 158px,300px 158px,300px 210px,300px 210px,300px 210px;
  animation:bp-rain 150s linear infinite
}
.bp-rain-ov{position:absolute;inset:0;z-index:1;
  background-image:radial-gradient(circle at 50% 50%,#0000 0,#0000 2px,hsl(0 0 4%) 2px);
  background-size:8px 8px;
  animation:bp-rain-ov 10s linear infinite
}
@keyframes bp-rain-ov{0%{backdrop-filter:blur(1em) brightness(6) hue-rotate(0deg)}to{backdrop-filter:blur(1em) brightness(6) hue-rotate(360deg)}}
@keyframes bp-rain{
  0%{background-position:0px 220px,3px 220px,151.5px 337.5px,25px 24px,28px 24px,176.5px 150px,50px 16px,53px 16px,201.5px 91px,75px 224px,78px 224px,226.5px 350.5px,100px 19px,103px 19px,251.5px 121px,125px 120px,128px 120px,276.5px 187px,150px 31px,153px 31px,301.5px 120.5px,175px 235px,178px 235px,326.5px 384.5px,200px 121px,203px 121px,351.5px 228.5px,225px 224px,228px 224px,376.5px 364.5px,250px 26px,253px 26px,401.5px 105px,275px 75px,278px 75px,426.5px 180px}
  to{background-position:0px 6800px,3px 6800px,151.5px 6917.5px,25px 13632px,28px 13632px,176.5px 13758px,50px 5416px,53px 5416px,201.5px 5491px,75px 17175px,78px 17175px,226.5px 17301.5px,100px 5119px,103px 5119px,251.5px 5221px,125px 8428px,128px 8428px,276.5px 8495px,150px 9876px,153px 9876px,301.5px 9965.5px,175px 13391px,178px 13391px,326.5px 13540.5px,200px 14741px,203px 14741px,351.5px 14848.5px,225px 18770px,228px 18770px,376.5px 18910.5px,250px 5082px,253px 5082px,401.5px 5161px,275px 6375px,278px 6375px,426.5px 6480px}
}

/* ── AURORA ── */
.bp-aurora{
  position:absolute;inset:0;overflow:hidden;
  background:
    radial-gradient(ellipse at 20% 30%,var(--bg-c1) 0%,rgba(0,0,0,0) 60%),
    radial-gradient(ellipse at 80% 50%,var(--bg-c2) 0%,rgba(0,0,0,0) 70%),
    radial-gradient(ellipse at 50% 80%,var(--bg-c3) 0%,rgba(0,0,0,0) 65%),
    linear-gradient(135deg,#0a0a0a 0%,#0a0520 100%);
  background-blend-mode:overlay,screen,hard-light;
  animation:bp-aurora-drift 25s infinite alternate ease-in-out
}
.bp-aurora::before{
  content:"";position:absolute;width:200%;height:200%;top:-50%;left:-50%;
  background:
    repeating-linear-gradient(45deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 40px),
    repeating-linear-gradient(-45deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 60px);
  animation:bp-grid-shift 20s linear infinite
}
.bp-aurora::after{
  content:"";position:absolute;width:100%;height:100%;
  background:radial-gradient(circle at center,transparent 70%,rgba(10,5,32,0.9) 100%);
  animation:bp-aurora-pulse 8s infinite alternate
}
@keyframes bp-aurora-drift{
  0%{background-position:0% 0%,0% 0%,0% 0%;filter:hue-rotate(0deg) brightness(1)}
  50%{background-position:-10% -5%,5% 10%,0% 15%;filter:hue-rotate(30deg) brightness(1.2)}
  100%{background-position:5% 10%,-10% -5%,15% 0%;filter:hue-rotate(60deg) brightness(1)}
}
@keyframes bp-grid-shift{0%{transform:translate(0,0)}100%{transform:translate(-50%,-50%)}}
@keyframes bp-aurora-pulse{0%{opacity:0.8;transform:scale(1)}50%{opacity:0.5;transform:scale(1.05)}100%{opacity:0.8;transform:scale(1)}}

/* ── MIDNIGHT SKY ── */
.bp-sky{position:absolute;inset:0;background:#050505;overflow:hidden}
.bp-sky-canvas{position:absolute;inset:0;background:#050505}
.bp-sky-stars{position:absolute;inset:0;background-repeat:repeat;pointer-events:none}
.bp-sky-s1{
  background-image:
    radial-gradient(1px 1px at 10% 10%,var(--bg-c1),transparent),
    radial-gradient(1px 1px at 30% 20%,var(--bg-c1),transparent),
    radial-gradient(1px 1px at 50% 50%,var(--bg-c1),transparent),
    radial-gradient(1px 1px at 70% 30%,var(--bg-c1),transparent),
    radial-gradient(1px 1px at 90% 10%,var(--bg-c1),transparent);
  background-size:200px 200px;animation:bp-twinkle 3s ease-in-out infinite
}
.bp-sky-s2{
  background-image:
    radial-gradient(1.5px 1.5px at 20% 40%,var(--bg-c1),transparent),
    radial-gradient(1.5px 1.5px at 60% 85%,var(--bg-c1),transparent),
    radial-gradient(1.5px 1.5px at 85% 65%,var(--bg-c1),transparent);
  background-size:300px 300px;animation:bp-twinkle 5s ease-in-out infinite 1s
}
.bp-sky-s3{
  background-image:
    radial-gradient(2px 2px at 40% 70%,var(--bg-c1),transparent),
    radial-gradient(2px 2px at 10% 80%,var(--bg-c1),transparent),
    radial-gradient(2px 2px at 80% 40%,var(--bg-c1),transparent);
  background-size:400px 400px;animation:bp-twinkle 7s ease-in-out infinite 2s
}
.bp-sky-meteor{position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;box-shadow:0 0 10px 2px rgba(255,255,255,0.5);opacity:0;pointer-events:none}
.bp-sky-meteor::after{content:"";position:absolute;top:50%;transform:translateY(-50%);width:80px;height:1px;background:linear-gradient(90deg,#fff,transparent)}
.bp-sky-m1{top:10%;left:110%;animation:bp-shoot 8s linear infinite}
.bp-sky-m2{top:30%;left:110%;animation:bp-shoot 12s linear infinite 4s}
.bp-sky-m3{top:50%;left:110%;animation:bp-shoot 10s linear infinite 2s}
.bp-sky-moon{position:absolute;top:15%;right:15%;width:80px;height:80px;border-radius:50%;background:transparent;box-shadow:15px 15px 0 0 #fdfbd3;filter:drop-shadow(0 0 15px rgba(253,251,211,0.4));z-index:10}
@keyframes bp-twinkle{0%,100%{opacity:1}50%{opacity:0.2}}
@keyframes bp-shoot{
  0%{transform:translateX(0) translateY(0) rotate(-35deg);opacity:0}
  5%{opacity:1}
  15%{transform:translateX(-1500px) translateY(1000px) rotate(-35deg);opacity:0}
  100%{transform:translateX(-1500px) translateY(1000px) rotate(-35deg);opacity:0}
}

/* ── RADIAL BURST ── */
.bp-radial{
  position:absolute;inset:-1em;
  --bp-hex:7px;
  --bp-p:0px 0px,6px 10.39230485px;
  background-color:#0a0a0a;
  background-image:
    radial-gradient(circle at 50% 50%,#0000 1.5px,#0a0a0a 0 var(--bp-hex),#0000 var(--bp-hex)),
    radial-gradient(circle at 50% 50%,#0000 1.5px,#0a0a0a 0 var(--bp-hex),#0000 var(--bp-hex)),
    radial-gradient(circle at 50% 50%,var(--bg-c1),transparent 60%),
    radial-gradient(circle at 50% 50%,var(--bg-c2),transparent 60%),
    radial-gradient(circle at 50% 50%,var(--bg-c3),transparent 60%),
    radial-gradient(ellipse at 50% 50%,var(--bg-c1),transparent 60%);
  background-size:12px 20.7846097px,12px 20.7846097px,200% 200%,200% 200%,200% 200%,200% 20.7846097px;
  background-position:var(--bp-p),0% 0%,0% 0%,0% 0px;
  animation:bp-wee 40s linear infinite,bp-filt 6s linear infinite
}
@keyframes bp-filt{0%{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}
@keyframes bp-wee{
  0%{background-position:var(--bp-p),800% 400%,1000% -400%,-1200% -600%,400% 41.5692194px}
  to{background-position:var(--bp-p),0% 0%,0% 0%,0% 0%,0% 0%}
}

/* ── NEON GRID ── */
.bp-neon{
  position:absolute;inset:0;
  background:
    radial-gradient(circle at 100% 50%,var(--bg-c1) 0% 2%,var(--bg-c2) 3% 5%,transparent 6%),
    radial-gradient(circle at 0% 50%,var(--bg-c1) 0% 2%,var(--bg-c2) 3% 5%,transparent 6%),
    radial-gradient(ellipse at 50% 0%,var(--bg-c3) 0% 3%,transparent 4%) 10px 10px,
    radial-gradient(circle at 50% 50%,var(--bg-c2) 0% 1%,var(--bg-c1) 2% 3%,var(--bg-c3) 4% 5%,transparent 6%) 20px 20px,
    repeating-linear-gradient(45deg,#111,#111 10px,#161616 10px,#161616 20px);
  background-size:50px 50px,50px 50px,40px 40px,60px 60px,100% 100%;
  animation:bp-neon 15s linear infinite
}
@keyframes bp-neon{
  0%{background-position:0 0,0 0,10px 10px,20px 20px,0 0}
  100%{background-position:50px 50px,-50px -50px,60px 60px,80px 80px,0 0}
}
`

let _injected = false
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return
  _injected = true
  if (document.getElementById('bg-patterns-css')) return
  const s = document.createElement('style')
  s.id = 'bg-patterns-css'
  s.textContent = PATTERN_CSS
  document.head.appendChild(s)
}

export function MatrixBg({ color1 = '#00ff41', color2 = '#007722', color3 = '#002211', speed = 1, preview = false }: BgPatternProps) {
  useEffect(ensureCSS, [])
  const patterns = preview ? 1 : 5
  const count = preview ? 16 : 40
  const cols = Array.from({ length: count })
  return (
    <div className="bp-wrap">
      <div className="bp-mat" style={{ '--bg-c1': color1, '--bg-c2': color2, '--bg-c3': color3 } as React.CSSProperties}>
        {Array.from({ length: patterns }).map((_, p) => (
          <div key={p} className="bp-mat-pat">
            {cols.map((_, i) => (
              <div
                key={i}
                className="bp-mat-col"
                style={{
                  left: `${i * 25}px`,
                  animationDelay: `${MAT_DELAYS[i % MAT_DELAYS.length]}s`,
                  animationDuration: `${MAT_DURS[i % MAT_DURS.length] / speed}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RainBg({ color1 = '#09f', speed = 1 }: BgPatternProps) {
  useEffect(ensureCSS, [])
  return (
    <div className="bp-wrap" style={{ '--bg-c1': color1 } as React.CSSProperties}>
      <div className="bp-rain" style={{ animationDuration: `${150 / speed}s` }} />
      <div className="bp-rain-ov" />
    </div>
  )
}

export function AuroraBg({ color1 = 'rgba(138,43,226,0.8)', color2 = 'rgba(0,191,255,0.7)', color3 = 'rgba(50,205,50,0.6)' }: BgPatternProps) {
  useEffect(ensureCSS, [])
  return (
    <div className="bp-wrap">
      <div className="bp-aurora" style={{ '--bg-c1': color1, '--bg-c2': color2, '--bg-c3': color3 } as React.CSSProperties} />
    </div>
  )
}

export function MidnightSkyBg({ color1 = '#ffffff' }: BgPatternProps) {
  useEffect(ensureCSS, [])
  return (
    <div className="bp-wrap">
      <div className="bp-sky" style={{ '--bg-c1': color1 } as React.CSSProperties}>
        <div className="bp-sky-canvas">
          <div className="bp-sky-stars bp-sky-s1" />
          <div className="bp-sky-stars bp-sky-s2" />
          <div className="bp-sky-stars bp-sky-s3" />
          <div className="bp-sky-meteor bp-sky-m1" />
          <div className="bp-sky-meteor bp-sky-m2" />
          <div className="bp-sky-meteor bp-sky-m3" />
          <div className="bp-sky-moon" />
        </div>
      </div>
    </div>
  )
}

export function RadialBurstBg({ color1 = '#f00', color2 = '#ff0', color3 = '#0f0' }: BgPatternProps) {
  useEffect(ensureCSS, [])
  return (
    <div className="bp-wrap">
      <div className="bp-radial" style={{ '--bg-c1': color1, '--bg-c2': color2, '--bg-c3': color3 } as React.CSSProperties} />
    </div>
  )
}

export function NeonGridBg({ color1 = '#ff00cc', color2 = '#00ffcc', color3 = '#3300ff' }: BgPatternProps) {
  useEffect(ensureCSS, [])
  return (
    <div className="bp-wrap">
      <div className="bp-neon" style={{ '--bg-c1': color1, '--bg-c2': color2, '--bg-c3': color3 } as React.CSSProperties} />
    </div>
  )
}
