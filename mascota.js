/* Mariposa de Petits Cadeaux: versión rechoncha y tierna, animada (aletea, flota y parpadea). */
(function(){
  var css=document.createElement("style");
  css.textContent=
  ".mari{display:block;overflow:visible}"+
  ".mari .flota{animation:mFlota 2.6s ease-in-out infinite;transform-box:view-box;transform-origin:50px 60px}"+
  ".mari .alas{animation:mAletea 1.5s ease-in-out infinite;transform-box:view-box;transform-origin:50px 55px}"+
  ".mari .ojo{animation:mParpadeo 4.2s infinite;transform-box:fill-box;transform-origin:center}"+
  ".mari .ant{animation:mAnt 2.6s ease-in-out infinite;transform-box:view-box;transform-origin:50px 28px}"+
  "@keyframes mFlota{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}"+
  "@keyframes mAletea{0%,100%{transform:scaleX(1)}18%{transform:scaleX(.6)}36%{transform:scaleX(1)}54%{transform:scaleX(.7)}72%,90%{transform:scaleX(1)}}"+
  "@keyframes mParpadeo{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}"+
  "@keyframes mAnt{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}"+
  "@media(prefers-reduced-motion:reduce){.mari *{animation:none!important}}";
  document.head.appendChild(css);
  var ala='<path d="M47 52C32 20 5 16 8 38c2 15 22 21 39 18z" fill="#fff" stroke="#9b9bab" stroke-width="2.4" stroke-linejoin="round"/>'+
   '<path d="M44 51C33 30 17 26 16 38c1 9 14 14 28 13z" fill="#efe6fa" stroke="#c8a6e8" stroke-width="1.6" stroke-linejoin="round"/>'+
   '<path d="M47 57C32 56 14 62 18 77c4 12 22 6 29-11z" fill="#fff" stroke="#9b9bab" stroke-width="2.4" stroke-linejoin="round"/>'+
   '<path d="M44 60C34 60 24 64 26 72c3 6 13 2 18-8z" fill="#efe6fa" stroke="#c8a6e8" stroke-width="1.6" stroke-linejoin="round"/>';
  window.mascotaSVG=function(px){
    return '<svg class="mari" width="'+px+'" height="'+px+'" viewBox="0 0 100 100" aria-hidden="true">'+
     '<g class="flota">'+
     '<g class="alas"><g>'+ala+'</g><g transform="translate(100 0) scale(-1 1)">'+ala+'</g></g>'+
     '<g class="ant"><path d="M45 26Q40 13 33 11M55 26Q60 13 67 11" fill="none" stroke="#a66ac7" stroke-width="2.2" stroke-linecap="round"/><circle cx="33" cy="10.5" r="3" fill="#c9a0ee" stroke="#a66ac7" stroke-width="1.4"/><circle cx="67" cy="10.5" r="3" fill="#c9a0ee" stroke="#a66ac7" stroke-width="1.4"/></g>'+
     '<ellipse cx="50" cy="64" rx="12" ry="18" fill="#dcbdf3" stroke="#a66ac7" stroke-width="2.2"/>'+
     '<path d="M40 62q10 4 20 0M40.5 70q9.5 4 19 0" fill="none" stroke="#b98be0" stroke-width="1.6" stroke-linecap="round"/>'+
     '<circle cx="50" cy="39" r="17" fill="#f7ecff" stroke="#a66ac7" stroke-width="2.2"/>'+
     '<ellipse class="ojo" cx="43" cy="38" rx="2.8" ry="3.6" fill="#3a2350"/><ellipse class="ojo" cx="57" cy="38" rx="2.8" ry="3.6" fill="#3a2350"/>'+
     '<circle cx="44" cy="36.6" r="1" fill="#fff"/><circle cx="58" cy="36.6" r="1" fill="#fff"/>'+
     '<circle cx="36.5" cy="44" r="3.6" fill="#ffb3d1" opacity=".75"/><circle cx="63.5" cy="44" r="3.6" fill="#ffb3d1" opacity=".75"/>'+
     '<path d="M46 45.5q4 3.6 8 0" fill="none" stroke="#3a2350" stroke-width="1.8" stroke-linecap="round"/>'+
     '</g></svg>';
  };
})();
