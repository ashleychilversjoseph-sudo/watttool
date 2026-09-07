import type { CalculationResult, CalculatorDefinition, FieldOption } from '../types';

const n = (v: Record<string, string>, key: string) => Number(v[key]);
const f = (x: number, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '—';
const result = (headline: string, summary: string, rows: CalculationResult['rows'], warning?: string): CalculationResult => ({ headline, summary, rows, warning });
const opts = (items: Array<string | number>): FieldOption[] => items.map((value) => ({ label: String(value), value: String(value) }));
const sizes = [1, 1.5, 2.5, 4, 6, 10, 16, 25];
const rpm: Record<number, number> = { 1: 18.1, 1.5: 12.1, 2.5: 7.41, 4: 4.61, 6: 3.08, 10: 1.83, 16: 1.15, 25: .727 };
const ratings: Record<string, number[]> = { C: [16,20,27,37,47,64,85,112], A: [11,14.5,20,26,32,44,57,75], B: [13,16.5,23,30,38,51,68,89], I: [13,16,21,27,34,45,57,71], D: [18,22,29,38,47,63,81,104] };
const methods: Record<string, string> = { C: 'Method C · clipped direct', A: 'Method A · insulated wall', B: 'Method B · conduit on wall', I: 'Method 100 · thermal insulation', D: 'Method D · buried' };
const mv1 = [44,29,18,11,7.3,4.4,2.8,1.75];
const mv3 = [38,25,15,9.5,6.4,3.8,2.4,1.5];
const cpc: Record<number, number> = { 1:1, 1.5:1, 2.5:1.5, 4:1.5, 6:2.5, 10:4, 16:6, 25:10 };
const amb: Record<string, number> = { '25':1.03, '30':1, '35':.94, '40':.87, '45':.79, '50':.71 };
const grouping: Record<string, number> = { '1':1, '2':.8, '3':.7, '4':.65, '6':.57 };
const multiple: Record<string, number> = { B:5, C:10, D:20 };
const deviceName: Record<string, string> = { B:'Type B MCB/RCBO', C:'Type C MCB/RCBO', D:'Type D MCB/RCBO', F:'BS 3036 fuse' };
const devices = [6,10,16,20,25,32,40,50,63,80,100,125];
const checkbox = (key: string, label: string, checked = true) => ({ key, label, type: 'checkbox' as const, defaultValue: checked ? 'true' : 'false', required: false });

export const calculators: CalculatorDefinition[] = [
  { id:'diversity', title:'Diversity', subtitle:'Multi-circuit maximum demand', category:'Design', icon:'Gauge', accent:'#0c85ff', fields:[], calculate:() => result('Add circuits','Build a circuit schedule to calculate demand',[]) },
  {
    id:'cable', title:'Cable sizing', subtitle:'Full design, derating, volt drop and Zs', category:'Design', icon:'Cable', accent:'#03b9dc',
    fields:[
      { key:'reference', label:'Circuit reference', type:'text', defaultValue:'', required:false, placeholder:'e.g. DB1/6' },
      { key:'arrangement', label:'Circuit arrangement', type:'select', defaultValue:'radial', options:[{label:'Radial',value:'radial'},{label:'Ring final',value:'ring'}] },
      { key:'phase', label:'Supply', type:'select', defaultValue:'1', options:[{label:'230 V single phase',value:'1'},{label:'400 V three phase',value:'3'}] },
      { key:'load', label:'Connected load', min:.01, defaultValue:'7.4' },
      { key:'unit', label:'Load unit', type:'select', defaultValue:'kW', options:[{label:'kilowatts (kW)',value:'kW'},{label:'amps (A)',value:'A'}] },
      { key:'length', label:'One-way run length', unit:'m', min:.1, defaultValue:'18' },
      { key:'method', label:'Installation method', type:'select', defaultValue:'C', options:Object.entries(methods).map(([value,label])=>({value,label})) },
      { key:'cable', label:'Cable construction', type:'select', defaultValue:'te', options:[{label:'Flat twin & earth',value:'te'},{label:'SWA / full-size CPC',value:'swa'},{label:'Singles in conduit',value:'singles'}] },
      { key:'material', label:'Conductor material', type:'select', defaultValue:'cu', options:[{label:'Copper',value:'cu'},{label:'Aluminium',value:'al'}] },
      { key:'insulation', label:'Insulation', type:'select', defaultValue:'pvc', options:[{label:'70 °C PVC',value:'pvc'},{label:'90 °C XLPE',value:'xlpe'}] },
      { key:'ambient', label:'Ambient temperature', unit:'°C', type:'select', defaultValue:'30', options:opts([25,30,35,40,45,50]) },
      { key:'grouping', label:'Grouped circuits', type:'select', defaultValue:'1', options:opts([1,2,3,4,6]) },
      { key:'device', label:'Protective device', type:'select', defaultValue:'B', options:Object.entries(deviceName).map(([value,label])=>({value,label})) },
      { key:'deviceRating', label:'Device rating', unit:'A', type:'select', defaultValue:'auto', options:[{label:'Automatic',value:'auto'},...opts(devices)] },
      { key:'earth', label:'Earthing arrangement', type:'select', defaultValue:'tncs', options:[{label:'TN-C-S / PME',value:'tncs'},{label:'TN-S',value:'tns'},{label:'TT',value:'tt'}] },
      { key:'ze', label:'Ze at board', unit:'Ω', min:0, step:.01, defaultValue:'.35' },
      { key:'vdLimit', label:'Voltage-drop limit', unit:'%', min:.1, max:10, defaultValue:'5' },
    ],
    calculate:(v)=>{
      const three=v.phase==='3', supply=three?400:230, ring=v.arrangement==='ring';
      const ib=v.unit==='A'?n(v,'load'):n(v,'load')*1000/(three?400*Math.sqrt(3):230);
      const list=v.device==='F'?[5,15,20,30,45,60,100]:devices;
      const protective=v.deviceRating==='auto'?(list.find(x=>x>=ib)??list.at(-1)!):n(v,'deviceRating');
      const correction=amb[v.ambient]*grouping[v.grouping]*(v.device==='F'?.725:1);
      const required=(ring?protective*.67:protective)/correction;
      const table=ratings[v.method].map(x=>x*(v.insulation==='xlpe'?1.2:1)*(v.material==='al'?.78:1));
      let index=table.findIndex(x=>x>=required); if(index<0) index=sizes.length-1;
      const drops=three?mv3:mv1, limit=supply*n(v,'vdLimit')/100, ringFactor=ring?.25:1;
      while(index<sizes.length-1&&drops[index]*ib*n(v,'length')*ringFactor/1000>limit) index++;
      const size=sizes[index], drop=drops[index]*ib*n(v,'length')*ringFactor/1000, cpcSize=v.cable==='te'?cpc[size]:size;
      const r12=(rpm[size]+rpm[cpcSize])*1.2*ringFactor*n(v,'length')/1000, zs=n(v,'ze')+r12;
      const maxZs=multiple[v.device]?218.5/(multiple[v.device]*protective):undefined;
      return result(`${size===1?'1.0':size} mm²`,'Indicative cable size after capacity and voltage-drop checks',[
        {label:'Design current Ib',value:`${f(ib,1)} A`},{label:'Protective device In',value:`${protective} A ${deviceName[v.device]}`},
        {label:'Combined factors Ca × Cg × Cf',value:f(correction)},{label:'Required tabulated rating It',value:`${f(required,1)} A`},
        {label:'Tabulated capacity',value:`${f(table[index],1)} A`},{label:'Voltage drop',value:`${f(drop)} V · ${f(drop/supply*100,1)}%`},
        {label:'CPC',value:`${cpcSize} mm²`},{label:'R1 + R2 at 70 °C',value:`${f(r12)} Ω`},{label:'Estimated Zs',value:`${f(zs)} Ω${maxZs?` · ${zs<=maxZs?'PASS':'CHECK'} vs ${f(maxZs)} Ω`:''}`},
      ],'Verify the selected cable and device against current BS 7671 tables and actual site conditions.');
    },
  },
  {
    id:'zs-pfc', title:'Ze, Zs & PFC', subtitle:'Loop impedance, fault current and limit check', category:'Testing', icon:'Activity', accent:'#0c85ff',
    fields:[{key:'ze',label:'External loop impedance Ze',unit:'Ω',min:0,step:.01,defaultValue:'.35'},{key:'r1r2',label:'R1 + R2',unit:'Ω',min:0,step:.01,defaultValue:'.42'},
      {key:'curve',label:'Protective device',type:'select',defaultValue:'B',options:[{label:'Type B MCB/RCBO',value:'B'},{label:'Type C MCB/RCBO',value:'C'},{label:'Type D MCB/RCBO',value:'D'}]},
      {key:'rating',label:'Device rating',unit:'A',type:'select',defaultValue:'32',options:opts(devices)},checkbox('rule80','Apply the 80% design rule')],
    calculate:(v)=>{const zs=n(v,'ze')+n(v,'r1r2'),pfc=230/zs,pscc=230/n(v,'ze'),table=218.5/(multiple[v.curve]*n(v,'rating')),max=table*(v.rule80==='true'?.8:1),pass=zs<=max;
      return result(`${f(zs)} Ω`,pass?'PASS · estimated Zs is inside the selected limit':'CHECK · estimated Zs exceeds the selected limit',[
        {label:'Maximum Zs used',value:`${f(max)} Ω`},{label:'Prospective fault current Ipf',value:pfc>=1000?`${f(pfc/1000)} kA`:`${f(pfc,1)} A`},
        {label:'Prospective short-circuit current',value:pscc>=1000?`${f(pscc/1000)} kA`:`${f(pscc,1)} A`},{label:'Working',value:`Zs = ${f(n(v,'ze'))} + ${f(n(v,'r1r2'))}; 218.5 ÷ (${n(v,'rating')} × ${multiple[v.curve]})${v.rule80==='true'?' × 0.8':''}`},
      ],'Use measured values and confirm the exact maximum Zs in current device data.');},
  },
  {
    id:'r1r2', title:'R1 + R2', subtitle:'Radial estimate and ring-final checks', category:'Testing', icon:'Waypoints', accent:'#03b9dc',
    fields:[{key:'mode',label:'Test mode',type:'select',defaultValue:'radial',options:[{label:'Radial / conductor estimate',value:'radial'},{label:'Ring final cross-connection',value:'ring'}]},
      {key:'length',label:'Run length',unit:'m',min:.1,defaultValue:'22',showWhen:{key:'mode',equals:'radial'}},{key:'line',label:'Line conductor',unit:'mm²',type:'select',defaultValue:'2.5',options:opts(sizes)},
      {key:'cpc',label:'CPC conductor',unit:'mm²',type:'select',defaultValue:'1.5',options:opts(sizes)},{...checkbox('hot','Apply 1.20 temperature factor'),showWhen:{key:'mode',equals:'radial'}},
      {key:'ringR1',label:'End-to-end r1',unit:'Ω',min:.001,defaultValue:'.62',showWhen:{key:'mode',equals:'ring'}},{key:'ringRn',label:'End-to-end rn',unit:'Ω',min:.001,defaultValue:'.63',showWhen:{key:'mode',equals:'ring'}},{key:'ringR2',label:'End-to-end r2',unit:'Ω',min:.001,defaultValue:'1.02',showWhen:{key:'mode',equals:'ring'}}],
    calculate:(v)=>{if(v.mode==='ring'){const r1=n(v,'ringR1'),rn=n(v,'ringRn'),r2=n(v,'ringR2'),total=(r1+r2)/4,neutral=(r1+rn)/4,ratio=r2/r1,expected=rpm[n(v,'cpc')]/rpm[n(v,'line')],balance=Math.abs(r1-rn),length=r1*1000/rpm[n(v,'line')];
        return result(`${f(total)} Ω`,'Expected ring cross-connected R1 + R2',[{label:'Expected R1 + Rn',value:`${f(neutral)} Ω`},{label:'r1 / rn balance',value:`${f(balance)} Ω · ${balance<=.05?'GOOD':'CHECK'}`},{label:'r2 ÷ r1 ratio',value:`${f(ratio)} · expected ${f(expected)}`},{label:'Estimated ring length',value:`${f(length,1)} m`}],Math.abs(ratio-expected)/expected<=.15?'Cross-connected readings should sit within a few hundredths of these values.':'CPC ratio differs from the selected sizes. Check continuity and conductor selection.');}
      const factor=v.hot==='true'?1.2:1,r1=rpm[n(v,'line')]*factor*n(v,'length')/1000,r2=rpm[n(v,'cpc')]*factor*n(v,'length')/1000;
      return result(`${f(r1+r2)} Ω`,'Estimated radial R1 + R2',[{label:'R1',value:`${f(r1)} Ω`},{label:'R2',value:`${f(r2)} Ω`},{label:'Combined resistance per metre',value:`${f((rpm[n(v,'line')]+rpm[n(v,'cpc')])*factor)} mΩ/m`}],r1+r2>1?'Over 1 Ω — check the protective-device Zs limit.':'Carry this value into the Zs tool for its device check.');},
  },
  {
    id:'bonding', title:'Earthing & bonding', subtitle:'Table-based conductor quick reference', category:'Design', icon:'ShieldCheck', accent:'#0c85ff',
    fields:[{key:'system',label:'Earthing system',type:'select',defaultValue:'tncs',options:[{label:'TN-C-S / PME',value:'tncs'},{label:'TN-S',value:'tns'},{label:'TT',value:'tt'}]},
      {key:'supply',label:'Supply neutral conductor',unit:'mm²',type:'select',defaultValue:'25',options:opts([10,16,25,35,50,70,95,120,150,185,240])},{key:'buried',label:'Earthing conductor buried?',type:'select',defaultValue:'no',options:[{label:'No',value:'no'},{label:'Yes',value:'yes'}]},
      {key:'protection',label:'Buried conductor protection',type:'select',defaultValue:'both',options:[{label:'Mechanical + corrosion',value:'both'},{label:'Corrosion only',value:'corr'},{label:'Mechanical only',value:'mech'},{label:'Neither',value:'none'}],showWhen:{key:'buried',equals:'yes'}}],
    calculate:(v)=>{const supply=n(v,'supply'),table=supply<=16?supply:supply<=35?16:supply/2,buried=v.buried==='yes'||v.system==='tt',floor=!buried?0:v.protection==='both'?2.5:v.protection==='corr'?16:25,earth=Math.max(table,floor),pme=[[35,10],[50,16],[95,25],[150,35],[Infinity,50]].find(([limit])=>supply<=limit)![1],bond=v.system==='tncs'?pme:Math.min(25,Math.max(6,earth/2));
      return result(`${f(earth,earth%1?1:0)} mm²`,'Indicative main earthing conductor',[{label:'Main protective bonding',value:`${f(bond,bond%1?1:0)} mm² copper`},{label:'Table 54.7 calculation',value:`${f(table,table%1?1:0)} mm²`},{label:'Buried minimum',value:buried?`${floor} mm²`:'Not applicable'}],'Confirm distributor requirements, material, protection and current BS 7671 tables.');},
  },
  {
    id:'adiabatic', title:'Adiabatic', subtitle:'Minimum CPC and fault-energy check', category:'Design', icon:'Sigma', accent:'#03b9dc',
    fields:[{key:'uo',label:'Nominal voltage Uo',unit:'V',min:1,defaultValue:'230'},{key:'zs',label:'Earth fault loop impedance Zs',unit:'Ω',min:.001,defaultValue:'.42'},{key:'time',label:'Disconnection time',unit:'s',min:.001,defaultValue:'.1'},
      {key:'construction',label:'CPC construction',type:'select',defaultValue:'core',options:[{label:'Core in 70 °C cable',value:'core'},{label:'Core in 90 °C cable',value:'core90'},{label:'Separate 70 °C CPC',value:'sep'},{label:'Separate 90 °C CPC',value:'sep90'},{label:'Bare CPC',value:'bare'},{label:'Steel armour / conduit',value:'armour'}]},
      {key:'material',label:'Material',type:'select',defaultValue:'cu',options:[{label:'Copper',value:'cu'},{label:'Aluminium',value:'al'},{label:'Steel',value:'steel'}]},{key:'installed',label:'Installed CPC',unit:'mm²',type:'select',defaultValue:'1.5',options:opts([1,1.5,2.5,4,6,10,16,25,35,50])}],
    calculate:(v)=>{const factors:Record<string,Record<string,number>>={core:{cu:115,al:76},core90:{cu:100},sep:{cu:143,al:95},sep90:{cu:176,al:116},bare:{cu:228,al:125},armour:{steel:51}},k=factors[v.construction]?.[v.material];
      if(!k)return result('Not compatible','Choose a material supported by this CPC construction',[]); const current=n(v,'uo')/n(v,'zs'),min=current*Math.sqrt(n(v,'time'))/k,standards=[1,1.5,2.5,4,6,10,16,25,35,50],selected=standards.find(x=>x>=min)??standards.at(-1)!,installed=n(v,'installed');
      return result(`${selected} mm²`,installed>=min?'PASS · installed CPC satisfies the result':'FAIL · installed CPC is below the minimum',[{label:'Fault current Ia',value:`${f(current,0)} A`},{label:'Calculated minimum S',value:`${f(min)} mm²`},{label:'k factor',value:String(k)},{label:'Fault energy I²t',value:`${f(current**2*n(v,'time'),0)} A²s`},{label:'Installed CPC',value:`${installed} mm²`}],'Confirm k factor and protective-device operating time from current data.');},
  },
  {
    id:'voltage-drop', title:'Voltage drop', subtitle:'Cable-size, phase and ring calculation', category:'Design', icon:'TrendingDown', accent:'#0c85ff',
    fields:[{key:'size',label:'Cable conductor size',unit:'mm²',type:'select',defaultValue:'2.5',options:opts(sizes)},{key:'length',label:'One-way run length',unit:'m',min:.1,defaultValue:'20'},{key:'current',label:'Load current',unit:'A',min:.01,defaultValue:'20'},
      {key:'phase',label:'Supply',type:'select',defaultValue:'1',options:[{label:'230 V single phase',value:'1'},{label:'400 V three phase',value:'3'}]},{key:'circuit',label:'Circuit arrangement',type:'select',defaultValue:'radial',options:[{label:'Radial',value:'radial'},{label:'Ring final',value:'ring'}]}],
    calculate:(v)=>{const index=sizes.indexOf(n(v,'size')),supply=v.phase==='3'?400:230,mv=(v.phase==='3'?mv3:mv1)[index],drop=mv*n(v,'current')*n(v,'length')/1000*(v.circuit==='ring'?.25:1),percent=drop/supply*100;
      return result(`${f(drop)} V · ${f(percent,1)}%`,percent<=3?'Inside 3% · suitable for lighting or power':percent<=5?'Inside 5% · suitable for power, too high for lighting':'Over 5% · increase cable size or shorten the run',[{label:'Cable value',value:`${mv} mV/A/m`},{label:'Estimated load voltage',value:`${f(supply-drop)} V`},{label:'Working',value:`${mv} × ${v.current} × ${v.length} ÷ 1000${v.circuit==='ring'?' ÷ 4':''}`}]);},
  },
  {
    id:'ohms-law', title:"Ohm's law", subtitle:'Enter any two of V, A, Ω and W', category:'General', icon:'Zap', accent:'#03b9dc',
    fields:[{key:'voltage',label:'Voltage',unit:'V',min:0,defaultValue:'230',required:false},{key:'current',label:'Current',unit:'A',min:0,defaultValue:'',required:false},{key:'resistance',label:'Resistance',unit:'Ω',min:0,defaultValue:'11.5',required:false},{key:'power',label:'Power',unit:'W',min:0,defaultValue:'',required:false}],
    calculate:(v)=>{let V=v.voltage?n(v,'voltage'):undefined,I=v.current?n(v,'current'):undefined,R=v.resistance?n(v,'resistance'):undefined,P=v.power?n(v,'power'):undefined;
      if(V===undefined&&I!==undefined&&R!==undefined)V=I*R;else if(I===undefined&&V!==undefined&&R!==undefined)I=V/R;else if(V===undefined&&P!==undefined&&I!==undefined)V=P/I;else if(I===undefined&&P!==undefined&&V!==undefined)I=P/V;else if(V===undefined&&P!==undefined&&R!==undefined)V=Math.sqrt(P*R);else if(R===undefined&&P!==undefined&&I!==undefined)R=P/I**2;
      if(V===undefined||(I===undefined&&R===undefined))return result('Need two values','Enter any two values and leave the others blank',[]); if(I===undefined)I=V/R!;if(R===undefined)R=V/I;P=V*I;
      return result(`${f(P,0)} W`,'Solved voltage, current, resistance and power',[{label:'Voltage',value:`${f(V)} V`},{label:'Current',value:`${f(I,1)} A`},{label:'Resistance',value:`${f(R)} Ω`},{label:'Power',value:`${f(P)} W · ${f(P/1000)} kW`}]);},
  },
  {
    id:'downlights', title:'Downlights', subtitle:'Quantity, lux target and room layout', category:'General', icon:'Lightbulb', accent:'#0c85ff',
    fields:[{key:'length',label:'Room length',unit:'m',min:.1,defaultValue:'5'},{key:'width',label:'Room width',unit:'m',min:.1,defaultValue:'4'},{key:'room',label:'Room / target illuminance',type:'select',defaultValue:'kitchen',options:[{label:'Kitchen · 500 lux',value:'kitchen'},{label:'Home office · 400 lux',value:'office'},{label:'Bathroom · 200 lux',value:'bathroom'},{label:'Living room · 150 lux',value:'living'},{label:'Bedroom · 100 lux',value:'bedroom'},{label:'Hallway · 100 lux',value:'hallway'}]},{key:'lumens',label:'Lumens per fitting',unit:'lm',min:1,defaultValue:'740'}],
    calculate:(v)=>{const lux:Record<string,number>={living:150,kitchen:500,bedroom:100,bathroom:200,office:400,hallway:100},area=n(v,'length')*n(v,'width'),exact=area*lux[v.room]/n(v,'lumens'),count=Math.min(200,Math.max(1,Math.ceil(exact))),cols=Math.max(1,Math.round(Math.sqrt(count*n(v,'length')/n(v,'width')))),rows=Math.ceil(count/cols),edgeX=n(v,'length')/(cols+1),edgeY=n(v,'width')/(rows+1);
      return result(`${count} downlight${count===1?'':'s'}`,'Indicative evenly spaced ceiling layout',[{label:'Room area',value:`${f(area)} m²`},{label:'Required output',value:`${f(area*lux[v.room],0)} lm`},{label:'Suggested grid',value:`${cols} × ${rows}`},{label:'Wall spacing',value:`${f(edgeX)} m (L) · ${f(edgeY)} m (W)`},{label:'Grid spacing',value:`${f(edgeX)} m (X) · ${f(edgeY)} m (Y)`}]);},
  },
  {
    id:'cooker', title:'Cooker diversity', subtitle:'Separate hob and oven demand', category:'Design', icon:'CookingPot', accent:'#03b9dc',
    fields:[{key:'hob',label:'Hob rating',unit:'kW',min:0,defaultValue:'7.2',required:false},{key:'oven',label:'Oven rating',unit:'kW',min:0,defaultValue:'2.8',required:false},checkbox('socket','Control unit includes a socket-outlet (+5 A)')],
    calculate:(v)=>{const kw=(v.hob?n(v,'hob'):0)+(v.oven?n(v,'oven'):0),full=kw*1000/230,demand=Math.min(full,10)+Math.max(0,full-10)*.3+(v.socket==='true'?5:0),rec=demand>45?'50 A+ device · 16 mm² cable':demand>40?'45–50 A device · 10 mm² cable':demand>32?'40 A device · 10 mm² cable':'32 A device · 6 mm² cable';
      return result(`${f(demand,1)} A`,'Conventional diversified design current',[{label:'Connected load',value:`${f(kw)} kW`},{label:'Full-load current',value:`${f(full,1)} A`},{label:'Socket allowance',value:v.socket==='true'?'5 A':'None'},{label:'Indicative protection / cable',value:rec}],'Final device and cable selection depends on installation conditions and manufacturer data.');},
  },
  {
    id:'extractor', title:'Extractor fan', subtitle:'Part F rate, duct and control selection', category:'General', icon:'Fan', accent:'#0c85ff',
    fields:[{key:'room',label:'Room type',type:'select',defaultValue:'bathroom',options:[{label:'Bathroom / shower room',value:'bathroom'},{label:'Toilet / WC',value:'toilet'},{label:'Kitchen · hob area',value:'kitchen_hob'},{label:'Kitchen · open plan',value:'kitchen_open'},{label:'Utility room',value:'utility'}]},
      {key:'length',label:'Room length',unit:'m',min:.1,defaultValue:'2.4'},{key:'width',label:'Room width',unit:'m',min:.1,defaultValue:'1.8'},{key:'height',label:'Ceiling height',unit:'m',min:.1,defaultValue:'2.4'},
      {key:'style',label:'Fan style',type:'select',defaultValue:'normal',options:[{label:'Wall / ceiling fan',value:'normal'},{label:'Inline / ducted fan',value:'inline'}]},{key:'control',label:'Control',type:'select',defaultValue:'switched',options:[{label:'Standard switched',value:'switched'},{label:'Timer overrun',value:'timer'},{label:'Humidistat + timer',value:'humidistat'}]},checkbox('longDuct','Long or restrictive duct run (+20%)',false)],
    calculate:(v)=>{const partF:Record<string,number>={bathroom:15,toilet:6,kitchen_hob:60,kitchen_open:30,utility:30},ach:Record<string,number>={bathroom:4,toilet:4,kitchen_hob:8,kitchen_open:6,utility:4},volume=n(v,'length')*n(v,'width')*n(v,'height');let rate=Math.max(partF[v.room],volume*ach[v.room]/3.6);if(v.longDuct==='true')rate*=1.2;const size=rate<=24?'4 inch · 100 mm':rate<=45?'5 inch · 125 mm':'6 inch · 150 mm',control=v.control==='timer'?'timer overrun':v.control==='humidistat'?'humidistat and timer':'standard switched';
      return result(size,'Indicative fan connection size',[{label:'Room volume',value:`${f(volume,1)} m³`},{label:'Part F minimum',value:`${partF[v.room]} l/s`},{label:'Design extract rate',value:`${f(rate,0)} l/s · ${f(rate*3.6,0)} m³/h`},{label:'Suggested setup',value:`${v.style==='inline'?'Inline / ducted':'Wall / ceiling'}, ${control}`}],v.style==='inline'&&v.control==='humidistat'?'For inline humidistat setups, position the sensor at the room intake rather than in a cold loft.':'Allow for actual duct resistance and confirm current Building Regulations requirements.');},
  },
  { id:'scientific', title:'Scientific calculator', subtitle:'Fast site calculations', category:'General', icon:'Calculator', accent:'#0c85ff', fields:[], calculate:()=>result('0','Use the scientific keypad',[]) },
];

export const calculatorById = (id: string) => calculators.find((tool) => tool.id === id);
