import {makeXlsx,excelDate as D,excelTime as T,excelRate as R} from './momentum-excel.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const mean=v=>v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;
const days=['일','월','화','수','목','금','토'];
export function buildMomentumReport(api,start,end,today){
 const {state,dateKey:K,parseDateKey:P,addDays:A}=api;
 const keys=(s,e)=>{const out=[];for(let d=P(s);K(d)<=e;d=A(d,1))out.push(K(d));return out};
 const cache=new Map();
 const day=key=>{if(!cache.has(key))cache.set(key,{events:api.allEventsForDate(key),habits:api.activeHabitsOn(key),todos:api.todosForDate(key)});return cache.get(key)};
 const eligibleTodo=t=>t.includeInStats===true&&!['cancelled','failed','rolled'].includes(t.status);
 const stats=(s,e)=>{
  const ev=[],ha=[],ca=new Map();
  for(const key of keys(s,e).filter(k=>k<=today)){
   const d=day(key);
   for(const item of d.events.filter(x=>x.includeInStats!==false)){const p=Number(item.progress||0);ev.push(p);const c=api.categoryLabel(api.eventCategory(item));if(!ca.has(c))ca.set(c,[]);ca.get(c).push(p)}
   ev.push(...d.todos.filter(eligibleTodo).map(t=>t.status==='done'?100:0));
   ha.push(...d.habits.filter(h=>h.includeInStats!==false).map(h=>api.habitProgress(h.id,key)));
  }
  return {events:ev,habits:ha,values:[...ev,...ha],rate:mean([...ev,...ha]),categories:ca};
 };
 const selected=keys(start,end),evaluated=selected.filter(k=>k<=today),groups=new Map(),habits=[];
 for(const key of selected){
  const d=day(key);
  for(const event of d.events){const occurrence=event.occurrenceStartDate||event.occurrenceDate||event.date,id=JSON.stringify(['event',event.id,occurrence]);
   if(!groups.has(id))groups.set(id,{type:'일정',item:event,key:occurrence,dates:[],weight:0,minutes:0});
   const g=groups.get(id);g.dates.push(key);
   if(key<=today&&event.includeInStats!==false)g.weight++;
   const segment=api.occurrenceSegment(event,key);g.minutes+=Math.max(0,api.timeToMinutes(segment.end)-api.timeToMinutes(segment.start));
  }
  // Only opted-in todos are treated as schedule items; no independent todo statistics.
  for(const todo of d.todos.filter(t=>t.includeInStats===true))groups.set(JSON.stringify(['todo',todo.id,key]),{type:'할 일(일정 환산)',item:todo,key,dates:[key],weight:key<=today&&eligibleTodo(todo)?1:0,minutes:null});
  for(const habit of d.habits){const log=state.habitLogs[api.habitLogKey(habit.id,key)],recorded=own(log,'progress');
   habits.push({habit,key,log,recorded,progress:api.habitProgress(habit.id,key),weight:key<=today&&habit.includeInStats!==false?1:0});
  }
 }
 const entries=[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key)||(a.item.time||'').localeCompare(b.item.time||''));
 const summary=stats(start,end);
 // Reconcile independently from the rows that will actually be exported.
 const exportedSchedule=entries.flatMap(g=>Array(g.weight).fill(g.type==='일정'?Number(g.item.progress||0):g.item.status==='done'?100:0));
 const exportedHabits=habits.filter(h=>h.weight).map(h=>h.progress);
 const source=api.rangeSummary(evaluated);
 if(exportedSchedule.length!==summary.events.length||exportedHabits.length!==summary.habits.length||mean([...exportedSchedule,...exportedHabits])!==source.rate||summary.rate!==source.rate||summary.values.length!==source.planned||summary.values.reduce((a,b)=>a+b,0)!==source.values.reduce((a,b)=>a+b,0))throw Error('원본과 화면 통계가 일치하지 않아 내보내기를 중단했습니다.');
 const describe=(progress,recorded,ambiguous=false)=>progress===100?'완료':progress>0?'부분완료':ambiguous?'0% (미기록 여부 구분 불가)':recorded?'미실행 (0% 기록)':'미기록';
 const eventRows=[['날짜(발생 시작일)','요일','일정/할 일 ID','반복 원본 ID','원본 반복 발생일','일정명','카테고리','계획 시작시간','계획 종료시간','전체 계획시간(분)','실제 시작시간','실제 종료시간','실제 수행시간(분)','수행률','실행 상태','중요도','핵심 목표 연결','미실행/변경 사유','유형','계획 종료일','기간 내 계획시간(분)','평가 반영 횟수','평가 수행률 합계(% 단위)','통계 설정','기록 근거','메모','기간 내 해당 날짜','원본 상태']];
 for(const g of entries){const e=g.item,isEvent=g.type==='일정',repeated=(e.repeat||'none')!=='none';
  const log=isEvent?(repeated?state.eventLogs[api.eventLogKey(e.id,g.key)]:e):(repeated?state.todoLogs[api.todoLogKey(e.id,g.key)]:e);
  const recorded=isEvent?own(log,'progress'):own(log,'status');const p=isEvent?Number(e.progress||0):e.status==='done'?100:0;
  const status=isEvent?describe(p,recorded,!repeated&&p===0):e.status==='cancelled'?'취소':e.status==='rolled'?'연기(이월)':e.status==='done'?'완료':'미완료 (미기록 여부 구분 불가)';
  eventRows.push([D(g.key),days[P(g.key).getDay()],e.id,e.sourceRepeatEventId||(repeated?e.id:null),D(e.sourceOccurrenceDate||(repeated?g.key:null)),isEvent?e.title:e.text,isEvent?api.categoryLabel(api.eventCategory(e)):null,isEvent?T(e.time):null,isEvent?T(e.endTime):null,isEvent?api.eventDurationMs(e)/60000:null,null,null,null,recorded||p>0?R(p):null,status,e.important===true?'중요':null,null,null,g.type,isEvent?D(e.occurrenceEndDate||e.endDate||e.date):null,g.minutes,g.weight,g.weight*p,isEvent&&e.includeInStats===false?'미포함':'포함',recorded?'수행값 저장됨; 0%의 평가 의도는 확인 불가':'수행값 없음; 기존 통계는 0% 반영',e.memo||null,g.dates.join(', '),e.status||null]);
 }
 const habitRows=[['날짜','요일','습관 ID','습관명','카테고리','목표 수행 횟수(전체 목표)','실제 수행 횟수','수행률','달성 여부','연속 달성일','습관 시작일','습관 종료일','비고','평가 반영 횟수','평가 수행률 합계(% 단위)','기록 근거','통계 설정','보관 처리일','실행 상태']];
 for(const h of habits){const x=h.habit;
  // Actual count and streak are intentionally blank: the stored progress is not a count.
  habitRows.push([D(h.key),days[P(h.key).getDay()],x.id,x.name,x.category?api.categoryLabel(x.category):null,Number(x.targetCount)>0?Number(x.targetCount):null,null,h.recorded?R(h.progress):null,h.recorded?(h.progress===100?'달성':'미달성'):'미기록',null,D(x.startDate),D(x.endDate),x.memo||null,h.weight,h.weight*h.progress,h.recorded?'날짜별 수행값 저장됨':'수행값 없음; 기존 통계는 0% 반영',x.includeInStats===false?'미포함':'포함',D(x.archivedDate),describe(h.progress,h.recorded)]);
 }
 const rows=[['구분','항목','값','설명'],['기간','분석 시작일',D(start)],['기간','분석 종료일',D(end)],['기간','평가 마감일',D(end<today?end:today),'미래 계획은 원본에 포함하되 평가에서는 제외'],['기본','종합 수행률',R(summary.rate)],['기본','일정 수행률',R(mean(summary.events)),'포함 설정된 할 일 포함'],['기본','습관 수행률',R(mean(summary.habits))],['기본','평가된 전체 항목 수',summary.values.length],['기본','일정 평가 항목 수',summary.events.length],['기본','습관 평가 항목 수',summary.habits.length],['기본','계획된 일정시간 합계(분)',entries.filter(g=>g.type==='일정').reduce((s,g)=>s+g.minutes,0),'선택 기간과 겹치는 계획 구간; 통계 미포함·미래 계획도 포함'],['기본','실제 수행시간 합계(분)',null,'저장 필드 없음. 수행률로 시간을 환산하지 않음'],['검증','원본-화면 평가 항목 일치',source.planned===summary.values.length?'일치':'불일치'],['검증','원본-화면 수행률 일치',source.rate===summary.rate?'일치':'불일치']];
 const compare=(label,s,e,ps,pe)=>{const a=stats(s,e),b=stats(ps,pe);rows.push([label,'현재 기간',`${s} ~ ${e}`],[label,'비교 기간',`${ps} ~ ${pe}`],[label,'현재 수행률',R(a.rate)],[label,'이전 수행률',R(b.rate)],[label,'수행률 증감(%p)',a.rate==null||b.rate==null?null:a.rate-b.rate],[label,'현재 평가 항목 수',a.values.length],[label,'이전 평가 항목 수',b.values.length],[label,'평가 항목 수 증감',a.values.length-b.values.length]);};
 const ws=api.startOfWeek(P(end)),ms=new Date(P(end).getFullYear(),P(end).getMonth(),1),pms=new Date(ms.getFullYear(),ms.getMonth()-1,1);
 compare('지난주 대비(종료일 기준 주)',K(ws),K(A(ws,6)),K(A(ws,-7)),K(A(ws,-1)));
 compare('지난달 대비(종료일 기준 월)',K(ms),K(new Date(ms.getFullYear(),ms.getMonth()+1,0)),K(pms),K(A(ms,-1)));
 for(const p of [...new Set([0,25,50,75,100,...summary.values])].sort((a,b)=>a-b))rows.push(['수행률 분포',R(p),summary.values.filter(v=>v===p).length,'기존 통계값 기준; 미기록 기본값 0 포함']);
 for(const [category,v]of summary.categories){const unique=entries.filter(g=>g.type==='일정'&&g.weight&&api.categoryLabel(api.eventCategory(g.item))===category);rows.push(['카테고리',category,unique.length,'일정 발생 수'],['카테고리',category,v.length,'평가 항목 수'],['카테고리',category,R(mean(v)),'평균 수행률'],['카테고리',category,v.filter(p=>p===100).length,'완료 평가 횟수'],['카테고리',category,v.filter(p=>p>0&&p<100).length,'부분완료 평가 횟수'],['카테고리',category,v.filter(p=>p===0).length,'0% 평가 횟수 (미기록 포함)']);}
 for(let y=P(start).getFullYear();y<=P(end).getFullYear();y++){const goals=api.directionGoalsForYear(y);rows.push(['핵심 목표',`${y}년 목표`,goals.annual||null,'일정·습관 연결 기능 없음; 달성률 계산하지 않음']);}
 const bands=[['심야',0,6],['오전',6,12],['오후',12,18],['저녁',18,24]];
 for(const [name,a,b]of bands){const v=entries.filter(g=>g.type==='일정'&&g.weight&&g.item.time&&Number(g.item.time.slice(0,2))>=a&&Number(g.item.time.slice(0,2))<b).flatMap(g=>Array(g.weight).fill(Number(g.item.progress||0)));rows.push(['계획 시작 시간대',name,R(mean(v)),`평가 ${v.length}개; 실제 시간대 분석 아님`]);}
 const repeatGroups=new Map();for(const g of entries.filter(g=>g.type==='일정'&&g.weight)){const id=g.item.sourceRepeatEventId||g.item.id;if(!repeatGroups.has(id))repeatGroups.set(id,[]);repeatGroups.get(id).push(g)}
 for(const [id,gs]of repeatGroups)if(gs.length>1)rows.push(['반복 0% 기록',gs[0].item.title,gs.filter(g=>Number(g.item.progress||0)===0).length,`원본 ${id}; ${gs.length}회 중; 미기록 포함, 사유 추정 없음`]);
 const notes=[
 '출처: 내보내기 시점에 웹 앱에 로드된 계정 데이터. 개인 기록을 외부 서버로 전송하지 않음.',
 '종합 수행률: 일정(포함 설정된 할 일 포함)과 습관의 평가 수행률 합계 / 평가 반영 횟수 합계. 일별 평균의 평균이 아님. 화면과 동일하게 정수 반올림.',
 '자정을 넘는 일정은 기존 앱이 날짜별로 평가함. 원본은 발생당 한 행이며 평가 반영 횟수로 기존 가중치를 보존. 기간 내 계획시간은 날짜별 겹치는 구간만 합산.',
 '미기록: 원본 수행률은 공란, 평가 계산에서는 기존 앱과 동일하게 0 반영. 0% 저장값만으로 실제 미실행 의도를 단정할 수 없음.',
 '취소·이월 할 일은 분모 제외. 일정 자체에는 취소·연기 상태 입력이 없음. 세부 체크리스트의 취소/완료는 평가에 포함하지 않음.',
 '습관은 시작일~종료일/보관 처리일 중 빠른 날까지 반복 규칙에 따라 평가. 과거 날짜별 override 반영. 전체 수정 전의 과거 이름·카테고리는 별도 이력이 없어 복원 불가.',
 '실제 시작·종료·수행시간, 실제 수행횟수, 수면시간, 미실행 사유, 목표 연결은 저장하지 않아 공란. 목표 횟수는 일일 목표가 아닌 전체 목표.',
 '장기 변화는 선택 기간 내부만 집계. 부분 주·월·분기는 집계 시작/종료일 표시. 이전 기간 비교는 직전 전체 기간(선택 기간 밖일 수 있음), 비교 기간과 항목 수 명시.',
 '공란은 미기록 또는 계산 불가, 숫자 0은 기록/계산된 0. 기존 삭제된 일정 및 로그는 복원하지 않음. 원본 시트의 ID와 발생일로 추적.',
 '기존 통계 화면의 월간 습관 요약은 날짜별 포함 override를 누락하던 부분만 공통 평가 함수와 일치시킴.'
 ];notes.forEach(n=>rows.push(['계산 기준','설명',null,n]));
 const trend=[['구분','기간 시작일','기간 종료일','집계 시작일','집계 종료일','종합 수행률','일정 수행률','습관 수행률','평가 항목 수','이전 기간 시작일','이전 기간 종료일','이전 수행률','이전 평가 항목 수','증감(%p)','항목 수 증감','등록된 목표','목표별 수행 현황',...state.categories.map(c=>`${c.name} 수행률`)]];
 for(const unit of ['주간','월간','분기']){
  const d=P(start);let cursor=unit==='주간'?api.startOfWeek(d):new Date(d.getFullYear(),unit==='월간'?d.getMonth():Math.floor(d.getMonth()/3)*3,1);
  while(K(cursor)<=end){const next=unit==='주간'?A(cursor,7):new Date(cursor.getFullYear(),cursor.getMonth()+(unit==='월간'?1:3),1),last=K(A(next,-1)),s=K(cursor)>start?K(cursor):start,e=last<end?last:end;
   const previous=unit==='주간'?A(cursor,-7):new Date(cursor.getFullYear(),cursor.getMonth()-(unit==='월간'?1:3),1),ps=K(previous),pe=K(A(cursor,-1));const a=stats(s,e),b=stats(ps,pe);
   trend.push([unit,D(K(cursor)),D(last),D(s),D(e),R(a.rate),R(mean(a.events)),R(mean(a.habits)),a.values.length,D(ps),D(pe),R(b.rate),b.values.length,a.rate==null||b.rate==null?null:a.rate-b.rate,a.values.length-b.values.length,unit==='분기'?api.directionGoalsForYear(cursor.getFullYear()).quarters[Math.floor(cursor.getMonth()/3)]||null:null,unit==='분기'?'연결 정보 없음':null,...state.categories.map(c=>R(mean(a.categories.get(c.name)||[])))]);cursor=next;
  }
 }
 return {sheets:[{name:'종합 요약',rows,widths:[32,38,30,105],filter:false},{name:'일정 상세 원본',rows:eventRows,widths:[17,8,30,30,17,30,18,16,16,18,16,16,18,14,30,12,20,24,22,17,20,18,22,14,48,40,40,16]},{name:'습관 상세 원본',rows:habitRows,widths:[17,8,30,30,18,24,18,14,16,18,17,17,40,18,22,45,14,17,25]},{name:'장기 변화',rows:trend}],summary};
}
export function installMomentumExport(api){
 const $=id=>document.getElementById(id);let readyFile=null,busy=false;
 const panel=document.createElement('dialog');panel.id='momentumExcelDialog';panel.setAttribute('aria-labelledby','momentumExcelTitle');
 panel.innerHTML=`<form method="dialog"><h2 id="momentumExcelTitle">Excel 내보내기</h2><p>원본 기록과 계산 기준을 함께 저장합니다.</p><label>기간 <select id="momentumExcelPreset"><option value="week">이번 주</option><option value="lastWeek">지난주</option><option value="month">이번 달</option><option value="lastMonth">지난달</option><option value="year">올해</option><option value="custom">직접 선택</option></select></label><div class="momentum-export-dates"><label>시작일<input id="momentumExcelStart" type="date" required min="1900-01-01" max="9998-12-31"></label><label>종료일<input id="momentumExcelEnd" type="date" required min="1900-01-01" max="9998-12-31"></label></div><p id="momentumExcelStatus" role="status" aria-live="polite">미래 날짜는 계획 원본만 포함하며 수행률 평가에서 제외합니다.</p><div class="momentum-export-actions"><button type="button" id="momentumExcelBuild" class="primary-button">파일 만들기</button><button type="button" id="momentumExcelSave" hidden>저장</button><button type="button" id="momentumExcelShare" hidden>공유</button><button value="close" formnovalidate>닫기</button></div></form>`;
 document.body.append(panel);
 const style=document.createElement('style');style.textContent=`#statsPage>.topbar{flex-wrap:wrap}#statsPage>.topbar .top-actions{flex-wrap:wrap;justify-content:flex-end;max-width:100%}#momentumExcelDialog{width:min(480px,calc(100vw - 32px));box-sizing:border-box;border:1px solid #dce6e0;border-radius:20px;padding:24px;color:#193c30;background:white;max-height:90dvh;overflow:auto}#momentumExcelDialog::backdrop{background:#10271e66}#momentumExcelDialog label{display:grid;gap:8px;margin:14px 0}#momentumExcelDialog input,#momentumExcelDialog select{min-width:0;width:100%;box-sizing:border-box;padding:10px;font:inherit}.momentum-export-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px}.momentum-export-actions{display:flex;flex-wrap:wrap;gap:10px}#momentumExcelDialog button{padding:10px 16px}#momentumExcelDialog [hidden]{display:none!important}#momentumExcelStatus{font-size:14px;line-height:1.6}#momentumExcelDialog h2{font-size:22px}`;document.head.append(style);
 const reset=()=>{readyFile=null;$('momentumExcelSave').hidden=true;$('momentumExcelShare').hidden=true;};
 const preset=()=>{const value=$('momentumExcelPreset').value;if(value==='custom')return;const now=new Date();let s,e;switch(value){case'week':s=api.startOfWeek(now);e=api.addDays(s,6);break;case'lastWeek':s=api.addDays(api.startOfWeek(now),-7);e=api.addDays(s,6);break;case'month':s=new Date(now.getFullYear(),now.getMonth(),1);e=new Date(now.getFullYear(),now.getMonth()+1,0);break;case'lastMonth':s=new Date(now.getFullYear(),now.getMonth()-1,1);e=new Date(now.getFullYear(),now.getMonth(),0);break;default:s=new Date(now.getFullYear(),0,1);e=new Date(now.getFullYear(),11,31)}$('momentumExcelStart').value=api.dateKey(s);$('momentumExcelEnd').value=api.dateKey(e);reset();};
 $('momentumExcelPreset').onchange=preset;for(const id of ['momentumExcelStart','momentumExcelEnd'])$(id).onchange=()=>{$('momentumExcelPreset').value='custom';reset()};
 const open=()=>{preset();panel.showModal()};$('openExcelExportButton')?.addEventListener('click',open);$('saveReportExcelButton')?.addEventListener('click',open);
 $('momentumExcelBuild').onclick=async()=>{if(busy)return;reset();const s=$('momentumExcelStart').value,e=$('momentumExcelEnd').value;
 if(!s||!e||s>e||!panel.querySelector('form').reportValidity()){ $('momentumExcelStatus').textContent='시작일과 종료일을 확인해 주세요.';return }
 if((api.parseDateKey(e)-api.parseDateKey(s))/86400000>3660){$('momentumExcelStatus').textContent='모바일 메모리를 위해 한 번에 최대 10년씩 내보내 주세요.';return}
 if(!api.state.user||!api.progressDataIsReady()){$('momentumExcelStatus').textContent='로그인 후 기록을 모두 불러올 때까지 기다려 주세요.';return}
 busy=true;$('momentumExcelBuild').disabled=true;$('momentumExcelStatus').textContent='원본과 통계를 대조하고 있습니다…';
 try{await new Promise(resolve=>setTimeout(resolve,30));const report=buildMomentumReport(api,s,e,api.dateKey(new Date()));readyFile=new File([makeXlsx(report.sheets)],`Momentum_통계_${s}_${e}.xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});$('momentumExcelSave').hidden=false;$('momentumExcelShare').hidden=!(navigator.canShare&&navigator.canShare({files:[readyFile]}));$('momentumExcelStatus').textContent=`평가 ${report.summary.values.length}개 대조 완료. 저장 또는 공유를 눌러 주세요.`;}catch(error){console.error(error);$('momentumExcelStatus').textContent=error.message||'파일을 만들지 못했습니다.'}finally{busy=false;$('momentumExcelBuild').disabled=false}
 };
 $('momentumExcelSave').onclick=()=>{if(!readyFile)return;const url=URL.createObjectURL(readyFile),a=document.createElement('a');a.href=url;a.download=readyFile.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)};
 $('momentumExcelShare').onclick=async()=>{if(!readyFile)return;try{await navigator.share({files:[readyFile],title:'MOMENTUM 통계'})}catch(error){if(error.name!=='AbortError')$('momentumExcelStatus').textContent='공유하지 못했습니다. 저장 버튼을 이용해 주세요.'}};
 panel.addEventListener('close',reset);
}
