import express from 'express';
import helmet from 'helmet';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {seedState,simulate,shortestPath} from './engine.js';
import {generateSimulationPcap,getDissectedFramesSummary} from './pcap.js';

const app=express(); const state=seedState(); const PORT=process.env.PORT||3000;
app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'100kb'}));
app.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
const sessions=new Map();
const demoUsers=[
  // Headquarter Core
  {username:'admin@netbankx.demo',password:'NetBankXDemo!2026',name:'Nihar — Demo Admin',role:'HQ_ADMIN'},
  {username:'admin@paysafe.demo',password:'PaySafeDemo!2026',name:'Nihar — Demo Admin',role:'HQ_ADMIN'},

  // 3 Regional Heads
  {username:'regional-a@netbankx.demo',password:'RegionalDemo!26',name:'Priya Menon',role:'REGIONAL_MANAGER',regionId:'REG-A'},
  {username:'regional@netbankx.demo',password:'RegionalDemo!26',name:'Priya Menon',role:'REGIONAL_MANAGER',regionId:'REG-A'},
  {username:'regional-b@netbankx.demo',password:'RegionalDemo!26',name:'Rajesh Nair',role:'REGIONAL_MANAGER',regionId:'REG-B'},
  {username:'regional-c@netbankx.demo',password:'RegionalDemo!26',name:'Suresh Varma',role:'REGIONAL_MANAGER',regionId:'REG-C'},

  // 6 Branch Heads (2 banks per region)
  {username:'branch-a1@netbankx.demo',password:'BranchDemo!26',name:'Rohan Shah',role:'BRANCH_MANAGER',branchId:'BR-A1'},
  {username:'branch@netbankx.demo',password:'BranchDemo!26',name:'Rohan Shah',role:'BRANCH_MANAGER',branchId:'BR-A1'},
  {username:'branch-a2@netbankx.demo',password:'BranchDemo!26',name:'Neha Gupta',role:'BRANCH_MANAGER',branchId:'BR-A2'},
  {username:'branch-b1@netbankx.demo',password:'BranchDemo!26',name:'Vikram Joshi',role:'BRANCH_MANAGER',branchId:'BR-B1'},
  {username:'branch-b2@netbankx.demo',password:'BranchDemo!26',name:'Anita Deshmukh',role:'BRANCH_MANAGER',branchId:'BR-B2'},
  {username:'branch-c1@netbankx.demo',password:'BranchDemo!26',name:'Karthik Raman',role:'BRANCH_MANAGER',branchId:'BR-C1'},
  {username:'branch-c2@netbankx.demo',password:'BranchDemo!26',name:'Pooja Kulkarni',role:'BRANCH_MANAGER',branchId:'BR-C2'},

  // 18 Customers (3 customers per bank)
  // Bank BR-A1
  {username:'customer-a1@netbankx.demo',password:'CustomerDemo!26',name:'Aarav Mehta',role:'CUSTOMER',accountId:'NBX-100001',nodeId:'CUST-01',branchId:'BR-A1',regionId:'REG-A'},
  {username:'customer@netbankx.demo',password:'CustomerDemo!26',name:'Aarav Mehta',role:'CUSTOMER',accountId:'NBX-100001',nodeId:'CUST-01',branchId:'BR-A1',regionId:'REG-A'},
  {username:'aarav@netbankx.demo',password:'CustomerDemo!26',name:'Aarav Mehta',role:'CUSTOMER',accountId:'NBX-100001',nodeId:'CUST-01',branchId:'BR-A1',regionId:'REG-A'},
  {username:'ishita@netbankx.demo',password:'CustomerDemo!26',name:'Ishita Reddy',role:'CUSTOMER',accountId:'NBX-100002',nodeId:'CUST-02',branchId:'BR-A1',regionId:'REG-A'},
  {username:'vivaan@netbankx.demo',password:'CustomerDemo!26',name:'Vivaan Rao',role:'CUSTOMER',accountId:'NBX-100003',nodeId:'CUST-03',branchId:'BR-A1',regionId:'REG-A'},

  // Bank BR-A2
  {username:'customer-a2@netbankx.demo',password:'CustomerDemo!26',name:'Saanvi Shah',role:'CUSTOMER',accountId:'NBX-100004',nodeId:'CUST-04',branchId:'BR-A2',regionId:'REG-A'},
  {username:'saanvi@netbankx.demo',password:'CustomerDemo!26',name:'Saanvi Shah',role:'CUSTOMER',accountId:'NBX-100004',nodeId:'CUST-04',branchId:'BR-A2',regionId:'REG-A'},
  {username:'reyansh@netbankx.demo',password:'CustomerDemo!26',name:'Reyansh Patel',role:'CUSTOMER',accountId:'NBX-100005',nodeId:'CUST-05',branchId:'BR-A2',regionId:'REG-A'},
  {username:'aadhya@netbankx.demo',password:'CustomerDemo!26',name:'Aadhya Iyer',role:'CUSTOMER',accountId:'NBX-100006',nodeId:'CUST-06',branchId:'BR-A2',regionId:'REG-A'},

  // Bank BR-B1
  {username:'customer-b1@netbankx.demo',password:'CustomerDemo!26',name:'Kabir Rao',role:'CUSTOMER',accountId:'NBX-100007',nodeId:'CUST-07',branchId:'BR-B1',regionId:'REG-B'},
  {username:'kabir@netbankx.demo',password:'CustomerDemo!26',name:'Kabir Rao',role:'CUSTOMER',accountId:'NBX-100007',nodeId:'CUST-07',branchId:'BR-B1',regionId:'REG-B'},
  {username:'myra@netbankx.demo',password:'CustomerDemo!26',name:'Myra Das',role:'CUSTOMER',accountId:'NBX-100008',nodeId:'CUST-08',branchId:'BR-B1',regionId:'REG-B'},
  {username:'vihaan@netbankx.demo',password:'CustomerDemo!26',name:'Vihaan Kumar',role:'CUSTOMER',accountId:'NBX-100009',nodeId:'CUST-09',branchId:'BR-B1',regionId:'REG-B'},

  // Bank BR-B2
  {username:'customer-b2@netbankx.demo',password:'CustomerDemo!26',name:'Atharv Singh',role:'CUSTOMER',accountId:'NBX-100010',nodeId:'CUST-10',branchId:'BR-B2',regionId:'REG-B'},
  {username:'atharv@netbankx.demo',password:'CustomerDemo!26',name:'Atharv Singh',role:'CUSTOMER',accountId:'NBX-100010',nodeId:'CUST-10',branchId:'BR-B2',regionId:'REG-B'},
  {username:'kiara@netbankx.demo',password:'CustomerDemo!26',name:'Kiara Bose',role:'CUSTOMER',accountId:'NBX-100011',nodeId:'CUST-11',branchId:'BR-B2',regionId:'REG-B'},
  {username:'dhruv@netbankx.demo',password:'CustomerDemo!26',name:'Dhruv Nair',role:'CUSTOMER',accountId:'NBX-100012',nodeId:'CUST-12',branchId:'BR-B2',regionId:'REG-B'},

  // Bank BR-C1
  {username:'customer-c1@netbankx.demo',password:'CustomerDemo!26',name:'Anaya Iyer',role:'CUSTOMER',accountId:'NBX-100013',nodeId:'CUST-13',branchId:'BR-C1',regionId:'REG-C'},
  {username:'anaya@netbankx.demo',password:'CustomerDemo!26',name:'Anaya Iyer',role:'CUSTOMER',accountId:'NBX-100013',nodeId:'CUST-13',branchId:'BR-C1',regionId:'REG-C'},
  {username:'aanya@netbankx.demo',password:'CustomerDemo!26',name:'Aanya Krishnan',role:'CUSTOMER',accountId:'NBX-100014',nodeId:'CUST-14',branchId:'BR-C1',regionId:'REG-C'},
  {username:'dev@netbankx.demo',password:'CustomerDemo!26',name:'Dev Malhotra',role:'CUSTOMER',accountId:'NBX-100015',nodeId:'CUST-15',branchId:'BR-C1',regionId:'REG-C'},

  // Bank BR-C2
  {username:'customer-c2@netbankx.demo',password:'CustomerDemo!26',name:'Diya Sharma',role:'CUSTOMER',accountId:'NBX-100016',nodeId:'CUST-16',branchId:'BR-C2',regionId:'REG-C'},
  {username:'diya@netbankx.demo',password:'CustomerDemo!26',name:'Diya Sharma',role:'CUSTOMER',accountId:'NBX-100016',nodeId:'CUST-16',branchId:'BR-C2',regionId:'REG-C'},
  {username:'rohan@netbankx.demo',password:'CustomerDemo!26',name:'Rohan Bhat',role:'CUSTOMER',accountId:'NBX-100017',nodeId:'CUST-17',branchId:'BR-C2',regionId:'REG-C'},
  {username:'pia@netbankx.demo',password:'CustomerDemo!26',name:'Pia Anand',role:'CUSTOMER',accountId:'NBX-100018',nodeId:'CUST-18',branchId:'BR-C2',regionId:'REG-C'}
];
const safeUser=u=>({username:u.username,name:u.name,role:u.role,regionId:u.regionId,branchId:u.branchId,accountId:u.accountId,nodeId:u.nodeId});
const nodeToAccount={
  'CUST-01':'NBX-100001','CUST-02':'NBX-100002','CUST-03':'NBX-100003',
  'CUST-04':'NBX-100004','CUST-05':'NBX-100005','CUST-06':'NBX-100006',
  'CUST-07':'NBX-100007','CUST-08':'NBX-100008','CUST-09':'NBX-100009',
  'CUST-10':'NBX-100010','CUST-11':'NBX-100011','CUST-12':'NBX-100012',
  'CUST-13':'NBX-100013','CUST-14':'NBX-100014','CUST-15':'NBX-100015',
  'CUST-16':'NBX-100016','CUST-17':'NBX-100017','CUST-18':'NBX-100018'
};
const accountToNode=Object.fromEntries(Object.entries(nodeToAccount).map(([k,v])=>[v,k]));
function auth(req,res,next){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const user=sessions.get(token);if(!user)return res.status(401).json({error:'Please sign in to continue.'});req.user=user;next();}
function allow(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Your role is not permitted to perform this action.'});}
function audit(actor,action,resource,outcome='SUCCESS'){state.audit.unshift({id:crypto.randomUUID(),actor:actor?.name||'System',role:actor?.role||'SYSTEM',action,resource,outcome,at:new Date().toISOString()});}
app.get('/api/health',(req,res)=>res.json({status:'ok',service:'NetBankX Enterprise API',mode:'educational in-memory demo',uptimeSeconds:Math.round(process.uptime())}));
app.post('/api/auth/login',(req,res)=>{
  const {username,password}=req.body||{};
  if(typeof username!=='string'||typeof password!=='string')return res.status(400).json({error:'Enter your email and password.'});
  const normalized=username.toLowerCase().trim();
  const user=demoUsers.find(u=>{
    const uNorm=u.username.toLowerCase();
    const isUserMatch=(uNorm===normalized)||
      (normalized.replace('@netbankx.demo','@paysafe.demo')===uNorm)||
      (normalized.replace('@paysafe.demo','@netbankx.demo')===uNorm);
    if(!isUserMatch) return false;
    if(u.password===password) return true;
    if(password.replace(/NetBankX/gi,'PaySafe')===u.password) return true;
    if(password.replace(/PaySafe/gi,'NetBankX')===u.password) return true;
    return false;
  });
  if(!user){audit(null,'LOGIN_REJECTED',username,'DENIED');return res.status(401).json({error:'Email or password is incorrect.'});}
  const token=crypto.randomBytes(32).toString('hex');
  sessions.set(token,user);
  audit(user,'LOGIN','session');
  res.json({token,user:safeUser(user)});
});
app.get('/api/auth/me',auth,(req,res)=>res.json({user:safeUser(req.user)}));
app.post('/api/auth/logout',auth,(req,res)=>{const token=req.headers.authorization.replace(/^Bearer\s+/i,'');sessions.delete(token);audit(req.user,'LOGOUT','session');res.json({ok:true});});
app.get('/api/dashboard',auth,(req,res)=>{
  let accounts=state.accounts,tx=state.transactions,branches=state.branches,regions=state.regions;
  let customerRegionDetail=null;
  if(req.user.role==='CUSTOMER'){
    const userAcc=state.accounts.find(a=>a.id===req.user.accountId);
    accounts=userAcc?[userAcc]:accounts.filter(a=>a.id===req.user.accountId);
    tx=tx.filter(t=>t.source===req.user.accountId||t.destination===req.user.accountId);
    const userBranch=state.branches.find(b=>b.id===userAcc?.branchId);
    branches=userBranch?[userBranch]:[];
    const userRegion=state.regions.find(r=>r.id===userBranch?.regionId);
    regions=userRegion?[userRegion]:[];

    const regRouter=state.nodes.find(n=>n.id===userRegion?.id);
    const brRouter=state.nodes.find(n=>n.id===userBranch?.id);
    const custNode=state.nodes.find(n=>n.id===(req.user.nodeId||accountToNode[req.user.accountId]||'CUST-01'));
    const relevantLinks=state.links.filter(l=>
      (userBranch&&(l.from===userBranch.id||l.to===userBranch.id))||
      (userRegion&&(l.from===userRegion.id||l.to===userRegion.id))
    );
    customerRegionDetail={
      account:userAcc,
      branch:userBranch,
      region:userRegion,
      customerNode:custNode,
      branchRouter:brRouter,
      regionRouter:regRouter,
      links:relevantLinks,
      allCustomerAccounts:state.accounts.filter(a=>a.id!==userAcc?.id&&a.status==='active').map(a=>{
        const b=state.branches.find(x=>x.id===a.branchId);
        const r=state.regions.find(x=>x.id===b?.regionId);
        return {id:a.id,owner:a.owner,branchId:a.branchId,branchName:b?.name||a.branchId,regionId:r?.id,regionName:r?.name||r?.id,nodeId:accountToNode[a.id]||null,balance:a.balance};
      })
    };
  }else if(req.user.role==='BRANCH_MANAGER'){
    const myBranch=state.branches.find(b=>b.id===req.user.branchId);
    const myRegion=state.regions.find(r=>r.id===myBranch?.regionId);
    const regRouter=state.nodes.find(n=>n.id===myRegion?.id);
    const brRouter=state.nodes.find(n=>n.id===myBranch?.id);
    const regionalBranches=state.branches.filter(b=>b.regionId===myRegion?.id);
    const regionalBranchIds=regionalBranches.map(b=>b.id);
    const branchAccounts=state.accounts.filter(a=>a.branchId===req.user.branchId);
    const regionalAccounts=state.accounts.filter(a=>regionalBranchIds.includes(a.branchId));
    const branchAccountIds=branchAccounts.map(a=>a.id);
    accounts=branchAccounts;
    // only transactions from customer to another in that particular bank (branch):
    tx=tx.filter(t=>t.source && t.destination && branchAccountIds.includes(t.source) && branchAccountIds.includes(t.destination));
    branches=[myBranch];
    regions=myRegion?[myRegion]:[];
    customerRegionDetail={
      isBranchManager:true,
      branch:myBranch,
      region:myRegion,
      branchRouter:brRouter,
      regionRouter:regRouter,
      regionalBranches:regionalBranches,
      branchAccountsCount:branchAccounts.length,
      regionalAccountsCount:regionalAccounts.length
    };
  }else if(req.user.role==='REGIONAL_MANAGER'){
    branches=branches.filter(b=>b.regionId===req.user.regionId);
    const ids=branches.map(b=>b.id);
    accounts=accounts.filter(a=>ids.includes(a.branchId));
    tx=tx.filter(t=>accounts.some(a=>a.id===t.source||a.id===t.destination));
    regions=regions.filter(r=>r.id===req.user.regionId);
  }
  const completed=tx.filter(t=>t.status==='COMPLETED');
  res.json({
    metrics:{
      regions:regions.length,
      branches:branches.length,
      staff:demoUsers.filter(u=>u.role!=='CUSTOMER').length,
      customers:accounts.length,
      activeAccounts:accounts.filter(a=>a.status==='active').length,
      completedTransactions:completed.length,
      failedTransactions:tx.filter(t=>t.status==='FAILED').length,
      volume:completed.reduce((n,t)=>n+t.amount,0),
      onlineNodes:state.nodes.filter(n=>n.status==='online').length,
      totalNodes:state.nodes.length,
      onlineLinks:state.links.filter(l=>l.status==='online').length,
      totalLinks:state.links.length
    },
    transactions:tx.slice(0,8),
    accounts,
    regions,
    branches,
    customerRegionDetail,
    simulations:state.simulations.slice(0,5),
    audit:req.user.role==='HQ_ADMIN'?state.audit.slice(0,6):state.audit.filter(a=>a.role===req.user.role).slice(0,6)
  });
});
app.get('/api/organization',auth,allow('HQ_ADMIN','REGIONAL_MANAGER'),(req,res)=>{let branches=state.branches;if(req.user.role==='REGIONAL_MANAGER')branches=branches.filter(b=>b.regionId===req.user.regionId);res.json({regions:state.regions.filter(r=>req.user.role!=='REGIONAL_MANAGER'||r.id===req.user.regionId),branches});});
app.get('/api/customers',auth,(req,res)=>{
  let accounts=state.accounts;
  if(req.user.role==='CUSTOMER')accounts=accounts.filter(a=>a.id===req.user.accountId);
  else if(req.user.role==='BRANCH_MANAGER'){
    const myBranch=state.branches.find(b=>b.id===req.user.branchId);
    const regBranchIds=state.branches.filter(b=>b.regionId===myBranch?.regionId).map(b=>b.id);
    accounts=accounts.filter(a=>regBranchIds.includes(a.branchId));
  }else if(req.user.role==='REGIONAL_MANAGER'){
    const ids=state.branches.filter(b=>b.regionId===req.user.regionId).map(b=>b.id);
    accounts=accounts.filter(a=>ids.includes(a.branchId));
  }
  res.json({
    customers:accounts.map(a=>{
      const br=state.branches.find(b=>b.id===a.branchId);
      const reg=state.regions.find(r=>r.id===br?.regionId);
      return {
        id:a.id,
        name:a.owner,
        branchId:a.branchId,
        branchName:br?.name||a.branchId,
        regionId:reg?.id,
        regionName:reg?.name||reg?.id,
        balance:a.balance,
        status:a.status,
        isHomeBranch:a.branchId===req.user.branchId
      };
    })
  });
});
app.get('/api/recipients',auth,(req,res)=>{
  const list=state.accounts.filter(a=>a.status==='active'&&(req.user.role!=='CUSTOMER'||a.id!==req.user.accountId)).map(a=>{
    const br=state.branches.find(b=>b.id===a.branchId);
    const reg=state.regions.find(r=>r.id===br?.regionId);
    return {id:a.id,owner:a.owner,branchId:a.branchId,branchName:br?.name||a.branchId,regionId:reg?.id||'REG',regionName:reg?.name||'Region',nodeId:accountToNode[a.id]||null,balance:a.balance};
  });
  res.json({recipients:list});
});
app.get('/api/transactions',auth,(req,res)=>{
  let rows=state.transactions;
  if(req.user.role==='CUSTOMER')rows=rows.filter(t=>t.source===req.user.accountId||t.destination===req.user.accountId);
  else if(req.user.role==='BRANCH_MANAGER'){
    const myBranchAccs=state.accounts.filter(a=>a.branchId===req.user.branchId).map(a=>a.id);
    if(req.query.scope==='all'){
      rows=rows.filter(t=>t.source && t.destination && (myBranchAccs.includes(t.source)||myBranchAccs.includes(t.destination)));
    } else {
      // show all transactions from customer to another only in that particular bank:
      rows=rows.filter(t=>t.source && t.destination && myBranchAccs.includes(t.source) && myBranchAccs.includes(t.destination));
    }
  } else if(req.user.role==='REGIONAL_MANAGER'){
    const regBranchIds=state.branches.filter(b=>b.regionId===req.user.regionId).map(b=>b.id);
    const regAccIds=state.accounts.filter(a=>regBranchIds.includes(a.branchId)).map(a=>a.id);
    // Show all transactions done from and to the particular region:
    rows=rows.filter(t=>(t.source && regAccIds.includes(t.source)) || (t.destination && regAccIds.includes(t.destination)));
  }
  res.json({transactions:rows});
});
app.post('/api/transactions/:type',auth,(req,res)=>{
  const type=req.params.type.toUpperCase();
  if(!['TRANSFER','DEPOSIT','WITHDRAWAL'].includes(type))return res.status(404).json({error:'Unsupported transaction type.'});
  if(!['CUSTOMER','HQ_ADMIN','BRANCH_MANAGER','REGIONAL_MANAGER'].includes(req.user.role))return res.status(403).json({error:'Money-moving operations are restricted to authorized users in this demo.'});
  if((req.user.role==='BRANCH_MANAGER'||req.user.role==='REGIONAL_MANAGER')&&!['DEPOSIT','WITHDRAWAL'].includes(type))return res.status(403).json({error:'Managers are authorized to perform customer account deposits and cash withdrawals.'});
  const {source,destination,amount,reference='',idempotencyKey,tamper=false}=req.body||{};
  const n=Number(amount);
  if(!Number.isFinite(n)||n<=0||n>1000000)return res.status(400).json({error:'Amount must be greater than ₹0 and no more than ₹10,00,000.'});
  const key=idempotencyKey||('idem-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'));
  const src=state.accounts.find(a=>a.id===source),dst=state.accounts.find(a=>a.id===destination);
  if(type!=='DEPOSIT'&&!src)return res.status(404).json({error:'Source account not found.'});
  if(type!=='DEPOSIT'&&src.status!=='active')return res.status(409).json({error:'Source account is inactive.'});
  if(type!=='DEPOSIT'&&src.balance<n)return res.status(409).json({error:`Insufficient available balance (₹${src.balance.toFixed(2)} available, requested ₹${n.toFixed(2)}).`});
  if(type==='TRANSFER'&&(!dst||dst.status!=='active'))return res.status(404).json({error:'Recipient account not found or inactive.'});
  if(type==='TRANSFER'&&src.id===dst.id)return res.status(400).json({error:'Source and recipient must be different accounts.'});
  if(type==='DEPOSIT'&&(!dst||dst.status!=='active'))return res.status(404).json({error:'Destination account not found or inactive.'});
  if(req.user.role==='CUSTOMER'&&type==='WITHDRAWAL')return res.status(403).json({error:'Counter cash withdrawals must be processed by bank staff.'});
  if(req.user.role==='CUSTOMER'&&source!==req.user.accountId&&type!=='DEPOSIT')return res.status(403).json({error:'You may only transact from your own account.'});
  if(req.user.role==='REGIONAL_MANAGER'){
    const regBranchIds=state.branches.filter(b=>b.regionId===req.user.regionId).map(b=>b.id);
    const targetBranchId=type==='DEPOSIT'?dst?.branchId:src?.branchId;
    if(!regBranchIds.includes(targetBranchId))return res.status(403).json({error:'Regional managers can only process deposits / withdrawals for accounts within their assigned region.'});
  }
  if(req.user.role==='BRANCH_MANAGER'){
    const myBranch=state.branches.find(b=>b.id===req.user.branchId);
    const regBranchIds=state.branches.filter(b=>b.regionId===myBranch?.regionId).map(b=>b.id);
    const targetBranchId=type==='DEPOSIT'?dst?.branchId:src?.branchId;
    if(!regBranchIds.includes(targetBranchId))return res.status(403).json({error:'Branch managers can only process deposits / withdrawals for accounts within their assigned region.'});
  }

  if(Boolean(tamper)){
    const tx={
      id:`TX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      type,
      source:source||null,
      destination:destination||null,
      amount:Number(n.toFixed(2)),
      status:'FAILED',
      tampered:true,
      failureReason:'Cryptographic Integrity Check Failed (AES-256-GCM Tag Mismatch: Tampered payload rejected)',
      createdAt:new Date().toISOString(),
      initiator:req.user.name,
      reference:String(reference?`${reference} [TAMPERED]`:'Tampered payment (REJECTED)').slice(0,120),
      idempotencyKey:key
    };
    state.transactions.unshift(tx);
    state.security.unshift({id:crypto.randomUUID(),type:'INTEGRITY_TAMPER_DETECTED',result:'REJECTED',at:new Date().toISOString(),detail:`Tampered transaction payload rejected for account ${source}. Cryptographic tag mismatch. Zero funds moved.`});
    audit(req.user,'TRANSACTION_TAMPER_REJECTED',tx.id,'BLOCKED');
    return res.status(201).json({transaction:tx,rejected:true,balances:state.accounts.map(a=>({id:a.id,balance:a.balance})),ledgerEntries:[],error:'Transaction rejected: Tampered payload failed cryptographic integrity verification.'});
  }

  const tx={id:`TX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,type,source:source||null,destination:destination||null,amount:Number(n.toFixed(2)),status:'COMPLETED',tampered:false,createdAt:new Date().toISOString(),initiator:req.user.name,reference:String(reference).slice(0,120),idempotencyKey:key};
  if(type==='TRANSFER'){src.balance=Number((src.balance-n).toFixed(2));dst.balance=Number((dst.balance+n).toFixed(2));state.ledger.push({id:crypto.randomUUID(),transactionId:tx.id,accountId:src.id,type:'DEBIT',amount:n},{id:crypto.randomUUID(),transactionId:tx.id,accountId:dst.id,type:'CREDIT',amount:n});}
  if(type==='WITHDRAWAL'){src.balance=Number((src.balance-n).toFixed(2));state.ledger.push({id:crypto.randomUUID(),transactionId:tx.id,accountId:src.id,type:'DEBIT',amount:n});}
  if(type==='DEPOSIT'){dst.balance=Number((dst.balance+n).toFixed(2));state.ledger.push({id:crypto.randomUUID(),transactionId:tx.id,accountId:dst.id,type:'CREDIT',amount:n});}
  state.transactions.unshift(tx);audit(req.user,`${type}_COMMITTED`,tx.id);
  res.status(201).json({transaction:tx,balances:state.accounts.map(a=>({id:a.id,balance:a.balance})),ledgerEntries:state.ledger.filter(e=>e.transactionId===tx.id)});
});
app.get('/api/network/topology',auth,(req,res)=>res.json({nodes:state.nodes,links:state.links}));
app.patch('/api/network/links/:id',auth,allow('HQ_ADMIN'),(req,res)=>{const link=state.links.find(l=>l.id===req.params.id);if(!link)return res.status(404).json({error:'Link not found.'});if(req.body.status&&!['online','offline'].includes(req.body.status))return res.status(400).json({error:'Status must be online or offline.'});if(req.body.status)link.status=req.body.status;if(req.body.latency!==undefined){const x=Number(req.body.latency);if(!Number.isFinite(x)||x<1||x>2000)return res.status(400).json({error:'Latency must be between 1 and 2000 ms.'});link.latency=x;}if(req.body.loss!==undefined){const x=Number(req.body.loss);if(!Number.isFinite(x)||x<0||x>1)return res.status(400).json({error:'Packet loss must be between 0 and 1.'});link.loss=x;}audit(req.user,'NETWORK_LINK_UPDATED',link.id);state.security.unshift({id:crypto.randomUUID(),type:'NETWORK_LINK_CHANGED',result:link.status==='offline'?'OFFLINE':'ONLINE',at:new Date().toISOString(),detail:`Link ${link.id} (${link.from} ↔ ${link.to}) status updated to ${link.status}. Latency: ${link.latency}ms.`});res.json({link});});
app.patch('/api/network/nodes/:id',auth,allow('HQ_ADMIN'),(req,res)=>{const node=state.nodes.find(n=>n.id===req.params.id);if(!node)return res.status(404).json({error:'Node not found.'});if(req.body.status&&!['online','offline'].includes(req.body.status))return res.status(400).json({error:'Status must be online or offline.'});if(req.body.status)node.status=req.body.status;audit(req.user,'NETWORK_NODE_UPDATED',node.id);res.json({node});});
app.post('/api/simulations',auth,(req,res)=>{
  const {source,destination,sourceId,targetId,lossOverride,seed,transactionId,tamper=false,amount,reference}=req.body||{};
  if(lossOverride!==undefined&&(!Number.isFinite(Number(lossOverride))||lossOverride<0||lossOverride>1))return res.status(400).json({error:'Loss override must be between 0 and 1.'});
  const from=sourceId||source||(req.user.role==='CUSTOMER'?(req.user.nodeId||accountToNode[req.user.accountId]||'CUST-01'):'CUST-01');
  const to=targetId||destination||'CUST-02';
  const srcAccId=nodeToAccount[from]||from,dstAccId=nodeToAccount[to]||to;
  let srcAcc=state.accounts.find(a=>a.id===srcAccId),dstAcc=state.accounts.find(a=>a.id===dstAccId);
  const n=amount!==undefined&&amount!==''&&amount!==null?Number(amount):null;
  if(n!==null){
    if(!Number.isFinite(n)||n<=0||n>1000000)return res.status(400).json({error:'Amount must be greater than ₹0 and no more than ₹10,00,000.'});
    if(!srcAcc||!dstAcc)return res.status(404).json({error:'Customer accounts not found for the selected endpoints.'});
    if(req.user.role==='CUSTOMER'&&req.user.accountId!==srcAcc.id)return res.status(403).json({error:'You may only initiate transfers from your own customer account.'});
    if(req.user.role==='BRANCH_MANAGER'&&srcAcc.branchId!==req.user.branchId)return res.status(403).json({error:`You may only initiate transfers from customer accounts in your bank branch (${req.user.branchId}).`});
    if(srcAcc.id===dstAcc.id)return res.status(400).json({error:'Source and destination must be different customers.'});
    if(srcAcc.balance<n)return res.status(409).json({error:`Insufficient available balance (₹${srcAcc.balance.toFixed(2)} available, requested ₹${n.toFixed(2)}).`});
  }
  const simSourceNode=accountToNode[from]||from;
  const simDestNode=accountToNode[to]||to;
  const sim=simulate(state,{source:simSourceNode,destination:simDestNode,lossOverride:lossOverride===undefined?undefined:Number(lossOverride),seed:Number.isInteger(seed)?seed:Math.floor(Math.random()*100000),transactionId:typeof transactionId==='string'?transactionId:undefined,tamper:Boolean(tamper),amount:n,reference});
  if(n!==null&&srcAcc&&dstAcc){
    if(sim.status==='COMPLETED'){
      const tx={id:`TX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,type:'TRANSFER',source:srcAcc.id,destination:dstAcc.id,amount:Number(n.toFixed(2)),status:'COMPLETED',tampered:false,createdAt:new Date().toISOString(),initiator:req.user.name,reference:String(reference||'Customer network transfer').slice(0,120),simulationId:sim.id};
      srcAcc.balance=Number((srcAcc.balance-n).toFixed(2));dstAcc.balance=Number((dstAcc.balance+n).toFixed(2));
      state.ledger.push({id:crypto.randomUUID(),transactionId:tx.id,accountId:srcAcc.id,type:'DEBIT',amount:n},{id:crypto.randomUUID(),transactionId:tx.id,accountId:dstAcc.id,type:'CREDIT',amount:n});
      state.transactions.unshift(tx);sim.transactionId=tx.id;audit(req.user,'TRANSFER_COMMITTED',tx.id);
    }else if(sim.status==='BLOCKED'){
      const tx={id:`TX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,type:'TRANSFER',source:srcAcc.id,destination:dstAcc.id,amount:Number(n.toFixed(2)),status:'FAILED',tampered:true,failureReason:'Cryptographic Integrity Failure: Modified packet blocked by AES-256-GCM authentication tag',createdAt:new Date().toISOString(),initiator:req.user.name,reference:String(reference||'Customer transfer (BLOCKED: Tamper)').slice(0,120),simulationId:sim.id};
      state.transactions.unshift(tx);sim.transactionId=tx.id;
      state.security.unshift({id:crypto.randomUUID(),type:'INTEGRITY_TAMPER_DETECTED',result:'BLOCKED',at:new Date().toISOString(),detail:`Modified packet blocked at router ${sim.blockedAt||'core'} by AES-256-GCM authentication tag. Zero money moved.`});
      audit(req.user,'PACKET_TAMPER_BLOCKED',sim.id,'BLOCKED');
    }else if(sim.status==='FAILED'){
      const tx={id:`TX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,type:'TRANSFER',source:srcAcc.id,destination:dstAcc.id,amount:Number(n.toFixed(2)),status:'FAILED',tampered:false,failureReason:'Network delivery failure: Maximum retries reached due to packet loss',createdAt:new Date().toISOString(),initiator:req.user.name,reference:String(reference||'Customer transfer (FAILED: Packet loss)').slice(0,120),simulationId:sim.id};
      state.transactions.unshift(tx);sim.transactionId=tx.id;audit(req.user,'TRANSFER_FAILED_NETWORK_LOSS',sim.id,'FAILED');
    }
  }else{audit(req.user,'SIMULATION_STARTED',sim.id,sim.status);}
  res.status(201).json({simulation:sim,balances:state.accounts.map(a=>({id:a.id,balance:a.balance}))});
});
app.get('/api/simulations',auth,(req,res)=>res.json({simulations:state.simulations}));
app.get('/api/simulations/:id',auth,(req,res)=>{const sim=state.simulations.find(s=>s.id===req.params.id);if(!sim)return res.status(404).json({error:'Simulation not found.'});res.json({simulation:sim});});
app.get('/api/simulations/:id/pcap',(req,res)=>{
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'')||req.query.token;
  const user=sessions.get(token);
  if(!user)return res.status(401).json({error:'Please sign in to continue.'});
  const sim=state.simulations.find(s=>s.id===req.params.id);
  if(!sim)return res.status(404).json({error:'Simulation not found.'});
  const buffer=generateSimulationPcap(sim,state);
  res.setHeader('Content-Type','application/vnd.tcpdump.pcap');
  res.setHeader('Content-Disposition',`attachment; filename="paysafe-${sim.id.toLowerCase()}.pcap"`);
  res.setHeader('Content-Length',buffer.length);
  res.send(buffer);
});
app.get('/api/simulations/:id/dissect',auth,(req,res)=>{
  const sim=state.simulations.find(s=>s.id===req.params.id);
  if(!sim)return res.status(404).json({error:'Simulation not found.'});
  const frames=getDissectedFramesSummary(sim,state);
  res.json({simulationId:sim.id,status:sim.status,framesCount:frames.length,frames});
});
app.post('/api/security/tamper-demo',auth,(req,res)=>{const original={transactionId:`TEST-${crypto.randomBytes(3).toString('hex')}`,amount:1250,currency:'INR',purpose:'educational integrity test'};const key=crypto.randomBytes(32),iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const ciphertext=Buffer.concat([cipher.update(JSON.stringify(original),'utf8'),cipher.final()]);const tag=cipher.getAuthTag();const tampered=Buffer.from(ciphertext);if(tampered.length)tampered[0]^=1;let verified=false;try{const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);decipher.update(tampered);decipher.final();verified=true;}catch{}const event={id:crypto.randomUUID(),type:'INTEGRITY_TAMPER_DETECTED',result:verified?'UNEXPECTED_PASS':'REJECTED',at:new Date().toISOString(),detail:'Modified ciphertext rejected by AES-256-GCM authentication tag.'};state.security.unshift(event);audit(req.user,'TAMPERING_DEMO',event.id,verified?'WARNING':'BLOCKED');res.json({algorithm:'AES-256-GCM',payload:original,alteredPayloadDetected:!verified,integrity:verified?'FAILED_TO_DETECT':'FAILED_AS_EXPECTED',financialDataChanged:false,event});});
app.get('/api/audit',auth,allow('HQ_ADMIN','REGIONAL_MANAGER'),(req,res)=>{
  let events=state.audit;
  let security=state.security;
  if(req.user.role==='REGIONAL_MANAGER'){
    security=security.filter(e=>/tamper|mismatch|tag|cipher|link|router|blocked/i.test(e.type+' '+e.detail));
    events=events.filter(e=>/link|tamper|security|simulation/i.test(e.action+' '+e.resource));
  }
  res.json({events,security});
});
const frontendDir = fileURLToPath(new URL('../../frontend', import.meta.url));
const indexHtml = fileURLToPath(new URL('../../frontend/index.html', import.meta.url));
app.use(express.static(frontendDir));
app.get('/{*path}', (req, res) => res.sendFile(indexHtml));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Unexpected server error. Please retry.'});});
app.listen(PORT,()=>console.log(`NetBankX Banking Lab running at http://localhost:${PORT}`));
