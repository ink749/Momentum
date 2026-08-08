import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcrq-223O2A8E0yJoVNgXnDARH1bfwrgw",
  authDomain: "calendar-f5e97.firebaseapp.com",
  projectId: "calendar-f5e97",
  storageBucket: "calendar-f5e97.firebasestorage.app",
  messagingSenderId: "447959836117",
  appId: "1:447959836117:web:4ecb3772a38cd1ca82c95c",
  measurementId: "G-S9XTHS1B4K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const COLORS = {0:"#e8efea",25:"#cde6d8",50:"#98ccb0",75:"#5daf82",100:"#1f8a5b"};
const DEFAULT_CATEGORIES = [
  {id:"study",name:"공부",color:"#5b7cfa"},
  {id:"exercise",name:"운동",color:"#33a474"},
  {id:"work",name:"업무",color:"#ee8b3f"},
  {id:"personal",name:"개인",color:"#9b6fe8"},
  {id:"other",name:"기타",color:"#8a9790",locked:true}
];
const state = {
  user:null, events:[], currentView:"selected",
  currentMonth:startOfMonth(new Date()), currentWeek:startOfWeek(new Date()),
  selectedDateKey:dateKey(new Date()), selectedProgress:0, unsubscribe:null,
  weekZoom:100, weekFit:true,
  activePage:"calendar",
  statsDate:dateKey(new Date()),
  statsInsightDate:null,
  habits:[], habitLogs:{}, selectedHabitDateKey:dateKey(new Date()),
  habitMonth:startOfMonth(new Date()), unsubscribeHabits:null, unsubscribeHabitLogs:null,
  eventLogs:{}, unsubscribeEventLogs:null,
  editingChecklist:[],
  searchQuery:"",
  searchFilter:"all",
  categoryFilter:"all",
  categories:DEFAULT_CATEGORIES.map(category=>({...category})),
  editingCategories:[],
  unsubscribeCategories:null,
  modalHistoryType:null,
  contextTargetDate:null,
  contextTargetTime:"09:00",
  contextEvent:null,
  dragEvent:null,
  dragGrabOffsetMinutes:0,
  pendingWeekScroll:null,
  weekInitialScrollDone:false,
  mobileActionEvent:null,
  dayViewDate:null,
  dayViewOpen:false,
  pendingRepeatEdit:null,
  editingOccurrenceContext:null,
  skipEventSnapshotRenders:0,
  skipHabitSnapshotRenders:0,
  preservedViewScroll:null,
  ignoreNextPopstate:false,
  undoStack:[],
  isUndoing:false
};

const $ = (id) => document.getElementById(id);
const el = {
  loading:$("loadingScreen"), login:$("loginScreen"), app:$("app"), loginButton:$("googleLoginButton"), loginError:$("loginError"),
  logout:$("logoutButton"), sheetLogout:$("sheetLogoutButton"), userPhoto:$("userPhoto"), userName:$("userName"), userEmail:$("userEmail"),
  mobilePhoto:$("mobileUserPhoto"), sheetPhoto:$("sheetUserPhoto"), sheetName:$("sheetUserName"), sheetEmail:$("sheetUserEmail"),
  mobileUser:$("mobileUserButton"), accountSheet:$("accountSheet"), closeSheet:$("closeAccountSheet"),
  statsMonthView:$("statsMonthView"), selectedView:$("selectedView"), weekView:$("weekView"), statsMonthGrid:$("statsMonthGrid"), weekGrid:$("weekGrid"), weekScroll:$("weekScroll"), periodLabel:$("periodLabel"),
  weekZoomControls:$("weekZoomControls"), weekZoomOut:$("weekZoomOut"), weekZoomIn:$("weekZoomIn"), weekZoomValue:$("weekZoomValue"),
  selectedBtn:$("selectedViewButton"), weekBtn:$("weekViewButton"), selectedTitle:$("selectedDateTitle"), selectedLabel:$("selectedDateLabel"),
  selectedEvents:$("selectedDayEvents"), dayProgress:$("dayProgressNumber"), dayBar:$("dayProgressBar"), dayCaption:$("dayProgressCaption"),
  monthCount:$("monthEventCount"), monthAverage:$("monthAverageProgress"), summaryHabitNames:$("summaryHabitNames"),
  modal:$("eventModal"), form:$("eventForm"),
  eventId:$("eventId"), eventOccurrenceDate:$("eventOccurrenceDate"), title:$("eventTitle"), category:$("eventCategory"),
  date:$("eventDate"), endDate:$("eventEndDate"),
  startClock:$("eventStartClock"), endClock:$("eventEndClock"),
  time:$("eventTime"), endTime:$("eventEndTime"),
  startHour:$("eventStartHour"), startMinute:$("eventStartMinute"),
  endHour:$("eventEndHour"), endMinute:$("eventEndMinute"),
  mobileStartTime:$("eventStartTimeMobile"), mobileEndTime:$("eventEndTimeMobile"),
  repeat:$("eventRepeat"),
  memo:$("eventMemo"),
  checklistItems:$("checklistItems"), addChecklistItemButton:$("addChecklistItemButton"),
  modalEyebrow:$("eventModalEyebrow"), modalTitle:$("eventModalTitle"), save:$("saveEventButton"), remove:$("deleteEventButton"),
  formError:$("formError"),
  repeatEditDialog:$("repeatEditDialog"),
  editOnlyThisDateButton:$("editOnlyThisDateButton"),
  editAllRepeatsButton:$("editAllRepeatsButton"),
  repeatDeleteDialog:$("repeatDeleteDialog"),
  deleteOnlyThisDateButton:$("deleteOnlyThisDateButton"), deleteAllRepeatsButton:$("deleteAllRepeatsButton"),
  calendarPage:$("calendarPage"), habitPage:$("habitPage"), calendarNav:$("calendarNavButton"), habitNav:$("habitNavButton"),
  habitTodayLabel:$("habitTodayLabel"), habitList:$("habitList"), habitHeatmapLabel:$("habitHeatmapLabel"), habitHeatmap:$("habitHeatmap"),
  habitModal:$("habitModal"), habitForm:$("habitForm"), habitId:$("habitId"), habitName:$("habitName"),
  habitStartDate:$("habitStartDate"), habitRepeat:$("habitRepeat"), habitEndDate:$("habitEndDate"),
  habitModalEyebrow:$("habitModalEyebrow"), habitModalTitle:$("habitModalTitle"), habitFormError:$("habitFormError"),
  deleteHabitButton:$("deleteHabitButton"), saveHabitButton:$("saveHabitButton"),
  mobileCalendarNav:$("mobileCalendarNavButton"), mobileHabitNav:$("mobileHabitNavButton"), mobileStatsNav:$("mobileStatsNavButton"), mobileAdd:$("mobileAddButton"),
  statsPage:$("statsPage"), statsNav:$("statsNavButton"),
  statsTodayEventProgress:$("statsTodayEventProgress"), statsTodayEventCount:$("statsTodayEventCount"),
  statsTodayHabitProgress:$("statsTodayHabitProgress"), statsTodayHabitCount:$("statsTodayHabitCount"),
  statsMonthCombinedProgress:$("statsMonthCombinedProgress"),
  statsDayEventLabel:$("statsDayEventLabel"), statsDayHabitLabel:$("statsDayHabitLabel"),
  statsMonthCombinedLabel:$("statsMonthCombinedLabel"), statsChecklistLabel:$("statsChecklistLabel"),
  statsWeeklyTitle:$("statsWeeklyTitle"), statsMonthSummaryTitle:$("statsMonthSummaryTitle"),
  statsCategoryTitle:$("statsCategoryTitle"), statsHabitRankingTitle:$("statsHabitRankingTitle"),
  weeklyProgressChart:$("weeklyProgressChart"), statsMonthEventCount:$("statsMonthEventCount"), statsMonthEventProgress:$("statsMonthEventProgress"),
  statsMonthHabitCount:$("statsMonthHabitCount"), statsMonthHabitProgress:$("statsMonthHabitProgress"),
  statsChecklistProgress:$("statsChecklistProgress"), statsChecklistCount:$("statsChecklistCount"),
  statsChecklistTotal:$("statsChecklistTotal"), statsChecklistDone:$("statsChecklistDone"), statsChecklistFailed:$("statsChecklistFailed"),
  statsMonthCalendarTitle:$("statsMonthCalendarTitle"),
  categoryAchievement:$("categoryAchievement"), habitRanking:$("habitRanking"),
  searchPage:$("searchPage"), searchNav:$("searchNavButton"), mobileSearchNav:$("mobileSearchNavButton"),
  globalSearchInput:$("globalSearchInput"), clearSearchButton:$("clearSearchButton"),
  searchSummary:$("searchSummary"), searchResults:$("searchResults"),
  quickAddInput:$("quickAddInput"), quickAddButton:$("quickAddButton"), quickAddMessage:$("quickAddMessage"),
  selectedInsightDate:$("selectedInsightDate"),
  selectedInsightCombined:$("selectedInsightCombined"),
  selectedInsightEvents:$("selectedInsightEvents"),
  selectedInsightEventCount:$("selectedInsightEventCount"),
  selectedInsightHabits:$("selectedInsightHabits"),
  selectedInsightHabitCount:$("selectedInsightHabitCount"),
  selectedInsightChecklist:$("selectedInsightChecklist"),
  selectedInsightChecklistFailed:$("selectedInsightChecklistFailed"),
  mobileEventActionSheet:$("mobileEventActionSheet"),
  mobileEventActionTitle:$("mobileEventActionTitle"),
  mobileEventActionTime:$("mobileEventActionTime"),
  mobileEventEditButton:$("mobileEventEditButton"),
  mobileEventDeleteButton:$("mobileEventDeleteButton"),
  dayViewOverlay:$("dayViewOverlay"), dayViewTitle:$("dayViewTitle"),
  dayViewGrid:$("dayViewGrid"), dayViewScroll:$("dayViewScroll"),
  dayViewPrev:$("dayViewPrev"), dayViewToday:$("dayViewToday"),
  dayViewNext:$("dayViewNext"), dayViewClose:$("dayViewClose"),
  eventContextMenu:$("eventContextMenu"),
  categoryFilterButtons:$("categoryFilterButtons"), openCategoryManagerButton:$("openCategoryManagerButton"),
  categoryManagerModal:$("categoryManagerModal"), categoryManagerList:$("categoryManagerList"),
  categoryManagerError:$("categoryManagerError"), saveCategoriesButton:$("saveCategoriesButton")
};

function pad(v){return String(v).padStart(2,"0")}
function fillTimeSelects(){
  const hourOptions=Array.from({length:24},(_,hour)=>
    `<option value="${pad(hour)}">${pad(hour)}시</option>`
  ).join("");

  const endHourOptions=Array.from({length:25},(_,hour)=>
    `<option value="${pad(hour)}">${pad(hour)}시</option>`
  ).join("");

  const minuteOptions=['00','30']
    .map(minute=>`<option value="${minute}">${minute}분</option>`)
    .join("");

  el.startHour.innerHTML=hourOptions;
  el.startMinute.innerHTML=minuteOptions;
  el.endHour.innerHTML=endHourOptions;
  el.endMinute.innerHTML=minuteOptions;

  const mobileTimes=[];
  for(let minutes=0;minutes<=24*60;minutes+=30){
    mobileTimes.push(minutesToTime(minutes));
  }

  el.mobileStartTime.innerHTML=mobileTimes
    .slice(0,-1)
    .map(value=>`<option value="${value}">${value}</option>`)
    .join("");

  setTimeParts("09:00","10:00");
}
function timeToMinutes(value){
  if(value==="24:00")return 24*60;
  const [hour,minute]=String(value||"00:00").split(":").map(Number);
  return hour*60+minute;
}
function minutesToTime(minutes){
  const safe=Math.max(0,Math.min(24*60,Math.round(minutes/30)*30));
  if(safe===24*60)return "24:00";
  return `${pad(Math.floor(safe/60))}:${pad(safe%60)}`;
}
function defaultEndTime(start){
  return minutesToTime(Math.min(24*60,timeToMinutes(start)+60));
}
function roundTimeValue(value){
  if(!value)return "00:00";
  return minutesToTime(timeToMinutes(value));
}
function isMobileTimeEditor(){
  return window.matchMedia("(max-width:720px)").matches;
}
function refreshMobileEndTimes(start,preferredEnd){
  const startMinutes=timeToMinutes(start||"09:00");
  const valid=[];

  for(let minutes=startMinutes+30;minutes<=24*60;minutes+=30){
    valid.push(minutesToTime(minutes));
  }

  el.mobileEndTime.innerHTML=valid
    .map(value=>`<option value="${value}">${value}</option>`)
    .join("");

  const fallback=valid[0]||"24:00";
  el.mobileEndTime.value=valid.includes(preferredEnd)?preferredEnd:fallback;
}

function setTimeParts(start,end){
  const roundedStart=roundTimeValue(start||"09:00");
  const roundedEnd=roundTimeValue(
    end||defaultEndTime(roundedStart)
  );

  el.startClock.value=roundedStart;
  el.endClock.value=roundedEnd;
  syncHiddenTimes();
}
function syncHiddenTimes(){
  const start=roundTimeValue(el.startClock.value||"09:00");
  const end=roundTimeValue(
    el.endClock.value||defaultEndTime(start)
  );

  el.startClock.value=start;
  el.endClock.value=end;
  el.time.value=start;
  el.endTime.value=end;
}


function dateKey(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function parseDateKey(k){const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)}
function startOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function startOfWeek(d){
  const x=new Date(d);
  x.setHours(0,0,0,0);
  const mondayOffset=(x.getDay()+6)%7;
  x.setDate(x.getDate()-mondayOffset);
  return x;
}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function escapeHtml(v){const d=document.createElement("div");d.textContent=v??"";return d.innerHTML}
function average(items){return items.length?Math.round(items.reduce((s,e)=>s+Number(e.progress||0),0)/items.length):0}
function step(v){if(v>=88)return 100;if(v>=63)return 75;if(v>=38)return 50;if(v>=13)return 25;return 0}
function repeatLabel(r){return {daily:"매일",weekdays:"평일",weekends:"주말",weekly:"매주",monthly:"매월"}[r]||""}
function categoryById(id){
  return state.categories.find(category=>category.id===id)
    ||state.categories.find(category=>category.id==="other")
    ||DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length-1];
}
function eventCategory(event){
  return categoryById(event.category).id;
}
function categoryLabel(category){
  return categoryById(category).name;
}
function categoryColor(category){
  return categoryById(category).color;
}
function passesCategoryFilter(event){
  return state.categoryFilter==="all"||eventCategory(event)===state.categoryFilter;
}
function normalizeCategoryName(value){
  return String(value||"").replace(/\s+/g," ").trim();
}
function categoryId(){
  return `category_${crypto.randomUUID().replaceAll("-","").slice(0,12)}`;
}
function renderCategoryControls(){
  el.categoryFilterButtons.innerHTML="";

  const allButton=document.createElement("button");
  allButton.type="button";
  allButton.className="category-filter-button";
  allButton.dataset.categoryFilter="all";
  allButton.textContent="전체";
  allButton.classList.toggle("active",state.categoryFilter==="all");
  allButton.onclick=()=>setCategoryFilter("all");
  el.categoryFilterButtons.appendChild(allButton);

  state.categories.forEach(category=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="category-filter-button";
    button.dataset.categoryFilter=category.id;
    button.classList.toggle("active",state.categoryFilter===category.id);
    button.innerHTML=`<i class="dynamic-category-dot" style="background:${category.color}"></i>${escapeHtml(category.name)}`;
    button.onclick=()=>setCategoryFilter(category.id);
    el.categoryFilterButtons.appendChild(button);
  });

  const currentValue=el.category.value;
  el.category.innerHTML="";
  state.categories.forEach(category=>{
    const option=document.createElement("option");
    option.value=category.id;
    option.textContent=category.name;
    el.category.appendChild(option);
  });

  el.category.value=state.categories.some(category=>category.id===currentValue)
    ?currentValue
    :(state.categories[0]?.id||"other");
}
function setCategoryFilter(id){
  state.categoryFilter=id;
  renderCategoryControls();
  renderAll();
}


function eventLogKey(eventId,key){return `${eventId}_${key}`}
function eventOccurrenceProgress(event,key){
  if((event.repeat||"none")==="none")return Number(event.progress||0);
  return Number(state.eventLogs[eventLogKey(event.id,key)]?.progress||0);
}

function eventDateTime(key,time="00:00"){
  const normalized=time==="24:00"?"00:00":time;
  const value=new Date(`${key}T${normalized}:00`);

  if(time==="24:00"){
    value.setDate(value.getDate()+1);
  }

  return value;
}
function eventDurationMs(event){
  const start=eventDateTime(
    event.date,
    event.time||"09:00"
  );
  const end=eventDateTime(
    event.endDate||event.date,
    event.endTime||defaultEndTime(event.time||"09:00")
  );

  return Math.max(30*60000,end-start);
}
function isRepeatStartOn(event,key){
  const target=parseDateKey(key);
  const start=parseDateKey(event.date);

  if(target<start)return false;
  if(
    Array.isArray(event.exceptionDates)
    &&event.exceptionDates.includes(key)
  ){
    return false;
  }

  const repeat=event.repeat||"none";

  if(repeat==="none")return key===event.date;
  if(repeat==="daily")return true;
  if(repeat==="weekdays"){
    return target.getDay()>=1&&target.getDay()<=5;
  }
  if(repeat==="weekends"){
    return target.getDay()===0||target.getDay()===6;
  }

  const days=Math.round((target-start)/86400000);

  if(repeat==="weekly")return days%7===0;
  if(repeat==="monthly"){
    return target.getDate()===start.getDate();
  }

  return false;
}
function shiftedOccurrenceEndDate(event,occurrenceStartKey){
  const start=eventDateTime(
    occurrenceStartKey,
    event.time||"09:00"
  );
  const end=new Date(start.getTime()+eventDurationMs(event));
  return dateKey(end);
}
function occurrenceInstancesForDate(event,key){
  const repeat=event.repeat||"none";

  if(repeat==="none"){
    const endKey=event.endDate||event.date;
    if(key<event.date||key>endKey)return [];

    return [{
      ...event,
      occurrenceDate:event.date,
      occurrenceStartDate:event.date,
      occurrenceEndDate:endKey,
      calendarDate:key,
      progress:eventOccurrenceProgress(event,event.date)
    }];
  }

  const duration=eventDurationMs(event);
  const searchDays=Math.min(
    370,
    Math.max(1,Math.ceil(duration/86400000)+1)
  );
  const targetDate=parseDateKey(key);
  const targetStart=eventDateTime(key,"00:00");
  const targetEnd=eventDateTime(key,"24:00");
  const instances=[];

  for(let offset=0;offset<=searchDays;offset++){
    const candidateKey=dateKey(
      addDays(targetDate,-offset)
    );

    if(!isRepeatStartOn(event,candidateKey))continue;

    const occurrenceStart=eventDateTime(
      candidateKey,
      event.time||"09:00"
    );
    const occurrenceEnd=new Date(
      occurrenceStart.getTime()+duration
    );

    if(
      occurrenceStart<targetEnd
      &&occurrenceEnd>targetStart
    ){
      instances.push({
        ...event,
        occurrenceDate:candidateKey,
        occurrenceStartDate:candidateKey,
        occurrenceEndDate:dateKey(occurrenceEnd),
        calendarDate:key,
        progress:eventOccurrenceProgress(
          event,
          candidateKey
        )
      });
    }
  }

  return instances;
}
function allEventsForDate(key){
  return state.events
    .flatMap(event=>occurrenceInstancesForDate(event,key))
    .sort((a,b)=>{
      const first=occurrenceSegment(a,key);
      const second=occurrenceSegment(b,key);
      return first.start.localeCompare(second.start);
    });
}
function eventsForDate(key){
  return allEventsForDate(key).filter(passesCategoryFilter);
}
function occurrenceSegment(event,key){
  const occurrenceStartKey=
    event.occurrenceStartDate
    ||event.occurrenceDate
    ||event.date;

  const occurrenceStart=eventDateTime(
    occurrenceStartKey,
    event.time||"09:00"
  );
  const occurrenceEnd=new Date(
    occurrenceStart.getTime()+eventDurationMs(event)
  );
  const dayStart=eventDateTime(key,"00:00");
  const dayEnd=eventDateTime(key,"24:00");

  const segmentStart=new Date(
    Math.max(
      occurrenceStart.getTime(),
      dayStart.getTime()
    )
  );
  const segmentEnd=new Date(
    Math.min(
      occurrenceEnd.getTime(),
      dayEnd.getTime()
    )
  );

  return {
    start:
      segmentStart.getTime()===dayStart.getTime()
        ?"00:00"
        :`${pad(segmentStart.getHours())}:${pad(segmentStart.getMinutes())}`,
    end:
      segmentEnd.getTime()===dayEnd.getTime()
        ?"24:00"
        :`${pad(segmentEnd.getHours())}:${pad(segmentEnd.getMinutes())}`
  };
}
function eventDisplayStart(event){
  return event.displayTime||event.time||"09:00";
}
function eventDisplayEnd(event){
  return event.displayEndTime
    ||event.endTime
    ||defaultEndTime(eventDisplayStart(event));
}
function eventsForCalendarDate(key){
  return eventsForDate(key).map(event=>{
    const segment=occurrenceSegment(event,key);

    return {
      ...event,
      calendarDate:key,
      displayTime:segment.start,
      displayEndTime:segment.end
    };
  });
}

function monthOccurrences(){
  const y=state.currentMonth.getFullYear(),m=state.currentMonth.getMonth(),last=new Date(y,m+1,0).getDate();const list=[];
  for(let d=1;d<=last;d++)list.push(...eventsForDate(dateKey(new Date(y,m,d))));
  return list;
}


function habitLogKey(habitId,key){return `${habitId}_${key}`}
function habitProgress(habitId,key){return Number(state.habitLogs[habitLogKey(habitId,key)]?.progress||0)}
function habitDefaultEndDate(habit){
  return new Date(9999,11,31);
}
function habitEffectiveEndDate(habit){
  return habit.endDate
    ?parseDateKey(habit.endDate)
    :habitDefaultEndDate(habit);
}
function habitIsActive(habit,key){
  const target=parseDateKey(key);
  const start=parseDateKey(habit.startDate);
  const end=habitEffectiveEndDate(habit);

  if(target<start||target>end)return false;

  const repeat=habit.repeat||"daily";
  const day=target.getDay();

  if(repeat==="daily")return true;
  if(repeat==="weekdays")return day>=1&&day<=5;
  if(repeat==="weekends")return day===0||day===6;

  const days=Math.round((target-start)/86400000);

  if(repeat==="weekly"){
    return days%7===0;
  }

  if(repeat==="monthly"){
    return target.getDate()===start.getDate();
  }

  return true;
}
function daysBetween(a,b){return Math.round((parseDateKey(b)-parseDateKey(a))/86400000)}
function habitStreak(habit){
  let streak=0;
  let cursor=new Date();
  if(dateKey(cursor)>state.selectedHabitDateKey)cursor=parseDateKey(state.selectedHabitDateKey);
  for(let i=0;i<3660;i++){
    const key=dateKey(cursor);
    if(!habitIsActive(habit,key))break;
    if(habitProgress(habit.id,key)===100){streak++;cursor=addDays(cursor,-1)}else break;
  }
  return streak;
}

