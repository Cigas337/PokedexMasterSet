/* Pokédex M7 v15.8.1 · Integration polish + cross-device profile + expansion progress hotfix */
(function(){
  const NAME_KEY='pokedexm7-v15-nickname';
  const AVATAR_KEY='pokedexm7-v15-avatar';
  const PROFILE_ROW_ID=0;
  const CHARIZARD_MEP_029='https://pkmncards.com/wp-content/uploads/mebsp_en_029_std.png';
  const once=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

  once(()=>{
    installExpansionProgressFix();
    installAuthSignature();
    installNavAvatar();
    installCloudProfileSync();
    installPromoImageRepair();
  });

  /* v15.5 still asks for getCardDetails(), while the current core exposes
     pokemonCardDetail(). Keep a small compatibility bridge so expansions
     read the very same owned/featured card_details used by the Pokédex. */
  function installExpansionProgressFix(){
    const detailsFor=(id)=>{
      try{
        if(typeof window.pokemonCardDetail==='function'){
          const d=window.pokemonCardDetail(id);
          if(d)return d;
        }
      }catch(_){}
      try{
        const row=(Array.isArray(window.__supabaseData)?window.__supabaseData:[])
          .find(x=>Number(x?.pokemon_id)===Number(id));
        if(row?.card_details&&typeof row.card_details==='object')return row.card_details;
      }catch(_){}
      return null;
    };
    window.getCardDetails=detailsFor;

    const refresh=()=>{
      const query=document.getElementById('v155SetQuery');
      if(query)query.dispatchEvent(new Event('input',{bubbles:true}));
      const detail=document.getElementById('v155SetDetail');
      const ownedFilter=document.getElementById('v155OwnedFilter');
      if(detail&&!detail.hidden&&ownedFilter)ownedFilter.dispatchEvent(new Event('change',{bubbles:true}));
    };
    setTimeout(refresh,0);
    setTimeout(refresh,300);
    setTimeout(refresh,1100);
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-app-nav="expansions"],[data-v155-set],#v155Back'))setTimeout(refresh,120);
    },true);
    const syncText=document.getElementById('syncText');
    if(syncText)new MutationObserver(()=>setTimeout(refresh,80)).observe(syncText,{subtree:true,childList:true,characterData:true});
  }

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

  function readLocalProfile(){
    let nickname='Cigas',avatarDataUrl='';
    try{
      nickname=(localStorage.getItem(NAME_KEY)||'Cigas').trim().slice(0,28)||'Cigas';
      avatarDataUrl=localStorage.getItem(AVATAR_KEY)||'';
    }catch(_){}
    return {nickname,avatarDataUrl};
  }
  function applyProfileToUi(profile,{writeLocal=true}={}){
    const nickname=String(profile?.nickname||'Cigas').trim().slice(0,28)||'Cigas';
    const avatarDataUrl=String(profile?.avatarDataUrl||'');
    if(writeLocal){
      try{
        localStorage.setItem(NAME_KEY,nickname);
        if(avatarDataUrl)localStorage.setItem(AVATAR_KEY,avatarDataUrl);
      }catch(_){}
    }
    const input=document.getElementById('v15Nickname');
    const label=document.getElementById('v15ProfileName');
    const avatar=document.getElementById('v15Avatar');
    const wrap=document.getElementById('v15AvatarWrap');
    if(input)input.value=nickname;
    if(label)label.textContent=nickname;
    if(avatar){
      if(avatarDataUrl){avatar.src=avatarDataUrl;avatar.hidden=false;wrap?.classList.add('has-photo')}
      else{avatar.removeAttribute('src');avatar.hidden=true;wrap?.classList.remove('has-photo')}
    }
    document.dispatchEvent(new CustomEvent('m7:profile-updated',{detail:{nickname,avatarDataUrl}}));
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
      const data=readLocalProfile().avatarDataUrl;
      if(data){
        if(img.getAttribute('src')!==data)img.src=data;
        holder.hidden=false;btn.classList.add('m7-v158-has-avatar');
      }else{
        img.removeAttribute('src');holder.hidden=true;btn.classList.remove('m7-v158-has-avatar');
      }
    };
    sync();
    const profileImg=document.getElementById('v15Avatar');
    if(profileImg)new MutationObserver(sync).observe(profileImg,{attributes:true,attributeFilter:['src','style','class']});
    document.getElementById('v15AvatarInput')?.addEventListener('change',()=>{setTimeout(sync,80);setTimeout(sync,450)});
    addEventListener('storage',e=>{if(e.key===AVATAR_KEY||e.key===NAME_KEY)sync()});
    document.addEventListener('m7:profile-updated',sync);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  }

  function installCloudProfileSync(){
    const client=window.supabaseClient;
    if(!client?.from)return;
    let applyingRemote=false;
    let ready=false;
    let saveTimer=0;

    const setStatus=(text,good=true)=>{
      const el=document.getElementById('v15ProfileSync');
      if(!el)return;
      el.textContent=text;
      el.classList.toggle('m7-setting-status',good);
    };
    const normalizeRemote=(raw)=>{
      const p=raw&&typeof raw==='object'?raw:{};
      return {
        nickname:String(p.nickname||'').trim().slice(0,28),
        avatarDataUrl:String(p.avatarDataUrl||''),
        updatedAt:String(p.updatedAt||'')
      };
    };
    const currentPayload=()=>{
      const local=readLocalProfile();
      return {...local,updatedAt:new Date().toISOString(),version:1};
    };
    const writeCloud=async(payload=currentPayload())=>{
      if(applyingRemote)return false;
      const profile={...payload,nickname:String(payload.nickname||'Cigas').trim().slice(0,28)||'Cigas',avatarDataUrl:String(payload.avatarDataUrl||''),updatedAt:payload.updatedAt||new Date().toISOString(),version:1};
      setStatus('A sincronizar perfil…',false);
      const {error}=await client.from('pokemon_cards').upsert({
        pokemon_id:PROFILE_ROW_ID,
        card:false,
        full_art:false,
        card_details:{owned:{},wishlist:{},featured:null,profile}
      },{onConflict:'pokemon_id'});
      if(error){console.warn('[M7 v15.8] Profile cloud save:',error);setStatus('Perfil só neste dispositivo',false);return false}
      setStatus('Perfil sincronizado',true);
      return true;
    };
    const scheduleSave=(delay=180)=>{
      if(!ready||applyingRemote)return;
      clearTimeout(saveTimer);
      saveTimer=setTimeout(()=>writeCloud(),delay);
    };

    (async()=>{
      try{
        const {data,error}=await client.from('pokemon_cards').select('card_details').eq('pokemon_id',PROFILE_ROW_ID).maybeSingle();
        if(error)throw error;
        const remote=normalizeRemote(data?.card_details?.profile);
        const local=readLocalProfile();
        const hasRemote=!!(remote.nickname||remote.avatarDataUrl);
        if(hasRemote){
          const merged={
            nickname:remote.nickname||local.nickname||'Cigas',
            avatarDataUrl:remote.avatarDataUrl||local.avatarDataUrl||'',
            updatedAt:remote.updatedAt||new Date().toISOString(),
            version:1
          };
          applyingRemote=true;
          applyProfileToUi(merged);
          applyingRemote=false;
          ready=true;
          setStatus('Perfil sincronizado',true);
          /* Preserve an existing iPhone-only photo when the cloud profile was
             created on a device that had no photo yet. */
          if(!remote.avatarDataUrl&&local.avatarDataUrl)await writeCloud({...merged,updatedAt:new Date().toISOString()});
        }else{
          ready=true;
          applyProfileToUi(local,{writeLocal:false});
          setStatus('Perfil pronto para sincronizar',true);
          if(local.avatarDataUrl||String(local.nickname||'').trim().toLowerCase()!=='cigas')await writeCloud();
        }
      }catch(err){
        console.warn('[M7 v15.8] Profile cloud load:',err);
        ready=true;
        applyProfileToUi(readLocalProfile(),{writeLocal:false});
        setStatus('Perfil só neste dispositivo',false);
      }
    })();

    document.getElementById('v15SaveNickname')?.addEventListener('click',()=>setTimeout(()=>scheduleSave(0),0));
    document.getElementById('v15Nickname')?.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(()=>scheduleSave(0),0)});
    const avatar=document.getElementById('v15Avatar');
    if(avatar)new MutationObserver(()=>{
      if(applyingRemote)return;
      const src=avatar.getAttribute('src')||'';
      if(src&&src===readLocalProfile().avatarDataUrl)scheduleSave(260);
    }).observe(avatar,{attributes:true,attributeFilter:['src']});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready)scheduleSave(500)});
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
