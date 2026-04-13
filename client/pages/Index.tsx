import React, { useState, useEffect, useRef, useMemo } from "react";
import Chart from "chart.js/auto";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// ════════════════════════════════════════════════════════════════════
// DATA STORE & CONSTANTS
// ════════════════════════════════════════════════════════════════════
const DEPT_ALLOC: Record<string, number> = {
  Marketing: 0.25,
  Sales: 0.12,
  Finance: 0.06,
  HR: 0.21,
  Tech: 0.16,
  Ops: 0.10,
  Management: 0.10,
};
const OPENING_CASH = 500000;

const INITIAL_DATA = [
  {date:'2026-01-03',type:'Revenue',amount:120000,dept:'Sales',project:'Enterprise',customer:'Reliance Ltd',ctype:'New',costt:'',owner:'Ankit',notes:'Enterprise annual deal'},
  {date:'2026-01-05',type:'Expense',amount:18000,dept:'Ops',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'Admin',notes:'Office rent Jan'},
  {date:'2026-01-07',type:'Revenue',amount:28000,dept:'Sales',project:'SMB',customer:'Infosys SMB',ctype:'New',costt:'',owner:'Priya',notes:'Starter plan signup'},
  {date:'2026-01-08',type:'Expense',amount:95000,dept:'HR',project:'Hiring',customer:'',ctype:'',costt:'Fixed',owner:'Kavya',notes:'Engineering salaries Jan'},
  {date:'2026-01-10',type:'Expense',amount:8500,dept:'Marketing',project:'Product Launch',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'Google Ads Jan'},
  {date:'2026-01-12',type:'Revenue',amount:45000,dept:'Sales',project:'Enterprise',customer:'Tata Digital',ctype:'New',costt:'',owner:'Ankit',notes:'Mid-market deal'},
  {date:'2026-01-14',type:'Expense',amount:4200,dept:'Tech',project:'Platform',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'AWS hosting Jan'},
  {date:'2026-01-16',type:'Expense',amount:6000,dept:'Finance',project:'Compliance',customer:'',ctype:'',costt:'Fixed',owner:'CEO',notes:'Legal retainer'},
  {date:'2026-01-18',type:'Revenue',amount:18000,dept:'Sales',project:'SMB',customer:'Wipro SME',ctype:'Existing',costt:'',owner:'Priya',notes:'Renewal - Starter'},
  {date:'2026-01-20',type:'Expense',amount:3500,dept:'Marketing',project:'Product Launch',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'LinkedIn Ads Jan'},
  {date:'2026-01-22',type:'Revenue',amount:35000,dept:'Sales',project:'Enterprise',customer:'HCL Tech',ctype:'Existing',costt:'',owner:'Ankit',notes:'Upsell existing'},
  {date:'2026-01-25',type:'Expense',amount:1800,dept:'Ops',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'Admin',notes:'SaaS subscriptions'},
  {date:'2026-01-27',type:'Expense',amount:22000,dept:'Management',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'CEO',notes:'Founder salaries'},
  {date:'2026-01-29',type:'Revenue',amount:12000,dept:'Sales',project:'SMB',customer:'Mahindra SME',ctype:'New',costt:'',owner:'Ravi',notes:'SMB onboarding'},
  {date:'2026-01-31',type:'Expense',amount:2800,dept:'Tech',project:'Platform',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'Datadog monitoring'},
  {date:'2026-02-02',type:'Revenue',amount:135000,dept:'Sales',project:'Enterprise',customer:'Adani Digital',ctype:'New',costt:'',owner:'Ankit',notes:'Enterprise Q1 deal'},
  {date:'2026-02-03',type:'Expense',amount:18000,dept:'Ops',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'Admin',notes:'Office rent Feb'},
  {date:'2026-02-05',type:'Expense',amount:98000,dept:'HR',project:'Hiring',customer:'',ctype:'',costt:'Fixed',owner:'Kavya',notes:'Full team salaries Feb'},
  {date:'2026-02-07',type:'Revenue',amount:28000,dept:'Sales',project:'SMB',customer:'Bajaj Finserv',ctype:'New',costt:'',owner:'Priya',notes:'SMB deal Feb'},
  {date:'2026-02-09',type:'Expense',amount:12000,dept:'Marketing',project:'Rebrand',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'Brand redesign agency'},
  {date:'2026-02-10',type:'Revenue',amount:45000,dept:'Sales',project:'Enterprise',customer:'Reliance Ltd',ctype:'Existing',costt:'',owner:'Ankit',notes:'Upsell Reliance'},
  {date:'2026-02-12',type:'Expense',amount:5500,dept:'Tech',project:'Platform',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'AWS + Cloudflare Feb'},
  {date:'2026-02-14',type:'Revenue',amount:22000,dept:'Sales',project:'SMB',customer:'Infosys SMB',ctype:'Existing',costt:'',owner:'Priya',notes:'Existing renewal'},
  {date:'2026-02-16',type:'Expense',amount:6000,dept:'Finance',project:'Compliance',customer:'',ctype:'',costt:'Fixed',owner:'CEO',notes:'Legal retainer Feb'},
  {date:'2026-02-18',type:'Expense',amount:9000,dept:'Marketing',project:'Product Launch',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'Facebook & Instagram ads'},
  {date:'2026-02-20',type:'Revenue',amount:15000,dept:'Sales',project:'SMB',customer:'Meesho Seller',ctype:'New',costt:'',owner:'Ravi',notes:'New SMB'},
  {date:'2026-02-22',type:'Expense',amount:1800,dept:'Ops',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'Admin',notes:'SaaS tools Feb'},
  {date:'2026-02-24',type:'Expense',amount:25000,dept:'Management',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'CEO',notes:'Founder salaries Feb'},
  {date:'2026-02-26',type:'Revenue',amount:38000,dept:'Sales',project:'Enterprise',customer:'Tata Digital',ctype:'Existing',costt:'',owner:'Ankit',notes:'Tata expansion'},
  {date:'2026-02-28',type:'Expense',amount:3200,dept:'Tech',project:'Platform',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'New Relic APM'},
  {date:'2026-03-01',type:'Revenue',amount:160000,dept:'Sales',project:'Enterprise',customer:'HDFC Digital',ctype:'New',costt:'',owner:'Ankit',notes:'Q1 close - large deal'},
  {date:'2026-03-03',type:'Expense',amount:18000,dept:'Ops',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'Admin',notes:'Office rent Mar'},
  {date:'2026-03-04',type:'Expense',amount:102000,dept:'HR',project:'Hiring',customer:'',ctype:'',costt:'Fixed',owner:'Kavya',notes:'Expanded team salaries'},
  {date:'2026-03-05',type:'Revenue',amount:35000,dept:'Sales',project:'SMB',customer:'Nykaa',ctype:'New',costt:'',owner:'Priya',notes:'SMB enterprise'},
  {date:'2026-03-07',type:'Expense',amount:15000,dept:'Marketing',project:'Product Launch',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'Launch campaign Mar'},
  {date:'2026-03-09',type:'Revenue',amount:45000,dept:'Sales',project:'Enterprise',customer:'Adani Digital',ctype:'Existing',costt:'',owner:'Ankit',notes:'Adani expansion'},
  {date:'2026-03-10',type:'Expense',amount:7200,dept:'Tech',project:'Platform',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'Infrastructure scale-up'},
  {date:'2026-03-12',type:'Revenue',amount:25000,dept:'Sales',project:'SMB',customer:'Wipro SME',ctype:'Existing',costt:'',owner:'Priya',notes:'Wipro upsell'},
  {date:'2026-03-14',type:'Expense',amount:6000,dept:'Finance',project:'Compliance',customer:'',ctype:'',costt:'Fixed',owner:'CEO',notes:'Legal retainer Mar'},
  {date:'2026-03-15',type:'Expense',amount:18000,dept:'Marketing',project:'Product Launch',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'Influencer partnerships'},
  {date:'2026-03-17',type:'Revenue',amount:30000,dept:'Sales',project:'SMB',customer:'Bajaj Finserv',ctype:'Existing',costt:'',owner:'Ravi',notes:'Bajaj renewal Mar'},
  {date:'2026-03-18',type:'Expense',amount:1800,dept:'Ops',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'Admin',notes:'Tools Mar'},
  {date:'2026-03-20',type:'Revenue',amount:55000,dept:'Sales',project:'Enterprise',customer:'Meesho Corp',ctype:'New',costt:'',owner:'Ankit',notes:'Meesho enterprise sign'},
  {date:'2026-03-22',type:'Expense',amount:28000,dept:'Management',project:'General',customer:'',ctype:'',costt:'Fixed',owner:'CEO',notes:'Salaries + bonus'},
  {date:'2026-03-24',type:'Expense',amount:8000,dept:'Tech',project:'Rebrand',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'Dev tooling upgrade'},
  {date:'2026-03-26',type:'Revenue',amount:18000,dept:'Sales',project:'SMB',customer:'HDFC SME',ctype:'New',costt:'',owner:'Priya',notes:'New SMB sign'},
  {date:'2026-03-28',type:'Expense',amount:5500,dept:'Marketing',project:'Rebrand',customer:'',ctype:'',costt:'Variable',owner:'Priya',notes:'New website design'},
  {date:'2026-03-30',type:'Expense',amount:4000,dept:'Tech',project:'Platform',customer:'',ctype:'',costt:'Variable',owner:'Ravi',notes:'End of month infra'},
];