function activeHabitsOn(key){
  return state.habits.filter(habit=>habitIsActive(habit,key));
}
function habitAverageForDate(key){
  const habits=activeHabitsOn(key);
  if(!habits.length)return 0;
  return Math.round(habits.reduce((sum,habit)=>sum+habitProgress(habit.id,key),0)/habits.length);
}
function combinedProgressForDate(key){
  const eventItems=allEventsForDate(key);
  const habits=activeHabitsOn(key);
  const values=[];
  if(eventItems.length)values.push(average(eventItems));
  if(habits.length)values.push(habitAverageForDate(key));
  return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
}
function monthKeys(date){
  const y=date.getFullYear(),m=date.getMonth(),last=new Date(y,m+1,0).getDate();
  return Array.from({length:last},(_,i)=>dateKey(new Date(y,m,i+1)));
}
function habitMonthAverage(habit,keys){
  const activeKeys=keys.filter(key=>habitIsActive(habit,key));
  if(!activeKeys.length)return 0;
  return Math.round(activeKeys.reduce((sum,key)=>sum+habitProgress(habit.id,key),0)/activeKeys.length);
}
function renderStats(){
  const selectedDate=parseDateKey(state.statsDate||dateKey(new Date()));
  const selectedKey=dateKey(selectedDate);
  const todayKey=dateKey(new Date());
  const isToday=selectedKey===todayKey;
  const dayName=`${selectedDate.getMonth()+1}월 ${selectedDate.getDate()}일`;

  if(
    state.currentMonth.getFullYear()!==selectedDate.getFullYear()
    ||state.currentMonth.getMonth()!==selectedDate.getMonth()
  ){
    state.currentMonth=startOfMonth(selectedDate);
  }

  const dayEvents=allEventsForDate(selectedKey);
  const dayHabits=activeHabitsOn(selectedKey);
  const dayEventAvg=average(dayEvents);
  const dayHabitAvg=habitAverageForDate(selectedKey);
  const dayCombined=combinedProgressForDate(selectedKey);


  const monthAnchor=startOfMonth(selectedDate);
  const monthText=`${selectedDate.getFullYear()}년 ${selectedDate.getMonth()+1}월`;
  const keys=monthKeys(monthAnchor);
  const monthEventOccurrences=keys.flatMap(key=>allEventsForDate(key));
  const monthEventAvg=average(monthEventOccurrences);

  const checklistRows=monthEventOccurrences.flatMap(event=>
    checklistForOccurrence(event).map(item=>({
      ...item,
      autoFailed:item.status==="pending"&&isOccurrencePast(event)
    }))
  );
  const checklistTotal=checklistRows.length;
  const checklistDone=checklistRows.filter(item=>item.status==="done").length;
  const checklistFailed=checklistRows.filter(
    item=>item.status==="failed"||item.autoFailed
  ).length;
  const checklistProgress=checklistTotal
    ?Math.round(checklistDone/checklistTotal*100)
    :0;

  const activeMonthHabits=state.habits.filter(habit=>
    keys.some(key=>habitIsActive(habit,key))
  );
  const monthHabitValues=[];

  activeMonthHabits.forEach(habit=>{
    keys.forEach(key=>{
      if(habitIsActive(habit,key)){
        const value=habitProgress(habit.id,key);
        monthHabitValues.push(value);
      }
    });
  });

  const monthHabitAvg=monthHabitValues.length
    ?Math.round(monthHabitValues.reduce((a,b)=>a+b,0)/monthHabitValues.length)
    :0;
  const combinedValues=[];
  if(monthEventOccurrences.length)combinedValues.push(monthEventAvg);
  if(monthHabitValues.length)combinedValues.push(monthHabitAvg);
  const monthCombined=combinedValues.length
    ?Math.round(combinedValues.reduce((a,b)=>a+b,0)/combinedValues.length)
    :0;

  const mobileStats=window.matchMedia("(max-width:720px)").matches;
  el.statsDayEventLabel.textContent=mobileStats?`${selectedDate.getMonth()+1}월 종합`:`${monthText} 종합 완료율`;
  el.statsDayHabitLabel.textContent=mobileStats?"일정":`${monthText} 일정 완료율`;
  el.statsMonthCombinedLabel.textContent=mobileStats?"습관":`${monthText} 습관 완료율`;
  el.statsChecklistLabel.textContent=mobileStats?"체크리스트":`${monthText} 체크리스트 완료율`;

  el.statsTodayEventProgress.textContent=`${monthCombined}%`;
  el.statsTodayEventCount.textContent="일정 + 습관";
  el.statsTodayHabitProgress.textContent=`${monthEventAvg}%`;
  el.statsTodayHabitCount.textContent=`일정 ${monthEventOccurrences.length}개`;
  el.statsMonthCombinedProgress.textContent=`${monthHabitAvg}%`;
  const monthHabitCountLabel=el.statsMonthCombinedProgress.nextElementSibling;
  if(monthHabitCountLabel)monthHabitCountLabel.textContent=`활성 습관 ${activeMonthHabits.length}개`;
  el.statsChecklistProgress.textContent=`${checklistProgress}%`;
  el.statsChecklistCount.textContent=`완료 ${checklistDone} / 전체 ${checklistTotal}`;

  el.statsMonthCalendarTitle.textContent=`${monthText} 성과`;
  el.statsWeeklyTitle.textContent=`${dayName} 기준 최근 7일 완료율`;
  el.statsMonthSummaryTitle.textContent=`${monthText} 요약`;
  el.statsCategoryTitle.textContent=`카테고리별 ${selectedDate.getMonth()+1}월 성취도`;
  el.statsHabitRankingTitle.textContent=`습관별 ${selectedDate.getMonth()+1}월 달성률`;

  el.statsMonthEventCount.textContent=`${monthEventOccurrences.length}개`;
  el.statsMonthEventProgress.textContent=`${monthEventAvg}%`;
  el.statsMonthHabitCount.textContent=`${activeMonthHabits.length}개`;
  el.statsMonthHabitProgress.textContent=`${monthHabitAvg}%`;
  el.statsChecklistTotal.textContent=`${checklistTotal}개`;
  el.statsChecklistDone.textContent=`${checklistDone}개`;
  el.statsChecklistFailed.textContent=`${checklistFailed}개`;

  renderMonth();
  renderWeeklyProgress(selectedDate);
  renderCategoryAchievement(keys);
  renderHabitRanking(keys);
}
function renderWeeklyProgress(referenceDate=parseDateKey(state.statsDate||dateKey(new Date()))){
  el.weeklyProgressChart.innerHTML="";
  const today=new Date(referenceDate.getFullYear(),referenceDate.getMonth(),referenceDate.getDate());
  for(let offset=6;offset>=0;offset--){
    const d=addDays(today,-offset),key=dateKey(d),value=combinedProgressForDate(key);
    const col=document.createElement("div");col.className="weekly-chart-day";
    col.innerHTML=`<span class="weekly-chart-value">${value}%</span><div class="weekly-chart-track"><div class="weekly-chart-fill" style="height:${Math.max(value,1)}%"></div></div><strong class="weekly-chart-label">${["일","월","화","수","목","금","토"][d.getDay()]}</strong><span class="weekly-chart-date">${d.getMonth()+1}/${d.getDate()}</span>`;
    el.weeklyProgressChart.appendChild(col);
  }
}
function renderCategoryAchievement(keys){
  el.categoryAchievement.innerHTML="";

  const rows=state.categories.map(category=>{
    const occurrences=[];

    keys.forEach(key=>{
      allEventsForDate(key)
        .filter(event=>eventCategory(event)===category.id)
        .forEach(event=>occurrences.push(event));
    });

    return {
      category,
      count:occurrences.length,
      value:average(occurrences)
    };
  }).filter(row=>row.count>0).sort((a,b)=>b.value-a.value);

  if(!rows.length){
    el.categoryAchievement.innerHTML='<div class="stats-empty">이번 달 카테고리 일정이 없습니다.</div>';
    return;
  }

  rows.forEach(({category,value,count})=>{
    const row=document.createElement("div");
    row.className="habit-rank-row";
    row.innerHTML=`
      <span class="habit-rank-name with-dot">
        <i class="category-achievement-dot" style="background:${category.color}"></i>
        ${escapeHtml(category.name)}
      </span>
      <div class="habit-rank-track">
        <div class="habit-rank-fill" style="width:${value}%"></div>
      </div>
      <strong class="habit-rank-value" title="${count}개 일정">${value}%</strong>
    `;
    el.categoryAchievement.appendChild(row);
  });
}

function renderHabitRanking(keys){
  el.habitRanking.innerHTML="";
  if(!state.habits.length){
    el.habitRanking.innerHTML='<div class="stats-empty">등록된 습관이 없습니다.</div>';
    return;
  }
  const rows=state.habits.map(habit=>({habit,value:habitMonthAverage(habit,keys)})).sort((a,b)=>b.value-a.value);
  rows.forEach(({habit,value})=>{
    const row=document.createElement("div");row.className="habit-rank-row";
    row.innerHTML=`<span class="habit-rank-name">${escapeHtml(habit.name)}</span><div class="habit-rank-track"><div class="habit-rank-fill" style="width:${value}%"></div></div><strong class="habit-rank-value">${value}%</strong>`;
    el.habitRanking.appendChild(row);
  });
}


function normalizeSearchText(value){
  return String(value||"")
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g," ")
    .trim();
}
function highlightSearchText(value,query){
  const text=String(value||"");
  if(!query)return escapeHtml(text);

  const escapedQuery=query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return escapeHtml(text).replace(
    new RegExp(`(${escapedQuery})`,"gi"),
    "<mark>$1</mark>"
  );
}
function eventSearchText(event){
  return normalizeSearchText([
    event.title,
    event.memo,
    repeatLabel(event.repeat),
    categoryLabel(eventCategory(event))
  ].join(" "));
}
function habitSearchText(habit){
  return normalizeSearchText(habit.name);
}
function renderSearch(){
  const queryText=state.searchQuery.trim();
  const normalizedQuery=normalizeSearchText(queryText);

  el.globalSearchInput.value=queryText;
  el.searchResults.innerHTML="";

  document.querySelectorAll(".search-filter-button").forEach(button=>{
    button.classList.toggle("active",button.dataset.filter===state.searchFilter);
  });

  if(!normalizedQuery){
    el.searchSummary.textContent="검색어를 입력하세요.";
    el.searchResults.innerHTML='<div class="search-empty">일정 제목, 메모 또는 습관 이름을 검색할 수 있습니다.</div>';
    return;
  }

  const results=[];

  if(state.searchFilter==="all"||state.searchFilter==="events"){
    state.events.forEach(event=>{
      if(eventSearchText(event).includes(normalizedQuery)){
        results.push({
          type:"event",
          sortDate:event.date,
          data:event
        });
      }
    });
  }

  if(state.searchFilter==="all"||state.searchFilter==="habits"){
    state.habits.forEach(habit=>{
      if(habitSearchText(habit).includes(normalizedQuery)){
        results.push({
          type:"habit",
          sortDate:habit.startDate,
          data:habit
        });
      }
    });
  }

  results.sort((a,b)=>String(b.sortDate||"").localeCompare(String(a.sortDate||"")));
  el.searchSummary.textContent=`검색 결과 ${results.length}개`;

  if(!results.length){
    el.searchResults.innerHTML='<div class="search-empty">일치하는 결과가 없습니다.</div>';
    return;
  }

  results.forEach(result=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="search-result-card";

    if(result.type==="event"){
      const event=result.data;
      const memoOrChecklist=event.memo||"메모 없음";

      button.innerHTML=`
        <div class="search-result-top">
          <span class="search-result-type">일정</span>
          <span class="search-result-date">${escapeHtml(event.date)} ${escapeHtml(event.time)}</span>
        </div>
        <strong>${highlightSearchText(event.title,queryText)}</strong>
        <p>${highlightSearchText(memoOrChecklist,queryText)}</p>
        <div class="search-result-meta">
          <span class="search-result-category"><i class="category-dot ${eventCategory(event)}"></i>${categoryLabel(eventCategory(event))}</span>
          <span>${event.repeat&&event.repeat!=="none"?`반복 · ${repeatLabel(event.repeat)}`:"일회성 일정"}</span>
          <span>완료율 ${Number(event.progress||0)}%</span>
        </div>
      `;

      button.addEventListener("click",()=>{
        state.selectedDateKey=event.date;
        state.currentMonth=startOfMonth(parseDateKey(event.date));
        state.currentWeek=startOfWeek(parseDateKey(event.date));
        navigateToPage("calendar");
        renderAll();
        openEdit({...event,occurrenceDate:event.date,progress:eventOccurrenceProgress(event,event.date)});
      });
    }else{
      const habit=result.data;
      button.innerHTML=`
        <div class="search-result-top">
          <span class="search-result-type">습관</span>
          <span class="search-result-date">시작일 ${escapeHtml(habit.startDate)}</span>
        </div>
        <strong>${highlightSearchText(habit.name,queryText)}</strong>
        <p>오늘 완료율 ${habitProgress(habit.id,dateKey(new Date()))}% · 연속 100% ${habitStreak(habit)}일</p>
      `;

      button.addEventListener("click",()=>{
        state.selectedHabitDateKey=dateKey(new Date());
        state.habitMonth=startOfMonth(new Date());
        navigateToPage("habit");
        openHabitEdit(habit);
      });
    }

    el.searchResults.appendChild(button);
  });
}



function parseQuickDate(text){
  const now=new Date();
  const normalized=text.replace(/\s+/g," ").trim();

  if(/모레/.test(normalized))return addDays(now,2);
  if(/내일/.test(normalized))return addDays(now,1);
  if(/오늘/.test(normalized))return now;

  const fullDate=normalized.match(/(20\d{2})[-./년\s](\d{1,2})[-./월\s](\d{1,2})일?/);
  if(fullDate){
    return new Date(Number(fullDate[1]),Number(fullDate[2])-1,Number(fullDate[3]));
  }

  const monthDay=normalized.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if(monthDay){
    const candidate=new Date(now.getFullYear(),Number(monthDay[1])-1,Number(monthDay[2]));
    if(candidate<startOfDay(now))candidate.setFullYear(candidate.getFullYear()+1);
    return candidate;
  }

  return parseDateKey(state.selectedDateKey||dateKey(now));
}
function startOfDay(date){
  const value=new Date(date);
  value.setHours(0,0,0,0);
  return value;
}
function parseQuickTime(text){
  const ampm=text.match(/(오전|오후)\s*(\d{1,2})(?:시|\s*:\s*(\d{2}))?/);
  if(ampm){
    let hour=Number(ampm[2])%12;
    if(ampm[1]==="오후")hour+=12;
    return `${pad(hour)}:${pad(Number(ampm[3]||0))}`;
  }

  const clock=text.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/);
  if(clock)return `${pad(Number(clock[1]))}:${clock[2]}`;

  const hourOnly=text.match(/(?:^|\s)([01]?\d|2[0-3])시(?:\s|$)/);
  if(hourOnly)return `${pad(Number(hourOnly[1]))}:00`;

  return "09:00";
}
function parseQuickRepeat(text){
  if(/평일/.test(text))return "weekdays";
  if(/매일/.test(text))return "daily";
  if(/매주/.test(text))return "weekly";
  if(/매월|매달/.test(text))return "monthly";
  return "none";
}
function quickTitle(text){
  return text
    .replace(/20\d{2}[-./년\s]\d{1,2}[-./월\s]\d{1,2}일?/g," ")
    .replace(/\d{1,2}월\s*\d{1,2}일/g," ")
    .replace(/오늘|내일|모레/g," ")
    .replace(/(오전|오후)\s*\d{1,2}(?:시|\s*:\s*\d{2})?/g," ")
    .replace(/(?:^|\s)([01]?\d|2[0-3]):[0-5]\d(?:\s|$)/g," ")
    .replace(/(?:^|\s)([01]?\d|2[0-3])시(?:\s|$)/g," ")
    .replace(/평일|매일|매주|매월|매달/g," ")
    .replace(/\s+/g," ")
    .trim();
}
async function submitQuickAdd(){
  const raw=el.quickAddInput.value.trim();
  el.quickAddMessage.classList.remove("error");

  if(!raw){
    el.quickAddMessage.textContent="일정 내용을 입력하세요.";
    el.quickAddMessage.classList.add("error");
    return;
  }

  const parsedDate=parseQuickDate(raw);
  const date=dateKey(parsedDate);
  const time=parseQuickTime(raw);
  const repeat=parseQuickRepeat(raw);
  const title=quickTitle(raw);

  if(!title){
    el.quickAddMessage.textContent="일정 제목을 함께 입력하세요.";
    el.quickAddMessage.classList.add("error");
    return;
  }

  try{
    await addDoc(
      collection(db,"users",state.user.uid,"events"),
      {
        title,
        category:"other",
        date,
        time,
        endTime:defaultEndTime(time),
        repeat,
        memo:"",
        checklist:[],
        progress:0,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      }
    );

    state.selectedDateKey=date;
    state.currentMonth=startOfMonth(parsedDate);
    state.currentWeek=startOfWeek(parsedDate);

    el.quickAddInput.value="";
    el.quickAddMessage.textContent="";
    el.quickAddMessage.classList.remove("error");
    renderAll();
  }catch(error){
    console.error(error);
    el.quickAddMessage.textContent="일정을 추가하지 못했습니다.";
    el.quickAddMessage.classList.add("error");
  }
}

function currentHistoryState(){
  return {
    momentum:true,
    page:state.activePage
  };
}
function navigateToPage(page,{push=true}={}){
  if(!["calendar","habit","stats","search"].includes(page))page="calendar";

  state.activePage=page;
  if(page==="stats"){
    state.statsInsightDate=null;
  }

  if(push){
    history.pushState(currentHistoryState(),"",location.href);
  }

  renderPage();
}
function syncHistoryState({replace=false}={}){
  const method=replace?"replaceState":"pushState";
  history[method](currentHistoryState(),"",location.href);
}


function animateVisiblePage(){
  const page=[el.calendarPage,el.habitPage,el.statsPage,el.searchPage].find(item=>!item.hidden);
  if(!page)return;
  page.classList.remove("page-enter");
  void page.offsetWidth;
  page.classList.add("page-enter");
}
function haptic(pattern=18){
  try{navigator.vibrate?.(pattern)}catch{}
}
function showToast(message){
  const toast=document.createElement("div");
  toast.className="drag-toast";
  toast.textContent=message;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),1800);
}

