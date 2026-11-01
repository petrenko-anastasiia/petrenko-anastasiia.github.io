(function(){
  /* local time label (Europe/Warsaw clock, shown as EU) */
  var clock=document.getElementById('clock');
  function tick(){
    try{
      var s=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',timeZoneName:'short',hour12:false}).format(new Date());
      clock.textContent='EU · '+s.replace('GMT+1','CET').replace('GMT+2','CEST');
    }catch(e){clock.textContent='EU'}
  }
  tick();setInterval(tick,30000);

  /* numbers: count up from 0 every time the strip enters view (reset when it leaves). Final text = data-final */
  (function(){
    var figs=[].slice.call(document.querySelectorAll('.num .fig'));if(!figs.length)return;
    var fmt=[
      function(p){return '~'+Math.round(54*p)+'%'},
      function(p){return (2.5*p).toFixed(1)+'\u2013'+(4*p).toFixed(1)+'x'},
      function(p){var k=Math.round(1000*p);return k>=1000?'1M+':k+'K'},
      function(p){return Math.round(8*p)+'\u2013'+Math.round(12*p)}
    ];
    function setFinal(){figs.forEach(function(f){f.textContent=f.getAttribute('data-final')})}
    function setZero(){figs.forEach(function(f,i){f.textContent=fmt[i](0)})}
    var force=/[?&]motion=1/.test(location.search);
    var reduce=!force&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce||!('IntersectionObserver' in window)||figs.length!==fmt.length){setFinal();return}
    var DUR=2000,STAG=120,raf=0,gen=0;
    function ease(t){return 1-Math.pow(1-t,3)}
    function stop(){gen++;if(raf)cancelAnimationFrame(raf);raf=0}
    function run(){
      stop();var my=gen,t0=performance.now();setZero();
      function frame(now){
        if(my!==gen)return;
        var done=true;
        figs.forEach(function(f,i){
          var t=(now-t0-i*STAG)/DUR;
          if(t<1){done=false;f.textContent=fmt[i](t<=0?0:ease(t))}
          else f.textContent=f.getAttribute('data-final');
        });
        if(!done)raf=requestAnimationFrame(frame);
      }
      raf=requestAnimationFrame(frame);
    }
    var inView=false;
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.intersectionRatio>=.2&&!inView){inView=true;run()}
        else if(e.intersectionRatio===0&&inView){inView=false;stop();setZero()}
      });
    },{threshold:[0,.2]});
    setZero();
    io.observe(document.querySelector('.num-grid'));
  })();

  /* accordions */
  document.querySelectorAll('.acc-btn').forEach(function(b){
    b.addEventListener('click',function(){
      var row=b.closest('.acc-row'),open=!row.classList.contains('open');
      row.classList.toggle('open',open);b.setAttribute('aria-expanded',open?'true':'false');
    });
  });

  /* sound toggle: loop previews have no audio track, so swap to the clip with sound; volume 0.5 on unmute */
  function setMute(btn,on){var t=on?'Tap to mute':'Tap for sound';btn.setAttribute('aria-pressed',on?'true':'false');btn.setAttribute('aria-label',t);btn.setAttribute('title',t);btn.textContent=on?'Sound on':'Sound off'}
  function muteAll(except){
    document.querySelectorAll('.cr-mute').forEach(function(b){
      var v=b.closest('.cf').querySelector('video');
      if(b!==except){v.muted=true;setMute(b,false)}
    });
  }
  function toggle(btn){
    var v=btn.closest('.cf').querySelector('video');
    if(v.muted){
      muteAll(btn);
      var snd=v.getAttribute('data-sound');
      if(snd&&v.getAttribute('src')!==snd){
        var t=v.currentTime||0;
        v.setAttribute('src',snd);
        v.addEventListener('loadedmetadata',function f(){v.removeEventListener('loadedmetadata',f);try{if(v.duration&&t<v.duration)v.currentTime=t}catch(e){}},{once:true});
        v.load();
      }
      v.muted=false;v.volume=0.5;setMute(btn,true);
      var pr=v.play();if(pr&&pr.catch)pr.catch(function(){v.muted=true;setMute(btn,false)});
    }else{v.muted=true;setMute(btn,false)}
  }
  document.querySelectorAll('.cr-mute').forEach(function(b){
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle(b)});
    b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();toggle(b)}});
  });
  document.querySelectorAll('[data-video]').forEach(function(a){a.addEventListener('click',function(){muteAll(null)})});

  /* video lightbox: clips open on this site, not on another page */
  var box=document.getElementById('vbox'),lv=box.querySelector('video');
  function close(){lv.pause();lv.removeAttribute('src');lv.load();box.classList.remove('open');document.body.style.overflow=''}
  document.querySelectorAll('[data-video]').forEach(function(a){
    a.addEventListener('click',function(e){
      if(e.defaultPrevented)return;
      e.preventDefault();lv.src=a.dataset.video;box.classList.add('open');document.body.style.overflow='hidden';
      lv.play().catch(function(){});
    });
  });
  box.querySelector('button').addEventListener('click',close);
  box.addEventListener('click',function(e){if(e.target===box)close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&box.classList.contains('open'))close()});
})();
