(function(){
  "use strict";

  var bank = window.N3_QUESTION_BANK || [];
  var STORAGE_KEY = "n3QuestProgressV3";
  var LEGACY_KEY = "n3QuestProgressV2";
  var THEME_KEY = "n3QuestTheme";
  var mode = "mixed";
  var countSetting = "10";
  var qs = [];
  var pos = 0;
  var score = 0;
  var streak = 0;
  var maxStreak = 0;
  var correct = 0;
  var answered = false;
  var wrongAnswers = [];
  var sessionAttempts = [];
  var currentOptions = [];
  var unlockedThisRound = [];
  var toastTimer = null;

  var achievements = [
    {id:"first",icon:"🌱",name:"Khởi đầu",desc:"Hoàn thành 1 vòng học"},
    {id:"accurate",icon:"🎯",name:"Chuẩn xác",desc:"Đạt ít nhất 80%"},
    {id:"combo5",icon:"🔥",name:"Combo 5",desc:"Đúng liên tiếp 5 câu"},
    {id:"fifty",icon:"🏅",name:"50 câu đúng",desc:"Tích lũy 50 câu đúng"},
    {id:"hundred",icon:"💯",name:"100 câu",desc:"Hoàn thành 100 câu"},
    {id:"streak3",icon:"📅",name:"3 ngày",desc:"Học liên tiếp 3 ngày"},
    {id:"perfect",icon:"👑",name:"Hoàn hảo",desc:"Đạt 100% trong vòng ≥ 10 câu"}
  ];

  function el(id){return document.getElementById(id);}
  function shuffle(arr,rand){
    var a=arr.slice(),i,j,tmp,r=rand||Math.random;
    for(i=a.length-1;i>0;i--){j=Math.floor(r()*(i+1));tmp=a[i];a[i]=a[j];a[j]=tmp;}
    return a;
  }
  function hashString(str){
    var h=2166136261,i;
    for(i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36);
  }
  function qid(q){return "q_"+hashString(q.t+"|"+q.q);}
  function todayKey(date){
    var d=date||new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function seededRandom(seedText){
    var seed=parseInt(hashString(seedText),36)||1;
    return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
  }
  function dayDiff(a,b){
    var aa=new Date(a+"T00:00:00"),bb=new Date(b+"T00:00:00");
    return Math.round((bb-aa)/86400000);
  }
  function defaultProgress(){
    return {xp:0,best:0,totalAnswered:0,totalCorrect:0,dayStreak:0,lastPlayed:"",completedRounds:0,achievements:[],questionStats:{},saved:[]};
  }
  function loadProgress(){
    var p=defaultProgress(),raw=null;
    try{
      raw=localStorage.getItem(STORAGE_KEY);
      if(raw){return Object.assign(p,JSON.parse(raw));}
      raw=localStorage.getItem(LEGACY_KEY);
      if(raw){return Object.assign(p,JSON.parse(raw));}
    }catch(e){}
    return p;
  }
  function saveProgress(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}catch(e){}}
  var progress=loadProgress();
  if(!progress.questionStats){progress.questionStats={};}
  if(!Array.isArray(progress.saved)){progress.saved=[];}
  if(!Array.isArray(progress.achievements)){progress.achievements=[];}

  function categoryForMode(value){
    if(value==="vocab"){return "Từ vựng";}
    if(value==="kanji"){return "Kanji";}
    if(value==="grammar"){return "Ngữ pháp";}
    return null;
  }
  function weakPool(){
    return bank.filter(function(q){
      var s=progress.questionStats[qid(q)];
      return s&&s.seen>=1&&((s.correct/s.seen)<0.7||s.lastWrong);
    }).sort(function(a,b){
      var sa=progress.questionStats[qid(a)]||{seen:0,correct:0,lastWrong:false};
      var sb=progress.questionStats[qid(b)]||{seen:0,correct:0,lastWrong:false};
      var ra=sa.seen?sa.correct/sa.seen:1,rb=sb.seen?sb.correct/sb.seen:1;
      if(sa.lastWrong!==sb.lastWrong){return sa.lastWrong?-1:1;}
      return ra-rb;
    });
  }
  function savedPool(){
    var set=new Set(progress.saved);
    return bank.filter(function(q){return set.has(qid(q));});
  }
  function poolForMode(value){
    if(value==="weak"){return weakPool();}
    if(value==="saved"){return savedPool();}
    var cat=categoryForMode(value);
    return cat?bank.filter(function(q){return q.t===cat;}):bank.slice();
  }
  function targetCount(poolLength){
    if(countSetting==="all"){return poolLength;}
    return Math.min(parseInt(countSetting,10)||10,poolLength);
  }
  function balancedQuestions(pool,count,rand){
    if(mode!=="mixed" || count>=pool.length){return shuffle(pool,rand).slice(0,count);}
    var cats=["Từ vựng","Kanji","Ngữ pháp"];
    var buckets=cats.map(function(cat){return shuffle(pool.filter(function(q){return q.t===cat;}),rand);});
    var out=[],i=0;
    while(out.length<count){
      var bucket=buckets[i%3];
      if(bucket.length){out.push(bucket.shift());}
      i++;
      if(i>count*10){break;}
    }
    return shuffle(out,rand);
  }
  function dailyQuestions(){
    var rand=seededRandom(todayKey()+"|n3quest");
    var byCat={"Từ vựng":[],"Kanji":[],"Ngữ pháp":[]};
    bank.forEach(function(q){if(byCat[q.t]){byCat[q.t].push(q);}});
    Object.keys(byCat).forEach(function(k){byCat[k]=shuffle(byCat[k],rand);});
    var out=[];
    out=out.concat(byCat["Từ vựng"].slice(0,4));
    out=out.concat(byCat["Kanji"].slice(0,3));
    out=out.concat(byCat["Ngữ pháp"].slice(0,3));
    return shuffle(out,rand);
  }

  function levelInfo(xp){
    return {level:Math.floor(xp/100)+1,into:xp%100,need:100};
  }
  function updateProfile(){
    var li=levelInfo(progress.xp);
    var acc=progress.totalAnswered?Math.round(progress.totalCorrect/progress.totalAnswered*100):0;
    el("levelStat").textContent=li.level;
    el("levelDetail").textContent="Level "+li.level;
    el("xpText").textContent=li.into+" / "+li.need+" XP";
    el("xpCompact").textContent=li.into+" / "+li.need+" XP";
    el("xpBar").style.width=Math.round(li.into/li.need*100)+"%";
    el("dayStreakStat").textContent=progress.dayStreak+" 🔥";
    el("lifetimeAccuracy").textContent=acc+"%";
    el("lifetimeCount").textContent=progress.totalAnswered;
    var weak=weakPool().length,saved=savedPool().length;
    el("weakModeText").textContent=weak?weak+" câu cần ôn":"Chưa có câu yếu";
    el("savedModeText").textContent=saved?saved+" câu đã lưu":"Chưa lưu câu nào";
    el("weakModeBtn").classList.toggle("disabled",weak===0);
    el("savedModeBtn").classList.toggle("disabled",saved===0);
  }
  function renderAchievements(){
    var box=el("achievementStrip");box.innerHTML="";
    achievements.forEach(function(a){
      var unlocked=progress.achievements.indexOf(a.id)>=0;
      var item=document.createElement("div");
      item.className="achievement-chip"+(unlocked?"":" locked");
      item.title=a.desc;
      item.innerHTML="<span>"+a.icon+"</span><strong>"+a.name+"</strong>";
      box.appendChild(item);
    });
  }
  function updateHomeCount(){
    var pool=poolForMode(mode);
    el("bankCount").textContent=pool.length+" câu";
    var count=targetCount(pool.length);
    if(pool.length===0){
      el("startBtn").disabled=true;
      el("startHint").textContent=mode==="weak"?"Hãy làm vài vòng trước; các câu bạn hay sai sẽ tự xuất hiện ở đây.":"Hãy bấm ☆ trong lúc học để lưu câu muốn ôn lại.";
    }else{
      el("startBtn").disabled=false;
      el("startHint").textContent=count+" câu · đáp án đảo vị trí mỗi lần · khoảng "+Math.max(2,Math.round(count*.55))+" phút";
    }
  }
  function showScreen(name){
    el("homeScreen").classList.toggle("hide",name!=="home");
    el("quizScreen").classList.toggle("hide",name!=="quiz");
    el("resultScreen").classList.toggle("hide",name!=="result");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function startRound(customQuestions,opts){
    opts=opts||{};
    var pool=customQuestions?customQuestions.slice():poolForMode(mode);
    var count=customQuestions?pool.length:targetCount(pool.length);
    var rand=opts.daily?seededRandom(todayKey()+"|round"):Math.random;
    qs=opts.daily?dailyQuestions():balancedQuestions(pool,count,rand);
    pos=0;score=0;streak=0;maxStreak=0;correct=0;answered=false;wrongAnswers=[];sessionAttempts=[];unlockedThisRound=[];
    showScreen("quiz");
    renderQuestion();
  }
  function makeOptions(q){
    return shuffle(q.a.map(function(text,index){return {text:text,correct:index===q.c,originalIndex:index};}));
  }
  function usefulReading(q){return q.r && q.r!=="Chọn hiragana đúng.";}
  function exampleJapanese(q){
    if(!q.e){return "";}
    var first=String(q.e).split("\n")[0].trim();
    return /[ぁ-んァ-ン一-龯]/.test(first)?first:"";
  }
  function renderQuestion(){
    var q=qs[pos];
    if(!q){goHome();return;}
    answered=false;
    currentOptions=makeOptions(q);
    el("typeTag").textContent=q.t;
    el("counter").textContent=(pos+1)+"/"+qs.length;
    el("question").textContent=q.q;
    el("reading").textContent=q.r||"";
    el("reading").className="reading hide";
    el("hintBtn").classList.toggle("hide",!usefulReading(q));
    el("hintBtn").textContent="あ Hiragana";
    var example=exampleJapanese(q);
    el("speakBtn").disabled=!example || !("speechSynthesis" in window);
    el("feedback").className="feedback hide";
    el("feedback").innerHTML="";
    el("nextBtn").disabled=true;
    el("nextBtn").textContent=pos===qs.length-1?"Xem kết quả":"Câu tiếp theo";
    el("saveBtn").textContent=progress.saved.indexOf(qid(q))>=0?"★":"☆";
    el("saveBtn").setAttribute("aria-label",progress.saved.indexOf(qid(q))>=0?"Bỏ lưu câu hỏi":"Lưu câu hỏi");
    var answers=el("answers");answers.innerHTML="";
    currentOptions.forEach(function(opt,index){
      var b=document.createElement("button");
      b.type="button";b.className="answer";b.dataset.index=String(index);
      b.innerHTML="<span class='letter'>"+String.fromCharCode(65+index)+"</span>"+escapeHtml(opt.text);
      b.addEventListener("click",choose,false);
      answers.appendChild(b);
    });
    updateSessionStats();
  }
  function updateSessionStats(){
    var done=pos+(answered?1:0);
    var acc=done?Math.round(correct/done*100):0;
    el("score").textContent=score;
    el("streak").textContent=streak+" 🔥";
    el("accuracy").textContent=acc+"%";
    el("bar").style.width=(qs.length?done/qs.length*100:0)+"%";
  }
  function updateQuestionStats(q,isCorrect){
    var id=qid(q),s=progress.questionStats[id]||{seen:0,correct:0,lastWrong:false};
    s.seen+=1;if(isCorrect){s.correct+=1;}s.lastWrong=!isCorrect;s.lastSeen=todayKey();
    progress.questionStats[id]=s;
  }
  function choose(evt){
    if(answered){return;}
    answered=true;
    var selected=parseInt(evt.currentTarget.dataset.index,10);
    var opt=currentOptions[selected];
    var q=qs[pos];
    var isCorrect=!!opt.correct;
    var buttons=el("answers").querySelectorAll("button");
    buttons.forEach(function(b,i){
      b.disabled=true;
      if(currentOptions[i].correct){b.classList.add("correct");}
      else if(i!==selected){b.classList.add("dimmed");}
    });
    if(isCorrect){
      streak++;correct++;maxStreak=Math.max(maxStreak,streak);
      var gained=10+Math.min(streak-1,5)*2;
      score+=gained;
      showFeedback(true,"Chính xác! +"+gained+" điểm",q.e);
    }else{
      streak=0;evt.currentTarget.classList.add("wrong");
      wrongAnswers.push({q:q,selectedText:opt.text});
      showFeedback(false,"Chưa đúng · đáp án: "+q.a[q.c],q.e);
    }
    sessionAttempts.push({type:q.t,correct:isCorrect});
    updateQuestionStats(q,isCorrect);
    saveProgress();
    el("nextBtn").disabled=false;
    updateSessionStats();
    setTimeout(function(){el("feedback").scrollIntoView({behavior:"smooth",block:"nearest"});},80);
  }
  function showFeedback(ok,title,explanation){
    var box=el("feedback");
    box.className="feedback "+(ok?"ok":"no");
    box.innerHTML="<span class='feedback-title'>"+(ok?"✅ ":"❌ ")+escapeHtml(title)+"</span><div class='explanation'>"+escapeHtml(explanation||"")+"</div>";
  }
  function nextQuestion(){
    if(!answered){return;}
    if(pos>=qs.length-1){finishRound();return;}
    pos++;renderQuestion();window.scrollTo({top:0,behavior:"smooth"});
  }
  function unlock(id){if(progress.achievements.indexOf(id)<0){progress.achievements.push(id);unlockedThisRound.push(id);}}
  function updateDailyStreak(){
    var today=todayKey();
    if(progress.lastPlayed===today){return;}
    if(!progress.lastPlayed){progress.dayStreak=1;}
    else if(dayDiff(progress.lastPlayed,today)===1){progress.dayStreak+=1;}
    else{progress.dayStreak=1;}
    progress.lastPlayed=today;
  }
  function finishRound(){
    var total=qs.length,acc=total?Math.round(correct/total*100):0;
    var xpGain=Math.max(5,Math.round(score*.6));
    progress.xp+=xpGain;
    progress.best=Math.max(progress.best,score);
    progress.totalAnswered+=total;
    progress.totalCorrect+=correct;
    progress.completedRounds+=1;
    updateDailyStreak();
    unlock("first");if(acc>=80){unlock("accurate");}if(maxStreak>=5){unlock("combo5");}
    if(progress.totalCorrect>=50){unlock("fifty");}if(progress.totalAnswered>=100){unlock("hundred");}
    if(progress.dayStreak>=3){unlock("streak3");}if(acc===100&&total>=10){unlock("perfect");}
    saveProgress();updateProfile();renderAchievements();

    el("finalScore").textContent=score;
    el("finalAccuracy").textContent=acc+"%";
    el("finalCombo").textContent=maxStreak;
    el("xpGained").textContent="+"+xpGain;
    if(acc>=90){el("resultIcon").textContent="🏆";el("resultTitle").textContent="Xuất sắc";el("finalMsg").textContent="Bạn đã nắm khá chắc vòng này. Hãy đổi dạng câu hoặc tăng số lượng để tiếp tục.";}
    else if(acc>=70){el("resultIcon").textContent="🎯";el("resultTitle").textContent="Kết quả tốt";el("finalMsg").textContent="Nhịp học ổn. Ôn lại các câu sai sẽ hiệu quả hơn làm lại cả vòng.";}
    else if(acc>=50){el("resultIcon").textContent="📚";el("resultTitle").textContent="Đang tiến bộ";el("finalMsg").textContent="Tập trung vào mục Câu yếu; game sẽ ưu tiên những điểm bạn chưa chắc.";}
    else{el("resultIcon").textContent="🧠";el("resultTitle").textContent="Nên ôn lại";el("finalMsg").textContent="Đừng làm vòng mới ngay. Hãy luyện lại câu sai trước để ghi nhớ tốt hơn.";}
    renderBreakdown();renderWrongAnswers();renderNewAchievements();showScreen("result");
  }
  function renderBreakdown(){
    var cats=["Từ vựng","Kanji","Ngữ pháp"],box=el("breakdownList");box.innerHTML="";
    cats.forEach(function(cat){
      var arr=sessionAttempts.filter(function(a){return a.type===cat;});
      if(!arr.length){return;}
      var ok=arr.filter(function(a){return a.correct;}).length,pct=Math.round(ok/arr.length*100);
      var row=document.createElement("div");row.className="breakdown-row";
      row.innerHTML="<span>"+cat+"</span><div class='breakdown-bar'><i style='width:"+pct+"%'></i></div><strong>"+pct+"%</strong>";
      box.appendChild(row);
    });
    el("breakdownBox").classList.toggle("hide",box.children.length===0);
  }
  function renderWrongAnswers(){
    var box=el("reviewBox"),list=el("wrongList");list.innerHTML="";
    if(!wrongAnswers.length){box.classList.add("hide");el("retryWrongBtn").classList.add("hide");return;}
    box.classList.remove("hide");el("retryWrongBtn").classList.remove("hide");el("wrongCount").textContent=wrongAnswers.length+" câu";
    wrongAnswers.forEach(function(item){
      var q=item.q,div=document.createElement("div");div.className="wrong-item";
      div.innerHTML="<strong>"+escapeHtml(q.q)+"</strong>"+
        (usefulReading(q)?"<div class='reading-line'>"+escapeHtml(q.r)+"</div>":"")+
        "<div class='your-line'>Bạn chọn: "+escapeHtml(item.selectedText)+"</div>"+
        "<div class='correct-line'>✓ "+escapeHtml(q.a[q.c])+"</div>"+
        "<div class='explain'>"+escapeHtml(q.e||"")+"</div>";
      list.appendChild(div);
    });
  }
  function renderNewAchievements(){
    var box=el("newAchievements");box.innerHTML="";
    if(!unlockedThisRound.length){box.classList.add("hide");return;}
    box.classList.remove("hide");
    var title=document.createElement("strong");title.textContent="🎉 Thành tích mới";box.appendChild(title);
    unlockedThisRound.forEach(function(id){var a=achievements.find(function(x){return x.id===id;});if(!a){return;}var row=document.createElement("div");row.className="new-achievement";row.textContent=a.icon+" "+a.name+" — "+a.desc;box.appendChild(row);});
  }
  function escapeHtml(text){return String(text).replace(/[&<>'"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch];});}
  function goHome(){showScreen("home");updateProfile();updateHomeCount();}
  function setTheme(theme){
    document.documentElement.dataset.theme=theme;el("themeBtn").textContent=theme==="dark"?"☀️":"🌙";
    try{localStorage.setItem(THEME_KEY,theme);}catch(e){}
  }
  function initTheme(){var saved="";try{saved=localStorage.getItem(THEME_KEY)||"";}catch(e){}if(!saved){saved=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}setTheme(saved);}
  function toast(text){
    clearTimeout(toastTimer);var t=el("toast");t.textContent=text;t.classList.remove("hide");
    toastTimer=setTimeout(function(){t.classList.add("hide");},1500);
  }
  function toggleSave(){
    var q=qs[pos],id=qid(q),idx=progress.saved.indexOf(id);
    if(idx>=0){progress.saved.splice(idx,1);el("saveBtn").textContent="☆";toast("Đã bỏ khỏi danh sách lưu");}
    else{progress.saved.push(id);el("saveBtn").textContent="★";toast("Đã lưu để ôn lại");}
    saveProgress();updateProfile();
  }
  function speakExample(){
    var q=qs[pos],text=exampleJapanese(q);if(!text||!("speechSynthesis" in window)){return;}
    window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang="ja-JP";u.rate=.85;window.speechSynthesis.speak(u);
  }
  function selectMode(card){
    var requested=card.dataset.mode,pool=poolForMode(requested);
    if((requested==="weak"||requested==="saved")&&pool.length===0){toast(requested==="weak"?"Chưa có câu yếu — hãy học vài vòng trước":"Chưa có câu đã lưu");return;}
    mode=requested;document.querySelectorAll(".mode-card").forEach(function(x){x.classList.toggle("selected",x===card);});updateHomeCount();
  }

  var warning=el("jsWarning");if(warning){warning.style.display="none";}
  el("modeGrid").addEventListener("click",function(evt){var card=evt.target.closest(".mode-card");if(card){selectMode(card);}});
  el("countGroup").addEventListener("click",function(evt){var b=evt.target.closest("button");if(!b){return;}countSetting=b.dataset.count;el("countGroup").querySelectorAll("button").forEach(function(x){x.classList.toggle("selected",x===b);});updateHomeCount();});
  el("startBtn").addEventListener("click",function(){startRound();});
  el("dailyBtn").addEventListener("click",function(){mode="mixed";startRound(null,{daily:true});});
  el("nextBtn").addEventListener("click",nextQuestion);
  el("hintBtn").addEventListener("click",function(){var r=el("reading"),hidden=r.classList.toggle("hide");el("hintBtn").textContent=hidden?"あ Hiragana":"🙈 Ẩn hiragana";});
  el("speakBtn").addEventListener("click",speakExample);
  el("saveBtn").addEventListener("click",toggleSave);
  el("quitBtn").addEventListener("click",function(){if(answered||pos>0){if(!window.confirm("Thoát vòng học hiện tại? Tiến độ vòng này sẽ không được cộng vào thống kê tổng.")){return;}}goHome();});
  el("homeBtn").addEventListener("click",goHome);
  el("playAgainBtn").addEventListener("click",function(){startRound();});
  el("retryWrongBtn").addEventListener("click",function(){var retry=wrongAnswers.map(function(item){return item.q;});startRound(retry);});
  el("themeBtn").addEventListener("click",function(){setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");});

  initTheme();updateProfile();renderAchievements();updateHomeCount();showScreen("home");
})();