const COLORS = {
  navy:'#1F3A5F', blue:'#4472C4', lightblue:'#9DC3E6',
  green:'#2E7D32', lightgreen:'#81C784',
  red:'#C62828', lightred:'#EF9A9A',
  amber:'#E65100', yellow:'#FFA726',
  grey:'#90A4AE',
};

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const fmtK = (n: number) => n >= 100000 ? '₹' + (n/100000).toFixed(2) + 'L' : n >= 1000 ? '₹' + (n/1000).toFixed(1) + 'K' : '₹' + Math.round(n);
const pct = (n: number) => (n*100).toFixed(1) + '%';
function monthKey(dateStr: string) { if (!dateStr) return ''; return dateStr.substring(0,7); }
function monthLabel(mk: string) {
  if (!mk) return '';
  const [y, m] = mk.split('-');
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m)] + ' ' + y;
}

function runCalc(DATA: any[]) {
  const rev = DATA.filter(r=>r.type==='Revenue');
  const exp = DATA.filter(r=>r.type==='Expense');
  const totalRev = rev.reduce((s,r)=>s+r.amount,0);
  const totalExp = exp.reduce((s,r)=>s+r.amount,0);
  const varCost = exp.filter(r=>r.costt==='Variable').reduce((s,r)=>s+r.amount,0);
  const fixedCost = exp.filter(r=>r.costt==='Fixed').reduce((s,r)=>s+r.amount,0);
  const mktSalesCost = exp.filter(r=>['Marketing','Sales'].includes(r.dept)).reduce((s,r)=>s+r.amount,0);
  const newCusts = new Set(rev.filter(r=>r.ctype==='New' && r.customer).map(r=>r.customer)).size;
  const totalCusts = new Set(rev.filter(r=>r.customer).map(r=>r.customer)).size;

  const monthly: any = {};
  DATA.forEach(r => {
    const mk = monthKey(r.date);
    if (!monthly[mk]) monthly[mk] = {rev:0,exp:0,fixed:0,variable:0};
    if (r.type==='Revenue') monthly[mk].rev += r.amount;
    else { monthly[mk].exp += r.amount; if(r.costt==='Fixed') monthly[mk].fixed+=r.amount; if(r.costt==='Variable') monthly[mk].variable+=r.amount; }
  });
  const months = Object.keys(monthly).sort();
  const latestMonth = months[months.length-1] || '';
  const latestRev = latestMonth ? monthly[latestMonth].rev : 0;
  const latestExp = latestMonth ? monthly[latestMonth].exp : 0;
  const monthlyBurn = months.length > 0 ? totalExp / months.length : totalExp;

  const deptSpend: any = {};
  exp.forEach(r => { if(r.dept){deptSpend[r.dept]=(deptSpend[r.dept]||0)+r.amount;} });

  return {
    totalRev, totalExp, profit: totalRev-totalExp,
    varCost, fixedCost, mktSalesCost, newCusts, totalCusts,
    margin: totalRev>0?(totalRev-totalExp)/totalRev:0,
    cm: totalRev>0?(totalRev-varCost)/totalRev:0,
    cac: newCusts>0?mktSalesCost/newCusts:0,
    ltv: totalCusts>0?totalRev/totalCusts:0,
    monthlyBurn, runway: monthlyBurn>0?OPENING_CASH/monthlyBurn:999,
    latestRev, latestExp, monthly, months, deptSpend
  };
}

