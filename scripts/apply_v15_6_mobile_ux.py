from pathlib import Path

css_path = Path('v15.5.css')
sw_path = Path('sw.js')

marker = '/* === Pokédex M7 v15.6.0 · Professional Mobile UX === */'
css = css_path.read_text(encoding='utf-8')
if marker in css:
    css = css.split(marker, 1)[0].rstrip() + '\n'

mobile = r'''
/* === Pokédex M7 v15.6.0 · Professional Mobile UX === */
@media(max-width:760px){
  :root{--m7-mobile-dock-content:64px;--m7-mobile-safe-bottom:env(safe-area-inset-bottom,0px)}
  html{overflow-x:hidden!important;scroll-padding-top:calc(70px + env(safe-area-inset-top,0px))!important;scroll-padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))!important}
  body.m7-v15{min-width:0!important;overflow-x:clip!important;padding-bottom:calc(102px + env(safe-area-inset-bottom,0px))!important;-webkit-text-size-adjust:100%}
  .m7-v15 .wrap{box-sizing:border-box!important;max-width:100vw!important;width:100%!important;margin:0!important;padding:calc(7px + env(safe-area-inset-top,0px)) 8px 0!important;overflow:visible!important}
  .m7-v15-view,.m7-global-search,.m7-v15 .stage,.m7-v15 #m7ShopHost,.m7-v155-exp-shell,.m7-profile-shell{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}

  /* Native-style bottom dock: background reaches the bottom; safe-area lives inside it. */
  .m7-app-nav{left:0!important;right:0!important;bottom:0!important;width:100%!important;height:calc(var(--m7-mobile-dock-content) + env(safe-area-inset-bottom,0px))!important;min-height:64px!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:3px!important;padding:5px 8px max(5px,env(safe-area-inset-bottom,0px))!important;border-left:0!important;border-right:0!important;border-bottom:0!important;border-radius:22px 22px 0 0!important;background:rgba(6,11,17,.965)!important;box-shadow:0 -12px 32px rgba(0,0,0,.34)!important;backdrop-filter:blur(24px) saturate(145%)!important;-webkit-backdrop-filter:blur(24px) saturate(145%)!important}
  .m7-nav-btn{min-width:0!important;min-height:48px!important;height:100%!important;border-radius:15px!important;padding:4px 2px!important;gap:2px!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent}
  .m7-nav-btn svg{width:22px!important;height:22px!important;flex:0 0 auto}
  .m7-nav-btn span:last-child{max-width:100%!important;font-size:8.5px!important;line-height:1!important;font-weight:850!important;letter-spacing:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
  .m7-nav-btn.active{background:linear-gradient(180deg,rgba(86,216,210,.19),rgba(86,216,210,.09))!important;box-shadow:inset 0 0 0 1px rgba(86,216,210,.12)!important}
  .m7-nav-btn[data-app-nav="shop"] .m7-nav-dot{top:5px!important;right:calc(50% - 19px)!important}

  /* No iOS focus zoom; larger, consistent touch controls. */
  .m7-v15 input,.m7-v15 select,.m7-v15 textarea{font-size:16px!important}
  .m7-v15 button,.m7-v15 a,.m7-v15 select{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .m7-v15 button:focus-visible,.m7-v15 a:focus-visible,.m7-v15 input:focus-visible,.m7-v15 select:focus-visible{outline:2px solid rgba(86,216,210,.72)!important;outline-offset:2px!important}

  /* Header: compact but fully readable. */
  .m7-v15 .hero-shell{margin:0 0 8px!important;padding:5px!important;border-radius:18px!important}
  .m7-v15 .m7-brand-panel{min-height:66px!important;padding:10px 11px!important;border-radius:14px!important}
  .m7-v15 .m7-brand-row{grid-template-columns:40px minmax(0,1fr)!important;column-gap:10px!important;row-gap:3px!important}
  .m7-v15 .m7-brand-row .pokeball-mini{width:40px!important;height:40px!important}
  .m7-v15 .m7-brand-panel .brand-title{font-size:24px!important;line-height:1!important;white-space:normal!important}
  .m7-v15 .m7-brand-panel .brand-sub{font-size:8px!important;line-height:1.25!important;letter-spacing:1.2px!important;white-space:normal!important}
  .m7-v15 .m7-brand-signature{max-width:100%!important;padding:3px 7px!important;font-size:7px!important;letter-spacing:.7px!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .m7-view-heading,.m7-v155-page-head{align-items:flex-start!important;gap:8px!important;margin:10px 3px 8px!important;flex-wrap:wrap!important}
  .m7-view-heading h2,.m7-v155-page-head h2{font-size:21px!important;line-height:1.08!important}
  .m7-view-heading p,.m7-v155-page-head p{font-size:10px!important;line-height:1.4!important}

  /* Pokédex: sticky controls remain usable and do not hide information. */
  .m7-v152 #m7PortfolioView .controls,.m7-v152 #m7SearchView .controls,.m7-v15 #m7SearchView .controls{top:calc(4px + env(safe-area-inset-top,0px))!important;z-index:5000!important;width:100%!important;box-sizing:border-box!important;padding:7px!important;gap:6px!important;border-radius:15px!important}
  .m7-v151 #m7SearchView .controls,.m7-v151 #m7PortfolioView .controls{grid-template-columns:minmax(0,1fr) 46px 46px!important}
  .m7-v15 .controls input,.m7-v15 .controls select{min-height:44px!important;height:44px!important}
  .m7-v15 .controls button{min-height:44px!important;min-width:44px!important}
  .m7-v15 .stage{margin-top:8px!important;padding:9px!important;border-radius:17px!important;overflow:visible!important}
  .m7-v15 .stage-head{min-width:0!important;gap:6px!important;flex-wrap:wrap!important}
  .m7-v15 .stage-head h2{min-width:0!important;font-size:16px!important;line-height:1.2!important;white-space:normal!important}
  .m7-v15 .stage-head p,.m7-v15 .stage-head span{line-height:1.3}
  .m7-v151-card-grid{gap:7px!important}
  .m7-v151-card-grid .dex-card{overflow:visible!important;padding:7px!important}
  .m7-v151-card-grid .dex-card .card-image,.m7-v151-card-grid .dex-card.has-featured-tcg .card-image{height:178px!important}
  .m7-v151-card-grid .dex-card .card-image img,.m7-v151-card-grid .dex-card.has-featured-tcg .card-image img{max-height:172px!important}
  .m7-v151-card-grid .dex-card:not(.has-featured-tcg) .card-image{height:158px!important}
  .m7-v151-card-grid .dex-card:not(.has-featured-tcg) .card-image img{max-height:152px!important}
  .m7-v151-card-grid .dex-card .dex-name{font-size:11px!important;line-height:1.15!important}
  .m7-v151-card-grid .dex-card .binder-inspect-btn{min-height:34px!important;font-size:8px!important}
  .m7-v151-card-grid .dex-card .state-ui{min-height:30px!important;font-size:7px!important}

  /* Global card search: one clean search row + compact filter row. */
  .m7-global-search{padding:0 0 12px!important}
  .m7-global-searchbar{top:calc(4px + env(safe-area-inset-top,0px))!important;z-index:5100!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 46px!important;gap:6px!important;padding:7px!important;border-radius:15px!important}
  .m7-global-searchbox{grid-column:1/-1!important}
  .m7-global-searchbox input{height:46px!important;padding:0 46px 0 13px!important}
  .m7-global-searchbox button{width:36px!important;height:36px!important;right:5px!important;top:5px!important}
  .m7-global-searchbar select{min-width:0!important;width:100%!important;height:44px!important;padding:0 8px!important}
  .m7-global-search-action{width:46px!important;min-width:46px!important;height:44px!important}
  .m7-global-search-meta{min-width:0!important;gap:6px!important;padding:8px 3px 6px!important;font-size:9px!important;flex-wrap:wrap!important}
  .m7-global-search-meta strong{font-size:10px!important}
  .m7-global-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
  .m7-global-card-copy strong{font-size:11px!important}.m7-global-card-copy small{font-size:8px!important}.m7-global-card-copy .set{font-size:7.5px!important}
  .m7-global-card-foot{flex-wrap:wrap!important}.m7-global-card-price{font-size:10px!important}.m7-global-card-type{font-size:7px!important}
  .m7-global-loadmore{min-height:46px!important;font-size:10px!important}
  .m7-global-detail{padding:calc(8px + env(safe-area-inset-top,0px)) 8px calc(8px + env(safe-area-inset-bottom,0px))!important;align-items:center!important}
  .m7-global-detail-panel{width:100%!important;max-height:calc(100dvh - 16px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))!important;grid-template-columns:1fr!important;gap:8px!important;padding:14px!important;border-radius:20px!important;overscroll-behavior:contain!important}
  .m7-global-detail-close{width:44px!important;height:44px!important;right:9px!important;top:9px!important}
  .m7-global-detail-image{min-height:0!important;padding:8px 38px 0!important}.m7-global-detail-image img{max-height:43dvh!important}
  .m7-global-detail-copy h2{font-size:23px!important}.m7-global-detail-copy p{font-size:11px!important}.m7-global-detail-meta span{font-size:8px!important}.m7-global-detail-meta strong{font-size:12px!important}
  .m7-global-detail-actions button,.m7-global-detail-actions a{min-height:44px!important;font-size:10px!important;flex:1 1 130px!important}

  /* Shop: page mode stays scrollable, controls visible, and last products clear the dock. */
  .m7-v155 #m7ShopHost{padding-bottom:14px!important}
  .m7-v155 #m7ShopHost #stockModal,.m7-v155 #m7ShopHost #stockModal .stock-panel{max-width:100%!important;min-width:0!important;overflow:visible!important}
  .m7-v155 #m7ShopHost .stock-head{padding:11px!important;border-radius:17px 17px 0 0!important}
  .m7-v155 #m7ShopHost .stock-toolbar{position:relative!important;inset:auto!important;max-height:none!important;overflow:visible!important;padding:8px!important;gap:7px!important}
  .m7-v155 #m7ShopHost .stock-body,.m7-v155 #m7ShopHost .stock-grid{overflow:visible!important;max-width:100%!important}
  .m7-v155 #m7ShopHost .stock-grid{padding-bottom:22px!important}
  .m7-v155 #m7ShopHost .stock-card{min-width:0!important;max-width:100%!important}
  .m7-v155 #m7ShopHost .stock-card button,.m7-v155 #m7ShopHost .stock-card a,.m7-v155 #m7ShopHost .stock-notify-btn{min-height:44px!important}

  /* Expansions: readable filters and logo/detail restored on mobile. */
  .m7-v155-exp-shell{min-height:calc(100dvh - 140px)!important;margin:3px 0 8px!important;padding:17px 9px 28px!important;border-radius:20px!important;overflow:hidden!important}
  .m7-v155-exp-title{padding:1px 0 14px!important}.m7-v155-exp-title h2{font-size:27px!important}
  .m7-v155-exp-search{margin-bottom:10px!important}.m7-v155-exp-search input{height:50px!important;padding-left:45px!important;border-radius:17px!important}.m7-v155-exp-search span{left:14px!important}
  .m7-v155-exp-filters{grid-template-columns:46px minmax(0,1.2fr) minmax(0,.8fr)!important;gap:7px!important;margin-bottom:20px!important}
  .m7-v155-exp-filters select,.m7-v155-exp-clear{height:46px!important;min-width:0!important;border-radius:15px!important}.m7-v155-exp-filters select{font-size:13px!important;padding:0 7px!important}
  .m7-v155-exp-group+.m7-v155-exp-group{margin-top:27px!important}.m7-v155-exp-group h3{margin-bottom:13px!important;font-size:20px!important;line-height:1.1!important}
  .m7-v155-exp-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
  .m7-v155-set{min-width:0!important;min-height:214px!important;padding:9px!important;border-radius:18px!important}
  .m7-v155-set-image{min-height:122px!important;padding:7px 3px!important}.m7-v155-set-image img{height:86px!important}.m7-v155-set-image .fallback-name{max-width:100%!important;font-size:15px!important;line-height:1.08!important;overflow-wrap:anywhere!important}
  .m7-v155-set>strong{font-size:13px!important;line-height:1.15!important}.m7-v155-code{font-size:6.5px!important}.m7-v155-progress{font-size:7.5px!important}
  .m7-v155-detail-head{grid-template-columns:40px 58px minmax(0,1fr) 58px!important;gap:7px!important;padding:10px!important;border-radius:18px!important;align-items:center!important}
  .m7-v155-detail-logo{display:grid!important;width:58px!important;height:58px!important;place-items:center!important}.m7-v155-detail-logo img{display:block;max-width:100%!important;width:100%!important;height:52px!important;object-fit:contain!important}
  .m7-v155-detail-copy{min-width:0!important}.m7-v155-detail-copy h2{margin:3px 0!important;font-size:16px!important;line-height:1.08!important;overflow-wrap:anywhere!important}.m7-v155-detail-copy span{font-size:7px!important}.m7-v155-detail-copy p{font-size:8px!important;white-space:normal!important}
  .m7-v155-detail-count{width:56px!important;height:56px!important}.m7-v155-detail-count strong{font-size:14px!important}.m7-v155-detail-count span{font-size:6px!important}
  .m7-v155-card-tools{grid-template-columns:minmax(0,1fr) 110px!important;gap:6px!important}.m7-v155-card-search input,.m7-v155-card-tools select{height:44px!important;border-radius:12px!important}.m7-v155-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.m7-v155-card button{min-height:38px!important;font-size:8px!important}

  /* Profile/settings: information stays readable and never ends under the dock. */
  .m7-profile-shell{grid-template-columns:1fr!important;gap:9px!important;padding-bottom:12px!important}
  .m7-profile-card,.m7-settings-card{border-radius:18px!important}.m7-profile-card{padding:15px!important}.m7-avatar-wrap{width:94px!important;height:94px!important;margin-bottom:11px!important}.m7-avatar-edit{width:36px!important;height:36px!important}
  .m7-profile-card h2{font-size:22px!important}.m7-profile-card p{font-size:10px!important}.m7-nickname-row{margin-top:12px!important}.m7-nickname-row input,.m7-nickname-row button{min-height:44px!important;height:44px!important}
  .m7-settings-card{padding:9px!important}.m7-settings-group+.m7-settings-group{margin-top:10px!important}.m7-settings-group h3{font-size:9px!important;margin-bottom:5px!important}
  .m7-setting-row{min-height:56px!important;grid-template-columns:38px minmax(0,1fr) auto!important;gap:9px!important;padding:8px 9px!important;scroll-margin-bottom:calc(90px + env(safe-area-inset-bottom,0px))!important}
  .m7-setting-icon{width:36px!important;height:36px!important}.m7-setting-copy{min-width:0!important}.m7-setting-copy strong{font-size:11px!important}.m7-setting-copy small{font-size:8.5px!important;line-height:1.35!important;white-space:normal!important}

  /* Last interactive content in every view gets breathing room above the dock. */
  #m7PortfolioView,#m7SearchView,#m7ShopView,#m7ExpansionsView,#m7ProfileView{padding-bottom:18px!important}
  .m7-v15 .footer{margin-bottom:0!important;padding-bottom:6px!important}
}
@media(max-width:380px){
  .m7-app-nav{padding-left:5px!important;padding-right:5px!important;gap:1px!important}.m7-nav-btn span:last-child{font-size:7.7px!important}.m7-nav-btn svg{width:21px!important;height:21px!important}
  .m7-v15 .wrap{padding-left:6px!important;padding-right:6px!important}
  .m7-v151-card-grid .dex-card .card-image,.m7-v151-card-grid .dex-card.has-featured-tcg .card-image{height:168px!important}.m7-v151-card-grid .dex-card .card-image img,.m7-v151-card-grid .dex-card.has-featured-tcg .card-image img{max-height:162px!important}
  .m7-v155-detail-head{grid-template-columns:38px 48px minmax(0,1fr) 54px!important;gap:5px!important}.m7-v155-detail-logo{width:48px!important;height:52px!important}.m7-v155-detail-logo img{height:46px!important}.m7-v155-detail-copy h2{font-size:14px!important}
}
'''

css_path.write_text(css.rstrip() + '\n' + mobile.strip() + '\n', encoding='utf-8')

sw = sw_path.read_text(encoding='utf-8')
sw = sw.replace("pokedexm7-shell-v15.5.1", "pokedexm7-shell-v15.6.0")
sw_path.write_text(sw, encoding='utf-8')

print('v15.6 mobile UX patch applied')
