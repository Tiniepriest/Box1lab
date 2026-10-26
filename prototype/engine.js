/* ===== Rekenkern Box 1 Rekenlab v3 ===== */
/* ---------- regels 2026 ---------- */
const HUIDIG={naam:"Huidig 2026",vrij:0,brk:[{tot:38883,r:35.75},{tot:78426,r:37.56},{tot:null,r:49.5}],aowk:17.95,
  ahk:100,ak:100,ok:100,iack:100,hra:37.56,ewf:0.35,overig:100,
  zorg:100,huur:100,kgb:100,kot:100,ztAfb:13.7,htAfb:50,kgbAfb:10,kgbKind:2100,
  koppeling:true,eti:0};
const AF={ahk:0,ak:0,ok:0,iack:0,hra:0,ewf:0,overig:0,zorg:0,huur:0,kgb:0,kot:0,aowk:0};
const PRESETS=[
  HUIDIG,
  {...HUIDIG,...AF,naam:"Flat 40% / €18k",vrij:18000,brk:[{tot:null,r:40}]},
  {...HUIDIG,...AF,naam:"35 / 40 / 45%",vrij:18000,brk:[{tot:50000,r:35},{tot:150000,r:40},{tot:null,r:45}]},
  {...HUIDIG,naam:"Huidig zonder huurtoeslag",huur:0},
  {...HUIDIG,naam:"Huidig zonder HRA",hra:0},
  {...HUIDIG,naam:"Zonder HRA en forfait",hra:0,ewf:0},
];
const ahkF=x=>x<29736?3115:Math.max(0,3115-0.06398*(x-29736));
const ahkAow=x=>x<29736?1556:Math.max(0,1556-0.03195*(x-29736));
const akF=x=>x<=11965?0.08324*x:x<=25845?996+0.31009*(x-11965):x<=45592?5300+0.0195*(x-25845):Math.max(0,5685-0.0651*(x-45592));
const okF=x=>x<45000?2067:Math.max(0,2067-0.15*(x-45000));
const iackF=x=>Math.min(3032,Math.max(0,0.1145*(x-6239)));
const AOW1=19800, AOW2=13600, ZORGPREMIE=2000, KINDERBIJSLAG=1400;

function tax(x,p,o){ // o: {werk,aow,iack}
  if(x<=0)return 0;
  let t=0,prev=0;
  p.brk.forEach((b,i)=>{const top=b.tot==null?Infinity:b.tot;const lo=Math.max(prev,p.vrij),hi=Math.min(x,top);
    if(hi>lo){t+=(hi-lo)*b.r/100; if(i===0&&o.aow)t-=(hi-lo)*p.aowk/100;} prev=top;});
  let k=(o.aow?ahkAow(x):ahkF(x))*p.ahk/100;
  if(o.werk&&!o.aow)k+=akF(x)*p.ak/100;
  if(o.aow)k+=okF(x)*p.ok/100;
  if(o.iack)k+=iackF(x)*p.iack/100;
  return Math.max(0,t-k);
}
function marg(x,p){if(x<=p.vrij)return 0;let prev=0;for(const b of p.brk){const top=b.tot==null?Infinity:b.tot;if(x<=top&&x>prev)return b.r;prev=top;}return p.brk[p.brk.length-1].r;}

/* ---------- toeslagen (vereenvoudigde regels 2026) ---------- */
function zorgtoeslag(inc,paar,p){const max=paar?3000:1575;return Math.max(0,max-p.ztAfb/100*Math.max(0,inc-29000))*p.zorg/100;}
function huurtoeslag(inc,huurMnd,paar,ouder,p){
  if(!huurMnd)return 0;const dr=paar?27000:20000;
  const eb=(paar?300:288)+p.htAfb/100*Math.max(0,inc-dr)/12;
  return Math.max(0,0.65*(Math.min(huurMnd,932)-eb))*12*p.huur/100;}
function kgb(inc,kids,paar,p){if(!kids)return 0;
  const max=kids*p.kgbKind+(paar?0:3480);const dr=paar?39141:29736;
  return Math.max(0,max-p.kgbAfb/100*Math.max(0,inc-dr))*p.kgb/100;}