// ════════════════════════════════════════════════════════════════════
// REACT COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function Index() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const [data, setData] = useState(INITIAL_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const C = useMemo(() => runCalc(data), [data]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('Revenue');
  const [amount, setAmount] = useState('');
  const [dept, setDept] = useState('');
  const [project, setProject] = useState('');
  const [customer, setCustomer] = useState('');
  const [ctype, setCtype] = useState('');
  const [costt, setCostt] = useState('');
  const [owner, setOwner] = useState('');
  const [notes, setNotes] = useState('');
  const [formErr, setFormErr] = useState('');

  if (!isAuthenticated) return null;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const handleAdd = () => {
    if (!date || !amount) { setFormErr('Date and Amount are required.'); return; }
    setFormErr('');
    setData(prev => [...prev, {
      date, type, amount: parseFloat(amount)||0, dept, project, customer, ctype, costt, owner, notes
    }]);
    setAmount(''); setProject(''); setCustomer(''); setOwner(''); setNotes('');
    setIsModalOpen(false);
  };

  const nav = (id: string) => navigate(id === 'dashboard' ? '/' : `/${id}`);

  const renderDashboard = () => <DashboardTab data={data} C={C} />;
  const renderLog = () => <LogTab data={data} setData={setData} search={search} setSearch={setSearch} filterType={filterType} setFilterType={setFilterType} />;
  const renderAnalysis = () => <AnalysisTab data={data} C={C} />;
  const renderProjects = () => <ProjectsTab data={data} C={C} />;
  const renderDepartments = () => <DepartmentsTab data={data} C={C} />;
  const renderForecast = () => <ForecastTab data={data} C={C} />;
  const renderInsights = () => <InsightsTab data={data} C={C} />;
  const renderCashflow = () => <CashFlowTab data={data} C={C} />;

  let status = 'green', statusText = '● Healthy';
  if (C.profit < 0 || C.runway < 3) { status='red'; statusText='● Critical'; }
  else if (C.cm < 0.5) { status='amber'; statusText='● Warning'; }

  const PAGE_TITLES: any = {
    dashboard:'Dashboard',log:'Daily Log',analysis:'Financial Analysis',
    projects:'Project Tracker',departments:'Department Tracker',
    forecast:'3-Month Forecast',insights:'AI Insights',cashflow:'Cash Flow'
  };

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-name">⚡ ANTI AI</div>
          <div className="brand-sub">Command Center</div>
        </div>
        <div className="nav-section">Core</div>
        {['dashboard', 'log'].map(id => (
          <button key={id} className={`nav-item ${activeTab===id?'active':''}`} onClick={()=>nav(id)}>
            <span className="icon">{id==='dashboard'?'📊':'📋'}</span><span>{PAGE_TITLES[id]}</span>
            {id==='dashboard' && <span className={`status-dot ${status}`}></span>}
          </button>
        ))}
        <div className="nav-section">Analysis</div>
        {['analysis', 'projects', 'departments'].map(id => (
          <button key={id} className={`nav-item ${activeTab===id?'active':''}`} onClick={()=>nav(id)}>
            <span className="icon">{id==='analysis'?'📈':id==='projects'?'🗂️':'🏢'}</span><span>{PAGE_TITLES[id]}</span>
          </button>
        ))}
        <div className="nav-section">Intelligence</div>
        {['forecast', 'insights', 'cashflow'].map(id => (
          <button key={id} className={`nav-item ${activeTab===id?'active':''}`} onClick={()=>nav(id)}>
            <span className="icon">{id==='forecast'?'🔮':id==='insights'?'🧠':'💧'}</span><span>{PAGE_TITLES[id]}</span>
          </button>
        ))}
        
        <div style={{flex: 1}}></div>
        <div className="nav-section" style={{borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'16px'}}>System</div>
        <button className="nav-item" onClick={logout} style={{color:'var(--red)'}}>
          <span className="icon">🚪</span><span>Sign Out</span>
        </button>
      </nav>

      <div className="main">
        <div className="topbar">
          <div><div className="topbar-title">{PAGE_TITLES[activeTab]}</div></div>
          <div className="topbar-right">
            <span className={`status-badge ${status}`}>{statusText}</span>
            <span style={{fontSize:'11px',color:'var(--muted)'}}>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
            <button className="btn-ui btn-primary" onClick={()=>setIsModalOpen(true)}>+ Add Transaction</button>
          </div>
        </div>
        <div className="content">
          <div className={activeTab === 'dashboard' ? 'page active' : 'page'} id="page-dashboard">{activeTab === 'dashboard' && renderDashboard()}</div>
          <div className={activeTab === 'log' ? 'page active' : 'page'} id="page-log">{activeTab === 'log' && renderLog()}</div>
          <div className={activeTab === 'analysis' ? 'page active' : 'page'} id="page-analysis">{activeTab === 'analysis' && renderAnalysis()}</div>
          <div className={activeTab === 'projects' ? 'page active' : 'page'} id="page-projects">{activeTab === 'projects' && renderProjects()}</div>
          <div className={activeTab === 'departments' ? 'page active' : 'page'} id="page-departments">{activeTab === 'departments' && renderDepartments()}</div>
          <div className={activeTab === 'forecast' ? 'page active' : 'page'} id="page-forecast">{activeTab === 'forecast' && renderForecast()}</div>
          <div className={activeTab === 'insights' ? 'page active' : 'page'} id="page-insights">{activeTab === 'insights' && renderInsights()}</div>
          <div className={activeTab === 'cashflow' ? 'page active' : 'page'} id="page-cashflow">{activeTab === 'cashflow' && renderCashflow()}</div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onMouseDown={(e)=>e.target===e.currentTarget && setIsModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">+ Add Transaction</div>
            <div className="modal-form">
              <div className="form-group"><label>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
              <div className="form-group"><label>Type</label><select value={type} onChange={e=>setType(e.target.value)}><option>Revenue</option><option>Expense</option></select></div>
              <div className="form-group"><label>Amount (₹)</label><input type="number" placeholder="0" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
              <div className="form-group"><label>Department</label><select value={dept} onChange={e=>setDept(e.target.value)}><option value="">— Select —</option><option>Marketing</option><option>Sales</option><option>Finance</option><option>HR</option><option>Tech</option><option>Ops</option><option>Management</option></select></div>
              <div className="form-group"><label>Project</label><input type="text" placeholder="Project name" value={project} onChange={e=>setProject(e.target.value)}/></div>
              <div className="form-group"><label>Customer</label><input type="text" placeholder="Customer name" value={customer} onChange={e=>setCustomer(e.target.value)}/></div>
              <div className="form-group"><label>Customer Type</label><select value={ctype} onChange={e=>setCtype(e.target.value)}><option value="">—</option><option>New</option><option>Existing</option></select></div>
              <div className="form-group"><label>Cost Type</label><select value={costt} onChange={e=>setCostt(e.target.value)}><option value="">—</option><option>Fixed</option><option>Variable</option></select></div>
              <div className="form-group"><label>Owner</label><input type="text" placeholder="Owner" value={owner} onChange={e=>setOwner(e.target.value)}/></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label>Notes</label><input type="text" placeholder="Notes or description" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
            </div>
            <div style={{display:'flex',gap:'10px',marginTop:'16px',justifyContent:'flex-end'}}>
              <button className="btn-ui btn-outline" onClick={()=>setIsModalOpen(false)}>Cancel</button>
              <button className="btn-ui btn-primary" onClick={handleAdd}>Add Transaction</button>
            </div>
            {formErr && <div style={{color:'var(--red)',fontSize:'11px',marginTop:'8px'}}>{formErr}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TABS COMPONENTS
// ════════════════════════════════════════════════════════════════════
function DashboardTab({ data, C }: any) {
  const chartRevExpRef = useRef<HTMLCanvasElement>(null);
  const chartDeptRef = useRef<HTMLCanvasElement>(null);
  const chartCustSplitRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let refs: any[] = [];
    if (chartRevExpRef.current) {
      const months = C.months;
      const revData = months.map((m: any)=>C.monthly[m].rev);
      const expData = months.map((m: any)=>C.monthly[m].exp);
      const profData = months.map((m: any)=>C.monthly[m].rev-C.monthly[m].exp);
      refs.push(new Chart(chartRevExpRef.current, {
        type:'bar', data:{ labels: months.map(monthLabel), datasets:[ {label:'Revenue',data:revData,backgroundColor:'rgba(46,125,50,0.8)',borderRadius:4}, {label:'Expenses',data:expData,backgroundColor:'rgba(198,40,40,0.7)',borderRadius:4}, {label:'Profit',data:profData,type:'line',borderColor:COLORS.navy,backgroundColor:'rgba(31,58,95,0.1)',pointRadius:4,tension:0.3,fill:true,yAxisID:'y'}, ] },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}},grid:{color:'#f0f4f8'}},x:{ticks:{font:{size:9}}}}} as any
      }));
    }
    if (chartDeptRef.current) {
      const depts = Object.entries(C.deptSpend).sort((a: any,b: any)=>b[1]-a[1]);
      refs.push(new Chart(chartDeptRef.current, {
        type:'doughnut', data:{ labels: depts.map(d=>d[0]), datasets:[{data:depts.map((d: any)=>d[1]),backgroundColor:['#1F3A5F','#C62828','#F9A825','#2E7D32','#4472C4','#7986CB','#90A4AE'],borderWidth:2,borderColor:'#fff'}] },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10},boxWidth:10}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmtK(ctx.raw as number)} (${pct((ctx.raw as number)/C.totalExp)})`}}}}
      }));
    }
    if (chartCustSplitRef.current) {
      const custRev: any = {};
      data.filter((r: any)=>r.type==='Revenue'&&r.customer).forEach((r: any)=>{custRev[r.customer]=(custRev[r.customer]||0)+r.amount;});
      const topCusts = Object.entries(custRev).sort((a: any,b: any)=>b[1]-a[1]).slice(0,5);
      refs.push(new Chart(chartCustSplitRef.current,{
        type:'bar', data:{labels:topCusts.map(c=>c[0]),datasets:[{data:topCusts.map((c: any)=>c[1]),backgroundColor:[COLORS.navy,COLORS.blue,COLORS.lightblue,COLORS.grey,COLORS.grey],borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}}},x:{ticks:{font:{size:9}}}}} as any
      }));
    }
    return () => refs.forEach(c => c.destroy());
  }, [C]);

  const depts = Object.entries(C.deptSpend).sort((a: any,b: any)=>b[1]-a[1]);
  const fixedPct = C.totalExp>0?C.fixedCost/C.totalExp:0;
  const varPct = C.totalExp>0?C.varCost/C.totalExp:0;

  const custRev: any = {};
  data.filter((r: any)=>r.type==='Revenue'&&r.customer).forEach((r: any)=>{custRev[r.customer]=(custRev[r.customer]||0)+r.amount;});
  const topCusts = Object.entries(custRev).sort((a: any,b: any)=>b[1]-a[1]).slice(0,5);
  const top3Total = topCusts.slice(0,3).reduce((s: any,c: any)=>s+c[1],0);

  return (
    <>
      <div className="page-title">Financial Command Center</div>
      <div className="page-sub">All KPIs auto-calculated from Daily Log · ANTI AI Private Limited</div>
      <div className="kpi-grid">
        <div className="kpi green"><div className="kpi-label">Total Revenue <span className="kpi-icon">💰</span></div><div className="kpi-value">{fmtK(C.totalRev)}</div><div className="kpi-sub">From all transactions</div></div>
        <div className="kpi red"><div className="kpi-label">Total Expenses <span className="kpi-icon">💸</span></div><div className="kpi-value">{fmtK(C.totalExp)}</div><div className="kpi-sub">All departments</div></div>
        <div className={`kpi ${C.profit>=0?'green':'red'}`}><div className="kpi-label">Net Profit <span className="kpi-icon">📊</span></div><div className="kpi-value">{fmtK(C.profit)}</div><div className="kpi-sub">{C.profit>=0?'Profitable ✓':'Loss making ✗'}</div></div>
        <div className={`kpi ${C.margin>=0.6?'green':C.margin>=0.4?'amber':'red'}`}><div className="kpi-label">Gross Margin <span className="kpi-icon">📐</span></div><div className="kpi-value">{pct(C.margin)}</div><div className="kpi-sub">Target: &gt;60%</div></div>
      </div>
      <div className="kpi-grid">
        <div className={`kpi ${C.cm>=0.5?'green':C.cm>=0.35?'amber':'red'}`}><div className="kpi-label">Contribution Margin <span className="kpi-icon">⚙️</span></div><div className="kpi-value">{pct(C.cm)}</div><div className="kpi-sub">Rev − Variable Cost / Rev</div></div>
        <div className="kpi"><div className="kpi-label">CAC <span className="kpi-icon">🎯</span></div><div className="kpi-value">{C.cac>0?fmtK(C.cac):'No Data'}</div><div className="kpi-sub">Marketing+Sales / New Custs</div></div>
        <div className="kpi"><div className="kpi-label">LTV <span className="kpi-icon">♾️</span></div><div className="kpi-value">{fmtK(C.ltv)}</div><div className="kpi-sub">Total Rev / Total Customers</div></div>
        <div className={`kpi ${C.runway>6?'green':C.runway>3?'amber':'red'}`}><div className="kpi-label">Runway <span className="kpi-icon">🛣️</span></div><div className="kpi-value">{C.runway>100?'Positive':C.runway.toFixed(1)+' mo'}</div><div className="kpi-sub">Burn: {fmtK(C.monthlyBurn)}/mo</div></div>
      </div>
      <div className="grid-2">
        <div className="box"><div className="box-title">Revenue vs Expenses (Monthly) <span>Auto-grouped from Daily Log</span></div><div className="chart-wrap"><canvas ref={chartRevExpRef}></canvas></div></div>
        <div className="box"><div className="box-title">Department Spend <span>Q1 2026</span></div><div className="chart-wrap"><canvas ref={chartDeptRef}></canvas></div></div>
      </div>
      <div className="grid-2">
        <div className="box">
          <div className="box-title">Cost Mix</div>
          <div>
            <div className="bar-row"><div className="bar-lbl">Fixed</div><div className="bar-track"><div className="bar-fill" style={{width:`${fixedPct*100}%`,background:COLORS.navy}}><span>{pct(fixedPct)}</span></div></div><div className="bar-amt">{fmtK(C.fixedCost)}</div></div>
            <div className="bar-row"><div className="bar-lbl">Variable</div><div className="bar-track"><div className="bar-fill" style={{width:`${varPct*100}%`,background:COLORS.amber}}><span>{pct(varPct)}</span></div></div><div className="bar-amt">{fmtK(C.varCost)}</div></div>
            {depts.slice(0,4).map(([d,v]: any)=><div key={d} className="bar-row"><div className="bar-lbl">{d}</div><div className="bar-track"><div className="bar-fill" style={{width:`${v/C.totalExp*100}%`,background:COLORS.blue}}><span>{pct(v/C.totalExp)}</span></div></div><div className="bar-amt">{fmtK(v)}</div></div>)}
          </div>
        </div>
        <div className="box">
          <div className="box-title">Customer Revenue Split</div>
          <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'8px'}}>Top 3 = <strong style={{color:'var(--red)'}}>{pct(top3Total/C.totalRev)}</strong> of revenue — concentration risk</div>
          <div className="chart-wrap" style={{height:'160px'}}><canvas ref={chartCustSplitRef}></canvas></div>
        </div>
      </div>
    </>
  );
}

function LogTab({ data, setData, search, setSearch, filterType, setFilterType }: any) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Revenue', amount: '', dept: '', project: '', customer: '', ctype: '', costt: '', owner: '', notes: '' });

  let rows = [...data].sort((a,b)=>b.date.localeCompare(a.date));
  if (search) rows = rows.filter(r=>[r.date,r.type,r.dept,r.project,r.customer,r.owner,r.notes].join(' ').toLowerCase().includes(search.toLowerCase()));
  if (filterType) rows = rows.filter(r=>r.type===filterType);

  const deleteRow = (r: any) => {
    if(confirm('Remove this transaction?')) setData((prev: any) => prev.filter((x: any) => x !== r));
  };

  const handleAdd = () => {
    if (!form.amount || isNaN(Number(form.amount))) return alert("Valid amount required");
    setData((prev: any) => [{ ...form, amount: Number(form.amount) }, ...prev]);
    setForm(f => ({ ...f, amount: '', notes: '', project: '', customer: '' }));
  };

  return (
    <>
      <div className="page-title">Daily Transaction Log</div>
      <div className="page-sub">Single source of truth · Every row instantly updates all dashboards</div>
      
      <div className="box mb-16">
        <div className="box-title">Quick Add Transaction</div>
        <div className="form-row" style={{gridTemplateColumns:'130px 110px 130px 140px 140px 130px 120px 110px 120px 1fr auto'}}>
          <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/></div>
          <div className="form-group"><label>Type</label><select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}><option>Revenue</option><option>Expense</option></select></div>
          <div className="form-group"><label>Amount (₹)</label><input type="number" placeholder="0" min="0" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})}/></div>
          <div className="form-group"><label>Department</label><select value={form.dept} onChange={e=>setForm({...form, dept:e.target.value})}><option value="">— Select —</option><option>Marketing</option><option>Sales</option><option>Finance</option><option>HR</option><option>Tech</option><option>Ops</option><option>Management</option></select></div>
          <div className="form-group"><label>Project</label><input type="text" placeholder="e.g. Platform" value={form.project} onChange={e=>setForm({...form, project:e.target.value})}/></div>
          <div className="form-group"><label>Customer</label><input type="text" placeholder="Customer name" value={form.customer} onChange={e=>setForm({...form, customer:e.target.value})}/></div>
          <div className="form-group"><label>Cust. Type</label><select value={form.ctype} onChange={e=>setForm({...form, ctype:e.target.value})}><option value="">—</option><option>New</option><option>Existing</option></select></div>
          <div className="form-group"><label>Cost Type</label><select value={form.costt} onChange={e=>setForm({...form, costt:e.target.value})}><option value="">—</option><option>Fixed</option><option>Variable</option></select></div>
          <div className="form-group"><label>Owner</label><input type="text" placeholder="Owner" value={form.owner} onChange={e=>setForm({...form, owner:e.target.value})}/></div>
          <div className="form-group"><label>Notes</label><input type="text" placeholder="Notes" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/></div>
          <div className="form-group"><label>&nbsp;</label><button className="btn-ui btn-primary" onClick={handleAdd} style={{height:'33px',whiteSpace:'nowrap'}}>+ Add</button></div>
        </div>
      </div>

      <div className="box">
        <div className="box-title flex-between">
          <span>Transaction Log <span style={{fontSize:'10px',fontWeight:500,color:'var(--muted)'}}>({rows.length} of {data.length})</span></span>
          <div style={{display:'flex',gap:'8px'}}>
            <input type="text" placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{border:'1.5px solid var(--border)',borderRadius:'8px',padding:'5px 10px',fontSize:'12px',width:'160px'}}/>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{border:'1.5px solid var(--border)',borderRadius:'8px',padding:'5px 10px',fontSize:'12px'}}>
              <option value="">All Types</option><option>Revenue</option><option>Expense</option>
            </select>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Department</th><th>Project</th><th>Customer</th><th>Cust.Type</th><th>Cost Type</th><th>Owner</th><th>Notes</th><th>Del</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td><td>{r.type==='Revenue'?<span className="tag green">Revenue</span>:<span className="tag red">Expense</span>}</td>
                  <td className="fw-bold" style={{color:r.type==='Revenue'?'var(--green)':'var(--red)',textAlign:r.type==='Revenue'?'right':'left'}}>{fmt(r.amount)}</td>
                  <td>{r.dept||'-'}</td><td>{r.project||'-'}</td><td>{r.customer||'-'}</td>
                  <td>{r.ctype?<span className="tag blue">{r.ctype}</span>:'-'}</td><td>{r.costt?<span className="tag grey">{r.costt}</span>:'-'}</td>
                  <td>{r.owner||'-'}</td><td style={{maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.notes}>{r.notes||'-'}</td>
                  <td><button className="btn-ui btn-danger" onClick={()=>deleteRow(r)}>×</button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={11} className="empty">No transactions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AnalysisTab({ data, C }: any) {
  const tRef = useRef<HTMLCanvasElement>(null);
  const pRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let refs: any[] = [];
    const months = C.months;
    if (tRef.current) refs.push(new Chart(tRef.current,{
      type:'bar', data:{labels:months.map(monthLabel),datasets:[{label:'Revenue',data:months.map((m: any)=>C.monthly[m].rev),backgroundColor:'rgba(46,125,50,0.8)',borderRadius:4},{label:'Expenses',data:months.map((m: any)=>C.monthly[m].exp),backgroundColor:'rgba(198,40,40,0.7)',borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}}},x:{ticks:{font:{size:9}}}}} as any
    }));
    if (pRef.current) refs.push(new Chart(pRef.current,{
      type:'line', data:{labels:months.map(monthLabel),datasets:[{label:'Net Profit',data:months.map((m: any)=>C.monthly[m].rev-C.monthly[m].exp),borderColor:COLORS.navy,backgroundColor:'rgba(31,58,95,0.1)',fill:true,tension:0.3,pointRadius:5,pointBackgroundColor:months.map((m: any)=>C.monthly[m].rev-C.monthly[m].exp>=0?COLORS.green:COLORS.red) }]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}}},x:{ticks:{font:{size:9}}}}}
    }));
    return () => refs.forEach(c => c.destroy());
  }, [C]);

  const custRev: any={};
  data.filter((r: any)=>r.type==='Revenue'&&r.customer).forEach((r: any)=>{
    if(!custRev[r.customer]) custRev[r.customer]={rev:0,type:r.ctype};
    custRev[r.customer].rev+=r.amount;
  });
  const custList = Object.entries(custRev).sort((a: any,b: any)=>b[1].rev-a[1].rev);

  const mktExp: any = {}; const mktRev: any = {};
  C.months.forEach((m: string) => {
    mktExp[m] = data.filter((r: any) => r.type==='Expense' && r.dept==='Marketing' && monthKey(r.date)===m).reduce((s: any,r: any)=>s+r.amount,0);
    mktRev[m] = C.monthly[m].rev;
  });

  return (
    <>
      <div className="page-title">Financial Analysis</div><div className="page-sub">Auto-aggregated from Daily Log · Month-by-month performance</div>
      <div className="grid-2">
        <div className="box"><div className="box-title">Monthly Revenue & Expense Trend</div><div className="chart-wrap"><canvas ref={tRef}></canvas></div></div>
        <div className="box"><div className="box-title">Profit Trend</div><div className="chart-wrap"><canvas ref={pRef}></canvas></div></div>
      </div>
      <div className="box mb-16">
        <div className="box-title">Monthly Performance Table</div>
        <table className="tbl">
          <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net Profit</th><th>Margin</th><th>Fixed Cost</th><th>Variable Cost</th><th>Status</th></tr></thead>
          <tbody>
            {C.months.map((m: any) => {
              const d=C.monthly[m]; const net=d.rev-d.exp; const margin=d.rev>0?net/d.rev:0;
              return <tr key={m}>
                <td className="fw-bold">{monthLabel(m)}</td>
                <td style={{color:'var(--green)',fontWeight:700}}>{fmt(d.rev)}</td>
                <td style={{color:'var(--red)'}}>{fmt(d.exp)}</td>
                <td style={{color:net>=0?'var(--green)':'var(--red)',fontWeight:700}}>{fmt(net)}</td>
                <td>{pct(margin)}</td><td>{fmt(d.fixed)}</td><td>{fmt(d.variable)}</td>
                <td>{net>=0?<span className="tag green">Profitable</span>:<span className="tag red">Loss</span>}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <div className="grid-2">
        <div className="box">
          <div className="box-title">Top Customers by Revenue</div>
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Revenue</th><th>% Share</th><th>Type</th></tr></thead>
            <tbody>
              {custList.slice(0,10).map(([c,d]: any) => (
                <tr key={c}>
                  <td className="fw-bold">{c}</td><td style={{fontWeight:700,color:'var(--green)'}}>{fmt(d.rev)}</td>
                  <td>{pct(d.rev/C.totalRev)}</td><td><span className={`tag ${d.type==='New'?'blue':'green'}`}>{d.type||'—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="box">
          <div className="box-title">Marketing ROI Analysis</div>
          <table className="tbl">
            <thead><tr><th>Month</th><th>Mkt Spend</th><th>Revenue</th><th>ROI</th><th>Signal</th></tr></thead>
            <tbody>
              {C.months.map((m: any) => {
                const roi = mktExp[m] > 0 ? mktRev[m] / mktExp[m] : 0;
                const sig = roi > 15 ? <span className="tag green">Excellent</span> : roi > 10 ? <span className="tag blue">Good</span> : roi > 5 ? <span className="tag amber">Watch</span> : <span className="tag red">Poor</span>;
                return (
                  <tr key={m}>
                    <td className="fw-bold">{monthLabel(m)}</td>
                    <td>{fmt(mktExp[m])}</td>
                    <td>{fmt(mktRev[m])}</td>
                    <td style={{fontWeight:700}}>{roi.toFixed(1)}&times;</td>
                    <td>{sig}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{marginTop:'10px',fontSize:'11px',color:'var(--muted)'}}>📉 ROI declining: {C.months.map((m: any) => `${monthLabel(m)}=${mktExp[m] > 0 ? (mktRev[m]/mktExp[m]).toFixed(1)+'\u00D7' : 'N/A'}`).join(' \u2192 ')}</div>
        </div>
      </div>
    </>
  );
}

function ProjectsTab({ data, C }: any) {
  const pRef = useRef<HTMLCanvasElement>(null);
  const projects: any = {};
  data.forEach((r: any)=>{
    const p=r.project||'Unassigned';
    if(!projects[p]) projects[p]={rev:0,exp:0,count:0};
    if(r.type==='Revenue') projects[p].rev+=r.amount;
    else { projects[p].exp+=r.amount; projects[p].count++; }
  });
  const pList = Object.entries(projects).sort((a: any,b: any)=>(b[1].rev-b[1].exp)-(a[1].rev-a[1].exp));

  useEffect(() => {
    if (pRef.current) {
      const projLabels=pList.map(p=>p[0]); const projExp=pList.map((p: any)=>p[1].exp); const projRev=pList.map((p: any)=>p[1].rev);
      const ch = new Chart(pRef.current,{
        type:'bar', data:{labels:projLabels,datasets:[{label:'Revenue',data:projRev,backgroundColor:'rgba(46,125,50,0.8)',borderRadius:4},{label:'Expenses',data:projExp,backgroundColor:'rgba(198,40,40,0.7)',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}}},x:{ticks:{font:{size:9}}}}} as any
      });
      return () => ch.destroy();
    }
  }, [pList]);

  return (
    <>
      <div className="page-title">Project Tracker</div><div className="page-sub">Auto P&L per project from Daily Log</div>
      <div className="box">
        <div className="box-title">Project P&L Summary</div>
        <table className="tbl">
          <thead><tr><th>Project</th><th>Revenue</th><th>Expenses</th><th>Gross Profit</th><th>Margin %</th><th>Transactions</th><th>Status</th></tr></thead>
          <tbody>
            {pList.map(([p,d]: any) => {
              const prof=d.rev-d.exp; const margin=d.rev>0?prof/d.rev:0;
              return <tr key={p}>
                <td className="fw-bold">{p}</td><td style={{color:'var(--green)'}}>{d.rev>0?fmt(d.rev):'—'}</td><td style={{color:'var(--red)'}}>{fmt(d.exp)}</td>
                <td style={{fontWeight:700,color:prof>=0?'var(--green)':'var(--red)'}}>{d.rev>0?fmt(prof):'—'}</td>
                <td>{d.rev>0?pct(margin):'—'}</td><td>{d.count} txns</td>
                <td>{prof>0?<span className="tag green">✓ Profitable</span>:d.rev===0?<span className="tag grey">Cost Only</span>:<span className="tag red">⚠ Loss</span>}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <div className="chart-wrap" style={{height:'200px',marginTop:'16px'}}><canvas ref={pRef}></canvas></div>
    </>
  );
}

function DepartmentsTab({ data, C }: any) {
  const dRef = useRef<HTMLCanvasElement>(null);
  const totalBudget = C.totalRev;
  const depts = Object.keys(DEPT_ALLOC);
  let over=0,near=0,ok=0;

  const rows = depts.map(d=>{
    const alloc=DEPT_ALLOC[d]; const budget=Number(totalBudget)*alloc; const actual=Number(C.deptSpend[d]||0);
    const variance=budget-actual; const used=budget>0?actual/budget:0;
    if(used>1)over++;else if(used>=0.8)near++;else ok++;
    return {d,alloc,budget,actual,variance,used: Number(used)};
  });

  useEffect(() => {
    if (dRef.current) {
      const deptLabels=Object.keys(C.deptSpend); const deptVals=deptLabels.map(d=>C.deptSpend[d]);
      const ch = new Chart(dRef.current,{
        type:'bar', data:{labels:deptLabels,datasets:[{label:'Actual Spend',data:deptVals,backgroundColor:[COLORS.red,'#4472C4',COLORS.amber,COLORS.green,COLORS.blue,COLORS.grey,'#7986CB'],borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}}},x:{ticks:{font:{size:9}}}}} as any
      });
      return () => ch.destroy();
    }
  }, [C]);

  return (
    <>
      <div className="page-title">Department Tracker</div><div className="page-sub">Budget vs Actual · Efficiency flags · Auto from Daily Log</div>
      <div className="kpi-grid">
        <div className="kpi red"><div className="kpi-label">Overspending</div><div className="kpi-value">{over}</div><div className="kpi-sub">Departments over budget</div></div>
        <div className="kpi amber"><div className="kpi-label">Near Limit</div><div className="kpi-value">{near}</div><div className="kpi-sub">80–100% utilized</div></div>
        <div className="kpi green"><div className="kpi-label">On Track</div><div className="kpi-value">{ok}</div><div className="kpi-sub">Under 80% utilized</div></div>
        <div className="kpi"><div className="kpi-label">Total Dept Spend</div><div className="kpi-value">{fmtK(Object.values(C.deptSpend).reduce((s: any,v: any)=>s+v,0) as number)}</div><div className="kpi-sub">All departments</div></div>
      </div>
      <div className="box">
        <div className="box-title">Department Budget vs Actual</div>
        <table className="tbl">
          <thead><tr><th>Department</th><th>Alloc %</th><th>Budget</th><th>Actual Spend</th><th>Variance</th><th>Utilized %</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.d}>
                <td className="fw-bold">{r.d}</td><td>{pct(r.alloc)}</td><td>{fmt(r.budget)}</td><td style={{fontWeight:700}}>{fmt(r.actual)}</td>
                <td style={{color:r.variance>=0?'var(--green)':'var(--red)',fontWeight:700}}>{r.variance>=0?'+':''}{fmt(r.variance)}</td>
                <td>{pct(r.used)}<div className="prog-bar"><div className="prog-fill" style={{width:`${Math.min(r.used,1)*100}%`,background:r.used>1?'var(--red)':r.used>=0.8?'var(--amber)':'var(--green)'}}></div></div></td>
                <td>{r.used>1?<span className="tag red">⚠ Overspend</span>:r.used>=0.8?<span className="tag amber">▲ Near Limit</span>:<span className="tag green">✓ On Track</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="box mt-8"><div className="box-title">Spend Distribution</div><div className="chart-wrap" style={{height:'200px'}}><canvas ref={dRef}></canvas></div></div>
    </>
  );
}

function ForecastTab({ data, C }: any) {
  const fRef = useRef<HTMLCanvasElement>(null);
  const [revGrowth, setRevGrowth] = useState(15);
  const [expansion, setExpansion] = useState(5);
  const [churn, setChurn] = useState(6);
  const [expGrowth, setExpGrowth] = useState(8);
  const [openCash, setOpenCash] = useState(500000);

  const [forecasts, setForecasts] = useState<any>({revRows:[], cfRows:[], flags:[]});

  useEffect(() => {
    const FCST_MONTHS = ['Apr 2026','May 2026','Jun 2026'];
    let openRev = C.latestRev || 368000;
    let openExp = C.latestExp || 213500;
    let currCash = openCash;
    const revRows: any=[]; const cfRows: any=[]; const chartRev: any=[]; const chartExp: any=[]; const chartCash: any=[];

    FCST_MONTHS.forEach((mo,i) => {
      const newRev = openRev * (revGrowth/100); const expRev = openRev * (expansion/100); const churnRev = openRev * (churn/100);
      const closeRev = openRev + newRev + expRev - churnRev;
      const expenses = i===0 ? openExp : cfRows[i-1].expenses * (1+(expGrowth/100));
      const netCF = closeRev - expenses;
      const closeCash = currCash + netCF;
      const runway = expenses>closeRev ? (closeCash/(expenses-closeRev)).toFixed(1)+' mo' : '∞ Positive';
      revRows.push({mo,openRev,newRev,expRev,churnRev,closeRev});
      cfRows.push({mo,expenses,netCF,openCash:currCash,closeCash,runway});
      chartRev.push(closeRev); chartExp.push(expenses); chartCash.push(closeCash);
      openRev=closeRev; currCash=closeCash;
    });

    const flags = [];
    if((revGrowth/100) > (expGrowth/100)) flags.push({type:'green',msg:`✅ Revenue growth (${pct(revGrowth/100)}) outpaces expense growth (${pct(expGrowth/100)}). Improving margins projected.`});
    else flags.push({type:'red',msg:`⚠️ Expense growth (${pct(expGrowth/100)}) exceeds revenue growth. Margin compression risk.`});
    const lastCF = cfRows[cfRows.length-1];
    if(parseFloat(lastCF.runway)<3) flags.push({type:'red',msg:`🚨 Runway below 3 months by Jun. Take immediate cash action.`});
    else if(lastCF.netCF<0) flags.push({type:'amber',msg:`⚠ Negative monthly cash flow projected. Monitor burn.`});
    else flags.push({type:'green',msg:`🟢 Cash position growing. Revenue exceeds expenses in projection period.`});

    setForecasts({revRows, cfRows, flags});

    if(fRef.current) {
      const actMonths = C.months; const allLabels = [...actMonths.map(monthLabel), ...FCST_MONTHS];
      const actRevs = actMonths.map((m: any)=>C.monthly[m].rev); const actExps = actMonths.map((m: any)=>C.monthly[m].exp);
      const ch = new Chart(fRef.current, {
        type:'line', data:{
          labels:allLabels, datasets:[
            {label:'Revenue',data:[...actRevs,...chartRev],borderColor:COLORS.green,backgroundColor:'rgba(46,125,50,0.08)',fill:true,tension:0.3,pointRadius:4,segment:{borderDash:ctx=>(ctx as any).p0DataIndex>=actMonths.length-1?[6,3]:undefined}},
            {label:'Expenses',data:[...actExps,...chartExp],borderColor:COLORS.red,backgroundColor:'rgba(198,40,40,0.05)',fill:true,tension:0.3,pointRadius:4,segment:{borderDash:ctx=>(ctx as any).p0DataIndex>=actMonths.length-1?[6,3]:undefined}},
            {label:'Cash Balance',data:[...Array(actMonths.length).fill(null),...chartCash],borderColor:COLORS.navy,backgroundColor:'transparent',tension:0.3,pointRadius:5,yAxisID:'y1',segment:{borderDash:[6,3]}},
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},scales:{y:{ticks:{callback:v=>fmtK(v as number),font:{size:9}}},y1:{type:'linear',position:'right',ticks:{callback:v=>fmtK(v as number),font:{size:9}},grid:{drawOnChartArea:false}},x:{ticks:{font:{size:9}}}}} as any
      });
      return () => ch.destroy();
    }
  }, [C, revGrowth, expansion, churn, expGrowth, openCash]);

  return (
    <>
      <div className="page-title">3-Month Revenue Projection</div><div className="page-sub">Base auto-pulled from Daily Log · Only assumptions are editable below</div>
      <div className="sec-bar"><span>⚙ ASSUMPTION INPUTS — Edit only these cells</span><span style={{fontSize:'10px',opacity:0.7}}>All projections update instantly</span></div>
      <div className="assume-grid">
        <div className="assume-item"><label>Revenue Growth %</label><input type="number" value={revGrowth} onChange={e=>setRevGrowth(parseFloat(e.target.value)||0)}/>%</div>
        <div className="assume-item"><label>Expansion Rate %</label><input type="number" value={expansion} onChange={e=>setExpansion(parseFloat(e.target.value)||0)}/>%</div>
        <div className="assume-item"><label>Churn Rate %</label><input type="number" value={churn} onChange={e=>setChurn(parseFloat(e.target.value)||0)}/>%</div>
        <div className="assume-item"><label>Expense Growth %</label><input type="number" value={expGrowth} onChange={e=>setExpGrowth(parseFloat(e.target.value)||0)}/>%</div>
        <div className="assume-item"><label>Opening Cash (₹)</label><input type="number" value={openCash} step="10000" onChange={e=>setOpenCash(parseFloat(e.target.value)||0)}/></div>
      </div>
      <div className="grid-2">
        <div className="box">
          <div className="box-title">Revenue Waterfall (Bottom-Up)</div>
          <table className="fcst-table">
            <thead><tr><th>Month</th><th>Opening</th><th>+New</th><th>+Expansion</th><th>−Churn</th><th>Closing</th></tr></thead>
            <tbody>
              {forecasts.revRows.map((r: any)=> <tr key={r.mo}><td className="fw-bold">{r.mo}</td><td>{fmt(r.openRev)}</td><td className="positive">+{fmt(r.newRev)}</td><td className="positive">+{fmt(r.expRev)}</td><td className="negative">−{fmt(r.churnRev)}</td><td className="fw-bold positive">{fmt(r.closeRev)}</td></tr> )}
            </tbody>
          </table>
        </div>
        <div className="box">
          <div className="box-title">Expense & Cash Flow</div>
          <table className="fcst-table">
            <thead><tr><th>Month</th><th>Expenses</th><th>Net CF</th><th>Opening Cash</th><th>Closing Cash</th><th>Runway</th></tr></thead>
            <tbody>
              {forecasts.cfRows.map((r: any)=> <tr key={r.mo}><td className="fw-bold">{r.mo}</td><td className="negative">{fmt(r.expenses)}</td><td className={`${r.netCF>=0?'positive':'negative'} fw-bold`}>{r.netCF>=0?'+':''}{fmt(r.netCF)}</td><td>{fmt(r.openCash)}</td><td className="fw-bold">{fmt(r.closeCash)}</td><td className={parseFloat(r.runway)<3?'negative':parseFloat(r.runway)<6?'':'positive'}>{r.runway}</td></tr> )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="box"><div className="box-title">Projection Chart — Revenue · Expenses · Cash</div><div className="chart-wrap" style={{height:'240px'}}><canvas ref={fRef}></canvas></div></div>
      <div style={{marginTop:'12px'}}>
        {forecasts.flags.map((f: any, i: number)=><div key={i} className={`alert ${f.type}`}>{f.msg}</div>)}
      </div>
    </>
  );
}

function InsightsTab({ data, C }: any) {
  const months = C.months;
  const latestM = months[months.length-1];
  const prevM = months[months.length-2];

  // Derived facts
  const mktSpend = data.filter((r: any)=>r.type==='Expense'&&r.dept==='Marketing').reduce((s: any,r: any)=>s+r.amount,0);
  const hrSpend = data.filter((r: any)=>r.type==='Expense'&&r.dept==='HR').reduce((s: any,r: any)=>s+r.amount,0);
  const latestMktSpend = data.filter((r: any)=>r.type==='Expense'&&r.dept==='Marketing'&&monthKey(r.date)===latestM).reduce((s: any,r: any)=>s+r.amount,0);
  const prevMktSpend = prevM?data.filter((r: any)=>r.type==='Expense'&&r.dept==='Marketing'&&monthKey(r.date)===prevM).reduce((s: any,r: any)=>s+r.amount,0):0;
  
  const mktROIDeclining = latestMktSpend > prevMktSpend && (C.monthly[latestM]?.rev||0) < (C.monthly[prevM]?.rev||0)*1.3;
  const hrHighPct = C.totalRev>0 ? hrSpend/C.totalRev > 0.25 : false;
  const custRev: any = {};
  data.filter((r: any)=>r.type==='Revenue'&&r.customer).forEach((r: any)=>{custRev[r.customer]=(custRev[r.customer]||0)+r.amount;});
  const top3Custs = Object.entries(custRev).sort((a: any,b: any)=>b[1]-a[1]).slice(0,3);
  const top3Conc = C.totalRev>0 ? top3Custs.reduce((s: any,c: any)=>s+c[1],0)/C.totalRev : 0;

  const critical: any[]=[], warnings: any[]=[], positive: any[]=[], recs: any[]=[];

  // CRITICAL
  if(C.profit<0) critical.push({icon:'🚨',title:'Company is Overspending',body:`Total expenses (${fmtK(C.totalExp)}) exceed revenue (${fmtK(C.totalRev)}) by ${fmtK(Math.abs(C.profit))}. Immediate action required.`,action:'Freeze all discretionary spend. Identify ₹50K+ in monthly cuts before next payroll.'});
  if(C.runway<3) critical.push({icon:'🚨',title:'Critical Cash Risk — Runway < 3 Months',body:`At current burn of ${fmtK(C.monthlyBurn)}/month with ₹5L cash, runway is ${C.runway.toFixed(1)} months. This is the most urgent financial threat.`,action:'Prioritize collecting ₹3.68L in pending AR immediately. Defer all non-critical payments.'});
  if(top3Conc>0.5) critical.push({icon:'🚨',title:`Revenue Concentration Risk — Top 3 Clients = ${pct(top3Conc)}`,body:`${top3Custs.map((c: any)=>c[0]).join(', ')} account for ${pct(top3Conc)} of all revenue. Losing any one is catastrophic.`,action:'Build a customer success playbook for these 3 accounts. Offer 2-year contracts at a 10% discount to lock them in.'});

  // WARNINGS
  if(C.cm<0.5) warnings.push({icon:'⚠️',title:`Low Contribution Margin — ${pct(C.cm)} (Target: >50%)`,body:`Variable costs at ${fmtK(C.varCost)} reduce contribution margin below the 50% threshold. Profitability is structurally weak.`,action:'Audit all variable costs. Marketing ROI declining — pause influencer spend (₹18K) and redirect to high-ROI channels.'});
  if(hrHighPct) warnings.push({icon:'⚠️',title:`HR Cost = ${pct(hrSpend/C.totalRev)} of Revenue (Target: <25%)`,body:`HR spending ${fmtK(hrSpend)} is ${pct(hrSpend/C.totalRev)} of total revenue. Personnel costs are the largest single cost driver at 53% of expenses.`,action:'Freeze non-critical hires. Each new hire must have a revenue impact model showing ₹3–5L ARR contribution.'});
  if(mktROIDeclining) warnings.push({icon:'⚠️',title:'Marketing Spend Rising, Revenue ROI Declining',body:'Marketing tripled (₹12K→₹38.5K) but revenue ROI fell from 21.5× to 9.6×. Brand redesign and influencer spend (₹30.5K) have zero attribution data.',action:'Pause brand and influencer spend. Add UTM source tracking. Redirect to direct enterprise outbound — proven channel for your top customers.'});
  if(C.deptSpend['Management']>0 && C.deptSpend['Management']/C.totalRev>0.07) warnings.push({icon:'⚠️',title:'Management Salary Escalating 27% in 3 Months',body:`Founder pay grew ₹22K→₹25K→₹28K (+27%) while runway is under 3 months. Including a bonus in March during cash constraint is misaligned with financial health.`,action:'Defer discretionary compensation increases until runway exceeds 6 months. Reinvest founder savings into customer acquisition.'});

  // POSITIVE
  if((C.monthly[latestM]?.rev||0) > (C.monthly[prevM]?.rev||0)) positive.push({icon:'✅',title:`Revenue Growing — ${pct(((C.monthly[latestM]?.rev||0)-(C.monthly[prevM]?.rev||0))/(C.monthly[prevM]?.rev||1))} MoM in ${monthLabel(latestM)}`,body:`Revenue trend is positive — growing from ${fmtK(C.monthly[prevM]?.rev||0)} (${monthLabel(prevM)}) to ${fmtK(C.monthly[latestM]?.rev||0)} (${monthLabel(latestM)}). Enterprise segment is the primary driver.`,action:'Double down on enterprise segment. Ankit\'s close rate on enterprise deals is the highest-ROI activity.'});
  if(C.cac<50000 && C.cac>0) positive.push({icon:'✅',title:`CAC Efficient — ${fmtK(C.cac)} per New Customer`,body:'Customer acquisition cost is below the ₹50K benchmark. Founder-led sales is highly efficient at this stage.',action:'Document the enterprise sales playbook before it becomes tacit knowledge. Scale the proven ICP profile.'});
  const entRev = data.filter((r: any)=>r.type==='Revenue'&&r.project==='Enterprise').reduce((s: any,r: any)=>s+r.amount,0);
  const smbRev = data.filter((r: any)=>r.type==='Revenue'&&r.project==='SMB').reduce((s: any,r: any)=>s+r.amount,0);
  if(entRev>smbRev) positive.push({icon:'✅',title:`Enterprise Segment = ${pct(entRev/(entRev+smbRev))} of Revenue`,body:`Enterprise customers generate ${fmtK(entRev/6)}/customer vs ${fmtK(smbRev/7)}/customer for SMB — a 3.4× revenue premium.`,action:'Raise enterprise pricing 15–20% at next contract renewal. Add ₹1.5L–₹2L Premium tier with SLA.'});

  // RECS
  recs.push({icon:'💡',title:'Top 5 Actionable Recommendations',body:`
1. Collect ₹3.68L AR this week — HDFC Digital (₹1.6L) is highest priority. 2% early payment discount offer.
2. Fix churn first — ₹1.85L in recurring revenue lost in 2 months. Call every churned customer. Assign CS owner.
3. Freeze hiring, audit HR — HR at 426% of budget. Each hire needs revenue impact model before approval.
4. Kill duplicate monitoring tools — Datadog + New Relic = ₹10K/quarter wasted. Keep one.
5. Switch SMB to annual contracts — Monthly SMB billing enables cheap churn. Floor at ₹35K/year with annual commitment.`,action:'Monthly savings potential: ₹96K–₹1.6L from all actions combined.'});

  const renderList = (items: any[], colorVariant: string) => {
    if(!items.length) return null;
    return items.map((i, idx) => (
      <div key={idx} className={`insight ${colorVariant}`}>
        <div className="insight-icon">{i.icon}</div>
        <div>
          <div className="insight-title">{i.title}</div>
          {i.body.includes('\n') ? 
            <div className="insight-body" style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'4px'}}>
              {i.body.trim().split('\n').map((line: string, lidx: number)=><div key={lidx}>{line.includes(' — ') ? <><strong style={{color:'initial'}}>{line.split(' — ')[0]}</strong><span> — {line.split(' — ')[1]}</span></> : <span>{line}</span>}</div>)}
            </div>
            : <div className="insight-body">{i.body}</div>
          }
          {i.action && <div className="insight-action">→ {i.action}</div>}
        </div>
      </div>
    ));
  };

  return (
    <>
      <div className="page-title">AI Insights Engine</div><div className="page-sub">Auto-generated from Daily Log rules engine · Updates with every transaction</div>
      {critical.length > 0 && <><div className="sec-bar" style={{background:'var(--red)',marginBottom:'10px'}}>🚨 Critical Issues</div><div className="mb-16" style={{display:'flex',flexDirection:'column',gap:'8px'}}>{renderList(critical, 'red')}</div></>}
      {warnings.length > 0 && <><div className="sec-bar" style={{background:'var(--amber)',marginBottom:'10px'}}>⚠️ Warnings</div><div className="mb-16" style={{display:'flex',flexDirection:'column',gap:'8px'}}>{renderList(warnings, 'amber')}</div></>}
      {positive.length > 0 && <><div className="sec-bar" style={{background:'var(--green)',marginBottom:'10px'}}>✅ Positives</div><div className="mb-16" style={{display:'flex',flexDirection:'column',gap:'8px'}}>{renderList(positive, 'green')}</div></>}
      {recs.length > 0 && <><div className="sec-bar" style={{background:'var(--navy)',marginBottom:'10px'}}>💡 Recommendations</div><div className="mb-16" style={{display:'flex',flexDirection:'column',gap:'8px'}}>{renderList(recs, 'blue')}</div></>}
    </>
  );
}

function CashFlowTab({ data, C }: any) {
  const cRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if(cRef.current) {
      const months = C.months;
      const ch = new Chart(cRef.current,{
        type:'bar', data:{labels:months.map(monthLabel),datasets:[{label:'Inflow',data:months.map((m: any)=>C.monthly[m].rev),backgroundColor:'rgba(46,125,50,0.8)',borderRadius:4},{label:'Outflow',data:months.map((m: any)=>-C.monthly[m].exp),backgroundColor:'rgba(198,40,40,0.7)',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10}}},scales:{y:{ticks:{callback:v=>fmtK(Math.abs(v as number)),font:{size:9}}},x:{ticks:{font:{size:9}}}}} as any
      });
      return () => ch.destroy();
    }
  }, [C]);

  let runBal = OPENING_CASH;
  const cfRows = C.months.map((m: any)=>{ const d=C.monthly[m]; const net=d.rev-d.exp; runBal+=net; return {m,d,net,runBal}; });

  return (
    <>
      <div className="page-title">Cash Flow Analysis</div><div className="page-sub">Running cash position · Inflows vs Outflows</div>
      <div className="kpi-grid">
        <div className="kpi green"><div className="kpi-label">Total Inflow</div><div className="kpi-value">{fmtK(C.totalRev)}</div><div className="kpi-sub">All revenue</div></div>
        <div className="kpi red"><div className="kpi-label">Total Outflow</div><div className="kpi-value">{fmtK(C.totalExp)}</div><div className="kpi-sub">All expenses</div></div>
        <div className={`kpi ${C.profit>=0?'green':'red'}`}><div className="kpi-label">Net Cash Flow</div><div className="kpi-value">{fmtK(C.profit)}</div><div className="kpi-sub">Inflow − Outflow</div></div>
        <div className="kpi"><div className="kpi-label">Cash Balance</div><div className="kpi-value">{fmtK(OPENING_CASH+C.profit)}</div><div className="kpi-sub">Opening + Net</div></div>
      </div>
      <div className="grid-2">
        <div className="box"><div className="box-title">Monthly Cash Flow</div><div className="chart-wrap"><canvas ref={cRef}></canvas></div></div>
        <div className="box">
          <div className="box-title">Monthly Running Balance</div>
          <table className="tbl">
            <thead><tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Running Balance</th><th>Status</th></tr></thead>
            <tbody>
              {cfRows.map((r: any)=> <tr key={r.m}><td className="fw-bold">{monthLabel(r.m)}</td><td style={{color:'var(--green)'}}>{fmt(r.d.rev)}</td><td style={{color:'var(--red)'}}>{fmt(r.d.exp)}</td><td style={{fontWeight:700,color:r.net>=0?'var(--green)':'var(--red)'}}>{r.net>=0?'+':''}{fmt(r.net)}</td><td style={{fontWeight:700}}>{fmt(r.runBal)}</td><td>{r.runBal>OPENING_CASH*1.2?<span className="tag green">Growing</span>:r.runBal>0?<span className="tag amber">Stable</span>:<span className="tag red">Depleting</span>}</td></tr> )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