function renderPage(){
  const calendarMode=state.activePage==="calendar";
  const habitMode=state.activePage==="habit";
  const statsMode=state.activePage==="stats";
  const searchMode=state.activePage==="search";

  el.calendarPage.hidden=!calendarMode;
  el.habitPage.hidden=!habitMode;
  el.statsPage.hidden=!statsMode;
  el.searchPage.hidden=!searchMode;

  el.calendarNav.classList.toggle("active",calendarMode);
  el.habitNav.classList.toggle("active",habitMode);
  el.statsNav.classList.toggle("active",statsMode);
  el.searchNav.classList.toggle("active",searchMode);

  el.mobileCalendarNav.classList.toggle("active",calendarMode);
  el.mobileHabitNav.classList.toggle("active",habitMode);
  el.mobileStatsNav.classList.toggle("active",statsMode);
  el.mobileSearchNav.classList.toggle("active",searchMode);

  el.mobileAdd.hidden=
    statsMode
    ||searchMode
    ||(calendarMode&&state.currentView==="week");
  el.mobileAdd.classList.toggle("habit-mode",habitMode);

  document.body.classList.toggle(
    "week-fullscreen",
    calendarMode&&state.currentView==="week"
  );

  const topAddButton=document.querySelector(".desktop-add");
  if(topAddButton){
    topAddButton.hidden=
      calendarMode
      &&(
        state.currentView==="week"
        ||window.matchMedia("(max-width:720px)").matches
      );
  }
  el.mobileAdd.setAttribute("aria-label",habitMode?"습관 추가":"일정 추가");

  if(habitMode)renderHabits();
  if(statsMode)renderStats();
  animateVisiblePage();
  if(searchMode){
    renderSearch();
    requestAnimationFrame(()=>el.globalSearchInput.focus());
  }
}
function renderHabits(){
  renderHabitList();
  renderHabitHeatmap();
}
function renderHabitList(){
  const d=parseDateKey(state.selectedHabitDateKey);
  el.habitTodayLabel.textContent=`${d.getMonth()+1}월 ${d.getDate()}일 습관`;
  el.habitList.innerHTML="";
  const active=state.habits.filter(h=>habitIsActive(h,state.selectedHabitDateKey));
  if(!active.length){
    el.habitList.innerHTML='<div class="habit-empty">등록된 습관이 없습니다.<br>오른쪽 아래 + 버튼을 눌러 시작하세요.</div>';
    return;
  }
  active.forEach(habit=>{
    const progress=habitProgress(habit.id,state.selectedHabitDateKey);
    const item=document.createElement("article");item.className="habit-item";
    const streak=habitStreak(habit);
    item.innerHTML=`<div class="habit-item-top"><div class="habit-item-title"><strong>${escapeHtml(habit.name)}</strong><small>연속 100% ${streak}일</small></div><button class="habit-edit-button" type="button">수정</button></div>`;
    item.querySelector(".habit-edit-button").onclick=()=>openHabitEdit(habit);
    const picker=document.createElement("div");picker.className="habit-progress-picker";
    [0,25,50,75,100].forEach(value=>{
      const button=document.createElement("button");button.type="button";button.className="habit-progress-button";button.textContent=`${value}%`;button.style.background=COLORS[value];button.style.color=value<=25?"#557066":"#fff";
      if(progress===value)button.classList.add("selected");
      button.onclick=()=>{
        picker.querySelectorAll(".habit-progress-button").forEach(candidate=>{
          candidate.classList.toggle("selected",candidate===button);
        });
        setHabitProgress(
          habit.id,
          state.selectedHabitDateKey,
          value,
          {optimistic:true}
        );
      };
      picker.appendChild(button);
    });
    item.appendChild(picker);el.habitList.appendChild(item);
  });
}
function nextHabitProgressValue(value){
  const values=[0,25,50,75,100];
  const index=values.indexOf(Number(value));
  return values[(index+1)%values.length];
}
function formatHeatmapDate(key){
  const date=parseDateKey(key);
  return `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일 (${["일","월","화","수","목","금","토"][date.getDay()]})`;
}
function getHeatmapTooltip(){
  let tooltip=document.getElementById("habitHeatmapTooltip");
  if(!tooltip){
    tooltip=document.createElement("div");
    tooltip.id="habitHeatmapTooltip";
    tooltip.className="habit-heatmap-tooltip";
    tooltip.hidden=true;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}
function showHeatmapTooltip(cell,habit,key,value){
  const tooltip=getHeatmapTooltip();
  tooltip.innerHTML=`<strong>${escapeHtml(habit.name)}</strong><span>${formatHeatmapDate(key)}</span><b>${value}%</b>`;
  tooltip.hidden=false;

  const rect=cell.getBoundingClientRect();
  const tipRect=tooltip.getBoundingClientRect();
  const left=Math.max(10,Math.min(window.innerWidth-tipRect.width-10,rect.left+rect.width/2-tipRect.width/2));
  const top=Math.max(10,rect.top-tipRect.height-10);
  tooltip.style.left=`${left}px`;
  tooltip.style.top=`${top}px`;
}
function hideHeatmapTooltip(){
  const tooltip=document.getElementById("habitHeatmapTooltip");
  if(tooltip)tooltip.hidden=true;
}
function bindHeatmapCell(cell,habit,key){
  let longPressTimer=null;
  let longPressed=false;

  const refreshTitle=()=>{
    const value=habitProgress(habit.id,key);
    cell.title=`${habit.name} · ${formatHeatmapDate(key)} · ${value}%`;
    cell.setAttribute("aria-label",cell.title);
  };

  cell.type="button";
  cell.classList.add("interactive");
  cell.dataset.habitId=habit.id;
  cell.dataset.date=key;
  cell.dataset.progress=String(habitProgress(habit.id,key));
  cell.style.background=COLORS[habitProgress(habit.id,key)];
  refreshTitle();

  cell.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();

    if(longPressed){
      longPressed=false;
      return;
    }

    const current=habitProgress(habit.id,key);
    const next=nextHabitProgressValue(current);
    cell.style.background=COLORS[next];
    cell.dataset.progress=String(next);
    cell.title=`${habit.name} · ${formatHeatmapDate(key)} · ${next}%`;
    setHabitProgress(habit.id,key,next,{optimistic:true});
  });

  cell.addEventListener("mouseenter",()=>{
    showHeatmapTooltip(cell,habit,key,habitProgress(habit.id,key));
  });
  cell.addEventListener("mouseleave",hideHeatmapTooltip);

  cell.addEventListener("pointerdown",event=>{
    if(event.pointerType!=="touch")return;
    longPressed=false;
    clearTimeout(longPressTimer);
    longPressTimer=setTimeout(()=>{
      longPressed=true;
      showHeatmapTooltip(cell,habit,key,habitProgress(habit.id,key));
      haptic(12);
    },520);
  });
  ["pointerup","pointercancel","pointerleave"].forEach(type=>{
    cell.addEventListener(type,()=>{
      clearTimeout(longPressTimer);
      if(type!=="pointerleave"){
        setTimeout(hideHeatmapTooltip,1100);
      }
    });
  });
}
function monthlyOccurrenceDate(start,monthOffset){
  const year=start.getFullYear();
  const month=start.getMonth()+monthOffset;
  const candidate=new Date(year,month,start.getDate());
  if(candidate.getDate()!==start.getDate())return null;
  return candidate;
}
function firstWeeklyOccurrenceOnOrAfter(habit,anchor){
  const start=parseDateKey(habit.startDate);
  const base=anchor>start?anchor:start;
  const delta=(start.getDay()-base.getDay()+7)%7;
  return addDays(base,delta);
}
function heatmapRowsForHabit(habit){
  const repeat=habit.repeat||"daily";
  const anchor=startOfMonth(state.habitMonth);
  const end=habit.endDate?parseDateKey(habit.endDate):null;
  const keys=[];

  if(repeat==="weekly"){
    const first=firstWeeklyOccurrenceOnOrAfter(habit,anchor);
    for(let i=0;i<52;i++){
      const date=addDays(first,i*7);
      if(end&&date>end)break;
      keys.push(dateKey(date));
    }
    return [{label:"",keys}];
  }

  if(repeat==="monthly"){
    const habitStart=parseDateKey(habit.startDate);
    const firstMonthOffset=Math.max(
      0,
      (anchor.getFullYear()-habitStart.getFullYear())*12
      +(anchor.getMonth()-habitStart.getMonth())
    );

    for(let i=0;i<12;i++){
      const date=monthlyOccurrenceDate(habitStart,firstMonthOffset+i);
      if(!date)continue;
      if(date<habitStart)continue;
      if(end&&date>end)break;
      keys.push(dateKey(date));
    }
    return [{label:"",keys}];
  }

  const y=anchor.getFullYear();
  const m=anchor.getMonth();
  const monthFirst=new Date(y,m,1);
  const monthLast=new Date(y,m+1,0);
  const habitStart=parseDateKey(habit.startDate);
  const visibleStart=habitStart>monthFirst?habitStart:monthFirst;
  const visibleEnd=end&&end<monthLast?end:monthLast;

  if(visibleStart>visibleEnd)return [];

  for(let day=visibleStart.getDate();day<=visibleEnd.getDate();day++){
    const key=dateKey(new Date(y,m,day));
    if(habitIsActive(habit,key))keys.push(key);
  }

  return [{label:"",keys}];
}
function heatmapCellShortLabel(key){
  const date=parseDateKey(key);
  return `${date.getMonth()+1}/${date.getDate()}`;
}
function createHeatmapHabitBlock(habit,className){
  const block=document.createElement("section");
  block.className=className;

  const title=document.createElement("button");
  title.type="button";
  title.className="heatmap-block-name";
  title.textContent=habit.name;
  title.onclick=()=>openHabitEdit(habit);
  block.appendChild(title);

  const rows=heatmapRowsForHabit(habit);
  const keys=rows.flatMap(row=>row.keys);

  if(!keys.length){
    const empty=document.createElement("div");
    empty.className="heatmap-period-empty";
    empty.textContent="이 기간에는 반복 일정이 없습니다.";
    block.appendChild(empty);
    return block;
  }

  const cells=document.createElement("div");
  cells.className="heatmap-square-grid";

  keys.forEach(key=>{
    const cell=document.createElement("button");
    cell.className="heatmap-square-cell";

    const dateLabel=document.createElement("span");
    dateLabel.className="heatmap-square-date";
    dateLabel.textContent=heatmapCellShortLabel(key);

    cell.appendChild(dateLabel);
    bindHeatmapCell(cell,habit,key);
    cells.appendChild(cell);
  });

  block.appendChild(cells);
  return block;
}
function habitHeatmapDisplayWindow(habit){
  const anchor=startOfMonth(state.habitMonth);
  const repeat=habit.repeat||"daily";

  if(repeat==="weekly"||repeat==="monthly"){
    const end=new Date(anchor.getFullYear()+1,anchor.getMonth(),0);
    return {start:anchor,end};
  }

  return {
    start:anchor,
    end:new Date(anchor.getFullYear(),anchor.getMonth()+1,0)
  };
}
function habitExistsInHeatmapPeriod(habit){
  if(!habit?.startDate)return false;

  const habitStart=parseDateKey(habit.startDate);
  const habitEnd=habit.endDate
    ?parseDateKey(habit.endDate)
    :new Date(9999,11,31);

  const window=habitHeatmapDisplayWindow(habit);

  // 습관이 표시 기간보다 뒤에 시작했거나, 표시 기간 전에 이미 끝났다면 숨김.
  if(habitStart>window.end)return false;
  if(habitEnd<window.start)return false;

  // 겹치는 기간 안에 실제 반복 대상 날짜가 최소 1개 있어야 표시.
  const from=habitStart>window.start?habitStart:window.start;
  const to=habitEnd<window.end?habitEnd:window.end;

  for(let cursor=new Date(from);cursor<=to;cursor=addDays(cursor,1)){
    if(habitIsActive(habit,dateKey(cursor)))return true;
  }

  return false;
}
function renderHabitHeatmap(){
  const y=state.habitMonth.getFullYear();
  const m=state.habitMonth.getMonth();

  el.habitHeatmapLabel.textContent=`${y}년 ${m+1}월 기준`;

  el.habitHeatmap.innerHTML="";
  el.habitHeatmap.className="habit-heatmap compact-heatmap";

  const visibleHabits=state.habits.filter(habit=>{
    if(!habitExistsInHeatmapPeriod(habit))return false;

    const rows=heatmapRowsForHabit(habit);
    return rows.some(
      row=>Array.isArray(row.keys)
        &&row.keys.some(key=>habitIsActive(habit,key))
    );
  });

  if(!visibleHabits.length){
    const empty=document.createElement("div");
    empty.className="heatmap-global-empty";
    empty.textContent="이 기간에는 습관이 없습니다.";
    el.habitHeatmap.appendChild(empty);
  }else{
    visibleHabits.forEach(habit=>{
      el.habitHeatmap.appendChild(
        createHeatmapHabitBlock(habit,"heatmap-desktop-habit")
      );
    });
  }

  let mobile=document.getElementById("mobileHabitHeatmap");
  if(!mobile){
    mobile=document.createElement("div");
    mobile.id="mobileHabitHeatmap";
    mobile.className="mobile-heatmap";
    el.habitHeatmap.parentElement.insertAdjacentElement("afterend",mobile);
  }

  mobile.innerHTML="";

  if(!visibleHabits.length){
    const empty=document.createElement("div");
    empty.className="heatmap-global-empty";
    empty.textContent="이 기간에는 습관이 없습니다.";
    mobile.appendChild(empty);
  }else{
    visibleHabits.forEach(habit=>{
      mobile.appendChild(
        createHeatmapHabitBlock(habit,"mobile-heatmap-habit")
      );
    });
  }
}
function resetHabitForm(){
  el.habitForm.reset();
  el.habitId.value="";
  el.habitFormError.textContent="";
  el.habitStartDate.value=dateKey(new Date());
  el.habitRepeat.value="daily";
  el.habitEndDate.value="";
}
function openHabitCreate(){haptic(12);resetHabitForm();el.habitModalEyebrow.textContent="NEW HABIT";el.habitModalTitle.textContent="습관 추가";el.deleteHabitButton.hidden=true;showHabitModal()}
function openHabitEdit(habit){
  resetHabitForm();
  el.habitId.value=habit.id;
  el.habitName.value=habit.name;
  el.habitStartDate.value=habit.startDate;
  el.habitRepeat.value=habit.repeat||"daily";
  el.habitEndDate.value=habit.endDate||"";
  el.habitModalEyebrow.textContent="EDIT HABIT";
  el.habitModalTitle.textContent="습관 수정";
  el.deleteHabitButton.hidden=false;
  showHabitModal();
}
function showHabitModal(){
  const active=document.activeElement;
  if(active instanceof HTMLElement)active.blur();

  el.habitModal.classList.add("show");
  document.body.style.overflow="hidden";
  pushModalHistory("habit");

  requestAnimationFrame(()=>{
    const focused=document.activeElement;
    if(focused instanceof HTMLElement)focused.blur();
  });
}
function closeHabitModal(){
  el.habitModal.classList.remove("show");
  document.body.style.overflow="";
  clearModalHistory("habit");
}
async function submitHabit(event){
  event.preventDefault();

  const name=el.habitName.value.trim();
  const startDate=el.habitStartDate.value;
  const repeat=el.habitRepeat.value||"daily";
  const endDate=el.habitEndDate.value||"";

  if(!state.user||!name||!startDate)return;

  if(endDate&&parseDateKey(endDate)<parseDateKey(startDate)){
    el.habitFormError.textContent="종료일은 시작일보다 빠를 수 없습니다.";
    return;
  }

  const ref=collection(db,"users",state.user.uid,"habits");

  try{
    const data={name,startDate,repeat,endDate,updatedAt:serverTimestamp()};

    if(el.habitId.value){
      const habitId=el.habitId.value;
      const previousHabit=state.habits.find(
        habit=>habit.id===habitId
      );
      const previousHabitData=firestoreRecordData(previousHabit);

      await updateDoc(doc(ref,habitId),data);

      pushUndo("습관 수정",async()=>{
        await setDoc(
          doc(ref,habitId),
          previousHabitData
        );
      });
    }else{
      const created=await addDoc(
        ref,
        {...data,createdAt:serverTimestamp()}
      );

      pushUndo("습관 추가",async()=>{
        await deleteDoc(doc(ref,created.id));
      });
    }

    closeHabitModal();
  }catch(error){
    console.error(error);
    el.habitFormError.textContent="습관을 저장하지 못했습니다.";
  }
}
async function deleteHabit(){
  if(!state.user||!el.habitId.value)return;
  if(!confirm("이 습관을 삭제할까요? 기존 기록은 화면에서 더 이상 표시되지 않습니다."))return;
  try{
    const habitId=el.habitId.value;
    const source=state.habits.find(habit=>habit.id===habitId);
    const deletedData=firestoreRecordData(source);

    await deleteDoc(
      doc(db,"users",state.user.uid,"habits",habitId)
    );

    pushUndo("습관 삭제",async()=>{
      await setDoc(
        doc(db,"users",state.user.uid,"habits",habitId),
        deletedData
      );
    });

    closeHabitModal();
  }
  catch(error){console.error(error);el.habitFormError.textContent="습관을 삭제하지 못했습니다."}
}
function updateHabitProgressDom(habitId,key,progress){
  document.querySelectorAll(
    `[data-habit-id="${CSS.escape(habitId)}"][data-date="${CSS.escape(key)}"]`
  ).forEach(cell=>{
    cell.style.background=COLORS[progress];
    cell.dataset.progress=String(progress);
  });
}
async function setHabitProgress(habitId,key,progress,{optimistic=false}={}){
  if(!state.user)return;

  const logId=habitLogKey(habitId,key);
  const previous=state.habitLogs[logId]
    ?{...state.habitLogs[logId]}
    :null;

  state.habitLogs[logId]={
    ...(state.habitLogs[logId]||{}),
    id:logId,
    habitId,
    date:key,
    progress:Number(progress)
  };

  if(optimistic){
    updateHabitProgressDom(habitId,key,Number(progress));
  }

  state.skipHabitSnapshotRenders+=2;

  const ref=doc(
    db,
    "users",
    state.user.uid,
    "habitLogs",
    logId
  );

  try{
    await setDoc(
      ref,
      {
        habitId,
        date:key,
        progress:Number(progress),
        updatedAt:serverTimestamp()
      },
      {merge:true}
    );

    pushUndo("습관 완료율",async()=>{
      if(previous){
        await setDoc(
          ref,
          firestoreRecordData(previous),
          {merge:false}
        );
      }else{
        await deleteDoc(ref);
      }
    });
  }catch(error){
    console.error(error);

    if(previous){
      state.habitLogs[logId]=previous;
      updateHabitProgressDom(
        habitId,
        key,
        Number(previous.progress||0)
      );
    }else{
      delete state.habitLogs[logId];
      updateHabitProgressDom(habitId,key,0);
    }

    renderHabitList();
    alert("습관 기록을 저장하지 못했습니다.");
  }
}
function listenHabits(user){
  if(state.unsubscribeHabits)state.unsubscribeHabits();
  if(state.unsubscribeHabitLogs)state.unsubscribeHabitLogs();
  const habitsQuery=query(collection(db,"users",user.uid,"habits"),orderBy("startDate"));
  state.unsubscribeHabits=onSnapshot(habitsQuery,snap=>{state.habits=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll();if(state.activePage==="stats")renderStats()},error=>{console.error(error);alert("습관을 불러오지 못했습니다.")});
  state.unsubscribeHabitLogs=onSnapshot(collection(db,"users",user.uid,"habitLogs"),snap=>{
    state.habitLogs={};
    snap.docs.forEach(d=>{state.habitLogs[d.id]={id:d.id,...d.data()}});

    if(state.skipHabitSnapshotRenders>0){
      state.skipHabitSnapshotRenders--;
      if(state.activePage==="stats")renderStats();
      return;
    }

    renderAll();
    if(state.activePage==="stats")renderStats();
  },error=>{console.error(error);alert("습관 기록을 불러오지 못했습니다.")});
}

async function login(){
  el.loginError.textContent="";
  try{await signInWithPopup(auth,provider)}
  catch(error){console.error(error);el.loginError.textContent=`${error.code||"오류"}: ${error.message||""}`}
}
async function logout(){await signOut(auth);closeSheet()}
async function saveProfile(user){
  await setDoc(doc(db,"users",user.uid),{displayName:user.displayName||"",email:user.email||"",photoURL:user.photoURL||"",lastLoginAt:serverTimestamp()},{merge:true})
}
function fillUser(user){
  const photo=user.photoURL||"",name=user.displayName||"사용자",email=user.email||"";
  [el.userPhoto,el.mobilePhoto,el.sheetPhoto].forEach(i=>{i.src=photo;i.alt=`${name} 프로필`});
  el.userName.textContent=name;el.userEmail.textContent=email;el.sheetName.textContent=name;el.sheetEmail.textContent=email;
}
function listen(user){
  if(state.unsubscribe)state.unsubscribe();
  if(state.unsubscribeEventLogs)state.unsubscribeEventLogs();

  const q=query(collection(db,"users",user.uid,"events"),orderBy("date"),orderBy("time"));
  state.unsubscribe=onSnapshot(
    q,
    snap=>{
      state.events=snap.docs.map(d=>({id:d.id,...d.data()}));

      if(state.skipEventSnapshotRenders>0){
        state.skipEventSnapshotRenders--;
        if(state.activePage==="search")renderSearch();
        return;
      }

      renderAll();
      if(state.activePage==="search")renderSearch();
    },
    error=>{
      console.error(error);
      alert("일정을 불러오지 못했습니다.");
    }
  );

  state.unsubscribeEventLogs=onSnapshot(
    collection(db,"users",user.uid,"eventLogs"),
    snap=>{
      state.eventLogs={};
      snap.docs.forEach(d=>{state.eventLogs[d.id]={id:d.id,...d.data()}});

      if(state.skipEventSnapshotRenders>0){
        state.skipEventSnapshotRenders--;
        return;
      }

      renderAll();
    },
    error=>{
      console.error(error);
      alert("반복 일정 완료 기록을 불러오지 못했습니다.");
    }
  );
}

function firestoreRecordData(record){
  if(!record)return null;
  const {id,...data}=record;

  return {
    ...data,
    checklist:Array.isArray(data.checklist)
      ?data.checklist.map(item=>({...item}))
      :data.checklist,
    exceptionDates:Array.isArray(data.exceptionDates)
      ?[...data.exceptionDates]
      :data.exceptionDates
  };
}
function pushUndo(label,undo){
  if(state.isUndoing||typeof undo!=="function")return;

  state.undoStack.push({label,undo});
  if(state.undoStack.length>30){
    state.undoStack.shift();
  }
}
function editableUndoTarget(target){
  return Boolean(
    target?.closest?.(
      'input, textarea, [contenteditable="true"], select'
    )
  );
}
async function undoLastAction(){
  if(
    state.isUndoing
    ||!state.user
    ||!state.undoStack.length
  ){
    return;
  }

  const action=state.undoStack.pop();
  state.isUndoing=true;

  try{
    await action.undo();
    showToast(`${action.label} 되돌림`);
  }catch(error){
    console.error(error);
    alert("마지막 작업을 되돌리지 못했습니다.");
  }finally{
    state.isUndoing=false;
  }
}
function setupDesktopUndo(){
  window.addEventListener("keydown",event=>{
    if(
      !window.matchMedia("(pointer:fine)").matches
      ||event.key.toLowerCase()!=="z"
      ||!event.ctrlKey
      ||event.altKey
      ||event.shiftKey
      ||editableUndoTarget(event.target)
    ){
      return;
    }

    event.preventDefault();
    undoLastAction();
  });
}

