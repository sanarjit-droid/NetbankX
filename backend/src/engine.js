import crypto from 'node:crypto';

export function shortestPath(nodes, links, start, end) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (!byId.has(start) || !byId.has(end) || byId.get(start).status !== 'online' || byId.get(end).status !== 'online') return null;
  const dist = new Map(nodes.map(n => [n.id, Infinity]));
  const prev = new Map(); const visited = new Set(); dist.set(start, 0);
  while (visited.size < nodes.length) {
    let u = null, best = Infinity;
    for (const n of nodes) if (!visited.has(n.id) && dist.get(n.id) < best) { best = dist.get(n.id); u = n.id; }
    if (u === null || u === end) break;
    visited.add(u);
    const edges = links.filter(l => l.status === 'online' && (l.from === u || l.to === u)).sort((a,b)=>a.id.localeCompare(b.id));
    for (const e of edges) {
      const v = e.from === u ? e.to : e.from; if (byId.get(v)?.status !== 'online' || visited.has(v)) continue;
      const cost = dist.get(u) + e.latency;
      if (cost < dist.get(v)) { dist.set(v,cost); prev.set(v,u); }
    }
  }
  if (!Number.isFinite(dist.get(end))) return null;
  const path=[]; for(let at=end; at; at=prev.get(at)){path.unshift(at); if(at===start)break;}
  return path[0] === start ? {path, latency:dist.get(end)} : null;
}

