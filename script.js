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
const THEMES=[
  {id:"green",name:"녹색",main:"#8bcf4a",dark:"#5f9230",soft:"#f0f9e7",bg:"#f9fcf6",muted:"#f4f9ef",line:"#e1ecd8",text:"#2f3d27",glow:"#b9e58e"},
  {id:"red-brown",name:"붉은색 / 갈색",main:"#a85645",dark:"#743c31",soft:"#f7ebe7",bg:"#fbf7f5",muted:"#f7f1ee",line:"#eaded8",text:"#3d2d29",glow:"#d99a84"},
  {id:"blue",name:"청색 (파란색)",main:"#347fc4",dark:"#245b91",soft:"#e9f3fb",bg:"#f6f9fc",muted:"#f0f5f9",line:"#dce7ef",text:"#213544",glow:"#79b7e8"},
  {id:"glass",name:"회색 / 하늘색 / 백색",main:"#7899ad",dark:"#506f82",soft:"rgba(224,239,247,.62)",bg:"#eef4f7",muted:"rgba(255,255,255,.55)",line:"rgba(154,179,194,.38)",text:"#30434e",glow:"#b9dbea",glass:true},
  {id:"red-orange",name:"붉은색 / 주황색",main:"#df6e3e",dark:"#aa3f30",soft:"#fff0e8",bg:"#fff9f5",muted:"#fff3ec",line:"#f1dfd5",text:"#442e27",glow:"#f3a36f"},
  {id:"red",name:"붉은색",main:"#c94f59",dark:"#943640",soft:"#fbecef",bg:"#fcf7f8",muted:"#f9f0f2",line:"#ecdde0",text:"#422c31",glow:"#e58b94"},
  {id:"yellow",name:"노란색",main:"#d7a928",dark:"#977315",soft:"#fff7d8",bg:"#fffdf5",muted:"#fff9e7",line:"#eee4c5",text:"#423b25",glow:"#edce72"},
  {id:"lime-green",name:"연두색 / 녹색",main:"#69a83f",dark:"#42772b",soft:"#eef7e8",bg:"#f8fbf5",muted:"#f2f8ed",line:"#dfead7",text:"#2f4129",glow:"#a8d67e"},
  {id:"pale-yellow",name:"연한 노란색",main:"#bca34a",dark:"#806f32",soft:"#fff9e3",bg:"#fffdf7",muted:"#fffaf0",line:"#eee7d3",text:"#443f31",glow:"#ead995"},
  {id:"deep-green",name:"짙은 녹색",main:"#176b50",dark:"#0d4937",soft:"#e3f0eb",bg:"#f3f8f6",muted:"#edf4f1",line:"#d6e5df",text:"#19352b",glow:"#5aa78c"},
  {id:"azure",name:"푸른색 (파란색)",main:"#3469d4",dark:"#244a9b",soft:"#e9effd",bg:"#f6f8fd",muted:"#eff3fb",line:"#dce3f2",text:"#25334d",glow:"#7fa4ed"},
  {id:"purple",name:"보라색",main:"#8361b5",dark:"#5f438a",soft:"#f1ebf8",bg:"#faf8fc",muted:"#f5f1f9",line:"#e7deef",text:"#392f45",glow:"#b69bd7"}
];
const CATEGORY_COLORS=[
  {name:"초록색",value:"#2fa66a"},
  {name:"하늘색",value:"#65bff0"},
  {name:"남색",value:"#253a73"},
  {name:"짙은 초록색",value:"#176b50"},
  {name:"빨간색",value:"#d65353"},
  {name:"분홍색",value:"#e982a8"},
  {name:"노란색",value:"#e4bd32"},
  {name:"청록색",value:"#3fc6b3"},
  {name:"주황색",value:"#ed8738"},
  {name:"연두색",value:"#8bcf4a"},
  {name:"푸른 보라색",value:"#665ad1"},
  {name:"자주색",value:"#a33f83"}
];
const DEFAULT_CATEGORIES = [
  {id:"study",name:"공부",color:"#65bff0"},
  {id:"exercise",name:"운동",color:"#8bcf4a"},
  {id:"work",name:"업무",color:"#ed8738"},
  {id:"personal",name:"개인",color:"#665ad1"},
  {id:"other",name:"기타",color:"#253a73",locked:true}
];
const state = {
  user:null, events:[], currentView:"selected",
  currentMonth:startOfMonth(new Date()), currentWeek:startOfWeek(new Date()),
  selectedDateKey:dateKey(new Date()), selectedProgress:0, unsubscribe:null,
  weekZoom:100, weekFit:false, weekVisibleDays:7,
  activePage:"calendar",
  statsDate:dateKey(new Date()), statsInsightDate:null,
  habits:[], habitLogs:{}, selectedHabitDateKey:dateKey(new Date()),
  todos:[], todoLogs:{}, unsubscribeTodos:null, unsubscribeTodoLogs:null, todoRolloverRunning:false, todoDedupeRunning:false,
  editingTodoChecklist:[], eventImportant:false, todoImportant:false,
  todoOverviewMonth:startOfMonth(new Date()),
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
  datePickerMonth:startOfMonth(new Date()),
  pendingRepeatEdit:null,
  editingOccurrenceContext:null,
  editingOriginalEventData:null,
  skipEventSnapshotRenders:0,
  skipHabitSnapshotRenders:0,
  skipTodoSnapshotRenders:0,
  snapshotSkipTimers:{},
  preservedViewScroll:null,
  suppressTimePickerUntil:0,
  ignoreNextPopstate:false,
  undoStack:[],
  isUndoing:false,
  goalProfile:{challenges:[]}, unsubscribeGoals:null, editingGoalChecklist:[]
};