function captureViewScroll(){
  return {
    windowX:window.scrollX,
    windowY:window.scrollY,
    weekTop:el.weekScroll?.scrollTop??0,
    weekLeft:el.weekScroll?.scrollLeft??0,
    dayTop:el.dayViewScroll?.scrollTop??0
  };
}
function restoreViewScroll(position){
  if(!position)return;

  requestAnimationFrame(()=>{
    window.scrollTo(position.windowX,position.windowY);

    if(el.weekScroll){
      el.weekScroll.scrollTop=position.weekTop;
      el.weekScroll.scrollLeft=position.weekLeft;
    }

    if(state.dayViewOpen&&el.dayViewScroll){
      el.dayViewScroll.scrollTop=position.dayTop;
    }
  });
}
function renderAll(){
  const preservedScroll=captureViewScroll();
  const calendarMode=state.activePage==="calendar";

  renderPage();

  if(calendarMode){
    const weekMode=state.currentView==="week";

    const weekAddButton=$("weekAddEventButton");
    if(weekAddButton){
      weekAddButton.hidden=
        !weekMode
        ||window.matchMedia("(max-width:720px)").matches;
    }

    const weekCategoryManagerButton=$("weekCategoryManagerButton");
    if(weekCategoryManagerButton){
      weekCategoryManagerButton.hidden=!weekMode;
    }

    const quickAddBar=document.querySelector(".quick-add-bar");
    if(quickAddBar){
      quickAddBar.hidden=state.currentView!=="selected";
    }

    const categoryBar=document.querySelector(".category-filter-bar");
    if(categoryBar){
      categoryBar.hidden=!weekMode;
    }

    el.selectedView.hidden=state.currentView!=="selected";
    el.weekView.hidden=!weekMode;
    el.weekZoomControls.hidden=!weekMode;

    el.selectedBtn.classList.toggle("active",state.currentView==="selected");
    el.weekBtn.classList.toggle("active",weekMode);

    applyWeekZoom();
    renderCategoryControls();
    renderPeriodLabel();

    if(weekMode){
      renderWeek();
    }else{
      renderSelected();
      renderSelectedDayInsight();
      renderSummary();
    }
  }

  restoreViewScroll(preservedScroll);
}
function renderPeriodLabel(){
  if(state.currentView==="selected"){
    const d=parseDateKey(state.selectedDateKey);
    el.periodLabel.textContent=
      `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
    return;
  }

  const days=
    typeof visibleDaysForZoom==="function"
      ?visibleDaysForZoom()
      :7;
  const end=addDays(state.currentWeek,days-1);

  el.periodLabel.textContent=
    `${state.currentWeek.getMonth()+1}.${state.currentWeek.getDate()} - ${end.getMonth()+1}.${end.getDate()}`;
}

function addLongPress(element,callback){
  let timer=null;
  let startX=0;
  let startY=0;

  element.addEventListener("touchstart",event=>{
    const touch=event.touches[0];
    startX=touch.clientX;
    startY=touch.clientY;
    timer=setTimeout(()=>{
      navigator.vibrate?.(30);
      callback(event,startX,startY);
    },650);
  },{passive:true});

  element.addEventListener("touchmove",event=>{
    if(!timer)return;
    const touch=event.touches[0];
    if(Math.abs(touch.clientX-startX)>12||Math.abs(touch.clientY-startY)>12){
      clearTimeout(timer);
      timer=null;
    }
  },{passive:true});

  ["touchend","touchcancel"].forEach(type=>{
    element.addEventListener(type,()=>{
      clearTimeout(timer);
      timer=null;
    },{passive:true});
  });
}
function showEventContextMenu({x=12,y=80,event=null,date=null,time="09:00"}={}){
  if(!event)return;

  state.contextEvent=event;
  state.contextTargetDate=date||(event.occurrenceDate||event.date);
  state.contextTargetTime=time||(event.time||"09:00");

  el.duplicateEventButton.hidden=false;
  el.eventContextMenu.hidden=false;

  const width=190;
  const left=Math.min(Math.max(8,x),window.innerWidth-width-8);
  const top=Math.min(Math.max(8,y),window.innerHeight-130);

  el.eventContextMenu.style.left=`${left}px`;
  el.eventContextMenu.style.top=`${top}px`;
}
function hideEventContextMenu(){
  el.eventContextMenu.hidden=true;
  state.contextEvent=null;
}
function showMobileEventActionSheet(event){
  if(!event)return;

  state.mobileActionEvent=event;
  el.mobileEventActionTitle.textContent=event.title||"일정";
  el.mobileEventActionTime.textContent=
    `${event.occurrenceDate||event.date} · ${event.time||"09:00"}–${event.endTime||defaultEndTime(event.time||"09:00")}`;

  el.mobileEventActionSheet.hidden=false;
  document.body.style.overflow="hidden";
  haptic(12);
}
function hideMobileEventActionSheet(){
  el.mobileEventActionSheet.hidden=true;
  state.mobileActionEvent=null;

  if(
    !el.modal.classList.contains("show")
    &&!el.habitModal.classList.contains("show")
  ){
    document.body.style.overflow="";
  }
}
async function deleteMobileActionEvent(){
  const event=state.mobileActionEvent;
  if(!event)return;

  hideMobileEventActionSheet();
  openEdit(event);

  requestAnimationFrame(()=>{
    if(!el.remove.hidden){
      el.remove.click();
    }
  });
}

function bindContextActions(){
  // 일정 복제 메뉴를 제거하여 컨텍스트 메뉴를 사용하지 않습니다.
}


function isRecurringEvent(event){
  return (event.repeat||"none")!=="none";
}
function canDirectlyMoveEvent(event){
  return Boolean(event);
}
async function detachRecurringOccurrence(event,overrides={}){
  if(!state.user||!event)return;

  const source=state.events.find(item=>item.id===event.id)||event;
  const occurrenceDate=event.occurrenceDate||event.date;
  const exceptionDates=Array.from(
    new Set([
      ...(Array.isArray(source.exceptionDates)?source.exceptionDates:[]),
      occurrenceDate
    ])
  ).sort();

  const newDate=overrides.date||occurrenceDate;
  const newTime=overrides.time||event.time||"09:00";
  const newEndTime=overrides.endTime||event.endTime||defaultEndTime(newTime);

  await updateDoc(
    doc(db,"users",state.user.uid,"events",event.id),
    {
      exceptionDates,
      updatedAt:serverTimestamp()
    }
  );

  const created=await addDoc(
    collection(db,"users",state.user.uid,"events"),
    {
      title:event.title||"",
      category:eventCategory(event),
      date:newDate,
      time:newTime,
      endTime:newEndTime,
      repeat:"none",
      memo:event.memo||"",
      checklist:normalizeChecklist(event.checklist),
      progress:Number(event.progress||0),
      sourceRepeatEventId:event.id,
      sourceOccurrenceDate:occurrenceDate,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );

  try{
    await deleteDoc(
      doc(db,"users",state.user.uid,"eventLogs",eventLogKey(event.id,occurrenceDate))
    );
  }catch(error){
    console.debug("반복 일정 날짜별 완료 기록이 없거나 이미 삭제되었습니다.",error);
  }

  return created;
}
async function moveEventTo(event,newDate,newTime){
  if(!state.user||!event)return;

  const currentWeekScroll=
    el.weekView?.querySelector(".google-week-body-scroll");

  if(state.currentView==="week"&&currentWeekScroll){
    state.pendingWeekScroll={
      top:currentWeekScroll.scrollTop,
      left:currentWeekScroll.scrollLeft,
      pageX:window.scrollX,
      pageY:window.scrollY
    };
  }

  const originalStart=timeToMinutes(event.time||"09:00");
  const originalEnd=timeToMinutes(event.endTime||defaultEndTime(event.time||"09:00"));
  const duration=Math.max(30,originalEnd-originalStart);

  let movedStart=timeToMinutes(newTime||event.time||"09:00");
  movedStart=Math.min(movedStart,24*60-duration);
  movedStart=Math.max(0,movedStart);

  const movedTime=minutesToTime(movedStart);
  const movedEndTime=minutesToTime(movedStart+duration);

  try{
    if(isRecurringEvent(event)){
      await detachRecurringOccurrence(event,{
        date:newDate,
        time:movedTime,
        endTime:movedEndTime
      });
    }else{
      await updateDoc(
        doc(db,"users",state.user.uid,"events",event.id),
        {
          date:newDate,
          time:movedTime,
          endTime:movedEndTime,
          updatedAt:serverTimestamp()
        }
      );

      pushUndo("일정 이동",async()=>{
        await updateDoc(
          doc(db,"users",state.user.uid,"events",event.id),
          {
            date:event.date,
            endDate:event.endDate||event.date,
            time:event.time,
            endTime:event.endTime||defaultEndTime(event.time),
            updatedAt:serverTimestamp()
          }
        );
      });
    }

    state.selectedDateKey=newDate;
    haptic([16,24,16]);
    showToast(`${newDate} ${movedTime}–${movedEndTime}로 이동했습니다.`);
  }catch(error){
    state.pendingWeekScroll=null;
    console.error(error);
    alert("일정을 이동하지 못했습니다.");
  }
}
function bindDesktopDrag(element,event){
  if(!canDirectlyMoveEvent(event))return;

  element.draggable=true;

  element.addEventListener("dragstart",dragEvent=>{
    if(!window.matchMedia("(pointer:fine)").matches){
      dragEvent.preventDefault();
      return;
    }

    if(dragEvent.target.closest(".week-event-resize-handle")){
      dragEvent.preventDefault();
      return;
    }

    const rect=element.getBoundingClientRect();
    const rowHeight=parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--week-row-height")
    )||40;

    const grabPixels=Math.max(
      0,
      Math.min(rect.height,dragEvent.clientY-rect.top)
    );

    state.dragGrabOffsetMinutes=Math.round(
      (grabPixels/rowHeight*60)/30
    )*30;

    state.dragEvent=event;
    element.classList.add("dragging");
    dragEvent.dataTransfer.effectAllowed="move";
    dragEvent.dataTransfer.setData("text/plain",event.id);
  });

  element.addEventListener("dragend",()=>{
    element.classList.remove("dragging");
    state.dragEvent=null;
    state.dragGrabOffsetMinutes=0;
    document.querySelectorAll(".drag-over").forEach(item=>item.classList.remove("drag-over"));
  });
}
function bindDropTarget(element,date,time="09:00"){
  element.addEventListener("dragover",event=>{
    if(!state.dragEvent)return;
    event.preventDefault();
    event.dataTransfer.dropEffect="move";
    element.classList.add("drag-over");
  });

  element.addEventListener("dragleave",()=>{
    element.classList.remove("drag-over");
  });

  element.addEventListener("drop",event=>{
    if(!state.dragEvent)return;
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove("drag-over");
    const dragged=state.dragEvent;
    state.dragEvent=null;
    moveEventTo(dragged,date,time||dragged.time);
  });
}
function createEventChip(event){
  const chip=document.createElement("div");
  chip.className="event-chip";
  chip.style.background=COLORS[event.progress]||COLORS[0];
  chip.style.setProperty("--event-category-color",categoryColor(eventCategory(event)));
  chip.innerHTML=`<span class="event-time">${escapeHtml(event.time)}</span><span class="event-title">${escapeHtml(event.title)}</span>${event.repeat&&event.repeat!=="none"?`<span class="repeat-badge">↻</span>`:""}`;
  chip.onclick=clickEvent=>{
    clickEvent.stopPropagation();
    openEdit(event);
  };
  bindContextActions(chip,{event,date:event.occurrenceDate||event.date,time:event.time});
  return chip;
}
function renderMonth(){
  if(!el.statsMonthGrid)return;

  const y=state.currentMonth.getFullYear();
  const m=state.currentMonth.getMonth();
  const first=new Date(y,m,1);
  const mondayIndex=(first.getDay()+6)%7;
  const start=addDays(first,-mondayIndex);
  const today=dateKey(new Date());

  el.statsMonthGrid.innerHTML="";

  for(let i=0;i<42;i++){
    const d=addDays(start,i);
    const key=dateKey(d);
    const cell=document.createElement("article");
    const combined=combinedProgressForDate(key);

    cell.className="day-cell";
    cell.dataset.date=key;
    if(d.getMonth()!==m)cell.classList.add("outside");
    if(key===today)cell.classList.add("today");
    if(key===state.statsInsightDate)cell.classList.add("selected");

    const top=document.createElement("div");
    top.className="day-topline";
    top.innerHTML=`<span class="day-number ${d.getDay()===0?"sunday":d.getDay()===6?"saturday":""}">${d.getDate()}</span>`;

    const progress=document.createElement("div");
    progress.className="month-day-insight";
    progress.innerHTML=`
      <div class="month-day-progress-track">
        <span style="width:${combined}%"></span>
      </div>
      <strong>${combined}%</strong>
    `;

    cell.append(top,progress);

    cell.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();

      state.statsDate=key;
      state.statsInsightDate=key;
      if(d.getMonth()!==m){
        state.currentMonth=startOfMonth(d);
      }
      renderStats();
    });

    el.statsMonthGrid.appendChild(cell);
  }

  requestAnimationFrame(renderMonthDayInsightPopover);
}

function renderMonthDayInsightPopover(){
  const monthView=el.statsMonthView;
  const grid=el.statsMonthGrid;
  if(!monthView||!grid)return;

  monthView.querySelector(".month-day-insight-popover")?.remove();

  if(!state.statsInsightDate)return;

  const selected=grid.querySelector(
    `.day-cell[data-date="${state.statsInsightDate}"]`
  );
  if(!selected)return;

  const key=state.statsInsightDate;
  const date=parseDateKey(key);
  const combined=combinedProgressForDate(key);
  const dayEvents=allEventsForDate(key);
  const dayHabits=activeHabitsOn(key);
  const eventAvg=average(dayEvents);
  const habitAvg=habitAverageForDate(key);

  const checklist=dayEvents.flatMap(event=>
    checklistForOccurrence(event).map(item=>({
      ...item,
      autoFailed:item.status==="pending"&&isOccurrencePast(event)
    }))
  );
  const done=checklist.filter(item=>item.status==="done").length;
  const failed=checklist.filter(
    item=>item.status==="failed"||item.autoFailed
  ).length;

  const popover=document.createElement("aside");
  popover.className="month-day-insight-popover";
  popover.innerHTML=`
    <button type="button" class="month-insight-close" aria-label="닫기">×</button>
    <div class="month-insight-title">
      <strong>${date.getMonth()+1}월 ${date.getDate()}일</strong>
      <span>${["일","월","화","수","목","금","토"][date.getDay()]}요일</span>
    </div>
    <div class="month-insight-grid">
      <div><span>종합</span><strong>${combined}%</strong></div>
      <div><span>일정</span><strong>${eventAvg}%</strong><small>${dayEvents.length}개</small></div>
      <div><span>습관</span><strong>${habitAvg}%</strong><small>${dayHabits.length}개</small></div>
      <div><span>체크</span><strong>${done}/${checklist.length}</strong><small>실패 ${failed}</small></div>
    </div>
  `;

  monthView.appendChild(popover);

  const viewRect=monthView.getBoundingClientRect();
  const cellRect=selected.getBoundingClientRect();
  const popRect=popover.getBoundingClientRect();

  let left=cellRect.right-viewRect.left+8;
  let top=cellRect.top-viewRect.top+8;

  if(left+popRect.width>viewRect.width-8){
    left=cellRect.left-viewRect.left-popRect.width-8;
  }
  if(left<8)left=8;

  if(top+popRect.height>viewRect.height-8){
    top=Math.max(8,viewRect.height-popRect.height-8);
  }

  popover.style.left=`${left}px`;
  popover.style.top=`${top}px`;

  popover.querySelector(".month-insight-close").onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    popover.remove();
    selected.classList.remove("selected");
    state.statsInsightDate=null;
  };
}
function weekZoomMinimum(){
  return window.matchMedia("(max-width:720px)").matches?30:10;
}
function visibleDaysForZoom(){
  if(state.weekFit)return 7;

  const mobile=window.matchMedia("(max-width:720px)").matches;
  const zoom=state.weekZoom;

  if(mobile){
    if(zoom>=120)return 5;
    if(zoom>=110)return 6;
    if(zoom>=100)return 7;
    if(zoom>=90)return 8;
    if(zoom>=80)return 9;
    if(zoom>=70)return 10;
    if(zoom>=60)return 11;
    if(zoom>=50)return 12;
    if(zoom>=40)return 13;
    return 14;
  }

  if(zoom>=120)return 5;
  if(zoom>=110)return 6;
  if(zoom>=100)return 7;
  if(zoom>=90)return 8;
  if(zoom>=80)return 9;
  if(zoom>=70)return 10;
  if(zoom>=60)return 11;
  if(zoom>=50)return 12;
  if(zoom>=40)return 13;
  if(zoom>=30)return 14;
  if(zoom>=20)return 21;
  return 28;
}
function isCompactWeekZoom(){
  return visibleDaysForZoom()>=14;
}
function applyWeekZoom(){
  if(state.currentView!=="week")return;

  const mobile=window.matchMedia("(max-width:720px)").matches;
  const visibleDays=visibleDaysForZoom();
  const compact=visibleDays>=14;
  const veryCompact=visibleDays>=21;

  document.body.classList.remove("week-manual-zoom");
  document.body.classList.toggle("week-two-weeks",compact);
  document.body.classList.toggle("week-four-weeks",veryCompact);

  document.documentElement.style.setProperty(
    "--week-visible-days",
    String(visibleDays)
  );

  const zoom=state.weekFit?100:state.weekZoom;
  const rowHeight=state.weekFit
    ?(mobile?36:40)
    :Math.max(mobile?21:20,Math.round((mobile?36:40)*(0.54+0.46*zoom/100)));

  document.documentElement.style.setProperty(
    "--week-time-width",
    veryCompact?(mobile?"24px":"30px"):compact?(mobile?"26px":"34px"):(mobile?"32px":"44px")
  );
  document.documentElement.style.setProperty(
    "--week-row-height",
    `${rowHeight}px`
  );

  el.weekZoomValue.textContent=state.weekFit
    ?"기본"
    :`${state.weekZoom}% · ${visibleDays}일`;

  el.weekZoomOut.disabled=state.weekZoom<=weekZoomMinimum()&&!state.weekFit;
  el.weekZoomIn.disabled=!state.weekFit&&state.weekZoom>=125;
}
function changeWeekZoom(amount){
  if(state.weekFit){
    state.weekFit=false;
    state.weekZoom=100;
  }

  const minimum=weekZoomMinimum();
  state.weekZoom=Math.min(
    125,
    Math.max(minimum,state.weekZoom+amount)
  );

  applyWeekZoom();
  renderWeek();
}
function resetWeekToFit(){
  state.weekFit=true;
  state.weekZoom=100;
  applyWeekZoom();
  renderWeek();
}

function renderWeek(){
  el.weekView.hidden=false;
  el.weekView.innerHTML="";

  const shell=document.createElement("div");
  shell.className="google-week-shell";

  const headerScroll=document.createElement("div");
  headerScroll.className="google-week-header-scroll";

  const headerTrack=document.createElement("div");
  headerTrack.className="google-week-header-track";

  const corner=document.createElement("div");
  corner.className="google-week-corner";
  headerTrack.appendChild(corner);

  const bodyScroll=document.createElement("div");
  bodyScroll.className="google-week-body-scroll";

  const bodyTrack=document.createElement("div");
  bodyTrack.className="google-week-body-track";

  const timeColumn=document.createElement("div");
  timeColumn.className="google-week-time-column";

  for(let hour=0;hour<24;hour++){
    const label=document.createElement("div");
    label.className="google-week-time-label";
    label.style.top=`calc(var(--week-row-height) * ${hour})`;
    label.textContent=`${pad(hour)}:00`;
    timeColumn.appendChild(label);
  }

  bodyTrack.appendChild(timeColumn);

  const visibleDayCount=visibleDaysForZoom();

  for(let day=0;day<visibleDayCount;day++){
    const date=addDays(state.currentWeek,day);
    const key=dateKey(date);

    const header=document.createElement("div");
    header.className="google-week-day-header";
    if(date.getDay()===0)header.classList.add("sunday");
    if(date.getDay()===6)header.classList.add("saturday");
    if(key===dateKey(new Date()))header.classList.add("today");
    header.innerHTML=
      `${["일","월","화","수","목","금","토"][date.getDay()]}<br>${date.getMonth()+1}/${date.getDate()}`;
    let lastHeaderTap=0;
    header.addEventListener("dblclick",()=>{
      openDayView(key);
    });
    header.addEventListener("touchend",touchEvent=>{
      const now=Date.now();
      if(now-lastHeaderTap<320){
        touchEvent.preventDefault();
        openDayView(key);
        lastHeaderTap=0;
      }else{
        lastHeaderTap=now;
      }
    },{passive:false});

    headerTrack.appendChild(header);

    const column=document.createElement("div");
    column.className="google-week-day-column";
    column.dataset.date=key;
    if(key===dateKey(new Date()))column.classList.add("today");

    bindGoogleWeekCreateGesture(column,key);
    bindGoogleWeekDrop(column,key);

    const layout=layoutOverlappingEvents(eventsForCalendarDate(key));

    layout.forEach(({event,columnIndex,columnCount})=>{
      const startMinutes=timeToMinutes(eventDisplayStart(event));
      const endMinutes=timeToMinutes(eventDisplayEnd(event));
      const duration=Math.max(30,endMinutes-startMinutes);

      const block=document.createElement("div");
      block.className="google-week-event";
      block.style.top=`calc(var(--week-row-height) * ${startMinutes/60})`;
      block.style.height=`calc(var(--week-row-height) * ${duration/60})`;
      block.style.left=`calc(${columnIndex} * (100% / ${columnCount}) + 1px)`;
      block.style.width=`calc(100% / ${columnCount} - 2px)`;
      block.style.background=COLORS[event.progress]||COLORS[0];
      block.style.setProperty(
        "--event-category-color",
        categoryColor(eventCategory(event))
      );

      const checklist=checklistForOccurrence(event);
      const past=isOccurrencePast(event);
      const checklistHtml=checklist.length
        ?`<div class="week-event-checklist${past?" past":""}">${
          checklist.slice(0,3).map(item=>
            `<button type="button"
              class="week-event-checkitem status-${item.status}"
              data-checklist-id="${escapeHtml(item.id)}"
              aria-label="${escapeHtml(item.text)} 상태 변경">
              <i>${checklistStatusIcon(item.status)}</i>
              <span>${escapeHtml(item.text)}</span>
            </button>`
          ).join("")
        }</div>`
        :"";

      block.innerHTML=`
        <strong class="event-title-trigger">${escapeHtml(event.title)}</strong>
        ${checklistHtml}
      `;

      bindChecklistTaps(
        block,
        event,
        ".week-event-checkitem"
      );

      block.addEventListener("click",clickEvent=>{
        if(clickEvent.target.closest(".week-event-checkitem")){
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          return;
        }

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        if(block.dataset.moved==="true"){
          block.dataset.moved="false";
          return;
        }

        if(window.matchMedia("(pointer:fine)").matches){
          openEdit(event);
        }else{
          showMobileEventActionSheet(event);
        }
      });

      bindContextActions(block,{event,date:key,time:event.time});
      bindDesktopDrag(block,event);
      bindGoogleMobileMove(block,event);

      column.appendChild(block);
    });

    if(key===dateKey(new Date())){
      const now=new Date();
      const minutes=now.getHours()*60+now.getMinutes();
      const currentLine=document.createElement("div");
      currentLine.className="google-week-current-time";
      currentLine.style.top=`calc(var(--week-row-height) * ${minutes/60})`;

      const currentLabel=document.createElement("span");
      currentLabel.className="google-week-current-time-label";
      currentLabel.textContent=`${pad(now.getHours())}:${pad(now.getMinutes())}`;
      currentLine.appendChild(currentLabel);

      column.appendChild(currentLine);
    }

    bodyTrack.appendChild(column);
  }

  headerScroll.appendChild(headerTrack);
  bodyScroll.appendChild(bodyTrack);
  shell.append(headerScroll,bodyScroll);
  el.weekView.appendChild(shell);

  el.weekScroll=bodyScroll;

  const syncWeekHeaderWidth=()=>{
    const scrollbarWidth=Math.max(
      0,
      bodyScroll.offsetWidth-bodyScroll.clientWidth
    );

    headerScroll.style.setProperty(
      "--week-scrollbar-width",
      `${scrollbarWidth}px`
    );
  };

  syncWeekHeaderWidth();
  window.addEventListener("resize",syncWeekHeaderWidth,{once:true});

  bodyScroll.addEventListener("scroll",()=>{
    headerScroll.scrollLeft=bodyScroll.scrollLeft;
  },{passive:true});

  bodyScroll.addEventListener("wheel",wheelEvent=>{
    const atTop=bodyScroll.scrollTop<=0;
    const atBottom=
      bodyScroll.scrollTop+bodyScroll.clientHeight
      >=bodyScroll.scrollHeight-1;

    if(
      (atTop&&wheelEvent.deltaY<0)
      ||(atBottom&&wheelEvent.deltaY>0)
    ){
      window.scrollBy({
        top:wheelEvent.deltaY,
        behavior:"auto"
      });
    }
  },{passive:true});

  setupWeekPagingGesture(bodyScroll);

  requestAnimationFrame(()=>{
    if(state.pendingWeekScroll){
      const saved=state.pendingWeekScroll;

      bodyScroll.scrollTop=saved.top;
      bodyScroll.scrollLeft=saved.left;
      headerScroll.scrollLeft=saved.left;

      window.scrollTo({
        left:saved.pageX,
        top:saved.pageY,
        behavior:"auto"
      });

      state.pendingWeekScroll=null;
      state.weekInitialScrollDone=true;
      return;
    }

    if(!state.weekInitialScrollDone){
      scrollGoogleWeekToCurrentTime();
      state.weekInitialScrollDone=true;
    }
  });
}

function setupWeekPagingGesture(scrollElement){
  let startX=0;
  let startY=0;
  let tracking=false;

  scrollElement.addEventListener("touchstart",event=>{
    if(event.touches.length!==1)return;
    if(event.target.closest(".google-week-event"))return;
    const touch=event.touches[0];
    startX=touch.clientX;
    startY=touch.clientY;
    tracking=true;
  },{passive:true});

  scrollElement.addEventListener("touchend",event=>{
    if(!tracking)return;
    tracking=false;

    const touch=event.changedTouches[0];
    const dx=touch.clientX-startX;
    const dy=touch.clientY-startY;

    if(Math.abs(dx)<70)return;
    if(Math.abs(dx)<Math.abs(dy)*1.25)return;

    state.pendingWeekScroll={
      top:scrollElement.scrollTop,
      left:0,
      pageX:window.scrollX,
      pageY:window.scrollY
    };

    state.currentWeek=addDays(state.currentWeek,dx<0?7:-7);
    state.selectedDateKey=dateKey(state.currentWeek);
    renderAll();
  },{passive:true});
}

function scrollGoogleWeekToCurrentTime(){
  const bodyScroll=el.weekView.querySelector(".google-week-body-scroll");
  if(!bodyScroll)return;

  const rowHeight=parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--week-row-height")
  )||28;

  const initialHour=Math.max(0,Math.min(20,new Date().getHours()-2));
  bodyScroll.scrollTop=initialHour*rowHeight;
}

function googleWeekPointerMinutes(column,clientY){
  const rect=column.getBoundingClientRect();
  const rowHeight=parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--week-row-height")
  )||28;

  return Math.max(
    0,
    Math.min(
      23*60+30,
      Math.round(((clientY-rect.top)/rowHeight*60)/30)*30
    )
  );
}

function bindGoogleWeekCreateGesture(column,date){
  let pointerId=null;
  let startedAt=0;
  let startX=0;
  let startY=0;
  let startMinutes=0;
  let cancelled=false;

  column.addEventListener("pointerdown",pointerEvent=>{
    if(pointerEvent.button!==0||pointerEvent.target.closest(".google-week-event"))return;

    pointerId=pointerEvent.pointerId;
    startedAt=performance.now();
    startX=pointerEvent.clientX;
    startY=pointerEvent.clientY;
    startMinutes=googleWeekPointerMinutes(column,pointerEvent.clientY);
    cancelled=false;
  });

  column.addEventListener("pointermove",pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;

    if(
      Math.hypot(
        pointerEvent.clientX-startX,
        pointerEvent.clientY-startY
      )>6
    ){
      cancelled=true;
    }
  },{passive:true});

  column.addEventListener("pointerup",pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;

    const heldFor=performance.now()-startedAt;
    pointerId=null;

    const maxTapDuration=["touch","pen"].includes(pointerEvent.pointerType)?180:350;
    if(cancelled||heldFor>maxTapDuration)return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const start=minutesToTime(startMinutes);
    state.selectedDateKey=date;

    setTimeout(()=>{
      openCreate(date,start,defaultEndTime(start));
    },0);
  });

  column.addEventListener("pointercancel",()=>{
    pointerId=null;
    cancelled=true;
  });
}

function bindGoogleWeekDrop(column,date){
  let silhouette=null;

  const removeSilhouette=()=>{
    silhouette?.remove();
    silhouette=null;
  };

  const drawSilhouette=(dragged,clientY)=>{
    const pointerMinutes=googleWeekPointerMinutes(column,clientY);
    const duration=Math.max(
      30,
      timeToMinutes(dragged.endTime||defaultEndTime(dragged.time))
      -timeToMinutes(dragged.time)
    );

    const adjustedMinutes=Math.max(
      0,
      Math.min(
        24*60-duration,
        pointerMinutes-(state.dragGrabOffsetMinutes||0)
      )
    );

    if(!silhouette){
      silhouette=document.createElement("div");
      silhouette.className="google-week-drop-silhouette";
      silhouette.innerHTML="<span></span>";
      column.appendChild(silhouette);
    }

    silhouette.style.top=
      `calc(var(--week-row-height) * ${adjustedMinutes/60})`;
    silhouette.style.height=
      `calc(var(--week-row-height) * ${duration/60})`;
    silhouette.querySelector("span").textContent=
      `${minutesToTime(adjustedMinutes)}–${minutesToTime(adjustedMinutes+duration)}`;

    return adjustedMinutes;
  };

  column.addEventListener("dragover",event=>{
    if(!state.dragEvent)return;

    event.preventDefault();
    column.classList.add("drag-over");
    drawSilhouette(state.dragEvent,event.clientY);
  });

  column.addEventListener("dragleave",event=>{
    if(column.contains(event.relatedTarget))return;
    column.classList.remove("drag-over");
    removeSilhouette();
  });

  column.addEventListener("drop",event=>{
    if(!state.dragEvent)return;

    event.preventDefault();
    column.classList.remove("drag-over");

    const dragged=state.dragEvent;
    const adjustedMinutes=drawSilhouette(dragged,event.clientY);

    state.dragEvent=null;
    state.dragGrabOffsetMinutes=0;
    removeSilhouette();

    moveEventTo(dragged,date,minutesToTime(adjustedMinutes));
  });
}

function weekPointerMinutes(column,clientY){
  const rect=column.getBoundingClientRect();
  const rowHeight=parseFloat(
    getComputedStyle(el.weekScroll).getPropertyValue("--week-row-height")
  )||26;

  return Math.max(
    0,
    Math.min(
      23*60+30,
      Math.round(((clientY-rect.top)/rowHeight*60)/30)*30
    )
  );
}

function bindWeekCreateGesture(column,date){
  let pointerId=null;
  let startX=0;
  let startY=0;
  let startMinutes=0;
  let currentMinutes=0;
  let selection=null;
  let rangeMode=false;
  let suppressClick=false;
  let holdTimer=null;

  const removeSelection=()=>{
    selection?.remove();
    selection=null;
  };

  const drawSelection=()=>{
    const from=Math.min(startMinutes,currentMinutes);
    const to=Math.min(24*60,Math.max(startMinutes,currentMinutes)+30);
    const duration=Math.max(30,to-from);

    if(!selection){
      selection=document.createElement("div");
      selection.className="week-create-selection";
      selection.innerHTML="<span></span>";
      column.appendChild(selection);
    }

    selection.style.top=`calc(var(--week-row-height) * ${from/60})`;
    selection.style.height=`calc(var(--week-row-height) * ${duration/60})`;
    selection.querySelector("span").textContent=
      `${minutesToTime(from)}–${minutesToTime(to)}`;
  };

  column.addEventListener("pointerdown",pointerEvent=>{
    if(pointerEvent.button!==0||pointerEvent.target.closest(".week-event"))return;

    pointerId=pointerEvent.pointerId;
    startX=pointerEvent.clientX;
    startY=pointerEvent.clientY;
    startMinutes=weekPointerMinutes(column,pointerEvent.clientY);
    currentMinutes=startMinutes;
    rangeMode=false;
    suppressClick=false;

    holdTimer=setTimeout(()=>{
      if(pointerId!==pointerEvent.pointerId)return;
      rangeMode=true;
      drawSelection();
      haptic(10);
      column.setPointerCapture?.(pointerId);
    },140);
  });

  column.addEventListener("pointermove",pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;

    const dx=Math.abs(pointerEvent.clientX-startX);
    const dy=Math.abs(pointerEvent.clientY-startY);

    if(!rangeMode){
      if(dx>12||dy>12){
        clearTimeout(holdTimer);
      }
      return;
    }

    pointerEvent.preventDefault();
    currentMinutes=weekPointerMinutes(column,pointerEvent.clientY);
    drawSelection();
  },{passive:false});

  const finish=pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;

    clearTimeout(holdTimer);
    pointerId=null;

    if(rangeMode){
      pointerEvent.preventDefault();
      suppressClick=true;

      const from=Math.min(startMinutes,currentMinutes);
      const to=Math.min(24*60,Math.max(startMinutes,currentMinutes)+30);

      removeSelection();
      state.selectedDateKey=date;
      renderSelected();
      renderSummary();
      openCreate(date,minutesToTime(from),minutesToTime(to));

      setTimeout(()=>{suppressClick=false},0);
      return;
    }

    removeSelection();
  };

  column.addEventListener("pointerup",finish);
  column.addEventListener("pointercancel",pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;
    clearTimeout(holdTimer);
    pointerId=null;
    rangeMode=false;
    removeSelection();
  });

  column.addEventListener("click",clickEvent=>{
    if(suppressClick||clickEvent.target.closest(".week-event"))return;

    const start=minutesToTime(
      weekPointerMinutes(column,clickEvent.clientY)
    );

    state.selectedDateKey=date;
    renderSelected();
    renderSummary();
    openCreate(date,start,defaultEndTime(start));
  });
}


function layoutOverlappingEvents(events){
  const sorted=[...events].sort((a,b)=>
    timeToMinutes(eventDisplayStart(a))-timeToMinutes(eventDisplayStart(b))
    ||timeToMinutes(eventDisplayEnd(a))-timeToMinutes(eventDisplayEnd(b))
  );

  const result=[];
  let group=[];
  let groupEnd=-1;

  const flush=()=>{
    if(!group.length)return;

    const active=[];
    let maxColumns=1;
    const temp=[];

    group.forEach(event=>{
      const start=timeToMinutes(eventDisplayStart(event));
      const end=timeToMinutes(eventDisplayEnd(event));

      for(let index=active.length-1;index>=0;index--){
        if(active[index].end<=start)active.splice(index,1);
      }

      const used=new Set(active.map(item=>item.column));
      let column=0;
      while(used.has(column))column++;

      active.push({end,column});
      maxColumns=Math.max(maxColumns,active.length,column+1);
      temp.push({event,columnIndex:column});
    });

    temp.forEach(item=>result.push({...item,columnCount:maxColumns}));
    group=[];
    groupEnd=-1;
  };

  sorted.forEach(event=>{
    const start=timeToMinutes(eventDisplayStart(event));
    const end=timeToMinutes(eventDisplayEnd(event));

    if(group.length&&start>=groupEnd)flush();
    group.push(event);
    groupEnd=Math.max(groupEnd,end);
  });

  flush();
  return result;
}

function bindGoogleMobileMove(block,event){
  if(
    !canDirectlyMoveEvent(event)
    ||(event.endDate&&event.endDate!==event.date)
  )return;

  let pointerId=null;
  let holdTimer=null;
  let active=false;
  let startX=0;
  let startY=0;
  let ghost=null;
  let targetColumn=null;
  let targetDate=null;
  let targetTime=null;
  let grabOffsetMinutes=0;
  let dropPreview=null;
  let dropSilhouette=null;

  const clearTarget=()=>{
    targetColumn?.classList.remove("move-drop-target");
    dropSilhouette?.remove();
    dropSilhouette=null;
    targetColumn=null;
    targetDate=null;
    targetTime=null;
  };

  const cleanup=()=>{
    clearTimeout(holdTimer);
    holdTimer=null;
    block.classList.remove("google-moving");
    ghost?.remove();
    ghost=null;
    dropPreview?.remove();
    dropPreview=null;
    clearTarget();

    if(pointerId!==null){
      try{block.releasePointerCapture?.(pointerId)}catch{}
    }

    pointerId=null;
    active=false;
  };

  const begin=pointerEvent=>{
    active=true;
    block.dataset.moved="true";
    block.classList.add("google-moving");
    block.setPointerCapture?.(pointerEvent.pointerId);
    haptic(22);

    const rect=block.getBoundingClientRect();
    const rowHeight=parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--week-row-height")
    )||40;

    const grabPixels=Math.max(
      0,
      Math.min(rect.height,pointerEvent.clientY-rect.top)
    );

    grabOffsetMinutes=Math.round(
      (grabPixels/rowHeight*60)/30
    )*30;

    ghost=document.createElement("div");
    ghost.className="week-google-ghost";
    ghost.textContent=`${event.title} · ${event.time}–${event.endTime||defaultEndTime(event.time)}`;
    document.body.appendChild(ghost);
  };

  const update=pointerEvent=>{
    if(!active)return;

    pointerEvent.preventDefault();
    ghost.style.left=`${pointerEvent.clientX}px`;
    ghost.style.top=`${pointerEvent.clientY}px`;

    const column=document
      .elementsFromPoint(pointerEvent.clientX,pointerEvent.clientY)
      .find(item=>item.classList?.contains("google-week-day-column"));

    if(!column){
      clearTarget();
      return;
    }

    if(targetColumn!==column){
      clearTarget();
      targetColumn=column;
      targetColumn.classList.add("move-drop-target");
    }

    targetDate=targetColumn.dataset.date;

    const duration=Math.max(
      30,
      timeToMinutes(event.endTime||defaultEndTime(event.time))
      -timeToMinutes(event.time)
    );

    const pointerMinutes=googleWeekPointerMinutes(
      targetColumn,
      pointerEvent.clientY
    );

    const adjustedMinutes=Math.max(
      0,
      Math.min(
        24*60-duration,
        pointerMinutes-grabOffsetMinutes
      )
    );

    targetTime=minutesToTime(adjustedMinutes);
    ghost.textContent=`${event.title} → ${targetDate} ${targetTime}`;

    if(!dropSilhouette){
      dropSilhouette=document.createElement("div");
      dropSilhouette.className="google-week-drop-silhouette";
      dropSilhouette.innerHTML="<span></span>";
      targetColumn.appendChild(dropSilhouette);
    }

    dropSilhouette.style.top=
      `calc(var(--week-row-height) * ${adjustedMinutes/60})`;
    dropSilhouette.style.height=
      `calc(var(--week-row-height) * ${duration/60})`;
    dropSilhouette.querySelector("span").textContent=
      `${targetTime}–${minutesToTime(adjustedMinutes+duration)}`;

    if(!dropPreview){
      dropPreview=document.createElement("div");
      dropPreview.className="week-drop-time-preview";
      document.body.appendChild(dropPreview);
    }

    dropPreview.textContent=`${targetDate} ${targetTime}`;
    dropPreview.style.left=`${pointerEvent.clientX}px`;
    dropPreview.style.top=`${pointerEvent.clientY}px`;
  };

  block.addEventListener("pointerdown",pointerEvent=>{
    if(!["touch","pen"].includes(pointerEvent.pointerType))return;
    if(pointerEvent.target.closest(".week-event-resize-handle"))return;

    pointerId=pointerEvent.pointerId;
    startX=pointerEvent.clientX;
    startY=pointerEvent.clientY;

    holdTimer=setTimeout(()=>{
      if(pointerId===pointerEvent.pointerId)begin(pointerEvent);
    },300);
  });

  block.addEventListener("pointermove",pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;

    if(!active){
      const distance=Math.hypot(
        pointerEvent.clientX-startX,
        pointerEvent.clientY-startY
      );

      if(distance>6){
        clearTimeout(holdTimer);
        holdTimer=null;
      }
      return;
    }

    update(pointerEvent);
  },{passive:false});

  const finish=async pointerEvent=>{
    if(pointerId!==pointerEvent.pointerId)return;

    clearTimeout(holdTimer);

    if(active&&targetDate&&targetTime){
      const date=targetDate;
      const time=targetTime;
      cleanup();
      await moveEventTo(event,date,time);
    }else{
      cleanup();
    }

    setTimeout(()=>{
      block.dataset.moved="false";
    },100);
  };

  block.addEventListener("pointerup",finish);
  block.addEventListener("pointercancel",finish);
}


function bindTimedColumnDrop(column,date){
  column.addEventListener("dragover",event=>{
    if(!state.dragEvent)return;
    event.preventDefault();
    column.classList.add("drag-over");
  });

  column.addEventListener("dragleave",()=>{
    column.classList.remove("drag-over");
  });

  column.addEventListener("drop",event=>{
    if(!state.dragEvent)return;
    event.preventDefault();
    column.classList.remove("drag-over");

    const rect=column.getBoundingClientRect();
    const rowHeight=parseFloat(getComputedStyle(el.weekScroll).getPropertyValue("--week-row-height"))||26;
    const minutes=Math.max(
      0,
      Math.min(
        23*60+30,
        Math.round(((event.clientY-rect.top)/rowHeight*60)/30)*30
      )
    );

    const dragged=state.dragEvent;
    state.dragEvent=null;
    moveEventTo(dragged,date,minutesToTime(minutes));
  });
}

function bindEventResize(block,event,column){
  const handle=block.querySelector(".week-event-resize-handle");
  if(!handle)return;

  let startY=0;
  let originalEnd=0;
  let previewEnd=0;
  let tooltip=null;
  let active=false;

  const move=pointerEvent=>{
    if(!active)return;
    pointerEvent.preventDefault();

    const rowHeight=parseFloat(getComputedStyle(el.weekScroll).getPropertyValue("--week-row-height"))||26;
    const deltaMinutes=Math.round(((pointerEvent.clientY-startY)/rowHeight*60)/30)*30;
    const startMinutes=timeToMinutes(event.time);

    previewEnd=Math.max(
      startMinutes+30,
      Math.min(24*60,originalEnd+deltaMinutes)
    );

    const duration=previewEnd-startMinutes;
    block.style.height=`calc(var(--week-row-height) * ${duration/60})`;
    block.classList.add("resizing");

    if(!tooltip){
      tooltip=document.createElement("div");
      tooltip.className="week-resize-tooltip";
      document.body.appendChild(tooltip);
    }

    tooltip.textContent=`${event.time}–${minutesToTime(previewEnd)}`;
    tooltip.style.left=`${pointerEvent.clientX}px`;
    tooltip.style.top=`${pointerEvent.clientY}px`;
  };

  const finish=async pointerEvent=>{
    if(!active)return;
    active=false;

    handle.releasePointerCapture?.(pointerEvent.pointerId);
    block.classList.remove("resizing");
    tooltip?.remove();
    tooltip=null;

    block.dataset.resized="true";

    if(previewEnd===originalEnd)return;

    try{
      const resizedEndTime=minutesToTime(previewEnd);

      if(isRecurringEvent(event)){
        await detachRecurringOccurrence(event,{
          date:event.occurrenceDate||event.date,
          time:event.time,
          endTime:resizedEndTime
        });
      }else{
        await updateDoc(
          doc(db,"users",state.user.uid,"events",event.id),
          {
            endTime:resizedEndTime,
            updatedAt:serverTimestamp()
          }
        );
      }

      haptic([14,18,14]);
      showToast(`종료 시간을 ${resizedEndTime}로 변경했습니다.`);
    }catch(error){
      console.error(error);
      alert("일정 길이를 변경하지 못했습니다.");
      renderWeek();
    }
  };

  handle.addEventListener("pointerdown",pointerEvent=>{
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    active=true;
    startY=pointerEvent.clientY;
    originalEnd=timeToMinutes(event.endTime||defaultEndTime(event.time));
    previewEnd=originalEnd;

    handle.setPointerCapture?.(pointerEvent.pointerId);
    document.addEventListener("pointermove",move,{passive:false});
    document.addEventListener("pointerup",finish,{once:true});
    document.addEventListener("pointercancel",finish,{once:true});
  });
}

async function setEventProgressFromCard(event,value){
  if(!state.user)return;

  try{
    if((event.repeat||"none")==="none"){
      await updateDoc(
        doc(db,"users",state.user.uid,"events",event.id),
        {progress:Number(value),updatedAt:serverTimestamp()}
      );
    }else{
      const occurrenceDate=event.occurrenceDate||event.date;
      await setDoc(
        doc(db,"users",state.user.uid,"eventLogs",eventLogKey(event.id,occurrenceDate)),
        {
          eventId:event.id,
          date:occurrenceDate,
          progress:Number(value),
          updatedAt:serverTimestamp()
        },
        {merge:true}
      );
    }
  }catch(error){
    console.error(error);
    alert("완료율을 저장하지 못했습니다.");
  }
}

function renderSelected(){
  const d=parseDateKey(state.selectedDateKey),items=eventsForDate(state.selectedDateKey),avg=average(items),isToday=state.selectedDateKey===dateKey(new Date());
  el.selectedTitle.textContent=isToday?"오늘 일정":"선택한 날 일정";el.selectedLabel.textContent=`${d.getMonth()+1}월 ${d.getDate()}일 ${["일","월","화","수","목","금","토"][d.getDay()]}요일`;el.selectedEvents.innerHTML="";
  if(!items.length){el.selectedEvents.innerHTML='<button class="empty-message secondary-button" id="emptyAdd" type="button">등록된 일정이 없습니다.<br>일정 추가하기</button>';$("emptyAdd").onclick=()=>openCreate(state.selectedDateKey)}
  else items.forEach(event=>{const item=document.createElement("article");item.className="selected-event";item.style.borderLeft=`4px solid ${COLORS[event.progress]}`;{
      const main=document.createElement("div");
      main.className="selected-event-main";
      main.innerHTML=`<strong>${escapeHtml(event.title)} ${event.repeat&&event.repeat!=="none"?"↻":""}</strong><span class="event-category-label"><i class="category-dot ${eventCategory(event)}"></i>${categoryLabel(eventCategory(event))}</span>${event.memo?`<small>${escapeHtml(event.memo)}</small>`:""}`;

      const summary=checklistSummary(event);
      if(summary){
        const list=document.createElement("div");
        list.className=`event-checklist-preview${isOccurrencePast(event)?" past":""}`;

        summary.items.slice(0,3).forEach(checkItem=>{
          const row=document.createElement("button");
          row.type="button";
          row.className=`event-checklist-row status-${checkItem.status}`;
          row.dataset.checklistId=checkItem.id;
          row.innerHTML=`
            <i>${checklistStatusIcon(checkItem.status)}</i>
            <span>${escapeHtml(checkItem.text)}</span>
          `;
          list.appendChild(row);
        });

        bindChecklistTaps(
          list,
          event,
          ".event-checklist-row"
        );

        const count=document.createElement("div");
        count.className="event-checklist-summary";
        count.textContent=
          summary.failed
            ?`완료 ${summary.done} · 실패 ${summary.failed} · 전체 ${summary.total}`
            :`완료 ${summary.done}/${summary.total}`;
        list.appendChild(count);
        main.appendChild(list);
      }

      item.innerHTML=`<time class="selected-event-time"><span>${escapeHtml(eventDisplayStart(event))}</span><span>${escapeHtml(eventDisplayEnd(event))}</span></time>`;
      item.appendChild(main);

      const progress=document.createElement("span");
      progress.textContent=`${event.progress}%`;
      item.appendChild(progress);

      const inlineProgress=document.createElement("div");
      inlineProgress.className="inline-progress-control";

      [0,25,50,75,100].forEach(value=>{
        const button=document.createElement("button");
        button.type="button";
        button.className="inline-progress-button";
        button.textContent=`${value}%`;
        button.style.background=COLORS[value];
        button.style.color=value<=25?"#557066":"#fff";

        if(Number(event.progress)===value){
          button.classList.add("selected");
        }

        button.addEventListener("click",clickEvent=>{
          clickEvent.stopPropagation();
          setEventProgressFromCard(event,value);
        });

        inlineProgress.appendChild(button);
      });

      main.appendChild(inlineProgress);

      const selectedTitle=main.querySelector(":scope > strong");
      selectedTitle?.classList.add("event-title-trigger");
      selectedTitle?.addEventListener("click",clickEvent=>{
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        openEdit(event);
      });
      bindContextActions(item,{event,date:event.occurrenceDate||event.date,time:event.time});

      el.selectedEvents.appendChild(item);
    }});
  el.dayProgress.textContent=`${avg}%`;el.dayBar.style.width=`${avg}%`;el.dayCaption.textContent=items.length?`${items.length}개 일정의 평균 완료율`:"등록된 일정이 없습니다.";
}
function renderSelectedDayInsight(){
  if(!el.selectedInsightCombined)return;

  const key=state.selectedDateKey;
  const date=parseDateKey(key);
  const dayEvents=allEventsForDate(key);
  const dayHabits=activeHabitsOn(key);
  const eventAvg=average(dayEvents);
  const habitAvg=habitAverageForDate(key);
  const combined=combinedProgressForDate(key);

  const checklist=dayEvents.flatMap(event=>
    checklistForOccurrence(event).map(item=>({
      ...item,
      autoFailed:item.status==="pending"&&isOccurrencePast(event)
    }))
  );
  const done=checklist.filter(item=>item.status==="done").length;
  const failed=checklist.filter(
    item=>item.status==="failed"||item.autoFailed
  ).length;

  el.selectedInsightDate.textContent=
    `${date.getMonth()+1}월 ${date.getDate()}일 ${["일","월","화","수","목","금","토"][date.getDay()]}요일`;
  el.selectedInsightCombined.textContent=`${combined}%`;
  el.selectedInsightEvents.textContent=`${eventAvg}%`;
  el.selectedInsightEventCount.textContent=`${dayEvents.length}개`;
  el.selectedInsightHabits.textContent=`${habitAvg}%`;
  el.selectedInsightHabitCount.textContent=`${dayHabits.length}개`;
  el.selectedInsightChecklist.textContent=`${done}/${checklist.length}`;
  el.selectedInsightChecklistFailed.textContent=`실패 ${failed}`;
}

function renderSummary(){
  const items=monthOccurrences();
  el.monthCount.textContent=String(items.length);
  el.monthAverage.textContent=`${average(items)}%`;

  el.summaryHabitNames.innerHTML="";
  const habits=activeHabitsOn(dateKey(new Date()));

  if(!habits.length){
    el.summaryHabitNames.innerHTML='<span class="summary-habit-empty">등록된 습관이 없습니다.</span>';
    return;
  }

  habits.forEach(habit=>{
    const pill=document.createElement("span");
    pill.className="summary-habit-pill";
    pill.textContent=habit.name;
    pill.title=habit.name;
    el.summaryHabitNames.appendChild(pill);
  });
}

function setProgress(v){state.selectedProgress=Number(v);document.querySelectorAll("#progressOptions button").forEach(b=>{const p=Number(b.dataset.value);b.classList.toggle("selected",p===state.selectedProgress);b.style.background=COLORS[p];b.style.color=p<=25?"#557066":"#fff"})}

function normalizeChecklist(items){
  if(!Array.isArray(items))return [];

  return items
    .map(item=>{
      const legacyDone=Boolean(item.done);
      const status=["pending","done","failed"].includes(item.status)
        ?item.status
        :(legacyDone?"done":"pending");

      return {
        id:String(item.id||crypto.randomUUID()),
        text:String(item.text||"").trim(),
        status,
        done:status==="done"
      };
    })
    .filter(item=>item.text);
}
function createChecklistItem(text="",status="pending"){
  return {
    id:crypto.randomUUID(),
    text,
    status,
    done:status==="done"
  };
}
function checklistStatusIcon(status){
  if(status==="done")return "✓";
  if(status==="failed")return "×";
  return "□";
}
function nextChecklistStatus(status){
  if(status==="pending")return "done";
  if(status==="done")return "failed";
  return "pending";
}
function checklistForOccurrence(event){
  const base=normalizeChecklist(event.checklist);
  if((event.repeat||"none")==="none")return base;

  const occurrenceDate=
    event.occurrenceStartDate
    ||event.occurrenceDate
    ||event.date;
  const log=state.eventLogs[eventLogKey(event.id,occurrenceDate)];
  const statuses=log?.checklistStatuses||{};

  return base.map(item=>{
    const status=["pending","done","failed"].includes(statuses[item.id])
      ?statuses[item.id]
      :item.status;

    return {
      ...item,
      status,
      done:status==="done"
    };
  });
}
function isOccurrencePast(event){
  const occurrenceStartKey=
    event.occurrenceStartDate
    ||event.occurrenceDate
    ||event.date;
  const start=eventDateTime(
    occurrenceStartKey,
    event.time||"09:00"
  );
  const end=new Date(start.getTime()+eventDurationMs(event));
  return end.getTime()<Date.now();
}
function preserveEventDateTimeValues(){
  return {
    date:el.date.value,
    endDate:el.endDate.value,
    startClock:el.startClock.value,
    endClock:el.endClock.value,
    time:el.time.value,
    endTime:el.endTime.value
  };
}
function restoreEventDateTimeValues(values){
  if(!values)return;

  el.date.value=values.date;
  el.endDate.value=values.endDate;
  el.startClock.value=values.startClock;
  el.endClock.value=values.endClock;
  el.time.value=values.time;
  el.endTime.value=values.endTime;
}
function renderChecklistEditor(){
  const preservedDateTime=preserveEventDateTimeValues();

  el.checklistItems.innerHTML="";

  state.editingChecklist.forEach((item,index)=>{
    const row=document.createElement("div");
    row.className="checklist-edit-row";

    const statusButton=document.createElement("button");
    statusButton.type="button";
    statusButton.className=
      `checklist-status-button status-${item.status||"pending"}`;
    statusButton.textContent=
      checklistStatusIcon(item.status||"pending");
    statusButton.setAttribute(
      "aria-label",
      `${index+1}번 체크리스트 상태 변경`
    );
    statusButton.addEventListener("click",clickEvent=>{
      clickEvent.preventDefault();
      clickEvent.stopPropagation();

      const current=
        state.editingChecklist[index].status||"pending";
      const next=nextChecklistStatus(current);

      state.editingChecklist[index]={
        ...state.editingChecklist[index],
        status:next,
        done:next==="done"
      };

      statusButton.className=
        `checklist-status-button status-${next}`;
      statusButton.textContent=checklistStatusIcon(next);
    });

    const input=document.createElement("input");
    input.type="text";
    input.maxLength=80;
    input.placeholder=`항목 ${index+1}`;
    input.value=item.text;
    input.addEventListener("input",()=>{
      state.editingChecklist[index].text=input.value;
    });

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="checklist-remove-button";
    remove.textContent="×";
    remove.setAttribute(
      "aria-label",
      `${index+1}번 체크리스트 항목 삭제`
    );
    remove.addEventListener("click",clickEvent=>{
      clickEvent.preventDefault();
      clickEvent.stopPropagation();

      const currentDateTime=preserveEventDateTimeValues();
      state.editingChecklist.splice(index,1);
      renderChecklistEditor();
      restoreEventDateTimeValues(currentDateTime);
    });

    row.append(statusButton,input,remove);
    el.checklistItems.appendChild(row);
  });

  restoreEventDateTimeValues(preservedDateTime);
}
function addChecklistItem(){
  state.editingChecklist.push(createChecklistItem());
  renderChecklistEditor();

  requestAnimationFrame(()=>{
    const inputs=el.checklistItems.querySelectorAll("input");
    inputs[inputs.length-1]?.focus();
  });
}
function checklistSummary(event){
  const items=checklistForOccurrence(event);
  if(!items.length)return null;
  const done=items.filter(item=>item.status==="done").length;
  const failed=items.filter(item=>item.status==="failed").length;
  return {items,done,failed,total:items.length};
}
function checklistOccurrenceDate(event){
  return event.occurrenceStartDate
    ||event.occurrenceDate
    ||event.date;
}
function updateChecklistButtonVisual(button,status){
  button.classList.remove(
    "status-pending",
    "status-done",
    "status-failed",
    "done"
  );
  button.classList.add(`status-${status}`);
  button.classList.toggle("done",status==="done");

  const icon=button.querySelector("i");
  if(icon)icon.textContent=checklistStatusIcon(status);
}
function updateChecklistDom(event,itemId,status){
  const occurrenceDate=checklistOccurrenceDate(event);

  document.querySelectorAll("[data-checklist-id]").forEach(button=>{
    if(
      button.dataset.eventId===String(event.id)
      &&button.dataset.occurrenceDate===String(occurrenceDate)
      &&button.dataset.checklistId===String(itemId)
    ){
      updateChecklistButtonVisual(button,status);
    }
  });
}
async function toggleChecklistItem(event,itemId,nextStatusOverride=null){
  if(!state.user)return;

  const currentItems=checklistForOccurrence(event);
  const target=currentItems.find(item=>item.id===itemId);
  if(!target)return;

  const previousStatus=target.status;
  const nextStatus=nextStatusOverride||nextChecklistStatus(previousStatus);
  const occurrenceDate=checklistOccurrenceDate(event);

  updateChecklistDom(event,itemId,nextStatus);

  try{
    if((event.repeat||"none")!=="none"){
      const logId=eventLogKey(event.id,occurrenceDate);
      const existing=state.eventLogs[logId]||{};
      const checklistStatuses={
        ...(existing.checklistStatuses||{}),
        [itemId]:nextStatus
      };

      state.eventLogs[logId]={
        ...existing,
        id:logId,
        eventId:event.id,
        date:occurrenceDate,
        checklistStatuses
      };

      state.skipEventSnapshotRenders+=2;

      await setDoc(
        doc(
          db,
          "users",
          state.user.uid,
          "eventLogs",
          logId
        ),
        {
          eventId:event.id,
          date:occurrenceDate,
          checklistStatuses,
          updatedAt:serverTimestamp()
        },
        {merge:true}
      );

      pushUndo("체크리스트",async()=>{
        const ref=doc(
          db,
          "users",
          state.user.uid,
          "eventLogs",
          logId
        );

        if(existing&&Object.keys(existing).length){
          await setDoc(
            ref,
            firestoreRecordData(existing),
            {merge:false}
          );
        }else{
          await deleteDoc(ref);
        }
      });
    }else{
      const source=state.events.find(saved=>saved.id===event.id);
      if(!source)return;

      const checklist=normalizeChecklist(source.checklist).map(item=>{
        if(item.id!==itemId)return item;
        return {
          ...item,
          status:nextStatus,
          done:nextStatus==="done"
        };
      });

      source.checklist=checklist;
      state.skipEventSnapshotRenders+=2;

      const previousChecklist=normalizeChecklist(
        source.checklist
      ).map(item=>({...item}));

      await updateDoc(
        doc(db,"users",state.user.uid,"events",event.id),
        {
          checklist,
          updatedAt:serverTimestamp()
        }
      );

      pushUndo("체크리스트",async()=>{
        await updateDoc(
          doc(db,"users",state.user.uid,"events",event.id),
          {
            checklist:previousChecklist,
            updatedAt:serverTimestamp()
          }
        );
      });
    }
  }catch(error){
    console.error(error);
    updateChecklistDom(event,itemId,previousStatus);
    alert("체크리스트 상태를 저장하지 못했습니다.");
  }
}
function bindChecklistTaps(container,event,selector){
  const occurrenceDate=checklistOccurrenceDate(event);

  container.querySelectorAll(selector).forEach(button=>{
    button.dataset.eventId=String(event.id);
    button.dataset.occurrenceDate=String(occurrenceDate);

    ["pointerdown","mousedown","touchstart","touchend"].forEach(type=>{
      button.addEventListener(
        type,
        pointerEvent=>pointerEvent.stopPropagation(),
        type.startsWith("touch")?{passive:true}:undefined
      );
    });

    button.addEventListener("click",clickEvent=>{
      clickEvent.preventDefault();
      clickEvent.stopImmediatePropagation();
      clickEvent.stopPropagation();

      const current=
        button.classList.contains("status-done")
          ?"done"
          :button.classList.contains("status-failed")
            ?"failed"
            :"pending";

      toggleChecklistItem(
        event,
        button.dataset.checklistId,
        nextChecklistStatus(current)
      );
    });
  });
}

function resetForm(){
  state.editingOccurrenceContext=null;
  el.form.reset();
  el.eventId.value="";
  el.eventOccurrenceDate.value="";
  fillTimeSelects();
  setTimeParts("09:00","10:00");
  el.endDate.value=dateKey(new Date());
  el.category.value=state.categories[0]?.id||"other";
  el.repeat.value="none";
  el.memo.value="";
  state.editingChecklist=[];
  renderChecklistEditor();
el.formError.textContent="";
  setProgress(0);
renderChecklistEditor();
}
function openCreate(key=state.selectedDateKey,time="09:00",endTime=defaultEndTime(time)){
  haptic(12);
  resetForm();
  el.date.value=key;
  el.endDate.value=key;
  setTimeParts(time,endTime);
  el.modalEyebrow.textContent="NEW EVENT";
  el.modalTitle.textContent="일정 추가";
  el.remove.hidden=true;

  const modeSwitch=el.modal.querySelector(".modal-mode-switch");
  if(modeSwitch)modeSwitch.hidden=false;

  showModal();
}
function openEdit(event){
  resetForm();

  const recurring=(event.repeat||"none")!=="none";
  const occurrenceStart=
    event.occurrenceStartDate
    ||event.occurrenceDate
    ||event.date;

  const occurrenceEnd=recurring
    ?shiftedOccurrenceEndDate(event,occurrenceStart)
    :(event.endDate||event.date);

  state.editingOccurrenceContext={
    recurring,
    sourceDate:event.date,
    sourceEndDate:event.endDate||event.date,
    occurrenceStart,
    occurrenceEnd
  };

  el.eventId.value=event.id;
  el.eventOccurrenceDate.value=occurrenceStart;
  el.title.value=event.title;
  el.category.value=eventCategory(event);
  el.date.value=recurring
    ?occurrenceStart
    :event.date;
  el.endDate.value=occurrenceEnd;
  setTimeParts(
    event.time,
    event.endTime||defaultEndTime(event.time)
  );
  el.repeat.value=event.repeat||"none";
  el.memo.value=event.memo||"";
  state.editingChecklist=
    checklistForOccurrence(event)
      .map(item=>({...item}));
  renderChecklistEditor();

  el.modalEyebrow.textContent="EDIT EVENT";
  el.modalTitle.textContent=recurring
    ?"반복 일정 수정"
    :"일정 수정";
  el.remove.hidden=false;
  el.remove.textContent="삭제";

  const modeSwitch=el.modal.querySelector(".modal-mode-switch");
  if(modeSwitch)modeSwitch.hidden=true;

  setProgress(event.progress);
  showModal();
}


function renderCategoryManager(){
  el.categoryManagerList.innerHTML="";

  state.editingCategories.forEach((category,index)=>{
    const row=document.createElement("div");
    row.className="category-manager-row";

    const color=document.createElement("input");
    color.type="color";
    color.className="category-color-input";
    color.value=category.color;
    color.setAttribute("aria-label",`${category.name} 색상`);
    color.oninput=()=>{state.editingCategories[index].color=color.value};

    const name=document.createElement("input");
    name.type="text";
    name.className="category-name-input";
    name.maxLength=20;
    name.value=category.name;
    name.placeholder="카테고리 이름";
    name.oninput=()=>{state.editingCategories[index].name=name.value};

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="category-delete-button";
    remove.textContent="삭제";
    remove.disabled=category.id==="other";
    remove.onclick=()=>{
      state.editingCategories.splice(index,1);
      renderCategoryManager();
    };

    row.append(color,name,remove);
    el.categoryManagerList.appendChild(row);
  });
}
function openCategoryManager(){
  state.editingCategories=state.categories.map(category=>({...category}));
  el.categoryManagerError.textContent="";
  renderCategoryManager();
  el.categoryManagerModal.classList.add("show");
  document.body.style.overflow="hidden";
  pushModalHistory("categories");
}
function closeCategoryManager(){
  el.categoryManagerModal.classList.remove("show");
  document.body.style.overflow="";
  clearModalHistory("categories");
}
function closeCategoryManagerFromHistory(){
  el.categoryManagerModal.classList.remove("show");
  document.body.style.overflow="";
  state.modalHistoryType=null;
}
function addCategory(){
  state.editingCategories.push({
    id:categoryId(),
    name:`새 카테고리 ${state.editingCategories.length+1}`,
    color:"#4f9d78"
  });
  renderCategoryManager();
}
async function saveCategories(){
  if(!state.user)return;

  const normalized=state.editingCategories.map(category=>({
    ...category,
    name:normalizeCategoryName(category.name),
    color:/^#[0-9a-f]{6}$/i.test(category.color)?category.color:"#8a9790"
  }));

  if(normalized.some(category=>!category.name)){
    el.categoryManagerError.textContent="카테고리 이름을 입력하세요.";
    return;
  }

  const names=normalized.map(category=>category.name.toLocaleLowerCase("ko-KR"));
  if(new Set(names).size!==names.length){
    el.categoryManagerError.textContent="같은 이름의 카테고리는 만들 수 없습니다.";
    return;
  }

  if(!normalized.some(category=>category.id==="other")){
    normalized.push({...DEFAULT_CATEGORIES.find(category=>category.id==="other")});
  }

  const removedIds=state.categories
    .map(category=>category.id)
    .filter(id=>!normalized.some(category=>category.id===id));

  try{
    for(const event of state.events.filter(event=>removedIds.includes(event.category))){
      await updateDoc(
        doc(db,"users",state.user.uid,"events",event.id),
        {category:"other",updatedAt:serverTimestamp()}
      );
    }

    await setDoc(
      doc(db,"users",state.user.uid,"settings","categories"),
      {
        items:normalized,
        updatedAt:serverTimestamp()
      },
      {merge:true}
    );

    if(removedIds.includes(state.categoryFilter)){
      state.categoryFilter="all";
    }

    closeCategoryManager();
  }catch(error){
    console.error(error);
    el.categoryManagerError.textContent="카테고리를 저장하지 못했습니다.";
  }
}
function listenCategories(user){
  if(state.unsubscribeCategories)state.unsubscribeCategories();

  state.unsubscribeCategories=onSnapshot(
    doc(db,"users",user.uid,"settings","categories"),
    snapshot=>{
      const items=snapshot.data()?.items;

      if(Array.isArray(items)&&items.length){
        state.categories=items
          .map(category=>({
            id:String(category.id||categoryId()),
            name:normalizeCategoryName(category.name)||"이름 없음",
            color:/^#[0-9a-f]{6}$/i.test(category.color)?category.color:"#8a9790",
            locked:category.id==="other"
          }));

        if(!state.categories.some(category=>category.id==="other")){
          state.categories.push({...DEFAULT_CATEGORIES.find(category=>category.id==="other")});
        }
      }else{
        state.categories=DEFAULT_CATEGORIES.map(category=>({...category}));
      }

      if(
        state.categoryFilter!=="all"
        &&!state.categories.some(category=>category.id===state.categoryFilter)
      ){
        state.categoryFilter="all";
      }

      renderAll();
    },
    error=>{
      console.error(error);
      state.categories=DEFAULT_CATEGORIES.map(category=>({...category}));
      renderAll();
    }
  );
}

function openDayView(key){
  state.dayViewDate=key;
  state.dayViewOpen=true;
  renderDayView();
  el.dayViewOverlay.hidden=false;
  document.body.style.overflow="hidden";

  requestAnimationFrame(()=>{
    el.dayViewScroll.scrollTop=0;
  });

  history.pushState(
    {
      ...(history.state||currentHistoryState()),
      momentum:true,
      modal:"dayView"
    },
    "",
    location.href
  );
}
function closeDayView({fromHistory=false}={}){
  el.dayViewOverlay.hidden=true;
  state.dayViewOpen=false;
  document.body.style.overflow="";

  if(!fromHistory&&history.state?.modal==="dayView"){
    history.back();
  }
}
function openDayChecklistPopover(event){
  const existing=document.querySelector(".day-checklist-popover-backdrop");
  if(existing)existing.remove();

  const backdrop=document.createElement("div");
  backdrop.className="day-checklist-popover-backdrop";

  const panel=document.createElement("section");
  panel.className="day-checklist-popover";
  const occurrenceDate=checklistOccurrenceDate(event);

  const render=()=>{
    const items=checklistForOccurrence(event);
    const past=isOccurrencePast(event);
    panel.innerHTML=`
      <header>
        <div>
          <p class="eyebrow">CHECKLIST</p>
          <strong>${escapeHtml(event.title)}</strong>
          <small>${escapeHtml(occurrenceDate)} · ${escapeHtml(eventDisplayStart(event))} - ${escapeHtml(eventDisplayEnd(event))}</small>
        </div>
        <button type="button" class="close-button" data-close-checklist>×</button>
      </header>
      <div class="day-checklist-popover-list${past?" past":""}">
        ${items.map(item=>`
          <button type="button"
            class="day-checklist-popover-item status-${item.status}"
            data-checklist-id="${escapeHtml(item.id)}">
            <i>${checklistStatusIcon(item.status)}</i>
            <span>${escapeHtml(item.text)}</span>
          </button>
        `).join("")}
      </div>
    `;

    panel.querySelector("[data-close-checklist]").onclick=()=>backdrop.remove();
    panel.querySelectorAll(".day-checklist-popover-item").forEach(button=>{
      button.onclick=async clickEvent=>{
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        await toggleChecklistItem(event,button.dataset.checklistId);
        render();
        renderDayView();
      };
    });
  };

  render();
  backdrop.appendChild(panel);
  backdrop.addEventListener("click",clickEvent=>{
    if(clickEvent.target===backdrop)backdrop.remove();
  });
  document.body.appendChild(backdrop);
}
function renderDayView(){
  if(!state.dayViewDate)return;

  const date=parseDateKey(state.dayViewDate);
  el.dayViewTitle.textContent=
    `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일 (${
      ["일","월","화","수","목","금","토"][date.getDay()]
    })`;

  el.dayViewGrid.innerHTML="";

  const timeColumn=document.createElement("div");
  timeColumn.className="day-view-time-column";

  for(let hour=0;hour<24;hour++){
    const label=document.createElement("div");
    label.className="day-view-time-label";
    label.style.top=`calc(var(--day-row-height) * ${hour})`;
    label.textContent=`${pad(hour)}:00`;
    timeColumn.appendChild(label);
  }

  const column=document.createElement("div");
  column.className="day-view-column";
  column.dataset.date=state.dayViewDate;

  let dayPointerId=null;
  let dayStartX=0;
  let dayStartY=0;
  let dayStartedAt=0;

  column.addEventListener("pointerdown",pointerEvent=>{
    if(pointerEvent.button!==0||pointerEvent.target.closest(".day-view-event"))return;
    dayPointerId=pointerEvent.pointerId;
    dayStartX=pointerEvent.clientX;
    dayStartY=pointerEvent.clientY;
    dayStartedAt=performance.now();
  });

  column.addEventListener("pointerup",pointerEvent=>{
    if(dayPointerId!==pointerEvent.pointerId)return;

    const moved=Math.hypot(
      pointerEvent.clientX-dayStartX,
      pointerEvent.clientY-dayStartY
    );
    const held=performance.now()-dayStartedAt;
    dayPointerId=null;

    if(moved>7||held>350)return;

    const rect=column.getBoundingClientRect();
    const rowHeight=parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--day-row-height")
    )||40;

    const minutes=Math.max(
      0,
      Math.min(
        23*60+30,
        Math.round(((pointerEvent.clientY-rect.top)/rowHeight*60)/30)*30
      )
    );

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const start=minutesToTime(minutes);
    state.selectedDateKey=state.dayViewDate;

    setTimeout(()=>{
      openCreate(
        state.dayViewDate,
        start,
        defaultEndTime(start)
      );
    },0);
  });

  column.addEventListener("pointercancel",()=>{
    dayPointerId=null;
  });

  layoutOverlappingEvents(eventsForCalendarDate(state.dayViewDate))
    .forEach(({event,columnIndex,columnCount})=>{
      const startMinutes=timeToMinutes(eventDisplayStart(event));
      const endMinutes=timeToMinutes(eventDisplayEnd(event));
      const duration=Math.max(30,endMinutes-startMinutes);

      const block=document.createElement("div");
      block.className=`day-view-event${duration<=30?" compact":""}`;
      block.style.top=`calc(var(--day-row-height) * ${startMinutes/60})`;
      block.style.height=`calc(var(--day-row-height) * ${duration/60})`;
      block.style.left=`calc(${columnIndex} * (100% / ${columnCount}) + 8px)`;
      block.style.width=`calc(100% / ${columnCount} - 16px)`;
      block.style.background=COLORS[event.progress]||COLORS[0];
      block.style.setProperty(
        "--event-category-color",
        categoryColor(eventCategory(event))
      );

      const checklist=checklistForOccurrence(event);
      const past=isOccurrencePast(event);
      const compactChecklist=checklist.length&&duration<=60;
      const doneChecklist=checklist.filter(item=>item.status==="done").length;

      block.innerHTML=`
        <strong class="event-title-trigger">${escapeHtml(event.title)}</strong>
        ${
          checklist.length
            ?(
              compactChecklist
                ?`<button type="button" class="day-view-checklist-summary-button">
                    ✓ ${doneChecklist}/${checklist.length} <span>›</span>
                  </button>`
                :`<div class="day-view-checklist${past?" past":""}">${
                    checklist.slice(0,4).map(item=>
                      `<button type="button"
                        class="day-view-checkitem status-${item.status}"
                        data-checklist-id="${escapeHtml(item.id)}">
                        <i>${checklistStatusIcon(item.status)}</i>
                        <span>${escapeHtml(item.text)}</span>
                      </button>`
                    ).join("")
                  }</div>`
            )
            :""
        }
      `;

      if(compactChecklist){
        block.querySelector(".day-view-checklist-summary-button")
          ?.addEventListener("click",clickEvent=>{
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
            openDayChecklistPopover(event);
          });
      }else{
        bindChecklistTaps(
          block,
          event,
          ".day-view-checkitem"
        );
      }

      block.addEventListener("click",eventClick=>{
        if(eventClick.target.closest(".day-view-checkitem, .day-view-checklist-summary-button")){
          eventClick.preventDefault();
          eventClick.stopPropagation();
          return;
        }

        eventClick.preventDefault();
        eventClick.stopPropagation();

        if(window.matchMedia("(pointer:fine)").matches){
          openEdit(event);
        }else{
          showMobileEventActionSheet(event);
        }
      });

      column.appendChild(block);
    });

  el.dayViewGrid.append(timeColumn,column);

  requestAnimationFrame(()=>{
    if(!el.modal.classList.contains("show")){
      el.dayViewScroll.scrollTop=0;
    }
  });
}

function setupWheelTimePicker(){
  const targets=[
    {
      input:el.startClock,
      dateInput:el.date,
      type:"start",
      title:"시작 시간"
    },
    {
      input:el.endClock,
      dateInput:el.endDate,
      type:"end",
      title:"종료 시간"
    }
  ];

  let active=null;
  let selectedIndex=9;
  let selectedMinute=0;
  let committedIndex=9;
  let temporaryDate=null;
  let baseDateAtOpen=null;
  let boundaryShift=0;
  let initialHourIndex=9;
  let scrollTimer=null;

  const settlingColumns=new WeakSet();

  /*
   * index 0  = 01시 앞의 00시
   * index 1  = 01시
   * ...
   * index 23 = 23시
   * index 24 = 23시 뒤의 00시
   *
   * 같은 00시라도 위쪽과 아래쪽을 서로 다른 index로 유지해야
   * 날짜 경계를 정확히 판정할 수 있습니다.
   */
  const hourEntries=[
    ...Array.from(
      {length:24},
      (_,index)=>({
        index,
        hour:index,
        label:pad(index)
      })
    ),
    {
      index:24,
      hour:0,
      label:"00"
    }
  ];

  const backdrop=document.createElement("div");
  backdrop.className="wheel-time-backdrop";
  backdrop.hidden=true;
  backdrop.innerHTML=`
    <section class="wheel-time-picker" role="dialog" aria-modal="true">
      <header>
        <button type="button" data-wheel-cancel>취소</button>
        <strong data-wheel-title>시간 선택</strong>
        <button type="button" data-wheel-confirm>완료</button>
      </header>

      <div class="wheel-date-preview" data-wheel-date></div>

      <div class="wheel-columns">
        <div class="wheel-column-wrap">
          <span>시</span>
          <div class="wheel-column" data-wheel-hours></div>
        </div>
        <div class="wheel-separator">:</div>
        <div class="wheel-column-wrap">
          <span>분</span>
          <div class="wheel-column" data-wheel-minutes></div>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(backdrop);

  const title=backdrop.querySelector("[data-wheel-title]");
  const datePreview=backdrop.querySelector("[data-wheel-date]");
  const hoursColumn=backdrop.querySelector("[data-wheel-hours]");
  const minutesColumn=backdrop.querySelector("[data-wheel-minutes]");
  const itemHeight=48;

  hoursColumn.innerHTML='<div class="wheel-spacer"></div>';
  hourEntries.forEach(entry=>{
    const item=document.createElement("button");
    item.type="button";
    item.className="wheel-item";
    item.dataset.value=String(entry.index);
    item.textContent=`${entry.label}시`;
    hoursColumn.appendChild(item);
  });
  hoursColumn.insertAdjacentHTML(
    "beforeend",
    '<div class="wheel-spacer"></div>'
  );

  minutesColumn.innerHTML=`
    <div class="wheel-spacer"></div>
    <button type="button" class="wheel-item" data-value="0">00분</button>
    <button type="button" class="wheel-item" data-value="30">30분</button>
    <div class="wheel-spacer"></div>
  `;

  const renderDatePreview=()=>{
    if(!temporaryDate)return;
    const date=parseDateKey(temporaryDate);
    datePreview.textContent=
      `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`;
  };

  const selectedValue=column=>{
    const items=Array.from(
      column.querySelectorAll(".wheel-item")
    );

    const index=Math.max(
      0,
      Math.min(
        items.length-1,
        Math.round(column.scrollTop/itemHeight)
      )
    );

    return Number(items[index].dataset.value);
  };

  const highlight=()=>{
    hoursColumn.querySelectorAll(".wheel-item").forEach(item=>{
      item.classList.toggle(
        "selected",
        Number(item.dataset.value)===selectedIndex
      );
    });

    minutesColumn.querySelectorAll(".wheel-item").forEach(item=>{
      item.classList.toggle(
        "selected",
        Number(item.dataset.value)===selectedMinute
      );
    });
  };

  const setColumnPosition=(column,value)=>{
    const items=Array.from(
      column.querySelectorAll(".wheel-item")
    );
    const index=items.findIndex(
      item=>Number(item.dataset.value)===value
    );

    if(index<0)return;

    settlingColumns.add(column);
    column.scrollTop=index*itemHeight;

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        settlingColumns.delete(column);
      });
    });
  };

  const changeDate=days=>{
    boundaryShift+=days;
    temporaryDate=dateKey(
      addDays(parseDateKey(baseDateAtOpen),boundaryShift)
    );
    renderDatePreview();
  };

  const applyBoundary=(previous,next)=>{
    // v6.7: 시간 휠은 시간만 변경하고 날짜는 자동 변경하지 않습니다.
    return;
  };

  const commitHour=next=>{
    applyBoundary(committedIndex,next);
    selectedIndex=next;
    committedIndex=next;
    highlight();
    setColumnPosition(hoursColumn,next);
  };

  const commitMinute=next=>{
    selectedMinute=next;
    highlight();
    setColumnPosition(minutesColumn,next);
  };

  hoursColumn.addEventListener("scroll",()=>{
    if(settlingColumns.has(hoursColumn))return;

    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
      commitHour(selectedValue(hoursColumn));
    },140);
  },{passive:true});

  minutesColumn.addEventListener("scroll",()=>{
    if(settlingColumns.has(minutesColumn))return;

    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
      commitMinute(selectedValue(minutesColumn));
    },140);
  },{passive:true});

  hoursColumn.addEventListener("click",event=>{
    const item=event.target.closest(".wheel-item");
    if(!item)return;

    event.preventDefault();
    event.stopPropagation();

    commitHour(Number(item.dataset.value));
  });

  minutesColumn.addEventListener("click",event=>{
    const item=event.target.closest(".wheel-item");
    if(!item)return;

    event.preventDefault();
    event.stopPropagation();

    commitMinute(Number(item.dataset.value));
  });

  const open=target=>{
    active=target;

    const value=target.input.value||(
      target.type==="start"?"09:00":"10:00"
    );
    const [hour,minute]=value.split(":").map(Number);

const chosenHour=
      selectedIndex===24
        ?0
        :selectedIndex;

    const chosenTime=
      `${pad(chosenHour)}:${pad(selectedMinute)}`;

    active.dateInput.value=temporaryDate;
    active.dateInput.dispatchEvent(
      new Event("change",{bubbles:true})
    );
    active.input.value=chosenTime;
    active.input.dispatchEvent(
      new Event("change",{bubbles:true})
    );

    syncHiddenTimes();
    close();
  };

  backdrop.addEventListener("click",event=>{
    if(event.target===backdrop)close();
  });

  targets.forEach(target=>{
    target.input.addEventListener("click",()=>{
      open(target);
    });

    target.input.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        event.preventDefault();
        open(target);
      }
    });
  });
}