function kot(inc,kosten,p){if(!kosten)return 0;
  const pc=inc<=56413?0.96:Math.max(0.333,0.96-(inc-56413)*0.627/170000);return kosten*pc*p.kot/100;}

/* ---------- huishouden doorrekenen ---------- */
// h: {leden:[{x,soort:'werk'|'uitk'|'aow'|'geen',b}], paar, kids, kids12, huur (mnd), rente, woz, kotKosten}
function eigenWoning(rente,woz,x,p){
  const forf=woz*p.ewf/100, aftrek=p.hra>0?rente:0, net=forf-aftrek, m=marg(x,p);
  const r=Math.min(p.hra,m||p.hra);
  return net<0?-net*r/100:-net*m/100;
}
function netBenefitGross(b,o,cur,p){ // bruto b' zodat netto onder p gelijk is aan netto onder cur
  const target=b-tax(b,cur,o);let lo=b*0.5,hi=b*2.5;
  for(let k=0;k<40;k++){const m=(lo+hi)/2;(m-tax(m,p,o))<target?lo=m:hi=m;}
  return(lo+hi)/2;
}
function calcHH(h,p,cur){
  let uitkKost=0,taxT=0,bruto=0;
  const leden=h.leden.map((l,i)=>({...l}));
  // iack voor minstverdienende werkende ouder
  let iackIdx=-1;if(h.kids12){let best=Infinity;leden.forEach((l,i)=>{if(l.soort==="werk"&&l.x>0&&l.x<best){best=l.x;iackIdx=i;}});
    if(!h.paar)iackIdx=leden[0].soort==="werk"?0:-1; else if(leden.filter(l=>l.soort==="werk"&&l.x>0).length<2)iackIdx=-1;}
  leden.forEach((l,i)=>{
    const o={werk:l.soort==="werk",aow:l.soort==="aow",iack:i===iackIdx};
    let x=l.x;
    if(p!==cur&&p.koppeling&&l.b>0){const nb=netBenefitGross(l.b,o,cur,p);uitkKost+=nb-l.b;x+=nb-l.b;}
    if(p!==cur&&p.eti&&o.werk&&x>0){const mc=marg(x,cur)/100,mn=marg(x,p)/100;x*=Math.pow((1-mn)/(1-mc),p.eti);}
    l.xs=x;bruto+=x;taxT+=tax(x,p,o);
  });
  const hoofd=leden.reduce((a,b)=>b.xs>a.xs?b:a,leden[0]);
  const ew=h.woz?eigenWoning(h.rente,h.woz,hoofd.xs,p):0;
  const inc=bruto;
  const zt=zorgtoeslag(inc,h.paar,p),ht=huurtoeslag(inc,h.huur,h.paar,h.kids>0,p),kg=kgb(inc,h.kids,h.paar,p),ko=kot(inc,h.kotKosten,p);
  const adults=h.paar?2:1;
  const best=bruto-taxT+ew+zt+ht+kg+ko+h.kids*KINDERBIJSLAG-adults*ZORGPREMIE-(h.huur?0:0);
  return {bruto,tax:taxT,ew,zt,ht,kg,ko,uitkKost,best,adults,kids:h.kids,eq:1+0.5*(adults-1)+0.3*h.kids,
    toes:zt+ht+kg+ko,last:taxT-ew-zt-ht-kg-ko};
}

/* ---------- synthetische populatie ---------- */
function ninv(p){const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416],pl=.02425;let q,r;
 if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
 if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
 q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}
