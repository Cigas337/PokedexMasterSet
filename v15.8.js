/* Pokédex M7 v15.8.0 · Integration polish: auth signature, profile dock avatar, promo art repair */
(function(){
  const AVATAR_KEY='pokedexm7-v15-avatar';
  const CHARIZARD_MEP_029='https://pkmncards.com/wp-content/uploads/mebsp_en_029_std.png';
  const once=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

  once(()=>{
    installAuthSignature();
    installNavAvatar();
    installPromoImageRepair();
  });

  function installAuthSignature(){
    const gate=document.getElementById('authGate');
    if(!gate)return;
    const selector='.auth-foot,.auth-footer,.auth-note,.login-foot,.login-footer,[class*="auth-"][class*="foot"],[class*="auth-"][class*="note"],small,p';
    const candidates=[...gate.querySelectorAll(selector)].filter(el=>{
      if(el.querySelector('input,button,select,textarea'))return false;
      const text=(el.textContent||'').trim();
      if(!text||text.length>260)return false;
      return /cigas|fan|projeto|project|legendary|dados|local|privad|unofficial|pok[eé]dex/i.test(text);
    });
    let target=candidates[candidates.length-1]||gate.querySelector('.m7-v158-auth-signature');
    if(!target){
      target=document.createElement('div');
      gate.appendChild(target);
    }
    target.classList.add('m7-v158-auth-signature');
    target.replaceChildren();
    target.append(document.createTextNode('Signed by Cigas · '));
    const em=document.createElement('em');em.textContent='Unofficial fan project';target.append(em);
    target.append(document.createTextNode(' · “Legendary as ♥♥♥♥”'));
  }

  function installNavAvatar(){
    const btn=document.querySelector('.m7-app-nav [data-app-nav="profile"]');
    if(!btn)return;
    const label=btn.querySelector('span:last-child');
    if(label)label.textContent='Profile';
    let holder=btn.querySelector('.m7-v158-nav-avatar');
    if(!holder){
      holder=document.createElement('span');
      holder.className='m7-v158-nav-avatar';
      holder.hidden=true;
      if(label)btn.insertBefore(holder,label);else btn.appendChild(holder);
    }
    let img=holder.querySelector('img');
    if(!img){img=document.createElement('img');img.alt='';img.decoding='async';holder.appendChild(img)}

    const sync=()=>{
      let data='';try{data=localStorage.getItem(AVATAR_KEY)||''}catch(_){}
      if(data){
        if(img.src!==data)img.src=data;
        holder.hidden=false;btn.classList.add('m7-v158-has-avatar');
      }else{
        img.removeAttribute('src');holder.hidden=true;btn.classList.remove('m7-v158-has-avatar');
      }
    };
    sync();
    const profileImg=document.getElementById('v15Avatar');
    if(profileImg)new MutationObserver(sync).observe(profileImg,{attributes:true,attributeFilter:['src','style','class']});
    document.getElementById('v15AvatarInput')?.addEventListener('change',()=>{setTimeout(sync,80);setTimeout(sync,450)});
    addEventListener('storage',e=>{if(e.key===AVATAR_KEY)sync()});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  }

  function isBrokenCharizardPromoImage(img){
    if(!img)return false;
    const vals=[img.getAttribute('src'),img.currentSrc,img.dataset?.v155Image,img.dataset?.v155ImageAlt].filter(Boolean).join(' ').toLowerCase();
    return /images\.pokemontcg\.io\/mep\/0?29(?:_|\.|\/|\?|$)/.test(vals)||/\/mep[-_/]?0?29(?:_|\.|\/|\?|$)/.test(vals);
  }
  function repairPromoImage(img){
    if(!isBrokenCharizardPromoImage(img))return false;
    if(img.dataset.m7V158PromoFixed==='1'&&img.getAttribute('src')===CHARIZARD_MEP_029)return true;
    img.dataset.m7V158PromoFixed='1';
    img.dataset.v155Image=CHARIZARD_MEP_029;
    img.dataset.v155ImageAlt=CHARIZARD_MEP_029;
    img.onerror=null;
    img.style.removeProperty('display');
    img.src=CHARIZARD_MEP_029;
    return true;
  }
  function scanPromoImages(root=document){
    if(root instanceof HTMLImageElement)repairPromoImage(root);
    root.querySelectorAll?.('img').forEach(repairPromoImage);
  }
  function installPromoImageRepair(){
    scanPromoImages();
    const obs=new MutationObserver(muts=>{
      for(const m of muts){
        if(m.type==='attributes'){repairPromoImage(m.target);continue}
        m.addedNodes.forEach(n=>{if(n.nodeType===1)scanPromoImages(n)});
      }
    });
    obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-v155-image','data-v155-image-alt']});
    document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)repairPromoImage(e.target)},true);
  }
})();