function setupMondayFirstDatePicker(){
  const inputs=[el.date,el.endDate];
  let activeInput=null;
  let viewMonth=startOfMonth(new Date());

  const backdrop=document.createElement("div");
  backdrop.className="monday-date-picker-backdrop";
  backdrop.hidden=true;
  backdrop.innerHTML=`
    <section class="monday-date-picker" role="dialog" aria-modal="true">
      <header>
        <button type="button" data-picker-prev aria-label="이전 달">‹</button>
        <strong data-picker-title></strong>
        <button type="button" data-picker-next aria-label="다음 달">›</button>
      </header>
      <div class="monday-date-weekdays">
        <span>월</span><span>화</span><span>수</span><span>목</span>
        <span>금</span><span class="saturday">토</span><span class="sunday">일</span>
      </div>
      <div class="monday-date-grid"></div>
      <footer>
        <button type="button" data-picker-today>오늘</button>
        <button type="button" data-picker-close>닫기</button>
      </footer>
    </section>
  `;
  document.body.appendChild(backdrop);

  const title=backdrop.querySelector("[data-picker-title]");
  const grid=backdrop.querySelector(".monday-date-grid");

  const render=()=>{
    title.textContent=
      `${viewMonth.getFullYear()}년 ${viewMonth.getMonth()+1}월`;
    grid.innerHTML="";

    const first=startOfMonth(viewMonth);
    const mondayOffset=(first.getDay()+6)%7;
    const gridStart=addDays(first,-mondayOffset);
    const selected=activeInput?.value||"";

    for(let index=0;index<42;index++){
      const day=addDays(gridStart,index);
      const key=dateKey(day);
      const button=document.createElement("button");
      button.type="button";
      button.textContent=day.getDate();
      button.dataset.date=key;
      if(day.getMonth()!==viewMonth.getMonth()){
        button.classList.add("outside");
      }
      if(day.getDay()===0)button.classList.add("sunday");
      if(day.getDay()===6)button.classList.add("saturday");
      if(key===selected)button.classList.add("selected");
      if(key===dateKey(new Date()))button.classList.add("today");

      button.onclick=()=>{
        if(!activeInput)return;
        activeInput.value=key;
        activeInput.dispatchEvent(
          new Event("change",{bubbles:true})
        );
        close();
      };
      grid.appendChild(button);
    }
  };

  const open=input=>{
    activeInput=input;
    viewMonth=startOfMonth(
      input.value?parseDateKey(input.value):new Date()
    );
    backdrop.hidden=false;
    render();
  };
  const close=()=>{
    backdrop.hidden=true;
    activeInput=null;
  };

  backdrop.querySelector("[data-picker-prev]").onclick=()=>{
    viewMonth=new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth()-1,
      1
    );
    render();
  };
  backdrop.querySelector("[data-picker-next]").onclick=()=>{
    viewMonth=new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth()+1,
      1
    );
    render();
  };
  backdrop.querySelector("[data-picker-today]").onclick=()=>{
    if(!activeInput)return;
    activeInput.value=dateKey(new Date());
    activeInput.dispatchEvent(
      new Event("change",{bubbles:true})
    );
    close();
  };
  backdrop.querySelector("[data-picker-close]").onclick=close;
  backdrop.addEventListener("click",event=>{
    if(event.target===backdrop)close();
  });

  inputs.forEach(input=>{
    input.readOnly=true;
    input.addEventListener("click",event=>{
      event.preventDefault();
      open(input);
    });
    input.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        event.preventDefault();
        open(input);
      }
    });
  });
}