const TYPES=[
 {id:"a1",naam:"Alleenstaand",N:2.40e6,paar:false,aow:false,med:36000,sig:0.62,uitk:0.20,koop:0.42,kids:0,pw:0},
 {id:"ao",naam:"Alleenstaand 67+",N:1.05e6,paar:false,aow:true,pmed:8500,psig:0.95,koop:0.45},
 {id:"p0",naam:"Paar zonder kinderen",N:1.50e6,paar:true,aow:false,med:52000,sig:0.58,uitk:0.07,koop:0.72,kids:0,pw:0.80,ps:0.65},
 {id:"po",naam:"Paar 67+",N:0.85e6,paar:true,aow:true,pmed:15000,psig:0.85,koop:0.70},
 {id:"pk",naam:"Paar met kinderen",N:1.95e6,paar:true,aow:false,med:58000,sig:0.55,uitk:0.04,koop:0.78,kids:2,pw:0.86,ps:0.55},
 {id:"ek",naam:"Eenoudergezin",N:0.50e6,paar:false,aow:false,med:32000,sig:0.55,uitk:0.24,koop:0.38,kids:1.5,pw:0},
];
const KAL={inc:1.3,rente:0.55,kot:0.75};
function buildPop(n=200,K=KAL){
  const rf=K.rente||1;const kf=K.kot||1;
  const pop=[];
  TYPES.forEach(T=>{
    for(let i=0;i<n;i++){
      const q=(i+.5)/n, f1=((i*7)%10)/10, f2=((i*3)%7)/6;
      const h={type:T.id,w:T.N/n,paar:T.paar,kids:0,kids12:false,huur:0,rente:0,woz:0,kotKosten:0,leden:[]};
      if(T.aow){
        const pens=Math.exp(Math.log(T.pmed)+T.psig*ninv(q));
        if(T.paar){h.leden=[{x:AOW2+pens*0.65,soort:"aow",b:AOW2},{x:AOW2+pens*0.35,soort:"aow",b:AOW2}];}
        else h.leden=[{x:AOW1+pens,soort:"aow",b:AOW1}];
      } else {
        let main;
        if(q<T.uitk){const x=17500+(q/T.uitk)*9000;main={x,soort:"uitk",b:x};}
        else{const qq=(q-T.uitk)/(1-T.uitk);main={x:Math.exp(Math.log(T.med*(K.inc||1))+T.sig*ninv(qq)),soort:"werk",b:0};}
        h.leden=[main];
        if(T.paar){if(f1<T.pw&&main.soort==="werk")h.leden.push({x:main.x*T.ps*(0.55+0.9*f2),soort:"werk",b:0});
          else h.leden.push({x:0,soort:"geen",b:0});}
        if(T.kids){h.kids=T.id==="ek"?(i%2?1:2):(i%7===0?3:(i%3===0?1:2));h.kids12=i%5<3;}
      }
      const bruto=h.leden.reduce((s,l)=>s+l.x,0);
      const koop=q>1-T.koop;
      if(koop){
        h.woz=Math.min(2.5e6,Math.max(260000,(T.aow?7:4.6)*bruto));
        if(T.aow){h.rente=i%2===0?2600*rf:0;}
        else{const hyp=Math.min(3.6*bruto,700000)*(0.55+0.45*f2);h.rente=0.034*hyp*rf;}
      } else h.huur=Math.min(1300,560+0.009*bruto);
      if(h.kids12){const werkenden=h.leden.filter(l=>l.soort==="werk"&&l.x>0).length;
        const alle=T.paar?werkenden===2:werkenden===1;if(alle&&i%2===0)h.kotKosten=Math.min(h.kids,2)*9500*kf;}
      pop.push(h);
    }
  });
  return pop;
}

/* ---------- macro ---------- */
const OFFICIEEL={ib:165,zorg:6.4,huur:5.6,kgb:3.6,kot:6.6,rente:24};
function baseline(pop){return pop.map(h=>calcHH(h,HUIDIG,HUIDIG));}
function totals(res,pop){const t={tax:0,ew:0,zt:0,ht:0,kg:0,ko:0,uitk:0,rente:0,hh:0,pers:0};
  res.forEach((r,i)=>{const w=pop[i].w;t.tax+=r.tax*w;t.ew+=r.ew*w;t.zt+=r.zt*w;t.ht+=r.ht*w;t.kg+=r.kg*w;t.ko+=r.ko*w;t.uitk+=r.uitkKost*w;
    t.rente+=pop[i].rente*w;t.hh+=w;t.pers+=(r.adults+r.kids)*w;});
  for(const k of ["tax","ew","zt","ht","kg","ko","uitk","rente"])t[k]/=1e9;return t;}

if(typeof module!=="undefined")module.exports={HUIDIG,PRESETS,buildPop,baseline,totals,calcHH,tax,OFFICIEEL};