export function seedState() {
 const regions=[
   {id:'REG-A',name:'Northern Region'},
   {id:'REG-B',name:'Central Region'},
   {id:'REG-C',name:'Southern Region'}
 ];
 const branches=[
   {id:'BR-A1',name:'Hyderabad Central',regionId:'REG-A'},
   {id:'BR-A2',name:'Secunderabad',regionId:'REG-A'},
   {id:'BR-B1',name:'Bengaluru Main',regionId:'REG-B'},
   {id:'BR-B2',name:'Mysuru City',regionId:'REG-B'},
   {id:'BR-C1',name:'Chennai Marina',regionId:'REG-C'},
   {id:'BR-C2',name:'Vellore Campus',regionId:'REG-C'}
 ];
 const nodes=[
   // Level 0: 1 Headquarter Core Router
   {id:'HQ-CORE',name:'NetBankX HQ Core Router',type:'hq',level:0,status:'online'},

   // Level 1: 3 Regional Routers
   {id:'REG-A',name:'Northern Region Router',type:'region',level:1,status:'online'},
   {id:'REG-B',name:'Central Region Router',type:'region',level:1,status:'online'},
   {id:'REG-C',name:'Southern Region Router',type:'region',level:1,status:'online'},

   // Level 2: 2 Bank Branches in each region (6 banks total)
   {id:'BR-A1',name:'Hyderabad Central',type:'branch',level:2,regionId:'REG-A',status:'online'},
   {id:'BR-A2',name:'Secunderabad',type:'branch',level:2,regionId:'REG-A',status:'online'},
   {id:'BR-B1',name:'Bengaluru Main',type:'branch',level:2,regionId:'REG-B',status:'online'},
   {id:'BR-B2',name:'Mysuru City',type:'branch',level:2,regionId:'REG-B',status:'online'},
   {id:'BR-C1',name:'Chennai Marina',type:'branch',level:2,regionId:'REG-C',status:'online'},
   {id:'BR-C2',name:'Vellore Campus',type:'branch',level:2,regionId:'REG-C',status:'online'},

   // Level 3: 3 Customers in each bank (18 customers total)
   // BR-A1 (Northern Region)
   {id:'CUST-01',name:'Aarav Mehta',type:'customer',level:3,branchId:'BR-A1',regionId:'REG-A',status:'online'},
   {id:'CUST-02',name:'Ishita Reddy',type:'customer',level:3,branchId:'BR-A1',regionId:'REG-A',status:'online'},
   {id:'CUST-03',name:'Vivaan Rao',type:'customer',level:3,branchId:'BR-A1',regionId:'REG-A',status:'online'},

   // BR-A2 (Northern Region)
   {id:'CUST-04',name:'Saanvi Shah',type:'customer',level:3,branchId:'BR-A2',regionId:'REG-A',status:'online'},
   {id:'CUST-05',name:'Reyansh Patel',type:'customer',level:3,branchId:'BR-A2',regionId:'REG-A',status:'online'},
   {id:'CUST-06',name:'Aadhya Iyer',type:'customer',level:3,branchId:'BR-A2',regionId:'REG-A',status:'online'},

   // BR-B1 (Central Region)
   {id:'CUST-07',name:'Kabir Rao',type:'customer',level:3,branchId:'BR-B1',regionId:'REG-B',status:'online'},
   {id:'CUST-08',name:'Myra Das',type:'customer',level:3,branchId:'BR-B1',regionId:'REG-B',status:'online'},
   {id:'CUST-09',name:'Vihaan Kumar',type:'customer',level:3,branchId:'BR-B1',regionId:'REG-B',status:'online'},

   // BR-B2 (Central Region)
   {id:'CUST-10',name:'Atharv Singh',type:'customer',level:3,branchId:'BR-B2',regionId:'REG-B',status:'online'},
   {id:'CUST-11',name:'Kiara Bose',type:'customer',level:3,branchId:'BR-B2',regionId:'REG-B',status:'online'},
   {id:'CUST-12',name:'Dhruv Nair',type:'customer',level:3,branchId:'BR-B2',regionId:'REG-B',status:'online'},

   // BR-C1 (Southern Region)
   {id:'CUST-13',name:'Anaya Iyer',type:'customer',level:3,branchId:'BR-C1',regionId:'REG-C',status:'online'},
   {id:'CUST-14',name:'Aanya Krishnan',type:'customer',level:3,branchId:'BR-C1',regionId:'REG-C',status:'online'},
   {id:'CUST-15',name:'Dev Malhotra',type:'customer',level:3,branchId:'BR-C1',regionId:'REG-C',status:'online'},

   // BR-C2 (Southern Region)
   {id:'CUST-16',name:'Diya Sharma',type:'customer',level:3,branchId:'BR-C2',regionId:'REG-C',status:'online'},
   {id:'CUST-17',name:'Rohan Bhat',type:'customer',level:3,branchId:'BR-C2',regionId:'REG-C',status:'online'},
   {id:'CUST-18',name:'Pia Anand',type:'customer',level:3,branchId:'BR-C2',regionId:'REG-C',status:'online'}
 ];
 const links=[
   // Level 0 -> Level 1 (Tree Links: HQ to 3 Regions)
   ['HQ-CORE','REG-A',20,5000],
   ['HQ-CORE','REG-B',18,5000],
   ['HQ-CORE','REG-C',22,5000],

   // Level 1 -> Level 2 (Tree Links: Regions to 2 Banks each)
   ['REG-A','BR-A1',12,1000],
   ['REG-A','BR-A2',14,1000],
   ['REG-B','BR-B1',11,1000],
   ['REG-B','BR-B2',13,1000],
   ['REG-C','BR-C1',12,1000],
   ['REG-C','BR-C2',10,1000],

   // Level 2 -> Level 3 (Tree Links: Banks to 3 Customers each)
   ['BR-A1','CUST-01',6,100],
   ['BR-A1','CUST-02',6,100],
   ['BR-A1','CUST-03',6,100],

   ['BR-A2','CUST-04',7,100],
   ['BR-A2','CUST-05',7,100],
   ['BR-A2','CUST-06',7,100],

   ['BR-B1','CUST-07',6,100],
   ['BR-B1','CUST-08',6,100],
   ['BR-B1','CUST-09',6,100],

   ['BR-B2','CUST-10',8,100],
   ['BR-B2','CUST-11',8,100],
   ['BR-B2','CUST-12',8,100],

   ['BR-C1','CUST-13',6,100],
   ['BR-C1','CUST-14',6,100],
   ['BR-C1','CUST-15',6,100],

   ['BR-C2','CUST-16',6,100],
   ['BR-C2','CUST-17',6,100],
   ['BR-C2','CUST-18',6,100],

   // Lateral backup trunks (higher latency so hierarchical tree is primary)
   ['REG-A','REG-B',40,1000],
   ['REG-B','REG-C',38,1000],
   ['BR-A1','BR-A2',25,500],
   ['BR-A2','BR-B1',45,500],
   ['BR-B1','BR-B2',25,500],
   ['BR-C1','BR-C2',25,500]
 ].map((x,i)=>({id:`L${i+1}`,from:x[0],to:x[1],latency:x[2],bandwidth:x[3],loss:0.02,status:'online'}));

 const customerSeed=[
   ['Aarav Mehta','BR-A1',128450.75],
   ['Ishita Reddy','BR-A1',64200.00],
   ['Vivaan Rao','BR-A1',88320.50],
   ['Saanvi Shah','BR-A2',55300.00],
   ['Reyansh Patel','BR-A2',78250.00],
   ['Aadhya Iyer','BR-A2',34600.00],
   ['Kabir Rao','BR-B1',94320.25],
   ['Myra Das','BR-B1',70450.00],
   ['Vihaan Kumar','BR-B1',116200.00],
   ['Atharv Singh','BR-B2',43200.00],
   ['Kiara Bose','BR-B2',69300.00],
   ['Dhruv Nair','BR-B2',105500.00],
   ['Anaya Iyer','BR-C1',51200.00],
   ['Aanya Krishnan','BR-C1',95800.00],
   ['Dev Malhotra','BR-C1',63700.00],
   ['Diya Sharma','BR-C2',76200.00],
   ['Rohan Bhat','BR-C2',38500.00],
   ['Pia Anand','BR-C2',81900.00]
 ];
 const accounts=customerSeed.map(([owner,branchId,balance],i)=>({
   id:`NBX-${String(100001+i).padStart(6,'0')}`,
   owner,
   branchId,
   balance,
   status:'active'
 }));
 const transactions=[
   {id:'TX-1048',type:'TRANSFER',source:'NBX-100001',destination:'NBX-100002',amount:2500,status:'COMPLETED',createdAt:new Date(Date.now()-3600000).toISOString(),initiator:'Aarav Mehta',reference:'University fees'},
   {id:'TX-1047',type:'DEPOSIT',source:null,destination:'NBX-100001',amount:15000,status:'COMPLETED',createdAt:new Date(Date.now()-7200000).toISOString(),initiator:'Branch staff',reference:'Teller deposit'},
   {id:'TX-1046',type:'WITHDRAWAL',source:'NBX-100003',destination:null,amount:4000,status:'COMPLETED',createdAt:new Date(Date.now()-10800000).toISOString(),initiator:'Vivaan Rao',reference:'ATM simulation'},
   {id:'TX-1045',type:'TRANSFER',source:'NBX-100003',destination:'NBX-100001',amount:1250,status:'FAILED',createdAt:new Date(Date.now()-14400000).toISOString(),initiator:'Vivaan Rao',reference:'Utility split'}
 ];
 const audit=[
   {id:'AUD-101',actor:'Nihar — Demo Admin',role:'HQ_ADMIN',action:'NETWORK_LINK_VERIFIED',resource:'Link L1 (HQ-CORE ↔ REG-A)',outcome:'SUCCESS',at:new Date(Date.now()-7200000).toISOString()},
   {id:'AUD-102',actor:'Nihar — Demo Admin',role:'HQ_ADMIN',action:'NETWORK_LINK_VERIFIED',resource:'Link L4 (REG-A ↔ BR-A1)',outcome:'SUCCESS',at:new Date(Date.now()-5400000).toISOString()},
   {id:'AUD-103',actor:'Adversary Transit Interceptor',role:'SYSTEM',action:'PACKET_TAMPER_DETECTED',resource:'SIM-PKT-084',outcome:'BLOCKED',at:new Date(Date.now()-3600000).toISOString()},
   {id:'AUD-104',actor:'Nihar — Demo Admin',role:'HQ_ADMIN',action:'NETWORK_LINK_UPDATED',resource:'Link L27 (REG-A ↔ REG-B)',outcome:'SUCCESS',at:new Date(Date.now()-1800000).toISOString()}
 ];
 const security=[
   {id:'SEC-101',type:'INTEGRITY_TAMPER_DETECTED',result:'BLOCKED',at:new Date(Date.now()-3600000).toISOString(),detail:'Modified packet ciphertext bits detected at router REG-A via AES-256-GCM authentication tag mismatch. Packet halted, transaction rejected with ₹0 moved.'},
   {id:'SEC-102',type:'NETWORK_LINK_CHANGED',result:'ONLINE',at:new Date(Date.now()-1800000).toISOString(),detail:'Link L27 (REG-A ↔ REG-B) lateral backup trunk verified online. Latency: 40ms.'},
   {id:'SEC-103',type:'NETWORK_LINK_CHANGED',result:'ONLINE',at:new Date(Date.now()-5400000).toISOString(),detail:'Link L4 (REG-A ↔ BR-A1) regional branch link verified online. Latency: 12ms.'},
   {id:'SEC-104',type:'NETWORK_LINK_CHANGED',result:'ONLINE',at:new Date(Date.now()-7200000).toISOString(),detail:'Link L1 (HQ-CORE ↔ REG-A) primary backbone trunk online. 40 Gbps interface active.'}
 ];
 return {regions,branches,nodes,links,accounts,transactions,ledger:[{id:'LE-1',transactionId:'TX-1048',accountId:'NBX-100001',type:'DEBIT',amount:2500},{id:'LE-2',transactionId:'TX-1048',accountId:'NBX-100002',type:'CREDIT',amount:2500}],simulations:[],events:[],audit,security};
}
export function simulate(state, {source='CUST-01', destination='CUST-02', lossOverride, seed, transactionId, tamper=false, amount, reference}={}) {
 const route=shortestPath(state.nodes,state.links,source,destination); const id=`SIM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
 const sim={id,source,destination,amount:amount?Number(amount):null,reference:reference||null,tampered:Boolean(tamper),blockedAt:null,transactionId:transactionId||null,route:route?.path||[],status:route?'RUNNING':'FAILED',createdAt:new Date().toISOString(),latency:route?.latency??null,packetsSent:0,packetsDelivered:0,packetsLost:0,retries:0,events:[],seed:seed??42}; state.simulations.unshift(sim);
 const push=(type,extra={})=>{const ev={id:crypto.randomUUID(),simulationId:id,type,timestamp:new Date().toISOString(),...extra};sim.events.push(ev);state.events.unshift(ev);};
 if(!route){push('simulation.failed',{reason:'No active route exists between the selected endpoints.'});sim.durationMs=0;sim.packetLossRate=0;sim.hops=0;return sim;}
 let rng=(sim.seed>>>0)||1; const random=()=>{rng=(1664525*rng+1013904223)>>>0;return rng/4294967296;};
 const maxRetries=2; let success=true;
 push('simulation.created',{route:route.path,configuredLatencyMs:route.latency,amount:sim.amount,tampered:sim.tampered});
 push('source.packet_created',{nodeId:source,detail:`Packet prepared & encrypted with AES-256-GCM at ${source} endpoint (${sim.amount?'₹'+sim.amount:'N/A'}). Commencing hop journey.`});
 const tamperHopIndex = tamper ? Math.min(route.path.length-2, Math.max(1, Math.floor((route.path.length-1)/2))) : -1;
 for(let i=0;i<route.path.length-1;i++){
   const from=route.path[i],to=route.path[i+1],link=state.links.find(l=>l.status==='online'&&((l.from===from&&l.to===to)||(l.to===from&&l.from===to)));
   if(!link){success=false;push('packet.blocked',{from,to,reason:'Link unavailable'});break;}
   let delivered=false;
   for(let attempt=0;attempt<=maxRetries;attempt++){
     sim.packetsSent++;push('packet.forwarded',{from,to,attempt:attempt+1,latencyMs:link.latency,bandwidthMbps:link.bandwidth,detail:`Transmitted over link ${from} → ${to} (${link.latency} ms, ${link.bandwidth} Mbps)`});
     if(random()<(lossOverride??link.loss)){sim.packetsLost++;if(attempt<maxRetries){sim.retries++;push('packet.retrying',{from,to,attempt:attempt+1,detail:`Packet loss detected on link ${from} → ${to}. Retrying hop...`});continue;}push('packet.dropped',{from,to,attempt:attempt+1,reason:'Maximum retries reached on lossy link'});}
     else {delivered=true;break;}
   }
   if(!delivered){success=false;break;}
   if(tamper && i===tamperHopIndex){
     sim.blockedAt=to;
     push('packet.tampered',{at:from,to,detail:`Adversary intercepted packet and modified ciphertext bits in transit between ${from} and ${to} (Simulated Man-in-the-Middle).`});
     push('integrity.failed',{node:to,algorithm:'AES-256-GCM',result:'REJECTED',detail:`Authentication tag mismatch at router ${to}. Modified ciphertext detected and rejected by receiving router.`});
     push('packet.blocked',{at:to,reason:`Packet blocked and dropped by router ${to} integrity policy. Forwarding halted.`});
     success=false;
     break;
   }
 }
 if(sim.blockedAt){
   sim.status='BLOCKED';
   push('simulation.blocked',{reason:`Transaction packet blocked at router ${sim.blockedAt} due to authentication tag mismatch. Financial balances unchanged.`,financialDataChanged:false});
 } else if(success){
   sim.status='COMPLETED';sim.packetsDelivered=1;
   push('packet.delivered',{destination,route:route.path,detail:`Packet reached destination customer endpoint ${destination}.`});
   push('integrity.verified',{algorithm:'AES-256-GCM authentication tag verified',result:'PASS',detail:'Receiving router confirmed cryptographic authentication tag. Payload valid.'});
   push('ledger.committed',{detail:`Ledger transfer committed for destination customer account.`});
 } else {
   sim.status='FAILED';push('simulation.failed',{reason:'Delivery failed after retry policy or route failure.'});
 }
 sim.durationMs=sim.events.reduce((n,e)=>n+(e.latencyMs||0),0);sim.packetLossRate=sim.packetsSent?Number((sim.packetsLost/sim.packetsSent*100).toFixed(1)):0;sim.hops=Math.max(0,route.path.length-1);return sim;
}