function pushModalHistory(type){
  if(state.modalHistoryType)return;
  state.modalHistoryType=type;
  history.pushState(
    {
      ...(history.state||currentHistoryState()),
      momentum:true,
      modal:type
    },
    "",
    location.href
  );
}
function clearModalHistory(type){
  if(state.modalHistoryType!==type)return;
  state.modalHistoryType=null;

  if(history.state?.modal===type){
    state.ignoreNextPopstate=true;
    history.back();
  }
}
function closeEventModalFromHistory(){
  resetEventModalScroll();
  el.modal.classList.remove("show");
  document.body.style.overflow=
    state.dayViewOpen?"hidden":"";
  state.modalHistoryType=null;

  if(state.dayViewOpen){
    requestAnimationFrame(renderDayView);
  }
}
function closeHabitModalFromHistory(){
  el.habitModal.classList.remove("show");
  document.body.style.overflow="";
  state.modalHistoryType=null;
}
function closeAccountSheetFromHistory(){
  el.accountSheet.classList.remove("show");
  state.modalHistoryType=null;
}

function autoResizeMemo(){
  if(!el.memo)return;
  el.memo.style.height="auto";
  const oneLineHeight=46;
  el.memo.style.height=`${Math.max(oneLineHeight,el.memo.scrollHeight)}px`;
}