const $ = (id) => document.getElementById(id);
function mixHex(a,b,amount){
  const parse=value=>value.replace("#","").match(/.{2}/g).map(part=>parseInt(part,16));
  const [ar,ag,ab]=parse(a),[br,bg,bb]=parse(b);
  return `#${[ar+(br-ar)*amount,ag+(bg-ag)*amount,ab+(bb-ab)*amount].map(value=>Math.round(value).toString(16).padStart(2,"0")).join("")}`;
}
function applyTheme(id,{save=true}={}){
  const theme=THEMES.find(item=>item.id===id)||THEMES[0],root=document.documentElement.style;
  root.setProperty("--bg",theme.bg);root.setProperty("--surface","#ffffff");root.setProperty("--muted",theme.muted);root.setProperty("--line",theme.line);root.setProperty("--text",theme.text);
  root.setProperty("--green",theme.main);root.setProperty("--green-dark",theme.dark);root.setProperty("--green-soft",theme.soft);root.setProperty("--theme-glow",theme.glow);
  document.documentElement.dataset.theme=theme.id;document.documentElement.classList.toggle("glass-theme",Boolean(theme.glass));
  COLORS[0]=mixHex(theme.main,"#ffffff",.9);COLORS[25]=mixHex(theme.main,"#ffffff",.72);COLORS[50]=mixHex(theme.main,"#ffffff",.48);COLORS[75]=mixHex(theme.main,"#ffffff",.24);COLORS[100]=theme.main;
  if(save)localStorage.setItem("momentum_theme",theme.id);
  document.querySelectorAll("[data-theme-id]").forEach(button=>button.classList.toggle("active",button.dataset.themeId===theme.id));
  if(state.events?.length)renderAll();
}
function renderThemePicker(){
  const picker=$("themePicker");if(!picker)return;
  const current=localStorage.getItem("momentum_theme")||"green";
  picker.innerHTML=THEMES.map(theme=>`<button type="button" data-theme-id="${theme.id}" class="${theme.id===current?"active":""}"><i style="--theme-main:${theme.main};--theme-soft:${theme.soft}"></i><span>${escapeHtml(theme.name)}</span></button>`).join("");
}
function skipSnapshotRenders(kind,count=2){
  const key=`skip${kind}SnapshotRenders`;
  state[key]=Math.max(Number(state[key]||0),count);
  clearTimeout(state.snapshotSkipTimers[kind]);
  state.snapshotSkipTimers[kind]=setTimeout(()=>{
    state[key]=0;
    delete state.snapshotSkipTimers[kind];
  },2500);
}
function clearSnapshotRenderSkip(kind){
  const key=`skip${kind}SnapshotRenders`;
  state[key]=0;
  clearTimeout(state.snapshotSkipTimers[kind]);
  delete state.snapshotSkipTimers[kind];
}
const el = {
  loading:$("loadingScreen"), login:$("loginScreen"), app:$("app"), loginButton:$("googleLoginButton"), loginError:$("loginError"),
  logout:$("logoutButton"), sheetLogout:$("sheetLogoutButton"), userPhoto:$("userPhoto"), userName:$("userName"), userEmail:$("userEmail"),
  sheetPhoto:$("sheetUserPhoto"), sheetName:$("sheetUserName"), sheetEmail:$("sheetUserEmail"),
  accountSheet:$("accountSheet"), closeSheet:$("closeAccountSheet"),
  statsMonthView:$("statsMonthView"), selectedView:$("selectedView"), weekView:$("weekView"), statsMonthGrid:$("statsMonthGrid"), weekGrid:$("weekGrid"), weekScroll:$("weekScroll"), periodLabel:$("periodLabel"),
  weekZoomControls:$("weekZoomControls"), weekZoomOut:$("weekZoomOut"), weekZoomIn:$("weekZoomIn"), weekZoomValue:$("weekZoomValue"),
  selectedBtn:$("selectedViewButton"), weekBtn:$("weekViewButton"), selectedTitle:$("selectedDateTitle"), selectedLabel:$("selectedDateLabel"),
  datePickerModal:$("datePickerModal"), datePickerGrid:$("datePickerGrid"),
  datePickerYear:$("datePickerYear"), datePickerMonth:$("datePickerMonth"),
  closeDatePicker:$("closeDatePicker"), datePickerPrevMonth:$("datePickerPrevMonth"),
  datePickerNextMonth:$("datePickerNextMonth"),
  selectedEvents:$("selectedDayEvents"), dayProgress:$("dayProgressNumber"), dayBar:$("dayProgressBar"), dayCaption:$("dayProgressCaption"),
  selectedInsightEventProgress:$("selectedInsightEventProgress"),
  selectedInsightHabitProgress:$("selectedInsightHabitProgress"),
  selectedInsightChecklist:$("selectedInsightChecklist"),
  selectedInsightCombinedBar:$("selectedInsightCombinedBar"),
  selectedInsightEventBar:$("selectedInsightEventBar"),
  selectedInsightHabitBar:$("selectedInsightHabitBar"),
  selectedInsightChecklistBar:$("selectedInsightChecklistBar"),
  selectedHabitPreview:$("selectedHabitPreview"), selectedHabitMoreButton:$("selectedHabitMoreButton"),
  selectedCompletionRing:$("selectedCompletionRing"), selectedCompletionValue:$("selectedCompletionValue"),
  selectedCompletionDetail:$("selectedCompletionDetail"),
  monthCount:$("monthEventCount"), monthAverage:$("monthAverageProgress"), summaryHabitNames:$("summaryHabitNames"),
  modal:$("eventModal"), form:$("eventForm"),
  eventId:$("eventId"), eventOccurrenceDate:$("eventOccurrenceDate"), title:$("eventTitle"), eventImportantButton:$("eventImportantButton"), category:$("eventCategory"),
  date:$("eventDate"), endDate:$("eventEndDate"),
  startClock:$("eventStartClock"), endClock:$("eventEndClock"),
  time:$("eventTime"), endTime:$("eventEndTime"),
  startHour:$("eventStartHour"), startMinute:$("eventStartMinute"),
  endHour:$("eventEndHour"), endMinute:$("eventEndMinute"),
  mobileStartTime:$("eventStartTimeMobile"), mobileEndTime:$("eventEndTimeMobile"),
  repeat:$("eventRepeat"), repeatEndDate:$("eventRepeatEndDate"), repeatEndWrap:$("eventRepeatEndWrap"),
  editScopeSection:$("eventEditScopeSection"), editScope:$("eventEditScope"),
  editRangeFields:$("eventEditRangeFields"), editRangeStart:$("eventEditRangeStart"),
  editRangeEnd:$("eventEditRangeEnd"),
  memo:$("eventMemo"),
  repeatChips:$("eventRepeatChips"), repeatNoEndButton:$("repeatNoEndButton"), repeatSetEndButton:$("repeatSetEndButton"),
  editScopeSummaryButton:$("eventEditScopeSummaryButton"), editScopeSummary:$("eventEditScopeSummary"),
  editScopeSheet:$("eventEditScopeSheet"), closeEventScopeSheet:$("closeEventScopeSheet"), applyEventScopeButton:$("applyEventScopeButton"),
  memoDetails:$("eventMemoDetails"), memoSummary:$("eventMemoSummary"),
  checklistDetails:$("eventChecklistDetails"), checklistSummaryText:$("eventChecklistSummary"),
  progressDetails:$("eventProgressDetails"), progressSummary:$("eventProgressSummary"),
  checklistItems:$("checklistItems"), addChecklistItemButton:$("addChecklistItemButton"),
  modalEyebrow:$("eventModalEyebrow"), modalTitle:$("eventModalTitle"), save:$("saveEventButton"), remove:$("deleteEventButton"),
  formError:$("formError"),
  repeatEditDialog:$("repeatEditDialog"),
  editOnlyThisDateButton:$("editOnlyThisDateButton"),
  editFromThisDateButton:$("editFromThisDateButton"),
  editAllRepeatsButton:$("editAllRepeatsButton"),
  repeatDeleteDialog:$("repeatDeleteDialog"),
  deleteOnlyThisDateButton:$("deleteOnlyThisDateButton"), deleteAllRepeatsButton:$("deleteAllRepeatsButton"),
  calendarPage:$("calendarPage"), habitPage:$("habitPage"), diaryPage:$("diaryPage"), calendarNav:$("calendarNavButton"), habitNav:$("habitNavButton"), diaryNav:$("diaryNavButton"),
  habitTodayLabel:$("habitTodayLabel"), habitList:$("habitList"), habitHeatmapLabel:$("habitHeatmapLabel"), habitHeatmap:$("habitHeatmap"),
  habitModal:$("habitModal"), habitForm:$("habitForm"), habitId:$("habitId"), habitName:$("habitName"),
  habitStartDate:$("habitStartDate"), habitRepeat:$("habitRepeat"), habitEndDate:$("habitEndDate"),
  habitModalEyebrow:$("habitModalEyebrow"), habitModalTitle:$("habitModalTitle"), habitFormError:$("habitFormError"),
  deleteHabitButton:$("deleteHabitButton"), saveHabitButton:$("saveHabitButton"),
  mobileCalendarNav:$("mobileCalendarNavButton"), mobileHabitNav:$("mobileHabitNavButton"), mobileDiaryNav:$("mobileDiaryNavButton"), mobileStatsNav:$("mobileStatsNavButton"), mobileAdd:$("mobileAddButton"),
  statsPage:$("statsPage"), statsNav:$("statsNavButton"),
  goalList:$("goalList"), goalModal:$("goalModal"), goalModalTitle:$("goalModalTitle"), goalForm:$("goalForm"), goalId:$("goalId"), goalName:$("goalName"), goalMode:$("goalMode"), goalTarget:$("goalTarget"), goalTargetWrap:$("goalTargetWrap"), goalDate:$("goalDate"), goalMemo:$("goalMemo"), goalChecklistItems:$("goalChecklistItems"), goalComplete:$("goalComplete"), goalCompleteWrap:$("goalCompleteWrap"), deleteGoalButton:$("deleteGoalButton"), goalMessage:$("goalMessage"),
  statsTodayEventProgress:$("statsTodayEventProgress"), statsTodayEventCount:$("statsTodayEventCount"),
  statsTodayHabitProgress:$("statsTodayHabitProgress"), statsTodayHabitCount:$("statsTodayHabitCount"),
  statsMonthCombinedProgress:$("statsMonthCombinedProgress"),
  statsDayEventLabel:$("statsDayEventLabel"), statsDayHabitLabel:$("statsDayHabitLabel"),
  statsMonthCombinedLabel:$("statsMonthCombinedLabel"), statsChecklistLabel:$("statsChecklistLabel"),
  statsWeeklyTitle:$("statsWeeklyTitle"), statsMonthSummaryTitle:$("statsMonthSummaryTitle"),
  statsCategoryTitle:$("statsCategoryTitle"), statsHabitRankingTitle:$("statsHabitRankingTitle"),
  weeklyProgressChart:$("weeklyProgressChart"), statsMonthEventCount:$("statsMonthEventCount"), statsMonthEventProgress:$("statsMonthEventProgress"),
  statsMonthHabitCount:$("statsMonthHabitCount"), statsMonthHabitProgress:$("statsMonthHabitProgress"),
  statsMonthPerfectHabitDays:$("statsMonthPerfectHabitDays"),
  statsChecklistProgress:$("statsChecklistProgress"), statsChecklistCount:$("statsChecklistCount"),
  statsChecklistTotal:$("statsChecklistTotal"), statsChecklistDone:$("statsChecklistDone"), statsChecklistFailed:$("statsChecklistFailed"),
  statsMonthCalendarTitle:$("statsMonthCalendarTitle"),
  categoryAchievement:$("categoryAchievement"), habitRanking:$("habitRanking"),
  searchModal:$("searchModal"), openSearchButton:$("openSearchButton"),
  globalSearchInput:$("globalSearchInput"),
  searchSummary:$("searchSummary"), searchResults:$("searchResults"),
  quickAddInput:$("quickAddInput"), quickAddButton:$("quickAddButton"), quickAddMessage:$("quickAddMessage"),
  todoInput:$("todoInput"), todoAddButton:$("todoAddButton"), todoList:$("todoList"), todoDayCount:$("todoDayCount"),
  todoSelectedDateLabel:$("todoSelectedDateLabel"), todoPrevDateButton:$("todoPrevDateButton"), todoNextDateButton:$("todoNextDateButton"),
  todoOverviewButton:$("todoOverviewButton"), todoOverviewModal:$("todoOverviewModal"),
  todoOverviewList:$("todoOverviewList"), todoOverviewMonthLabel:$("todoOverviewMonthLabel"),
  todoOverviewPrevMonth:$("todoOverviewPrevMonth"), todoOverviewThisMonth:$("todoOverviewThisMonth"),
  todoOverviewNextMonth:$("todoOverviewNextMonth"),
  todoModal:$("todoModal"), todoForm:$("todoForm"), todoEditId:$("todoEditId"), todoOccurrenceDate:$("todoOccurrenceDate"), todoModeSwitch:$("todoModeSwitch"),
  todoName:$("todoName"), todoImportantButton:$("todoImportantButton"), todoDate:$("todoDate"), todoRepeat:$("todoRepeat"), todoMemo:$("todoMemo"),
  todoChecklistItems:$("todoChecklistItems"), addTodoChecklistItemButton:$("addTodoChecklistItemButton"),
  todoFormError:$("todoFormError"), todoModalEyebrow:$("todoModalEyebrow"), todoModalTitle:$("todoModalTitle"),
  deleteTodoButton:$("deleteTodoButton"),
  statsTodoCount:$("statsTodoCount"),
  statsTodoTotal:$("statsTodoTotal"), statsTodoDone:$("statsTodoDone"), statsTodoCancelled:$("statsTodoCancelled"),
  statsTodoAverage:$("statsTodoAverage"),
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
  weekCategoryManagerButton:$("weekCategoryManagerButton"),
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
  if(Number(event.durationMsOverride)>0){
    return Number(event.durationMsOverride);
  }
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
  if(event.repeatEndDate&&target>parseDateKey(event.repeatEndDate))return false;
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
function eventWithRangeOverride(event,occurrenceKey){
  const overrides=Array.isArray(event.rangeOverrides)
    ?event.rangeOverrides
    :[];

  return overrides.reduce((result,override)=>{
    if(!override?.from||occurrenceKey<override.from)return result;
    if(override.to&&occurrenceKey>override.to)return result;
    return {...result,...(override.changes||{})};
  },event);
}
function occurrenceInstancesForDate(event,key){
  const repeat=event.repeat||"none";

  if(repeat==="none"){
    const endKey=event.endDate||event.date;
    if(key<event.date||key>endKey)return [];
    // 자정에 정확히 끝나는 일정은 종료일의 00:00 이후 구간을
    // 차지하지 않습니다. 0분 구간이 최소 30분 카드로 보이는 것을 방지합니다.
    if(
      key===endKey
      &&endKey!==event.date
      &&(event.endTime||"")==="00:00"
    )return [];

    return [{
      ...event,
      occurrenceDate:event.date,
      occurrenceStartDate:event.date,
      occurrenceEndDate:endKey,
      calendarDate:key,
      progress:eventOccurrenceProgress(event,event.date)
    }];
  }

  const duration=Math.max(
    eventDurationMs(event),
    ...(Array.isArray(event.rangeOverrides)
      ?event.rangeOverrides.map(override=>
        eventDurationMs({...event,...(override.changes||{})})
      )
      :[])
  );
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

    const effectiveEvent=eventWithRangeOverride(event,candidateKey);
    const effectiveDuration=eventDurationMs(effectiveEvent);

    const occurrenceStart=eventDateTime(
      candidateKey,
      effectiveEvent.time||"09:00"
    );
    const occurrenceEnd=new Date(
      occurrenceStart.getTime()+effectiveDuration
    );

    if(
      occurrenceStart<targetEnd
      &&occurrenceEnd>targetStart
    ){
      instances.push({
        ...effectiveEvent,
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
  const configured=habit.endDate?parseDateKey(habit.endDate):habitDefaultEndDate(habit);
  const archived=habit.archivedDate?parseDateKey(habit.archivedDate):habitDefaultEndDate(habit);
  return configured<archived?configured:archived;
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
  const todos=todosForDate(key);
  const values=[
    ...eventItems.map(event=>Number(event.progress||0)),
    ...habits.map(habit=>habitProgress(habit.id,key)),
    ...todos.map(todo=>todo.status==="done"?100:0)
  ];
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
  const dayName=`${selectedDate.getMonth()+1}월 ${selectedDate.getDate()}일`;

  if(
    state.currentMonth.getFullYear()!==selectedDate.getFullYear()
    ||state.currentMonth.getMonth()!==selectedDate.getMonth()
  ){
    state.currentMonth=startOfMonth(selectedDate);
  }

  const monthAnchor=startOfMonth(selectedDate);
  const monthText=`${selectedDate.getFullYear()}년 ${selectedDate.getMonth()+1}월`;
  const keys=monthKeys(monthAnchor);
  const monthEventOccurrences=keys.flatMap(key=>allEventsForDate(key));
  const monthEventAvg=average(monthEventOccurrences);

  const monthTodos=todoCompletionForKeys(keys);
  const todoTotal=monthTodos.total;
  const todoDone=monthTodos.done;
  const todoCancelled=monthTodos.cancelled;
  const todoProgress=monthTodos.progress;

  const activeMonthHabits=state.habits.filter(habit=>
    keys.some(key=>habitIsActive(habit,key))
  );
  const monthHabitValues=[];
  let perfectCount=0;

  activeMonthHabits.forEach(habit=>{
    keys.forEach(key=>{
      if(habitIsActive(habit,key)){
        const value=habitProgress(habit.id,key);
        monthHabitValues.push(value);
        if(value===100)perfectCount++;
      }
    });
  });

  const monthHabitAvg=monthHabitValues.length
    ?Math.round(monthHabitValues.reduce((a,b)=>a+b,0)/monthHabitValues.length)
    :0;
  const monthTodoValues=keys.flatMap(key=>todosForDate(key))
    .map(todo=>todo.status==="done"?100:0);
  const monthCombinedValues=[
    ...monthEventOccurrences.map(event=>Number(event.progress||0)),
    ...monthHabitValues,
    ...monthTodoValues
  ];
  const monthCombined=monthCombinedValues.length
    ?Math.round(monthCombinedValues.reduce((a,b)=>a+b,0)/monthCombinedValues.length)
    :0;

  const plannedVolume=monthCombinedValues.length;
  const executedVolume=monthCombinedValues.reduce((sum,value)=>sum+value,0)/100;
  el.statsDayEventLabel.textContent=`${selectedDate.getMonth()+1}월 종합 완료율`;
  el.statsDayHabitLabel.textContent=`${selectedDate.getMonth()+1}월 계획량`;
  el.statsMonthCombinedLabel.textContent=`${selectedDate.getMonth()+1}월 실행량`;
  el.statsTodayEventProgress.textContent=monthCombinedValues.length?`${monthCombined}%`:"—";
  el.statsTodayEventCount.textContent="일정·습관·할 일을 함께 계산";
  el.statsTodayHabitProgress.textContent=`${plannedVolume}`;
  el.statsTodayHabitCount.textContent="예정된 전체 항목";
  el.statsMonthCombinedProgress.textContent=plannedVolume?`${Number.isInteger(executedVolume)?executedVolume:executedVolume.toFixed(1)}`:"—";
  if(el.statsTodoAverage)el.statsTodoAverage.textContent=todoTotal?`${todoProgress}%`:"—";
  if(el.statsTodoCount)el.statsTodoCount.textContent="부분 완료를 포함한 실행량";

  const monthRateCombined=$("monthRateCombined"),monthRateEvents=$("monthRateEvents"),monthRateHabits=$("monthRateHabits"),monthRateTodos=$("monthRateTodos");
  if(monthRateCombined)monthRateCombined.textContent=monthCombinedValues.length?`${monthCombined}%`:"—";
  if(monthRateEvents)monthRateEvents.textContent=monthEventOccurrences.length?`${monthEventAvg}%`:"—";
  if(monthRateHabits)monthRateHabits.textContent=monthHabitValues.length?`${monthHabitAvg}%`:"—";
  if(monthRateTodos)monthRateTodos.textContent=todoTotal?`${todoProgress}%`:"—";

  el.statsMonthCalendarTitle.textContent=`${monthText} 성과`;
  const weeklyLabel={combined:"종합",events:"일정",todos:"할 일"}[state.weeklyMetric||"combined"];
  el.statsWeeklyTitle.textContent=`${dayName} 기준 최근 7일 ${weeklyLabel} 완료율`;
  el.statsMonthSummaryTitle.textContent=`${monthText} 요약`;
  el.statsCategoryTitle.textContent=`카테고리별 ${selectedDate.getMonth()+1}월 성취도`;
  el.statsHabitRankingTitle.textContent=`습관별 ${selectedDate.getMonth()+1}월 달성률`;

  el.statsMonthEventCount.textContent=`${monthEventOccurrences.length}개`;
  el.statsMonthEventProgress.textContent=`${monthEventAvg}%`;
  el.statsMonthHabitCount.textContent=`${activeMonthHabits.length}개`;
  el.statsMonthHabitProgress.textContent=`${monthHabitAvg}%`;
  el.statsMonthPerfectHabitDays.textContent=`${perfectCount}회`;
  if(el.statsTodoTotal)el.statsTodoTotal.textContent=`${todoTotal}개`;
  if(el.statsTodoDone)el.statsTodoDone.textContent=`${todoDone}개`;
  if(el.statsTodoCancelled)el.statsTodoCancelled.textContent=`${todoCancelled}개`;

  renderMonth();
  renderWorkloadChart(selectedDate);
  renderWeeklyProgress(selectedDate);
  renderCategoryAchievement(keys);
  renderHabitRanking(keys);
}
function renderWorkloadChart(referenceDate=parseDateKey(state.statsDate||dateKey(new Date()))){
  const chart=$("workloadChart");if(!chart)return;
  const days=[];
  for(let offset=6;offset>=0;offset--){
    const d=addDays(referenceDate,-offset),key=dateKey(d);
    const values=[
      ...allEventsForDate(key).map(item=>Number(item.progress||0)),
      ...activeHabitsOn(key).map(item=>habitProgress(item.id,key)),
      ...todosForDate(key).map(item=>item.status==="done"?100:0)
    ];
    days.push({d,planned:values.length,executed:values.reduce((sum,value)=>sum+value,0)/100});
  }
  const maxPlanned=Math.max(1,...days.map(day=>day.planned));
  chart.innerHTML=days.map(day=>{
    const planHeight=day.planned/maxPlanned*100;
    const fill=day.planned?day.executed/day.planned*100:0;
    const executed=Number.isInteger(day.executed)?day.executed:day.executed.toFixed(1);
    return `<div class="workload-day"><span>${executed}/${day.planned}</span><div class="workload-track" style="height:${planHeight}%"><i style="height:${fill}%"></i></div><strong>${["일","월","화","수","목","금","토"][day.d.getDay()]}</strong><small>${day.d.getMonth()+1}/${day.d.getDate()}</small></div>`;
  }).join("");
  chart._workloadDays=days;
  if(!chart._workloadObserver){
    chart._workloadObserver=new ResizeObserver(()=>drawWorkloadLine(chart,chart._workloadDays||[]));
    chart._workloadObserver.observe(chart);
  }
  requestAnimationFrame(()=>drawWorkloadLine(chart,days));
}
function drawWorkloadLine(chart,days){
  chart.querySelector(".workload-line")?.remove();
  const chartBox=chart.getBoundingClientRect();
  if(!chartBox.width||!chartBox.height)return;
  const points=[...chart.querySelectorAll(".workload-track")].map((track,index)=>{
    const box=track.getBoundingClientRect(),day=days[index];
    const ratio=day?.planned?day.executed/day.planned:0;
    return {x:box.left-chartBox.left+box.width/2,y:box.bottom-chartBox.top-box.height*ratio};
  });
  if(!points.length)return;
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.classList.add("workload-line");svg.setAttribute("viewBox",`0 0 ${chartBox.width} ${chartBox.height}`);svg.setAttribute("aria-hidden","true");
  const line=document.createElementNS(ns,"polyline");line.setAttribute("points",points.map(point=>`${point.x},${point.y}`).join(" "));svg.appendChild(line);
  points.forEach(point=>{const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",point.x);dot.setAttribute("cy",point.y);dot.setAttribute("r","5");svg.appendChild(dot)});
  chart.appendChild(svg);
}
function renderWeeklyProgress(referenceDate=parseDateKey(state.statsDate||dateKey(new Date()))){
  el.weeklyProgressChart.innerHTML="";
  const today=new Date(referenceDate.getFullYear(),referenceDate.getMonth(),referenceDate.getDate());
  for(let offset=6;offset>=0;offset--){
    const d=addDays(today,-offset),key=dateKey(d);
    const events=allEventsForDate(key),todos=todosForDate(key),habits=activeHabitsOn(key);
    const metric=state.weeklyMetric||"combined";
    const values=metric==="events"
      ?events.map(item=>Number(item.progress||0))
      :metric==="todos"
        ?todos.map(item=>item.status==="done"?100:0)
        :[...events.map(item=>Number(item.progress||0)),...habits.map(item=>habitProgress(item.id,key)),...todos.map(item=>item.status==="done"?100:0)];
    const hasItems=values.length>0;
    const value=hasItems?Math.round(values.reduce((sum,item)=>sum+item,0)/values.length):0;
    const todoRatio=metric==="todos"&&todos.length?`<small>${todos.filter(item=>item.status==="done").length}/${todos.length}</small>`:"";
    const col=document.createElement("div");col.className="weekly-chart-day";
    col.innerHTML=`<span class="weekly-chart-value">${hasItems?`${value}%`:"—"}${todoRatio}</span><div class="weekly-chart-track"><div class="weekly-chart-fill" style="height:${hasItems?Math.max(value,1):0}%"></div></div><strong class="weekly-chart-label">${["일","월","화","수","목","금","토"][d.getDay()]}</strong><span class="weekly-chart-date">${d.getMonth()+1}/${d.getDate()}</span>`;
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
  return normalizeSearchText(event.title);
}
function todoSearchText(todo){
  return normalizeSearchText(todo.text);
}
function habitSearchText(habit){
  return normalizeSearchText(habit.name);
}
function openSearchModal(){
  state.searchQuery="";
  state.searchFilter="all";
  renderSearch();
  el.searchModal.classList.add("show");
  document.body.style.overflow="hidden";
  pushModalHistory("search");
}
function closeSearchModal(){
  el.searchModal.classList.remove("show");
  document.body.style.overflow="";
  clearModalHistory("search");
}
function closeSearchModalFromHistory(){
  el.searchModal.classList.remove("show");
  document.body.style.overflow="";
  state.modalHistoryType=null;
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
    el.searchSummary.textContent="";
    el.searchResults.innerHTML="";
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

  if(state.searchFilter==="all"||state.searchFilter==="todos"){
    state.todos.forEach(todo=>{
      if(todoSearchText(todo).includes(normalizedQuery)){
        results.push({
          type:"todo",
          sortDate:todo.date,
          data:todo
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
  el.searchSummary.textContent="";

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
      button.innerHTML=`
        <div class="search-result-top">
          <span class="search-result-type">일정</span>
          <span class="search-result-date">${escapeHtml(event.date)} ${escapeHtml(event.time)}</span>
        </div>
        <strong>${highlightSearchText(event.title,queryText)}</strong>
      `;

      button.addEventListener("click",()=>{
        state.selectedDateKey=event.date;
        state.currentMonth=startOfMonth(parseDateKey(event.date));
        state.currentWeek=startOfWeek(parseDateKey(event.date));
        closeSearchModal();
        navigateToPage("calendar");
        renderAll();
        openEdit({...event,occurrenceDate:event.date,progress:eventOccurrenceProgress(event,event.date)});
      });
    }else if(result.type==="todo"){
      const todo=result.data;
      const d=parseDateKey(todo.date);
      const weekday=["일","월","화","수","목","금","토"][d.getDay()];
      button.innerHTML=`
        <div class="search-result-top">
          <span class="search-result-type">할 일</span>
          <span class="search-result-date">${escapeHtml(todo.date)} (${weekday})</span>
        </div>
        <strong>${highlightSearchText(todo.text,queryText)}</strong>
      `;

      button.addEventListener("click",()=>{
        state.selectedDateKey=todo.date;
        closeSearchModal();
        navigateToPage("calendar");
        renderAll();
        openTodoEdit({...todo,occurrenceDate:todo.date});
      });
    }else{
      const habit=result.data;
      button.innerHTML=`
        <div class="search-result-top">
          <span class="search-result-type">습관</span>
          <span class="search-result-date">${escapeHtml(habit.startDate)}</span>
        </div>
        <strong>${highlightSearchText(habit.name,queryText)}</strong>
      `;

      button.addEventListener("click",()=>{
        state.selectedHabitDateKey=dateKey(new Date());
        state.habitMonth=startOfMonth(new Date());
        closeSearchModal();
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
function parseQuickTimeRange(text){
  const normalized=String(text||"")
    .replace(/[–—−~∼]/g,"-")
    .replace(/([01]?\d|2[0-3])시\s*반/g,"$1:30")
    .replace(/([01]?\d|2[0-3])시\s*([0-5]?\d)분?/g,(_,h,m)=>`${h}:${pad(Number(m))}`)
    .replace(/([01]?\d|2[0-3])시/g,"$1:00")
    .replace(/\s+/g," ")
    .trim();

  let match=normalized.match(
    /(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d)|시)?\s*-\s*([01]?\d|2[0-3])(?::([0-5]\d)|시)?(?=\s|$|[,.)])/
  );
  if(match){
    const start=`${pad(Number(match[1]))}:${pad(Number(match[2]||0))}`;
    const end=`${pad(Number(match[3]))}:${pad(Number(match[4]||0))}`;
    if(timeToMinutes(end)>timeToMinutes(start))return {start,end};
  }

  match=normalized.match(
    /(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d)|시)?\s*부터\s*([01]?\d|2[0-3])(?::([0-5]\d)|시)?/
  );
  if(match){
    const start=`${pad(Number(match[1]))}:${pad(Number(match[2]||0))}`;
    const end=`${pad(Number(match[3]))}:${pad(Number(match[4]||0))}`;
    if(timeToMinutes(end)>timeToMinutes(start))return {start,end};
  }

  return null;
}

function parseQuickTime(text){
  const normalized=String(text||"")
    .replace(/\s+/g," ")
    .trim();

  // 18시 반 / 00시 반
  let match=normalized.match(/(?:^|\s)([01]?\d|2[0-3])시\s*반(?=\s|$|[,.)])/);
  if(match){
    return `${pad(Number(match[1]))}:30`;
  }

  // 18시 30분 / 18시30분 / 00시 30분
  match=normalized.match(/(?:^|\s)([01]?\d|2[0-3])시\s*([0-5]?\d)분?(?=\s|$|[,.)])/);
  if(match){
    return `${pad(Number(match[1]))}:${pad(Number(match[2]))}`;
  }

  // 18:30
  match=normalized.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|[,.)])/);
  if(match){
    return `${pad(Number(match[1]))}:${pad(Number(match[2]))}`;
  }

  // 18시
  match=normalized.match(/(?:^|\s)([01]?\d|2[0-3])시(?=\s|$|[,.)])/);
  if(match){
    return `${pad(Number(match[1]))}:00`;
  }

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
    .replace(/(?:^|\s)([01]?\d|2[0-3])(?::[0-5]\d|시)?\s*[-~∼–—−]\s*([01]?\d|2[0-3])(?::[0-5]\d|시)?(?=\s|$|[,.)])/g," ")
    .replace(/(?:^|\s)([01]?\d|2[0-3])(?::[0-5]\d|시)?\s*부터\s*([01]?\d|2[0-3])(?::[0-5]\d|시)?/g," ")
    .replace(/(?:^|\s)([01]?\d|2[0-3])시\s*반(?=\s|$|[,.)])/g," ")
    .replace(/(?:^|\s)([01]?\d|2[0-3])시\s*[0-5]?\d분?(?=\s|$|[,.)])/g," ")
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
  const timeRange=parseQuickTimeRange(raw);
  const time=timeRange?.start||parseQuickTime(raw);
  const endTime=timeRange?.end||defaultEndTime(time);
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
        endTime,
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
  if(page==="growth")page="diary";
  if(!["calendar","habit","diary","stats"].includes(page))page="calendar";

  const previousPage=state.activePage;
  state.activePage=page;
  if(page==="stats")state.statsInsightDate=null;

  if(push){
    history.pushState(currentHistoryState(),"",location.href);
  }

  renderPage();
  if(previousPage!==page)animateVisiblePage();
}
function syncHistoryState({replace=false}={}){
  const method=replace?"replaceState":"pushState";
  history[method](currentHistoryState(),"",location.href);
}


function animateVisiblePage(){
  const page=[el.calendarPage,el.habitPage,el.diaryPage,el.statsPage].find(item=>!item.hidden);
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
  const diaryMode=state.activePage==="diary";
  const statsMode=state.activePage==="stats";

  el.calendarPage.hidden=!calendarMode;
  el.habitPage.hidden=!habitMode;
  el.diaryPage.hidden=!diaryMode;
  el.statsPage.hidden=!statsMode;

  el.calendarNav.classList.toggle("active",calendarMode);
  el.habitNav.classList.toggle("active",habitMode);
  el.diaryNav.classList.toggle("active",diaryMode);
  el.statsNav.classList.toggle("active",statsMode);

  el.mobileCalendarNav.classList.toggle("active",calendarMode);
  el.mobileHabitNav.classList.toggle("active",habitMode);
  el.mobileDiaryNav.classList.toggle("active",diaryMode);
  el.mobileStatsNav.classList.toggle("active",statsMode);

  el.mobileAdd.hidden=
    statsMode||diaryMode
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

  if(habitMode){renderHabits();renderGoals();}
  if(diaryMode)renderDiary();
  if(statsMode)renderStats();
}
function renderHabits(){
  renderHabitList();
  renderHabitHeatmap();
}
function renderHabitList(){
  const d=parseDateKey(state.selectedHabitDateKey);
  el.habitTodayLabel.textContent=`${d.getMonth()+1}월 ${d.getDate()}일 습관`;
  el.habitList.innerHTML="";
  const active=state.habits.filter(h=>!h.archived&&habitIsActive(h,state.selectedHabitDateKey));
  if(!active.length){
    el.habitList.innerHTML='<div class="habit-empty">등록된 습관이 없습니다.<br>오른쪽 아래 + 버튼을 눌러 시작하세요.</div>';
    return;
  }
  active.forEach(habit=>{
    const progress=habitProgress(habit.id,state.selectedHabitDateKey);
    const item=document.createElement("article");
    item.className="habit-item";
    item.dataset.habitId=habit.id;
    const streak=habitStreak(habit);
    item.innerHTML=`<div class="habit-item-top"><div class="habit-item-title"><strong>${escapeHtml(habit.name)}</strong><small>연속 100% ${streak}일</small></div><button class="habit-edit-button" type="button">수정</button></div>`;
    item.querySelector(".habit-edit-button").onclick=()=>openHabitEdit(habit);
    const progressButton=document.createElement("button");
    progressButton.type="button";
    progressButton.className="habit-progress-cycle";
    progressButton.textContent=`${progress}%`;
    progressButton.style.setProperty("--habit-progress",`${progress*3.6}deg`);
    progressButton.setAttribute("aria-label",`${habit.name} 완료율 ${progress}%, 눌러서 변경`);
    progressButton.onclick=()=>{
      const next=nextHabitProgressValue(
        habitProgress(habit.id,state.selectedHabitDateKey)
      );
      setHabitProgress(
        habit.id,
        state.selectedHabitDateKey,
        next,
        {optimistic:true}
      );
    };
    item.appendChild(progressButton);el.habitList.appendChild(item);
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

  const heading=document.createElement("div");
  heading.className="heatmap-block-heading";
  const title=document.createElement("button");
  title.type="button";
  title.className="heatmap-block-name";
  title.textContent=habit.name;
  title.onclick=()=>openHabitEdit(habit);
  const achieved=Object.values(state.habitLogs).filter(log=>log.habitId===habit.id&&Number(log.progress)>0).length;
  const challenge=(state.goalProfile.challenges||[]).find(item=>item.habitId===habit.id&&item.mode==="count");
  const progress=document.createElement("span");
  progress.className="heatmap-habit-progress";
  progress.textContent=challenge?`${achieved} / ${challenge.target}`:`누적 ${achieved}회`;
  heading.append(title,progress);
  block.appendChild(heading);

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
  const habitEnd=habitEffectiveEndDate(habit);

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
  if(!confirm("이 습관을 종료할까요? 과거 실행 기록과 통계는 그대로 유지됩니다."))return;
  try{
    const habitId=el.habitId.value;
    const source=state.habits.find(habit=>habit.id===habitId);
    const deletedData=firestoreRecordData(source);

    await updateDoc(doc(db,"users",state.user.uid,"habits",habitId),{
      archived:true,archivedDate:dateKey(new Date()),archivedAt:serverTimestamp(),updatedAt:serverTimestamp()
    });

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
  const numericProgress=Number(progress);

  // HEATMAP의 같은 습관/날짜 셀 갱신
  document.querySelectorAll(
    `[data-habit-id="${CSS.escape(habitId)}"][data-date="${CSS.escape(key)}"]`
  ).forEach(cell=>{
    cell.style.background=COLORS[numericProgress];
    cell.dataset.progress=String(numericProgress);
    cell.title=cell.title.replace(/·\s*\d+%$/u,`· ${numericProgress}%`);
    cell.setAttribute("aria-label",cell.title);
  });

  // HEATMAP과 하루 화면의 순환 완료율을 즉시 동기화합니다.
  if(key===state.selectedHabitDateKey){
    const card=el.habitList.querySelector(
      `.habit-item[data-habit-id="${CSS.escape(habitId)}"]`
    );

    if(card){
      const button=card.querySelector(".habit-progress-cycle");
      if(button){
        button.textContent=`${numericProgress}%`;
        button.style.setProperty("--habit-progress",`${numericProgress*3.6}deg`);
      }
    }

    const previewRow=el.selectedHabitPreview?.querySelector(
      `.selected-habit-row[data-habit-id="${CSS.escape(habitId)}"]`
    );
    const previewProgress=previewRow?.querySelector(".selected-habit-progress");
    if(previewProgress){
      previewProgress.textContent=`${numericProgress}%`;
      previewProgress.style.setProperty("--habit-progress",`${numericProgress*3.6}deg`);
    }

    updateSelectedProgressMetrics(key);
  }
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

  skipSnapshotRenders("Habit",2);

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

function goalProfileRef(){return doc(db,"users",state.user.uid,"growth","profile")}
function goalProgress(goal){
  const count=goal.habitId?Object.values(state.habitLogs).filter(log=>log.habitId===goal.habitId&&Number(log.progress)>0).length:0;
  const reached=goal.mode==="count"?count>=Number(goal.target||1):false;
  return {...goal,count,complete:!goal.manualIncomplete&&(Boolean(goal.completed)||reached)};
}
function goalStatus(goal){
  if(goal.complete)return "달성";
  const count=goal.mode==="count"?`${goal.count} / ${goal.target}`:"";
  const checklist=goal.checklist||[],checked=checklist.filter(item=>item.done).length;
  const checklistText=checklist.length?`체크 ${checked}/${checklist.length}`:"";
  if(!goal.dueDate)return [count,checklistText].filter(Boolean).join(" · ")||"진행 중";
  const days=Math.round((parseDateKey(goal.dueDate)-parseDateKey(dateKey(new Date())))/86400000);
  return [count,checklistText,days>0?`D-${days}`:days===0?"오늘":"기한 지남"].filter(Boolean).join(" · ");
}
function renderGoals(){
  const goals=(state.goalProfile.challenges||[]).map(goalProgress);
  el.goalList.innerHTML=goals.map(goal=>`<span class="${goal.complete?"done":""}" data-goal-id="${goal.id}"><button class="goal-state" type="button" aria-label="${goal.complete?"완료 취소":"완료"}">${goal.complete?"✓":"◇"}</button><button class="goal-name" type="button">${escapeHtml(goal.name)}</button><small>${escapeHtml(goalStatus(goal))}</small></span>`).join("")||'<p class="empty-state">아직 목표가 없습니다. 이루고 싶은 것을 추가해보세요.</p>';
}
function listenGoals(user){
  state.unsubscribeGoals?.();
  state.unsubscribeGoals=onSnapshot(goalProfileRef(),snap=>{state.goalProfile={challenges:[],...(snap.exists()?snap.data():{})};renderGoals()},error=>console.error("목표를 불러오지 못했습니다.",error));
}
async function saveGoals(challenges){state.goalProfile={...state.goalProfile,challenges};renderGoals();await setDoc(goalProfileRef(),{challenges},{merge:true})}
function toggleGoalModal(show){el.goalModal.classList.toggle("show",show);el.goalModal.setAttribute("aria-hidden",String(!show))}
function openGoal(goal=null){
  el.goalForm.reset();el.goalId.value=goal?.id||"";el.goalName.value=goal?.name||"";el.goalMode.value=goal?.mode||"date";el.goalTarget.value=goal?.target||30;el.goalDate.value=goal?.dueDate||"";el.goalMemo.value=goal?.memo||"";state.editingGoalChecklist=(goal?.checklist||[]).map(item=>({...item}));renderGoalChecklistEditor();el.goalComplete.checked=Boolean(goal&&goalProgress(goal).complete);el.goalModalTitle.textContent=goal?"목표 수정":"목표 추가";el.deleteGoalButton.hidden=!goal;el.goalCompleteWrap.hidden=!goal;syncGoalMode();el.goalMessage.textContent="";toggleGoalModal(true);
}
function renderGoalChecklistEditor(){
  el.goalChecklistItems.innerHTML=state.editingGoalChecklist.map((item,index)=>`<div class="goal-checklist-row" data-goal-check-index="${index}"><input type="checkbox" ${item.done?"checked":""} aria-label="완료"><input type="text" maxlength="100" value="${escapeHtml(item.text||"")}" placeholder="체크할 항목"><button type="button" aria-label="항목 삭제">×</button></div>`).join("");
}
function syncGoalMode(){el.goalTargetWrap.hidden=el.goalMode.value!=="count";if(el.goalId.value)el.goalCompleteWrap.hidden=false}
async function removeGoal(id){
  const goal=(state.goalProfile.challenges||[]).find(item=>item.id===id);if(!goal)return;
  if(goal.habitId){await Promise.all(Object.values(state.habitLogs).filter(log=>log.habitId===goal.habitId).map(log=>deleteDoc(doc(db,"users",state.user.uid,"habitLogs",log.id))));await deleteDoc(doc(db,"users",state.user.uid,"habits",goal.habitId))}
  await saveGoals((state.goalProfile.challenges||[]).filter(item=>item.id!==id));toggleGoalModal(false);
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
  [el.userPhoto,el.sheetPhoto].forEach(i=>{i.src=photo;i.alt=`${name} 프로필`});
  el.userName.textContent=name;el.userEmail.textContent=email;el.sheetName.textContent=name;el.sheetEmail.textContent=email;
}
function progressStructuralSignature(record){
  if(!record)return "";
  const {progress,updatedAt,...structural}=record;
  return JSON.stringify(structural);
}
function collectionChangedOnlyProgress(previous,next){
  if(!previous.length||previous.length!==next.length)return false;
  const previousById=new Map(previous.map(item=>[item.id,item]));
  return next.every(item=>{
    const before=previousById.get(item.id);
    return Boolean(before)
      &&progressStructuralSignature(before)===progressStructuralSignature(item);
  });
}
function syncSelectedEventProgressDom(){
  if(state.currentView!=="selected")return;
  const items=eventsForDate(state.selectedDateKey);
  const byOccurrence=new Map(items.map(item=>[
    `${item.id}_${item.occurrenceDate||item.date}`,
    item
  ]));

  el.selectedEvents.querySelectorAll(".event-progress-cycle").forEach(button=>{
    const item=byOccurrence.get(
      `${button.dataset.eventId}_${button.dataset.occurrenceDate}`
    );
    if(!item)return;
    const progress=Number(item.progress||0);
    button.dataset.progress=String(progress);
    button.textContent=`${progress}%`;
    button.style.setProperty("--event-progress",`${progress*3.6}deg`);
  });
  updateSelectedProgressMetrics(state.selectedDateKey);
}
function listen(user){
  if(state.unsubscribe)state.unsubscribe();
  if(state.unsubscribeEventLogs)state.unsubscribeEventLogs();

  const q=query(collection(db,"users",user.uid,"events"),orderBy("date"),orderBy("time"));
  state.unsubscribe=onSnapshot(
    q,
    snap=>{
      const previous=state.events;
      const next=snap.docs.map(d=>({id:d.id,...d.data()}));
      const progressOnly=collectionChangedOnlyProgress(previous,next);
      state.events=next;

      if(progressOnly){
        clearSnapshotRenderSkip("Event");
        syncSelectedEventProgressDom();
        if(state.activePage==="stats")renderStats();
        return;
      }

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
      const previous=Object.values(state.eventLogs);
      state.eventLogs={};
      snap.docs.forEach(d=>{state.eventLogs[d.id]={id:d.id,...d.data()}});
      const next=Object.values(state.eventLogs);

      if(collectionChangedOnlyProgress(previous,next)){
        clearSnapshotRenderSkip("Event");
        syncSelectedEventProgressDom();
        if(state.activePage==="stats")renderStats();
        return;
      }

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

  const weekAddButton=$("weekAddEventButton");
  if(weekAddButton){
    weekAddButton.hidden=
      state.currentView!=="week"
      ||window.matchMedia("(max-width:720px)").matches;
  }

  if(el.weekCategoryManagerButton){
    el.weekCategoryManagerButton.hidden=state.currentView!=="week";
  }

  const quickAddBar=document.querySelector(".quick-add-bar");
  if(quickAddBar){
    quickAddBar.hidden=state.currentView!=="selected";
  }

  const categoryBar=document.querySelector(".category-filter-bar");
  if(categoryBar){
    categoryBar.hidden=state.currentView!=="week";
  }

  el.selectedView.hidden=state.currentView!=="selected";
  el.weekView.hidden=state.currentView!=="week";
  el.weekZoomControls.hidden=state.currentView!=="week";

  el.selectedBtn.classList.toggle("active",state.currentView==="selected");
  el.weekBtn.classList.toggle("active",state.currentView==="week");
  el.selectedBtn.textContent=
    state.currentView==="selected"&&state.selectedDateKey===dateKey(new Date())
      ?"DAY"
      :state.currentView==="selected"
        ?"TODAY"
        :"DAY";

  renderPage();
  applyWeekZoom();
  renderCategoryControls();
  renderPeriodLabel();

  if(state.currentView==="week"){
    renderWeek();
  }

  renderSelected();
  renderTodos();
  renderSummary();

  if(state.activePage==="stats"){
    renderStats();
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

function fillDatePickerYears(selectedYear){
  const first=selectedYear-40;
  const last=selectedYear+40;
  el.datePickerYear.innerHTML="";
  for(let year=first;year<=last;year++){
    const option=document.createElement("option");
    option.value=String(year);
    option.textContent=`${year}년`;
    option.selected=year===selectedYear;
    el.datePickerYear.appendChild(option);
  }
}
function renderDatePicker(){
  const view=startOfMonth(state.datePickerMonth);
  const year=view.getFullYear();
  const month=view.getMonth();
  if(![...el.datePickerYear.options].some(option=>Number(option.value)===year)){
    fillDatePickerYears(year);
  }
  el.datePickerYear.value=String(year);
  el.datePickerMonth.value=String(month);
  el.datePickerGrid.innerHTML="";

  const mondayOffset=(view.getDay()+6)%7;
  const gridStart=addDays(view,-mondayOffset);
  const todayKey=dateKey(new Date());
  const selectedKey=
    state.currentView==="selected"
      ?state.selectedDateKey
      :dateKey(state.currentWeek);

  for(let index=0;index<42;index++){
    const date=addDays(gridStart,index);
    const key=dateKey(date);
    const button=document.createElement("button");
    button.type="button";
    button.className="date-picker-day";
    button.textContent=String(date.getDate());
    button.setAttribute("aria-label",`${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`);
    if(date.getMonth()!==month)button.classList.add("outside");
    if(key===todayKey)button.classList.add("today");
    if(key===selectedKey)button.classList.add("selected");
    if(date.getDay()===0)button.classList.add("sunday");
    if(date.getDay()===6)button.classList.add("saturday");
    button.onclick=()=>{
      state.selectedDateKey=key;
      state.currentWeek=startOfWeek(date);
      closeDatePickerModal();
      renderAll();
      if(state.currentView==="week"){
        requestAnimationFrame(()=>scrollGoogleWeekToCurrent(false));
      }
    };
    el.datePickerGrid.appendChild(button);
  }
}
function openDatePickerModal(){
  const reference=
    state.currentView==="selected"
      ?parseDateKey(state.selectedDateKey)
      :state.currentWeek;
  state.datePickerMonth=startOfMonth(reference);
  fillDatePickerYears(reference.getFullYear());
  renderDatePicker();
  el.datePickerModal.classList.add("show");
  el.datePickerModal.setAttribute("aria-hidden","false");
}
function closeDatePickerModal(){
  el.datePickerModal.classList.remove("show");
  el.datePickerModal.setAttribute("aria-hidden","true");
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
      skipSnapshotRenders("Event",2);

      await updateDoc(
        doc(db,"users",state.user.uid,"events",event.id),
        {
          date:newDate,
          endDate:newDate,
          time:movedTime,
          endTime:movedEndTime,
          updatedAt:serverTimestamp()
        }
      );

      const localIndex=state.events.findIndex(item=>item.id===event.id);
      if(localIndex>=0){
        state.events[localIndex]={
          ...state.events[localIndex],
          date:newDate,
          endDate:newDate,
          time:movedTime,
          endTime:movedEndTime
        };
      }

      // 주간 캘린더만 다시 그려 화면 깜박임을 줄입니다.
      if(state.currentView==="week"){
        renderWeek();
      }

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

    haptic([16,24,16]);
  }catch(error){
    state.pendingWeekScroll=null;
    console.error(error);
    alert("일정을 이동하지 못했습니다.");
  }
}

function setupMobileWeekSwipe(){
  let sx=0,sy=0,tracking=false;
  el.weekView.addEventListener("touchstart",e=>{
    if(!window.matchMedia("(max-width:720px)").matches)return;
    const t=e.touches?.[0]; if(!t)return;
    tracking=true; sx=t.clientX; sy=t.clientY;
  },{passive:true,capture:true});
  el.weekView.addEventListener("touchend",e=>{
    if(!tracking||!window.matchMedia("(max-width:720px)").matches)return;
    tracking=false; const t=e.changedTouches?.[0]; if(!t)return;
    const dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)<70||Math.abs(dx)<=Math.abs(dy)*1.25)return;
    state.currentWeek=addDays(
      state.currentWeek,
      (dx<0?1:-1)*visibleDaysForZoom()
    );
    state.weekInitialScrollDone=false; renderPeriodLabel(); renderWeek(); haptic(10);
  },{passive:true,capture:true});
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
  if(event.important)chip.classList.add("is-important");
  chip.style.background=COLORS[event.progress]||COLORS[0];
  chip.style.setProperty("--event-category-color",categoryColor(eventCategory(event)));
  chip.innerHTML=`<span class="event-time">${escapeHtml(event.time)}</span><span class="event-title">${importanceMark(event.important)}${escapeHtml(event.title)}</span>${event.repeat&&event.repeat!=="none"?`<span class="repeat-badge">↻</span>`:""}`;
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

  if(window.matchMedia("(max-width:720px)").matches){
    el.statsMonthGrid.style.setProperty("min-height","0","important");
    el.statsMonthGrid.style.setProperty("height","auto","important");
    el.statsMonthGrid.style.removeProperty("grid-auto-rows");
  }else{
    el.statsMonthGrid.style.removeProperty("grid-auto-rows");
    el.statsMonthGrid.style.removeProperty("height");
  }

  for(let i=0;i<42;i++){
    const d=addDays(start,i);
    const key=dateKey(d);
    const cell=document.createElement("article");
    const combined=combinedProgressForDate(key);

    cell.className="day-cell";
    cell.dataset.date=key;

    if(window.matchMedia("(max-width:720px)").matches){
      cell.style.removeProperty("height");
      cell.style.removeProperty("min-height");
      cell.style.removeProperty("max-height");
      cell.style.setProperty("padding","4px","important");
      cell.style.setProperty("overflow","hidden","important");
    }
    if(d.getMonth()!==m)cell.classList.add("outside");
    if(key===today)cell.classList.add("today");
    if(key===state.statsInsightDate)cell.classList.add("selected");

    const top=document.createElement("div");
    top.className="day-topline";
    top.innerHTML=`<span class="day-number ${d.getDay()===0?"sunday":d.getDay()===6?"saturday":""}">${d.getDate()}</span>`;

    const progress=document.createElement("div");
    progress.className="month-day-insight";
    progress.innerHTML=`
      <div class="month-day-area-fill" style="height:${combined}%"></div>
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

  const dayTodoStats=todoCompletionForKeys([key]);
  const todoRate=dayTodoStats.progress;

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
      <div><span>할 일</span><strong>${todoRate}%</strong><small>${dayTodoStats.done}/${dayTodoStats.total} 완료</small></div>
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
const WEEK_VIEW_OPTIONS=[14,10,7,3,1];
function visibleDaysForZoom(){
  return WEEK_VIEW_OPTIONS.includes(state.weekVisibleDays)
    ?state.weekVisibleDays
    :7;
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

  const zoom=visibleDays<=3?125:visibleDays<=7?100:visibleDays<=10?75:55;
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

  el.weekZoomValue.textContent=`${visibleDays}일`;
  const index=WEEK_VIEW_OPTIONS.indexOf(visibleDays);
  el.weekZoomOut.disabled=index===0;
  el.weekZoomIn.disabled=index===WEEK_VIEW_OPTIONS.length-1;
}
function changeWeekZoom(amount){
  const index=WEEK_VIEW_OPTIONS.indexOf(visibleDaysForZoom());
  const direction=amount>0?1:-1;
  state.weekVisibleDays=WEEK_VIEW_OPTIONS[
    Math.max(0,Math.min(WEEK_VIEW_OPTIONS.length-1,index+direction))
  ];
  state.weekFit=false;

  applyWeekZoom();
  renderPeriodLabel();
  renderWeek();
}
function resetWeekToFit(){
  state.weekFit=false;
  state.weekVisibleDays=7;
  state.weekZoom=100;
  applyWeekZoom();
  renderPeriodLabel();
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
      if(event.important)block.classList.add("is-important");
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
        <strong class="event-title-trigger">${importanceMark(event.important)}${escapeHtml(event.title)}</strong>
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

    state.currentWeek=addDays(
      state.currentWeek,
      (dx<0?1:-1)*visibleDaysForZoom()
    );
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

async function setEventProgressFromCard(event,value,button=null){
  if(!state.user)return;

  const numericValue=Number(value);
  const updateButton=()=>{
    if(!button)return;
    button.dataset.progress=String(numericValue);
    button.textContent=`${numericValue}%`;
    button.style.setProperty("--event-progress",`${numericValue*3.6}deg`);
    button.setAttribute("aria-label",`${event.title} 완료율 ${numericValue}%, 눌러서 변경`);
  };

  try{
    if((event.repeat||"none")==="none"){
      skipSnapshotRenders("Event",2);

      const localIndex=state.events.findIndex(item=>item.id===event.id);
      if(localIndex>=0){
        state.events[localIndex]={
          ...state.events[localIndex],
          progress:numericValue
        };
      }

      updateButton();
      updateSelectedProgressMetrics(event.occurrenceDate||event.date);

      await updateDoc(
        doc(db,"users",state.user.uid,"events",event.id),
        {progress:numericValue,updatedAt:serverTimestamp()}
      );
    }else{
      const occurrenceDate=event.occurrenceDate||event.date;
      const key=eventLogKey(event.id,occurrenceDate);

      skipSnapshotRenders("Event",2);
      state.eventLogs[key]={
        ...(state.eventLogs[key]||{}),
        id:key,
        eventId:event.id,
        date:occurrenceDate,
        progress:numericValue
      };

      updateButton();
      updateSelectedProgressMetrics(occurrenceDate);

      await setDoc(
        doc(db,"users",state.user.uid,"eventLogs",key),
        {
          eventId:event.id,
          date:occurrenceDate,
          progress:numericValue,
          updatedAt:serverTimestamp()
        },
        {merge:true}
      );
    }
  }catch(error){
    state.skipEventSnapshotRenders=Math.max(0,state.skipEventSnapshotRenders-1);
    console.error(error);
    renderSelected();
    alert("완료율을 저장하지 못했습니다.");
  }
}



function todoStatusIcon(status){
  if(status==="done")return "✓";
  if(status==="cancelled"||status==="rolled")return "×";
  return "□";
}
function nextTodoStatus(status){
  if(status==="pending"||status==="rolled")return "done";
  if(status==="done")return "cancelled";
  return "pending";
}
function todoLogKey(todoId,key){
  return `${todoId}_${String(key).replaceAll("-","")}`;
}
function todoOccursOn(todo,key){
  if(!todo?.date||key<todo.date)return false;

  const repeat=todo.repeat||"none";
  if(repeat==="none")return key===todo.date;

  const start=parseDateKey(todo.date);
  const date=parseDateKey(key);
  if(date<start)return false;

  if(repeat==="daily")return true;
  if(repeat==="weekdays")return date.getDay()>=1&&date.getDay()<=5;
  if(repeat==="weekends")return date.getDay()===0||date.getDay()===6;

  const diff=Math.floor((date-start)/86400000);
  if(repeat==="weekly")return diff>=0&&diff%7===0;
  if(repeat==="monthly"){
    return date.getDate()===start.getDate();
  }
  return false;
}
function todoOccurrence(todo,key){
  if(!todoOccursOn(todo,key))return null;

  if((todo.repeat||"none")==="none"){
    return {
      ...todo,
      occurrenceDate:key,
      sourceTodoId:todo.sourceTodoId||todo.id,
      status:todo.status||"pending"
    };
  }

  const log=state.todoLogs[todoLogKey(todo.id,key)];
  return {
    ...todo,
    occurrenceDate:key,
    sourceTodoId:todo.id,
    status:log?.status||"pending",
    rolledTo:log?.rolledTo||"",
    occurrenceLogId:log?.id||""
  };
}
function todosForDate(key){
  return state.todos
    .map(todo=>todoOccurrence(todo,key))
    .filter(Boolean)
    .sort((a,b)=>{
      const ac=a.createdAt?.seconds||0;
      const bc=b.createdAt?.seconds||0;
      return ac-bc;
    });
}
function todoCompletionForKeys(keys){
  const items=keys.flatMap(key=>todosForDate(key));
  const done=items.filter(todo=>todo.status==="done");
  return {
    total:items.length,
    done:done.length,
    cancelled:items.filter(todo=>todo.status==="cancelled"||todo.status==="rolled").length,
    progress:items.length?Math.round(done.length/items.length*100):0
  };
}
function renderTodoChecklistEditor(){
  if(!el.todoChecklistItems)return;
  el.todoChecklistItems.innerHTML="";

  state.editingTodoChecklist.forEach((item,index)=>{
    const row=document.createElement("div");
    row.className="checklist-editor-row";

    const input=document.createElement("input");
    input.type="text";
    input.maxLength=120;
    input.value=item.text||"";
    input.placeholder="체크리스트 항목";
    input.oninput=()=>{state.editingTodoChecklist[index].text=input.value};

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="checklist-remove-button";
    remove.textContent="×";
    remove.onclick=()=>{
      state.editingTodoChecklist.splice(index,1);
      renderTodoChecklistEditor();
    };

    row.append(input,remove);
    el.todoChecklistItems.appendChild(row);
  });
}
function addTodoChecklistItem(){
  state.editingTodoChecklist.push({
    id:crypto.randomUUID(),
    text:"",
    status:"pending"
  });
  renderTodoChecklistEditor();
}
function normalizedTodoChecklist(){
  return state.editingTodoChecklist
    .map(item=>({
      id:item.id||crypto.randomUUID(),
      text:String(item.text||"").trim(),
      status:item.status||"pending"
    }))
    .filter(item=>item.text);
}

function setImportance(kind,value){
  const important=Boolean(value);
  if(kind==="event"){
    state.eventImportant=important;
    if(el.eventImportantButton){
      el.eventImportantButton.textContent=important?"★":"☆";
      el.eventImportantButton.classList.toggle("active",important);
      el.eventImportantButton.setAttribute("aria-pressed",String(important));
    }
  }else{
    state.todoImportant=important;
    if(el.todoImportantButton){
      el.todoImportantButton.textContent=important?"★":"☆";
      el.todoImportantButton.classList.toggle("active",important);
      el.todoImportantButton.setAttribute("aria-pressed",String(important));
    }
  }
}
function importanceMark(important){
  return important?'<span class="important-star" aria-label="중요">★</span> ':"";
}
function resetTodoForm(date=state.selectedDateKey){
  el.todoForm.reset();
  el.todoEditId.value="";
  el.todoOccurrenceDate.value="";
  el.todoDate.value=date||dateKey(new Date());
  el.todoRepeat.value="none";
  el.todoMemo.value="";
  setImportance("todo",false);
  state.editingTodoChecklist=[];
  el.todoFormError.textContent="";
  renderTodoChecklistEditor();
}
function showTodoModal(){
  const active=document.activeElement;
  if(active instanceof HTMLElement)active.blur();

  el.todoModal.classList.add("show");
  document.body.style.overflow="hidden";
  pushModalHistory("todo");
}
function closeTodoModal(){
  el.todoModal.classList.remove("show");
  document.body.style.overflow=state.dayViewOpen?"hidden":"";
  clearModalHistory("todo");
}
function closeTodoModalFromHistory(){
  el.todoModal.classList.remove("show");
  document.body.style.overflow=state.dayViewOpen?"hidden":"";
  state.modalHistoryType=null;
}
function openTodoCreate(date=state.selectedDateKey){
  resetTodoForm(date);
  el.todoModalEyebrow.textContent="NEW TO DO";
  el.todoModalTitle.textContent="할 일 추가";
  if(el.todoModeSwitch)el.todoModeSwitch.hidden=false;
  el.deleteTodoButton.hidden=true;
  showTodoModal();
}
function openTodoEdit(todo){
  if(!todo)return;
  resetTodoForm(todo.occurrenceDate||todo.date);

  el.todoEditId.value=todo.id;
  el.todoOccurrenceDate.value=todo.occurrenceDate||todo.date;
  el.todoName.value=todo.text||"";
  el.todoDate.value=todo.date;
  el.todoRepeat.value=todo.repeat||"none";
  el.todoMemo.value=todo.memo||"";
  setImportance("todo",Boolean(todo.important));
  state.editingTodoChecklist=normalizeChecklist(todo.checklist).map(item=>({...item}));
  renderTodoChecklistEditor();

  el.todoModalEyebrow.textContent="EDIT TO DO";
  el.todoModalTitle.textContent=(todo.repeat||"none")!=="none"?"반복 할 일 수정":"할 일 수정";
  if(el.todoModeSwitch)el.todoModeSwitch.hidden=true;
  el.deleteTodoButton.hidden=false;
  showTodoModal();
}
async function submitTodoForm(event){
  event.preventDefault();
  if(!state.user)return;

  const text=el.todoName.value.trim();
  const date=el.todoDate.value;
  const repeat=el.todoRepeat.value||"none";
  const memo=el.todoMemo.value.trim();
  const important=Boolean(state.todoImportant);
  const checklist=normalizedTodoChecklist();

  if(!text||!date){
    el.todoFormError.textContent="이름과 날짜를 입력하세요.";
    return;
  }

  const data={
    text,date,repeat,memo,checklist,important,
    status:"pending",
    rolledFrom:"",
    rolledTo:"",
    updatedAt:serverTimestamp()
  };

  try{
    if(el.todoEditId.value){
      const id=el.todoEditId.value;
      const source=state.todos.find(todo=>todo.id===id);
      if(!source)return;
      const occurrenceDate=el.todoOccurrenceDate.value||source.date;
      const existingOccurrence=todoOccurrence(source,occurrenceDate);
      const overdue=occurrenceDate<dateKey(new Date())&&!["done","cancelled","rolled"].includes(existingOccurrence?.status||source.status||"pending");
      await updateDoc(
        doc(db,"users",state.user.uid,"todos",id),
        {
          text,date,repeat,memo,checklist,important,
          ...((repeat||"none")==="none"&&overdue?{status:"rolled",rolledTo:dateKey(new Date())}:{}),
          updatedAt:serverTimestamp()
        }
      );
      if((repeat||"none")!=="none"&&overdue){
        await setDoc(doc(db,"users",state.user.uid,"todoLogs",todoLogKey(id,occurrenceDate)),{
          todoId:id,date:occurrenceDate,status:"rolled",rolledTo:dateKey(new Date()),updatedAt:serverTimestamp()
        },{merge:true});
      }
    }else{
      await addDoc(
        collection(db,"users",state.user.uid,"todos"),
        {...data,createdAt:serverTimestamp()}
      );
    }
    closeTodoModal();
  }catch(error){
    console.error(error);
    el.todoFormError.textContent="할 일을 저장하지 못했습니다.";
  }
}
async function deleteTodo(){
  if(!state.user||!el.todoEditId.value)return;
  if(!confirm("이 할 일을 삭제할까요?"))return;

  try{
    const todoId=el.todoEditId.value;
    await Promise.all([
      deleteDoc(doc(db,"users",state.user.uid,"todos",todoId)),
      ...Object.values(state.todoLogs).filter(log=>log.todoId===todoId).map(log=>deleteDoc(doc(db,"users",state.user.uid,"todoLogs",log.id)))
    ]);
    closeTodoModal();
  }catch(error){
    console.error(error);
    el.todoFormError.textContent="할 일을 삭제하지 못했습니다.";
  }
}
function renderTodoRow(todo,{compact=false,onBlank=null}={}){
  const row=document.createElement("div");
  row.className=`todo-row${compact?" compact":""} status-${todo.status||"pending"}`;
  if(todo.important)row.classList.add("is-important");
  row.dataset.todoId=todo.id;

  const btn=document.createElement("button");
  btn.type="button";
  btn.className="todo-checkbox";
  btn.textContent=todoStatusIcon(todo.status||"pending");
  btn.setAttribute("aria-label",`${todo.text} 상태 변경`);

  const text=document.createElement("button");
  text.type="button";
  text.className="todo-name-button";
  if(todo.important){
    const star=document.createElement("span");
    star.className="important-star";
    star.textContent="★";
    text.append(star,document.createTextNode(` ${todo.text}`));
  }else{
    text.textContent=todo.text;
  }
  text.onclick=event=>{
    event.preventDefault();
    event.stopPropagation();
    openTodoEdit(todo);
  };

  const meta=document.createElement("small");
  meta.className="todo-meta";
  if((todo.repeat||"none")!=="none")meta.textContent="↻";

  btn.onclick=event=>{
    event.preventDefault();
    event.stopPropagation();

    const row=btn.closest(".todo-row");
    const current=row?.classList.contains("status-done")
      ?"done"
      :row?.classList.contains("status-cancelled")
        ?"cancelled"
        :row?.classList.contains("status-rolled")
          ?"rolled"
          :"pending";
    const next=nextTodoStatus(current);

    setTodoStatus(todo,next);
  };

  row.append(btn,text,meta);
  return row;
}
function updateTodoStatusDom(todo,status){
  document.querySelectorAll(
    `.todo-row[data-todo-id="${CSS.escape(todo.id)}"]`
  ).forEach(row=>{
    row.classList.remove("status-pending","status-done","status-cancelled","status-rolled");
    row.classList.add(`status-${status}`);
    const button=row.querySelector(".todo-checkbox");
    if(button){
      button.textContent=todoStatusIcon(status);
      button.setAttribute("aria-label",`${todo.text} 상태 ${status}, 눌러서 변경`);
    }
  });
}
function renderTodos(){
  if(!el.todoList)return;
  const key=state.selectedDateKey;
  const d=parseDateKey(key);
  const items=todosForDate(key);

  if(el.todoSelectedDateLabel){
    el.todoSelectedDateLabel.textContent=`${d.getMonth()+1}월 ${d.getDate()}일 (${["일","월","화","수","목","금","토"][d.getDay()]}) 할 일`;
  }

  el.todoList.innerHTML="";
  if(el.todoDayCount)el.todoDayCount.textContent=`${items.length}개`;

  if(!items.length){
    const empty=document.createElement("button");
    empty.type="button";
    empty.className="todo-empty todo-empty-button";
    empty.textContent="등록된 할 일이 없습니다. 눌러서 추가";
    empty.onclick=()=>openTodoCreate(key);
    el.todoList.appendChild(empty);
    return;
  }

  items.forEach(todo=>el.todoList.appendChild(renderTodoRow(todo)));
}
async function addTodo(){
  const text=el.todoInput?.value.trim()||"";
  if(!state.user||!text)return;
  try{
    await addDoc(
      collection(db,"users",state.user.uid,"todos"),
      {
        text,
        date:state.selectedDateKey,
        repeat:"none",
        memo:"",
        checklist:[],
        important:false,
        status:"pending",
        rolledFrom:"",
        rolledTo:"",
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      }
    );
    el.todoInput.value="";
  }catch(error){
    console.error(error);
    alert("할 일을 추가하지 못했습니다.");
  }
}

async function removeTodoRolloverDescendants(todo){
  if(!state.user||!todo)return;

  const rootId=todo.id;
  const rootSource=todo.sourceTodoId||todo.id;
  const rootOccurrence=todo.occurrenceDate||todo.sourceOccurrenceDate||todo.date;

  const toDelete=[];
  const queue=[rootId];

  while(queue.length){
    const parentId=queue.shift();
    state.todos.forEach(item=>{
      if(
        item.rolledFrom===parentId
        ||(
          item.sourceTodoId===rootSource
          &&item.sourceOccurrenceDate===rootOccurrence
          &&item.id!==rootId
        )
      ){
        if(!toDelete.some(existing=>existing.id===item.id)){
          toDelete.push(item);
          queue.push(item.id);
        }
      }
    });
  }

  for(const item of toDelete){
    await deleteDoc(
      doc(db,"users",state.user.uid,"todos",item.id)
    );
  }
}
async function setTodoStatus(todo,status){
  if(!state.user||!todo)return;

  const previousStatus=todo.status||"pending";
  const wasRolled=previousStatus==="rolled";
  const occurrenceDate=todo.occurrenceDate||todo.date;
  skipSnapshotRenders("Todo",2);

  // 같은 버튼을 연속해서 눌러도 다음 순환 상태를 읽을 수 있도록
  // 화면에 전달된 발생 객체도 즉시 현재 상태로 맞춥니다.
  todo.status=status;

  try{
    if((todo.repeat||"none")!=="none"){
      const id=todoLogKey(todo.id,occurrenceDate);

      // 모바일에서도 누른 즉시 상태가 바뀌어 보이도록 먼저 로컬 반영.
      state.todoLogs[id]={
        ...(state.todoLogs[id]||{}),
        id,
        todoId:todo.id,
        date:occurrenceDate,
        status,
        rolledTo:""
      };
      updateTodoStatusDom(todo,status);
      updateSelectedProgressMetrics(occurrenceDate);
      if(el.todoOverviewModal?.classList.contains("show")){
        renderTodoOverview();
      }

      // 원 날짜의 상태를 먼저 저장한다.
      await setDoc(
        doc(db,"users",state.user.uid,"todoLogs",id),
        {
          todoId:todo.id,
          date:occurrenceDate,
          status,
          rolledTo:"",
          updatedAt:serverTimestamp()
        },
        {merge:true}
      );
    }else{
      const index=state.todos.findIndex(item=>item.id===todo.id);

      // 모바일에서도 누른 즉시 체크 상태가 보이도록 로컬 반영.
      if(index>=0){
        state.todos[index]={
          ...state.todos[index],
          status,
          rolledTo:""
        };
      }
      updateTodoStatusDom(todo,status);
      updateSelectedProgressMetrics(occurrenceDate);
      if(el.todoOverviewModal?.classList.contains("show")){
        renderTodoOverview();
      }

      // 이월본을 지우기 전에 원 날짜 상태부터 저장해
      // 이월 처리 로직과 경합하지 않게 한다.
      await updateDoc(
        doc(db,"users",state.user.uid,"todos",todo.id),
        {
          status,
          rolledTo:"",
          updatedAt:serverTimestamp()
        }
      );
    }

    // 과거 미완료 때문에 생성된 이후 이월본은
    // 원 날짜 상태 저장이 끝난 다음 제거한다.
    if((wasRolled&&status!=="rolled")||status==="done"){
      await removeTodoRolloverDescendants(todo);
    }

    if(el.todoOverviewModal?.classList.contains("show")){
      renderTodoOverview();
    }
    if(state.activePage==="stats")renderStats();
  }catch(error){
    console.error(error);
    todo.status=previousStatus;
    updateTodoStatusDom(todo,previousStatus);
    alert("할 일 상태를 저장하지 못했습니다.");
  }
}
function recurringTodoExistsOnSource(sourceTodoId,key){
  const source=state.todos.find(todo=>todo.id===sourceTodoId);
  return Boolean(source&&(source.repeat||"none")!=="none"&&todoOccursOn(source,key));
}
async function markTodoOccurrenceRolled(todo,key,nextKey){
  if((todo.repeat||"none")!=="none"){
    const id=todoLogKey(todo.id,key);
    await setDoc(
      doc(db,"users",state.user.uid,"todoLogs",id),
      {
        todoId:todo.id,
        date:key,
        status:"rolled",
        rolledTo:nextKey,
        updatedAt:serverTimestamp()
      },
      {merge:true}
    );
  }else{
    await updateDoc(
      doc(db,"users",state.user.uid,"todos",todo.id),
      {
        status:"rolled",
        rolledTo:nextKey,
        updatedAt:serverTimestamp()
      }
    );
  }
}
async function createRolledTodo(todo,nextKey,key){
  const sourceId=todo.sourceTodoId||todo.id;
  const stableId=rolledTodoDocumentId(sourceId,nextKey);
  return setDoc(
    doc(db,"users",state.user.uid,"todos",stableId),
    {
      text:todo.text,
      date:nextKey,
      repeat:"none",
      memo:todo.memo||"",
      checklist:normalizeChecklist(todo.checklist),
      important:Boolean(todo.important),
      status:"pending",
      rolledFrom:todo.id,
      sourceTodoId:sourceId,
      sourceOccurrenceDate:key,
      rolledTo:"",
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },
    {merge:true}
  );
}
function rolledTodoDocumentId(sourceId,key){
  return `rolled_${String(sourceId).replaceAll("/","_")}_${String(key).replaceAll("-","")}`;
}
async function cleanupDuplicateRolledTodos(){
  if(!state.user||state.todoDedupeRunning)return;
  state.todoDedupeRunning=true;
  try{
    const groups=new Map();
    state.todos.filter(item=>item.sourceTodoId&&item.rolledFrom).forEach(item=>{
      const groupKey=`${item.sourceTodoId}:${item.date}`;
      if(!groups.has(groupKey))groups.set(groupKey,[]);
      groups.get(groupKey).push(item);
    });
    const duplicates=[];
    groups.forEach(items=>{
      if(items.length<2)return;
      const expected=rolledTodoDocumentId(items[0].sourceTodoId,items[0].date);
      const keep=items.find(item=>item.id===expected)||items.slice().sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0))[0];
      items.filter(item=>item.id!==keep.id).forEach(item=>duplicates.push(item));
    });
    await Promise.all(duplicates.map(item=>deleteDoc(doc(db,"users",state.user.uid,"todos",item.id))));
  }catch(error){console.error("중복 이월 할 일을 정리하지 못했습니다.",error)}finally{state.todoDedupeRunning=false}
}
async function rollPendingTodosToToday(){
  if(!state.user||state.todoRolloverRunning)return;
  state.todoRolloverRunning=true;

  const today=dateKey(new Date());

  try{
    // 최대 370일 범위에서 순차 처리. 개인 플래너 사용 범위에는 충분하고,
    // 오래된 데이터가 있어도 한 번에 과도한 쓰기가 발생하지 않게 합니다.
    const oldest=state.todos
      .map(todo=>todo.date)
      .filter(Boolean)
      .sort()[0]||today;

    let cursor=parseDateKey(oldest);
    const minDate=addDays(parseDateKey(today),-370);
    if(cursor<minDate)cursor=minDate;

    for(;dateKey(cursor)<today;cursor=addDays(cursor,1)){
      const key=dateKey(cursor);
      const nextKey=dateKey(addDays(cursor,1));
      const occurrences=todosForDate(key)
        .filter(todo=>todo.status==="pending");

      for(const todo of occurrences){
        const sourceId=todo.sourceTodoId||todo.id;

        // 다음 날 반복 규칙으로 같은 원본 할 일이 자연스럽게 존재하면
        // 원 날짜만 취소선(이월 처리)으로 남기고 중복 이월본을 만들지 않습니다.
        const sameExistsTomorrow=recurringTodoExistsOnSource(sourceId,nextKey);

        await markTodoOccurrenceRolled(todo,key,nextKey);

        if(sameExistsTomorrow)continue;

        const duplicate=state.todos.some(item=>
          item.date===nextKey
          &&item.status!=="rolled"
          &&(
            item.sourceTodoId===sourceId
            ||item.rolledFrom===todo.id
          )
        );
        if(!duplicate){
          await createRolledTodo(todo,nextKey,key);
        }
      }
    }
  }catch(error){
    console.error("할 일 이월 실패",error);
  }finally{
    state.todoRolloverRunning=false;
  }
}
function listenTodos(user){
  if(state.unsubscribeTodos)state.unsubscribeTodos();
  if(state.unsubscribeTodoLogs)state.unsubscribeTodoLogs();

  state.unsubscribeTodos=onSnapshot(
    collection(db,"users",user.uid,"todos"),
    snap=>{
      state.todos=snap.docs.map(d=>({id:d.id,...d.data()}));
      if(state.skipTodoSnapshotRenders>0){
        state.skipTodoSnapshotRenders--;
        updateSelectedProgressMetrics(state.selectedDateKey);
        if(state.activePage==="stats")renderStats();
        return;
      }
      renderTodos();
      if(el.todoOverviewModal?.classList.contains("show"))renderTodoOverview();
      if(state.activePage==="stats")renderStats();
      cleanupDuplicateRolledTodos().then(()=>rollPendingTodosToToday());
    },
    error=>{
      console.error(error);
      alert("할 일을 불러오지 못했습니다.");
    }
  );

  state.unsubscribeTodoLogs=onSnapshot(
    collection(db,"users",user.uid,"todoLogs"),
    snap=>{
      state.todoLogs={};
      snap.docs.forEach(d=>{
        state.todoLogs[d.id]={id:d.id,...d.data()};
      });
      if(state.skipTodoSnapshotRenders>0){
        state.skipTodoSnapshotRenders--;
        updateSelectedProgressMetrics(state.selectedDateKey);
        if(state.activePage==="stats")renderStats();
        return;
      }
      renderTodos();
      if(el.todoOverviewModal?.classList.contains("show"))renderTodoOverview();
      if(state.activePage==="stats")renderStats();
    },
    error=>{
      console.error(error);
      alert("반복 할 일 기록을 불러오지 못했습니다.");
    }
  );
}


function todoDayCompletion(key){
  const items=todosForDate(key);
  const done=items.filter(item=>item.status==="done").length;
  return {
    items,
    done,
    total:items.length,
    progress:items.length?Math.round(done/items.length*100):0
  };
}
function showTodoOverview(){
  state.todoOverviewMonth=startOfMonth(
    parseDateKey(state.selectedDateKey||dateKey(new Date()))
  );
  renderTodoOverview();
  el.todoOverviewModal.classList.add("show");
  document.body.style.overflow="hidden";
  pushModalHistory("todoOverview");
}
function closeTodoOverview(){
  el.todoOverviewModal.classList.remove("show");
  document.body.style.overflow="";
  clearModalHistory("todoOverview");
}
function closeTodoOverviewFromHistory(){
  el.todoOverviewModal.classList.remove("show");
  document.body.style.overflow="";
  state.modalHistoryType=null;
}
function renderTodoOverview(){
  if(!el.todoOverviewList)return;

  const month=state.todoOverviewMonth;
  const y=month.getFullYear();
  const m=month.getMonth();
  const last=new Date(y,m+1,0);

  el.todoOverviewMonthLabel.textContent=`${y}년 ${m+1}월`;
  el.todoOverviewList.innerHTML="";

  let shown=0;

  for(let day=1;day<=last.getDate();day++){
    const date=new Date(y,m,day);
    const key=dateKey(date);
    const result=todoDayCompletion(key);

    if(!result.total)continue;
    shown+=1;

    const group=document.createElement("section");
    group.className="todo-overview-day";

    const head=document.createElement("div");
    head.className="todo-overview-day-head";
    head.innerHTML=`
      <div>
        <strong>${m+1}월 ${day}일</strong>
        <span>${["일","월","화","수","목","금","토"][date.getDay()]}요일</span>
      </div>
      <div class="todo-overview-score">
        <strong>${result.progress}%</strong>
        <span>${result.done}/${result.total}</span>
      </div>
    `;

    const progress=document.createElement("div");
    progress.className="todo-overview-progress";
    progress.innerHTML=`<i style="width:${result.progress}%"></i>`;

    const list=document.createElement("div");
    list.className="todo-overview-day-list";
    result.items.forEach(todo=>{
      list.appendChild(renderTodoRow(todo,{compact:true}));
    });

    const add=document.createElement("button");
    add.type="button";
    add.className="todo-overview-add";
    add.textContent="+ 이 날짜에 할 일 추가";
    add.onclick=()=>openTodoCreate(key);

    group.append(head,progress,list,add);
    el.todoOverviewList.appendChild(group);
  }

  if(!shown){
    const empty=document.createElement("div");
    empty.className="todo-overview-empty";
    empty.textContent="이 달에는 등록된 할 일이 없습니다.";
    el.todoOverviewList.appendChild(empty);
  }
}
function renderSelected(){
  const key=state.selectedDateKey;
  const d=parseDateKey(key),items=eventsForDate(key),avg=average(items),isToday=key===dateKey(new Date());
  const selectedViewEyebrow=$("selectedViewEyebrow");
  const selectedProgressEyebrow=$("selectedProgressEyebrow");
  const selectedProgressTitle=$("selectedProgressTitle");
  if(selectedViewEyebrow)selectedViewEyebrow.textContent=isToday?"TODAY":"DAY";
  if(selectedProgressEyebrow)selectedProgressEyebrow.textContent=isToday?"TODAY PROGRESS":"DAY PROGRESS";
  if(selectedProgressTitle)selectedProgressTitle.textContent=isToday?"오늘 완료율":"이날 완료율";
  el.selectedTitle.textContent=isToday?"오늘 일정":"선택한 날 일정";el.selectedLabel.textContent=`${d.getMonth()+1}월 ${d.getDate()}일 ${["일","월","화","수","목","금","토"][d.getDay()]}요일`;el.selectedEvents.innerHTML="";
  if(!items.length){el.selectedEvents.innerHTML='<button class="empty-message secondary-button" id="emptyAdd" type="button">등록된 일정이 없습니다.<br>일정 추가하기</button>';$("emptyAdd").onclick=()=>openCreate(state.selectedDateKey)}
  else items.forEach(event=>{const item=document.createElement("article");item.className="selected-event";if(event.important)item.classList.add("is-important");{
      const main=document.createElement("div");
      main.className="selected-event-main";
      main.innerHTML=`<strong>${importanceMark(event.important)}${escapeHtml(event.title)} ${event.repeat&&event.repeat!=="none"?"↻":""}</strong>${event.memo?`<small>${escapeHtml(event.memo)}</small>`:""}`;

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
      const categoryMark=document.createElement("i");
      categoryMark.className="selected-event-category-mark";
      categoryMark.style.background=categoryColor(eventCategory(event));
      categoryMark.setAttribute("aria-label",categoryLabel(eventCategory(event)));
      item.appendChild(categoryMark);
      item.appendChild(main);

      const progress=document.createElement("button");
      progress.type="button";
      progress.className="event-progress-cycle";
      progress.textContent=`${event.progress}%`;
      progress.dataset.progress=String(Number(event.progress||0));
      progress.dataset.eventId=String(event.id);
      progress.dataset.occurrenceDate=String(event.occurrenceDate||event.date);
      progress.style.setProperty("--event-progress",`${Number(event.progress)*3.6}deg`);
      progress.setAttribute("aria-label",`${event.title} 완료율 ${event.progress}%, 눌러서 변경`);
      progress.addEventListener("click",clickEvent=>{
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        setEventProgressFromCard(
          event,
          nextHabitProgressValue(progress.dataset.progress),
          progress
        );
      });
      item.appendChild(progress);

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
  const insightHabits=activeHabitsOn(state.selectedDateKey);
  renderSelectedHabitPreview(key,insightHabits);
  updateSelectedProgressMetrics(key);
}
function updateSelectedProgressMetrics(key=state.selectedDateKey){
  if(key!==state.selectedDateKey)return;
  const d=parseDateKey(key);
  const items=eventsForDate(key);
  const insightHabits=activeHabitsOn(key);
  const avg=average(items);
  const habitAvg=habitAverageForDate(key);
  const selectedTodoStats=todoCompletionForKeys([key]);
  const todoRate=selectedTodoStats.progress;
  const combined=combinedProgressForDate(key);
  const isToday=key===dateKey(new Date());

  el.dayProgress.textContent=`${combined}%`;
  el.dayBar.style.width=`${combined}%`;
  el.dayCaption.textContent=
    items.length||selectedTodoStats.total||insightHabits.length
      ?`${d.getMonth()+1}월 ${d.getDate()}일의 일정 · 할 일 · 습관 성과`
      :"등록된 일정과 할 일, 습관이 없습니다.";
  if(el.selectedInsightEventProgress)el.selectedInsightEventProgress.textContent=`${avg}%`;
  if(el.selectedInsightHabitProgress)el.selectedInsightHabitProgress.textContent=`${habitAvg}%`;
  if(el.selectedInsightChecklist)el.selectedInsightChecklist.textContent=`${todoRate}%`;
  if(el.selectedInsightCombinedBar)el.selectedInsightCombinedBar.style.height=`${combined}%`;
  if(el.selectedInsightEventBar)el.selectedInsightEventBar.style.height=`${avg}%`;
  if(el.selectedInsightHabitBar)el.selectedInsightHabitBar.style.height=`${habitAvg}%`;
  if(el.selectedInsightChecklistBar)el.selectedInsightChecklistBar.style.height=`${todoRate}%`;
  if(el.selectedCompletionRing){
    el.selectedCompletionRing.style.setProperty("--completion",`${combined*3.6}deg`);
  }
  if(el.selectedCompletionValue)el.selectedCompletionValue.textContent=`${combined}%`;
  if(el.selectedCompletionDetail){
    el.selectedCompletionDetail.textContent=
      items.length||selectedTodoStats.total||insightHabits.length
        ?`일정 ${items.length} · 할 일 ${selectedTodoStats.total} · 습관 ${insightHabits.length}`
        :(isToday?"오늘의 기록을 시작해보세요.":"이날의 기록을 시작해보세요.");
  }
}
function renderSelectedHabitPreview(key,habits=activeHabitsOn(key)){
  if(!el.selectedHabitPreview)return;
  el.selectedHabitPreview.innerHTML="";

  if(!habits.length){
    el.selectedHabitPreview.innerHTML='<div class="selected-preview-empty">등록된 습관이 없습니다.</div>';
    return;
  }

  habits.slice(0,4).forEach(habit=>{
    const progress=habitProgress(habit.id,key);
    const row=document.createElement("button");
    row.type="button";
    row.className="selected-habit-row";
    row.dataset.habitId=habit.id;
    row.innerHTML=`
      <span class="selected-habit-name"><strong>${escapeHtml(habit.name)}</strong><small>${repeatLabel(habit.repeat||"daily")||"매일"}</small></span>
      <span class="selected-habit-progress" style="--habit-progress:${progress*3.6}deg">${progress}%</span>
    `;
    row.onclick=()=>{
      setHabitProgress(
        habit.id,
        key,
        nextHabitProgressValue(habitProgress(habit.id,key)),
        {optimistic:true}
      );
    };
    el.selectedHabitPreview.appendChild(row);
  });
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

function setProgress(v){state.selectedProgress=Number(v);document.querySelectorAll("#progressOptions button").forEach(b=>{const p=Number(b.dataset.value);b.classList.toggle("selected",p===state.selectedProgress);b.style.background=COLORS[p];b.style.color=p<=25?"#557066":"#fff"});if(el.progressSummary)el.progressSummary.textContent=`${state.selectedProgress}%`}

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
  if(el.checklistSummaryText)el.checklistSummaryText.textContent=`${state.editingChecklist.length}개`;
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

      skipSnapshotRenders("Event",2);

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
      skipSnapshotRenders("Event",2);

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
  state.editingOriginalEventData=null;
  el.form.reset();
  el.eventId.value="";
  el.eventOccurrenceDate.value="";
  fillTimeSelects();
  setTimeParts("09:00","10:00");
  el.endDate.value=dateKey(new Date());
  el.category.value=state.categories[0]?.id||"other";
  el.repeat.value="none";
  el.repeatEndDate.value="";
  el.repeatEndWrap.hidden=true;
  el.editScopeSection.hidden=true;
  el.memo.value="";
  if(el.memoDetails)el.memoDetails.open=false;
  if(el.checklistDetails)el.checklistDetails.open=false;
  if(el.progressDetails)el.progressDetails.open=false;
  if(el.editScopeSheet)el.editScopeSheet.hidden=true;
  setImportance("event",false);
  state.editingChecklist=[];
  el.formError.textContent="";
  setProgress(0);
  renderChecklistEditor();
  syncCompactEventForm();
}
function openCreate(key=state.selectedDateKey,time="09:00",endTime=defaultEndTime(time)){
  haptic(12);
  // 빈 시간칸을 누른 동일 입력 이벤트가 모달의 시작 시간칸까지
  // 전달되어 시간 선택창이 먼저 뜨는 것을 막습니다.
  state.suppressTimePickerUntil=performance.now()+260;
  state.suppressDatePickerUntil=performance.now()+260;
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
  el.repeatEndDate.value=event.repeatEndDate||"";
  el.repeatEndWrap.hidden=(event.repeat||"none")==="none";
  el.memo.value=event.memo||"";
  setImportance("event",Boolean(event.important));
  state.editingChecklist=
    checklistForOccurrence(event)
      .map(item=>({...item}));
  renderChecklistEditor();

  state.editingOriginalEventData=currentEventFormData();
  if(recurring){
    el.editScopeSection.hidden=false;
    el.editScope.value="range";
    el.editRangeStart.value=occurrenceStart;
    el.editRangeEnd.value=occurrenceStart;
    updateEditScopeControls();
  }

  el.modalEyebrow.textContent="EDIT EVENT";
  el.modalTitle.textContent=recurring
    ?"반복 일정 수정"
    :"일정 수정";
  el.remove.hidden=false;
  el.remove.textContent="삭제";

  const modeSwitch=el.modal.querySelector(".modal-mode-switch");
  if(modeSwitch)modeSwitch.hidden=true;

  setProgress(event.progress);
  syncCompactEventForm();
  showModal();
}


function renderCategoryManager(){
  el.categoryManagerList.innerHTML="";

  state.editingCategories.forEach((category,index)=>{
    const row=document.createElement("div");
    row.className="category-manager-row";

    const color=document.createElement("button");
    color.type="button";
    color.className="category-color-input";
    color.style.background=category.color;
    color.setAttribute("aria-label",`${category.name} 색상`);
    color.title=CATEGORY_COLORS.find(item=>item.value.toLowerCase()===String(category.color).toLowerCase())?.name||"카테고리 색상";

    const palette=document.createElement("div");
    palette.className="category-palette";
    palette.hidden=true;
    palette.innerHTML=CATEGORY_COLORS.map((item,colorIndex)=>`<button type="button" data-category-color="${item.value}" title="${colorIndex+1}. ${item.name}" aria-label="${colorIndex+1}. ${item.name}" class="${item.value.toLowerCase()===String(category.color).toLowerCase()?"active":""}" style="--category-swatch:${item.value}"><i></i><small>${colorIndex+1}</small></button>`).join("");
    color.onclick=()=>{palette.hidden=!palette.hidden};
    palette.onclick=event=>{
      const selected=event.target.closest("[data-category-color]");if(!selected)return;
      state.editingCategories[index].color=selected.dataset.categoryColor;
      renderCategoryManager();
    };

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

    row.append(color,name,remove,palette);
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
    color:CATEGORY_COLORS[9].value
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
function renderDayViewTodos(){
  // 하루 일정에서는 TO DO를 표시하지 않습니다.
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
        <strong class="event-title-trigger">${importanceMark(event.important)}${escapeHtml(event.title)}</strong>
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
    // 날짜는 실제 시간 휠의 끝단을 넘었을 때만 보정합니다.
    // 23시 -> 아래쪽 00시(index 24): 다음 날
    if(previous===23&&next===24){
      changeDate(1);
      return;
    }
    // 아래쪽 00시 -> 23시로 되돌림: 원래 날짜
    if(previous===24&&next===23){
      changeDate(-1);
      return;
    }
    // 위쪽 00시(index 0)에서 이전 날로 넘어가는 동작은
    // 현재 유한 휠 구조상 별도 index가 없어 자동 보정하지 않습니다.
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

  const close=()=>{
    backdrop.hidden=true;
    document.body.style.overflow="";
    active=null;
    clearTimeout(scrollTimer);
  };

  const open=target=>{
    active=target;

    const value=target.input.value||(
      target.type==="start"?"09:00":"10:00"
    );
    const [hourRaw,minuteRaw]=value.split(":").map(Number);
    const hour=Number.isFinite(hourRaw)?Math.max(0,Math.min(23,hourRaw)):9;
    const minute=Number.isFinite(minuteRaw)&&minuteRaw>=30?30:0;

    selectedIndex=hour;
    committedIndex=hour;
    initialHourIndex=hour;
    selectedMinute=minute;
    boundaryShift=0;

    baseDateAtOpen=target.dateInput.value||dateKey(new Date());
    temporaryDate=baseDateAtOpen;

    title.textContent=target.title;
    renderDatePreview();
    highlight();

    backdrop.hidden=false;
    document.body.style.overflow="hidden";

    requestAnimationFrame(()=>{
      setColumnPosition(hoursColumn,selectedIndex);
      setColumnPosition(minutesColumn,selectedMinute);
    });
  };

  const confirm=()=>{
    if(!active)return;

    const chosenHour=selectedIndex===24?0:selectedIndex;
    const chosenTime=`${pad(chosenHour)}:${pad(selectedMinute)}`;

    active.dateInput.value=temporaryDate||baseDateAtOpen;
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

  backdrop.querySelector("[data-wheel-cancel]")
    .addEventListener("click",close);
  backdrop.querySelector("[data-wheel-confirm]")
    .addEventListener("click",confirm);

  backdrop.addEventListener("click",event=>{
    if(event.target===backdrop)close();
  });

  targets.forEach(target=>{
    target.input.addEventListener("click",event=>{
      if(performance.now()<(state.suppressTimePickerUntil||0)){
        event.preventDefault();
        event.stopPropagation();
        return;
      }
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
  const inputs=[
    el.date,el.endDate,el.repeatEndDate,el.todoDate,
    el.editRangeStart,el.editRangeEnd
  ].filter(Boolean);
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
        <button type="button" data-picker-clear>선택 해제</button>
        <button type="button" data-picker-today>오늘</button>
        <button type="button" data-picker-close>닫기</button>
      </footer>
    </section>
  `;
  document.body.appendChild(backdrop);

  const title=backdrop.querySelector("[data-picker-title]");
  const grid=backdrop.querySelector(".monday-date-grid");
  const clearButton=backdrop.querySelector("[data-picker-clear]");

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
    clearButton.hidden=input!==el.repeatEndDate;
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
  clearButton.onclick=()=>{
    if(!activeInput)return;
    activeInput.value="";
    activeInput.dispatchEvent(new Event("change",{bubbles:true}));
    close();
  };
  backdrop.querySelector("[data-picker-close]").onclick=close;
  backdrop.addEventListener("click",event=>{
    if(event.target===backdrop)close();
  });

  inputs.forEach(input=>{
    input.readOnly=true;
    input.addEventListener("click",event=>{
      if(performance.now()<(state.suppressDatePickerUntil||0)){
        event.preventDefault();
        event.stopPropagation();
        return;
      }
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

function updateRepeatControls(){
  el.repeatEndWrap.hidden=(el.repeat.value||"none")==="none";
  syncCompactEventForm();
}
function updateEditScopeControls(){
  if(!el.editScope)return;
  const scope=el.editScope.value;
  el.editRangeFields.hidden=scope!=="range";
  syncCompactEventForm();
}
function syncCompactEventForm(){
  if(el.repeatChips){
    el.repeatChips.querySelectorAll("[data-repeat]").forEach(button=>{
      button.classList.toggle("active",button.dataset.repeat===(el.repeat.value||"none"));
    });
  }
  if(el.repeatNoEndButton&&el.repeatSetEndButton){
    const hasEnd=Boolean(el.repeatEndDate.value);
    el.repeatNoEndButton.classList.toggle("active",!hasEnd);
    el.repeatSetEndButton.classList.toggle("active",hasEnd);
    el.repeatEndDate.classList.toggle("has-value",hasEnd);
  }
  const scopeLabels={range:"기간 지정",single:"선택한 날짜만",future:"이 날짜부터",all:"전체 반복 일정"};
  if(el.editScopeSummary)el.editScopeSummary.textContent=scopeLabels[el.editScope?.value]||"기간 지정";
  if(el.memoSummary)el.memoSummary.textContent=el.memo.value.trim()?"작성됨":"추가";
  if(el.checklistSummaryText)el.checklistSummaryText.textContent=`${state.editingChecklist.length}개`;
}
function currentEventFormData(){
  return {
    title:el.title.value.trim(),
    category:el.category.value,
    date:el.date.value,
    endDate:el.endDate.value||el.date.value,
    time:el.time.value,
    endTime:el.endTime.value,
    repeat:el.repeat.value||"none",
    repeatEndDate:el.repeat.value==="none"?"":el.repeatEndDate.value,
    memo:el.memo.value.trim(),
    checklist:normalizeChecklist(state.editingChecklist),
    important:Boolean(state.eventImportant)
  };
}
function changedEventFields(current,original){
  const changes={};
  Object.keys(current).forEach(key=>{
    if(JSON.stringify(current[key])!==JSON.stringify(original?.[key])){
      changes[key]=current[key];
    }
  });
  return changes;
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

    setTimeout(()=>{
      state.suppressTimePickerUntil=0;
    },280);

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

async function saveFromRepeatOccurrenceEdit(pending){
  const {eventId,occurrenceDate,baseData,selectedProgress}=pending;
  const source=state.events.find(item=>item.id===eventId);
  if(!source)throw new Error("반복 일정 원본을 찾지 못했습니다.");

  const previousDate=dateKey(addDays(parseDateKey(occurrenceDate),-1));
  await updateDoc(
    doc(db,"users",state.user.uid,"events",eventId),
    {repeatEndDate:previousDate,updatedAt:serverTimestamp()}
  );

  const newStart=baseData.date||occurrenceDate;
  const spanDays=Math.max(0,Math.round(
    (parseDateKey(baseData.endDate)-parseDateKey(baseData.date))/86400000
  ));
  const created=await addDoc(
    collection(db,"users",state.user.uid,"events"),
    {
      ...baseData,
      date:newStart,
      endDate:dateKey(addDays(parseDateKey(newStart),spanDays)),
      progress:0,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }
  );

  if(selectedProgress>0){
    await setDoc(
      doc(db,"users",state.user.uid,"eventLogs",eventLogKey(created.id,newStart)),
      {eventId:created.id,date:newStart,progress:selectedProgress,updatedAt:serverTimestamp()}
    );
  }
}

async function finishEventSave(occurrenceDate){
  // 일정 수정 날짜와 SELECTED DAY의 선택 날짜를 서로 독립적으로 유지합니다.
  closeRepeatEditDialog();
  closeModal();

  requestAnimationFrame(()=>{
    renderAll();
  });
}

async function applyPendingRepeatEdit(scope){
  const pending=state.pendingRepeatEdit;
  if(!pending||!state.user)return;

  try{
    if(scope==="single"){
      await saveSingleRepeatOccurrenceEdit(pending);
    }else if(scope==="future"){
      await saveFromRepeatOccurrenceEdit(pending);
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

async function saveRecurringEventEdit({source,current,occurrenceDate,eventsRef}){
  const scope=el.editScope.value||"range";
  const original=state.editingOriginalEventData||{};
  const changes=changedEventFields(current,original);

  if(scope==="all"){
    if(!Object.keys(changes).length)return;
    if(
      Object.prototype.hasOwnProperty.call(changes,"date")
      ||Object.prototype.hasOwnProperty.call(changes,"endDate")
    ){
      const occurrenceStart=state.editingOccurrenceContext?.occurrenceStart
        ||occurrenceDate;
      const dayShift=Math.round(
        (parseDateKey(current.date)-parseDateKey(occurrenceStart))/86400000
      );
      const shiftedSeriesStart=dateKey(
        addDays(parseDateKey(source.date),dayShift)
      );
      const spanDays=Math.max(0,Math.round(
        (parseDateKey(current.endDate)-parseDateKey(current.date))/86400000
      ));
      changes.date=shiftedSeriesStart;
      changes.endDate=dateKey(addDays(parseDateKey(shiftedSeriesStart),spanDays));
    }
    await updateDoc(doc(eventsRef,source.id),{
      ...changes,
      updatedAt:serverTimestamp()
    });
    return;
  }

  let from=occurrenceDate;
  let to=occurrenceDate;
  if(scope==="range"){
    from=el.editRangeStart.value;
    to=el.editRangeEnd.value;
    if(!from||!to||to<from){
      throw new Error("수정 기간을 올바르게 선택하세요.");
    }
  }else if(scope==="future"){
    to="";
  }

  // 기간별 수정은 반복 규칙 자체를 자르지 않고, 실제로 바뀐 내용만
  // 해당 발생일에 덮어씁니다. 날짜 길이 변경은 상대 duration으로 저장합니다.
  const rangeChanges={...changes};
  const dateTimeChanged=["date","endDate","time","endTime"]
    .some(key=>Object.prototype.hasOwnProperty.call(rangeChanges,key));
  if(dateTimeChanged){
    rangeChanges.durationMsOverride=Math.max(
      30*60000,
      eventDateTime(current.endDate,current.endTime)
        -eventDateTime(current.date,current.time)
    );
  }
  delete rangeChanges.date;
  delete rangeChanges.endDate;
  delete rangeChanges.repeat;
  delete rangeChanges.repeatEndDate;

  if(!Object.keys(rangeChanges).length)return;

  const rangeOverrides=[
    ...(Array.isArray(source.rangeOverrides)?source.rangeOverrides:[]),
    {
      id:crypto.randomUUID(),
      from,
      to,
      changes:rangeChanges,
      createdAt:Date.now()
    }
  ];

  await updateDoc(doc(eventsRef,source.id),{
    rangeOverrides,
    updatedAt:serverTimestamp()
  });
}

async function saveRecurringOccurrenceProgress(eventId,occurrenceDate,progress){
  const logId=eventLogKey(eventId,occurrenceDate);
  const numericProgress=Number(progress||0);

  state.eventLogs[logId]={
    ...(state.eventLogs[logId]||{}),
    id:logId,
    eventId,
    date:occurrenceDate,
    progress:numericProgress
  };
  skipSnapshotRenders("Event",2);

  await setDoc(
    doc(db,"users",state.user.uid,"eventLogs",logId),
    {
      eventId,
      date:occurrenceDate,
      progress:numericProgress,
      updatedAt:serverTimestamp()
    },
    {merge:true}
  );
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
  const repeatEndDate=repeat==="none"?"":el.repeatEndDate.value;
  const memo=el.memo.value.trim();
  const important=Boolean(state.eventImportant);
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
  if(repeatEndDate&&repeatEndDate<date){
    el.formError.textContent="반복 종료일은 시작 날짜보다 빠를 수 없습니다.";
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
        repeatEndDate,
        memo,
        checklist,
        important,
        updatedAt:serverTimestamp()
      };

      if(repeat==="none"){
        baseData.progress=state.selectedProgress;
      }

      if(sourceIsRecurring){
        await saveRecurringEventEdit({
          source,
          current:currentEventFormData(),
          occurrenceDate,
          eventsRef
        });
        await saveRecurringOccurrenceProgress(
          source.id,
          occurrenceDate,
          state.selectedProgress
        );
        await finishEventSave(occurrenceDate);
        return;
      }

      const previousEventData=firestoreRecordData(source);

      // 수정 저장 직후 Firestore snapshot과 현재 저장 흐름이 동시에
      // 전체 화면을 다시 그리지 않도록 snapshot 렌더 1회를 건너뜁니다.
      skipSnapshotRenders("Event",2);

      await updateDoc(doc(eventsRef,eventId),baseData);

      const localIndex=state.events.findIndex(item=>item.id===eventId);
      if(localIndex>=0){
        state.events[localIndex]={
          ...state.events[localIndex],
          ...baseData,
          updatedAt:state.events[localIndex].updatedAt
        };
      }

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
        repeatEndDate,
        memo,
        checklist,
        important,
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
    state.skipEventSnapshotRenders=Math.max(
      0,
      state.skipEventSnapshotRenders-1
    );
    console.error(error);
    el.formError.textContent=error?.message||"저장하지 못했습니다.";
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
    const eventId=el.eventId.value;
    await Promise.all([
      deleteDoc(doc(db,"users",state.user.uid,"events",eventId)),
      ...Object.values(state.eventLogs).filter(log=>log.eventId===eventId).map(log=>deleteDoc(doc(db,"users",state.user.uid,"eventLogs",log.id)))
    ]);
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
  if(target!=="todo"||el.eventId.value)return;

  closeEventModalFromHistory();
  openTodoCreate(state.selectedDateKey);
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
    state.currentWeek=addDays(
      state.currentWeek,
      visibleDaysForZoom()*direction
    );
  }

  renderAll();
}
function setupPageSwipeNavigation(){
  const screens=[
    {page:"calendar",view:"selected"},
    {page:"calendar",view:"week"},
    {page:"habit"},
    {page:"diary"},
    {page:"stats"}
  ];

  let startX=0;
  let startY=0;
  let tracking=false;

  const currentIndex=()=>{
    if(state.activePage==="calendar"){
      return state.currentView==="selected"?0:1;
    }
    if(state.activePage==="habit")return 2;
    if(state.activePage==="diary")return 3;
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
      el.diaryPage,
      el.statsPage
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
  // 주간 내부는 날짜 가로 스크롤, 화면 가장자리 스와이프는 화면 전환에 사용합니다.
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
    state.currentWeek=addDays(state.currentWeek,-visibleDaysForZoom());
  }
  renderAll();
};
$("nextPeriod").onclick=()=>{
  if(state.currentView==="selected"){
    state.selectedDateKey=dateKey(addDays(parseDateKey(state.selectedDateKey),1));
  }else{
    state.currentWeek=addDays(state.currentWeek,visibleDaysForZoom());
  }
  renderAll();
};
el.selectedBtn.onclick=()=>{
  if(state.currentView==="selected"){
    const today=new Date();
    if(state.selectedDateKey!==dateKey(today)){
      state.selectedDateKey=dateKey(today);
      state.currentMonth=startOfMonth(today);
      state.currentWeek=startOfWeek(today);
    }
  }else{
    state.currentView="selected";
  }
  renderAll();
};
el.weekBtn.onclick=()=>{
  state.currentView="week";
  state.currentWeek=startOfWeek(parseDateKey(state.selectedDateKey));
  state.weekFit=false;
  renderAll();
  requestAnimationFrame(()=>scrollGoogleWeekToCurrent(false));
};
el.selectedHabitMoreButton.onclick=()=>navigateToPage("habit");
el.weekZoomOut.onclick=()=>changeWeekZoom(-10);
el.weekZoomIn.onclick=()=>changeWeekZoom(10);
el.weekZoomValue.onclick=resetWeekToFit;
el.periodLabel.onclick=openDatePickerModal;
el.closeDatePicker.onclick=closeDatePickerModal;
el.datePickerModal.addEventListener("click",event=>{
  if(event.target===el.datePickerModal)closeDatePickerModal();
});
el.datePickerPrevMonth.onclick=()=>{
  state.datePickerMonth=new Date(
    state.datePickerMonth.getFullYear(),
    state.datePickerMonth.getMonth()-1,
    1
  );
  renderDatePicker();
};
el.datePickerNextMonth.onclick=()=>{
  state.datePickerMonth=new Date(
    state.datePickerMonth.getFullYear(),
    state.datePickerMonth.getMonth()+1,
    1
  );
  renderDatePicker();
};
el.datePickerYear.onchange=()=>{
  state.datePickerMonth=new Date(
    Number(el.datePickerYear.value),
    state.datePickerMonth.getMonth(),
    1
  );
  renderDatePicker();
};
el.datePickerMonth.onchange=()=>{
  state.datePickerMonth=new Date(
    state.datePickerMonth.getFullYear(),
    Number(el.datePickerMonth.value),
    1
  );
  renderDatePicker();
};
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
$("todoEventModeTab").onclick=()=>{
  closeTodoModalFromHistory();
  openCreate(state.selectedDateKey);
};
$("todoModeFromEventTab").onclick=()=>switchCreateModal("todo");
addHorizontalSwipe(el.modal,()=>switchCreateModal("todo"),()=>{});
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
el.editFromThisDateButton.onclick=()=>applyPendingRepeatEdit("future");
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
el.closeSheet.onclick=closeSheet;el.accountSheet.onclick=e=>{if(e.target===el.accountSheet)closeSheet()};
$("statsSettingsButton").onclick=openSheet;


el.calendarNav.onclick=()=>navigateToPage("calendar");
el.habitNav.onclick=()=>navigateToPage("habit");
el.diaryNav.onclick=()=>navigateToPage("diary");
el.statsNav.onclick=()=>navigateToPage("stats");
el.openSearchButton.onclick=openSearchModal;
el.mobileCalendarNav.onclick=()=>navigateToPage("calendar");
el.mobileHabitNav.onclick=()=>navigateToPage("habit");
el.mobileDiaryNav.onclick=()=>navigateToPage("diary");
el.mobileStatsNav.onclick=()=>navigateToPage("stats");

$("openGoalButton").onclick=()=>openGoal();
$("closeGoalModal").onclick=$("cancelGoalButton").onclick=()=>toggleGoalModal(false);
el.goalModal.onclick=event=>{if(event.target===el.goalModal)toggleGoalModal(false)};
el.goalMode.onchange=syncGoalMode;
$("addGoalChecklistButton").onclick=()=>{state.editingGoalChecklist.push({id:crypto.randomUUID(),text:"",done:false});renderGoalChecklistEditor();el.goalChecklistItems.querySelector(".goal-checklist-row:last-child input[type=text]")?.focus()};
el.goalChecklistItems.oninput=event=>{const row=event.target.closest("[data-goal-check-index]");if(!row)return;const item=state.editingGoalChecklist[Number(row.dataset.goalCheckIndex)];if(event.target.matches("input[type=text]"))item.text=event.target.value};
el.goalChecklistItems.onchange=event=>{const row=event.target.closest("[data-goal-check-index]");if(!row)return;const item=state.editingGoalChecklist[Number(row.dataset.goalCheckIndex)];if(event.target.matches("input[type=checkbox]"))item.done=event.target.checked};
el.goalChecklistItems.onclick=event=>{const row=event.target.closest("[data-goal-check-index]");if(!row||!event.target.closest("button"))return;state.editingGoalChecklist.splice(Number(row.dataset.goalCheckIndex),1);renderGoalChecklistEditor()};
el.goalList.onclick=async event=>{
  const row=event.target.closest("[data-goal-id]");if(!row)return;
  const goal=(state.goalProfile.challenges||[]).find(item=>item.id===row.dataset.goalId);if(!goal)return;
  if(event.target.closest(".goal-state")){
    const completed=!goalProgress(goal).complete;
    await saveGoals(state.goalProfile.challenges.map(item=>item.id===goal.id?{...item,completed,manualIncomplete:!completed}:item));return;
  }
  openGoal(goal);
};
el.deleteGoalButton.onclick=()=>removeGoal(el.goalId.value);
el.goalForm.onsubmit=async event=>{
  event.preventDefault();
  const id=el.goalId.value||crypto.randomUUID();
  const previous=(state.goalProfile.challenges||[]).find(item=>item.id===id);
  const mode=el.goalMode.value,name=el.goalName.value.trim(),dueDate=el.goalDate.value,target=mode==="count"?Number(el.goalTarget.value||1):null,memo=el.goalMemo.value.trim(),checklist=state.editingGoalChecklist.map(item=>({...item,text:item.text.trim()})).filter(item=>item.text);
  let habitId=previous?.habitId||null;
  try{
    if(mode==="count"){
      const habitData={name,startDate:previous?.createdDate||dateKey(new Date()),repeat:"daily",endDate:dueDate||"",challengeId:id,updatedAt:serverTimestamp()};
      if(habitId)await setDoc(doc(db,"users",state.user.uid,"habits",habitId),habitData,{merge:true});
      else habitId=(await addDoc(collection(db,"users",state.user.uid,"habits"),{...habitData,createdAt:serverTimestamp()})).id;
    }else if(habitId){
      await Promise.all(Object.values(state.habitLogs).filter(log=>log.habitId===habitId).map(log=>deleteDoc(doc(db,"users",state.user.uid,"habitLogs",log.id))));
      await deleteDoc(doc(db,"users",state.user.uid,"habits",habitId));habitId=null;
    }
    const completed=el.goalComplete.checked;
    const next={id,name,mode,target,dueDate,habitId,memo,checklist,completed,manualIncomplete:!completed&&Boolean(previous&&(previous.manualIncomplete||goalProgress(previous).complete)),createdAt:previous?.createdAt||Date.now(),createdDate:previous?.createdDate||dateKey(new Date())};
    const challenges=previous?state.goalProfile.challenges.map(item=>item.id===id?next:item):[...(state.goalProfile.challenges||[]),next];
    await saveGoals(challenges);toggleGoalModal(false);
  }catch(error){console.error(error);el.goalMessage.textContent="목표를 저장하지 못했습니다."}
};
$("statsTodayButton").onclick=()=>{
  state.statsInsightDate=null;
  state.statsDate=dateKey(new Date());
  state.currentMonth=startOfMonth(new Date());
  renderStats();
};
$("statsPrevMonthButton").onclick=()=>{
  state.statsInsightDate=null;
  const next=new Date(state.currentMonth.getFullYear(),state.currentMonth.getMonth()-1,1);
  state.currentMonth=next;
  state.statsDate=dateKey(next);
  renderStats();
};
$("statsThisMonthButton").onclick=()=>{
  state.statsInsightDate=null;
  const now=new Date();
  state.currentMonth=startOfMonth(now);
  state.statsDate=dateKey(now);
  renderStats();
};
$("statsNextMonthButton").onclick=()=>{
  state.statsInsightDate=null;
  const next=new Date(state.currentMonth.getFullYear(),state.currentMonth.getMonth()+1,1);
  state.currentMonth=next;
  state.statsDate=dateKey(next);
  renderStats();
};

el.openCategoryManagerButton.onclick=openCategoryManager;
if(el.weekCategoryManagerButton){
  el.weekCategoryManagerButton.onclick=openCategoryManager;
}
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

el.memo.addEventListener("input",()=>{autoResizeMemo();syncCompactEventForm()});

el.repeatChips?.addEventListener("click",event=>{
  const button=event.target.closest("[data-repeat]");
  if(!button)return;
  el.repeat.value=button.dataset.repeat;
  el.repeat.dispatchEvent(new Event("change",{bubbles:true}));
});
el.repeatNoEndButton?.addEventListener("click",()=>{
  el.repeatEndDate.value="";
  el.repeatEndDate.dispatchEvent(new Event("change",{bubbles:true}));
});
el.repeatSetEndButton?.addEventListener("click",()=>el.repeatEndDate.click());
el.repeatEndDate.addEventListener("change",syncCompactEventForm);

function closeEventScopeSheet(){if(el.editScopeSheet)el.editScopeSheet.hidden=true}
el.editScopeSummaryButton?.addEventListener("click",()=>{el.editScopeSheet.hidden=false});
el.closeEventScopeSheet?.addEventListener("click",closeEventScopeSheet);
el.applyEventScopeButton?.addEventListener("click",closeEventScopeSheet);
el.editScopeSheet?.addEventListener("click",event=>{if(event.target===el.editScopeSheet)closeEventScopeSheet()});

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
el.repeat.addEventListener("change",updateRepeatControls);
el.editScope.addEventListener("change",updateEditScopeControls);
el.editRangeStart.addEventListener("change",()=>{
  if(!el.editRangeEnd.value||el.editRangeEnd.value<el.editRangeStart.value){
    el.editRangeEnd.value=el.editRangeStart.value;
  }
  syncCompactEventForm();
});
el.editRangeEnd.addEventListener("change",syncCompactEventForm);

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
if(el.todoAddButton)el.todoAddButton.onclick=addTodo;
if(el.todoOverviewButton)el.todoOverviewButton.onclick=showTodoOverview;
if(el.todoOverviewPrevMonth)el.todoOverviewPrevMonth.onclick=()=>{
  state.todoOverviewMonth=new Date(
    state.todoOverviewMonth.getFullYear(),
    state.todoOverviewMonth.getMonth()-1,
    1
  );
  renderTodoOverview();
};
if(el.todoOverviewThisMonth)el.todoOverviewThisMonth.onclick=()=>{
  state.todoOverviewMonth=startOfMonth(new Date());
  renderTodoOverview();
};
if(el.todoOverviewNextMonth)el.todoOverviewNextMonth.onclick=()=>{
  state.todoOverviewMonth=new Date(
    state.todoOverviewMonth.getFullYear(),
    state.todoOverviewMonth.getMonth()+1,
    1
  );
  renderTodoOverview();
};
$("closeTodoOverviewModal").onclick=closeTodoOverview;
el.todoOverviewModal.onclick=event=>{
  if(event.target===el.todoOverviewModal)closeTodoOverview();
};
function shiftSelectedTodoDate(days){
  const card=el.todoList?.closest(".selected-todo-card");
  const beforeTop=card?.getBoundingClientRect().top??null;

  state.selectedDateKey=dateKey(
    addDays(parseDateKey(state.selectedDateKey),days)
  );
  renderAll();

  if(beforeTop===null)return;

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const refreshed=el.todoList?.closest(".selected-todo-card");
      if(!refreshed)return;

      const afterTop=refreshed.getBoundingClientRect().top;
      const delta=afterTop-beforeTop;

      if(Math.abs(delta)>1){
        window.scrollBy({
          top:delta,
          left:0,
          behavior:"instant"
        });
      }
    });
  });
}
if(el.todoPrevDateButton)el.todoPrevDateButton.onclick=()=>shiftSelectedTodoDate(-1);
if(el.todoNextDateButton)el.todoNextDateButton.onclick=()=>shiftSelectedTodoDate(1);
el.todoForm.onsubmit=submitTodoForm;
if(el.eventImportantButton)el.eventImportantButton.onclick=()=>setImportance("event",!state.eventImportant);
if(el.todoImportantButton)el.todoImportantButton.onclick=()=>setImportance("todo",!state.todoImportant);
el.addTodoChecklistItemButton.onclick=addTodoChecklistItem;
el.deleteTodoButton.onclick=deleteTodo;
$("closeTodoModal").onclick=closeTodoModal;
$("cancelTodo").onclick=closeTodoModal;
el.todoModal.onclick=event=>{
  if(event.target===el.todoModal)closeTodoModal();
};
if(el.todoInput)el.todoInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addTodo();}});
el.quickAddInput.addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    submitQuickAdd();
  }
});

$("closeSearchModal").onclick=closeSearchModal;
el.searchModal.onclick=event=>{
  if(event.target===el.searchModal)closeSearchModal();
};

el.globalSearchInput.addEventListener("input",()=>{
  state.searchQuery=el.globalSearchInput.value;
  renderSearch();
});

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
el.habitEndDate.addEventListener("click",()=>{
  if(!el.habitEndDate.value)return;
  el.habitEndDate.value="";
  el.habitEndDate.dispatchEvent(new Event("change",{bubbles:true}));
});
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

  if(el.searchModal.classList.contains("show")){
    closeSearchModal();
    return;
  }

  if(el.todoOverviewModal.classList.contains("show")){
    closeTodoOverview();
    return;
  }

  if(el.todoModal.classList.contains("show")){
    closeTodoModal();
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
  const previousPage=state.activePage;
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
    el.searchModal.classList.contains("show")
  ){
    closeSearchModalFromHistory();
  }else if(
    el.todoOverviewModal.classList.contains("show")
  ){
    closeTodoOverviewFromHistory();
  }else if(
    el.todoModal.classList.contains("show")
  ){
    closeTodoModalFromHistory();
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
  if(previousPage!==state.activePage)animateVisiblePage();

  if(state.dayViewOpen){
    requestAnimationFrame(renderDayView);
  }
});

function personalStorageKey(kind){return `momentum_${kind}_${state.user?.uid||"local"}`}
function readPersonalItems(kind){
  try{return JSON.parse(localStorage.getItem(personalStorageKey(kind))||"[]")}
  catch{return []}
}
function writePersonalItems(kind,items){localStorage.setItem(personalStorageKey(kind),JSON.stringify(items))}

function renderHomeMemos(){
  const list=$("homeMemoList");if(!list)return;
  const item=readPersonalItems("memos")[0];
  list.textContent=item?.text||"";
  list.classList.toggle("empty",!item?.text);
}
function openHomeMemo(){
  const modal=$("homeMemoModal"),input=$("homeMemoInput"),item=readPersonalItems("memos")[0];
  input.value=item?.text||"";modal.classList.add("show");modal.setAttribute("aria-hidden","false");
}
function closeHomeMemo(){const modal=$("homeMemoModal");modal.classList.remove("show");modal.setAttribute("aria-hidden","true")}
$("homeMemoList")?.addEventListener("click",openHomeMemo);
$("closeHomeMemoModal")?.addEventListener("click",closeHomeMemo);
$("homeMemoModal")?.addEventListener("click",event=>{if(event.target===$("homeMemoModal"))closeHomeMemo()});
$("saveHomeMemoButton")?.addEventListener("click",()=>{const text=$("homeMemoInput").value.trim();writePersonalItems("memos",text?[{id:"home",text}]:[]);renderHomeMemos();closeHomeMemo()});
$("deleteHomeMemoButton")?.addEventListener("click",()=>{writePersonalItems("memos",[]);renderHomeMemos();closeHomeMemo()});

function diaryElements(){return {date:$("diaryDate"),title:$("diaryTitle"),body:$("diaryBody"),list:$("diaryList"),message:$("diaryMessage")}}
function renderDiary(){
  const d=diaryElements();if(!d.date)return;
  if(!d.date.value)d.date.value=dateKey(new Date());
  const items=readPersonalItems("diaries").sort((a,b)=>b.date.localeCompare(a.date));
  d.list.innerHTML=items.length?items.map(item=>`<button class="diary-entry ${item.date===d.date.value?"active":""}" type="button" data-diary-date="${item.date}"><strong>${escapeHtml(item.title||"제목 없는 기록")}</strong><small>${escapeHtml(item.date)} · ${escapeHtml((item.body||"").slice(0,44))}</small></button>`).join(""):'<p class="diary-empty">아직 기록이 없습니다.</p>';
  const current=items.find(item=>item.date===d.date.value);d.title.value=current?.title||"";d.body.value=current?.body||"";
}
function saveDiary(){
  const d=diaryElements(),date=d.date.value;if(!date)return;
  const items=readPersonalItems("diaries");const index=items.findIndex(item=>item.date===date);
  const entry={date,title:d.title.value.trim(),body:d.body.value.trim(),updatedAt:Date.now()};
  if(index>=0)items[index]=entry;else items.push(entry);writePersonalItems("diaries",items);renderDiary();d.message.textContent="저장했습니다.";setTimeout(()=>d.message.textContent="",1400);
}
$("diaryDate")?.addEventListener("change",renderDiary);$("saveDiaryButton")?.addEventListener("click",saveDiary);
$("deleteDiaryButton")?.addEventListener("click",()=>{const d=diaryElements();if(!d.date.value||!confirm("이 날짜의 일기를 삭제할까요?"))return;writePersonalItems("diaries",readPersonalItems("diaries").filter(item=>item.date!==d.date.value));renderDiary()});
$("diaryList")?.addEventListener("click",event=>{const button=event.target.closest("[data-diary-date]");if(!button)return;$("diaryDate").value=button.dataset.diaryDate;renderDiary()});

document.querySelectorAll("[data-habit-section]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-habit-section]").forEach(item=>item.classList.toggle("active",item===button));
  const goals=button.dataset.habitSection==="goals";$("habitMainPanel").hidden=goals;$("goalMainPanel").hidden=!goals;
  $("openHabitModal").hidden=goals;$("habitTodayButton").hidden=goals;
  if(goals)renderGoals();
}));
document.querySelectorAll("[data-weekly-metric]").forEach(button=>button.addEventListener("click",()=>{
  state.weeklyMetric=button.dataset.weeklyMetric;document.querySelectorAll("[data-weekly-metric]").forEach(item=>item.classList.toggle("active",item===button));renderStats();
}));

renderHomeMemos();
renderThemePicker();
applyTheme(localStorage.getItem("momentum_theme")||"green",{save:false});
$("themePicker")?.addEventListener("click",event=>{const button=event.target.closest("[data-theme-id]");if(button)applyTheme(button.dataset.themeId)});


setupMondayFirstDatePicker();
setupWheelTimePicker();
setupDesktopUndo();
setupMobileWeekSwipe();

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
    if(state.unsubscribeTodos){state.unsubscribeTodos();state.unsubscribeTodos=null}
    if(state.unsubscribeTodoLogs){state.unsubscribeTodoLogs();state.unsubscribeTodoLogs=null}
    if(state.unsubscribeGoals){state.unsubscribeGoals();state.unsubscribeGoals=null}
    el.login.hidden=false;el.app.hidden=true;return
  }
  state.user=user;
  el.login.hidden=true;
  el.app.hidden=false;
  fillUser(user);
  renderHomeMemos();
  if(state.activePage==="diary")renderDiary();

  if(!history.state?.momentum){
    syncHistoryState({replace:true});
  }
  try{
    await saveProfile(user);
    listenCategories(user);
    listen(user);
    listenHabits(user);
    listenTodos(user);
    listenGoals(user);
  }catch(error){
    console.error(error);
    alert("Firebase에 연결하지 못했습니다.");
  }
});
setProgress(0);