function resetEventModalScroll(){
  const panel=el.modal.querySelector(":scope > .modal")
    ||el.modal.querySelector(".modal");

  // 배경 캘린더/하루 보기의 스크롤은 건드리지 않고,
  // 일정 추가·수정창 내부 스크롤만 맨 위로 초기화합니다.
  el.modal.scrollTop=0;
  panel?.scrollTo({top:0,left:0,behavior:"auto"});
  el.form?.scrollTo({top:0,left:0,behavior:"auto"});
}
function showModal(){
  const active=document.activeElement;
  if(active instanceof HTMLElement)active.blur();

  state.preservedViewScroll=captureViewScroll();
  resetEventModalScroll();
  el.modal.classList.add("show");
  document.body.style.overflow="hidden";
  pushModalHistory("event");

  requestAnimationFrame(()=>{
    resetEventModalScroll();
    autoResizeMemo();

    // 메모 자동 높이 조절 이후 레이아웃이 바뀌어도 다시 맨 위 유지
    requestAnimationFrame(resetEventModalScroll);

    const activeElement=document.activeElement;
    if(activeElement instanceof HTMLElement)activeElement.blur();
  });
}
function closeModal(){
  resetEventModalScroll();
  el.modal.classList.remove("show");
  document.body.style.overflow=state.dayViewOpen?"hidden":"";
  clearModalHistory("event");
  restoreViewScroll(state.preservedViewScroll);

  setTimeout(()=>{
    state.preservedViewScroll=null;
  },120);
}
function showRepeatEditDialog(){
  // 반복 일정 저장 범위 선택창이 뜰 때도 뒤의 일정창은 맨 위로 유지
  resetEventModalScroll();
  el.repeatEditDialog.classList.add("show");
}
function closeRepeatEditDialog(){
  el.repeatEditDialog.classList.remove("show");
  state.pendingRepeatEdit=null;

  // 취소 후 일정 수정창으로 돌아왔을 때도 맨 위부터 표시
  if(el.modal.classList.contains("show")){
    requestAnimationFrame(resetEventModalScroll);
  }
}

async function saveWholeRepeatEdit(pending){
  const {
    eventId,
    occurrenceDate,
    baseData,
    selectedProgress,
    occurrenceContext
  }=pending;

  const finalData={
    ...baseData,
    memo:String(baseData.memo||""),
    checklist:normalizeChecklist(baseData.checklist)
  };

  if(occurrenceContext?.recurring){
    const editedStart=parseDateKey(baseData.date);
    const shownStart=parseDateKey(
      occurrenceContext.occurrenceStart
    );
    const sourceStart=parseDateKey(
      occurrenceContext.sourceDate
    );
    const dayShift=Math.round(
      (editedStart-shownStart)/86400000
    );

    const newSeriesStart=addDays(
      sourceStart,
      dayShift
    );
    const editedSpanDays=Math.round(
      (
        parseDateKey(baseData.endDate)
        -parseDateKey(baseData.date)
      )/86400000
    );

    finalData.date=dateKey(newSeriesStart);
    finalData.endDate=dateKey(
      addDays(newSeriesStart,editedSpanDays)
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      state.user.uid,
      "events",
      eventId
    ),
    finalData
  );

  /*
   * 전체 반복 일정 수정에서는 메모와 체크리스트도
   * 시리즈 전체의 공통 데이터로 적용합니다.
   *
   * 기존 날짜별 체크 상태가 eventLogs에 남아 있으면
   * 새 체크리스트 상태보다 우선 표시될 수 있으므로,
   * 해당 반복 시리즈의 날짜별 체크 상태만 비웁니다.
   * 날짜별 완료율(progress)은 그대로 유지합니다.
   */
  const relatedLogs=Object.values(state.eventLogs)
    .filter(log=>log.eventId===eventId);

  for(const log of relatedLogs){
    await setDoc(
      doc(
        db,
        "users",
        state.user.uid,
        "eventLogs",
        log.id||eventLogKey(eventId,log.date)
      ),
      {
        checklistStatuses:{},
        updatedAt:serverTimestamp()
      },
      {merge:true}
    );
  }

  if(finalData.repeat!=="none"){
    await setDoc(
      doc(
        db,
        "users",
        state.user.uid,
        "eventLogs",
        eventLogKey(eventId,occurrenceDate)
      ),
      {
        eventId,
        date:occurrenceDate,
        progress:selectedProgress,
        updatedAt:serverTimestamp()
      },
      {merge:true}
    );
  }
}

async function saveSingleRepeatOccurrenceEdit(pending){
  const {
    eventId,
    occurrenceDate,
    baseData,
    selectedProgress
  }=pending;

  const source=state.events.find(item=>item.id===eventId);
  if(!source)throw new Error("반복 일정 원본을 찾지 못했습니다.");

  const exceptionDates=Array.from(
    new Set([
      ...(Array.isArray(source.exceptionDates)?source.exceptionDates:[]),
      occurrenceDate
    ])
  ).sort();

  await updateDoc(
    doc(db,"users",state.user.uid,"events",eventId),
    {
      exceptionDates,
      updatedAt:serverTimestamp()
    }
  );

  await addDoc(
    collection(db,"users",state.user.uid,"events"),
    {
      ...baseData,
      repeat:"none",
      progress:selectedProgress,
      sourceRepeatEventId:eventId,
      sourceOccurrenceDate:occurrenceDate,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );

  try{
    await deleteDoc(
      doc(
        db,
        "users",
        state.user.uid,
        "eventLogs",
        eventLogKey(eventId,occurrenceDate)
      )
    );
  }catch(error){
    console.debug("날짜별 완료 기록이 없거나 이미 삭제되었습니다.",error);
  }
}

async function finishEventSave(occurrenceDate){
  state.selectedDateKey=occurrenceDate;
  closeRepeatEditDialog();
  closeModal();
}

async function applyPendingRepeatEdit(scope){
  const pending=state.pendingRepeatEdit;
  if(!pending||!state.user)return;

  try{
    if(scope==="single"){
      await saveSingleRepeatOccurrenceEdit(pending);
    }else{
      await saveWholeRepeatEdit(pending);
    }

    await finishEventSave(pending.occurrenceDate);
  }catch(error){
    console.error(error);
    closeRepeatEditDialog();
    el.formError.textContent="반복 일정을 수정하지 못했습니다.";
  }
}

async function submit(event){
  event.preventDefault();
  if(!state.user)return;

  syncHiddenTimes();

  const title=el.title.value.trim();
  const category=el.category.value;
  const date=el.date.value;
  const endDate=el.endDate.value||date;
  const time=el.time.value;
  const endTime=el.endTime.value;
  const repeat=el.repeat.value;
  const memo=el.memo.value.trim();
  const checklist=normalizeChecklist(state.editingChecklist);
  const eventId=el.eventId.value;
  const occurrenceDate=el.eventOccurrenceDate.value||date;

  if(!title||!date||!endDate||!time||!endTime)return;

  const startStamp=eventDateTime(date,time);
  const endStamp=eventDateTime(endDate,endTime);

  if(endStamp<=startStamp){
    el.formError.textContent="종료 날짜와 시간은 시작보다 늦어야 합니다.";
    return;
  }

  const eventsRef=collection(db,"users",state.user.uid,"events");

  try{
    if(eventId){
      const source=state.events.find(item=>item.id===eventId);
      const sourceIsRecurring=(source?.repeat||"none")!=="none";

      const baseData={
        title,
        category,
        date,
        endDate,
        time,
        endTime,
        repeat,
        memo,
        checklist,
        updatedAt:serverTimestamp()
      };

      if(repeat==="none"){
        baseData.progress=state.selectedProgress;
      }

      if(sourceIsRecurring){
        state.pendingRepeatEdit={
          eventId,
          occurrenceDate,
          baseData,
          selectedProgress:state.selectedProgress,
          occurrenceContext:state.editingOccurrenceContext
        };
        showRepeatEditDialog();
        return;
      }

      const previousEventData=firestoreRecordData(source);
      await updateDoc(doc(eventsRef,eventId),baseData);

      pushUndo("일정 수정",async()=>{
        await setDoc(
          doc(eventsRef,eventId),
          previousEventData
        );
      });
    }else{
      const created=await addDoc(eventsRef,{
        title,
        category,
        date,
        endDate,
        time,
        endTime,
        repeat,
        memo,
        checklist,
        progress:repeat==="none"?state.selectedProgress:0,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      });

      pushUndo("일정 추가",async()=>{
        await deleteDoc(
          doc(db,"users",state.user.uid,"events",created.id)
        );
      });

      if(repeat!=="none"&&state.selectedProgress>0){
        await setDoc(
          doc(
            db,
            "users",
            state.user.uid,
            "eventLogs",
            eventLogKey(created.id,date)
          ),
          {
            eventId:created.id,
            date,
            progress:state.selectedProgress,
            updatedAt:serverTimestamp()
          }
        );
      }
    }

    await finishEventSave(occurrenceDate);
  }catch(error){
    console.error(error);
    el.formError.textContent="저장하지 못했습니다.";
  }
}

function showRepeatDeleteDialog(){
  el.repeatDeleteDialog.classList.add("show");
}
function closeRepeatDeleteDialog(){
  el.repeatDeleteDialog.classList.remove("show");
}
async function deleteOnlyCurrentOccurrence(){
  if(!state.user||!el.eventId.value)return;

  const eventId=el.eventId.value;
  const source=state.events.find(event=>event.id===eventId);
  if(!source)return;

  const occurrenceDate=el.eventOccurrenceDate.value||source.date;
  const exceptionDates=Array.from(
    new Set([...(Array.isArray(source.exceptionDates)?source.exceptionDates:[]),occurrenceDate])
  ).sort();

  try{
    await updateDoc(
      doc(db,"users",state.user.uid,"events",eventId),
      {exceptionDates,updatedAt:serverTimestamp()}
    );

    try{
      await deleteDoc(
        doc(db,"users",state.user.uid,"eventLogs",eventLogKey(eventId,occurrenceDate))
      );
    }catch(logError){
      console.debug("날짜별 완료 기록이 없거나 이미 삭제되었습니다.",logError);
    }

    closeRepeatDeleteDialog();
    closeModal();
  }catch(error){
    console.error(error);
    closeRepeatDeleteDialog();
    el.formError.textContent="이 날짜의 반복 일정을 삭제하지 못했습니다.";
  }
}
async function deleteEntireRepeatSeries(){
  if(!state.user||!el.eventId.value)return;

  try{
    await deleteDoc(
      doc(db,"users",state.user.uid,"events",el.eventId.value)
    );
    closeRepeatDeleteDialog();
    closeModal();
  }catch(error){
    console.error(error);
    closeRepeatDeleteDialog();
    el.formError.textContent="반복 일정 전체를 삭제하지 못했습니다.";
  }
}

async function removeEvent(){
  if(!state.user||!el.eventId.value)return;

  const source=state.events.find(event=>event.id===el.eventId.value);
  if(!source)return;

  const recurring=(source.repeat||"none")!=="none";

  if(recurring){
    showRepeatDeleteDialog();
    return;
  }

  if(!confirm("이 일정을 삭제할까요?"))return;

  try{
    const deletedId=el.eventId.value;
    const deletedData=firestoreRecordData(source);

    await deleteDoc(
      doc(db,"users",state.user.uid,"events",deletedId)
    );

    pushUndo("일정 삭제",async()=>{
      await setDoc(
        doc(db,"users",state.user.uid,"events",deletedId),
        deletedData
      );
    });

    closeModal();
  }catch(error){
    console.error(error);
    el.formError.textContent="일정을 삭제하지 못했습니다.";
  }
}


function switchCreateModal(target){
  if(target!=="habit"||el.eventId.value)return;

  closeEventModalFromHistory();
  resetHabitForm();
  el.habitModalEyebrow.textContent="NEW HABIT";
  el.habitModalTitle.textContent="습관 추가";
  el.deleteHabitButton.hidden=true;
  showHabitModal();
}
function addHorizontalSwipe(element,onLeft,onRight){
  let startX=0;
  let startY=0;

  element.addEventListener("touchstart",event=>{
    const touch=event.changedTouches[0];
    startX=touch.clientX;
    startY=touch.clientY;
  },{passive:true});

  element.addEventListener("touchend",event=>{
    const touch=event.changedTouches[0];
    const dx=touch.clientX-startX;
    const dy=touch.clientY-startY;

    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.3)return;
    if(dx<0)onLeft();
    else onRight();
  },{passive:true});
}


function shiftCalendarPeriod(direction){
  if(state.currentView==="selected"){
    state.selectedDateKey=dateKey(
      addDays(parseDateKey(state.selectedDateKey),direction)
    );
  }else{
    state.currentWeek=addDays(state.currentWeek,7*direction);
  }

  renderAll();
}
function setupPageSwipeNavigation(){
  const screens=[
    {page:"calendar",view:"selected"},
    {page:"calendar",view:"week"},
    {page:"habit"},
    {page:"stats"},
    {page:"search"}
  ];

  let startX=0;
  let startY=0;
  let tracking=false;

  const currentIndex=()=>{
    if(state.activePage==="calendar"){
      return state.currentView==="selected"?0:1;
    }
    if(state.activePage==="habit")return 2;
    if(state.activePage==="stats")return 3;
    return 4;
  };

  const showScreen=index=>{
    if(index<0||index>=screens.length)return;

    const previous=currentIndex();
    const target=screens[index];

    state.activePage=target.page;
    if(target.page==="calendar"){
      state.currentView=target.view;
    }

    renderAll();

    const visible=[
      el.calendarPage,
      el.habitPage,
      el.statsPage,
      el.searchPage
    ].find(page=>!page.hidden);

    if(visible){
      visible.style.setProperty(
        "--page-swipe-offset",
        index>previous?"18px":"-18px"
      );
      visible.classList.remove("page-swipe-in");
      void visible.offsetWidth;
      visible.classList.add("page-swipe-in");
    }
  };

  document.addEventListener("touchstart",event=>{
    if(event.touches.length!==1)return;
    if(event.target.closest(
      "input,select,textarea,button,.modal-backdrop.show,.sheet-backdrop.show,.week-event"
    ))return;

    const touch=event.touches[0];
    startX=touch.clientX;
    startY=touch.clientY;
    tracking=true;
  },{passive:true,capture:true});

  document.addEventListener("touchend",event=>{
    if(!tracking)return;
    tracking=false;

    const touch=event.changedTouches[0];
    const dx=touch.clientX-startX;
    const dy=touch.clientY-startY;

    if(Math.abs(dx)<55)return;
    if(Math.abs(dx)<Math.abs(dy)*1.15)return;

    const index=currentIndex();
    showScreen(dx<0?index+1:index-1);
  },{passive:true,capture:true});

  document.addEventListener("touchcancel",()=>{
    tracking=false;
  },{passive:true,capture:true});
}

function setupCalendarSwipe(){
  if(!el.weekView)return;

  let startX=0;
  let startY=0;
  let tracking=false;

  el.weekView.addEventListener("touchstart",event=>{
    if(state.currentView!=="week"||event.touches.length!==1)return;
    if(event.target.closest("button,.week-event,.google-week-event,input,select,textarea"))return;

    const touch=event.touches[0];
    startX=touch.clientX;
    startY=touch.clientY;
    tracking=true;
  },{passive:true});

  el.weekView.addEventListener("touchend",event=>{
    if(!tracking||state.currentView!=="week")return;
    tracking=false;

    const touch=event.changedTouches[0];
    const dx=touch.clientX-startX;
    const dy=touch.clientY-startY;

    if(Math.abs(dx)<65)return;
    if(Math.abs(dx)<Math.abs(dy)*1.25)return;

    // 기본 7일 보기에서는 좌우 스와이프로 한 주씩 이동.
    // 확대/축소로 7일보다 많이 보는 경우에는 기존 가로 스크롤을 방해하지 않음.
    if(!state.weekFit&&visibleDaysForZoom()>7)return;

    shiftCalendarPeriod(dx<0?1:-1);
  },{passive:true});

  el.weekView.addEventListener("touchcancel",()=>{
    tracking=false;
  },{passive:true});
}


function openSheet(){
  el.accountSheet.classList.add("show");
  pushModalHistory("account");
}
function closeSheet(){
  el.accountSheet.classList.remove("show");
  clearModalHistory("account");
}

$("prevPeriod").onclick=()=>{
  if(state.currentView==="selected"){
    state.selectedDateKey=dateKey(addDays(parseDateKey(state.selectedDateKey),-1));
  }else{
    state.currentWeek=addDays(state.currentWeek,-7);
  }
  renderAll();
};
$("nextPeriod").onclick=()=>{
  if(state.currentView==="selected"){
    state.selectedDateKey=dateKey(addDays(parseDateKey(state.selectedDateKey),1));
  }else{
    state.currentWeek=addDays(state.currentWeek,7);
  }
  renderAll();
};
$("todayButton").onclick=()=>{
  const t=new Date();
  state.currentMonth=startOfMonth(t);
  state.currentWeek=startOfWeek(t);
  state.selectedDateKey=dateKey(t);
  renderAll();
};
el.selectedBtn.onclick=()=>{
  state.currentView="selected";
  renderAll();
};
el.weekBtn.onclick=()=>{
  state.currentView="week";
  state.currentWeek=startOfWeek(parseDateKey(state.selectedDateKey));
  state.weekFit=true;
  renderAll();
  requestAnimationFrame(()=>scrollGoogleWeekToCurrent(false));
};
el.weekZoomOut.onclick=()=>changeWeekZoom(-10);
el.weekZoomIn.onclick=()=>changeWeekZoom(10);
el.weekZoomValue.onclick=resetWeekToFit;
window.addEventListener("resize",()=>{if(state.currentView==="week"&&state.weekFit)applyWeekZoom()});
el.loginButton.onclick=login;
el.logout.onclick=logout;
el.sheetLogout.onclick=logout;
el.mobileEventEditButton.onclick=()=>{
  const event=state.mobileActionEvent;
  hideMobileEventActionSheet();
  if(event)openEdit(event);
};
el.mobileEventDeleteButton.onclick=deleteMobileActionEvent;
el.mobileEventActionSheet.addEventListener("click",event=>{
  if(event.target===el.mobileEventActionSheet){
    hideMobileEventActionSheet();
  }
});

el.dayViewClose.onclick=()=>closeDayView();
el.dayViewPrev.onclick=()=>{
  state.dayViewDate=dateKey(addDays(parseDateKey(state.dayViewDate),-1));
  renderDayView();
};
el.dayViewToday.onclick=()=>{
  state.dayViewDate=dateKey(new Date());
  renderDayView();
};
el.dayViewNext.onclick=()=>{
  state.dayViewDate=dateKey(addDays(parseDateKey(state.dayViewDate),1));
  renderDayView();
};

$("openEventModal").onclick=()=>openCreate();
$("weekAddEventButton").onclick=()=>openCreate(
  state.selectedDateKey||dateKey(new Date())
);
$("eventModeTab").onclick=()=>{};
$("habitModeFromEventTab").onclick=()=>switchCreateModal("habit");
addHorizontalSwipe(el.modal,()=>switchCreateModal("habit"),()=>{});
el.mobileAdd.onclick=()=>{
  if(state.activePage==="habit"){
    openHabitCreate();
    return;
  }

  openCreate(
    state.selectedDateKey||dateKey(new Date())
  );
};
$("closeEventModal").onclick=closeModal;$("cancelEvent").onclick=closeModal;el.form.onsubmit=submit;
el.remove.onclick=removeEvent;
el.editOnlyThisDateButton.onclick=()=>applyPendingRepeatEdit("single");
el.editAllRepeatsButton.onclick=()=>applyPendingRepeatEdit("all");
$("closeRepeatEditDialog").onclick=closeRepeatEditDialog;
$("cancelRepeatEditButton").onclick=closeRepeatEditDialog;
el.repeatEditDialog.onclick=event=>{
  if(event.target===el.repeatEditDialog)closeRepeatEditDialog();
};
el.deleteOnlyThisDateButton.onclick=deleteOnlyCurrentOccurrence;
el.deleteAllRepeatsButton.onclick=deleteEntireRepeatSeries;
$("closeRepeatDeleteDialog").onclick=closeRepeatDeleteDialog;
$("cancelRepeatDeleteButton").onclick=closeRepeatDeleteDialog;
el.repeatDeleteDialog.onclick=event=>{
  if(event.target===el.repeatDeleteDialog)closeRepeatDeleteDialog();
};
$("progressOptions").onclick=e=>{const b=e.target.closest("button[data-value]");if(b)setProgress(b.dataset.value)};el.modal.onclick=e=>{if(e.target===el.modal)closeModal()};
el.mobileUser.onclick=openSheet;el.closeSheet.onclick=closeSheet;el.accountSheet.onclick=e=>{if(e.target===el.accountSheet)closeSheet()};


el.calendarNav.onclick=()=>navigateToPage("calendar");
el.habitNav.onclick=()=>navigateToPage("habit");
el.statsNav.onclick=()=>navigateToPage("stats");
el.searchNav.onclick=()=>navigateToPage("search");
el.mobileCalendarNav.onclick=()=>navigateToPage("calendar");
el.mobileHabitNav.onclick=()=>navigateToPage("habit");
el.mobileStatsNav.onclick=()=>navigateToPage("stats");
el.mobileSearchNav.onclick=()=>navigateToPage("search");
$("statsTodayButton").onclick=()=>{
  state.statsDate=dateKey(new Date());
  state.statsInsightDate=null;
  state.currentMonth=startOfMonth(new Date());
  renderStats();
};
$("statsPrevMonthButton").onclick=()=>{
  const next=new Date(state.currentMonth.getFullYear(),state.currentMonth.getMonth()-1,1);
  state.currentMonth=next;
  state.statsDate=dateKey(next);
  state.statsInsightDate=null;
  renderStats();
};
$("statsThisMonthButton").onclick=()=>{
  const now=new Date();
  state.currentMonth=startOfMonth(now);
  state.statsDate=dateKey(now);
  state.statsInsightDate=null;
  renderStats();
};
$("statsNextMonthButton").onclick=()=>{
  const next=new Date(state.currentMonth.getFullYear(),state.currentMonth.getMonth()+1,1);
  state.currentMonth=next;
  state.statsDate=dateKey(next);
  state.statsInsightDate=null;
  renderStats();
};

el.openCategoryManagerButton.onclick=openCategoryManager;
$("weekCategoryManagerButton").onclick=openCategoryManager;
$("closeCategoryManagerButton").onclick=closeCategoryManager;
$("cancelCategoryManagerButton").onclick=closeCategoryManager;
$("addCategoryButton").onclick=addCategory;
el.saveCategoriesButton.onclick=saveCategories;
el.categoryManagerModal.onclick=event=>{
  if(event.target===el.categoryManagerModal)closeCategoryManager();
};
$("closeEventContextMenu").onclick=hideEventContextMenu;
document.addEventListener("click",event=>{
  if(!el.eventContextMenu.hidden&&!event.target.closest("#eventContextMenu")){
    hideEventContextMenu();
  }
});

[el.mobileStartTime,el.mobileEndTime].forEach(control=>{
  control.addEventListener("change",()=>{
    control.value=roundTimeValue(control.value);

    let start=roundTimeValue(el.mobileStartTime.value||"09:00");
    let end=roundTimeValue(el.mobileEndTime.value||defaultEndTime(start));

    if(timeToMinutes(end)<=timeToMinutes(start)){
      end=defaultEndTime(start);
      el.mobileEndTime.value=end==="24:00"?"23:30":end;
    }

    syncHiddenTimes();
  });
});

el.memo.addEventListener("input",autoResizeMemo);

[el.startClock,el.endClock].forEach(control=>{
  control.addEventListener("change",()=>{
    control.value=roundTimeValue(control.value);
    syncHiddenTimes();
  });
});
el.date.addEventListener("change",()=>{
  if(!el.endDate.value||el.endDate.value<el.date.value){
    el.endDate.value=el.date.value;
  }
});
el.endDate.addEventListener("change",()=>{
  if(el.endDate.value<el.date.value){
    el.endDate.value=el.date.value;
  }
});

el.mobileStartTime.addEventListener("change",()=>{
  const start=el.mobileStartTime.value;
  refreshMobileEndTimes(start,defaultEndTime(start));
  syncHiddenTimes();
});
el.mobileEndTime.addEventListener("change",syncHiddenTimes);

[el.startHour,el.startMinute,el.endHour,el.endMinute].forEach(control=>{
  control.addEventListener("change",()=>{
    syncHiddenTimes();

    if(timeToMinutes(el.endTime.value)<=timeToMinutes(el.time.value)){
      setTimeParts(el.time.value,defaultEndTime(el.time.value));
    }

    if(el.endHour.value==="24"){
      el.endMinute.value="00";
      el.endMinute.disabled=true;
    }else{
      el.endMinute.disabled=false;
    }

    syncHiddenTimes();
  });
});
el.quickAddButton.onclick=submitQuickAdd;
el.quickAddInput.addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    submitQuickAdd();
  }
});

el.globalSearchInput.addEventListener("input",()=>{
  state.searchQuery=el.globalSearchInput.value;
  renderSearch();
});

el.clearSearchButton.onclick=()=>{
  state.searchQuery="";
  el.globalSearchInput.value="";
  renderSearch();
  el.globalSearchInput.focus();
};

document.querySelectorAll(".search-filter-button").forEach(button=>{
  button.addEventListener("click",()=>{
    state.searchFilter=button.dataset.filter;
    renderSearch();
  });
});
el.addChecklistItemButton.onclick=addChecklistItem;
$("openHabitModal").onclick=openHabitCreate;
$("closeHabitModal").onclick=closeHabitModal;
$("cancelHabit").onclick=closeHabitModal;
el.habitForm.onsubmit=submitHabit;
el.deleteHabitButton.onclick=deleteHabit;
el.habitModal.onclick=e=>{if(e.target===el.habitModal)closeHabitModal()};
$("habitTodayButton").onclick=()=>{const today=new Date();state.selectedHabitDateKey=dateKey(today);state.habitMonth=startOfMonth(today);renderHabits()};
$("prevHabitDate").onclick=()=>{state.selectedHabitDateKey=dateKey(addDays(parseDateKey(state.selectedHabitDateKey),-1));renderHabits()};
$("nextHabitDate").onclick=()=>{state.selectedHabitDateKey=dateKey(addDays(parseDateKey(state.selectedHabitDateKey),1));renderHabits()};
$("prevHabitMonth").onclick=()=>{state.habitMonth=new Date(state.habitMonth.getFullYear(),state.habitMonth.getMonth()-1,1);renderHabitHeatmap()};
$("nextHabitMonth").onclick=()=>{state.habitMonth=new Date(state.habitMonth.getFullYear(),state.habitMonth.getMonth()+1,1);renderHabitHeatmap()};


document.addEventListener("keydown",event=>{
  if(event.key!=="Escape")return;

  if(el.repeatEditDialog.classList.contains("show")){
    closeRepeatEditDialog();
    return;
  }

  if(el.repeatDeleteDialog.classList.contains("show")){
    closeRepeatDeleteDialog();
    return;
  }

  if(
    el.mobileEventActionSheet
    &&!el.mobileEventActionSheet.hidden
  ){
    hideMobileEventActionSheet();
    return;
  }

  if(el.modal.classList.contains("show")){
    closeModal();
    return;
  }

  if(state.dayViewOpen){
    closeDayView();
  }
});

window.addEventListener("popstate",event=>{
  if(state.ignoreNextPopstate){
    state.ignoreNextPopstate=false;
    restoreViewScroll(state.preservedViewScroll);
    return;
  }

  if(
    state.modalHistoryType==="event"
    ||el.modal.classList.contains("show")
  ){
    closeEventModalFromHistory();
  }else if(
    el.repeatEditDialog.classList.contains("show")
  ){
    closeRepeatEditDialog();
  }else if(
    el.repeatDeleteDialog.classList.contains("show")
  ){
    closeRepeatDeleteDialog();
  }else if(
    el.categoryManagerModal.classList.contains("show")
  ){
    closeCategoryManagerFromHistory();
  }else if(
    el.habitModal.classList.contains("show")
  ){
    closeHabitModalFromHistory();
  }else if(
    el.accountSheet.classList.contains("show")
  ){
    closeAccountSheetFromHistory();
  }else if(state.dayViewOpen){
    closeDayView({fromHistory:true});
  }

  const historyState=event.state;

  if(historyState?.momentum){
    state.activePage=historyState.page||"calendar";

    if(historyState.calendarView){
      state.currentView=historyState.calendarView;
    }
  }else{
    state.activePage="calendar";
  }

  renderAll();

  if(state.dayViewOpen){
    requestAnimationFrame(renderDayView);
  }
});


setupMondayFirstDatePicker();
setupWheelTimePicker();
setupDesktopUndo();
setupCalendarSwipe();

await setPersistence(auth,browserLocalPersistence);
onAuthStateChanged(auth,async user=>{
  el.loading.hidden=true;
  if(!user){
    state.user=null;state.events=[];state.eventLogs={};state.habits=[];state.habitLogs={};
    if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null}
    if(state.unsubscribeEventLogs){state.unsubscribeEventLogs();state.unsubscribeEventLogs=null}
    if(state.unsubscribeCategories){state.unsubscribeCategories();state.unsubscribeCategories=null}
    if(state.unsubscribeHabits){state.unsubscribeHabits();state.unsubscribeHabits=null}
    if(state.unsubscribeHabitLogs){state.unsubscribeHabitLogs();state.unsubscribeHabitLogs=null}
    el.login.hidden=false;el.app.hidden=true;return
  }
  state.user=user;
  el.login.hidden=true;
  el.app.hidden=false;
  fillUser(user);

  if(!history.state?.momentum){
    syncHistoryState({replace:true});
  }
  try{
    await saveProfile(user);
    listenCategories(user);
    listen(user);
    listenHabits(user);
  }catch(error){
    console.error(error);
    alert("Firebase에 연결하지 못했습니다.");
  }
});
setProgress(0);
